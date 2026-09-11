/**
 * 产业链数据的规范化与适配。
 *
 * 所有外部数据（后端 API、静态 JSON、未来的第三方数据源）都必须先经过
 * normalizeIndustryChain 才能进入状态层与 UI：
 * - 缺数组补空数组，非法数字归零，悬空边（指向不存在节点）直接丢弃；
 * - 环节列表缺失时从节点反推，保证 UI 总有可渲染的结构；
 * - 仅当数据根本无法标识一条链（无 id）时返回 null。
 * 本模块的函数永不抛异常 —— 脏数据降级为空链，由状态层决定展示空态。
 */
import type { ChainDetail } from '../api';
import type { IndustryChain, IndustryEdge, IndustryNode, IndustrySegment } from './types';

/** 一条链是否为空：无节点即无可渲染内容，状态层据此进入 empty 态 */
export const isChainEmpty = (chain: IndustryChain | null | undefined): boolean =>
  !chain || chain.nodes.length === 0;

const asStr = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);

const asNum = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** 规范化任意来源的产业链 JSON 为 IndustryChain；无法识别时返回 null */
export function normalizeIndustryChain(raw: unknown): IndustryChain | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = asStr(r.id).trim();
  if (!id) return null;

  // 节点：国家与环节是必要属性，缺失的条目直接丢弃
  const nodes: IndustryNode[] = [];
  asArr(r.nodes).forEach((item, i) => {
    if (!item || typeof item !== 'object') return;
    const n = item as Record<string, unknown>;
    const country = asStr(n.country ?? n.code).trim();
    const segment = asStr(n.segment ?? n.stage).trim();
    if (!country || !segment) return;
    nodes.push({
      id: asStr(n.id).trim() || `${country}@${segment}#${i}`,
      country,
      countryName: asStr(n.countryName ?? n.name, country),
      segment,
      role: asStr(n.role),
      detail: asStr(n.detail),
      weight: Math.max(0, asNum(n.weight, 1)),
      lon: asNum(n.lon),
      lat: asNum(n.lat),
    });
  });

  // 边：源 / 目标必须能解析到存活节点，贸易量非法时归零
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges: IndustryEdge[] = [];
  asArr(r.edges).forEach((item, i) => {
    if (!item || typeof item !== 'object') return;
    const e = item as Record<string, unknown>;
    const source = asStr(e.source).trim();
    const target = asStr(e.target).trim();
    if (!nodeIds.has(source) || !nodeIds.has(target)) return;
    edges.push({
      id: asStr(e.id).trim() || `e${i}:${source}->${target}`,
      source,
      target,
      volume: Math.max(0, asNum(e.volume ?? e.value)),
      label: asStr(e.label),
    });
  });

  // 环节：优先使用数据声明的有序列表；缺失时按节点出现顺序反推
  const declared = asArr(r.segments ?? r.stages)
    .map((s): IndustrySegment | null => {
      if (!s || typeof s !== 'object') return null;
      const key = asStr((s as Record<string, unknown>).key).trim();
      if (!key) return null;
      return { key, label: asStr((s as Record<string, unknown>).label, key) };
    })
    .filter((s): s is IndustrySegment => s !== null);
  const segments = declared.length > 0 ? declared : deriveSegments(nodes);

  return {
    id,
    name: asStr(r.name, id),
    subtitle: asStr(r.subtitle),
    description: asStr(r.description),
    segments,
    nodes,
    edges,
  };
}

function deriveSegments(nodes: IndustryNode[]): IndustrySegment[] {
  const seen = new Map<string, IndustrySegment>();
  for (const n of nodes) {
    if (!seen.has(n.segment)) seen.set(n.segment, { key: n.segment, label: n.segment });
  }
  return [...seen.values()];
}

/**
 * 适配现有后端 ChainDetail（国家代码 + 环节复合标识、边引用国家）
 * 到规范模型（节点有唯一 ID、边引用节点 ID）。
 */
export function fromApiChainDetail(detail: ChainDetail): IndustryChain | null {
  const nodeId = (code: string, stage: string) => `${code}@${stage}`;
  return normalizeIndustryChain({
    id: detail?.chain?.id,
    name: detail?.chain?.name,
    subtitle: detail?.chain?.subtitle,
    description: detail?.chain?.description,
    segments: detail?.chain?.stages,
    nodes: (detail?.nodes ?? []).map((n) => ({
      id: nodeId(n.code, n.stage),
      country: n.code,
      countryName: n.name,
      segment: n.stage,
      role: n.role,
      detail: n.detail,
      weight: n.weight,
      lon: n.lon,
      lat: n.lat,
    })),
    edges: (detail?.edges ?? []).map((e) => ({
      source: nodeId(e.from, e.fromStage),
      target: nodeId(e.to, e.toStage),
      volume: e.value,
      label: e.label,
    })),
  });
}
