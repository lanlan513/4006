import { useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useIndustry } from '../industry/industryStore';

/**
 * /chain 入口：从产业目录取第一条产业并重定向。
 * 默认产业完全由数据决定，UI 不硬编码任何产业 ID ——
 * 目录为空时降级为空状态，而不是跳转到某个写死的产业。
 */
export default function ChainIndex() {
  const { catalog, catalogStatus, catalogError, loadCatalog } = useIndustry();

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  if (catalogStatus === 'ready') {
    const first = catalog[0];
    if (first) return <Navigate to={`/chain/${first.id}`} replace />;
    return (
      <div className="page">
        <div className="empty-hint">
          <p>暂未收录任何产业链数据。</p>
          <Link to="/" className="btn-ghost error-back">
            返回探索地图
          </Link>
        </div>
      </div>
    );
  }

  if (catalogStatus === 'error') {
    return (
      <div className="page">
        <div className="empty-hint" role="alert">
          <p>产业目录加载失败</p>
          {catalogError && <p className="error-detail">{catalogError}</p>}
          <button className="btn-ghost error-back" onClick={() => loadCatalog()}>
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="empty-hint">
        <p>正在加载产业目录…</p>
      </div>
    </div>
  );
}
