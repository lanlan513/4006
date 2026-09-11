/**
 * 贸易网络地图：Leaflet 二维地图 + Canvas 图层。
 *
 * - 底图：CARTO 深色瓦片（可替换为高德 / Mapbox 瓦片源）
 * - 国家节点：来自 GeoJSON 中心点，半径 ∝ √贸易总额，颜色 = 主导商品类别
 * - 连线：三阶贝塞尔曲线，双向贸易流分弯向弦两侧避免叠重
 * - 交互：点击节点聚焦该国及其直接贸易伙伴，隐去无关节点与连线；
 *   点击空白处或再次点击同一节点退出聚焦
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { CountryCentroidsGeoJSON } from '../api';
import {
  categoryColor,
  directPartners,
  type TradeTopology,
} from '../lib/tradeTopology';
import {
  TradeCanvasLayer,
  type HitResult,
  type RenderEdge,
  type RenderNode,
  type TradeRenderData,
} from './TradeCanvasLayer';
import { fmtTradeB } from '../format';

interface Props {
  centroids: CountryCentroidsGeoJSON | null;
  topology: TradeTopology;
  selected: string | null;
  onSelect: (code: string | null) => void;
}

interface Tip {
  x: number;
  y: number;
  title: string;
  rows: [string, string][];
}

const MAX_LABELS = 12;

/** 由邻接表 + GeoJSON 中心点构建图层渲染数据（含聚焦隐去逻辑） */
function buildRenderData(
  centroids: CountryCentroidsGeoJSON,
  topology: TradeTopology,
  selected: string | null
): TradeRenderData {
  const geo = new Map<string, { name: string; lat: number; lon: number }>();
  for (const f of centroids.features) {
    geo.set(f.properties.code, {
      name: f.properties.name,
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
    });
  }

  const partners = selected ? directPartners(topology, selected) : null;
  const { maxVolume, maxNodeVolume } = topology;

  /* 连线：聚焦时仅保留与选中国家直接相连的边，其余隐去 */
  const edges: RenderEdge[] = [];
  for (const e of topology.edges) {
    if (partners && e.source !== selected && e.target !== selected) continue;
    const a = geo.get(e.source);
    const b = geo.get(e.target);
    if (!a || !b) continue;
    // 跨日界线展开：目标经度取离来源最近的副本，连线走最短路径
    let tLon = b.lon;
    while (tLon - a.lon > 180) tLon -= 360;
    while (tLon - a.lon < -180) tLon += 360;
    const t = Math.sqrt(e.volume / (maxVolume || 1));
    edges.push({
      key: `${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      sLat: a.lat,
      sLon: a.lon,
      tLat: b.lat,
      tLon,
      width: (partners ? 1.1 : 0.7) + t * (partners ? 4.2 : 3.4),
      color: categoryColor(e.category),
      alpha: partners ? 0.38 + t * 0.55 : 0.13 + t * 0.36,
      animated: partners != null,
      sourceName: a.name,
      targetName: b.name,
      volume: e.volume,
      category: e.category,
    });
  }

  /* 节点 */
  const nodes: RenderNode[] = [];
  for (const n of topology.nodes.values()) {
    const g = geo.get(n.code);
    if (!g) continue;
    const inFocus = !partners || partners.has(n.code);
    nodes.push({
      code: n.code,
      name: g.name,
      lat: g.lat,
      lon: g.lon,
      r: 3.2 + Math.sqrt(n.totalVolume / (maxNodeVolume || 1)) * 13,
      color: categoryColor(n.topCategory),
      alpha: inFocus ? (partners ? 1 : 0.92) : 0.07, // 无关节点隐去
      label: false, // 下面按体量挑选
      state: !partners
        ? 'normal'
        : n.code === selected
          ? 'selected'
          : partners.has(n.code)
            ? 'partner'
            : 'dimmed',
    });
  }

  /* 标签：全局态标体量前 12，聚焦态标选中国与伙伴 */
  const labeled = partners
    ? nodes.filter((n) => n.state === 'selected' || n.state === 'partner')
    : [...nodes].sort((a, b) => b.r - a.r).slice(0, MAX_LABELS);
  for (const n of labeled.slice(0, partners ? 16 : MAX_LABELS)) n.label = true;

  return { nodes, edges };
}

export default function TradeNetworkMap({ centroids, topology, selected, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<TradeCanvasLayer | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  // 通过 ref 向地图事件回调提供最新状态，避免重复初始化地图
  const selectedRef = useRef(selected);
  const onSelectRef = useRef(onSelect);
  const topologyRef = useRef(topology);
  const dataRef = useRef<TradeRenderData | null>(null);
  selectedRef.current = selected;
  onSelectRef.current = onSelect;
  topologyRef.current = topology;

  /* 初始化 Leaflet 地图与 Canvas 图层（仅一次） */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const map = L.map(el, {
      center: [26, 8],
      zoom: 2.5,
      minZoom: 2,
      maxZoom: 8,
      zoomSnap: 0.5,
      zoomControl: false,
      worldCopyJump: true,
      maxBounds: L.latLngBounds([-84, -540], [84, 540]),
      maxBoundsViscosity: 0.5,
    });
    L.control.zoom({ position: 'bottomleft' }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 18,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    const layer = new TradeCanvasLayer();
    layer.addTo(map);
    mapRef.current = map;
    layerRef.current = layer;
    if (dataRef.current) layer.setData(dataRef.current);

    // 开发环境暴露调试句柄（E2E 测试 / 控制台调试用）
    if (import.meta.env.DEV) {
      (window as any).__tradeMap = map;
      (window as any).__tradeLayer = layer;
    }

    const tipFor = (hit: HitResult, ev: MouseEvent): Tip | null => {
      if (!hit) return null;
      if (hit.type === 'node') {
        const tn = topologyRef.current.nodes.get(hit.node.code);
        const partners = topologyRef.current.adjacency.get(hit.node.code)?.length ?? 0;
        const rows: [string, string][] = [];
        if (tn) {
          rows.push(['出口', fmtTradeB(tn.outVolume)], ['进口', fmtTradeB(tn.inVolume)]);
        }
        rows.push(['贸易流', `${partners} 条`]);
        return { x: ev.clientX, y: ev.clientY, title: hit.node.name, rows };
      }
      const e = hit.edge;
      return {
        x: ev.clientX,
        y: ev.clientY,
        title: `${e.sourceName} → ${e.targetName}`,
        rows: [
          ['类别', e.category],
          ['出口额', fmtTradeB(e.volume)],
        ],
      };
    };

    map.on('click', (e: L.LeafletMouseEvent) => {
      const hit = layer.hitTest(e.layerPoint);
      if (hit?.type === 'node') {
        const code = hit.node.code;
        onSelectRef.current(code === selectedRef.current ? null : code);
      } else {
        onSelectRef.current(null);
      }
    });
    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      const hit = layer.hitTest(e.layerPoint);
      map.getContainer().style.cursor = hit ? 'pointer' : '';
      layer.setHover(hit?.type === 'node' ? hit.node.code : null);
      setTip(tipFor(hit, e.originalEvent));
    });
    map.on('mouseout', () => {
      layer.setHover(null);
      setTip(null);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  /* 邻接表 / GeoJSON / 选中态 → 渲染数据 */
  const renderData = useMemo(
    () => (centroids ? buildRenderData(centroids, topology, selected) : null),
    [centroids, topology, selected]
  );
  useEffect(() => {
    dataRef.current = renderData;
    layerRef.current?.setData(renderData ?? { nodes: [], edges: [] });
  }, [renderData]);

  return (
    <>
      <div ref={containerRef} className="leaflet-map" />
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
    </>
  );
}
