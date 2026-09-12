import { useEffect, useMemo, useState } from 'react';
import EChart, { darkTooltip, axisStyle, splitLine } from './EChart';
import { api, ScatterRow, regionName } from '../api';
import { fmtDollars, fmtPopulation } from '../format';

interface Props {
  year: number;
  selected: string | null;
  onSelect: (code: string | null) => void;
}

/** 区域配色（与地图 / 产业链的暖冷色系保持一致） */
const REGION_COLORS: Record<string, string> = {
  north_america: '#57a9c9',
  east_asia: '#e0a94f',
  europe: '#7fb069',
  south_asia: '#c98a6d',
  latin_america: '#b48ac9',
  mideast: '#d07a6e',
  sub_saharan_africa: '#8b97a9',
  central_asia: '#6fc2b4',
};
const regionColor = (r: string) => REGION_COLORS[r] ?? '#8b97a9';

/** 劳动力人口比例 = 劳动力规模 / 总人口 */
const laborRatio = (r: ScatterRow) =>
  r.laborForce != null && r.population ? (r.laborForce / r.population) * 100 : null;

export default function ScatterView({ year, selected, onSelect }: Props) {
  const [rows, setRows] = useState<ScatterRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 全年份数据只拉取一次：坐标轴范围由此固定，播放时间轴时不再变化
  useEffect(() => {
    let alive = true;
    api
      .scatter()
      .then((r) => alive && setRows(r.countries))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  /**
   * 固定坐标轴域：基于全部年份数据一次性计算并取整，
   * 切换年份时 min/max 不变，ECharts 不会触发自动缩放，气泡轨迹平滑不跳变。
   */
  const domain = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    let xMin = Infinity;
    let xMax = -Infinity;
    let yMax = 0;
    for (const r of rows) {
      const x = laborRatio(r);
      if (x != null) {
        xMin = Math.min(xMin, x);
        xMax = Math.max(xMax, x);
      }
      if (r.gdpPerCapita != null) yMax = Math.max(yMax, r.gdpPerCapita);
    }
    if (!isFinite(xMin)) return null;
    return {
      xMin: Math.max(0, Math.floor((xMin - 4) / 5) * 5),
      xMax: Math.ceil((xMax + 4) / 5) * 5,
      yMin: 0,
      yMax: Math.ceil((yMax * 1.08) / 10000) * 10000,
    };
  }, [rows]);

  const regions = useMemo(
    () => (rows ? Array.from(new Set(rows.map((r) => r.region))) : []),
    [rows]
  );

  const option = useMemo(() => {
    if (!rows || !domain) return null;
    // 按国家代码稳定排序：合并更新时每个气泡保持身份，位置动画平滑过渡
    const pts = rows
      .filter((r) => r.year === year && laborRatio(r) != null && r.gdpPerCapita != null && r.population)
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((r) => {
        const isSel = r.code === selected;
        return {
          name: r.name,
          code: r.code,
          value: [laborRatio(r)!, r.gdpPerCapita!, r.population!],
          itemStyle: {
            color: regionColor(r.region),
            opacity: selected && !isSel ? 0.38 : 0.85,
            borderColor: isSel ? '#f2e7d0' : 'rgba(10,13,19,0.6)',
            borderWidth: isSel ? 2 : 0.6,
            shadowBlur: isSel ? 14 : 0,
            shadowColor: 'rgba(224,169,79,0.55)',
          },
          label: {
            show: isSel,
            position: 'top',
            formatter: r.name,
            color: '#f2e7d0',
            fontSize: 12,
            fontWeight: 700,
            textBorderColor: 'rgba(10,13,19,0.9)',
            textBorderWidth: 3,
          },
        };
      });
    return {
      animationDurationUpdate: 1300,
      animationEasingUpdate: 'cubicInOut' as const,
      tooltip: {
        ...darkTooltip,
        trigger: 'item',
        formatter: (p: any) => {
          const [x, y, pop] = p.data.value as [number, number, number];
          return [
            `<b>${p.data.name}</b> · ${year}`,
            `劳动力人口比例：${x.toFixed(1)}%`,
            `人均 GDP：${fmtDollars(y)}`,
            `总人口：${fmtPopulation(pop)}`,
          ].join('<br/>');
        },
      },
      grid: { left: 84, right: 40, top: 46, bottom: 64 },
      xAxis: {
        type: 'value',
        name: '劳动力人口比例（劳动力规模 / 总人口）',
        nameLocation: 'middle',
        nameGap: 34,
        nameTextStyle: { color: '#8b97a9', fontSize: 12 },
        min: domain.xMin,
        max: domain.xMax,
        ...axisStyle,
        splitLine,
        axisLabel: { ...axisStyle.axisLabel, formatter: '{value}%' },
      },
      yAxis: {
        type: 'value',
        name: '人均 GDP（美元）',
        nameTextStyle: { color: '#8b97a9', fontSize: 12, align: 'left' },
        min: domain.yMin,
        max: domain.yMax,
        ...axisStyle,
        splitLine,
        axisLabel: {
          ...axisStyle.axisLabel,
          formatter: (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`),
        },
      },
      series: [
        {
          type: 'scatter',
          data: pts,
          symbolSize: (val: number[]) => 5 + Math.sqrt(val[2]) / 1150,
          emphasis: { scale: 1.15 },
        },
      ],
    };
  }, [rows, domain, year, selected]);

  const events = useMemo(
    () => ({
      click: (p: any) => {
        if (p?.data?.code) onSelect(p.data.code);
      },
    }),
    [onSelect]
  );

  return (
    <div className="scatter-wrap">
      {error ? (
        <div className="scatter-status" role="alert">
          散点数据加载失败：{error}
        </div>
      ) : !option ? (
        <div className="scatter-status">正在加载人口 × 经济散点数据…</div>
      ) : (
        <>
          <EChart option={option} height="100%" notMerge={false} onEvents={events} />
          <div className="scatter-year">{year}</div>
          <div className="scatter-legend">
            {regions.map((r) => (
              <span key={r}>
                <i style={{ background: regionColor(r) }} />
                {regionName(r)}
              </span>
            ))}
          </div>
          <div className="scatter-hint">
            气泡大小 = 总人口 · 坐标轴范围已固定，播放时间轴观察气泡轨迹 · 点击气泡查看国家
          </div>
        </>
      )}
    </div>
  );
}
