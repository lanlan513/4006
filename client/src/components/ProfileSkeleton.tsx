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

      {/* 核心指标卡片（4 张） */}
      <div className="module-head" aria-hidden="true">
        <Skeleton width={96} height={16} />
        <Skeleton width={110} height={11} />
      </div>
      <div className="metric-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div className="metric-card" key={i}>
            <Skeleton width={72} height={11} />
            <Skeleton width={104} height={24} style={{ marginTop: 9 }} />
            <Skeleton width={86} height={19} radius={10} style={{ marginTop: 9 }} />
          </div>
        ))}
      </div>

      {/* 全球位置面板 */}
      <div className="position-section" style={{ marginTop: 22 }} aria-hidden="true">
        <div className="module-head">
          <Skeleton width={200} height={16} />
        </div>
        <div className="position-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <div className="position-item" key={i}>
              <div className="position-item-head">
                <Skeleton width={72} height={72} radius="50%" />
                <div style={{ flex: 1 }}>
                  <Skeleton width={64} height={13} />
                  <Skeleton width={100} height={14} style={{ marginTop: 7 }} />
                  <Skeleton width={80} height={11} style={{ marginTop: 6 }} />
                </div>
              </div>
              <Skeleton width="100%" height={7} radius={4} style={{ marginTop: 12 }} />
              <Skeleton width={150} height={10} style={{ marginTop: 8 }} />
            </div>
          ))}
        </div>
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
