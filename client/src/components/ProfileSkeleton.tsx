import { Skeleton } from './Skeleton';

/**
 * 国家经济画像页骨架屏：
 * 结构与真实页面（头部 / KPI 行 / 图表卡片 / 列表卡片）对齐，
 * 数据加载完成后整体替换，避免布局跳动。
 */
export default function ProfileSkeleton() {
  return (
    <div className="profile" aria-busy="true" aria-live="polite" aria-label="正在加载国家经济画像">
      <Skeleton width={120} height={12} style={{ marginBottom: 22 }} />

      <div className="profile-head">
        <div>
          <Skeleton width={220} height={34} radius={8} />
          <Skeleton width={180} height={12} style={{ marginTop: 10 }} />
        </div>
      </div>

      <div className="profile-kpis">
        {Array.from({ length: 6 }).map((_, i) => (
          <div className="kpi skeleton-kpi" key={i}>
            <Skeleton width={64} height={10} />
            <Skeleton width={92} height={22} style={{ marginTop: 10 }} />
            <Skeleton width={48} height={9} style={{ marginTop: 8 }} />
          </div>
        ))}
      </div>

      <div className="skeleton-section-title">
        <Skeleton width={150} height={11} />
      </div>
      <div className="chart-grid">
        {[0, 1].map((i) => (
          <div className="chart-card" key={i}>
            <Skeleton width={120} height={13} />
            <Skeleton width={200} height={10} style={{ marginTop: 6 }} />
            <Skeleton width="100%" height={232} radius={8} style={{ marginTop: 12 }} />
          </div>
        ))}
      </div>

      <div className="skeleton-section-title">
        <Skeleton width={130} height={11} />
      </div>
      <div className="two-col">
        {[0, 1].map((col) => (
          <div className="list-card" key={col}>
            <Skeleton width={160} height={13} style={{ marginBottom: 14 }} />
            {Array.from({ length: 6 }).map((_, i) => (
              <div className="skeleton-row" key={i}>
                <Skeleton width={90} height={11} />
                <Skeleton className="skeleton-bar" height={6} radius={3} />
                <Skeleton width={36} height={10} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
