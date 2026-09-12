import { Link, useNavigate } from 'react-router-dom';
import EChart, { darkTooltip, axisStyle, splitLine } from '../components/EChart';
import ProfileSkeleton from '../components/ProfileSkeleton';
import EmptyState from '../components/EmptyState';
import MetricCards from '../components/MetricCards';
import GlobalPosition from '../components/GlobalPosition';
import TrendCharts from '../components/TrendCharts';
import { regionName } from '../api';
import type { CountryProfile as ProfileData } from '../schemas';
import { useCountryProfile } from '../hooks/useCountryProfile';
import { useCountryRoute } from '../hooks/useCountryRoute';
import { fmtCompact, fmtTradeB } from '../format';

/** 用户请求了未收录年份时的统一提示（加载 / 空态 / 成功各分支均可见） */
function YearNotice({ correction }: { correction: { requested: number; actual: number } | null }) {
  if (!correction) return null;
  return (
    <div className="year-notice-wrap">
      <div className="year-notice" role="status">
        系统暂未收录 <b>{correction.requested}</b> 年数据，已为你展示时间轴上最近的{' '}
        <b>{correction.actual}</b> 年经济画像。
      </div>
    </div>
  );
}

/** 画像主体：仅在数据完整（summary 非空）时渲染，所有字段访问均为空值安全 */
function ProfileContent({ data, onOpenCountry }: {
  data: ProfileData;
  onOpenCountry: (code: string) => void;
}) {
  const { country, timeseries, summary, products, partners, chains, latestYear, productsYear } = data;
  if (!summary) return null; // 由上层 empty 分支兜底，理论上不会进入

  // 页面一切年份文案以接口实际返回的 data.year 为准（正常情况下与归一化入参相同），
  // 杜绝“标题年份 ≠ 数据年份”的错位
  const viewYear = data.year;

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
          itemStyle: {
            color: (t.gdpGrowth ?? 0) >= 0 ? '#4e8571' : '#c06a58',
            borderRadius: [3, 3, 0, 0],
          },
        })),
        barMaxWidth: 22,
      },
    ],
  };

  const productTitleSuffix = productsYear && productsYear !== viewYear ? `（${productsYear} 年结构）` : '';

  return (
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
            {viewYear} 年经济画像{viewYear !== latestYear ? `（最新数据截至 ${latestYear} 年）` : ''}
          </div>
        </div>
      </div>

      {/* 核心指标卡片：GDP / 人口 / 贸易规模 / 人均 GDP（含同比变化率，缺失统一显示 --） */}
      <MetricCards summary={summary} yoy={data.yoy} />

      {/* 全球位置：GDP / 人口 / 出口额的全球排名与占比（环形图 + 进度条） */}
      <GlobalPosition data={data.globalPosition} />

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

      {/* 近年变化趋势：GDP 增长率 / 人口变化 / 进出口贸易额（近 10 年，数据不足自动降级为文本） */}
      <TrendCharts timeseries={timeseries} />

      <div className="section-title">主要贸易商品{productTitleSuffix}</div>
      <div className="two-col">
        <div className="list-card">
          <h4>主要出口商品（占出口比）</h4>
          {exports.length === 0 ? (
            <p className="card-empty">暂无出口商品结构数据。</p>
          ) : (
            exports.map((p) => (
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
            ))
          )}
        </div>
        <div className="list-card">
          <h4>主要进口商品（占进口比）</h4>
          {imports.length === 0 ? (
            <p className="card-empty">暂无进口商品结构数据。</p>
          ) : (
            imports.map((p) => (
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
            ))
          )}
        </div>
      </div>

      <div className="section-title">主要贸易伙伴（{viewYear} 年）</div>
      <div className="two-col">
        <div className="list-card">
          <h4>出口目的地 · 点击进入伙伴国画像</h4>
          {partners.exportPartners.length === 0 ? (
            <p className="card-empty">{viewYear} 年暂无出口伙伴数据。</p>
          ) : (
            partners.exportPartners.map((p) => (
              <div className="partner-row" key={p.code} onClick={() => onOpenCountry(p.code)}>
                <span className="p2-name">{p.name}</span>
                <div className="p-bar">
                  <i style={{ width: `${(p.value / maxTrade) * 100}%` }} />
                </div>
                <span className="p-share">{fmtTradeB(p.value)}</span>
              </div>
            ))
          )}
        </div>
        <div className="list-card">
          <h4>进口来源地 · 点击进入伙伴国画像</h4>
          {partners.importPartners.length === 0 ? (
            <p className="card-empty">{viewYear} 年暂无进口伙伴数据。</p>
          ) : (
            partners.importPartners.map((p) => (
              <div className="partner-row im" key={p.code} onClick={() => onOpenCountry(p.code)}>
                <span className="p2-name">{p.name}</span>
                <div className="p-bar">
                  <i style={{ width: `${(p.value / maxTrade) * 100}%` }} />
                </div>
                <span className="p-share">{fmtTradeB(p.value)}</span>
              </div>
            ))
          )}
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
  );
}

