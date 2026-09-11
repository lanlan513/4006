/**
 * 产业链领域模型 —— 可扩展的产业数据结构。
 *
 * 设计约定：
 * - 一条产业链 = 元信息 + 有序环节 + 节点列表 + 有向边列表；
 * - 节点与边只通过节点 ID 关联，国家、环节均为节点的属性；
 * - 环节类型是开放字符串：新增环节（如「物流」「回收」）只需数据声明，
 *   不需要修改任何类型或 UI 代码；
 * - 新增一条产业链 = 新增一份符合 IndustryChain 结构的 JSON，
 *   UI 渲染完全由数据驱动。
 */

/**
 * 环节类型（原材料 / 加工 / 组装 …）。
 * 刻意保持为开放字符串：环节集合由数据自行声明（见 IndustryChain.segments），
 * 类型层不做封闭枚举，为后续产业扩展留出空间。
 */
export type SegmentType = string;

/** 常见环节类型的约定值（仅为便于对照的约定，不构成封闭集合） */
export const SEGMENT = {
  RAW_MATERIAL: 'raw_material', // 原材料
  PROCESSING: 'processing', // 加工
  ASSEMBLY: 'assembly', // 组装
  CONSUMPTION: 'consumption', // 消费
} as const;

/** 环节定义：key 为数据标识，label 为展示名（由数据提供，UI 不硬编码） */
export interface IndustrySegment {
  key: SegmentType;
  label: string;
}

/** 产业链节点：某国家在某环节上的角色 */
export interface IndustryNode {
  /** 节点唯一 ID，边通过它引用节点 */
  id: string;
  /** 国家代码（ISO 3166-1 alpha-3） */
  country: string;
  /** 国家展示名 */
  countryName: string;
  /** 环节类型（原材料 / 加工 / 组装 …） */
  segment: SegmentType;
  /** 节点角色简述 */
  role: string;
  /** 详细描述 */
  detail: string;
  /** 相对量级（约定 1-10），用于节点大小 */
  weight: number;
  lon: number;
  lat: number;
}

/** 单向贸易边：从源节点到目标节点的一次货物流动 */
export interface IndustryEdge {
  id: string;
  /** 源节点 ID */
  source: string;
  /** 目标节点 ID */
  target: string;
  /** 贸易量（相对量级，约定 1-10；0 表示未知） */
  volume: number;
  /** 货物标签 */
  label: string;
}

/** 单条产业链 */
export interface IndustryChain {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  /** 有序环节列表：决定流程图的列顺序与配色，由数据声明 */
  segments: IndustrySegment[];
  nodes: IndustryNode[];
  edges: IndustryEdge[];
}

/** 产业目录条目：产业切换器等列表 UI 的唯一数据源 */
export interface IndustryMeta {
  id: string;
  name: string;
  subtitle: string;
}

/**
 * 产业链加载状态机：
 * idle → loading → ready（有数据）/ empty（数据为空，优雅降级）/ error（加载失败）
 */
export type IndustryStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';
