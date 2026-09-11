/**
 * 全球位置（Global Position）：该国在 GDP、人口、出口额上的全球排名与全球占比。
 *
 * - 左侧为百分比环形图（SVG，viewBox 自适应缩放），右侧为响应式进度条，双重视觉编码。
 * - 排名以「第 N / 共 M」展示；占比缺失（指标为 null）时统一显示 "--"。
 * - 响应式：桌面 3 列，平板 2 列，移动端单列堆叠。
 */
import type { GlobalPosition as PositionData, PositionStat } from '../schemas';
import { NA, hasValue, fmtPct, fmtCompactNum, fmtDollarsCompact } from '../format';

/** 百分比环形图：progress 为 0~100，缺测时渲染空环与 "--" */
function ShareRing({
  progress,
  color,
  label,
}: {
  progress: number | null;
  color: string;
  label: string;
}) {
  // r=26, circumference ≈ 163.36
  const R = 26;
  const C = 2 * Math.PI * R;
  const pct = hasValue(progress) ? Math.max(0, Math.min(100, progress)) : 0;
  const dash = C * (pct / 100);

  return (
    <div
      className="position-ring"
      style={{ ['--ring-color' as string]: color }}
      role="img"
      aria-label={`${label} 全球占比 ${hasValue(progress) ? fmtPct(progress) : NA}`}
    >
      <svg viewBox="0 0 64 64" className="position-ring-svg">
        <circle className="ring-track" cx="32" cy="32" r={R} />
        <circle
          className="ring-fill"
          cx="32"
          cy="32"
          r={R}
          strokeDasharray={`${dash} ${C - dash}`}
        />
      </svg>
      <span className="ring-center">{hasValue(progress) ? fmtPct(progress) : NA}</span>
    </div>
  );
}

/** 进度条：占比极小（< 0.2%）时也保留一个最小可见点，缺测时为空条 */
function ShareBar({ progress, color }: { progress: number | null; color: string }) {
  const pct = hasValue(progress) ? Math.max(0, Math.min(100, progress)) : 0;
  const width = pct > 0 ? Math.max(pct, 0.35) : 0; // 单位为 %，线性刻度
  return (
    <div
      className="position-bar"
      style={{ ['--ring-color' as string]: color }}
      aria-hidden="true"
    >
      <i style={{ width: `${width}%` }} />
    </div>
  );
}

function PositionItem({
  title,
  stat,
  color,
  totalText,
}: {
  title: string;
  stat: PositionStat;
  color: string;
  totalText: string;
}) {
  const rankText = hasValue(stat.rank) ? (
    <>
      第 <b>{stat.rank}</b> 名
      <span className="position-count">/ 共 {stat.count} 个经济体</span>
    </>
  ) : (
    <span className="na">{NA}</span>
  );

  return (
    <article className="position-item" style={{ ['--ring-color' as string]: color }}>
      <div className="position-item-head">
        <ShareRing progress={stat.share} color={color} label={title} />
        <div className="position-meta">
          <div className="position-title">{title}</div>
          <div className="position-rank">{rankText}</div>
          <div className="position-share-text">
            占全球
            <b>{hasValue(stat.share) ? fmtPct(stat.share) : NA}</b>
          </div>
        </div>
      </div>
      <ShareBar progress={stat.share} color={color} />
      <div className="position-total" title={totalText}>
        收录经济体合计：{totalText}
      </div>
    </article>
  );
}

export default function GlobalPosition({ data }: { data: PositionData }) {
  const covered = Math.max(data.gdp.count, data.population.count, data.exports.count);
  return (
    <section className="position-section" aria-label="全球位置">
      <div className="module-head">
        <h3 className="module-title">全球位置 · Global Position</h3>
        <span className="module-sub">{data.year} 年 · 排名与占比</span>
      </div>
      <div className="position-grid">
        <PositionItem
          title="GDP"
          stat={data.gdp}
          color="var(--accent)"
          totalText={fmtDollarsCompact(data.gdp.total)}
        />
        <PositionItem
          title="人口"
          stat={data.population}
          color="var(--cyan)"
          totalText={`${fmtCompactNum(data.population.total)} 人`}
        />
        <PositionItem
          title="货物出口额"
          stat={data.exports}
          color="var(--green)"
          totalText={fmtDollarsCompact(data.exports.total)}
        />
      </div>
      <p className="position-note">
        * 排名与占比基于当前收录的 {covered} 个主要经济体同年度数据汇总计算，
        并列国家取相同名次；某项指标缺测的国家不参与该指标排名。
      </p>
    </section>
  );
}
