import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { normalizeYear, useSupportedYears } from '../meta';

export const MAX_COMPARE = 4;

/** 解析 ?year=：非法或缺省回落到最新收录年度 */
function parseYear(raw: string | null, years: number[]): number {
  if (raw != null) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return normalizeYear(Math.trunc(n), years);
  }
  return years[years.length - 1];
}

/**
 * 国家对比页状态全部存放在 URL：`/compare?c=USA&c=CHN&year=2020`
 * - 可分享 / 收藏 / 浏览器前进后退还原（popstate 由 React Router 自动分发）；
 * - 国家增删走 push（产生历史项），时间轴用户切年 push、自动播放 replace；
 * - 未收录年份吸附到最近年度并 replace 纠正地址栏。
 */
export function useCompareRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const years = useSupportedYears();

  const codes = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    searchParams.getAll('c').forEach((raw) => {
      const c = raw.trim().toUpperCase();
      if (c && !seen.has(c) && out.length < MAX_COMPARE) {
        seen.add(c);
        out.push(c);
      }
    });
    return out;
  }, [searchParams]);

  const rawYear = searchParams.get('year');
  const year = parseYear(rawYear, years);

  const write = useCallback(
    (nextCodes: string[], nextYear: number, mode: 'push' | 'replace') => {
      const next = new URLSearchParams();
      nextCodes.forEach((c) => next.append('c', c));
      next.set('year', String(nextYear));
      setSearchParams(next, { replace: mode === 'replace' });
    },
    [setSearchParams]
  );

  const addCountry = useCallback(
    (code: string) => {
      const c = code.trim().toUpperCase();
      if (!c || codes.includes(c) || codes.length >= MAX_COMPARE) return;
      write([...codes, c], year, 'push');
    },
    [codes, year, write]
  );

  const removeCountry = useCallback(
    (code: string) => write(codes.filter((c) => c !== code), year, 'push'),
    [codes, year, write]
  );

  const changeYear = useCallback(
    (next: number, mode: 'push' | 'replace') => {
      const normalized = normalizeYear(next, years);
      if (normalized === year) return;
      write(codes, normalized, mode);
    },
    [codes, year, years, write]
  );

  return { codes, year, years, rawYear, addCountry, removeCountry, changeYear };
}
