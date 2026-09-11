/**
 * 接口返回数据的 Zod Schema 与推导类型。
 * 所有数值字段统一允许 null：SQLite 中指标列允许为空，
 * 前端拿到 null 后用格式化工具兜底为「—」，避免出现 undefined 运算异常。
 */
import { z } from 'zod';

/** 可空数值：后端缺测指标以 null 表示 */
const nullableNumber = z.number().nullable();

/* ---------------- 国家基本信息 ---------------- */

export const countryInfoSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  region: z.string(),
  isoNumeric: z.string(),
  lon: z.number(),
  lat: z.number(),
});
export type CountryInfo = z.infer<typeof countryInfoSchema>;

/* ---------------- 年度指标 ---------------- */

export const yearMetricSchema = z.object({
  year: z.number().int(),
  gdp: nullableNumber, // 名义 GDP，现价美元
  gdpGrowth: nullableNumber, // 实际 GDP 增速 %
  population: nullableNumber, // 人口（人）
  gdpPerCapita: nullableNumber, // 人均 GDP，美元
  exports: nullableNumber, // 货物出口额，美元
  imports: nullableNumber, // 货物进口额，美元
});
export type YearMetric = z.infer<typeof yearMetricSchema>;

/** 当前选中年份的核心画像：在年度指标基础上增加贸易总额 */
export const profileSummarySchema = yearMetricSchema.extend({
  tradeTotal: nullableNumber, // 贸易总额 = 出口 + 进口，美元
});
export type ProfileSummary = z.infer<typeof profileSummarySchema>;

/* ---------------- 贸易商品 / 伙伴 / 产业链 ---------------- */

export const countryProductSchema = z.object({
  flowType: z.enum(['ex', 'im']),
  share: z.number(),
  rank: z.number(),
  productCode: z.string(),
  productName: z.string(),
  category: z.string(),
  chainId: z.string().nullable(),
});
export type CountryProduct = z.infer<typeof countryProductSchema>;

export const partnerSchema = z.object({
  code: z.string(),
  name: z.string(),
  value: z.number(),
});
export type Partner = z.infer<typeof partnerSchema>;

export const chainBriefSchema = z.object({
  id: z.string(),
  name: z.string(),
  subtitle: z.string(),
});
export type ChainBrief = z.infer<typeof chainBriefSchema>;

/* ---------------- GET /api/country-profile 响应 ---------------- */

export const countryProfileSchema = z.object({
  year: z.number().int(), // 本次实际使用的年份（后端会把非法年份回落到默认年度）
  latestYear: z.number().int(),
  country: countryInfoSchema, // 国家基本信息
  summary: profileSummarySchema.nullable(), // 当前年份核心指标，无数据时为 null
  timeseries: z.array(yearMetricSchema), // 历史指标序列（图表用）
  productsYear: z.number().int().nullable(), // 商品结构对应的数据年份
  products: z.array(countryProductSchema),
  partners: z.object({
    exportPartners: z.array(partnerSchema),
    importPartners: z.array(partnerSchema),
  }),
  chains: z.array(chainBriefSchema),
});
export type CountryProfile = z.infer<typeof countryProfileSchema>;
