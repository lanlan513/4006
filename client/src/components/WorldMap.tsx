import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import worldTopo from 'world-atlas/countries-110m.json';
import type { CountryListItem, TradeFlow, ChainNode, ChainEdge, ChainStage } from '../api';
import type { MapMetricKey } from '../store';
import { isPopMetric, metricLabel } from '../store';
import { fmtTradeB, fmtMetric, fmtPopulation, fmtGrowth, fmtPercent } from '../format';

/* ---------- 配色 ---------- */
export const RAMP = ['#1a2734', '#1f3848', '#264d63', '#2f6680', '#3e85a6', '#58a9c8'];
const GROWTH_COLORS = ['#c06a58', '#2b3a4a', '#38596f', '#4e8571', '#7fb069'];
export const STAGE_COLORS = ['#d98a6e', '#e0a94f', '#57a9c9', '#7fb069', '#b48ac9', '#8b97a9'];
const LAND = '#171e2a';
const LAND_DIM = '#11161f';

/** 人口模式连续色带（暖色，与经济的蓝青 RAMP 区分） */
export const POP_RAMP = ['#23212e', '#3d2f4e', '#6b4560', '#9c6669', '#c98a6d', '#e8bd85'];
/** 人口增长率发散色带：收缩 → 平稳 → 扩张 */
export const POP_GROWTH_RAMP = ['#c06a58', '#2b3a4a', '#7fb069'];

export function stageColor(stages: ChainStage[], key: string): string {
  const i = stages.findIndex((s) => s.key === key);
  return STAGE_COLORS[i < 0 ? STAGE_COLORS.length - 1 : i];
}

function hexToRgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** 在多锚点色带上做连续 RGB 插值，t ∈ [0, 1] */
export function rampColor(ramp: string[], t: number): string {
  const x = Math.min(1, Math.max(0, t)) * (ramp.length - 1);
  const i = Math.min(ramp.length - 2, Math.floor(x));
  const f = x - i;
  const c0 = parseInt(ramp[i].slice(1), 16);
  const c1 = parseInt(ramp[i + 1].slice(1), 16);
  const r = Math.round(((c0 >> 16) & 255) + (((c1 >> 16) & 255) - ((c0 >> 16) & 255)) * f);
  const g = Math.round(((c0 >> 8) & 255) + (((c1 >> 8) & 255) - ((c0 >> 8) & 255)) * f);
  const b = Math.round((c0 & 255) + ((c1 & 255) - (c0 & 255)) * f);
  return `rgb(${r},${g},${b})`;
}

export function metricValue(c: CountryListItem, metric: MapMetricKey): number | null {
  if (metric === 'trade') return c.exports != null && c.imports != null ? c.exports + c.imports : null;
  return c[metric] as number | null;
}

interface Scale {
  get: (v: number | null) => string;
  min: number;
  max: number;
}

