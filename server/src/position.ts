/**
 * 国家经济画像的「同比变化率」与「全球位置」计算。
 *
 * 数据口径：
 * - 排名基于当前收录的全部经济体（种子集 43 个主要经济体）在该年度的指标，
 *   页面会明确标注为「收录经济体排名」，避免被理解为全球排名。
 * - 占比分母必须使用真实全球总量（见 data/world.ts），不能用收录经济体合计，
 *   否则各国份额会系统性偏高（该集合只覆盖约 9 成 GDP / 7 成人口 / 8 成出口）。
 * - 任一指标在该年度为 NULL 的国家不参与该指标的排名。
 */

/** 年度指标行（SQL 列名已在调用处转为驼峰） */
export interface MetricRow {
  code: string;
  gdp: number | null;
  population: number | null;
  gdpPerCapita: number | null;
  exports: number | null;
  imports: number | null;
}

/** 单项指标的全球位置：收录经济体排名、占全球总量 %、全球总量 */
export interface PositionStat {
  rank: number | null; // 在收录经济体中的名次，1 起；指标缺测时为 null
  total: number | null; // 该指标全球总量（美元 / 人），参照值缺失时为 null
  share: number | null; // 占全球总量百分比，已保留两位小数
  count: number; // 参与排名的收录经济体数量
}

export interface GlobalPosition {
  year: number;
  gdp: PositionStat;
  population: PositionStat;
  exports: PositionStat;
}

type MetricKey = 'gdp' | 'population' | 'exports';

function toNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * 计算一个指标的收录经济体排名与全球占比。
 * 排名采用竞争排名（1224）：并列国家获得相同名次。
 * @param worldTotal 该指标的真实全球总量（占比分母），缺失则 share 为 null
 */
function positionOf(
  rows: MetricRow[],
  code: string,
  key: MetricKey,
  worldTotal: number | null
): PositionStat {
  const values = rows
    .map((r) => ({ code: r.code, value: toNumber(r[key]) }))
    .filter((r): r is { code: string; value: number } => r.value !== null);

  const current = values.find((r) => r.code === code);
  const validTotal = worldTotal !== null && Number.isFinite(worldTotal) && worldTotal > 0;

  if (!current) {
    return { rank: null, total: validTotal ? worldTotal : null, share: null, count: values.length };
  }

  // 竞争排名：严格大于本国的收录国家数 + 1
  const rank = values.filter((r) => r.value > current.value).length + 1;
  const share = validTotal
    ? Math.round((current.value / worldTotal) * 10000) / 100
    : null;

  return { rank, total: validTotal ? worldTotal : null, share, count: values.length };
}

/**
 * 全球位置：GDP / 人口 / 出口额的收录经济体排名与全球占比。
 * @param yearRows 该年度全部收录国家的指标行（LEFT JOIN，含 NULL）
 * @param worldTotals 该年度全球 GDP / 人口 / 出口总量参照值
 */
export function computeGlobalPosition(
  yearRows: MetricRow[],
  code: string,
  year: number,
  worldTotals: { gdp: number | null; population: number | null; exports: number | null }
): GlobalPosition {
  return {
    year,
    gdp: positionOf(yearRows, code, 'gdp', worldTotals.gdp),
    population: positionOf(yearRows, code, 'population', worldTotals.population),
    exports: positionOf(yearRows, code, 'exports', worldTotals.exports),
  };
}

/** 单项同比：pct = (current - prev) / |prev| * 100；任一缺测 / 基期为 0 时为 null */
function yoyPct(current: number | null, prev: number | null): number | null {
  if (current === null || prev === null || !Number.isFinite(current) || !Number.isFinite(prev) || prev === 0) {
    return null;
  }
  return Math.round(((current - prev) / Math.abs(prev)) * 10000) / 100;
}

export interface CountryYoy {
  /** 对比的基准年（上一个有数据的收录年度），无基期时为 null */
  baseYear: number | null;
  gdp: number | null;
  population: number | null;
  gdpPerCapita: number | null;
  tradeTotal: number | null;
}

export interface YoyRow {
  year: number;
  gdp: number | null;
  population: number | null;
  gdpPerCapita: number | null;
  exports: number | null;
  imports: number | null;
}

/**
 * 同比变化率：与「上一个收录年度」对比（离散年度序列，如 2023 → 2020）。
 * 若某国在紧邻的上一年度缺测，则向前再取最近的有数据年度。
 */
export function computeYoy(series: YoyRow[], year: number): CountryYoy {
  const cur = series.find((m) => m.year === year);
  // 早于当前年的历史行，按年份倒序（最近的在前，便于取“上一个有数据年度”）
  const prevRows = series.filter((m) => m.year < year).sort((a, b) => b.year - a.year);

  /** 取该指标最近一个非空年度作为基期 */
  const prevValue = (key: keyof YoyRow): number | null => {
    for (const row of prevRows) {
      const v = toNumber(row[key]);
      if (v !== null) return v;
    }
    return null;
  };

  const baseYear = prevRows.length > 0 ? prevRows[0].year : null;
  if (!cur) return { baseYear, gdp: null, population: null, gdpPerCapita: null, tradeTotal: null };

  const tradeOf = (m: YoyRow): number | null =>
    m.exports !== null && m.imports !== null ? m.exports + m.imports : null;

  const prevTrade = (): number | null => {
    for (const row of prevRows) {
      const t = tradeOf(row);
      if (t !== null) return t;
    }
    return null;
  };

  return {
    baseYear,
    gdp: yoyPct(toNumber(cur.gdp), prevValue('gdp')),
    population: yoyPct(toNumber(cur.population), prevValue('population')),
    gdpPerCapita: yoyPct(toNumber(cur.gdpPerCapita), prevValue('gdpPerCapita')),
    tradeTotal: yoyPct(tradeOf(cur), prevTrade()),
  };
}
