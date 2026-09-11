import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import WorldMap, { STAGE_COLORS, stageColor } from '../components/WorldMap';
import ChainFlow from '../components/ChainFlow';
import { api, CountryListItem } from '../api';
import { useIndustry } from '../industry/industryStore';

export default function ChainPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    catalog,
    catalogStatus,
    catalogError,
    loadCatalog,
    chain,
    status,
    error,
    selectIndustry,
    clearIndustry,
  } = useIndustry();
  const [countries, setCountries] = useState<CountryListItem[]>([]);

  // 产业目录：切换器的唯一数据源
  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // 国家底图数据（仅作地图背景；失败不阻塞产业链展示）
  useEffect(() => {
    let alive = true;
    api
      .meta()
      .then((meta) => api.countries(meta.years[meta.years.length - 1] ?? 2023))
      .then((r) => {
        if (alive) setCountries(r.countries);
      })
      .catch((e: Error) => console.warn('[chain] 国家底图数据加载失败', e.message));
    return () => {
      alive = false;
    };
  }, []);

  // 产业切换：路由参数即产业 ID，由状态层动态载入对应数据
  useEffect(() => {
    if (id) selectIndustry(id);
    return () => clearIndustry();
  }, [id, selectIndustry, clearIndustry]);

  if (!id) return null;

  return (
    <div className="page">
      <div className="chain-page">
        <Link to="/" className="back-link">
          ← 返回探索地图
        </Link>

        {/* 产业切换器：完全由目录数据驱动，不硬编码任何产业 */}
        {catalogStatus === 'error' ? (
          <div className="empty-hint" role="alert">
            <p>产业目录加载失败</p>
            {catalogError && <p className="error-detail">{catalogError}</p>}
            <button className="btn-ghost error-back" onClick={() => loadCatalog()}>
              重试
            </button>
          </div>
        ) : (
          catalog.length > 0 && (
            <div className="chain-tabs">
              {catalog.map((c) => (
                <Link
                  key={c.id}
                  to={`/chain/${c.id}`}
                  className={`chain-tab ${c.id === id ? 'active' : ''}`}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )
        )}

        {status === 'idle' || status === 'loading' ? (
          <div className="empty-hint">
            <p>正在加载产业链…</p>
          </div>
        ) : status === 'error' ? (
          <div className="empty-hint" role="alert">
            <p>产业链加载失败</p>
            {error && <p className="error-detail">{error}</p>}
            <button className="btn-ghost error-back" onClick={() => selectIndustry(id)}>
              重试
            </button>
            <Link to="/" className="btn-ghost error-back">
              返回探索地图
            </Link>
          </div>
        ) : status === 'empty' || !chain ? (
          /* 空态降级：产业已注册但数据为空，展示空状态而非渲染图表或抛异常 */
          <div className="empty-hint">
            <p>
              {chain?.name ? `「${chain.name}」` : '该产业'}
              的产业链数据正在整理中，暂无环节与流向数据。
            </p>
            <Link to="/" className="btn-ghost error-back">
              返回探索地图
            </Link>
          </div>
        ) : (
          <>
            <div className="chain-head">
              <h2>{chain.name}</h2>
              <div className="chain-sub">{chain.subtitle}</div>
              <p className="chain-desc">{chain.description}</p>
            </div>

            {/* 阶段流程图 */}
            <ChainFlow chain={chain} onNodeClick={(code) => navigate(`/country/${code}`)} />

            {/* 地图分布 */}
            <div className="chain-map-card">
              <h4>地理分布 · 产业链如何被放在地球上</h4>
              <p>彩色节点为各环节国家，连线表示跨阶段的货物流；点击节点可进入该国经济画像</p>
              <div className="chain-map-box">
                <WorldMap
                  countries={countries}
                  metric="gdp"
                  selected={null}
                  onSelect={() => {}}
                  chain={chain}
                  onNodeClick={(code) => navigate(`/country/${code}`)}
                />
              </div>
              <div className="stage-legend">
                {chain.segments.map((s, i) => (
                  <span key={s.key}>
                    <i style={{ background: STAGE_COLORS[i] ?? stageColor(chain.segments, s.key) }} />
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