/** 顺序型指标：按当年分位数分桶，保证地图始终有对比层次 */
function buildScale(countries: CountryListItem[], metric: MapMetricKey): Scale {
  if (metric === 'gdpGrowth') {
    const get = (v: number | null) => {
      if (v == null) return LAND;
      if (v < 0) return GROWTH_COLORS[0];
      if (v < 2) return GROWTH_COLORS[1];
      if (v < 4) return GROWTH_COLORS[2];
      if (v < 7) return GROWTH_COLORS[3];
      return GROWTH_COLORS[4];
    };
    return { get, min: -6, max: 10 };
  }
  if (metric === 'popGrowth') {
    // 人口增长率：固定域 [-2%, +4%] 上的连续发散色带，跨年份色标稳定
    const get = (v: number | null) => {
      if (v == null) return LAND;
      const t = v <= 0 ? 0.5 + v / 4 : 0.5 + v / 8;
      return rampColor(POP_GROWTH_RAMP, t);
    };
    return { get, min: -2, max: 4 };
  }
  if (isPopMetric(metric)) {
    // 人口规模 / 比率类指标：当年值域上的连续色带。
    // 规模类（总人口、劳动力）跨度大，取对数域避免小国被压成同色。
    const logScale = metric === 'population' || metric === 'laborForce';
    const values = countries
      .map((c) => metricValue(c, metric))
      .filter((v): v is number => v != null && v > 0)
      .sort((a, b) => a - b);
    const min = values[0] ?? 0;
    const max = values[values.length - 1] ?? 1;
    const lo = logScale ? Math.log(min || 1) : min;
    const hi = logScale ? Math.log(max || 1) : max;
    const span = hi - lo || 1;
    const get = (v: number | null) => {
      if (v == null || v <= 0) return LAND;
      const x = logScale ? Math.log(v) : v;
      return rampColor(POP_RAMP, (x - lo) / span);
    };
    return { get, min, max };
  }
  const values = countries
    .map((c) => metricValue(c, metric))
    .filter((v): v is number => v != null && v > 0)
    .sort((a, b) => a - b);
  const min = values[0] ?? 0;
  const max = values[values.length - 1] ?? 1;
  const get = (v: number | null) => {
    if (v == null || v <= 0) return LAND;
    // 分位数排名
    let lo = 0;
    let hi = values.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (values[mid] < v) lo = mid + 1;
      else hi = mid;
    }
    const p = lo / values.length;
    const idx = Math.min(RAMP.length - 1, Math.floor(p * RAMP.length));
    return RAMP[idx];
  };
  return { get, min, max };
}

/* ---------- 几何 ---------- */
const W = 1000;
const H = 520;

const fc: any = feature(worldTopo as any, (worldTopo as any).objects.countries);

const projection = geoNaturalEarth1().fitExtent(
  [
    [6, 8],
    [W - 6, H - 8],
  ],
  fc
);
const pathGen = geoPath(projection);

