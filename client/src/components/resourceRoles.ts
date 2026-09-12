/**
 * 资源—国家角色标注的共享配置。
 * 三种角色使用固定语义色，与具体资源的主题色区分：
 *  - producer  主要生产国：绿色填充
 *  - exporter  主要出口国：青色虚线描边
 *  - dependent 高依赖进口国：红色点状描边
 */
import type { ResourceRoleKey } from '../api';

export const ROLE_META: Record<
  ResourceRoleKey,
  { label: string; short: string; color: string }
> = {
  producer: { label: '主要生产国', short: '生产', color: '#7fb069' },
  exporter: { label: '主要出口国', short: '出口', color: '#57c9e0' },
  dependent: { label: '高依赖进口国', short: '高依赖', color: '#e07a5f' },
};

/** 多角色国家的主角色优先级（决定填充色） */
export const ROLE_PRIORITY: ResourceRoleKey[] = ['producer', 'exporter', 'dependent'];

export function hexToRgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export const primaryRole = (roles: ResourceRoleKey[]): ResourceRoleKey =>
  ROLE_PRIORITY.find((r) => roles.includes(r)) ?? roles[0];

export const roleLabel = (key: ResourceRoleKey): string => ROLE_META[key].label;
