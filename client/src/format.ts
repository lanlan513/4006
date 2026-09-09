/** 数字与文本格式化工具 */

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
  if (v == null) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}
