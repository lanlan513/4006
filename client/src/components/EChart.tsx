import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { LineChart, BarChart, PieChart, TreemapChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([LineChart, BarChart, PieChart, TreemapChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

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

/**
 * ECharts 鼠标事件回调参数（仅声明本项目用到的字段，其余由 ECharts 运行时注入）。
 * 轴标签事件需对应轴开启 triggerEvent，params.event 为 zrender 事件（含相对画布的 offsetX/offsetY）。
 */
export interface ChartEventParams {
  componentType?: string;
  seriesIndex?: number;
  dataIndex?: number;
  name?: string;
  value?: unknown;
  event?: { offsetX?: number; offsetY?: number };
}

/** 事件绑定：直接传处理函数，或带 query（如 { componentType: 'yAxis' }）精确过滤触发源 */
export type ChartEventBinding = ((params: ChartEventParams) => void) | {
  query?: Record<string, unknown>;
  handler: (params: ChartEventParams) => void;
};

export default function EChart({ option, height = 250, onEvents }: {
  option: echarts.EChartsCoreOption;
  height?: number;
  /** 图表事件表：{ 事件名: 绑定 | 绑定数组 }，同一事件可挂多个不同 query 的绑定；依赖变化时自动解绑重绑 */
  onEvents?: Record<string, ChartEventBinding | ChartEventBinding[]>;
}) {
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

  useEffect(() => {
    const chart = inst.current;
    if (!chart || chart.isDisposed() || !onEvents) return;
    const entries = Object.entries(onEvents);
    for (const [name, binding] of entries) {
      const list = Array.isArray(binding) ? binding : [binding];
      for (const b of list) {
        // ECharts 的 on() 类型签名为 (...args: unknown[])，这里收窄为本模块的事件参数类型
        if (typeof b === 'function') chart.on(name, b as (params: unknown) => void);
        else chart.on(name, b.query ?? {}, b.handler as (params: unknown) => void);
      }
    }
    return () => {
      // 统一按事件名解绑（本组件是事件的唯一绑定方），避免在已销毁实例上调用
      if (!chart.isDisposed()) for (const [name] of entries) chart.off(name);
    };
  }, [onEvents]);

  return <div ref={ref} style={{ width: '100%', height }} />;
}
