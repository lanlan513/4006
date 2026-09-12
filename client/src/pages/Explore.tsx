import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import WorldMap, { RAMP, POP_RAMP, POP_GROWTH_RAMP, metricValue } from '../components/WorldMap';
import Timeline from '../components/Timeline';
import CountryCard from '../components/CountryCard';
import SplitPanel from '../components/SplitPanel';
import { api, CountryListItem, TradeFlow } from '../api';
import { useAtlas, METRICS, POP_METRICS, isPopMetric, metricLabel } from '../store';
import { fmtMetric } from '../format';

export default function Explore() {
  const {
    year,
    setYear,
    selected,
    setSelected,
    networkOn,
    toggleNetwork,
    metric,
    setMetric,
    splitView,
    toggleSplitView,
  } = useAtlas();
  const [years, setYears] = useState<number[]>([2000, 2005, 2010, 2015, 2020, 2023]);
  const [countries, setCountries] = useState<CountryListItem[]>([]);
  const [flows, setFlows] = useState<TradeFlow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  const popMode = isPopMetric(metric);
  // 模式切换：进入人口数据模式时落到总人口，回到经济模式时落到 GDP
  const switchMode = (pop: boolean) => {
    if (pop && !popMode) setMetric('population');
    if (!pop && popMode) setMetric('gdp');
  };

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

  // 支持 /?c=CODE 从画像页回到地图并定位
  useEffect(() => {
    const c = searchParams.get('c');
    if (c) setSelected(c);
  }, [searchParams, setSelected]);

  const selectedCountry = useMemo(
    () => countries.find((c) => c.code === selected) ?? null,
    [countries, selected]
  );

  const globalGdp = useMemo(
    () => countries.reduce((s, c) => s + (c.gdp ?? 0), 0),
    [countries]
  );

  const diverging = metric === 'gdpGrowth' || metric === 'popGrowth';
  const { legendMin, legendMax } = useMemo(() => {
    if (diverging) return { legendMin: null, legendMax: null };
    const vals = countries
      .map((c) => metricValue(c, metric))
      .filter((v): v is number => v != null);
    return {
      legendMin: vals.length === 0 ? null : Math.min(...vals),
      legendMax: vals.length === 0 ? null : Math.max(...vals),
    };
  }, [countries, metric, diverging]);

  return (
    <div className="page">
      <div className={`explore-layout ${splitView ? 'split' : ''}`}>
        <div className="map-side">
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
            <div className="mode-tabs">
              <button
                className={`mode-tab ${popMode ? '' : 'active'}`}
                onClick={() => switchMode(false)}
              >
                经济指标
              </button>
              <button
                className={`mode-tab ${popMode ? 'active' : ''}`}
                onClick={() => switchMode(true)}
              >
                人口数据
              </button>
            </div>
            <div className="segmented">
              {(popMode ? POP_METRICS : METRICS).map((m) => (
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

            <div className="network-toggle">
              <div>
                <span>拆分视图</span>
                <small>左侧地图 + 右侧人口 × GDP 历史曲线</small>
              </div>
              <button
                className={`switch ${splitView ? 'on' : ''}`}
                onClick={() => toggleSplitView()}
                title="切换拆分视图"
              />
            </div>

            {/* 图例 */}
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <div className="controls-title" style={{ marginBottom: 4 }}>
                {metricLabel(metric)}
              </div>
              {metric === 'gdpGrowth' ? (
                <div className="ramp">
                  {['#c06a58', '#2b3a4a', '#38596f', '#4e8571', '#7fb069'].map((c) => (
                    <i key={c} style={{ background: c }} />
                  ))}
                </div>
              ) : metric === 'popGrowth' ? (
                <div
                  className="ramp-gradient"
                  style={{ background: `linear-gradient(to right, ${POP_GROWTH_RAMP.join(',')})` }}
                />
              ) : popMode ? (
                <div
                  className="ramp-gradient"
                  style={{ background: `linear-gradient(to right, ${POP_RAMP.join(',')})` }}
                />
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
                ) : metric === 'popGrowth' ? (
                  <span>人口收缩 ←→ 人口扩张</span>
                ) : (
                  <>
                    <span>{fmtMetric(metric, legendMin)}</span>
                    <span>{fmtMetric(metric, legendMax)}</span>
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

          <Timeline years={years} value={year} onChange={setYear} globalGdp={globalGdp} />
        </div>

        {/* 拆分视图：右侧人口 × GDP 历史曲线 */}
        {splitView && (
          <SplitPanel
            country={selectedCountry}
            year={year}
            onClose={() => toggleSplitView(false)}
          />
        )}
      </div>
    </div>
  );
}
