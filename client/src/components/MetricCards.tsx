/**
 * 核心指标卡片：名义 GDP、人口、贸易规模、人均 GDP。
 *
 * - 数值紧凑展示（自动 T/B/M/K + 千分位），悬浮 title 展示完整千分位原值。
 * - 每张卡片展示相对上一个收录年度的同比变化率，带 ↑ / ↓ 箭头。
 * - 任一数值或变化率缺测（null / NaN）统一显示 "--"，绝不出现 NaN/null。
 * - 响应式：桌面 4 列、平板 2 列、移动端单列（样式见 global.css .metric-grid）。
 */
import type { ProfileSummary, CountryYoy } from '../schemas';
import {
  NA,
  hasValue,
  fmtDollarsCompact,
  fmtPopulationCompact,
  fmtSignedPct,
  fmtThousands,
} from '../format';

/** 趋势方向：上升 / 下降 / 持平（-0.05% ~ 0.05% 视为持平） */
function trendOf(v: number | null): 'up' | 'down' | 'flat' | null {
  if (!hasValue(v)) return null;
  if (v > 0.05) return 'up';
  if (v < -0.05) return 'down';
  return 'flat';
}

function TrendBadge({ change, baseYear }: { change: number | null; baseYear: number | null }) {
  const trend = trendOf(change);
  if (trend === null) {
    return <span className="metric-change na">{NA}</span>;
  }
  const arrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
  const label =
    baseYear !== null ? `较 ${baseYear} 年同比` : '同比';
  return (
    <span className={`metric-change ${trend}`} title={label}>
      <i className="metric-arrow" aria-hidden="true">
        {arrow}
      </i>
      {fmtSignedPct(change)}
      <em className="metric-yoy-label">{label}</em>
    </span>
  );
}

interface CardDef {
  key: string;
  label: string;
  accent: string; // CSS 变量 / 颜色值
  value: string;
  fullValue: string; // title 悬浮完整值
  change: number | null;
}

export default function MetricCards({
  summary,
  yoy,
}: {
  summary: ProfileSummary;
  yoy: CountryYoy;
}) {
  const tradeTotal =
    summary.tradeTotal ??
    (hasValue(summary.exports) && hasValue(summary.imports) ? summary.exports + summary.imports : null);

  const cards: CardDef[] = [
    {
      key: 'gdp',
      label: '名义 GDP',
      accent: 'var(--accent)',
      value: fmtDollarsCompact(summary.gdp),
      fullValue: hasValue(summary.gdp) ? `$${fmtThousands(summary.gdp)} 美元` : NA,
      change: yoy.gdp,
    },
    {
      key: 'population',
      label: '人口',
      accent: 'var(--cyan)',
      value: fmtPopulationCompact(summary.population),
      fullValue: hasValue(summary.population) ? `${fmtThousands(summary.population)} 人` : NA,
      change: yoy.population,
    },
    {
      key: 'trade',
      label: '贸易规模（出口 + 进口）',
      accent: 'var(--green)',
      value: fmtDollarsCompact(tradeTotal),
      fullValue: hasValue(tradeTotal) ? `$${fmtThousands(tradeTotal)} 美元` : NA,
      change: yoy.tradeTotal,
    },
    {
      key: 'gdpPerCapita',
      label: '人均 GDP',
      accent: '#a78bfa',
      value: fmtDollarsCompact(summary.gdpPerCapita),
      fullValue: hasValue(summary.gdpPerCapita)
        ? `$${fmtThousands(summary.gdpPerCapita)} 美元 / 人`
        : NA,
      change: yoy.gdpPerCapita,
    },
  ];

  return (
    <section className="metric-section" aria-label="核心指标">
      <div className="module-head">
        <h3 className="module-title">核心指标</h3>
        <span className="module-sub">
          {yoy.baseYear !== null ? `同比对比 ${yoy.baseYear} 年` : '当前年度'}
        </span>
      </div>
      <div className="metric-grid">
        {cards.map((c) => (
          <article
            className="metric-card"
            key={c.key}
            style={{ ['--metric-accent' as string]: c.accent }}
          >
            <div className="metric-label">{c.label}</div>
            <div className="metric-value" title={c.fullValue} aria-label={`${c.label}：${c.fullValue}`}>
              {c.value}
            </div>
            <div className="metric-footer">
              <TrendBadge change={c.change} baseYear={yoy.baseYear} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
