/**
 * 资源贸易航线图层管理器。
 *
 * 负责航线画布（弧形连线 + 流向粒子）的完整生命周期：
 *  - mount()   由航线途径点构建平滑弧线采样、生成粒子，并启动 requestAnimationFrame 渲染循环
 *  - unmount() 停止并销毁动画：递增循环令牌使已排队的旧帧回调直接退出、取消动画帧、
 *              清空航线与粒子数据引用、擦除画布，供 GC 回收
 *  - detach()  组件卸载时断开画布、尺寸与可见性监听
 *
 * 切换资源分类时必须「先 unmount 再 mount」，保证任意时刻至多一个 rAF 循环，
 * 杜绝动画叠加导致的页面卡顿。
 */
import type { TradeRoute, TradeRouteKind } from '../api';
import { VIEW_W, VIEW_H } from './resourceLayer';
import type { MapTransform } from './resourceLayer';
import { hexToRgba } from './resourceRoles';

export { VIEW_W, VIEW_H };

const TAU = Math.PI * 2;

/** 线型：海运实线 / 管道长虚线 / 陆路点线 */
const KIND_DASH: Record<TradeRouteKind, number[] | null> = {
  sea: null,
  pipe: [7, 5],
  land: [1.6, 3.4],
};

interface SampledRoute {
  route: TradeRoute;
  /** 视图坐标分段（跨 ±180° 经线处断开，避免横贯整图的伪线） */
  segs: [number, number][][];
  /** 全部采样点（粒子插值 / 悬停命中） */
  pts: [number, number][];
  /** jump[i]：pts[i] → pts[i+1] 是否为跨经线跳变 */
  jump: boolean[];
  /** 线宽（视图单位），∝ √贸易流量 */
  width: number;
  /** 折线总长（视图单位），用于把粒子速度换算为 t/秒 */
  length: number;
}

interface Particle {
  r: number; // 所属航线下标
  t: number; // 0..1，严格由出口（0）流向进口（1）
  speed: number; // t / 秒
  size: number;
}

/** 经度解缠绕：相邻途径点经度差压到 ≤180°，跨日界线航线保持连续 */
function unwrapPoints(points: [number, number][]): [number, number][] {
  const out: [number, number][] = [[points[0][0], points[0][1]]];
  for (let i = 1; i < points.length; i++) {
    let lon = points[i][0];
    const lat = points[i][1];
    const prev = out[i - 1][0];
    while (lon - prev > 180) lon -= 360;
    while (lon - prev < -180) lon += 360;
    out.push([lon, lat]);
  }
  return out;
}

/** 短航线（≤3 个途径点）在每段中点加垂直鼓包，形成弧形连线 */
function arcify(points: [number, number][]): [number, number][] {
  if (points.length > 3) return points;
  const out: [number, number][] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = out[out.length - 1];
    const [x1, y1] = points[i];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    if (len > 1e-6) {
      const lift = Math.min(len * 0.16, 14); // 弧高上限 14°
      out.push([(x0 + x1) / 2 - (dy / len) * lift, (y0 + y1) / 2 + (dx / len) * lift]);
    }
    out.push([x1, y1]);
  }
  return out;
}

