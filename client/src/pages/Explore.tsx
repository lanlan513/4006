import { useEffect, useMemo, useState } from 'react';
import WorldMap, { RAMP, metricValue } from '../components/WorldMap';
import Timeline from '../components/Timeline';
import CountryCard from '../components/CountryCard';
import { api, CountryListItem, TradeFlow } from '../api';
import { useAtlas, METRICS } from '../store';
import { useExploreRoute } from '../hooks/useExploreRoute';
import { fmtDollars } from '../format';

export default function Explore() {
  const { year, setYear, selected, setSelected, networkOn, toggleNetwork, metric, setMetric } = useAtlas();
  const [years, setYears] = useState<number[]>([2000, 2005, 2010, 2015, 2020, 2023]);
  const [countries, setCountries] = useState<CountryListItem[]>([]);
  const [flows, setFlows] = useState<TradeFlow[]>([]);
  const [error, setError] = useState<string | null>(null);

  // URL ↔ 全局状态双向同步（?year= / ?c=），支持带参跳转与浏览器前进后退还原
  const { years: routeYears, focusCode, changeYear } = useExploreRoute();

  useEffect(() => {
    setYears(routeYears);
  }, [routeYears]);

  useEffect(() => {
    api.meta().then((m) => {
      setYears(m.years);
      if (!m.years.includes(year) && m.years.length > 0) setYear(m.years[m.years.length - 1]);
    }).catch((e: Error) => setError(e.message));
  }, [setYear]);

  useEffect(() => {
    let alive = true;
    setError(null);
    api.countries(year)
      .then((r) => alive && setCountries(r.countries))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [year]);

  useEffect(() => {
    if (!networkOn) {
      setFlows([]);
      return;
    }
    let alive = true;
    api.trade(year, selected)
      .then((r) => alive && setFlows(r.flows))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [networkOn, year, selected]);

  // 支持 /?c=CODE 从画像页 / 对比页回到地图并定位高亮（含前进后退还原）
  useEffect(() => {
    if (focusCode) setSelected(focusCode.toUpperCase());
  }, [focusCode, setSelected]);

  const selectedCountry = useMemo(
    () => countries.find((c) => c.code === selected) ?? null,
    [countries, selected]
  );

  const globalGdp = useMemo(
    () => countries.reduce((s, c) => s + (c.gdp ?? 0), 0),
    [countries]
  );

  const { legendMin, legendMax } = useMemo(() => {
    const vals = countries
      .map((c) => metricValue(c, metric))
      .filter((v): v is number => v != null);
    return {
      legendMin: metric === 'gdpGrowth' || vals.length === 0 ? null : Math.min(...vals),
      legendMax: metric === 'gdpGrowth' || vals.length === 0 ? null : Math.max(...vals),
    };
  }, [countries, metric]);

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
        <WorldMap
          countries={countries}
          metric={metric}
          selected={selected}
          onSelect={setSelected}
          flows={networkOn ? flows : null}
          networkOn={networkOn}
        />

        {/* 控制面板 */}
        <div className="overlay controls-panel">
          <div className="controls-title">地图着色指标</div>
          <div className="segmented">
            {METRICS.map((m) => (
              <button
                key={m.key}
                className={`seg-btn ${metric === m.key ? 'active' : ''}`}
                onClick={() => setMetric(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="network-toggle">
            <div>
              <span>全球贸易网络</span>
              <small>{networkOn && selected ? `仅显示与${selectedCountry?.name ?? ''}相关的贸易流` : '动态连线展示主要贸易通道'}</small>
            </div>
            <button
              className={`switch ${networkOn ? 'on' : ''}`}
              onClick={() => toggleNetwork()}
              title="切换贸易网络视图"
            />
          </div>

          {/* 图例 */}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <div className="controls-title" style={{ marginBottom: 4 }}>
              {METRICS.find((m) => m.key === metric)?.label}
            </div>
            {metric === 'gdpGrowth' ? (
              <div className="ramp">
                {['#c06a58', '#2b3a4a', '#38596f', '#4e8571', '#7fb069'].map((c) => (
                  <i key={c} style={{ background: c }} />
                ))}
              </div>
            ) : (
              <div className="ramp">
                {RAMP.map((c) => (
                  <i key={c} style={{ background: c }} />
                ))}
              </div>
            )}
            <div className="legend-labels">
              {metric === 'gdpGrowth' ? (
                <span>衰退 ←→ 高增长</span>
              ) : (
                <>
                  <span>{fmtDollars(legendMin)}</span>
                  <span>{fmtDollars(legendMax)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 国家卡片 */}
        {selectedCountry && (
          <CountryCard
            country={selectedCountry}
            year={year}
            onClose={() => setSelected(null)}
            onFocusNetwork={() => toggleNetwork(true)}
          />
        )}

        <Timeline
          years={years}
          value={year}
          onChange={(y, source) => changeYear(y, source === 'user' ? 'push' : 'replace')}
          globalGdp={globalGdp}
        />
      </div>
    </div>
  );
}
