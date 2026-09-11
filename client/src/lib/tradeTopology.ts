/**
 * 贸易网络拓扑构建与连线几何。
 *
 * 将后端返回的贸易流整理为 {source, target, volume, category} 的邻接表，
 * 并提供三阶贝塞尔曲线（Cubic Bezier）的控制点计算 —— 双向贸易流
 * 被分配到弦的两侧，避免直线/单向曲线在地图上交错叠重。
 */
import type { TradeFlow } from '../api';

/* ---------- 邻接表 ---------- */

export interface TradeEdge {
  source: string; // 出口国 ISO3
  target: string; // 进口国 ISO3
  volume: number; // 双边出口额（美元）
  category: string; // 主导商品类别
}

export interface TradeNode {
  code: string;
  outVolume: number; // 出口总额
  inVolume: number; // 进口总额
  totalVolume: number; // 双向合计，决定节点半径
  topCategory: string; // 体量最大的类别，决定节点颜色
}

export interface TradeTopology {
  edges: TradeEdge[];
  nodes: Map<string, TradeNode>;
  /** 无向邻接表：国家代码 → 与该国相连的全部边（无论进/出口方向） */
  adjacency: Map<string, TradeEdge[]>;
  maxVolume: number; // 单条边最大体量（线宽归一化）
  maxNodeVolume: number; // 单节点最大体量（半径归一化）
}

export const FALLBACK_CATEGORY = '综合';

export function buildTradeTopology(flows: TradeFlow[]): TradeTopology {
  const edges: TradeEdge[] = [];
  const nodes = new Map<string, TradeNode>();
  const adjacency = new Map<string, TradeEdge[]>();
  const categoryVolume = new Map<string, Map<string, number>>();

  const nodeOf = (code: string): TradeNode => {
    let n = nodes.get(code);
    if (!n) {
      n = { code, outVolume: 0, inVolume: 0, totalVolume: 0, topCategory: FALLBACK_CATEGORY };
      nodes.set(code, n);
    }
    return n;
  };
  const link = (code: string, e: TradeEdge) => {
    const list = adjacency.get(code);
    if (list) list.push(e);
    else adjacency.set(code, [e]);
  };

  let maxVolume = 0;
  for (const f of flows) {
    if (!f.exporter || !f.importer || f.exporter === f.importer || !(f.value > 0)) continue;
    const e: TradeEdge = {
      source: f.exporter,
      target: f.importer,
      volume: f.value,
      category: f.category || FALLBACK_CATEGORY,
    };
    edges.push(e);
    if (e.volume > maxVolume) maxVolume = e.volume;

    nodeOf(e.source).outVolume += e.volume;
    nodeOf(e.target).inVolume += e.volume;
    link(e.source, e);
    link(e.target, e);

    // 按出口方累计类别体量，用于推断节点主色
    const cv = categoryVolume.get(e.source) ?? new Map<string, number>();
    cv.set(e.category, (cv.get(e.category) ?? 0) + e.volume);
    categoryVolume.set(e.source, cv);
  }

  let maxNodeVolume = 0;
  for (const n of nodes.values()) {
    n.totalVolume = n.outVolume + n.inVolume;
    if (n.totalVolume > maxNodeVolume) maxNodeVolume = n.totalVolume;
    const cv = categoryVolume.get(n.code);
    if (cv) {
      let best = FALLBACK_CATEGORY;
      let bestV = -1;
      for (const [cat, v] of cv) if (v > bestV) ((best = cat), (bestV = v));
      n.topCategory = best;
    }
  }

  return { edges, nodes, adjacency, maxVolume, maxNodeVolume };
}

/** 当前国家及其直接贸易伙伴（含自身），用于点击聚焦 */
export function directPartners(topology: TradeTopology, code: string): Set<string> {
  const set = new Set<string>([code]);
  for (const e of topology.adjacency.get(code) ?? []) {
    set.add(e.source);
    set.add(e.target);
  }
  return set;
}

/* ---------- 类别配色（与全站暗色主题一致） ---------- */

export const CATEGORY_COLORS: Record<string, string> = {
  能源: '#e0a94f',
  矿产: '#b48ac9',
  关键矿产: '#7fb069',
  农产品: '#a4b357',
  运输设备: '#57a9c9',
  电子: '#5b8dd9',
  工业制品: '#8b97a9',
  轻工业: '#d98a6e',
  高端制造: '#e0c56f',
  [FALLBACK_CATEGORY]: '#7d8ca3',
};

export const categoryColor = (c: string): string => CATEGORY_COLORS[c] ?? CATEGORY_COLORS[FALLBACK_CATEGORY];

/* ---------- 三阶贝塞尔曲线 ---------- */

export interface CubicBezier {
  cx1: number;
  cy1: number;
  cx2: number;
  cy2: number;
}

/**
 * 双向边分侧符号：同一对国家存在 A→B 与 B→A 两条边时，
 * 按字典序分配相反符号，使两条曲线分别弯向弦的两侧，互不叠重。
 */
export function edgeBendSign(source: string, target: string): 1 | -1 {
  return source < target ? 1 : -1;
}

/**
 * 三阶贝塞尔控制点：在弦的 1/3、2/3 处沿单位法线偏移。
 * bend 为弯曲系数（相对弦长），sign 决定弯向哪一侧。
 */
export function cubicBezierControls(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  bend: number,
  sign: 1 | -1
): CubicBezier {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy) || 1;
  // 弦的左法线
  const nx = -dy / dist;
  const ny = dx / dist;
  // 弯曲量随弦长缩放并截断，避免跨洋长边弧高失控
  const off = sign * Math.min(Math.max(dist * bend, 10), 130);
  return {
    cx1: x0 + dx / 3 + nx * off,
    cy1: y0 + dy / 3 + ny * off,
    cx2: x0 + (2 * dx) / 3 + nx * off,
    cy2: y0 + (2 * dy) / 3 + ny * off,
  };
}

/** 三阶贝塞尔上 t ∈ [0,1] 处的点 */
export function cubicBezierPoint(
  t: number,
  x0: number,
  y0: number,
  c: CubicBezier,
  x1: number,
  y1: number
): [number, number] {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const d = 3 * u * t * t;
  const e = t * t * t;
  return [a * x0 + b * c.cx1 + d * c.cx2 + e * x1, a * y0 + b * c.cy1 + d * c.cy2 + e * y1];
}

/** 采样为折线，供画布命中检测（hover）使用 */
export function sampleCubicBezier(
  n: number,
  x0: number,
  y0: number,
  c: CubicBezier,
  x1: number,
  y1: number
): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) pts.push(cubicBezierPoint(i / n, x0, y0, c, x1, y1));
  return pts;
}

/** 点到线段的最短距离 */
export function distToSegment(
  px: number,
  py: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / len2));
  return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
}
