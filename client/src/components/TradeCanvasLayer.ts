/**
 * Leaflet 自定义 Canvas 图层：在 overlayPane 上以 Canvas 2D 绘制
 * 贸易网络的国家节点与三阶贝塞尔连线。
 *
 * 变换策略与 Leaflet 内置 Renderer 一致：
 *  - 平移由 overlayPane 的 CSS 位移自动携带，无需重绘；
 *  - 缩放动画期间用 CSS transform 临时缩放画布（zoomanim）；
 *  - moveend / zoomend / viewreset / resize 时按最新投影全量重绘。
 *
 * 指针交互不依赖 DOM 事件：画布本身 pointer-events:none，
 * 由外层组件在地图事件里调用 hitTest() 做节点/连线命中检测。
 */
import * as L from 'leaflet';
import {
  cubicBezierControls,
  cubicBezierPoint,
  edgeBendSign,
  sampleCubicBezier,
  distToSegment,
} from '../lib/tradeTopology';

export interface RenderNode {
  code: string;
  name: string;
  lat: number;
  lon: number;
  r: number; // 屏幕半径 px
  color: string;
  alpha: number; // 0..1
  label: boolean;
  state: 'normal' | 'selected' | 'partner' | 'dimmed';
}

export interface RenderEdge {
  key: string;
  source: string;
  target: string;
  sLat: number;
  sLon: number;
  tLat: number;
  tLon: number; // 已按 source 一侧展开跨日界线经度
  width: number;
  color: string;
  alpha: number;
  animated: boolean; // 聚焦态：流动虚线 + 方向箭头
  sourceName: string;
  targetName: string;
  volume: number;
  category: string;
}

export interface TradeRenderData {
  nodes: RenderNode[];
  edges: RenderEdge[];
}

export type HitResult =
  | { type: 'node'; node: RenderNode }
  | { type: 'edge'; edge: RenderEdge }
  | null;

const PADDING = 0.3; // 画布相对可视区的扩边比例，避免平移时边缘露白
const BEND = 0.16; // 贝塞尔弯曲系数（相对弦长）
const ACCENT = '#e0a94f';
const PARTNER_RING = '#57a9c9';
const LABEL_FONT = '10px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';

export class TradeCanvasLayer extends L.Layer {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private bounds!: L.Bounds;
  private center!: L.LatLng;
  private zoom = 0;
  private added = false;

  private data: TradeRenderData = { nodes: [], edges: [] };
  private hoverCode: string | null = null;
  private dashOffset = 0;
  private animFrame: number | null = null;
  private redrawScheduled = false;

  // 命中检测缓存（图层坐标系，含世界副本）
  private hitNodes: { code: string; x: number; y: number; r: number }[] = [];
  private hitEdges: { key: string; pts: [number, number][]; width: number }[] = [];

  /* ---------- 生命周期 ---------- */

  onAdd(map: L.Map): this {
    this.canvas = L.DomUtil.create('canvas', 'trade-canvas leaflet-zoom-animated') as HTMLCanvasElement;
    this.canvas.style.pointerEvents = 'none';
    this.ctx = this.canvas.getContext('2d')!;
    map.getPane('overlayPane')!.appendChild(this.canvas);
    this.added = true;
    this.update();
    return this;
  }

  onRemove(): this {
    this.added = false;
    this.stopAnim();
    L.DomUtil.remove(this.canvas);
    return this;
  }

  getEvents(): { [name: string]: (e?: any) => void } {
    return {
      viewreset: this.onReset,
      zoom: this.onZoom,
      zoomanim: this.onAnimZoom,
      moveend: this.onMoveEnd,
      zoomend: this.onMoveEnd,
      resize: this.onMoveEnd,
    };
  }

  /* ---------- 数据注入 ---------- */

  setData(data: TradeRenderData): void {
    this.data = data;
    if (data.edges.some((e) => e.animated)) this.startAnim();
    else this.stopAnim();
    this.requestRedraw();
  }

  setHover(code: string | null): void {
    if (this.hoverCode === code) return;
    this.hoverCode = code;
    this.requestRedraw();
  }

  /* ---------- 地图事件 ---------- */

  private onReset(): void {
    this.update();
    this.updateTransform(this.center, this.zoom);
  }

  private onZoom(): void {
    this.updateTransform(this._map.getCenter(), this._map.getZoom());
  }

  private onAnimZoom(e: { center: L.LatLng; zoom: number }): void {
    this.updateTransform(e.center, e.zoom);
  }

