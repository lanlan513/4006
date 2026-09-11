/** 骨架屏基础元素：所有占位块统一走 shimmer 动画 */

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ width = '100%', height = 14, radius = 4, className = '', style }: SkeletonProps) {
  return (
    <span
      className={`skeleton ${className}`}
      aria-hidden="true"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

/** 文本行占位：可模拟多行段落（最后一行稍短） */
export function SkeletonLines({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton-lines" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={12} width={i === lines - 1 ? '62%' : '100%'} />
      ))}
    </div>
  );
}
