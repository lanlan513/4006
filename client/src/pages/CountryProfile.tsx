import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import EChart, { darkTooltip, axisStyle, splitLine } from '../components/EChart';
import { api, CountryDetail, regionName } from '../api';
import { fmtDollars, fmtGrowth, fmtPopulation, fmtCompact, fmtTradeB } from '../format';

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

export default function CountryProfile() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<CountryDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError(null);
    if (code) {
      api.country(code)
        .then((result) => alive && setData(result))
        .catch((e: Error) => alive && setError(e.message));
    }
    return () => {
      alive = false;
    };
  }, [code]);

  if (!data) {
    return (
      <div className="profile empty-hint" role={error ? 'alert' : undefined}>
        <p>{error ? '经济画像加载失败' : '正在加载经济画像…'}</p>
        {error && <p className="error-detail">{error}</p>}
        {error && (
          <Link to="/" className="btn-ghost error-back">
            返回探索地图
          </Link>
        )}
      </div>
    );
  }

  const { country, timeseries, products, partners, chains, latestYear } = data;
  const latest = timeseries[timeseries.length - 1];
  if (!latest) {
    return (
      <div className="profile empty-hint" role="alert">
        <p>该国家暂无年度指标数据。</p>
        <Link to="/" className="btn-ghost error-back">
          返回探索地图
        </Link>
      </div>
    );
  }
  const years = timeseries.map((t) => t.year);
  const exports = products.filter((p) => p.flowType === 'ex');
  const imports = products.filter((p) => p.flowType === 'im');
  const maxTrade = Math.max(
    ...partners.exportPartners.map((p) => p.value),
    ...partners.importPartners.map((p) => p.value),
    1
  );

  const gdpOption = {
    tooltip: { trigger: 'axis', ...darkTooltip, valueFormatter: (v: unknown) => `$${fmtCompact(Number(v))}` },
    grid: { left: 52, right: 18, top: 18, bottom: 30 },
    xAxis: { type: 'category', data: years, ...axisStyle },
    yAxis: {
      type: 'value',
      ...axisStyle,
      splitLine,
      axisLabel: { ...axisStyle.axisLabel, formatter: (v: number) => `$${fmtCompact(v)}` },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        symbolSize: 7,
        data: timeseries.map((t) => t.gdp),
        lineStyle: { color: '#e0a94f', width: 2.5 },
        itemStyle: { color: '#e0a94f' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(224,169,79,0.28)' },
              { offset: 1, color: 'rgba(224,169,79,0.01)' },
            ],
          },
        },
      },
    ],
  };

  const tradeOption = {
    tooltip: { trigger: 'axis', ...darkTooltip, valueFormatter: (v: unknown) => `$${fmtCompact(Number(v))}` },
    legend: { data: ['出口', '进口'], textStyle: { color: '#8b97a9' }, top: 0, right: 0 },
    grid: { left: 52, right: 18, top: 34, bottom: 30 },
    xAxis: { type: 'category', data: years, ...axisStyle },
    yAxis: {
      type: 'value',
      ...axisStyle,
      splitLine,
      axisLabel: { ...axisStyle.axisLabel, formatter: (v: number) => `$${fmtCompact(v)}` },
    },
    series: [
      {
        name: '出口',
        type: 'bar',
        data: timeseries.map((t) => t.exports),
        itemStyle: { color: '#57a9c9', borderRadius: [3, 3, 0, 0] },
        barMaxWidth: 16,
      },
      {
        name: '进口',
        type: 'bar',
        data: timeseries.map((t) => t.imports),
        itemStyle: { color: 'rgba(208,122,110,0.75)', borderRadius: [3, 3, 0, 0] },
        barMaxWidth: 16,
      },
    ],
  };

  const growthOption = {
    tooltip: { trigger: 'axis', ...darkTooltip, valueFormatter: (v: unknown) => `${Number(v).toFixed(1)}%` },
    grid: { left: 44, right: 18, top: 18, bottom: 30 },
    xAxis: { type: 'category', data: years, ...axisStyle },
    yAxis: { type: 'value', ...axisStyle, splitLine, axisLabel: { ...axisStyle.axisLabel, formatter: '{value}%' } },
    series: [
      {
        type: 'bar',
        data: timeseries.map((t) => ({
          value: t.gdpGrowth,
          itemStyle: { color: t.gdpGrowth >= 0 ? '#4e8571' : '#c06a58', borderRadius: [3, 3, 0, 0] },
        })),
        barMaxWidth: 22,
      },
    ],
  };

  return (
    <div className="page">
      <div className="profile">
        <Link to={`/?c=${country.code}`} className="back-link">
          ← 返回探索地图
        </Link>

        <div className="profile-head">
          <div>
            <div className="profile-name">{country.name}</div>
            <div className="profile-tag">
              {regionName(country.region)}
              <span className="dot">·</span>
              数据截至 {latestYear} 年
            </div>
          </div>
        </div>

        <div className="profile-kpis">
          <Kpi label="名义 GDP" value={fmtDollars(latest.gdp)} sub={`增速 ${fmtGrowth(latest.gdpGrowth)}`} />
          <Kpi label="人均 GDP" value={fmtDollars(latest.gdpPerCapita)} />
          <Kpi label="人口" value={fmtPopulation(latest.population)} />
          <Kpi label="货物出口" value={fmtDollars(latest.exports)} />
          <Kpi label="货物进口" value={fmtDollars(latest.imports)} />
          <Kpi
            label="贸易总额"
            value={fmtDollars(latest.exports + latest.imports)}
            sub={latest.exports > latest.imports ? '贸易顺差' : '贸易逆差'}
          />
        </div>

        <div className="section-title">在全球经济中的轨迹</div>
        <div className="chart-grid">
          <div className="chart-card">
            <h4>GDP 变化</h4>
            <p>名义 GDP，现价美元 · {years[0]}–{years[years.length - 1]}</p>
            <EChart option={gdpOption} />
          </div>
          <div className="chart-card">
            <h4>出口与进口</h4>
            <p>货物贸易额，美元 · 时间轴同口径</p>
            <EChart option={tradeOption} />
          </div>
        </div>

        <div className="section-title">主要贸易商品</div>
        <div className="two-col">
          <div className="list-card">
            <h4>主要出口商品（占出口比）</h4>
            {exports.map((p) => (
              <div className="product-row" key={p.productCode}>
                <span className="p-name">{p.productName}</span>
                <div className="p-bar">
                  <i style={{ width: `${Math.min(100, p.share * 2.2)}%` }} />
                </div>
                <span className="p-share">{p.share}%</span>
                {p.chainId && (
                  <Link to={`/chain/${p.chainId}`} className="chain-chip" title="查看该商品的全球产业链">
                    产业链
                  </Link>
                )}
              </div>
            ))}
          </div>
          <div className="list-card">
            <h4>主要进口商品（占进口比）</h4>
            {imports.map((p) => (
              <div className="product-row im" key={p.productCode}>
                <span className="p-name">{p.productName}</span>
                <div className="p-bar">
                  <i style={{ width: `${Math.min(100, p.share * 2.2)}%` }} />
                </div>
                <span className="p-share">{p.share}%</span>
                {p.chainId && (
                  <Link to={`/chain/${p.chainId}`} className="chain-chip" title="查看该商品的全球产业链">
                    产业链
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="section-title">主要贸易伙伴（{latestYear} 年）</div>
        <div className="two-col">
          <div className="list-card">
            <h4>出口目的地 · 点击进入伙伴国画像</h4>
            {partners.exportPartners.map((p) => (
              <div className="partner-row" key={p.code} onClick={() => navigate(`/country/${p.code}`)}>
                <span className="p2-name">{p.name}</span>
                <div className="p-bar">
                  <i style={{ width: `${(p.value / maxTrade) * 100}%` }} />
                </div>
                <span className="p-share">{fmtTradeB(p.value)}</span>
              </div>
            ))}
          </div>
          <div className="list-card">
            <h4>进口来源地 · 点击进入伙伴国画像</h4>
            {partners.importPartners.map((p) => (
              <div className="partner-row im" key={p.code} onClick={() => navigate(`/country/${p.code}`)}>
                <span className="p2-name">{p.name}</span>
                <div className="p-bar">
                  <i style={{ width: `${(p.value / maxTrade) * 100}%` }} />
                </div>
                <span className="p-share">{fmtTradeB(p.value)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-grid" style={{ marginTop: 16 }}>
          <div className="chart-card">
            <h4>实际 GDP 增速</h4>
            <p>年度实际增速 % · 感受经济周期与冲击</p>
            <EChart option={growthOption} height={220} />
          </div>
          <div className="chart-card">
            {chains.length > 0 ? (
              <>
                <h4>{country.name} 在全球产业链中的角色</h4>
                <p>点击进入产业链，查看上下游如何连接</p>
                <div className="chain-cards" style={{ marginTop: 14 }}>
                  {chains.map((ch) => (
                    <Link key={ch.id} to={`/chain/${ch.id}`} className="chain-mini">
                      <b>{ch.name}</b>
                      <p>{ch.subtitle}</p>
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h4>在全球产业链中的角色</h4>
                <p>该国暂未标注产业链节点角色。</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
