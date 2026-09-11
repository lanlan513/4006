/**
 * 贸易网络页：Leaflet + Canvas 的全球贸易流向视图。
 * 数据流：/api/geo/country-centroids（GeoJSON 中心点）
 *        + /api/trade（含类别）→ 邻接表 → Canvas 渲染。
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import TradeNetworkMap from '../components/TradeNetworkMap';
import Timeline from '../components/Timeline';
import { api, type CountryCentroidsGeoJSON, type TradeFlow } from '../api';
import {
  buildTradeTopology,
  categoryColor,
} from '../lib/tradeTopology';
import { useAtlas } from '../store';
import { fmtTradeB } from '../format';

interface PartnerStat {
  code: string;
  out: number; // 选中国 → 伙伴
  inn: number; // 伙伴 → 选中国
}

export default function NetworkPage() {
  const { year, setYear, selected, setSelected } = useAtlas();
  const [years, setYears] = useState<number[]>([2000, 2005, 2010, 2015, 2020, 2023]);
  const [centroids, setCentroids] = useState<CountryCentroidsGeoJSON | null>(null);
  const [flows, setFlows] = useState<TradeFlow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .meta()
      .then((m) => {
        setYears(m.years);
        if (!m.years.includes(year) && m.years.length > 0) setYear(m.years[m.years.length - 1]);
      })
      .catch((e: Error) => setError(e.message));
  }, [setYear]);

  useEffect(() => {
    let alive = true;
    api
      .countryCentroids()
      .then((g) => alive && setCentroids(g))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    setError(null);
    api
      .trade(year)
      .then((r) => alive && setFlows(r.flows))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [year]);

  /* 后端贸易流 → {source, target, volume, category} 邻接表 */
  const topology = useMemo(() => buildTradeTopology(flows), [flows]);

  const nameOf = useMemo(() => {
    const m = new Map<string, string>();
    centroids?.features.forEach((f) => m.set(f.properties.code, f.properties.name));
    return m;
  }, [centroids]);

  /* 图例：当前数据中实际出现的类别 */
  const usedCategories = useMemo(() => {
    const seen = new Map<string, number>();
    for (const e of topology.edges) seen.set(e.category, (seen.get(e.category) ?? 0) + e.volume);
    return [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [topology]);

  /* 选中国家的聚焦信息：出/进口总额 + 直接伙伴 */
  const focus = useMemo(() => {
    if (!selected) return null;
    const node = topology.nodes.get(selected);
    if (!node) return null;
    const byPartner = new Map<string, PartnerStat>();
    for (const e of topology.adjacency.get(selected) ?? []) {
      const other = e.source === selected ? e.target : e.source;
      let s = byPartner.get(other);
      if (!s) {
        s = { code: other, out: 0, inn: 0 };
        byPartner.set(other, s);
      }
      if (e.source === selected) s.out += e.volume;
      else s.inn += e.volume;
    }
    const partners = [...byPartner.values()].sort((a, b) => b.out + b.inn - (a.out + a.inn));
    return { node, partners };
  }, [topology, selected]);

  return (
    <div className="page">
      <div className="explore-layout">
        {error && (
          <div className="overlay page-error" role="alert">
            <strong>数据加载失败</strong>
            <span>{error}</span>
            <button className="btn-ghost" onClick={() => window.location.reload()}>
              重新加载
            </button>
          </div>
        )}

        <TradeNetworkMap
          centroids={centroids}
          topology={topology}
          selected={selected}
          onSelect={setSelected}
        />

        {/* 图例与操作说明 */}
        <div className="overlay controls-panel network-panel">
          <div className="controls-title">贸易网络 · {year}</div>
          <p className="network-hint">
            节点大小 ∝ 双边贸易总额；连线为主要贸易流（三阶贝塞尔曲线），颜色 = 主导商品类别。
            点击国家节点聚焦其直接贸易伙伴，再次点击或点空白处还原。
          </p>
          <div className="cat-legend">
            {usedCategories.map((c) => (
              <span key={c} className="cat-item">
                <i style={{ background: categoryColor(c) }} />
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* 选中国家聚焦卡 */}
        {focus && selected && (
          <div className="overlay country-card network-focus">
            <button className="card-close" onClick={() => setSelected(null)} title="关闭">
              ✕
            </button>
            <span className="card-region">{selected}</span>
            <div className="card-name">{nameOf.get(selected) ?? selected}</div>
            <div className="card-year">
              {year} 年 · 直接贸易伙伴 {focus.partners.length} 个
            </div>
            <div className="stat-grid">
              <div className="stat-cell">
                <div className="stat-label">出口总额</div>
                <div className="stat-value">{fmtTradeB(focus.node.outVolume)}</div>
              </div>
              <div className="stat-cell">
                <div className="stat-label">进口总额</div>
                <div className="stat-value">{fmtTradeB(focus.node.inVolume)}</div>
              </div>
            </div>

            <div className="section-title">主要贸易伙伴</div>
            {focus.partners.slice(0, 8).map((p) => (
              <div className="partner-row" key={p.code} onClick={() => setSelected(p.code)}>
                <span className="p2-name">{nameOf.get(p.code) ?? p.code}</span>
                <span className="p2-flows">
                  {p.out > 0 && `出 ${fmtTradeB(p.out)}`}
                  {p.out > 0 && p.inn > 0 && ' · '}
                  {p.inn > 0 && `进 ${fmtTradeB(p.inn)}`}
                </span>
                <span className="p-share">{fmtTradeB(p.out + p.inn)}</span>
              </div>
            ))}

            <div className="card-actions">
              <Link to={`/country/${selected}`} className="btn-primary">
                进入经济画像 <span className="arrow">→</span>
              </Link>
            </div>
          </div>
        )}

        <Timeline years={years} value={year} onChange={setYear} />
      </div>
    </div>
  );
}
