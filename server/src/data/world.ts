/**
 * 全球总量参照值（世界口径），用于「全球位置」模块的占比分母。
 *
 * 数据来源（近似值，与本项目示例数据同口径整理）：
 * - gdp：名义 GDP，现价美元，World Bank NY.GDP.MKTP.CD
 * - population：世界总人口，World Bank SP.POP.TOTL / UN World Population Prospects
 * - exports：全球货物出口额，现价美元，WTO Stats / World Bank TX.VAL.MRCH.CD.WT
 *
 * 注意：不能用 METRICS 中 43 个收录经济体的合计代替全球总量——
 * 该集合 2023 年 GDP 合计约 94.2T（全球约 105.4T）、人口合计约 60.1 亿（全球约 80.9 亿）、
 * 出口合计约 19.4T（全球约 24.0T），直接做分母会使各国份额系统性偏高。
 */

export interface WorldTotalSeed {
  year: number;
  gdp: number; // 名义 GDP，美元
  population: number; // 人口，人
  exports: number; // 货物出口额，美元
}

const T = 1e12;
const M = 1e6; // 人口源数据单位为「百万人」

export const WORLD_TOTALS: WorldTotalSeed[] = [
  // year  GDP（万亿美元） 人口（百万人） 货物出口（万亿美元）
  { year: 2000, gdp: 33.87 * T, population: 6143 * M, exports: 6.45 * T },
  { year: 2005, gdp: 47.54 * T, population: 6558 * M, exports: 10.49 * T },
  { year: 2010, gdp: 66.77 * T, population: 6986 * M, exports: 15.29 * T },
  { year: 2015, gdp: 75.12 * T, population: 7427 * M, exports: 16.55 * T },
  { year: 2020, gdp: 85.38 * T, population: 7821 * M, exports: 17.65 * T },
  { year: 2023, gdp: 105.43 * T, population: 8093 * M, exports: 24.02 * T },
];

export const worldTotalsByYear = new Map<number, WorldTotalSeed>(
  WORLD_TOTALS.map((w) => [w.year, w])
);
