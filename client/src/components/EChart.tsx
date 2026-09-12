import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { LineChart, BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

/** 深色主题通用配置片段 */
export const darkTooltip = {
  backgroundColor: 'rgba(14,18,26,0.96)',
  borderColor: 'rgba(150,175,205,0.3)',
  textStyle: { color: '#e6ebf2', fontSize: 12 },
};
export const axisStyle = {
  axisLine: { lineStyle: { color: 'rgba(150,175,205,0.25)' } },
  axisLabel: { color: '#8b97a9', fontSize: 11 },
  axisTick: { show: false },
};
export const splitLine = { lineStyle: { color: 'rgba(150,175,205,0.08)' } };

export default function EChart({
  option,
  height = 250,
  notMerge = true,
}: {
  option: echarts.EChartsCoreOption;
  height?: number;
  /** false 时按合并模式更新，年份切换等增量变化可平滑动画过渡 */
  notMerge?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    inst.current = echarts.init(ref.current);
    const onResize = () => inst.current?.resize();
    const ro = new ResizeObserver(onResize);
    ro.observe(ref.current);
    window.addEventListener('resize', onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      inst.current?.dispose();
    };
  }, []);

  useEffect(() => {
    inst.current?.setOption(option, notMerge);
  }, [option, notMerge]);

  return <div ref={ref} style={{ width: '100%', height }} />;
}