  private onMoveEnd(): void {
    this.update();
  }

  /** 重算画布尺寸与位置（layer 坐标系），随后全量重绘 */
  private update(): void {
    if (!this.added) return;
    const map = this._map;
    const size = map.getSize();
    const min = map.containerPointToLayerPoint(size.multiplyBy(-PADDING)).round();
    const max = min.add(size.multiplyBy(1 + PADDING * 2)).round();
    this.bounds = new L.Bounds(min, max);
    this.center = map.getCenter();
    this.zoom = map.getZoom();

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = max.x - min.x;
    const h = max.y - min.y;
    L.DomUtil.setPosition(this.canvas, min);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.requestRedraw();
  }

  /** 缩放动画期间的 CSS 变换（与 Leaflet Renderer._updateTransform 同算法） */
  private updateTransform(center: L.LatLng, zoom: number): void {
    const map = this._map;
    const scale = map.getZoomScale(zoom, this.zoom);
    const viewHalf = map.getSize().multiplyBy(0.5 + PADDING);
    const currentCenterPoint = map.project(this.center, zoom);
    const topLeft = viewHalf
      .multiplyBy(-scale)
      .add(currentCenterPoint)
      .subtract((map as any)._getNewPixelOrigin(center, zoom));
    L.DomUtil.setTransform(this.canvas, topLeft, scale);
  }

  /* ---------- 绘制 ---------- */

  private requestRedraw(): void {
    if (this.redrawScheduled) return;
    this.redrawScheduled = true;
    requestAnimationFrame(() => {
      this.redrawScheduled = false;
      if (this.added) this.draw();
    });
  }

  private draw(): void {
    const map = this._map;
    const ctx = this.ctx;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const viewMin = this.bounds.min!;
    const viewMax = this.bounds.max!;
    ctx.translate(-viewMin.x, -viewMin.y);

    this.hitNodes = [];
    this.hitEdges = [];

    const { nodes, edges } = this.data;
    if (!nodes.length && !edges.length) return;

    // 一个世界副本在图层坐标系中的像素宽度（用于跨日界线绘制副本）
    const worldW =
      map.latLngToLayerPoint([0, 180]).x - map.latLngToLayerPoint([0, -180]).x;

    // 先画连线
    for (const e of edges) {
      const p0 = map.latLngToLayerPoint([e.sLat, e.sLon]);
      const p1 = map.latLngToLayerPoint([e.tLat, e.tLon]);
      for (let k = -1; k <= 1; k++) {
        const dx = k * worldW;
        if (
          Math.max(p0.x, p1.x) + dx < viewMin.x - 160 ||
          Math.min(p0.x, p1.x) + dx > viewMax.x + 160
        )
          continue;
        this.drawEdge(e, p0.x + dx, p0.y, p1.x + dx, p1.y);
      }
    }

    // 再画节点（压在线上）
    for (const n of nodes) {
      const p = map.latLngToLayerPoint([n.lat, n.lon]);
      for (let k = -1; k <= 1; k++) {
        const x = p.x + k * worldW;
        if (x < viewMin.x - 40 || x > viewMax.x + 40) continue;
        this.drawNode(n, x, p.y);
      }
    }

    ctx.globalAlpha = 1;
  }

  private drawEdge(e: RenderEdge, x0: number, y0: number, x1: number, y1: number): void {
    const ctx = this.ctx;
    const c = cubicBezierControls(x0, y0, x1, y1, BEND, edgeBendSign(e.source, e.target));

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.bezierCurveTo(c.cx1, c.cy1, c.cx2, c.cy2, x1, y1);
    ctx.strokeStyle = e.color;
    ctx.globalAlpha = e.alpha;
    ctx.lineWidth = e.width;
    ctx.lineCap = 'round';
    if (e.animated) {
      ctx.setLineDash([7, 9]);
      ctx.lineDashOffset = -this.dashOffset;
    }
    ctx.stroke();
    ctx.setLineDash([]);

    if (e.animated) this.drawArrow(x0, y0, c.cx1, c.cy1, c.cx2, c.cy2, x1, y1, e);

    this.hitEdges.push({
      key: e.key,
      pts: sampleCubicBezier(20, x0, y0, c, x1, y1),
      width: e.width,
    });
  }

