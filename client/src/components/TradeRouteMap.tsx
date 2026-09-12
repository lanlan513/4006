import { useCallback, useEffect, useRef, useState } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import worldTopo from 'world-atlas/countries-110m.json';
import type { ResourceRoutes, TradeRoute, TradeRouteKind } from '../api';
import { TradeRouteLayerManager, VIEW_W as W, VIEW_H as H } from './tradeRouteLayer';

/* ---------- 几何（与资源分布地图同一套投影，保证页面间视图一致） ---------- */
const fc: any = feature(worldTopo as any, (worldTopo as any).objects.countries);

const projection = geoNaturalEarth1().fitExtent(
  [
    [6, 8],
    [W - 6, H - 8],
  ],
  fc
);
const pathGen = geoPath(projection);

const LAND_DIM = '#11161f';

export const ROUTE_KIND_LABEL: Record<TradeRouteKind, string> = {
  sea: '海运航线',
  pipe: '油气管道',
  land: '陆路运输',
};

interface Tip {
  x: number;
  y: number;
  route: TradeRoute;
}

interface Props {
  data: ResourceRoutes | null;
  /** 粒子动画播放 / 暂停 */
  playing: boolean;
}

/**
 * 全球资源贸易运输航线图。
 * 图层自下而上：底图 SVG（国家轮廓）→ 航线画布（TradeRouteLayerManager 管理：
 * 弧形连线 + 流向粒子，粒子严格由出口国流向进口国）。
 *
 * 切换资源时由父组件把 data 先置空，本组件 effect 清理函数先 unmount 旧航线图层
 * （停止并销毁 requestAnimationFrame 循环、清空航线与粒子数据、擦除画布），
 * 再 mount 新航线并启动新循环，避免动画叠加导致页面卡顿。
 */
export default function TradeRouteMap({ data, playing }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef<TradeRouteLayerManager | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [tip, setTip] = useState<Tip | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number; moved: boolean } | null>(null);

  /* 图层管理器：组件挂载时创建，卸载时释放画布、监听与动画循环 */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const layer = new TradeRouteLayerManager();
    layer.attach(canvas);
    layerRef.current = layer;
    return () => {
      layer.detach();
      layerRef.current = null;
    };
  }, []);

  /*
   * 切换资源航线：effect 清理函数先停止并销毁旧动画循环（unmount），
   * 再为新资源构建航线与粒子（mount），杜绝多个 rAF 循环叠加。
   */
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || !data) return;
    layer.mount(data.routes, data.resource.color, (lon, lat) => projection([lon, lat]));
    return () => layer.unmount();
  }, [data]);

  /* 播放 / 暂停粒子推进 */
  useEffect(() => {
    layerRef.current?.setPaused(!playing);
  }, [playing]);

  /* 缩放 / 平移同步到航线画布 */
  useEffect(() => {
    layerRef.current?.setTransform(transform);
  }, [transform]);

  /* 屏幕坐标 → SVG 用户坐标 */
  const toUser = useCallback((clientX: number, clientY: number): [number, number] => {
    const svg = svgRef.current!;
    const ctm = svg.getScreenCTM();
    if (!ctm) return [0, 0];
    const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return [pt.x, pt.y];
  }, []);

  /* 滚轮缩放（非 passive，阻止页面滚动） */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const [mx, my] = toUser(e.clientX, e.clientY);
      setTransform((t) => {
        const k = Math.min(9, Math.max(1, t.k * (e.deltaY < 0 ? 1.22 : 0.82)));
        const ratio = k / t.k;
        return { k, x: mx - (mx - t.x) * ratio, y: my - (my - t.y) * ratio };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [toUser]);

  const onPointerDown = (e: React.PointerEvent) => {
    const [ux, uy] = toUser(e.clientX, e.clientY);
    drag.current = { x: ux, y: uy, ox: transform.x, oy: transform.y, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (drag.current) {
      const [ux, uy] = toUser(e.clientX, e.clientY);
      const dx = ux - drag.current.x;
      const dy = uy - drag.current.y;
      if (!drag.current.moved && Math.abs(dx) + Math.abs(dy) > 3) {
        drag.current.moved = true;
        setIsDragging(true);
        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      }
      if (drag.current.moved) {
        setTransform((t) => ({ ...t, x: drag.current!.ox + dx, y: drag.current!.oy + dy }));
      }
    }
    /* 悬停命中航线：SVG 用户坐标 → 视图坐标（(u - t) / k） */
    const layer = layerRef.current;
    const svg = svgRef.current;
    if (!layer || !svg) return;
    const [ux, uy] = toUser(e.clientX, e.clientY);
    const pxPerUser = svg.getScreenCTM()?.a ?? 1;
    const vx = (ux - transform.x) / transform.k;
    const vy = (uy - transform.y) / transform.k;
    const hit = layer.hitTest(vx, vy, 7 / (pxPerUser * transform.k));
    layer.setHover(hit?.key ?? null);
    setTip(hit ? { x: e.clientX, y: e.clientY, route: hit } : null);
  };
  const endDrag = () => {
    drag.current = null;
    setIsDragging(false);
  };

  const unit = data?.resource.unit ?? '';

  return (
    <div
      ref={wrapRef}
      className={`map-wrap route-map ${isDragging ? 'dragging' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={() => {
        endDrag();
        setTip(null);
        layerRef.current?.setHover(null);
      }}
    >
      {/* 底图：国家轮廓 */}
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          {(fc.features as any[]).map((f: any, fi: number) => (
            <path
              key={fi}
              d={pathGen(f) ?? ''}
              className="country-path"
              style={{ fill: LAND_DIM }}
            />
          ))}
        </g>
      </svg>

      {/* 航线画布：由 TradeRouteLayerManager 管理，切换资源时先卸载再重绘 */}
      <canvas ref={canvasRef} className="route-canvas" />

      {/* 缩放按钮 */}
      <div className="zoom-controls">
        <button
          className="zoom-btn"
          title="放大"
          onClick={() =>
            setTransform((t) => {
              const k = Math.min(9, t.k * 1.5);
              const cx = W / 2;
              const cy = H / 2;
              const ratio = k / t.k;
              return { k, x: cx - (cx - t.x) * ratio, y: cy - (cy - t.y) * ratio };
            })
          }
        >
          +
        </button>
        <button
          className="zoom-btn"
          title="缩小"
          onClick={() =>
            setTransform((t) => {
              const k = Math.max(1, t.k / 1.5);
              const cx = W / 2;
              const cy = H / 2;
              const ratio = k / t.k;
              return { k, x: cx - (cx - t.x) * ratio, y: cy - (cy - t.y) * ratio };
            })
          }
        >
          −
        </button>
      </div>

      {tip && (
        <div className="map-tooltip" style={{ left: tip.x, top: tip.y }}>
          <b>
            {tip.route.from} → {tip.route.to}
          </b>
          <div className="t-row">
            <span>{ROUTE_KIND_LABEL[tip.route.kind]}</span>
            <b>
              {tip.route.value} {unit}
            </b>
          </div>
          <div className="t-hint">粒子流向：出口 → 进口</div>
        </div>
      )}
    </div>
  );
}
