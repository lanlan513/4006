/** API 类型与请求层 */
import { countryProfileSchema } from './schemas';
import type { CountryProfile } from './schemas';

export type { CountryProfile } from './schemas';
import type { CountryInfo, YearMetric, CountryProduct, Partner, ChainBrief } from './schemas';

export interface CountryListItem {
  code: string;
  name: string;
  region: string;
  isoNumeric: string;
  lon: number;
  lat: number;
  gdp: number | null;
  gdpGrowth: number | null;
  population: number | null;
  gdpPerCapita: number | null;
  exports: number | null;
  imports: number | null;
}

/** 画像页核心类型由 Zod Schema 推导，下方仅做再导出保持既有引用路径可用 */
export type { CountryInfo, YearMetric, CountryProduct, Partner, ChainBrief };

export interface TradeFlow {
  exporter: string;
  importer: string;
  value: number;
}

export interface ChainStage {
  key: string;
  label: string;
}

export interface ChainNode {
  code: string;
  name: string;
  stage: string;
  role: string;
  detail: string;
  weight: number;
  lon: number;
  lat: number;
}

export interface ChainEdge {
  from: string;
  to: string;
  fromStage: string;
  toStage: string;
  label: string;
  value: number;
}

export interface ChainDetail {
  chain: { id: string; name: string; subtitle: string; description: string; stages: ChainStage[] };
  nodes: ChainNode[];
  edges: ChainEdge[];
}

export class ApiError extends Error {
  status: number;
  url: string;

  constructor(url: string, status: number, message?: string) {
    super(message ?? `API ${url} → ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.url = url;
  }

  /** 404：请求的资源不存在（如未知国家编码） */
  get isNotFound() {
    return this.status === 404;
  }
}

/** 接口可达但返回结构未通过 Zod 校验，视作“暂无可用数据” */
export class SchemaError extends Error {
  url: string;
  constructor(url: string, detail: string) {
    super(`数据结构校验失败：${detail}`);
    this.name = 'SchemaError';
    this.url = url;
  }
}

async function getRaw(url: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new ApiError(url, 0, '无法连接数据服务，请确认后端已启动。');
  }

  if (!res.ok) {
    let detail = '';
    try {
      const body = (await res.json()) as { error?: string };
      detail = body.error ?? '';
    } catch {
      // 非 JSON 错误响应仍使用统一的状态码错误。
    }
    throw new ApiError(url, res.status, detail || `数据服务返回 ${res.status}`);
  }

  return res.json();
}

async function get<T>(url: string): Promise<T> {
  return getRaw(url) as Promise<T>;
}

/* ========================================================================
 * 简易客户端数据缓存
 *
 * 目的：用户在画像页内频繁切换国家 / 年份（尤其是浏览器前进后退回到刚看过
 * 的组合）时，不重复发送网络请求，图表无缝更新、不闪骨架屏。
 *
 * 策略：
 * - Map<url, { data, expireAt }>：TTL 新鲜缓存，命中直接同步兑现；
 * - 进行中请求按 URL 去重（inflight），同一时刻的并发调用共用一个 Promise；
 * - 失败响应不写入缓存（404 / 网络错误等可在参数回退时立即重试）；
 * - 默认 TTL 5 分钟；{ force: true } 用于“重新加载”按钮绕过缓存。
 * ====================================================================== */

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 200;

interface CacheEntry<T> {
  data: T;
  expireAt: number;
}

const responseCache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

function cacheGet<T>(url: string): T | undefined {
  const hit = responseCache.get(url);
  if (!hit) return undefined;
  if (hit.expireAt < Date.now()) {
    responseCache.delete(url);
    return undefined;
  }
  // Map 的迭代顺序即插入顺序：命中后置到末尾，淘汰最久未访问的条目
  responseCache.delete(url);
  responseCache.set(url, hit);
  return hit.data as T;
}

function cacheSet<T>(url: string, data: T, ttl: number) {
  if (responseCache.size >= CACHE_MAX_ENTRIES) {
    const oldest = responseCache.keys().next().value;
    if (oldest !== undefined) responseCache.delete(oldest);
  }
  responseCache.set(url, { data, expireAt: Date.now() + ttl });
}

/** 读取仍在 TTL 内的缓存（不触发网络），供页面在参数回退时即时渲染 */
export function peekCached<T>(url: string): T | undefined {
  return cacheGet<T>(url);
}

interface CachedFetchOptions {
  /** 绕过缓存强制重新请求（用户手动重试） */
  force?: boolean;
  ttl?: number;
}

/** 带 TTL 缓存与并发去重的 GET；transform 在校验通过后运行，其结果入缓存 */
function getCached<T>(
  url: string,
  transform?: (raw: unknown) => T,
  opts: CachedFetchOptions = {}
): Promise<T> {
  if (!opts.force) {
    const hit = cacheGet<T>(url);
    if (hit !== undefined) return Promise.resolve(hit);
    const pending = inflight.get(url) as Promise<T> | undefined;
    if (pending) return pending;
  }

  const promise = (transform ? getRaw(url).then(transform) : get<T>(url))
    .then((data) => {
      cacheSet(url, data, opts.ttl ?? CACHE_TTL_MS);
      inflight.delete(url);
      return data;
    })
    .catch((e) => {
      inflight.delete(url);
      throw e;
    });

  inflight.set(url, promise);
  return promise;
}

/** 画像接口 URL 单独导出，便于页面用 peekCached 做缓存预热（无缝切换） */
export function countryProfileUrl(countryCode: string, year: number): string {
  return `/api/country-profile?countryCode=${encodeURIComponent(countryCode)}&year=${year}`;
}

export const api = {
  meta: () => get<{ years: number[]; regions: { id: string; name: string }[] }>('/api/meta'),
  countries: (year: number) =>
    get<{ year: number; countries: CountryListItem[] }>(`/api/countries?year=${year}`),
  /**
   * 国家经济画像统一接口：countryCode + year，返回经过 Zod 校验的数据。
   * 结果按「国家 + 年份」缓存（TTL 5 分钟）并对并发请求去重，
   * 重复查看同一组合不再发送网络请求；force=true 可绕过缓存。
   */
  countryProfile: (countryCode: string, year: number, opts?: CachedFetchOptions) =>
    getCached<CountryProfile>(
      countryProfileUrl(countryCode, year),
      (raw) => {
        const parsed = countryProfileSchema.safeParse(raw);
        if (!parsed.success) {
          const issue = parsed.error.issues[0];
          const where = issue?.path.join('.') || 'root';
          throw new SchemaError(countryProfileUrl(countryCode, year), `${where} ${issue?.message ?? '字段不合法'}`);
        }
        return parsed.data;
      },
      opts
    ),
  trade: (year: number, country?: string | null) =>
    get<{ year: number; focus: string | null; flows: TradeFlow[] }>(
      `/api/trade?year=${year}${country ? `&country=${country}` : ''}`
    ),
  chains: () => get<{ chains: ChainBrief[] }>('/api/chains'),
  chain: (id: string) => get<ChainDetail>(`/api/chains/${id}`),
};

export const REGION_NAMES: Record<string, string> = {
  north_america: '北美',
  east_asia: '东亚与太平洋',
  europe: '欧洲',
  south_asia: '南亚',
  latin_america: '拉美与加勒比',
  mideast: '中东与北非',
  sub_saharan_africa: '撒哈拉以南非洲',
  central_asia: '中亚',
};

export const regionName = (r: string) => REGION_NAMES[r] ?? r;