  /** 在 t≈0.85 处沿切线画方向箭头（仅聚焦态，避免全局视图杂乱） */
  private drawArrow(
    x0: number,
    y0: number,
    cx1: number,
    cy1: number,
    cx2: number,
    cy2: number,
    x1: number,
    y1: number,
    e: RenderEdge
  ): void {
    const ctx = this.ctx;
    const t = 0.85;
    const u = 1 - t;
    const [px, py] = cubicBezierPoint(t, x0, y0, { cx1, cy1, cx2, cy2 }, x1, y1);
    // 三次贝塞尔导数 → 切线方向
    const tx =
      3 * u * u * (cx1 - x0) + 6 * u * t * (cx2 - cx1) + 3 * t * t * (x1 - cx2);
    const ty =
      3 * u * u * (cy1 - y0) + 6 * u * t * (cy2 - cy1) + 3 * t * t * (y1 - cy2);
    const len = Math.hypot(tx, ty) || 1;
    const ux = tx / len;
    const uy = ty / len;
    const s = 3 + e.width * 0.9;

    ctx.beginPath();
    ctx.moveTo(px + ux * s, py + uy * s);
    ctx.lineTo(px - uy * s * 0.42, py + ux * s * 0.42);
    ctx.lineTo(px + uy * s * 0.42, py - ux * s * 0.42);
    ctx.closePath();
    ctx.fillStyle = e.color;
    ctx.globalAlpha = Math.min(1, e.alpha + 0.15);
    ctx.fill();
  }

  private drawNode(n: RenderNode, x: number, y: number): void {
    const ctx = this.ctx;

    // 光晕
    ctx.beginPath();
    ctx.arc(x, y, n.r * 1.9, 0, Math.PI * 2);
    ctx.fillStyle = n.color;
    ctx.globalAlpha = n.alpha * 0.2;
    ctx.fill();

    // 主体
    ctx.beginPath();
    ctx.arc(x, y, n.r, 0, Math.PI * 2);
    ctx.globalAlpha = n.alpha;
    ctx.fill();

    // 选中 / 伙伴描边
    if (n.state === 'selected' || n.state === 'partner') {
      ctx.beginPath();
      ctx.arc(x, y, n.r + 1.6, 0, Math.PI * 2);
      ctx.strokeStyle = n.state === 'selected' ? ACCENT : PARTNER_RING;
      ctx.globalAlpha = 1;
      ctx.lineWidth = n.state === 'selected' ? 2.2 : 1.4;
      ctx.stroke();
    }

    // 标签
    if (n.label || this.hoverCode === n.code) {
      const ly = y - n.r - 6;
      ctx.font = LABEL_FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.globalAlpha = Math.max(n.alpha, 0.85);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(10, 13, 19, 0.85)';
      ctx.strokeText(n.name, x, ly);
      ctx.fillStyle = n.state === 'selected' ? ACCENT : '#aeb9c8';
      ctx.fillText(n.name, x, ly);
    }

    // 仅可见节点参与命中
    if (n.alpha > 0.3) this.hitNodes.push({ code: n.code, x, y, r: n.r });
  }

  /* ---------- 流动动画（仅聚焦态） ---------- */

  private startAnim(): void {
    if (this.animFrame != null) return;
    let last = performance.now();
    const tick = (now: number) => {
      this.animFrame = requestAnimationFrame(tick);
      if (now - last >= 33) {
        this.dashOffset += ((now - last) / 33) * 0.9;
        last = now;
        this.requestRedraw();
      }
    };
    this.animFrame = requestAnimationFrame(tick);
  }

  private stopAnim(): void {
    if (this.animFrame != null) cancelAnimationFrame(this.animFrame);
    this.animFrame = null;
  }

  /* ---------- 命中检测（图层坐标） ---------- */

  hitTest(p: L.Point): HitResult {
    for (let i = this.hitNodes.length - 1; i >= 0; i--) {
      const h = this.hitNodes[i];
      if (Math.hypot(p.x - h.x, p.y - h.y) <= h.r + 5) {
        const node = this.data.nodes.find((n) => n.code === h.code);
        if (node) return { type: 'node', node };
      }
    }
    for (let i = this.hitEdges.length - 1; i >= 0; i--) {
      const h = this.hitEdges[i];
      const tol = Math.max(5, h.width * 0.75 + 2);
      for (let j = 0; j < h.pts.length - 1; j++) {
        const [x0, y0] = h.pts[j];
        const [x1, y1] = h.pts[j + 1];
        if (distToSegment(p.x, p.y, x0, y0, x1, y1) <= tol) {
          const edge = this.data.edges.find((e) => e.key === h.key);
          if (edge) return { type: 'edge', edge };
        }
      }
    }
    return null;
  }
}
