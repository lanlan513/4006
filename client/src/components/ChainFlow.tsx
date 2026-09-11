import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { IndustryChain, IndustryEdge, IndustryNode, IndustrySegment } from '../industry/types';
import { stageColor } from './WorldMap';

interface Props {
  chain: IndustryChain;
  onNodeClick: (code: string) => void;
}

const MARGIN_X = 22;
const COL_W = 216;
const NODE_W = 174;
const NODE_H = 64;
const NODE_GAP = 14;
const HEADER_H = 86;
const BOTTOM_PAD = 26;
const WIDTH = MARGIN_X * 2 + COL_W * 5;
const ARROW_GAP = 8;

interface PlacedNode {
  node: IndustryNode;
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  stageIndex: number;
  color: string;
}

interface PlacedEdge {
  edge: IndustryEdge;
  source: PlacedNode;
  target: PlacedNode;
  path: Path2D;
  width: number;
  d: string;
  c2x: number;
  c2y: number;
  gradient: CanvasGradient;
}

interface HoverTarget {
  kind: 'node' | 'edge';
  id: string;
  x: number;
  y: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  const value = parseInt(
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized,
    16
  );
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgba(hex: string, alpha: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let value = text;
  while (value.length > 1 && ctx.measureText(`${value}…`).width > maxWidth) {
    value = value.slice(0, -1);
  }
  return `${value}…`;
}

/**
 * Canvas 产业链导向连线图：
 * - 节点代表「国家 × 环节」，按数据声明的环节从左到右分栏；
 * - 贝塞尔曲线表示上游到下游的方向，线宽按贸易量映射；
 * - 点击节点仅做关联高亮，双击或使用详情按钮进入国家画像。
 */
export default function ChainFlow({ chain, onNodeClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hover, setHover] = useState<HoverTarget | null>(null);
  const hoverRef = useRef<HoverTarget | null>(null);
  const selectedRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);

  const segments = useMemo(() => chain.segments.slice(0, 5), [chain.segments]);

  const layout = useMemo(() => {
    const columns = segments.map((segment) =>
      chain.nodes
        .filter((node) => node.segment === segment.key)
        .sort((a, b) => b.weight - a.weight || a.countryName.localeCompare(b.countryName, 'zh-CN'))
    );
    const maxRows = columns.reduce((max, col) => Math.max(max, col.length), 0);
    const height = HEADER_H + maxRows * NODE_H + Math.max(0, maxRows - 1) * NODE_GAP + BOTTOM_PAD;

    const placed = new Map<string, PlacedNode>();
    columns.forEach((col, stageIndex) => {
      const colH = col.length * NODE_H + Math.max(0, col.length - 1) * NODE_GAP;
      const y0 = HEADER_H + Math.max(0, (height - HEADER_H - BOTTOM_PAD - colH) / 2);
      col.forEach((node, row) => {
        const x = MARGIN_X + stageIndex * COL_W + (COL_W - NODE_W) / 2;
        const y = y0 + row * (NODE_H + NODE_GAP);
        placed.set(node.id, {
          node,
          x,
          y,
          w: NODE_W,
          h: NODE_H,
          cx: x + NODE_W / 2,
          cy: y + NODE_H / 2,
          stageIndex,
          color: stageColor(segments, node.segment),
        });
      });
    });

    return { width: WIDTH, height, placed, maxRows };
  }, [chain.nodes, segments]);

