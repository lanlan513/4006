import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import worldTopo from 'world-atlas/countries-110m.json';
import type { ResourceDetail, ResourceRole } from '../api';
import {
  ResourceLayerManager,
  VIEW_W as W,
  VIEW_H as H,
} from './resourceLayer';
import { ROLE_META, hexToRgba, primaryRole } from './resourceRoles';

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

interface Tip {
  x: number;
  y: number;
  title: string;
  rows: [string, string][];
}

interface Props {
  detail: ResourceDetail | null;
  /** 当前被激活的角色集合（点击资源节点后非空）；为空时底图恢复默认样式 */
  roles: ResourceRole[];
  /** 面板选中的国家（ISO3），用于高亮描边 */
  selectedCode: string | null;
  /** 点击资源节点：激活三类角色标注，payload 为建议选中的国家编码 */
  onActivate: (code: string | null) => void;
  /** 点击已标注的角色国家：切换面板选中 */
  onSelectRole: (code: string) => void;
  /** 点击底图空白区域：清除所有国家标注状态，恢复底图默认样式 */
  onClear: () => void;
}

interface SiteNode {
  key: string;
  x: number;
  y: number;
  r: number;
  props: { name: string; country?: string; code?: string; value: number };
}

/**
 * 全球资源分布地图。
 * 图层自下而上：底图 SVG（国家轮廓 / 角色标注）→ 热力画布（ResourceLayerManager 管理）
 * → 点位 SVG（产地圆点 + 消费国圆环）。
 *
 * 交互状态机：
 *  - 点击任一资源节点：onActivate → 底图按三种语义色标注生产/出口/高依赖国，浮层面板展开
 *  - 再点空白区域：onClear → 清除全部标注与填充，恢复默认底图
 *  - 切换资源分类：由父组件把 roles 置空（同时 detail 先置空），标注随之清除
 */
