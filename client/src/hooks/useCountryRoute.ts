import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAtlas } from '../store';
import { normalizeYear, useSupportedYears } from '../meta';

/** 解析 ?year=：非法或缺省返回 null（交由全局 store 兜底） */
function parseQueryYear(raw: string | null): number | null {
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

export interface CountryRouteState {
  /** 当前画像国家（ISO3），无路由参数时为 null */
  countryCode: string | null;
  /** 当前生效年份：已归一化到后端收录年度，请求与显示共用它 */
  year: number;
  /** 用户原始请求年份不被支持时给出纠正信息；正常情况为 null */
  correction: { requested: number; actual: number } | null;
  /**
   * 画像页内时间轴的统一切年入口：
   * 同时收敛「本地状态 + 全局 store + 地址栏」。
   * - 'user'（拖动滑块 / 点击刻度）：push 一条历史记录，浏览器后退可逐年回溯；
   * - 'replace'（自动播放、年份纠正等）：只替换当前历史项。
   */
  changeYear: (next: number, mode?: 'push' | 'replace') => void;
}

/**
 * 统一协调「URL 参数 ↔ 全局状态（zustand）」：
 *
 * - 年份只有一个生效值（state），它永远是后端收录的离散年度；
 * - 进入页面 / 路由跳转 / 浏览器前进后退（URL 真实变化，即 popstate）时，
 *   以 ?year= 为准重新初始化（非法时回落全局 store），路由变化在渲染阶段
 *   即时生效，保证第一次 /api/country-profile 请求就命中真实数据年份；
 * - 画像页内切年统一走 changeYear：立即生效并按来源 push/replace 回地址栏；
 * - ?year=2022 这类未收录年份在发请求前吸附到最近年度（2023），store 与地址栏
 *   同步纠正，并通过 correction 持久提示用户，避免“标题 2022 / 数据 2023”的错位；
 * - 自身写入 store / 地址栏产生的回声（echo）不会被误判为新的外部导航。
 */
export function useCountryRoute(): CountryRouteState {
  const { code } = useParams<{ code: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const storeYear = useAtlas((s) => s.year);
  const setStoreYear = useAtlas((s) => s.setYear);
  const setSelected = useAtlas((s) => s.setSelected);
  const supportedYears = useSupportedYears();

  const countryCode = code ? code.trim().toUpperCase() : null;
  const queryYear = parseQueryYear(searchParams.get('year'));
  const yearsKey = supportedYears.join(',');

  const wantedYear = queryYear ?? storeYear;
  const initialYear = normalizeYear(wantedYear, supportedYears);
  const [year, setYear] = useState<number>(initialYear);
  const [correction, setCorrection] = useState<CountryRouteState['correction']>(
    initialYear !== wantedYear ? { requested: wantedYear, actual: initialYear } : null
  );

  const routeSignal = `${countryCode ?? ''}|${queryYear ?? ''}`;
  const prevRouteSignal = useRef(routeSignal);
  // 挂载或路由变化后需要把生效年份同步到 store / 地址栏
  const navDirty = useRef(true);
  // 自身写入造成的回声标记，避免回灌被当成新的外部变化
  const echoUrl = useRef<number | null>(null);
  const echoStore = useRef<number | null>(null);

  const writeUrlYear = (y: number, mode: 'push' | 'replace') => {
    const next = new URLSearchParams(searchParams);
    next.set('year', String(y));
    echoUrl.current = y;
    setSearchParams(next, { replace: mode === 'replace' });
  };

  /**
   * 画像页内一切年份变更（时间轴滑块 / 刻度 / 播放）的唯一入口：
   * 本地年份、全局 store（供地图高亮联动）、URL 三处一次写齐，
   * 未收录年份先吸附再写入，保证请求参数与地址栏永远一致。
   */
  const changeYear = (next: number, mode: 'push' | 'replace' = 'push') => {
    const normalized = normalizeYear(next, supportedYears);
    setCorrection(
      normalized !== next ? { requested: next, actual: normalized } : null
    );
    setYear(normalized);
    navDirty.current = false; // 本次变更由本函数收敛，路由同步 effect 不再重复写
    if (storeYear !== normalized) {
      echoStore.current = normalized;
      setStoreYear(normalized);
    }
    if (queryYear !== normalized) writeUrlYear(normalized, mode);
  };

  /* ---------- 渲染阶段收敛：只响应“真实外部信号” ---------- */

  // 1) 路由变化（进入、伙伴国跳转、前进后退）。自身 push/replace 造成的 query 变化是回声。
  if (routeSignal !== prevRouteSignal.current) {
    prevRouteSignal.current = routeSignal;
    const isSelfEcho = queryYear !== null && queryYear === echoUrl.current;
    if (!isSelfEcho) {
      const normalized = normalizeYear(wantedYear, supportedYears);
      setYear(normalized);
      setCorrection(
        normalized !== wantedYear ? { requested: wantedYear, actual: normalized } : null
      );
      navDirty.current = true;
    }
    echoUrl.current = null;
  }

  // 2) 支持年份列表异步到达后若口径变化（通常与内置兜底列表一致），再归一化一次。
  const normalizedYear = normalizeYear(year, supportedYears);
  if (normalizedYear !== year) {
    setYear(normalizedYear);
    navDirty.current = true;
  }

  /* ---------- 全局年份变化（先于路由同步执行，挂载时让位给路由） ---------- */
  useEffect(() => {
    if (navDirty.current) return; // 本次提交由路由负责收敛
    if (storeYear === echoStore.current) {
      echoStore.current = null; // 自身 setStoreYear 的回声
      return;
    }
    // 其它页面（探索地图时间轴）改动全局年份时，画像页跟随，并用 replace 不打扰历史栈
    const normalized = normalizeYear(storeYear, supportedYears);
    setCorrection(
      normalized !== storeYear ? { requested: storeYear, actual: normalized } : null
    );
    setYear(normalized);
    if (normalized !== storeYear) {
      echoStore.current = normalized;
      setStoreYear(normalized);
    }
    if (queryYear !== normalized) writeUrlYear(normalized, 'replace');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeYear, yearsKey]);

  /* ---------- 路由同步：生效年份 → store / 地址栏 ---------- */
  useEffect(() => {
    if (!navDirty.current) return;
    navDirty.current = false;
    if (storeYear !== year) {
      echoStore.current = year;
      setStoreYear(year);
    }
    if (queryYear !== year) writeUrlYear(year, 'replace');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeSignal, year, yearsKey]);

  // 当前画像国家同步为全局选中，返回地图时保持定位与贸易网络聚焦
  useEffect(() => {
    if (countryCode) setSelected(countryCode);
  }, [countryCode, setSelected]);

  return { countryCode, year, correction, changeYear };
}