  const graph = useMemo(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const edges: PlacedEdge[] = [];

    chain.edges.forEach((edge) => {
      const source = layout.placed.get(edge.source);
      const target = layout.placed.get(edge.target);
      // 导向图只绘制朝下游推进的边；同国跨环节的纵向一体化除外。
      if (!ctx || !source || !target) return;
      if (target.stageIndex <= source.stageIndex && source.node.id !== target.node.id) return;

      const x0 = source.x + source.w;
      const y0 = source.cy;
      const x1 = target.x - ARROW_GAP;
      const y1 = target.cy;
      const distanceX = x1 - x0;
      const dx = Math.max(42, Math.abs(distanceX) * 0.48);
      const c1x = x0 + Math.sign(distanceX || 1) * dx;
      const c2x = x1 - Math.sign(distanceX || 1) * dx;
      const d = `M ${x0} ${y0} C ${c1x} ${y0}, ${c2x} ${y1}, ${x1} ${y1}`;
      const path = new Path2D(d);
      const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
      gradient.addColorStop(0, rgba(source.color, 0.2));
      gradient.addColorStop(0.5, rgba(source.color, 0.72));
      gradient.addColorStop(1, rgba(target.color, 0.82));
      const volume = Math.max(1, Math.min(10, edge.volume || 1));
      edges.push({
        edge,
        source,
        target,
        path,
        d,
        c2x,
        c2y: y1,
        gradient,
        width: 1 + volume * 0.75,
      });
    });

    const incoming = new Map<string, IndustryEdge[]>();
    const outgoing = new Map<string, IndustryEdge[]>();
    edges.forEach(({ edge, source, target }) => {
      outgoing.set(source.node.id, [...(outgoing.get(source.node.id) ?? []), edge]);
      incoming.set(target.node.id, [...(incoming.get(target.node.id) ?? []), edge]);
    });

    return { edges, incoming, outgoing };
  }, [chain.edges, layout.placed]);

  const selectedNode = selectedId ? layout.placed.get(selectedId)?.node ?? null : null;

  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);
  useEffect(() => {
    hoverRef.current = hover;
  }, [hover]);

  useEffect(() => {
    if (!layout.placed.has(selectedId ?? '')) setSelectedId(null);
  }, [layout.placed, selectedId]);

  const draw = useCallback(
    (time = 0) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(layout.width * dpr) || canvas.height !== Math.round(layout.height * dpr)) {
        canvas.width = Math.round(layout.width * dpr);
        canvas.height = Math.round(layout.height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, layout.width, layout.height);

      const activeNode = selectedRef.current;
      const hoverTarget = hoverRef.current;
      const activeEdgeSet = new Set(
        graph.edges
          .filter(({ edge }) => activeNode && (edge.source === activeNode || edge.target === activeNode))
          .map(({ edge }) => edge.id)
      );
      const activeNeighbors = new Set(activeNode ? [activeNode] : []);
      if (activeNode) {
        graph.edges.forEach(({ edge }) => {
          if (edge.source === activeNode) activeNeighbors.add(edge.target);
          if (edge.target === activeNode) activeNeighbors.add(edge.source);
        });
      }
      const hasFocus = Boolean(activeNode);

      // 分栏背景和阶段标题
      segments.forEach((segment: IndustrySegment, i) => {
        const x = MARGIN_X + i * COL_W;
        const color = stageColor(segments, segment.key);
        const stageConnected = [...layout.placed.values()].some(
          (p) => p.stageIndex === i && activeNeighbors.has(p.node.id)
        );
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.008)';
        roundedRectPath(ctx, x + 4, 60, COL_W - 8, layout.height - 78, 14);
        ctx.fill();

        ctx.textAlign = 'center';
        ctx.font = '700 14px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = color;
        ctx.globalAlpha = hasFocus && !stageConnected ? 0.42 : 1;
        ctx.fillText(segment.label, x + COL_W / 2, 25);
        ctx.globalAlpha = 1;

        ctx.strokeStyle = rgba(color, 0.42);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 28, 41);
        ctx.lineTo(x + COL_W - 28, 41);
        ctx.stroke();

        ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
        ctx.fillStyle = 'rgba(139,151,169,0.72)';
        ctx.fillText(`0${i + 1}`, x + COL_W / 2, 56);
      });

      // 连线
      graph.edges.forEach((item) => {
        const related = activeNode
          ? item.edge.source === activeNode || item.edge.target === activeNode
          : false;
        const hovered = hoverTarget?.kind === 'edge' && hoverTarget.id === item.edge.id;
        const alpha = hasFocus ? (related ? 0.96 : 0.045) : hovered ? 0.88 : 0.34;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = item.gradient;
        ctx.lineWidth = item.width * (related || hovered ? 1.12 : 1);
        ctx.lineCap = 'round';
        ctx.shadowColor = related ? rgba(item.target.color, 0.7) : 'transparent';
        ctx.shadowBlur = related ? 12 : 0;
        ctx.stroke(item.path);

        if (related) {
          ctx.strokeStyle = 'rgba(255,255,255,0.24)';
          ctx.lineWidth = Math.max(1, item.width * 0.22);
          ctx.setLineDash([5, 13]);
          ctx.lineDashOffset = -time / 38;
          ctx.stroke(item.path);
          ctx.setLineDash([]);
        }

        // 箭头：沿末端切线方向构造
        const t = item.target;
        const sx = t.x - ARROW_GAP;
        const sy = t.cy;
        const tangentX = sx - item.c2x;
        const tangentY = sy - item.c2y;
        const len = Math.max(1, Math.hypot(tangentX, tangentY));
        const ux = tangentX / len;
        const uy = tangentY / len;
        const size = Math.max(7, Math.min(12, item.width + 3));
        const baseX = sx - ux * size * 0.72;
        const baseY = sy - uy * size * 0.72;
        const px = -uy;
        const py = ux;
        ctx.shadowBlur = related ? 10 : 0;
        ctx.shadowColor = rgba(t.color, related ? 0.8 : 0);
        ctx.fillStyle = t.color;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(baseX + px * size * 0.58, baseY + py * size * 0.58);
        ctx.lineTo(baseX - px * size * 0.58, baseY - py * size * 0.58);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      // 节点
      layout.placed.forEach((p) => {
        const selected = activeNode === p.node.id;
        const neighbor = activeNeighbors.has(p.node.id);
        const hovered = hoverTarget?.kind === 'node' && hoverTarget.id === p.node.id;
        const alpha = hasFocus ? (neighbor ? 1 : 0.13) : hovered ? 1 : 0.96;

        ctx.save();
        ctx.globalAlpha = alpha;

        if (selected) {
          ctx.shadowColor = rgba(p.color, 0.72);
          ctx.shadowBlur = 20;
        } else if (neighbor || hovered) {
          ctx.shadowColor = rgba(p.color, 0.34);
          ctx.shadowBlur = 10;
        }

        roundedRectPath(ctx, p.x, p.y, p.w, p.h, 9);
        ctx.fillStyle = selected ? '#17202d' : '#10151e';
        ctx.fill();
        ctx.strokeStyle = selected || neighbor || hovered ? p.color : rgba(p.color, 0.48);
        ctx.lineWidth = selected ? 2.1 : 1.15;
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = p.color;
        roundedRectPath(ctx, p.x, p.y + 8, 4, p.h - 16, 2);
        ctx.fill();

        ctx.textAlign = 'left';
        ctx.font = '700 13.5px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#e6ebf2';
        ctx.fillText(fitText(ctx, p.node.countryName, p.w - 28), p.x + 14, p.y + 24);

        ctx.font = '11px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
        ctx.fillStyle = rgba(p.color, 0.95);
        ctx.fillText(fitText(ctx, p.node.role, p.w - 22), p.x + 14, p.y + 44);

        ctx.fillStyle = 'rgba(230,235,242,0.46)';
        ctx.beginPath();
        ctx.arc(p.x + p.w - 13, p.y + 13, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      const needsAnimation = activeEdgeSet.size > 0;
      if (needsAnimation) {
        rafRef.current = requestAnimationFrame((next) => draw(next));
      } else {
        rafRef.current = null;
      }
    },
    [graph.edges, layout.height, layout.placed, layout.width, segments]
  );

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame((t) => draw(t));
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [draw, hover, selectedId]);

  useEffect(() => () => setSelectedId(null), [chain.id]);

  const eventPosition = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * layout.width,
      y: ((event.clientY - rect.top) / rect.height) * layout.height,
      clientX: event.clientX,
      clientY: event.clientY,
    };
  };

  const hitTest = (x: number, y: number): HoverTarget | null => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return null;

    for (const p of [...layout.placed.values()].reverse()) {
      if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) {
        return { kind: 'node', id: p.node.id, x, y };
      }
    }
    ctx.lineWidth = 14;
    for (const item of [...graph.edges].reverse()) {
      if (ctx.isPointInStroke(item.path, x, y)) {
        return { kind: 'edge', id: item.edge.id, x, y };
      }
    }
    return null;
  };

  const hoveredEdge = hover?.kind === 'edge' ? graph.edges.find((e) => e.edge.id === hover.id) : null;
  const hoveredNode = hover?.kind === 'node' ? layout.placed.get(hover.id)?.node : null;
  const upstream = selectedId ? graph.incoming.get(selectedId) ?? [] : [];
  const downstream = selectedId ? graph.outgoing.get(selectedId) ?? [] : [];
  const edgeName = (edge: IndustryEdge) => {
    const source = layout.placed.get(edge.source)?.node.countryName ?? '未知';
    const target = layout.placed.get(edge.target)?.node.countryName ?? '未知';
    return `${source} → ${target}`;
  };

  return (
    <div className="flow-canvas-card">
      <div className="flow-toolbar">
        <div>
          <b>导向连线图</b>
          <span>单击节点高亮直接上下游；双击节点进入国家画像</span>
        </div>
        <div className="flow-toolbar-right">
          <span className="width-legend">
            贸易量
            <i className="thin" />
            <i className="middle" />
            <i className="thick" />
          </span>
          {selectedId && (
            <button className="flow-clear" onClick={() => setSelectedId(null)}>
              清除高亮
            </button>
          )}
        </div>
      </div>

      <div className="flow-canvas-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className="chain-flow-canvas"
          style={{ width: layout.width, height: layout.height }}
          onMouseMove={(event) => {
            const p = eventPosition(event);
            const target = hitTest(p.x, p.y);
            setHover(target ? { ...target, x: p.clientX, y: p.clientY } : null);
          }}
          onMouseLeave={() => setHover(null)}
          onClick={(event) => {
            const p = eventPosition(event);
            const target = hitTest(p.x, p.y);
            if (target?.kind === 'node') {
              setSelectedId((current) => (current === target.id ? null : target.id));
            } else {
              setSelectedId(null);
            }
          }}
          onDoubleClick={(event) => {
            const p = eventPosition(event);
            const target = hitTest(p.x, p.y);
            if (target?.kind === 'node') {
              const node = layout.placed.get(target.id)?.node;
              if (node) onNodeClick(node.country);
            }
          }}
        />

        {hover && (
          <div
            className="flow-tooltip"
            style={{
              left: Math.min(hover.x - (wrapRef.current?.getBoundingClientRect().left ?? 0) + 14, 690),
              top: hover.y - (wrapRef.current?.getBoundingClientRect().top ?? 0) + 14,
            }}
          >
            {hoveredNode && (
              <>
                <b>{hoveredNode.countryName}</b>
                <span>{hoveredNode.role}</span>
                <small>单击高亮 · 双击进入画像</small>
              </>
            )}
            {hoveredEdge && (
              <>
                <b>{hoveredEdge.edge.label || '贸易流'}</b>
                <span>{edgeName(hoveredEdge.edge)}</span>
                <small>相对贸易量：{hoveredEdge.edge.volume}/10</small>
              </>
            )}
          </div>
        )}
      </div>

      {selectedNode && (
        <div className="flow-inspector" role="status">
          <div className="inspector-main">
            <span className="inspector-stage" style={{ color: stageColor(segments, selectedNode.segment) }}>
              {segments.find((s) => s.key === selectedNode.segment)?.label ?? selectedNode.segment}
            </span>
            <b>{selectedNode.countryName}</b>
            <p>{selectedNode.detail || selectedNode.role}</p>
            <button className="btn-primary" onClick={() => onNodeClick(selectedNode.country)}>
              进入国家画像 <span className="arrow">→</span>
            </button>
          </div>
          <div className="inspector-relations">
            <div>
              <h5>上游来源 · {upstream.length}</h5>
              {upstream.length ? (
                upstream.map((edge) => (
                  <button key={edge.id} onClick={() => setSelectedId(edge.source)}>
                    <span>{layout.placed.get(edge.source)?.node.countryName}</span>
                    <em>{edge.label}</em>
                  </button>
                ))
              ) : (
                <small>暂无直接上游</small>
              )}
            </div>
            <div>
              <h5>下游去向 · {downstream.length}</h5>
              {downstream.length ? (
                downstream.map((edge) => (
                  <button key={edge.id} onClick={() => setSelectedId(edge.target)}>
                    <span>{layout.placed.get(edge.target)?.node.countryName}</span>
                    <em>{edge.label}</em>
                  </button>
                ))
              ) : (
                <small>暂无直接下游</small>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