export default function ResourceMap({
  detail,
  roles,
  selectedCode,
  onActivate,
  onSelectRole,
  onClear,
}: Props) {
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
  /* 底图指针抬起：拖拽结束不算点击；普通点击空白区域则清除全部标注 */
  const onBasePointerUp = () => {
    const wasClick = drag.current && !drag.current.moved;
    endDrag();
    if (wasClick) onClear();
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

  /* ---------- 角色标注：ISO 数字码 → 角色 ---------- */
  const roleByIso = useMemo(() => {
    const m = new Map<string, ResourceRole>();
    for (const r of roles) m.set(r.isoNumeric, r);
    return m;
  }, [roles]);
  const roleByCode = useMemo(() => {
    const m = new Map<string, ResourceRole>();
    for (const r of roles) m.set(r.code, r);
    return m;
  }, [roles]);
  const active = roles.length > 0;

  const selectedRole = selectedCode ? roleByCode.get(selectedCode) ?? null : null;

  /*
   * 点击资源节点后的目标国家：
   *  - 消费国圆环直接携带 ISO3
   *  - 产地圆点按「产地所在国家/地区」名称与角色中文名做包含匹配
   *    （处理「中国·青海」「南亚」等地区名）；
   *  - 匹配不到时回退到首位主要生产国。
   */
  const targetCodeOf = useCallback(
    (node: SiteNode): string | null => {
      if (!roles.length) return null;
      if (node.props.code) {
        return roleByCode.has(node.props.code) ? node.props.code : roles[0].code;
      }
      const country = (node.props.country ?? '').replace(/（.*?）|\(.*?\)/g, '');
      if (country) {
        const hit = roles.find((r) => country.includes(r.name) || r.name.includes(country));
        if (hit) return hit.code;
        // 「中国·青海」之类的地区名取「·」前缀
        const head = country.split(/[·•]/)[0]?.trim();
        if (head) {
          const hit2 = roles.find((r) => head.includes(r.name) || r.name.includes(head));
          if (hit2) return hit2.code;
        }
      }
      return roles[0].code;
    },
    [roles, roleByCode]
  );

  /* 国家轮廓渲染数据：激活时按角色着色，未激活时恢复默认 */
  const countryFills = useMemo(() => {
    if (!active) return null;
    const fills = new Map<number, { fill: string; role: ResourceRole }>();
    (fc.features as any[]).forEach((f: any, fi: number) => {
      const role = roleByIso.get(String(f.id));
      if (!role) return;
      const main = primaryRole(role.roles);
      fills.set(fi, { fill: hexToRgba(ROLE_META[main].color, 0.34), role });
    });
    return fills;
  }, [active, roleByIso]);

  /* 多角色国家的附加描边环（主角色之外，按角色各画一圈） */
  const extraRings = useMemo(() => {
    if (!active) return [] as { d: string; color: string; dash: string; fi: number; key: string }[];
    const rings: { d: string; color: string; dash: string; fi: number; key: string }[] = [];
    countryFills!.forEach(({ role }, fi) => {
      const main = primaryRole(role.roles);
      role.roles
        .filter((r) => r !== main)
        .forEach((r, i) => {
          rings.push({
            d: pathGen(fc.features[fi]) ?? '',
            color: ROLE_META[r].color,
            // exporter 虚线、dependent 点线；同色时以宽度区分
            dash: r === 'exporter' ? '4 2.2' : '1 2',
            fi,
            key: `${role.code}-${r}-${i}`,
          });
        });
    });
    return rings;
  }, [active, countryFills]);

  const color = detail?.resource.color ?? '#fff';
  const unit = detail?.resource.unit ?? '';
  const labelKeys = useMemo(
    () => new Set((layers?.sites ?? []).slice(0, 3).map((s) => s.key)),
    [layers]
  );

  const roleTipRows = (role: ResourceRole): [string, string][] => {
    const rows: [string, string][] = [];
    if (role.roles.length) rows.push(['角色', role.roles.map((r) => ROLE_META[r].label).join(' / ')]);
    if (role.annualProduction != null) rows.push(['年产量', `${role.annualProduction} ${unit}`]);
    if (role.exportShare != null) rows.push(['出口比重', `${role.exportShare}%`]);
    if (role.importDependency != null) rows.push(['对外依赖度', `${role.importDependency}%`]);
    return rows;
  };

  const pointerHandlers = {
    onPointerDown,
    onPointerMove,
    onPointerCancel: endDrag,
    onPointerLeave: () => {
      endDrag();
      setTip(null);
    },
  };

  return (
    <div ref={wrapRef} className={`map-wrap resource-map ${isDragging ? 'dragging' : ''}`}>
      {/* 底图：国家轮廓 / 角色三色标注 */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        {...pointerHandlers}
        onPointerUp={onBasePointerUp}
      >
        <g transform={transformStr}>
          {(fc.features as any[]).map((f: any, fi: number) => {
            const hit = countryFills?.get(fi);
            const role = hit?.role;
            const isSelected = role && selectedCode === role.code;
            const cls = [
              'country-path',
              active && !role ? 'role-dimmed' : '',
              role ? 'role-country' : '',
              isSelected ? 'role-selected' : '',
            ]
              .filter(Boolean)
              .join(' ');
            const stroke = role ? ROLE_META[primaryRole(role.roles)].color : undefined;
            return (
              <path
                key={fi}
                d={pathGen(f) ?? ''}
                className={cls}
                style={{
                  fill: hit?.fill ?? LAND_DIM,
                  stroke: isSelected ? '#ffffff' : stroke,
                }}
                onPointerEnter={
                  role
                    ? (e) =>
                        setTip({
                          x: e.clientX,
                          y: e.clientY,
                          title: role.name,
                          rows: roleTipRows(role),
                        })
                    : undefined
                }
                onPointerLeave={role ? () => setTip(null) : undefined}
                onPointerUp={
                  role
                    ? (e) => {
                        if (drag.current?.moved) return;
                        e.stopPropagation();
                        onSelectRole(role.code);
                      }
                    : undefined
                }
              />
            );
          })}
          {/* 多角色国家的附加角色描边环 */}
          {extraRings.map((ring) => (
            <path
              key={ring.key}
              d={ring.d}
              className="role-ring"
              stroke={ring.color}
              strokeDasharray={ring.dash}
              style={{ pointerEvents: 'none' }}
            />
          ))}

          {/* 选中国家的定位标签 */}
          {selectedRole && (() => {
            const countryFeature = (fc.features as any[]).find((f: any) => String(f.id) === selectedRole.isoNumeric);
            if (!countryFeature) return null;
            const c = pathGen.centroid(countryFeature);
            if (!isFinite(c[0])) return null;
            return (
              <text x={c[0]} y={c[1] - 12} textAnchor="middle" className="role-label">
                {selectedRole.name}
              </text>
            );
          })()}
        </g>
      </svg>

      {/* 热力画布：由 ResourceLayerManager 管理，切换资源时先卸载再重绘 */}
      <canvas ref={canvasRef} className="heat-canvas" />

      {/* 点位层：产地圆点 + 消费国圆环；点击激活角色标注 */}
      <svg
        className="points-layer"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        {...pointerHandlers}
        onPointerUp={endDrag}
      >
        <g transform={transformStr}>
          {layers?.consumers.map((c) => (
            <g
              key={c.key}
              className={`consumer-node ${active ? 'node-hot' : ''}`}
              onPointerEnter={(e) =>
                setTip({
                  x: e.clientX,
                  y: e.clientY,
                  title: `${c.props.name} · 主要消费国`,
                  rows: [
                    ['消费量', `${c.props.value} ${unit}`],
                    ...(active ? ([['点击查看国家角色', '']] as [string, string][]) : []),
                  ],
                })
              }
              onPointerLeave={() => setTip(null)}
              onPointerUp={(e) => {
                if (drag.current?.moved) return;
                e.stopPropagation();
                onActivate(targetCodeOf(c));
              }}
            >
              <circle cx={c.x} cy={c.y} r={c.r + 2.5} fill="none" stroke={hexToRgba(color, 0.35)} strokeWidth={0.8} strokeDasharray="2 2" />
              <circle cx={c.x} cy={c.y} r={c.r} fill={hexToRgba(color, 0.14)} stroke={hexToRgba(color, 0.85)} strokeWidth={1} />
            </g>
          ))}
          {layers?.sites.map((s) => (
            <g
              key={s.key}
              className={`site-node ${active ? 'node-hot' : ''}`}
              onPointerEnter={(e) =>
                setTip({
                  x: e.clientX,
                  y: e.clientY,
                  title: `${s.props.name} · ${s.props.country ?? ''}`,
                  rows: [
                    ['生产量', `${s.props.value} ${unit}`],
                    ...(active ? ([['点击切换国家角色', '']] as [string, string][]) : []),
                  ],
                })
              }
              onPointerLeave={() => setTip(null)}
              onPointerUp={(e) => {
                if (drag.current?.moved) return;
                e.stopPropagation();
                onActivate(targetCodeOf(s));
              }}
            >
              <circle cx={s.x} cy={s.y} r={s.r + 2.5} fill={hexToRgba(color, 0.22)} />
              <circle cx={s.x} cy={s.y} r={s.r} fill={color} stroke="rgba(10,13,19,0.7)" strokeWidth={0.7} />
              {labelKeys.has(s.key) && !active && (
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
          {tip.rows.map(([k, v]) =>
            v ? (
              <div className="t-row" key={k}>
                <span>{k}</span>
                <b>{v}</b>
              </div>
            ) : (
              <div className="t-hint" key={k}>
                {k}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
