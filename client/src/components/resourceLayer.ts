/**
 * 资源图层管理器。
 *
 * 负责资源分布图层中「热力画布」的完整生命周期：
 *  - mount()   从 GeoJSON 构建热力点位数据并启动渲染循环
 *  - unmount() 卸载当前图层的点位与热力数据：取消动画帧、清空数据引用、
 *              擦除画布，释放内存供 GC 回收
 *  - detach()  组件卸载时断开画布与尺寸监听
 *
 * 切换资源分类时必须「先 unmount 再 mount」，防止跨资源数据叠加
 * 导致的内存泄漏和视图重叠。
 */
import type { ResourceFeatureCollection } from '../api';

export interface MapTransform {
  x: number;
  y: number;
  k: number;
}

interface HeatPoint {
  x: number; // 投影后的 SVG 用户坐标
  y: number;
  intensity: number; // 0-1，由生产量归一化
}

/** 视图几何：SVG viewBox 尺寸，用于把用户坐标换算为画布像素 */
export const VIEW_W = 1000;
export const VIEW_H = 520;

function hexToRgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export class ResourceLayerManager {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private observer: ResizeObserver | null = null;
  private raf: number | null = null;
  private heat: HeatPoint[] = [];
  private color = '#ffffff';
  private transform: MapTransform = { x: 0, y: 0, k: 1 };
  private dpr = 1;

  /** 绑定热力画布，并按容器尺寸与 devicePixelRatio 调整分辨率 */
  attach(canvas: HTMLCanvasElement) {
    this.detach();
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = canvas;
      if (!w || !h) return;
      canvas.width = Math.round(w * this.dpr);
      canvas.height = Math.round(h * this.dpr);
    };
    resize();
    this.observer = new ResizeObserver(resize);
    this.observer.observe(canvas);
  }

  /**
   * 挂载资源图层：从产地 GeoJSON 构建热力点位并启动渲染循环。
   * 防御性地先卸载旧图层，保证任何时刻只有一份图层数据。
   */
  mount(production: ResourceFeatureCollection, color: string, project: (lon: number, lat: number) => [number, number] | null) {
    this.unmount();
    this.color = color;
    const max = Math.max(...production.features.map((f) => f.properties.value), 1);
    this.heat = production.features.flatMap((f) => {
      const p = project(f.geometry.coordinates[0], f.geometry.coordinates[1]);
      if (!p) return [];
      return [{ x: p[0], y: p[1], intensity: Math.sqrt(f.properties.value / max) }];
    });
    const loop = (t: number) => {
      this.draw(t);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  /** 同步地图缩放 / 平移，下一帧生效 */
  setTransform(t: MapTransform) {
    this.transform = t;
  }

  /**
   * 卸载当前图层：取消渲染循环、清空热力点位数据、擦除画布。
   * 切换资源前调用，避免新旧资源的热力数据叠加。
   */
  unmount() {
    if (this.raf != null) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.heat = [];
    this.clear();
  }

  /** 组件卸载：在 unmount 基础上进一步释放画布与监听器 */
  detach() {
    this.unmount();
    this.observer?.disconnect();
    this.observer = null;
    this.canvas = null;
    this.ctx = null;
  }

  private clear() {
    const { ctx, canvas } = this;
    if (!ctx || !canvas) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  /** 绘制热力层：径向渐变光斑，叠加混合，带轻微呼吸动画 */
  private draw(time: number) {
    const { ctx, canvas } = this;
    if (!ctx || !canvas || this.heat.length === 0) return;
    this.clear();

    const cw = canvas.width / this.dpr;
    const ch = canvas.height / this.dpr;
    // preserveAspectRatio="xMidYMid meet" 的留白换算
    const scale = Math.min(cw / VIEW_W, ch / VIEW_H);
    const ox = (cw - VIEW_W * scale) / 2;
    const oy = (ch - VIEW_H * scale) / 2;
    const { x: tx, y: ty, k } = this.transform;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.globalCompositeOperation = 'lighter';

    this.heat.forEach((p, i) => {
      const px = ox + (p.x * k + tx) * scale;
      const py = oy + (p.y * k + ty) * scale;
      const r = (16 + 44 * p.intensity) * k * scale;
      if (px < -r || px > cw + r || py < -r || py > ch + r) return;
      const pulse = 0.82 + 0.18 * Math.sin(time / 640 + i * 1.7);
      const alpha = (0.1 + 0.3 * p.intensity) * pulse;
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, hexToRgba(this.color, alpha));
      g.addColorStop(0.55, hexToRgba(this.color, alpha * 0.4));
      g.addColorStop(1, hexToRgba(this.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalCompositeOperation = 'source-over';
  }
}
