import EChart, { darkTooltip, axisStyle } from './EChart';

interface Props {
  /** 0-14 岁占比 % */
  youth: number;
  /** 15-64 岁劳动年龄占比 % */
  working: number;
  /** 65 岁及以上占比 % */
  aging: number;
  height?: number;
  /** 紧凑模式（悬浮卡片用）：隐藏坐标轴标签，仅保留塔形与数值 */
  compact?: boolean;
}

const GROUPS = [
  { key: 'aging', label: '65岁及以上', short: '65+', color: '#c98a6d' },
  { key: 'working', label: '15-64岁 劳动年龄', short: '15-64', color: '#e0a94f' },
  { key: 'youth', label: '0-14岁', short: '0-14', color: '#57a9c9' },
] as const;

/**
 * 人口年龄结构金字塔：三段水平条形关于中轴对称，
 * 上老下小，直观呈现所选国家某一年的人口结构形态。
 */
export default function PyramidChart({ youth, working, aging, height = 190, compact = false }: Props) {
  const values = [aging, working, youth];
  const maxV = Math.max(...values, 1);
  // 对称轴域：左右各留出标签空间，塔身始终居中
  const bound = Math.ceil((maxV / 2 + 6) / 5) * 5;

  const option = {
    tooltip: {
      ...darkTooltip,
      trigger: 'item',
      formatter: (p: any) => {
        const g = GROUPS[p.dataIndex];
        return `<b>${g.label}</b><br/>占总人口 ${values[p.dataIndex].toFixed(1)}%`;
      },
    },
    grid: compact
      ? { left: 44, right: 42, top: 6, bottom: 4 }
      : { left: 108, right: 48, top: 10, bottom: 22 },
    xAxis: {
      type: 'value',
      min: -bound,
      max: bound,
      show: !compact,
      ...axisStyle,
      axisLabel: {
        ...axisStyle.axisLabel,
        formatter: (v: number) => `${Math.abs(v).toFixed(0)}%`,
      },
      splitLine: { show: !compact, lineStyle: { color: 'rgba(150,175,205,0.08)' } },
    },
    yAxis: {
      type: 'category',
      data: GROUPS.map((g) => (compact ? g.short : g.label)),
      ...axisStyle,
      axisLabel: { ...axisStyle.axisLabel, fontSize: compact ? 10 : 11 },
      axisLine: { show: false },
    },
    series: [
      {
        name: 'left',
        type: 'bar',
        stack: 'pyramid',
        barWidth: compact ? 13 : 17,
        data: values.map((v, i) => ({
          value: -v / 2,
          itemStyle: { color: GROUPS[i].color, borderRadius: [3, 0, 0, 3] },
        })),
      },
      {
        name: 'right',
        type: 'bar',
        stack: 'pyramid',
        barWidth: compact ? 13 : 17,
        data: values.map((v, i) => ({
          value: v / 2,
          itemStyle: { color: GROUPS[i].color, borderRadius: [0, 3, 3, 0] },
          label: {
            show: true,
            position: 'right',
            distance: 5,
            formatter: () => `${values[i].toFixed(1)}%`,
            color: '#8b97a9',
            fontSize: compact ? 9.5 : 11,
            fontWeight: 600,
          },
        })),
      },
    ],
  };

  return <EChart option={option} height={height} />;
}
