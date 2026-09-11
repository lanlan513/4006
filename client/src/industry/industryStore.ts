/**
 * 产业链状态基建（zustand）。
 *
 * 职责：
 * - 维护产业目录（UI 切换器的唯一数据源，任何产业名称都不进 UI 代码）；
 * - 产业切换：输入产业 ID → 动态载入对应数据 JSON → 规范化 → 更新状态机；
 * - 状态机 idle / loading / ready / empty / error，空数据优雅降级为 empty 态；
 * - 内存缓存 + 请求序号防竞态，快速切换不会出现旧数据覆盖新选择。
 */
import { create } from 'zustand';
import { api } from '../api';
import { fromApiChainDetail, isChainEmpty } from './normalize';
import type { IndustryChain, IndustryMeta, IndustryStatus } from './types';

type CatalogStatus = 'idle' | 'loading' | 'ready' | 'error';

interface IndustryState {
  /** 产业目录（切换器数据源） */
  catalog: IndustryMeta[];
  catalogStatus: CatalogStatus;
  catalogError: string | null;
  /** 当前选中的产业 ID */
  currentId: string | null;
  /** 当前产业链数据（已规范化；empty / error 态下为 null 或空链） */
  chain: IndustryChain | null;
  status: IndustryStatus;
  error: string | null;
  /** 载入产业目录（幂等，失败后可重试） */
  loadCatalog: () => Promise<void>;
  /** 产业切换：输入产业 ID，动态载入对应数据 */
  selectIndustry: (id: string) => Promise<void>;
  /** 复位当前产业（离开页面时调用，使进行中的请求失效） */
  clearIndustry: () => void;
}

/** 已加载链的内存缓存：切回已看过的产业无需重新请求 */
const chainCache = new Map<string, IndustryChain>();
/** 请求序号：防止快速切换时旧请求的响应覆盖新状态 */
let requestSeq = 0;
/** 目录请求的去重句柄 */
let catalogPromise: Promise<void> | null = null;

export const useIndustry = create<IndustryState>((set, get) => ({
  catalog: [],
  catalogStatus: 'idle',
  catalogError: null,
  currentId: null,
  chain: null,
  status: 'idle',
  error: null,

  loadCatalog: () => {
    if (get().catalogStatus === 'ready') return Promise.resolve();
    if (catalogPromise) return catalogPromise;
    set({ catalogStatus: 'loading', catalogError: null });
    catalogPromise = (async () => {
      try {
        const r = await api.chains();
        const catalog = (r.chains ?? [])
          .filter((c) => c && typeof c.id === 'string' && c.id.length > 0)
          .map((c) => ({ id: c.id, name: c.name || c.id, subtitle: c.subtitle ?? '' }));
        set({ catalog, catalogStatus: 'ready' });
      } catch (e) {
        set({
          catalogStatus: 'error',
          catalogError: e instanceof Error ? e.message : '产业目录加载失败',
        });
      } finally {
        catalogPromise = null;
      }
    })();
    return catalogPromise;
  },

  selectIndustry: async (id) => {
    const industryId = (id ?? '').trim();
    if (!industryId) return;

    // 同一产业重复切换：就绪 / 空态 / 加载中都不重复请求，避免闪烁
    const s = get();
    if (
      s.currentId === industryId &&
      (s.status === 'ready' || s.status === 'empty' || s.status === 'loading')
    ) {
      return;
    }

    const seq = ++requestSeq;

    // 命中缓存直接切换
    const cached = chainCache.get(industryId);
    if (cached) {
      set({
        currentId: industryId,
        chain: cached,
        status: isChainEmpty(cached) ? 'empty' : 'ready',
        error: null,
      });
      return;
    }

    set({ currentId: industryId, chain: null, status: 'loading', error: null });
    try {
      const detail = await api.chain(industryId);
      const chain = fromApiChainDetail(detail);
      if (seq !== requestSeq) return; // 已有更新的选择，丢弃过期响应
      if (!chain) {
        set({ chain: null, status: 'error', error: '产业数据格式无法识别' });
        return;
      }
      chainCache.set(industryId, chain);
      // 空数据不视为错误：进入 empty 态，由 UI 降级展示空状态
      set({ chain, status: isChainEmpty(chain) ? 'empty' : 'ready' });
    } catch (e) {
      if (seq !== requestSeq) return;
      set({
        chain: null,
        status: 'error',
        error: e instanceof Error ? e.message : '产业链加载失败',
      });
    }
  },

  clearIndustry: () => {
    requestSeq += 1; // 使进行中的请求失效
    set({ currentId: null, chain: null, status: 'idle', error: null });
  },
}));