function arcPath(x0: number, y0: number, x1: number, y1: number): string {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2 - Math.max(18, dist * 0.18);
  return `M${x0.toFixed(1)},${y0.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
}

/* ---------- 组件 ---------- */

export interface ChainOverlay {
  stages: ChainStage[];
  nodes: ChainNode[];
  edges: ChainEdge[];
}

interface Props {
  countries: CountryListItem[];
  metric: MapMetricKey;
  selected: string | null;
  onSelect: (code: string | null) => void;
  flows?: TradeFlow[] | null;
  networkOn?: boolean;
  chain?: ChainOverlay | null;
  onNodeClick?: (code: string) => void;
}

interface Tip {
  x: number;
  y: number;
  title: string;
  rows: [string, string][];
}

export default function WorldMap({
  countries,
  metric,
  selected,
  onSelect,
  flows,
  networkOn,
  chain,
  onNodeClick,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [tip, setTip] = useState<Tip | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number; moved: boolean } | null>(null);

  const byIso = useMemo(() => {
    const m = new Map<string, CountryListItem>();
    countries.forEach((c) => m.set(c.isoNumeric, c));
    return m;
  }, [countries]);

  const byCode = useMemo(() => {
    const m = new Map<string, CountryListItem>();
    countries.forEach((c) => m.set(c.code, c));
    return m;
  }, [countries]);

  const scale = useMemo(() => buildScale(countries, metric), [countries, metric]);

  const partnerSet = useMemo(() => {
    if (!networkOn || !selected || !flows) return null;
    const s = new Set<string>([selected]);
    for (const f of flows) {
      if (f.exporter === selected) s.add(f.importer);
      if (f.importer === selected) s.add(f.exporter);
    }
    return s;
  }, [flows, networkOn, selected]);

  const chainCountry = useMemo(() => {
    if (!chain) return null;
    const m = new Map<string, string>();
    for (const n of chain.nodes) if (!m.has(n.code)) m.set(n.code, n.stage);
    return m;
  }, [chain]);

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
        // 确认是拖拽后再捕获指针，保证普通点击的事件仍落在国家路径上
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
  const zoomBy = (factor: number) =>
    setTransform((t) => {
      const k = Math.min(9, Math.max(1, t.k * factor));
      const cx = W / 2;
      const cy = H / 2;
      const ratio = k / t.k;
      return { k, x: cx - (cx - t.x) * ratio, y: cy - (cy - t.y) * ratio };
    });

  /* 贸易弧线 */
  const flowPaths = useMemo(() => {
    if (!flows) return [];
    const maxV = Math.max(...flows.map((f) => f.value), 1);
    return flows
      .map((f) => {
        const a = byCode.get(f.exporter);
        const b = byCode.get(f.importer);
        if (!a || !b) return null;
        const pa = projection([a.lon, a.lat]);
        const pb = projection([b.lon, b.lat]);
        if (!pa || !pb) return null;
        const t = Math.sqrt(f.value / maxV);
        return {
          key: `${f.exporter}-${f.importer}`,
          d: arcPath(pa[0], pa[1], pb[0], pb[1]),
          width: 0.6 + t * 4.2,
          opacity: networkOn && selected ? 0.35 + t * 0.65 : 0.1 + Math.cbrt(f.value / maxV) * 0.4,
          flow: f,
          an: a.name,
          bn: b.name,
        };
      })
      .filter(Boolean) as {
      key: string;
      d: string;
      width: number;
      opacity: number;
      flow: TradeFlow;
      an: string;
      bn: string;
    }[];
  }, [flows, byCode, networkOn, selected]);

  /* 产业链叠加 */
  const chainArcs = useMemo(() => {
    if (!chain) return [];
    const pos = new Map<string, [number, number]>();
    for (const n of chain.nodes) {
      const p = projection([n.lon, n.lat]);
      if (p) pos.set(n.code, p);
    }
    const maxV = Math.max(...chain.edges.map((e) => e.value), 1);
    return chain.edges
      .map((e) => {
        const pa = pos.get(e.from);
        const pb = pos.get(e.to);
        if (!pa || !pb) return null;
        return {
          key: `${e.from}-${e.to}-${e.fromStage}`,
          d: arcPath(pa[0], pa[1], pb[0], pb[1]),
          color: stageColor(chain.stages, e.fromStage),
          width: 0.8 + (e.value / maxV) * 3.2,
          label: e.label,
        };
      })
      .filter(Boolean) as { key: string; d: string; color: string; width: number; label: string }[];
  }, [chain]);

  const showCountryTip = (e: React.PointerEvent, c: CountryListItem | null, name?: string) => {
    const rows: [string, string][] = [];
    if (c && isPopMetric(metric)) {
      // 人口数据模式：悬浮卡片展示全部人口指标，当前着色指标置顶
      const cur = metricValue(c, metric);
      rows.push([`● ${metricLabel(metric)}`, fmtMetric(metric, cur)]);
      if (metric !== 'population') rows.push(['总人口', fmtPopulation(c.population)]);
      if (metric !== 'popGrowth') rows.push(['人口增长率', fmtGrowth(c.popGrowth)]);
      if (metric !== 'agingRate') rows.push(['老龄化率', fmtPercent(c.agingRate)]);
      if (metric !== 'urbanRate') rows.push(['城市化率', fmtPercent(c.urbanRate)]);
      if (metric !== 'laborForce') rows.push(['劳动力规模', fmtPopulation(c.laborForce)]);
    } else {
      if (c?.gdp) rows.push(['GDP', `$${(c.gdp / 1e12).toFixed(2)}T`]);
      if (c?.gdpGrowth != null) rows.push(['增速', `${c.gdpGrowth > 0 ? '+' : ''}${c.gdpGrowth.toFixed(1)}%`]);
      if (c?.population != null) rows.push(['人口', fmtPopulation(c.population)]);
      if (flows && c) {
        const out = flows.filter((f) => f.exporter === c.code).reduce((s, f) => s + f.value, 0);
        const inn = flows.filter((f) => f.importer === c.code).reduce((s, f) => s + f.value, 0);
        if (out + inn > 0) rows.push(['双边贸易', fmtTradeB(out + inn)]);
      }
    }
    setTip({ x: e.clientX, y: e.clientY, title: c?.name ?? name ?? '', rows });
  };

  return (
    <div ref={wrapRef} className={`map-wrap ${isDragging ? 'dragging' : ''}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => {
          const wasClick = drag.current && !drag.current.moved;
          drag.current = null;
          setIsDragging(false);
          if (wasClick) onSelect(null);
        }}
        onPointerCancel={() => {
          drag.current = null;
          setIsDragging(false);
        }}
        onPointerLeave={() => {
          drag.current = null;
          setIsDragging(false);
          setTip(null);
        }}
      >
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          {/* 国家 */}
          {(fc.features as any[]).map((f: any, fi: number) => {
            const iso = String(f.id);
            const c = byIso.get(iso);
            const code = c?.code ?? null;
            const isChainCountry = chain && code && chainCountry?.has(code);
            let fill: string;
            if (chain) {
              if (isChainCountry) {
                fill = hexToRgba(stageColor(chain.stages, chainCountry!.get(code!)!), 0.32);
              } else fill = LAND_DIM;
            } else if (c) {
              fill = scale.get(metricValue(c, metric));
            } else fill = LAND_DIM;
            const cls = [
              'country-path',
              c ? 'has-data' : '',
              selected === code ? 'selected' : '',
              partnerSet && code && !partnerSet.has(code) ? 'dimmed' : '',
              partnerSet && code && partnerSet.has(code) && code !== selected ? 'partner' : '',
              isChainCountry ? 'in-chain' : '',
            ].join(' ');
            return (
              <path
                key={`${iso}-${fi}`}
                d={pathGen(f) ?? ''}
                className={cls}
                style={{ fill }}
                onPointerEnter={(e) => c && showCountryTip(e, c)}
                onPointerUp={(e) => {
                  if (drag.current?.moved) return;
                  e.stopPropagation();
                  if (c) onSelect(c.code);
                }}
              />
            );
          })}

          {/* 贸易弧线 */}
          {flowPaths.map((p) => (
            <path
              key={p.key}
              d={p.d}
              className={`flow-arc ${networkOn && selected ? 'animated' : ''}`}
              stroke="#57a9c9"
              strokeWidth={p.width}
              opacity={p.opacity}
              onClick={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onPointerEnter={(e) =>
                setTip({
                  x: e.clientX,
                  y: e.clientY,
                  title: `${p.an} → ${p.bn}`,
                  rows: [['出口额', fmtTradeB(p.flow.value)]],
                })
              }
              onPointerLeave={() => setTip(null)}
            />
          ))}

          {/* 产业链弧线 */}
          {chain &&
            chainArcs.map((a) => (
              <path key={a.key} d={a.d} className="chain-arc" stroke={a.color} strokeWidth={a.width} />
            ))}

          {/* 产业链节点 */}
          {chain &&
            chain.nodes.map((n, i) => {
              const p = projection([n.lon, n.lat]);
              if (!p) return null;
              const color = stageColor(chain.stages, n.stage);
              return (
                <g
                  key={`${n.code}-${n.stage}`}
                  className="chain-node"
                  opacity={0.95}
                  onPointerEnter={(e) =>
                    setTip({
                      x: e.clientX,
                      y: e.clientY,
                      title: `${n.name} · ${n.role}`,
                      rows: [['产业链环节', chain.stages.find((s) => s.key === n.stage)?.label ?? ''], [n.detail, '']],
                    })
                  }
                  onPointerLeave={() => setTip(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onNodeClick?.(n.code);
                  }}
                >
                  <circle cx={p[0]} cy={p[1]} r={4 + n.weight * 0.95} fill={hexToRgba(color, 0.35)} />
                  <circle cx={p[0]} cy={p[1]} r={2.2 + n.weight * 0.35} fill={color} />
                  {n.weight >= 8 && (
                    <text x={p[0]} y={p[1] - 7 - n.weight * 0.9} textAnchor="middle" className="map-label">
                      {n.name}
                    </text>
                  )}
                </g>
              );
            })}
        </g>
      </svg>

      {/* 缩放按钮 */}
      <div className="zoom-controls" style={{ display: chain ? 'none' : 'flex' }}>
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
          {tip.rows
            .filter((r) => r[0])
            .map(([k, v]) => (
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
