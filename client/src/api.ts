/** API 类型与请求层 */
import type { ZodType } from 'zod';
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

/** 请求 JSON 并用 Zod Schema 校验，结构异常时抛出 SchemaError（不会污染页面状态） */
async function getValidated<T>(url: string, schema: ZodType<T>): Promise<T> {
  const json = await getRaw(url);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.join('.') || 'root';
    throw new SchemaError(url, `${where} ${issue?.message ?? '字段不合法'}`);
  }
  return parsed.data;
}

async function get<T>(url: string): Promise<T> {
  return getRaw(url) as Promise<T>;
}

export const api = {
  meta: () => get<{ years: number[]; regions: { id: string; name: string }[] }>('/api/meta'),
  countries: (year: number) =>
    get<{ year: number; countries: CountryListItem[] }>(`/api/countries?year=${year}`),
  /** 国家经济画像统一接口：countryCode + year，返回经过 Zod 校验的数据 */
  countryProfile: (countryCode: string, year: number) =>
    getValidated<CountryProfile>(
      `/api/country-profile?countryCode=${encodeURIComponent(countryCode)}&year=${year}`,
      countryProfileSchema
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