/** Catmull-Rom 样条采样：把途径点平滑为均匀密集的折线 */
function sampleSpline(pts: [number, number][], perSeg = 22): [number, number][] {
  const n = pts.length;
  if (n < 3) return pts.slice();
  const out: [number, number][] = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    for (let j = 0; j < perSeg; j++) {
      const t = j / perSeg;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (p2[0] - p0[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (3 * p1[0] - p0[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (p2[1] - p0[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (3 * p1[1] - p0[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push([pts[n - 1][0], pts[n - 1][1]]);
  return out;
}

export class TradeRouteLayerManager {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private observer: ResizeObserver | null = null;
  /** 当前动画帧句柄；null 表示循环已停止 */
  private raf: number | null = null;
  /** 循环令牌：stopLoop/mount 时递增，已排队的旧帧回调发现令牌失配即退出，不再续帧 */
  private loopId = 0;
  private routes: SampledRoute[] = [];
  private particles: Particle[] = [];
  private color = '#ffffff';
  private transform: MapTransform = { x: 0, y: 0, k: 1 };
  private dpr = 1;
  private hoverKey: string | null = null;
  private paused = false;
  private lastTime = 0;
  private onVisibility: () => void;

  constructor() {
    /* 页面切到后台时停帧省电，回前台且航线仍在时恢复循环 */
    this.onVisibility = () => {
      if (document.hidden) {
        this.stopLoop();
      } else if (this.routes.length > 0 && this.raf == null) {
        this.startLoop();
      }
    };
  }

  /** 绑定航线画布，并按容器尺寸与 devicePixelRatio 调整分辨率 */
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
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  /**
   * 挂载资源航线图层：构建弧线采样与粒子并启动渲染循环。
   * 防御性地先卸载旧图层，保证任何时刻只有一份航线数据、一个动画循环。
   */
  mount(
    routes: TradeRoute[],
    color: string,
    project: (lon: number, lat: number) => [number, number] | null
  ) {
    this.unmount();
    this.color = color;
    const maxV = Math.max(...routes.map((r) => r.value), 1e-9);
    this.routes = routes
      .map((r) => this.buildRoute(r, maxV, project))
      .filter((r): r is SampledRoute => r !== null)
      .sort((a, b) => b.width - a.width); // 宽线垫底、窄线在上

    /* 粒子：数量与贸易规模正相关；t=0 在出口、t=1 在进口，严格单向 */
    this.particles = [];
    this.routes.forEach((sr, i) => {
      const count = 1 + Math.round(4 * Math.sqrt(sr.route.value / maxV));
      for (let j = 0; j < count; j++) {
        this.particles.push({
          r: i,
          t: Math.random(),
          speed: (52 / sr.length) * (0.75 + Math.random() * 0.5),
          size: 1.1 + 1.1 * Math.sqrt(sr.route.value / maxV),
        });
      }
    });

    /* 无航线（如水资源）：不启动渲染循环，画布保持空白 */
    if (this.routes.length === 0) {
      this.clear();
      return;
    }
    this.startLoop();
  }

  /** 同步地图缩放 / 平移，下一帧生效 */
  setTransform(t: MapTransform) {
    this.transform = t;
  }

  /** 暂停 / 恢复粒子推进（循环仍在，保证缩放与悬停即时重绘） */
  setPaused(paused: boolean) {
    this.paused = paused;
  }

  /** 悬停高亮某条航线；null 清除 */
  setHover(key: string | null) {
    this.hoverKey = key;
  }

  /**
   * 卸载当前图层：停止并销毁动画循环（取消 rAF、令牌失效），
   * 清空航线与粒子数据引用、擦除画布。切换资源前调用，避免动画叠加。
   */
  unmount() {
    this.stopLoop();
    this.routes = [];
    this.particles = [];
    this.hoverKey = null;
    this.clear();
  }

  /** 组件卸载：在 unmount 基础上进一步释放画布与监听器 */
  detach() {
    this.unmount();
    this.observer?.disconnect();
    this.observer = null;
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.canvas = null;
    this.ctx = null;
  }

  /** 视图坐标下的航线命中检测；tol 为视图单位阈值，命中返回航线 */
  hitTest(vx: number, vy: number, tol: number): TradeRoute | null {
    let best: SampledRoute | null = null;
    let bestD2 = Infinity;
    for (const sr of this.routes) {
      const limit = Math.max(tol, sr.width * 0.9);
      const pts = sr.pts;
      for (let i = 0; i < pts.length; i += 2) {
        const dx = pts[i][0] - vx;
        const dy = pts[i][1] - vy;
        const d2 = dx * dx + dy * dy;
        if (d2 < limit * limit && d2 < bestD2) {
          bestD2 = d2;
          best = sr;
        }
      }
    }
    return best ? best.route : null;
  }

  /* ---------------- 内部：循环与数据构建 ---------------- */

  /** 启动渲染循环；先停旧循环，保证任意时刻至多一个 rAF 循环 */
  private startLoop() {
    this.stopLoop();
    const id = ++this.loopId;
    this.lastTime = 0;
    const frame = (now: number) => {
      if (id !== this.loopId) return; // 旧循环残留帧：直接退出，不再续帧
      const dt = this.lastTime ? Math.min((now - this.lastTime) / 1000, 0.05) : 0.016;
      this.lastTime = now;
      if (!this.paused) this.step(dt);
      this.draw();
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  /** 停止渲染循环：取消已排队帧，并令令牌失效（残留帧回调直接退出） */
  private stopLoop() {
    this.loopId++;
    if (this.raf != null) cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  /** 粒子推进：t 严格递增（出口 → 进口），到港后回出口重新出发 */
  private step(dt: number) {
    for (const p of this.particles) {
      p.t += p.speed * dt;
      if (p.t >= 1) p.t -= 1;
    }
  }

  /** 由途径点构建视图坐标采样（解缠绕 → 弧形化 → 样条 → 投影 → 跨经线分段） */
  private buildRoute(
    route: TradeRoute,
    maxV: number,
    project: (lon: number, lat: number) => [number, number] | null
  ): SampledRoute | null {
    const raw = sampleSpline(arcify(unwrapPoints(route.points)));
    const pts: [number, number][] = [];
    const jump: boolean[] = [];
    const segs: [number, number][][] = [];
    let seg: [number, number][] = [];
    let prev: [number, number] | null = null;
    let length = 0;
    for (const [lon, lat] of raw) {
      const wrapped = ((((lon + 180) % 360) + 360) % 360) - 180;
      const p = project(wrapped, lat);
      if (!p) continue;
      if (prev) {
        const isJump = Math.abs(p[0] - prev[0]) > VIEW_W / 2;
        jump.push(isJump);
        if (isJump) {
          if (seg.length > 1) segs.push(seg);
          seg = [];
        } else {
          length += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
        }
      }
      pts.push([p[0], p[1]]);
      seg.push([p[0], p[1]]);
      prev = [p[0], p[1]];
    }
    if (seg.length > 1) segs.push(seg);
    if (pts.length < 2 || length < 1) return null;
    return {
      route,
      segs,
      pts,
      jump,
      width: 1.1 + 6.5 * Math.sqrt(route.value / maxV),
      length,
    };
  }

  /** 航线上 t 处的视图坐标（跨经线跳变段直接取跳变后位置，避免横贯拖影） */
  private posAt(sr: SampledRoute, t: number): [number, number] {
    const pts = sr.pts;
    const idx = Math.min(Math.max(t, 0), 1) * (pts.length - 1);
    const i = Math.min(Math.floor(idx), pts.length - 2);
    if (sr.jump[i]) return pts[i + 1];
    const f = idx - i;
    const a = pts[i];
    const b = pts[i + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  }

  private clear() {
    const { ctx, canvas } = this;
    if (!ctx || !canvas) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  private draw() {
    const { ctx, canvas } = this;
    if (!ctx || !canvas) return;
    const cw = canvas.width / this.dpr;
    const ch = canvas.height / this.dpr;
    this.clear();
    if (this.routes.length === 0) return;

    /* 与底图 SVG 同一套坐标换算：视图坐标 → 画布像素 */
    const scale = Math.min(cw / VIEW_W, ch / VIEW_H);
    const ox = (cw - VIEW_W * scale) / 2;
    const oy = (ch - VIEW_H * scale) / 2;
    const { x: tx, y: ty, k } = this.transform;
    ctx.setTransform(
      this.dpr * scale * k,
      0,
      0,
      this.dpr * scale * k,
      this.dpr * (ox + tx * scale),
      this.dpr * (oy + ty * scale)
    );
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    /* 1) 航线本体：宽淡边 + 主线两遍描边模拟辉光；悬停时加亮 */
    for (const sr of this.routes) {
      const hover = sr.route.key === this.hoverKey;
      const dash = KIND_DASH[sr.route.kind];
      ctx.setLineDash(dash ?? []);
      this.strokeRoute(sr, sr.width + 3.5, hexToRgba(this.color, hover ? 0.5 : 0.16));
      this.strokeRoute(sr, sr.width, hexToRgba(this.color, hover ? 0.95 : 0.6));
      if (hover) {
        this.strokeRoute(sr, Math.max(1, sr.width * 0.45), 'rgba(255,255,255,0.9)');
      }
    }
    ctx.setLineDash([]);

    /* 2) 流向箭头：长线三枚、短线一枚，指向进口方向 */
    for (const sr of this.routes) {
      const ts = sr.length > 420 ? [0.3, 0.55, 0.85] : [0.55];
      for (const t of ts) this.drawArrow(sr, t);
    }

    /* 3) 端点标记：出口空心圈、进口实心点 */
    for (const sr of this.routes) {
      const first = sr.pts[0];
      const last = sr.pts[sr.pts.length - 1];
      ctx.beginPath();
      ctx.arc(first[0], first[1], sr.width * 0.9 + 1.8, 0, TAU);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = hexToRgba(this.color, 0.85);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(last[0], last[1], sr.width * 0.7 + 1.4, 0, TAU);
      ctx.fillStyle = hexToRgba(this.color, 0.95);
      ctx.fill();
    }

    /* 4) 流向粒子：短拖尾 + 辉光 + 亮核，严格 出口 → 进口 */
    for (const p of this.particles) {
      const sr = this.routes[p.r];
      const [x, y] = this.posAt(sr, p.t);
      for (let j = 2; j >= 1; j--) {
        const tt = p.t - j * 0.012;
        if (tt <= 0) continue;
        const [bx, by] = this.posAt(sr, tt);
        if (Math.abs(bx - x) > VIEW_W / 2) continue; // 跨经线不画拖尾
        ctx.beginPath();
        ctx.arc(bx, by, p.size * (1 - j * 0.25), 0, TAU);
        ctx.fillStyle = hexToRgba(this.color, 0.14 * (3 - j));
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(x, y, p.size * 2.1, 0, TAU);
      ctx.fillStyle = hexToRgba(this.color, 0.3);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, TAU);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fill();
    }
  }

  private strokeRoute(sr: SampledRoute, width: number, style: string) {
    const { ctx } = this;
    if (!ctx) return;
    ctx.lineWidth = width;
    ctx.strokeStyle = style;
    ctx.beginPath();
    for (const seg of sr.segs) {
      ctx.moveTo(seg[0][0], seg[0][1]);
      for (let i = 1; i < seg.length; i++) ctx.lineTo(seg[i][0], seg[i][1]);
    }
    ctx.stroke();
  }

  /** 在航线 t 处画一枚指向进口方向的三角箭头 */
  private drawArrow(sr: SampledRoute, t: number) {
    const { ctx } = this;
    if (!ctx) return;
    const pts = sr.pts;
    const i = Math.min(Math.floor(t * (pts.length - 1)), pts.length - 2);
    if (sr.jump[i] || (i > 0 && sr.jump[i - 1])) return;
    const a = pts[i];
    const b = pts[i + 1];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) return;
    const ux = dx / len;
    const uy = dy / len;
    const s = 2.4 + sr.width * 0.85;
    ctx.beginPath();
    ctx.moveTo(a[0] + ux * s, a[1] + uy * s);
    ctx.lineTo(a[0] - uy * s * 0.55, a[1] + ux * s * 0.55);
    ctx.lineTo(a[0] + uy * s * 0.55, a[1] - ux * s * 0.55);
    ctx.closePath();
    ctx.fillStyle = hexToRgba(this.color, 0.85);
    ctx.fill();
  }
}
