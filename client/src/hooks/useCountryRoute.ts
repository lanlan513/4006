import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAtlas } from '../store';

/** 解析 ?year=：非法或缺省返回 null（交由全局 store 兜底） */
function parseQueryYear(raw: string | null): number | null {
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

export interface CountryRouteState {
  /** 当前画像国家（ISO3），无路由参数时为 null */
  countryCode: string | null;
  /** 当前生效年份：全局 store 为唯一数据源 */
  year: number;
}

/**
 * 统一协调「URL 参数 ↔ 全局状态（zustand）」：
 *
 * - 全局 store 是年份的唯一数据源，请求 hook 只监听最终年份；
 * - URL 中的 ?year= 仅在“进入页面 / 路由跳转 / 浏览器前进后退”时初始化 store，
 *   路由变化在渲染阶段即时生效，保证第一次请求就命中正确年份；
 * - 在画像页内切换全局年份（时间轴等全局入口）立即生效，并 replace 回地址栏，
 *   URL 旧值不会再把年份钉住，/api/country-profile 会按新年份重新请求；
 * - 切换国家（伙伴国跳转）若地址栏仍带年份，该年份作为新国家入参一次性灌入。
 */
export function useCountryRoute(): CountryRouteState {
  const { code } = useParams<{ code: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const storeYear = useAtlas((s) => s.year);
  const setStoreYear = useAtlas((s) => s.setYear);
  const setSelected = useAtlas((s) => s.setSelected);

  const countryCode = code ? code.trim().toUpperCase() : null;

  // 路由源年份：深链 /country/CHN?year=2020 首次渲染即取 2020，
  // 缺省/非法时回落全局 store 年份。
  const [routedYear, setRoutedYear] = useState<number>(
    () => parseQueryYear(searchParams.get('year')) ?? storeYear
  );

  const navSignal = `${countryCode ?? ''}|${searchParams.get('year') ?? ''}`;
  const prevNavSignal = useRef(navSignal);
  // true 表示有一次“来自路由”的年份变更需要推送到 store（含首次挂载）
  const navDirty = useRef(true);
  const prevCountry = useRef<string | null>(countryCode);

  // 路由变化（进入、跳转、前进后退）时，渲染阶段即时采用 URL 年份。
  // React 官方推荐的“根据 prop/路由变化调整 state”模式，避免多请求一帧。
  if (navSignal !== prevNavSignal.current) {
    prevNavSignal.current = navSignal;
    const q = parseQueryYear(searchParams.get('year'));
    if (q !== null) setRoutedYear(q);
    navDirty.current = true;
  }

  // 单向、双向收敛在同一个 effect 中，杜绝两个 effect 在挂载时互相覆盖：
  // - 来自路由：routedYear → store（不回写地址栏，保留浏览器历史）
  // - 来自全局：storeYear → routedYear，并 replace 到地址栏
  useEffect(() => {
    if (navDirty.current) {
      navDirty.current = false;
      if (routedYear !== storeYear) setStoreYear(routedYear);
      return;
    }
    if (storeYear !== routedYear) {
      setRoutedYear(storeYear);
      const next = new URLSearchParams(searchParams);
      next.set('year', String(storeYear));
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navSignal, storeYear, routedYear]);

  // 当前画像国家同步为全局选中，返回地图时保持定位与贸易网络聚焦
  useEffect(() => {
    if (countryCode && countryCode !== prevCountry.current) setSelected(countryCode);
    prevCountry.current = countryCode;
  }, [countryCode, setSelected]);

  return { countryCode, year: routedYear };
}
