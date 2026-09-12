import { useEffect, useState } from 'react';
import EChart, { darkTooltip, axisStyle, splitLine } from './EChart';
import { api, CountryDetail, CountryListItem } from '../api';
import { fmtCompact, fmtMetric, fmtPopulation } from '../format';
import { POP_METRICS } from '../store';

interface Props {
  /** 当前选中国家（含当年指标快照），null 时显示引导提示 */
  country: CountryListItem | null;
  year: number;
  onClose: () => void;
}

/** 当前年份竖直标记线：随时间轴平滑移动 */
function yearMarkLine(year: number) {
  return {
    symbol: 'none',
    silent: true,
    animationDuration: 450,
    lineStyle: { color: 'rgba(230,235,242,0.5)', type: 'dashed' as const, width: 1.2 },
    label: {
      formatter: String(year),
      color: '#1a1408',
      fontSize: 10.5,
      fontWeight: 700 as const,
      backgroundColor: 'rgba(224,169,79,0.92)',
      padding: [2, 6] as unknown as number,
      borderRadius: 4,
    },
    data: [{ xAxis: year }],
  };
}

export default function SplitPanel({ country, year, onClose }: Props) {
  const [detail, setDetail] = useState<CountryDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 历史序列只在选中国家变化时重新拉取；年份切换仅移动标记线，保证平滑过渡
  useEffect(() => {
    if (!country) {
      setDetail(null);
      setError(null);
      return;
    }
    let alive = true;
    setDetail(null);
    setError(null);
    api
      .country(country.code)
      .then((r) => alive && setDetail(r))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [country?.code]);

  const ts = detail?.timeseries ?? [];
  const years = ts.map((t) => t.year);

  const popOption = {
    tooltip: {
      trigger: 'axis',
      ...darkTooltip,
      valueFormatter: (v: unknown) => fmtPopulation(Number(v)),
    },
    legend: { data: ['总人口', '劳动力规模'], textStyle: { color: '#8b97a9' }, top: 0, right: 0 },
    grid: { left: 58, right: 58, top: 36, bottom: 28 },
    xAxis: { type: 'category', data: years, boundaryGap: false, ...axisStyle },
    yAxis: [
      {
        type: 'value',
        name: '总人口',
        nameTextStyle: { color: '#8b97a9', fontSize: 10 },
        ...axisStyle,
        splitLine,
        axisLabel: { ...axisStyle.axisLabel, formatter: (v: number) => fmtPopulation(v) },
      },
      {
        type: 'value',
        name: '劳动力',
        nameTextStyle: { color: '#8b97a9', fontSize: 10 },
        ...axisStyle,
        splitLine: { show: false },
        axisLabel: { ...axisStyle.axisLabel, formatter: (v: number) => fmtPopulation(v) },
      },
    ],
    series: [
      {
        name: '总人口',
        type: 'line',
        smooth: true,
        symbolSize: 7,
        data: ts.map((t) => t.population),
        lineStyle: { color: '#c98a6d', width: 2.5 },
        itemStyle: { color: '#c98a6d' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(201,138,109,0.26)' },
              { offset: 1, color: 'rgba(201,138,109,0.01)' },
            ],
          },
        },
        markLine: yearMarkLine(year),
      },
      {
        name: '劳动力规模',
        type: 'line',
        smooth: true,
        symbolSize: 6,
        yAxisIndex: 1,
        data: ts.map((t) => t.laborForce),
        lineStyle: { color: '#e0a94f', width: 2 },
        itemStyle: { color: '#e0a94f' },
      },
    ],
  };

  const gdpOption = {
    tooltip: {
      trigger: 'axis',
      ...darkTooltip,
      valueFormatter: (v: unknown) => `$${fmtCompact(Number(v))}`,
    },
    legend: { data: ['名义 GDP', '人均 GDP'], textStyle: { color: '#8b97a9' }, top: 0, right: 0 },
    grid: { left: 58, right: 58, top: 36, bottom: 28 },
    xAxis: { type: 'category', data: years, boundaryGap: false, ...axisStyle },
    yAxis: [
      {
        type: 'value',
        name: 'GDP',
        nameTextStyle: { color: '#8b97a9', fontSize: 10 },
        ...axisStyle,
        splitLine,
        axisLabel: { ...axisStyle.axisLabel, formatter: (v: number) => `$${fmtCompact(v)}` },
      },
      {
        type: 'value',
        name: '人均',
        nameTextStyle: { color: '#8b97a9', fontSize: 10 },
        ...axisStyle,
        splitLine: { show: false },
        axisLabel: { ...axisStyle.axisLabel, formatter: (v: number) => `$${fmtCompact(v)}` },
      },
    ],
    series: [
      {
        name: '名义 GDP',
        type: 'line',
        smooth: true,
        symbolSize: 7,
        data: ts.map((t) => t.gdp),
        lineStyle: { color: '#e0a94f', width: 2.5 },
        itemStyle: { color: '#e0a94f' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(224,169,79,0.26)' },
              { offset: 1, color: 'rgba(224,169,79,0.01)' },
            ],
          },
        },
        markLine: yearMarkLine(year),
      },
      {
        name: '人均 GDP',
        type: 'line',
        smooth: true,
        symbolSize: 6,
        yAxisIndex: 1,
        data: ts.map((t) => t.gdpPerCapita),
        lineStyle: { color: '#57a9c9', width: 2 },
        itemStyle: { color: '#57a9c9' },
      },
    ],
  };

  return (
    <aside className="split-panel">
      <div className="split-head">
        <div>
          <div className="split-title">拆分视图 · 人口 × GDP</div>
          <div className="split-sub">
            {country ? `${country.name} · 当前年份 ${year}` : '尚未选择国家'}
          </div>
        </div>
        <button className="card-close split-close" onClick={onClose} title="关闭拆分视图">
          ✕
        </button>
      </div>

      {!country ? (
        <div className="split-empty">
          在左侧地图上点击一个国家，
          <br />
          这里将展示该国历史人口与 GDP 的双 Y 轴关系曲线。
        </div>
      ) : (
        <>
          {/* 当年人口指标快照：与时间轴年份严格绑定 */}
          <div className="split-stats">
            {POP_METRICS.map((m) => (
              <div className="split-stat" key={m.key}>
                <div className="ss-label">{m.label}</div>
                <div className="ss-value">{fmtMetric(m.key, country[m.key])}</div>
              </div>
            ))}
          </div>

          {error ? (
            <div className="split-empty" role="alert">
              历史数据加载失败：{error}
            </div>
          ) : !detail ? (
            <div className="split-empty">正在加载 {country.name} 的历史数据…</div>
          ) : (
            <>
              <div className="split-chart-card">
                <h4>历史人口 · 总人口 × 劳动力规模</h4>
                <p>
                  {years[0]}–{years[years.length - 1]} · 双 Y 轴 · 虚线标记当前年份 {year}
                </p>
                <EChart option={popOption} height={250} notMerge={false} />
              </div>
              <div className="split-chart-card">
                <h4>GDP · 总量 × 人均 GDP</h4>
                <p>
                  {years[0]}–{years[years.length - 1]} · 双 Y 轴 · 虚线标记当前年份 {year}
                </p>
                <EChart option={gdpOption} height={250} notMerge={false} />
              </div>
            </>
          )}
        </>
      )}
    </aside>
  );
}
