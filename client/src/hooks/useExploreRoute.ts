import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAtlas } from '../store';
import { normalizeYear, useSupportedYears } from '../meta';

/** 解析 ?year=：非法或缺省返回 null（交由全局 store 兜底） */
function parseQueryYear(raw: string | null): number | null {
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

export interface ExploreRouteState {
  /** 时间轴可切换的收录年度 */
  years: number[];
  /** ?c= 定位国家（无则 null） */
  focusCode: string | null;
  /**
   * 探索页时间轴统一切年入口：全局年份与地址栏一次写齐。
   * - 'user'：push 历史，浏览器后退可逐年回溯；
   * - 'replace'：自动播放等连续切换只替换当前历史项。
   */
  changeYear: (next: number, mode: 'push' | 'replace') => void;
}

/**
 * 探索地图的「URL ↔ 全局状态」协调，与画像页 useCountryRoute 同一口径：
 * - 浏览器前进后退（popstate）/ 带参链接进入：以 ?year= 为准在渲染阶段还原
 *   全局年份（第一次 /api/countries 请求即命中正确年份），以 ?c= 还原高亮国家；
 * - 时间轴切年写回地址栏（用户操作 push、播放 replace）；
 * - ?year=2022 等未收录年份发请求前即吸附到最近年度并 replace 纠正地址栏；
 * - 自身写入产生的回声（echo）不会触发反向同步。
 */
export function useExploreRoute(): ExploreRouteState {
  const [searchParams, setSearchParams] = useSearchParams();
  const year = useAtlas((s) => s.year);
  const setYear = useAtlas((s) => s.setYear);
  const years = useSupportedYears();

  const rawYear = parseQueryYear(searchParams.get('year'));
  const urlYear = rawYear == null ? null : normalizeYear(rawYear, years);
  const focusCode = searchParams.get('c');

  // 自身 push/replace 写入的年份，到达后消费一次
  const echoUrl = useRef<number | null>(null);

  const writeUrlYear = (y: number, mode: 'push' | 'replace') => {
    const next = new URLSearchParams(searchParams);
    next.set('year', String(y));
    echoUrl.current = y;
    setSearchParams(next, { replace: mode === 'replace' });
  };

  const changeYear = (next: number, mode: 'push' | 'replace') => {
    const normalized = normalizeYear(next, years);
    // 点击当前年份不产生重复历史项
    if (normalized === year && urlYear === normalized) return;
    echoUrl.current = normalized;
    setYear(normalized); // 地图着色 / 国家卡片随全局年份联动
    writeUrlYear(normalized, mode);
  };

  /* ---------- 渲染阶段收敛：外部 URL（进入 / popstate）→ 全局 store ---------- */
  if (urlYear != null && urlYear !== echoUrl.current && urlYear !== year) {
    setYear(urlYear);
  }
  // 自身回声到达（URL 与 store 均已是该值），消费标记
  if (urlYear != null && urlYear === echoUrl.current && urlYear === year) {
    echoUrl.current = null;
  }

  /* 地址栏缺少年份：用当前全局年份补一条 replace（仅一次，之后由时间轴负责） */
  useEffect(() => {
    if (searchParams.get('year') == null) writeUrlYear(year, 'replace');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  /* 非法 / 未收录年份：吸附到最近年度并 replace 纠正，store 也同步（同一次提交） */
  useEffect(() => {
    if (rawYear == null || rawYear === urlYear) return;
    if (urlYear == null) return;
    echoUrl.current = urlYear;
    setYear(urlYear);
    writeUrlYear(urlYear, 'replace');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawYear, urlYear]);

  return { years, focusCode, changeYear };
}
