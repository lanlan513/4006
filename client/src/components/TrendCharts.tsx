/**
 * 近年变化趋势模块：GDP 增长率 / 人口变化 / 进出口贸易额。
 * 数据来自 /api/country-profile 返回的 timeseries 历史数组（取最近 10 年），
 * 每张图独立校验有效数据点：少于 2 个时降级为文本提示，不渲染空坐标轴。
 */
import EChart, { darkTooltip, axisStyle, splitLine } from './EChart';
import type { YearMetric } from '../schemas';
import { fmtCompact, fmtPopulationCompact, hasValue } from '../format';

/** 仅展示最近 N 年（API 返回的 timeseries 已按年份升序排列） */
const TREND_YEARS = 10;
/** 绘制趋势图所需的最少有效数据点数，不足时降级为提示文本 */
const MIN_POINTS = 2;

/** Tooltip 数值格式化：缺测（null / '-'）统一显示 "--"，避免 Number(null) === 0 的误导 */
const tipFmt = (fmt: (n: number) => string) => (v: unknown) => {
  if (v == null) return '--';
  const n = Number(v);
  return Number.isFinite(n) ? fmt(n) : '--';
};

function TrendCard({ title, sub, points, option }: {
  title: string;
  sub: string;
  /** 该指标的有效数据点数（非 null 的年度数） */
  points: number;
  option: Parameters<typeof EChart>[0]['option'];
}) {
  return (
    <div className="chart-card">
      <h4>{title}</h4>
      <p>{sub}</p>
      {points >= MIN_POINTS ? (
        <EChart option={option} height={230} />
      ) : (
        <div className="chart-fallback" role="status">
          历史数据不足（仅 {points} 个有效年度），暂无法绘制趋势图。
        </div>
      )}
    </div>
  );
}

export default function TrendCharts({ timeseries }: { timeseries: YearMetric[] }) {
  // 取最近 10 年；slice 不改动原数组，切换国家 / 年份时随新数据自动重算
  const recent = timeseries.slice(-TREND_YEARS);
  const years = recent.map((t) => t.year);
  const range = years.length > 0 ? `${years[0]}–${years[years.length - 1]}` : '';

  // 各指标独立统计有效数据点：某一项缺测不影响其他图表渲染
  const growthPoints = recent.filter((t) => hasValue(t.gdpGrowth)).length;
  const popPoints = recent.filter((t) => hasValue(t.population)).length;
  const tradePoints = recent.filter((t) => hasValue(t.exports) || hasValue(t.imports)).length;

  const growthOption = {
    tooltip: { trigger: 'axis', ...darkTooltip, valueFormatter: tipFmt((n) => `${n.toFixed(1)}%`) },
    grid: { left: 44, right: 18, top: 18, bottom: 30 },
    xAxis: { type: 'category', data: years, ...axisStyle },
    yAxis: { type: 'value', ...axisStyle, splitLine, axisLabel: { ...axisStyle.axisLabel, formatter: '{value}%' } },
    series: [
      {
        name: 'GDP 增长率',
        type: 'bar',
        data: recent.map((t) => ({
          value: t.gdpGrowth,
          itemStyle: {
            color: (t.gdpGrowth ?? 0) >= 0 ? '#4e8571' : '#c06a58',
            borderRadius: [3, 3, 0, 0],
          },
        })),
        barMaxWidth: 18,
      },
    ],
  };

  const popOption = {
    tooltip: { trigger: 'axis', ...darkTooltip, valueFormatter: tipFmt((n) => fmtPopulationCompact(n)) },
    grid: { left: 52, right: 18, top: 18, bottom: 30 },
    xAxis: { type: 'category', data: years, ...axisStyle },
    yAxis: {
      type: 'value',
      ...axisStyle,
      splitLine,
      axisLabel: { ...axisStyle.axisLabel, formatter: (v: number) => fmtPopulationCompact(v) },
    },
    series: [
      {
        name: '人口',
        type: 'line',
        smooth: true,
        symbolSize: 6,
        data: recent.map((t) => t.population),
        lineStyle: { color: '#7c9cc9', width: 2.5 },
        itemStyle: { color: '#7c9cc9' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(124,156,201,0.26)' },
              { offset: 1, color: 'rgba(124,156,201,0.01)' },
            ],
          },
        },
      },
    ],
  };

  const tradeOption = {
    tooltip: { trigger: 'axis', ...darkTooltip, valueFormatter: tipFmt((n) => `$${fmtCompact(n)}`) },
    legend: { data: ['出口', '进口'], textStyle: { color: '#8b97a9' }, top: 0, right: 0 },
    grid: { left: 52, right: 18, top: 34, bottom: 30 },
    xAxis: { type: 'category', data: years, ...axisStyle },
    yAxis: {
      type: 'value',
      ...axisStyle,
      splitLine,
      axisLabel: { ...axisStyle.axisLabel, formatter: (v: number) => `$${fmtCompact(v)}` },
    },
    series: [
      {
        name: '出口',
        type: 'bar',
        data: recent.map((t) => t.exports),
        itemStyle: { color: '#57a9c9', borderRadius: [3, 3, 0, 0] },
        barMaxWidth: 12,
      },
      {
        name: '进口',
        type: 'bar',
        data: recent.map((t) => t.imports),
        itemStyle: { color: 'rgba(208,122,110,0.75)', borderRadius: [3, 3, 0, 0] },
        barMaxWidth: 12,
      },
    ],
  };

  return (
    <>
      <div className="section-title">近年变化趋势{range ? `（${range}）` : ''}</div>
      <div className="trend-grid">
        <TrendCard
          title="GDP 增长率"
          sub="年度实际增速 % · 正增长绿色 / 负增长红色"
          points={growthPoints}
          option={growthOption}
        />
        <TrendCard
          title="人口变化"
          sub="常住人口总量 · 悬浮查看具体数值"
          points={popPoints}
          option={popOption}
        />
        <TrendCard
          title="进出口贸易额"
          sub="货物贸易额，美元 · 出口与进口对比"
          points={tradePoints}
          option={tradeOption}
        />
      </div>
    </>
  );
}
