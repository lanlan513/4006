/** 数字与文本格式化工具 */

/** 数据缺失时卡片内的统一占位（NaN / null / undefined 均兜底为 "--"） */
export const NA = '--';

/** 是否为可展示的有限数值 */
export function hasValue(v: number | null | undefined): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** 千分位整数（四舍五入），如 17,790,000,000,000 */
export function fmtThousands(v: number | null | undefined): string {
  if (!hasValue(v)) return NA;
  return Math.round(v).toLocaleString('en-US');
}

const COMPACT_UNITS: Array<{ threshold: number; suffix: string; digits: number }> = [
  { threshold: 1e12, suffix: 'T', digits: 2 },
  { threshold: 1e9, suffix: 'B', digits: 2 },
  { threshold: 1e6, suffix: 'M', digits: 2 },
  { threshold: 1e3, suffix: 'K', digits: 1 },
];

/**
 * 紧凑数值：自动转换 T / B / M / K 单位（如 17.79T、335M、12.85K）。
 * 小于 1,000 的数值按千分位整数展示；缺测统一返回 "--"。
 */
export function fmtCompactNum(v: number | null | undefined): string {
  if (!hasValue(v)) return NA;
  const abs = Math.abs(v);
  for (const { threshold, suffix, digits } of COMPACT_UNITS) {
    if (abs >= threshold) {
      const scaled = v / threshold;
      // 整数部分较多时少保留小数，避免 123.46B 这类过宽展示
      const fixedDigits = abs >= threshold * 100 ? Math.max(0, digits - 1) : digits;
      return `${scaled.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: fixedDigits,
      })}${suffix}`;
    }
  }
  return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/** 紧凑美元金额：$17.79T / $3.38T / $12,950 */
export function fmtDollarsCompact(v: number | null | undefined): string {
  if (!hasValue(v)) return NA;
  return `$${fmtCompactNum(v)}`;
}

export function fmtDollars(v: number | null | undefined): string {
  if (v == null) return '—';
  const abs = Math.abs(v);
  // 中文大数体系：1 万亿 = 1e12，1 亿 = 1e8，1 万 = 1e4
  if (abs >= 1e12) return `$${(v / 1e12).toFixed(2)} 万亿`;
  if (abs >= 1e8) return `$${(v / 1e8).toFixed(abs >= 1e11 ? 0 : 1)} 亿`;
  if (abs >= 1e4) return `$${(v / 1e4).toFixed(1)} 万`;
  return `$${v.toFixed(0)}`;
}

/** 用"万亿/亿"中文大数体系（美元），用于轴标签等紧凑场景 */
export function fmtCompact(v: number | null | undefined): string {
  if (v == null) return '—';
  const abs = Math.abs(v);
  if (abs >= 1e12) return `${(v / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${(v / 1e9).toFixed(0)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
  return String(v);
}

export function fmtTradeB(v: number): string {
  return `$${(v / 1e9).toFixed(v >= 50e9 ? 0 : 1)}B`;
}

export function fmtPopulation(v: number | null | undefined): string {
  if (v == null) return '—';
  if (v >= 1e8) return `${(v / 1e8).toFixed(2)} 亿`;
  if (v >= 1e4) return `${(v / 1e4).toFixed(0)} 万`;
  return v.toFixed(0);
}

export function fmtGrowth(v: number | null | undefined): string {
  if (!hasValue(v)) return NA;
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}

/** 带正负号的百分比（同比变化率用），如 +5.2% / -0.3%；缺测为 "--" */
export function fmtSignedPct(v: number | null | undefined, digits = 1): string {
  if (!hasValue(v)) return NA;
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(digits)}%`;
}

/** 普通百分比（占比用），如 25.32% / 0.05%；缺测为 "--" */
export function fmtPct(v: number | null | undefined, digits = 2): string {
  if (!hasValue(v)) return NA;
  return `${v.toFixed(digits)}%`;
}

/** 名次：1 → "第 1 名"；缺测为 "--" */
export function fmtRank(v: number | null | undefined): string {
  if (!hasValue(v)) return NA;
  return `第 ${v} 名`;
}

/** 紧凑人口：M（百万）/ B（十亿）单位，如 1.41B、84M */
export function fmtPopulationCompact(v: number | null | undefined): string {
  if (!hasValue(v)) return NA;
  return fmtCompactNum(v);
}
