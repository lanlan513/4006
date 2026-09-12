import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Link } from 'react-router-dom';
import EChart, { darkTooltip, axisStyle, splitLine } from '../components/EChart';
import Timeline from '../components/Timeline';
import EmptyState from '../components/EmptyState';
import {
  api,
  ApiError,
  SchemaError,
  CountryListItem,
  regionName,
  countryProfileUrl,
  peekCached,
} from '../api';
import type { CountryProfile } from '../schemas';
import { useCompareRoute, MAX_COMPARE } from '../hooks/useCompareRoute';
import { fmtDollars, fmtPopulation, fmtGrowth, fmtCompact } from '../format';

type ItemStatus = 'loading' | 'success' | 'error';
interface CompareItem {
  status: ItemStatus;
  data: CountryProfile | null;
  message: string | null;
}

const COMPARE_COLORS = ['#e0a94f', '#57a9c9', '#7fb069', '#b48ac9'];

/**
 * 装载一组国家在某年的画像：
 * - 命中 api 缓存的国家同步出结果（不发请求，前进后退无缝更新）；
 * - 未命中者各自请求；isStale 在国家 / 年份切换或组件卸载后为 true，
 *   旧装载的响应一律丢弃（竞态保护，StrictMode 双挂载也安全）。
 */
function loadProfiles(
  codes: string[],
  year: number,
  setItems: Dispatch<SetStateAction<Record<string, CompareItem>>>,
  isStale: () => boolean
): void {
  if (codes.length === 0) {
    setItems({});
    return;
  }

  const next: Record<string, CompareItem> = {};
  codes.forEach((code) => {
    const cached = peekCached<CountryProfile>(countryProfileUrl(code, year));
    next[code] = cached
      ? { status: 'success', data: cached, message: null }
      : { status: 'loading', data: null, message: null };
  });
  setItems(next);

  codes.forEach((code) => {
    if (next[code].status === 'success') return; // 缓存命中，不发请求
    api
      .countryProfile(code, year)
      .then((data) => {
        if (isStale()) return;
        setItems((cur) => ({ ...cur, [code]: { status: 'success', data, message: null } }));
      })
      .catch((e: unknown) => {
        if (isStale()) return;
        let message: string;
        if (e instanceof ApiError && e.isNotFound) message = '该国家 / 地区暂无收录';
        else if (e instanceof ApiError) message = e.message;
        else if (e instanceof SchemaError) message = e.message;
        else message = e instanceof Error ? e.message : '未知数据错误';
        setItems((cur) => ({ ...cur, [code]: { status: 'error', data: null, message } }));
      });
  });
}

/** 对比指标行定义 */
const ROWS: Array<{
  key: string;
  label: string;
  get: (d: CountryProfile) => string;
  raw: (d: CountryProfile) => number | null;
}> = [
  { key: 'gdp', label: '名义 GDP', get: (d) => fmtDollars(d.summary?.gdp ?? null), raw: (d) => d.summary?.gdp ?? null },
  { key: 'pop', label: '人口', get: (d) => fmtPopulation(d.summary?.population ?? null), raw: (d) => d.summary?.population ?? null },
  { key: 'perCapita', label: '人均 GDP', get: (d) => fmtDollars(d.summary?.gdpPerCapita ?? null), raw: (d) => d.summary?.gdpPerCapita ?? null },
  { key: 'growth', label: '实际 GDP 增速', get: (d) => fmtGrowth(d.summary?.gdpGrowth ?? null), raw: (d) => d.summary?.gdpGrowth ?? null },
  { key: 'exports', label: '货物出口', get: (d) => fmtDollars(d.summary?.exports ?? null), raw: (d) => d.summary?.exports ?? null },
  { key: 'imports', label: '货物进口', get: (d) => fmtDollars(d.summary?.imports ?? null), raw: (d) => d.summary?.imports ?? null },
  {
    key: 'trade',
    label: '贸易总额',
    get: (d) => fmtDollars(d.summary?.tradeTotal ?? null),
    raw: (d) => d.summary?.tradeTotal ?? null,
  },
];

