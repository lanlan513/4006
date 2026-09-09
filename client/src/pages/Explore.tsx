import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import WorldMap, { RAMP, metricValue } from '../components/WorldMap';
import Timeline from '../components/Timeline';
import CountryCard from '../components/CountryCard';
import { api, CountryListItem, TradeFlow } from '../api';
import { useAtlas, METRICS } from '../store';
import { fmtDollars } from '../format';

export default function Explore() {
  const { year, setYear, selected, setSelected, networkOn, toggleNetwork, metric, setMetric } = useAtlas();
  const [years, setYears] = useState<number[]>([2000, 2005, 2010, 2015, 2020, 2023]);
  const [countries, setCountries] = useState<CountryListItem[]>([]);
  const [flows, setFlows] = useState<TradeFlow[]>([]);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    api.meta().then((m) => setYears(m.years));
  }, []);

  useEffect(() => {
    let alive = true;
    api.countries(year).then((r) => alive && setCountries(r.countries));
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
    api.trade(year, selected).then((r) => alive && setFlows(r.flows));
    return () => {
      alive = false;
    };
  }, [networkOn, year, selected]);

  // 支持 /?c=CODE 从画像页回到地图并定位
  useEffect(() => {
    const c = searchParams.get('c');
    if (c) setSelected(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      legendMin: metric === 'gdpGrowth' ? null : Math.min(...vals),
      legendMax: metric === 'gdpGrowth' ? null : Math.max(...vals),
    };
  }, [countries, metric]);

  return (
    <div className="page">
      <div className="explore-layout">
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

        <Timeline years={years} value={year} onChange={setYear} globalGdp={globalGdp} />
      </div>
    </div>
  );
}
