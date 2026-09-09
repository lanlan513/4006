import { useMemo } from 'react';
import type { ChainDetail } from '../api';
import { stageColor } from './WorldMap';

interface Props {
  chain: ChainDetail;
  onNodeClick: (code: string) => void;
}

const COL_W = 234;
const NODE_W = COL_W - 40;
const NODE_H = 62;
const GAP = 12;
const HEADER_H = 42;

interface Placed {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * 产业链横向流程图：阶段从左到右推进，节点为国家，
 * 弧线表示货物流向，节点按阶段依次浮现。
 */
export default function ChainFlow({ chain, onNodeClick }: Props) {
  const { nodes, edges } = chain;
  const stages = chain.chain.stages;

  const layout = useMemo(() => {
    const cols = stages.map((s) => nodes.filter((n) => n.stage === s.key).sort((a, b) => b.weight - a.weight));
    const maxRows = Math.max(...cols.map((c) => c.length));
    const width = stages.length * COL_W + 10;
    const height = HEADER_H + maxRows * (NODE_H + GAP) + 10;

    const place = new Map<string, Placed & { code: string; name: string; role: string; weight: number; stageIdx: number }>();
    cols.forEach((col, ci) => {
      col.forEach((n, ri) => {
        place.set(`${n.code}|${n.stage}`, {
          code: n.code,
          name: n.name,
          role: n.role,
          weight: n.weight,
          stageIdx: ci,
          x: ci * COL_W + 20,
          y: HEADER_H + ri * (NODE_H + GAP),
          w: NODE_W,
          h: NODE_H,
        });
      });
    });

    const placedEdges = edges
      .map((e) => {
        const from = place.get(`${e.from}|${e.fromStage}`);
        const to = place.get(`${e.to}|${e.toStage}`);
        if (!from || !to) return null;
        const p0x = from.x + from.w;
        const p0y = from.y + from.h / 2;
        const p1x = to.x;
        const p1y = to.y + to.h / 2;
        const dx = Math.max(30, (p1x - p0x) * 0.45);
        const mx = 0.125 * p0x + 0.375 * (p0x + dx) + 0.375 * (p1x - dx) + 0.125 * p1x;
        const my = 0.125 * p0y + 0.375 * p0y + 0.375 * p1y + 0.125 * p1y;
        return {
          key: `${e.from}-${e.to}-${e.fromStage}`,
          d: `M${p0x},${p0y} C${p0x + dx},${p0y} ${p1x - dx},${p1y} ${p1x - 4},${p1y}`,
          arrow: `${p1x - 4},${p1y} ${p1x - 11},${p1y - 4} ${p1x - 11},${p1y + 4}`,
          color: stageColor(stages, e.fromStage),
          width: 0.8 + e.value * 0.45,
          label: e.label,
          lx: mx,
          ly: my,
        };
      })
      .filter(Boolean);

    return { width, height, cols, place, placedEdges };
  }, [chain]);

  return (
    <div className="flow-diagram">
      <svg width={layout.width} height={layout.height} className="chain-flow-svg">
        {/* 阶段表头 */}
        {stages.map((s, i) => {
          const color = stageColor(stages, s.key);
          return (
            <g key={s.key}>
              <text
                x={i * COL_W + COL_W / 2 + 5}
                y={20}
                textAnchor="middle"
                fontSize={12}
                letterSpacing={3}
                fill={color}
              >
                {s.label}
              </text>
              <line
                x1={i * COL_W + 24}
                y1={32}
                x2={(i + 1) * COL_W - 4}
                y2={32}
                stroke={color}
                strokeOpacity={0.5}
                strokeWidth={1.5}
              />
            </g>
          );
        })}

        {/* 流向连线 */}
        {layout.placedEdges.map((e) => (
          <g key={e!.key}>
            <path
              d={e!.d}
              fill="none"
              stroke={e!.color}
              strokeOpacity={0.4}
              strokeWidth={e!.width}
            />
            <polygon points={e!.arrow} fill={e!.color} fillOpacity={0.65} />
            <text
              x={e!.lx}
              y={e!.ly - 5}
              textAnchor="middle"
              fontSize={9.5}
              fill={e!.color}
              style={{ paintOrder: 'stroke', stroke: '#0d1118', strokeWidth: 3 }}
            >
              {e!.label}
            </text>
          </g>
        ))}

        {/* 国家节点 */}
        {[...layout.place.entries()].map(([key, n]) => {
          const color = stageColor(stages, stages[n.stageIdx].key);
          return (
            <g
              key={key}
              className="sn"
              style={{ cursor: 'pointer', animationDelay: `${n.stageIdx * 160}ms` }}
              onClick={() => onNodeClick(n.code)}
            >
              <title>{n.name} · {n.role}</title>
              <rect
                x={n.x}
                y={n.y}
                width={n.w}
                height={n.h}
                rx={7}
                fill="#10151e"
                stroke={color}
                strokeOpacity={0.45}
              />
              <rect x={n.x} y={n.y} width={3.5} height={n.h} rx={2} fill={color} />
              <text x={n.x + 12} y={n.y + 23} fontSize={13} fontWeight={700} fill="#e6ebf2">
                {n.name}
              </text>
              <text x={n.x + 12} y={n.y + 42} fontSize={10} fill={color} fillOpacity={0.9}>
                {n.role.length > 13 ? n.role.slice(0, 13) + '…' : n.role}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
