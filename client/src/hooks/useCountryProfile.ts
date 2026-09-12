import { useEffect, useRef, useState } from 'react';
import { api, ApiError, SchemaError, countryProfileUrl, peekCached } from '../api';
import type { CountryProfile } from '../schemas';

export type ProfileStatus = 'loading' | 'success' | 'not-found' | 'empty' | 'error';

export interface UseCountryProfileResult {
  status: ProfileStatus;
  data: CountryProfile | null;
  /** 错误场景下的可展示说明（不直接抛给 React 树） */
  errorMessage: string | null;
  /** 本次数据是否直接来自客户端缓存（前进后退 / 来回切换时无网络请求） */
  fromCache: boolean;
  /** 手动重试当前请求（绕过缓存） */
  retry: () => void;
}

interface State {
  status: ProfileStatus;
  data: CountryProfile | null;
  errorMessage: string | null;
  fromCache: boolean;
}

/** 按当前年份把画像响应分类为 success / empty（与网络分支同一口径） */
function classify(data: CountryProfile, year: number): State {
  if (!data.summary && data.timeseries.length === 0) {
    return { status: 'empty', data, errorMessage: null, fromCache: false };
  }
  if (!data.summary) {
    return { status: 'empty', data, errorMessage: `${year} 年暂无核心指标数据`, fromCache: false };
  }
  return { status: 'success', data, errorMessage: null, fromCache: false };
}

/** 入参无效时的空态 / 缓存命中时的即时状态：避免参数变化先闪一下骨架屏 */
function resolveImmediately(countryCode: string | null | undefined, year: number | null | undefined): State | null {
  if (!countryCode || !year || !Number.isFinite(year)) {
    return { status: 'empty', data: null, errorMessage: null, fromCache: false };
  }
  const cached = peekCached<CountryProfile>(countryProfileUrl(countryCode, year));
  if (cached) return { ...classify(cached, year), fromCache: true };
  return null;
}

/**
 * 国家经济画像数据流：
 * 入参为“当前选中国家 + 当前选中年份”，任一变化都会重新求值。
 * - 命中 api 层缓存（同一国家同一年份，TTL 内）时同步渲染缓存数据，
 *   不发请求、不闪骨架屏 —— 浏览器前进后退与来回切换体验无缝；
 * - 未命中时才进入 loading 并请求，请求序号防止快速切换时旧响应覆盖新响应；
 * - retry() 以 { force: true } 绕过缓存重新拉取。
 */
export function useCountryProfile(countryCode: string | null | undefined, year: number | null | undefined) {
  const [state, setState] = useState<State>(
    () => resolveImmediately(countryCode, year) ?? { status: 'loading', data: null, errorMessage: null, fromCache: false }
  );

  const reqSeq = useRef(0);
  // retryToken 变化时强制重跑同一组入参的请求
  const [retryToken, setRetryToken] = useState(0);
  const prevRetryToken = useRef(0);

  // 入参变化在渲染阶段即时收敛：有缓存就立刻换数据，图表无缝更新。
  // 同时立即推进请求序号 —— 不必等 effect 执行，此前在途的旧请求自参数变化
  // 这一刻起即为过期，防止它在「缓存渲染之后、effect 之前」的窗口内回写覆盖。
  const key = `${countryCode ?? ''}|${year ?? ''}`;
  const prevKey = useRef(key);
  if (key !== prevKey.current) {
    prevKey.current = key;
    reqSeq.current++;
    const immediate = resolveImmediately(countryCode, year);
    if (immediate) setState(immediate);
    else setState({ status: 'loading', data: null, errorMessage: null, fromCache: false });
  }

  useEffect(() => {
    // 序号推进统一在 effect 入口：包括入参无效 / 缓存命中在内的任何提前返回，
    // 都会使此前在途的旧请求拿到过期序号；旧响应返回时一律丢弃，
    // 不会覆盖新选中国家 / 年份（缓存）的数据。
    const seq = ++reqSeq.current;

    // 没有有效入参时不发起请求，交给页面渲染友好空态
    if (!countryCode || !year || !Number.isFinite(year)) {
      setState({ status: 'empty', data: null, errorMessage: null, fromCache: false });
      return;
    }

    const force = retryToken !== prevRetryToken.current;
    prevRetryToken.current = retryToken;

    // 缓存仍新鲜：渲染阶段已用缓存数据出画，无需任何网络请求。
    // （并行组件恰好在渲染后、effect 前写入缓存时也在此收口，避免停在 loading）
    if (!force) {
      const cached = peekCached<CountryProfile>(countryProfileUrl(countryCode, year));
      if (cached) {
        setState({ ...classify(cached, year), fromCache: true });
        return;
      }
    }

    setState((s) =>
      // 重试时保留旧数据可见，避免整块回退为骨架
      s.data ? { ...s, status: 'loading', errorMessage: null } : { status: 'loading', data: null, errorMessage: null, fromCache: false }
    );

    api
      .countryProfile(countryCode, year, { force })
      .then((data) => {
        if (seq !== reqSeq.current) return; // 已被更新的请求取代
        setState(classify(data, year));
      })
      .catch((e: unknown) => {
        if (seq !== reqSeq.current) return;
        if (e instanceof ApiError && e.isNotFound) {
          setState({ status: 'not-found', data: null, errorMessage: null, fromCache: false });
        } else if (e instanceof SchemaError) {
          setState({ status: 'error', data: null, errorMessage: e.message, fromCache: false });
        } else if (e instanceof ApiError) {
          setState({ status: 'error', data: null, errorMessage: e.message, fromCache: false });
        } else {
          setState({
            status: 'error',
            data: null,
            errorMessage: e instanceof Error ? e.message : '未知数据错误',
            fromCache: false,
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
