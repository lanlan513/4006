import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import WorldMap, { STAGE_COLORS, stageColor } from '../components/WorldMap';
import ChainFlow from '../components/ChainFlow';
import { api, ChainBrief, ChainDetail, CountryListItem } from '../api';
import { useAtlas } from '../store';

export default function ChainPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // 从产业链节点进入画像时携带全局年份，画像页深链与地址栏口径一致
  const year = useAtlas((s) => s.year);
  const openCountry = (code: string) => navigate(`/country/${code}?year=${year}`);
  const [chains, setChains] = useState<ChainBrief[]>([]);
  const [detail, setDetail] = useState<ChainDetail | null>(null);
  const [countries, setCountries] = useState<CountryListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([api.chains(), api.meta()])
      .then(([chainResult, meta]) => {
        if (!alive) return undefined;
        setChains(chainResult.chains);
        const nextYear = meta.years[meta.years.length - 1] ?? 2023;
        return api.countries(nextYear);
      })
      .then((countryResult) => {
        if (alive && countryResult) setCountries(countryResult.countries);
      })
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setDetail(null);
    setError(null);
    api.chain(id)
      .then((result) => alive && setDetail(result))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [id]);

  if (!id) return null;

  return (
    <div className="page">
      <div className="chain-page">
        <Link to={`/?year=${year}`} className="back-link">
          ← 返回探索地图
        </Link>

        {/* 商品切换 */}
        <div className="chain-tabs">
          {chains.map((c) => (
            <Link
              key={c.id}
              to={`/chain/${c.id}`}
              className={`chain-tab ${c.id === id ? 'active' : ''}`}
            >
              {c.name}
            </Link>
          ))}
        </div>

        {!detail ? (
          <div className="empty-hint" role={error ? 'alert' : undefined}>
            <p>{error ? '产业链加载失败' : '正在加载产业链…'}</p>
            {error && <p className="error-detail">{error}</p>}
            {error && (
              <Link to="/" className="btn-ghost error-back">
                返回探索地图
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="chain-head">
              <h2>{detail.chain.name}</h2>
              <div className="chain-sub">{detail.chain.subtitle}</div>
              <p className="chain-desc">{detail.chain.description}</p>
            </div>

            {/* 阶段流程图 */}
            <ChainFlow chain={detail} onNodeClick={openCountry} />

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
                  chain={{ stages: detail.chain.stages, nodes: detail.nodes, edges: detail.edges }}
                  onNodeClick={openCountry}
                />
              </div>
              <div className="stage-legend">
                {detail.chain.stages.map((s, i) => (
                  <span key={s.key}>
                    <i style={{ background: STAGE_COLORS[i] ?? stageColor(detail.chain.stages, s.key) }} />
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
