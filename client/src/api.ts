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
  popGrowth: number | null;
  agingRate: number | null;
  urbanRate: number | null;
  laborForce: number | null;
}

export interface YearMetric {
  year: number;
  gdp: number;
  gdpGrowth: number;
  population: number;
  gdpPerCapita: number;
  exports: number;
  imports: number;
  popGrowth: number;
  agingRate: number;
  urbanRate: number;
  laborForce: number;
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
