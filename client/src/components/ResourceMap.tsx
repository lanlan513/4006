import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import worldTopo from 'world-atlas/countries-110m.json';
import type { ResourceDetail } from '../api';
import { ResourceLayerManager, VIEW_W as W, VIEW_H as H } from './resourceLayer';

/* ---------- 几何（与探索地图同一套投影，保证页面间视图一致） ---------- */
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

function hexToRgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

interface Tip {
  x: number;
  y: number;
  title: string;
  rows: [string, string][];
}

interface Props {
  detail: ResourceDetail | null;
}

/**
 * 全球资源分布地图。
 * 图层自下而上：底图 SVG（国家轮廓）→ 热力画布（ResourceLayerManager 管理）
 * → 点位 SVG（产地圆点 + 消费国圆环）。
 * 切换资源时由 ResourcePage 先把 detail 置空（点位层随 React 卸载），
 * 同时下方 effect 的清理函数先卸载热力图层，再挂载新资源数据。
 */
export default function ResourceMap({ detail }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef<ResourceLayerManager | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [tip, setTip] = useState<Tip | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number; moved: boolean } | null>(null);

  /* 图层管理器：组件挂载时创建，卸载时释放画布与监听 */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const layer = new ResourceLayerManager();
    layer.attach(canvas);
    layerRef.current = layer;
    return () => {
      layer.detach();
      layerRef.current = null;
    };
  }, []);

  /*
   * 切换资源图层：effect 清理函数先卸载当前图层的热力数据，
   * 再为新资源挂载点位与热力，避免跨资源数据叠加。
   */
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || !detail) return;
    layer.mount(detail.production, detail.resource.color, (lon, lat) => projection([lon, lat]));
    return () => layer.unmount();
  }, [detail]);

  /* 缩放 / 平移同步到热力画布 */
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
    if (tip) setTip({ ...tip, x: e.clientX, y: e.clientY });
  };
  const endDrag = () => {
    drag.current = null;
    setIsDragging(false);
  };
  const zoomBy = (factor: number) =>
    setTransform((t) => {
      const k = Math.min(9, Math.max(1, t.k * factor));
      const cx = W / 2;
      const cy = H / 2;
      const ratio = k / t.k;
      return { k, x: cx - (cx - t.x) * ratio, y: cy - (cy - t.y) * ratio };
    });

  const transformStr = `translate(${transform.x} ${transform.y}) scale(${transform.k})`;

  /* 产地 / 消费点位（由当前资源的 GeoJSON 计算，切换资源时随 detail 一起替换） */
  const layers = useMemo(() => {
    if (!detail) return null;
    const { production, consumption } = detail;
    const maxP = Math.max(...production.features.map((f) => f.properties.value), 1);
    const maxC = Math.max(...consumption.features.map((f) => f.properties.value), 1);
    const sites = production.features.flatMap((f, i) => {
      const p = projection(f.geometry.coordinates);
      if (!p) return [];
      return [{ key: `p-${i}`, x: p[0], y: p[1], r: 3 + 9 * Math.sqrt(f.properties.value / maxP), props: f.properties }];
    });
    const consumers = consumption.features.flatMap((f, i) => {
      const p = projection(f.geometry.coordinates);
      if (!p) return [];
      return [{ key: `c-${i}`, x: p[0], y: p[1], r: 2.5 + 6 * Math.sqrt(f.properties.value / maxC), props: f.properties }];
    });
    return { sites, consumers };
  }, [detail]);

  const color = detail?.resource.color ?? '#fff';
  const unit = detail?.resource.unit ?? '';
  const labelKeys = useMemo(
    () => new Set((layers?.sites ?? []).slice(0, 3).map((s) => s.key)),
    [layers]
  );

  const pointerHandlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onPointerLeave: () => {
      endDrag();
      setTip(null);
    },
  };

  return (
    <div ref={wrapRef} className={`map-wrap resource-map ${isDragging ? 'dragging' : ''}`}>
      {/* 底图：国家轮廓 */}
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" {...pointerHandlers}>
        <g transform={transformStr}>
          {(fc.features as any[]).map((f: any, fi: number) => (
            <path key={fi} d={pathGen(f) ?? ''} className="country-path" style={{ fill: LAND_DIM }} />
          ))}
        </g>
      </svg>

      {/* 热力画布：由 ResourceLayerManager 管理，切换资源时先卸载再重绘 */}
      <canvas ref={canvasRef} className="heat-canvas" />

      {/* 点位层：产地圆点 + 消费国圆环 */}
      <svg className="points-layer" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" {...pointerHandlers}>
        <g transform={transformStr}>
          {layers?.consumers.map((c) => (
            <g
              key={c.key}
              className="consumer-node"
              onPointerEnter={(e) =>
                setTip({
                  x: e.clientX,
                  y: e.clientY,
                  title: `${c.props.name} · 主要消费国`,
                  rows: [['消费量', `${c.props.value} ${unit}`]],
                })
              }
              onPointerLeave={() => setTip(null)}
            >
              <circle cx={c.x} cy={c.y} r={c.r + 2.5} fill="none" stroke={hexToRgba(color, 0.35)} strokeWidth={0.8} strokeDasharray="2 2" />
              <circle cx={c.x} cy={c.y} r={c.r} fill={hexToRgba(color, 0.14)} stroke={hexToRgba(color, 0.85)} strokeWidth={1} />
            </g>
          ))}
          {layers?.sites.map((s) => (
            <g
              key={s.key}
              className="site-node"
              onPointerEnter={(e) =>
                setTip({
                  x: e.clientX,
                  y: e.clientY,
                  title: `${s.props.name} · ${s.props.country ?? ''}`,
                  rows: [['生产量', `${s.props.value} ${unit}`]],
                })
              }
              onPointerLeave={() => setTip(null)}
            >
              <circle cx={s.x} cy={s.y} r={s.r + 2.5} fill={hexToRgba(color, 0.22)} />
              <circle cx={s.x} cy={s.y} r={s.r} fill={color} stroke="rgba(10,13,19,0.7)" strokeWidth={0.7} />
              {labelKeys.has(s.key) && (
                <text x={s.x} y={s.y - s.r - 4} textAnchor="middle" className="map-label">
                  {s.props.name}
                </text>
              )}
            </g>
          ))}
        </g>
      </svg>

      {/* 缩放按钮 */}
      <div className="zoom-controls">
        <button className="zoom-btn" onClick={() => zoomBy(1.5)} title="放大">
          +
        </button>
        <button className="zoom-btn" onClick={() => zoomBy(1 / 1.5)} title="缩小">
          −
        </button>
      </div>

      {tip && (
        <div className="map-tooltip" style={{ left: tip.x, top: tip.y }}>
          <b>{tip.title}</b>
          {tip.rows.map(([k, v]) => (
            <div className="t-row" key={k}>
              <span>{k}</span>
              <b>{v}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
