import { useEffect, useRef, useState } from 'react';
import { api, ApiError, SchemaError } from '../api';
import type { CountryProfile } from '../schemas';

export type ProfileStatus = 'loading' | 'success' | 'not-found' | 'empty' | 'error';

export interface UseCountryProfileResult {
  status: ProfileStatus;
  data: CountryProfile | null;
  /** 错误场景下的可展示说明（不直接抛给 React 树） */
  errorMessage: string | null;
  /** 手动重试当前请求 */
  retry: () => void;
}

/**
 * 国家经济画像数据流：
 * 入参为“当前选中国家 + 当前选中年份”，任一变化都会重新请求。
 * 内部用请求序号防止快速切换国家/年份时旧响应覆盖新响应（竞态保护）。
 */
export function useCountryProfile(countryCode: string | null | undefined, year: number | null | undefined) {
  const [state, setState] = useState<{
    status: ProfileStatus;
    data: CountryProfile | null;
    errorMessage: string | null;
  }>({ status: 'loading', data: null, errorMessage: null });

  const reqSeq = useRef(0);
  // retryToken 变化时强制重跑同一组入参的请求
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    // 没有有效入参时不发起请求，交给页面渲染友好空态
    if (!countryCode || !year || !Number.isFinite(year)) {
      setState({ status: 'empty', data: null, errorMessage: null });
      return;
    }

    const seq = ++reqSeq.current;
    setState({ status: 'loading', data: null, errorMessage: null });

    api
      .countryProfile(countryCode, year)
      .then((data) => {
        if (seq !== reqSeq.current) return; // 已被更新的请求取代
        // 国家存在但该年份无任何指标数据：空数据场景
        if (!data.summary && data.timeseries.length === 0) {
          setState({ status: 'empty', data, errorMessage: null });
        } else if (!data.summary) {
          // 历史序列存在，但恰好没有所选年份的核心指标（含贸易总额）
          setState({ status: 'empty', data, errorMessage: `${year} 年暂无核心指标数据` });
        } else {
          setState({ status: 'success', data, errorMessage: null });
        }
      })
      .catch((e: unknown) => {
        if (seq !== reqSeq.current) return;
        if (e instanceof ApiError && e.isNotFound) {
          setState({ status: 'not-found', data: null, errorMessage: null });
        } else if (e instanceof SchemaError) {
          setState({ status: 'error', data: null, errorMessage: e.message });
        } else if (e instanceof ApiError) {
          setState({ status: 'error', data: null, errorMessage: e.message });
        } else {
          setState({
            status: 'error',
            data: null,
            errorMessage: e instanceof Error ? e.message : '未知数据错误',
          });
        }
      });
    // 请求序号在入参变化/卸载时自动失效，无需显式 cleanup
  }, [countryCode, year, retryToken]);

  return {
    ...state,
    retry: () => setRetryToken((t) => t + 1),
  } satisfies UseCountryProfileResult;
}
