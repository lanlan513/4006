/** API 类型与请求层 */

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

export interface YearMetric {
  year: number;
  gdp: number;
  gdpGrowth: number;
  population: number;
  gdpPerCapita: number;
  exports: number;
  imports: number;
}

export interface CountryProduct {
  flowType: 'ex' | 'im';
  share: number;
  rank: number;
  productCode: string;
  productName: string;
  category: string;
  chainId: string | null;
}

export interface Partner {
  code: string;
  name: string;
  value: number;
}

export interface ChainBrief {
  id: string;
  name: string;
  subtitle: string;
}

export interface CountryDetail {
  country: { code: string; name: string; region: string; isoNumeric: string; lon: number; lat: number };
  timeseries: YearMetric[];
  products: CountryProduct[];
  partners: { exportPartners: Partner[]; importPartners: Partner[] };
  chains: ChainBrief[];
  latestYear: number;
}

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

/* ---------- 全球资源地图 ---------- */

export interface ResourceBrief {
  id: string;
  name: string;
  unit: string;
  color: string;
  description: string;
  siteCount: number;
  consumerCount: number;
}

/** GeoJSON Point Feature 的属性（产地 / 消费国共用） */
export interface ResourcePointProps {
  name: string;
  country?: string; // 产地所在国家 / 地区
  code?: string; // 消费国 ISO3
  value: number; // 生产量 / 消费量
  unit: string;
}

export interface ResourceFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: ResourcePointProps;
}

export interface ResourceFeatureCollection {
  type: 'FeatureCollection';
  features: ResourceFeature[];
}

/** 国家在某资源上的角色：producer 主要生产国 / exporter 主要出口国 / dependent 高依赖进口国 */
export type ResourceRoleKey = 'producer' | 'exporter' | 'dependent';

export interface ResourceRole {
  code: string; // ISO3
  name: string;
  isoNumeric: string;
  annualProduction: number | null;
  exportShare: number | null;
  importDependency: number | null;
  roles: ResourceRoleKey[];
}

export interface ResourceRoleNotes {
  production: string;
  export: string;
  dependency: string;
  yearLabel: string;
}

export interface ResourceDetail {
  resource: Omit<ResourceBrief, 'siteCount' | 'consumerCount'>;
  production: ResourceFeatureCollection; // 产地分布
  consumption: ResourceFeatureCollection; // 主要消费国
  roles: ResourceRole[]; // 三类国家角色（后端按阈值动态判定）
  roleNotes: ResourceRoleNotes | null;
}

/* ---------- 资源贸易运输航线 ---------- */

/** 航线类型：sea 海运航线 / pipe 油气管道 / land 陆路运输 */
export type TradeRouteKind = 'sea' | 'pipe' | 'land';

export interface TradeRoute {
  key: string;
  /** 出口地（产地 / 出口国 / 港口） */
  from: string;
  /** 进口地（消费国 / 港口） */
  to: string;
  kind: TradeRouteKind;
  /** 年贸易流量（单位同资源 unit），决定连线粗细与粒子密度 */
  value: number;
  /** 途径点 [经度, 纬度]，首 = 出口、末 = 进口；粒子严格按此顺序流动 */
  points: [number, number][];
}

export interface ResourceRoutes {
  resource: Omit<ResourceBrief, 'siteCount' | 'consumerCount'>;
  routes: TradeRoute[];
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
}

async function get<T>(url: string): Promise<T> {
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

  return res.json() as Promise<T>;
}

export const api = {
  meta: () => get<{ years: number[]; regions: { id: string; name: string }[] }>('/api/meta'),
  countries: (year: number) =>
    get<{ year: number; countries: CountryListItem[] }>(`/api/countries?year=${year}`),
  country: (code: string) => get<CountryDetail>(`/api/countries/${code}`),
  trade: (year: number, country?: string | null) =>
    get<{ year: number; focus: string | null; flows: TradeFlow[] }>(
      `/api/trade?year=${year}${country ? `&country=${country}` : ''}`
    ),
  chains: () => get<{ chains: ChainBrief[] }>('/api/chains'),
  chain: (id: string) => get<ChainDetail>(`/api/chains/${id}`),
  resources: () => get<{ resources: ResourceBrief[] }>('/api/resources'),
  resource: (id: string) => get<ResourceDetail>(`/api/resources/${id}`),
  resourceRoutes: (id: string) => get<ResourceRoutes>(`/api/resources/${id}/routes`),
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
