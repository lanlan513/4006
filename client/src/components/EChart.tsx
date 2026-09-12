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

export default function EChart({ option, height = 250 }: { option: echarts.EChartsCoreOption; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 防错：同一 DOM 节点上若残留旧实例（异常重挂载 / 热更新），先销毁再 init，
    // 避免 ECharts 重复绑定同一 Canvas 导致 "There is a chart instance already initialized" 警告
    echarts.getInstanceByDom(el)?.dispose();
    const chart = echarts.init(el);
    inst.current = chart;
    const onResize = () => {
      // 卸载后 ResizeObserver 可能仍有排队回调，需确认实例未被销毁
      if (!chart.isDisposed()) chart.resize();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(el);
    window.addEventListener('resize', onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      // 卸载时销毁实例：释放 Canvas、事件监听与内部定时器，防止内存泄漏
      chart.dispose();
      inst.current = null;
    };
  }, []);

  useEffect(() => {
    // 国家 / 年份切换时 option 变化：notMerge=true 全量重绘，无需销毁实例；
    // 若组件正在卸载（实例已 dispose）则跳过，避免在已销毁实例上 setOption 报错
    if (inst.current && !inst.current.isDisposed()) {
      inst.current.setOption(option, true);
    }
  }, [option]);

  return <div ref={ref} style={{ width: '100%', height }} />;
}
