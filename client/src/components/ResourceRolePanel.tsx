import type { ResourceDetail, ResourceRole, ResourceRoleKey } from '../api';
import { ROLE_META, ROLE_PRIORITY } from './resourceRoles';

interface Props {
  detail: ResourceDetail;
  roles: ResourceRole[];
  selectedCode: string | null;
  /** 所点国家不在角色数据集时的显示名（面板进入空指标状态） */
  unknownName: string | null;
  onSelect: (code: string) => void;
  onClose: () => void;
}

/** 按三类角色分组（同一国家可出现在多个分组中），顺序：生产 → 出口 → 高依赖 */
function groupByRole(roles: ResourceRole[]): Record<ResourceRoleKey, ResourceRole[]> {
  const groups: Record<ResourceRoleKey, ResourceRole[]> = {
    producer: [],
    exporter: [],
    dependent: [],
  };
  for (const r of roles) for (const key of r.roles) groups[key].push(r);
  // 生产组按年产量降序（后端已排序，这里兜底）；出口组按出口比重；高依赖组按依赖度
  groups.producer.sort((a, b) => (b.annualProduction ?? 0) - (a.annualProduction ?? 0));
  groups.exporter.sort((a, b) => (b.exportShare ?? 0) - (a.exportShare ?? 0));
  groups.dependent.sort((a, b) => (b.importDependency ?? 0) - (a.importDependency ?? 0));
  return groups;
}

const pct = (v: number | null) => (v == null ? '—' : `${v}%`);

/**
 * 资源国家角色浮层面板。
 * 点击资源节点后从左侧滑入：顶部为选中国家的三项核心指标
 * （年产量 / 出口比重 / 对外依赖度），下方按三类角色分组列出全部标注国家。
 * 所点国家不在角色数据集时（unknownName 非空），指标区显示空状态提示，
 * 不回退展示任何其他国家的数据。
 */
export default function ResourceRolePanel({ detail, roles, selectedCode, unknownName, onSelect, onClose }: Props) {
  const notes = detail.roleNotes;
  const unit = detail.resource.unit;
  const groups = groupByRole(roles);
  const selected = roles.find((r) => r.code === selectedCode) ?? null;
  const unknown = !selected && unknownName;

  if (!selected && !unknown) return null;

  const statCells: { label: string; value: string; hint: string; danger?: boolean }[] = selected
    ? [
        {
          label: '年产量',
          value: `${selected.annualProduction ?? '—'}`,
          hint: `${notes?.production ?? '年产量'} · ${unit}`,
        },
        {
          label: '出口比重',
          value: pct(selected.exportShare),
          hint: notes?.export ?? '出口量占本国产量比重',
        },
        {
          label: '对外依赖度',
          value: pct(selected.importDependency),
          hint: notes?.dependency ?? '净进口量占国内消费量比重',
          danger: (selected.importDependency ?? 0) >= 40,
        },
      ]
    : [];

  return (
    <aside className="overlay role-panel" aria-label="资源国家角色面板">
      <div className="role-panel-head">
        <div>
          <div className="role-panel-title">{selected ? selected.name : unknownName}</div>
          <div className="role-panel-sub">
            {selected
              ? `${detail.resource.name} · ${selected.roles.map((r) => ROLE_META[r].label).join(' / ')}`
              : `${detail.resource.name} · 暂未收录角色数据`}
          </div>
        </div>
        <button className="card-close" onClick={onClose} title="清除标注并恢复底图">
          ×
        </button>
      </div>

      {selected && (
        <div className="role-chips">
          {ROLE_PRIORITY.map((key) => (
            <span
              key={key}
              className={`role-chip ${selected.roles.includes(key) ? 'on' : ''}`}
              style={
                selected.roles.includes(key)
                  ? { color: ROLE_META[key].color, borderColor: ROLE_META[key].color }
                  : undefined
              }
            >
              <i style={{ background: ROLE_META[key].color }} />
              {ROLE_META[key].label}
            </span>
          ))}
        </div>
      )}

      {selected ? (
        <div className="role-stats">
          {statCells.map((c) => (
            <div key={c.label} className={`role-stat ${c.danger ? 'danger' : ''}`}>
              <div className="role-stat-label">{c.label}</div>
              <div className="role-stat-value">
                {c.value}
                {c.label === '年产量' && selected.annualProduction != null && (
                  <small> {unit}</small>
                )}
              </div>
              <div className="role-stat-hint" title={c.hint}>
                {c.hint}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="role-empty">
          <b>{unknownName}</b> 暂未收录进该资源的主要生产国 / 出口国 / 高依赖进口国数据集，
          年产量、出口比重与对外依赖度指标暂缺。
          {roles.length > 0 && <em>可从下方列表查看该资源已标注的三类国家。</em>}
        </div>
      )}

      <div className="role-lists">
        {ROLE_PRIORITY.map((key) =>
          groups[key].length ? (
            <div key={key} className="role-group">
              <div className="role-group-title" style={{ color: ROLE_META[key].color }}>
                <i style={{ background: ROLE_META[key].color }} />
                {ROLE_META[key].label}
                <em>{groups[key].length}</em>
              </div>
              {groups[key].map((r) => (
                <button
                  key={`${key}-${r.code}`}
                  className={`role-row ${r.code === selected?.code ? 'active' : ''}`}
                  onClick={() => onSelect(r.code)}
                >
                  <span className="role-row-name">{r.name}</span>
                  <span className="role-row-metric">
                    {key === 'producer' && (r.annualProduction != null ? `${r.annualProduction} ${unit}` : '—')}
                    {key === 'exporter' && pct(r.exportShare)}
                    {key === 'dependent' && pct(r.importDependency)}
                  </span>
                </button>
              ))}
            </div>
          ) : null
        )}
      </div>

      <div className="role-panel-foot">
        {notes?.yearLabel ?? '示例数据集'} · 点击底图空白处可清除标注
      </div>
    </aside>
  );
}