export default function Compare() {
  const { codes, year, years, rawYear, addCountry, removeCountry, changeYear } = useCompareRoute();
  const [items, setItems] = useState<Record<string, CompareItem>>({});
  const [countryList, setCountryList] = useState<CountryListItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  // 本地装载序号：国家 / 年份变化即自增，旧装载的响应全部作废
  const loadSeq = useRef(0);

  /* 国家 / 年份变化：重新装载（缓存命中时同步出画，前进后退无网络请求、无缝更新） */
  const key = `${codes.join(',')}|${year}`;
  useEffect(() => {
    const seq = ++loadSeq.current;
    loadProfiles(codes, year, setItems, () => seq !== loadSeq.current);
    return () => {
      loadSeq.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  /* 选择器候选国家（当年收录名单） */
  useEffect(() => {
    let alive = true;
    api
      .countries(year)
      .then((r) => alive && setCountryList(r.countries))
      .catch(() => alive && setCountryList([]));
    return () => {
      alive = false;
    };
  }, [year]);

  const loaded = codes.map((c) => items[c]).filter((i): i is CompareItem => !!i);
  const anyLoading = loaded.some((i) => i.status === 'loading');

  const chartYears = useMemo(() => {
    const set = new Set<number>();
    loaded.forEach((i) => i.data?.timeseries.forEach((t) => set.add(t.year)));
    return [...set].sort((a, b) => a - b);
  }, [loaded]);

  const trendOption = useMemo(() => {
    const series = codes.map((code, i) => {
      const item = items[code];
      const byYear = new Map(item?.data?.timeseries.map((t) => [t.year, t.gdp]) ?? []);
      return {
        name: item?.data?.country.name ?? code,
        type: 'line' as const,
        smooth: true,
        symbolSize: 6,
        data: chartYears.map((y) => byYear.get(y) ?? null),
        lineStyle: { color: COMPARE_COLORS[i % COMPARE_COLORS.length], width: 2.5 },
        itemStyle: { color: COMPARE_COLORS[i % COMPARE_COLORS.length] },
      };
    });
    return {
      tooltip: {
        trigger: 'axis',
        ...darkTooltip,
        valueFormatter: (v: unknown) => (v == null ? '—' : `$${fmtCompact(Number(v))}`),
      },
      legend: { textStyle: { color: '#8b97a9' }, top: 0, right: 0 },
      grid: { left: 60, right: 24, top: 38, bottom: 30 },
      xAxis: { type: 'category', data: chartYears, ...axisStyle },
      yAxis: {
        type: 'value',
        ...axisStyle,
        splitLine,
        axisLabel: { ...axisStyle.axisLabel, formatter: (v: number) => `$${fmtCompact(v)}` },
      },
      series,
    };
  }, [items, codes, chartYears]);

  const candidates = useMemo(
    () => countryList.filter((c) => !codes.includes(c.code)),
    [countryList, codes]
  );

  const invalidYear = rawYear != null && Number(`${rawYear}`) !== year;
  const backToMap = (
    <Link to={`/${codes[0] ? `?c=${codes[0]}&` : '?'}year=${year}`} className="btn-ghost">
      <span className="arrow">←</span> 返回地图视图
    </Link>
  );

  return (
    <div className="page compare-page">
      <div className="compare-wrap">
        <div className="compare-top">
          <div>
            <div className="compare-title">国家对比 <span className="compare-en">Compare</span></div>
            <div className="compare-sub">
              {year} 年口径 · 最多对比 {MAX_COMPARE} 个经济体
              {invalidYear && (
                <span className="compare-correction">（未收录 {rawYear} 年，已就近展示 {year} 年）</span>
              )}
            </div>
          </div>
          <div className="compare-top-actions">{backToMap}</div>
        </div>

        {/* 对比国家芯片 */}
        <div className="compare-chips">
          {codes.map((code, i) => {
            const item = items[code];
            const name = item?.data?.country.name ?? code;
            return (
              <div className="compare-chip" key={code} style={{ borderColor: COMPARE_COLORS[i % COMPARE_COLORS.length] }}>
                <i style={{ background: COMPARE_COLORS[i % COMPARE_COLORS.length] }} />
                <Link to={`/country/${code}?year=${year}`} className="compare-chip-name" title={`进入 ${name} 经济画像`}>
                  {name}
                </Link>
                {item?.data && <small>{regionName(item.data.country.region)}</small>}
                <button
                  className="compare-chip-x"
                  onClick={() => removeCountry(code)}
                  title="移出对比"
                >
                  ✕
                </button>
              </div>
            );
          })}
          {codes.length < MAX_COMPARE && (
            <div className="compare-add">
              <button className="btn-ghost" onClick={() => setPickerOpen((v) => !v)}>
                ＋ 添加国家
              </button>
              {pickerOpen && (
                <div className="compare-picker">
                  {candidates.length === 0 ? (
                    <div className="compare-picker-empty">暂无可添加国家</div>
                  ) : (
                    candidates.map((c) => (
                      <button
                        key={c.code}
                        className="compare-picker-item"
                        onClick={() => {
                          addCountry(c.code);
                          setPickerOpen(false);
                        }}
                      >
                        <span>{c.name}</span>
                        <small>{regionName(c.region)}</small>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {codes.length === 0 ? (
          <EmptyState
            kind="empty"
            title="还没有对比国家"
            description="从画像页点击「国家对比 Compare」进入，或在此直接添加国家。"
            actions={
              <Link to={`/?year=${year}`} className="btn-primary">
                去地图选择国家 <span className="arrow">→</span>
              </Link>
            }
          />
        ) : (
          <>
            {/* 指标对比表 */}
            <div className="compare-table-card">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th>指标</th>
                    {codes.map((code, i) => {
                      const item = items[code];
                      return (
                        <th key={code}>
                          <Link
                            to={`/country/${code}?year=${year}`}
                            style={{ color: COMPARE_COLORS[i % COMPARE_COLORS.length] }}
                          >
                            {item?.data?.country.name ?? code}
                          </Link>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row) => {
                    const values = codes
                      .map((c) => items[c]?.data)
                      .map((d) => (d ? row.raw(d) : null));
                    const valid = values.filter((v): v is number => v != null);
                    const best = row.key === 'growth' ? null : valid.length ? Math.max(...valid) : null;
                    return (
                      <tr key={row.key}>
                        <td className="compare-row-label">{row.label}</td>
                        {codes.map((code) => {
                          const item = items[code];
                          if (!item || item.status === 'loading') return <td key={code} className="num">…</td>;
                          if (item.status === 'error' || !item.data)
                            return <td key={code} className="num compare-na" title={item?.message ?? undefined}>--</td>;
                          const v = row.raw(item.data);
                          return (
                            <td key={code} className={`num${best != null && v === best ? ' best' : ''}`}>
                              {row.get(item.data)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {anyLoading && <div className="compare-loading-hint">指标加载中…</div>}
            </div>

            {/* GDP 历史轨迹对比 */}
            <div className="chart-card" style={{ marginTop: 16 }}>
              <h4>GDP 历史轨迹对比</h4>
              <p>名义 GDP，现价美元 · {chartYears[0] ?? '—'}–{chartYears[chartYears.length - 1] ?? '—'}</p>
              <EChart option={trendOption} height={340} />
            </div>
          </>
        )}
      </div>

      <div className="timeline-dock">
        <Timeline
          years={years}
          value={year}
          onChange={(y, source) => changeYear(y, source === 'user' ? 'push' : 'replace')}
          hint="切换对比年份，所有国家图表与地址栏参数同步更新"
        />
      </div>
    </div>
  );
}