export default function CountryProfile() {
  const navigate = useNavigate();

  // 统一解析 URL 参数与全局状态：返回当前 countryCode、唯一生效年份及年份纠正信息
  const { countryCode, year, correction } = useCountryRoute();

  // 统一数据流：countryCode / year 任一变化都会重新请求 /api/country-profile
  const { status, data, errorMessage, retry } = useCountryProfile(countryCode, year);

  const openCountry = (next: string) => navigate(`/country/${next}?year=${year}`);

  const backToMap = (
    <Link to={`/?c=${countryCode ?? ''}`} className="btn-ghost error-back">
      返回探索地图
    </Link>
  );

  /* ---------- 缺少有效 countryCode（URL 参数异常）：不发请求，直接空态 ---------- */
  if (!countryCode) {
    return (
      <div className="page">
        <EmptyState
          kind="empty"
          title="缺少国家参数"
          description="未能从地址中读取国家编码，请从探索地图选择一个国家进入。"
          actions={backToMap}
        />
      </div>
    );
  }

  /* ---------- 加载中：骨架屏（年份纠正提示在加载前已计算，直接可见） ---------- */
  if (status === 'loading') {
    return (
      <div className="page">
        <YearNotice correction={correction} />
        <ProfileSkeleton />
      </div>
    );
  }

  /* ---------- 404：国家不存在 ---------- */
  if (status === 'not-found') {
    return (
      <div className="page">
        <YearNotice correction={correction} />
        <EmptyState
          kind="not-found"
          title="未找到该国家 / 地区"
          description={`编码 “${countryCode}” 暂无收录，可能是编码有误或数据尚未覆盖。`}
          year={year}
          actions={backToMap}
        />
      </div>
    );
  }

  /* ---------- 加载错误：网络 / 服务 / 数据结构异常，不抛出到页面 ---------- */
  if (status === 'error' || !data) {
    return (
      <div className="page">
        <YearNotice correction={correction} />
        <EmptyState
          kind="error"
          title="经济画像加载失败"
          description={errorMessage ?? '数据服务暂时不可用，请稍后重试。'}
          year={year}
          actions={
            <>
              <button type="button" className="btn-ghost error-back" onClick={retry}>
                重新加载
              </button>
              {backToMap}
            </>
          }
        />
      </div>
    );
  }

  /* ---------- 空数据：国家存在但该年份没有指标 ---------- */
  if (status === 'empty' || !data.summary) {
    return (
      <div className="page">
        <YearNotice correction={correction} />
        <EmptyState
          kind="empty"
          title={`${data.country.name} 在 ${year} 年暂无经济数据`}
          description={errorMessage ?? '该年度尚未收录 GDP、人口或贸易总额等核心指标，可切换其他年份查看。'}
          year={year}
          actions={backToMap}
        />
      </div>
    );
  }

  /* ---------- 成功 ---------- */
  return (
    <div className="page">
      <YearNotice correction={correction} />
      <ProfileContent data={data} onOpenCountry={openCountry} />
    </div>
  );
}
