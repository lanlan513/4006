/**
 * 后端支持的离散年份（时间轴锚点）。
 * 画像页只能请求这些年份：其它年份（如手输 ?year=2022）后端会静默回落，
 * 前端必须在发请求前自行归一化，保证「地址栏 / 页面标题 / 请求参数」三者一致。
 */
import { useEffect, useState } from 'react';
import { api } from './api';

/** 与后端种子年度一致的兜底列表：meta 未返回时也能同步判定，不必先空发一次请求 */
export const FALLBACK_YEARS = [2000, 2005, 2010, 2015, 2020, 2023];

let yearsPromise: Promise<number[]> | null = null;

/** 获取支持年份（全应用共享同一次 /api/meta 请求与缓存） */
export function getSupportedYears(): Promise<number[]> {
  if (!yearsPromise) {
    yearsPromise = api
      .meta()
      .then((m) =>
        Array.isArray(m.years) && m.years.length > 0
          ? [...m.years].sort((a, b) => a - b)
          : FALLBACK_YEARS
      )
      .catch(() => FALLBACK_YEARS);
  }
  return yearsPromise;
}

export function useSupportedYears(): number[] {
  const [years, setYears] = useState<number[]>(FALLBACK_YEARS);
  useEffect(() => {
    let alive = true;
    getSupportedYears().then((y) => {
      if (alive) setYears(y);
    });
    return () => {
      alive = false;
    };
  }, []);
  return years;
}

/**
 * 将任意年份归一化到最近的收录年度（距离并列时取较新者）。
 * 2022→2023、2001→2000、2024→2023、2015→2015。
 */
export function normalizeYear(year: number, years: number[]): number {
  const sorted = years.length > 0 ? years : FALLBACK_YEARS;
  if (sorted.includes(year)) return year;
  let best = sorted[0];
  let bestDist = Infinity;
  for (const y of sorted) {
    const dist = Math.abs(y - year);
    if (dist < bestDist || (dist === bestDist && y > best)) {
      best = y;
      bestDist = dist;
    }
  }
  return best;
}
