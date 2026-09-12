import { create } from 'zustand';

export type MetricKey = 'gdp' | 'gdpPerCapita' | 'trade' | 'gdpGrowth';
export type PopMetricKey = 'population' | 'popGrowth' | 'agingRate' | 'urbanRate' | 'laborForce';
export type MapMetricKey = MetricKey | PopMetricKey;

export const METRICS: { key: MetricKey; label: string; unit: string }[] = [
  { key: 'gdp', label: 'GDP 总量', unit: '美元' },
  { key: 'gdpPerCapita', label: '人均 GDP', unit: '美元' },
  { key: 'trade', label: '贸易额', unit: '美元' },
  { key: 'gdpGrowth', label: 'GDP 增速', unit: '%' },
];

export const POP_METRICS: { key: PopMetricKey; label: string; unit: string }[] = [
  { key: 'population', label: '总人口', unit: '人' },
  { key: 'popGrowth', label: '人口增长率', unit: '%' },
  { key: 'agingRate', label: '老龄化率', unit: '%' },
  { key: 'urbanRate', label: '城市化率', unit: '%' },
  { key: 'laborForce', label: '劳动力规模', unit: '人' },
];

const POP_KEYS: string[] = POP_METRICS.map((m) => m.key);
export const isPopMetric = (k: MapMetricKey): k is PopMetricKey => POP_KEYS.includes(k);

export const ALL_METRICS: { key: MapMetricKey; label: string; unit: string }[] = [
  ...METRICS,
  ...POP_METRICS,
];
export const metricLabel = (k: MapMetricKey) => ALL_METRICS.find((m) => m.key === k)?.label ?? k;

interface AtlasState {
  year: number;
  selected: string | null;
  networkOn: boolean;
  metric: MapMetricKey;
  splitView: boolean;
  setYear: (y: number) => void;
  setSelected: (code: string | null) => void;
  toggleNetwork: (on?: boolean) => void;
  setMetric: (m: MapMetricKey) => void;
  toggleSplitView: (on?: boolean) => void;
}

export const useAtlas = create<AtlasState>((set) => ({
  year: 2023,
  selected: null,
  networkOn: false,
  metric: 'gdp',
  splitView: false,
  setYear: (year) => set({ year }),
  setSelected: (selected) => set({ selected }),
  toggleNetwork: (on) => set((s) => ({ networkOn: on ?? !s.networkOn })),
  setMetric: (metric) => set({ metric }),
  toggleSplitView: (on) => set((s) => ({ splitView: on ?? !s.splitView })),
}));
