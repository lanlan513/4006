import { create } from 'zustand';

export type MetricKey = 'gdp' | 'gdpPerCapita' | 'trade' | 'gdpGrowth';

export const METRICS: { key: MetricKey; label: string; unit: string }[] = [
  { key: 'gdp', label: 'GDP 总量', unit: '美元' },
  { key: 'gdpPerCapita', label: '人均 GDP', unit: '美元' },
  { key: 'trade', label: '贸易额', unit: '美元' },
  { key: 'gdpGrowth', label: 'GDP 增速', unit: '%' },
];

interface AtlasState {
  year: number;
  selected: string | null;
  networkOn: boolean;
  metric: MetricKey;
  setYear: (y: number) => void;
  setSelected: (code: string | null) => void;
  toggleNetwork: (on?: boolean) => void;
  setMetric: (m: MetricKey) => void;
}

export const useAtlas = create<AtlasState>((set) => ({
  year: 2023,
  selected: null,
  networkOn: false,
  metric: 'gdp',
  setYear: (year) => set({ year }),
  setSelected: (selected) => set({ selected }),
  toggleNetwork: (on) => set((s) => ({ networkOn: on ?? !s.networkOn })),
  setMetric: (metric) => set({ metric }),
}));
