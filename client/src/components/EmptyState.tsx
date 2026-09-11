import type { ReactNode } from 'react';

export type EmptyStateKind = 'not-found' | 'empty' | 'error';

interface Props {
  kind: EmptyStateKind;
  /** 主标题，例如「未找到该国家」 */
  title: string;
  /** 补充说明（可选） */
  description?: string | null;
  /** 自定义操作区，如“返回探索地图”/“重试” */
  actions?: ReactNode;
  /** 关联年份时展示，帮助用户理解空数据口径 */
  year?: number | null;
}

const ICONS: Record<EmptyStateKind, string> = {
  'not-found': '🔍',
  empty: '📭',
  error: '⚠️',
};

/**
 * 统一的友好空态：
 * - 不抛出任何异常、不访问可能为 undefined 的字段
 * - 404、空数据、加载错误共用一套视觉，仅图标/文案/操作不同
 */
export default function EmptyState({ kind, title, description, actions, year }: Props) {
  return (
    <div className="profile empty-state" role={kind === 'error' ? 'alert' : 'status'}>
      <div className={`empty-icon empty-icon-${kind}`} aria-hidden="true">
        {ICONS[kind]}
      </div>
      <h3 className="empty-title">{title}</h3>
      {year != null && <p className="empty-meta">当前选中年份：{year}</p>}
      {description && <p className="empty-desc">{description}</p>}
      {actions && <div className="empty-actions">{actions}</div>}
    </div>
  );
}
