/**
 * 「主要出口商品 + 主要贸易伙伴」组合图表模块。
 *
 * - 出口商品：饼图 / 矩形树图（右上角切换）展示前 8 大商品占出口比，
 *   未单列部分聚合为「其他」，保证合计语义完整；
 * - 贸易伙伴：水平条形图按「出口 + 进口」总额取前 10 位，对比双向贸易额。
 *
 * 交互约定：点击商品扇区 / 方块、伙伴条形或 Y 轴国家名 → 高亮选中（再次点击取消），
 * 并通过 onSelectProduct / onSelectPartner 向上抛出点击事件（取消选中时回传 null）。
 *
 * 边界处理：伙伴名称过长时 Y 轴标签按固定宽度截断（…），悬浮被截断的标签
 * 会弹出完整名称提示，防止文字溢出画布。
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import EChart, { darkTooltip, axisStyle, splitLine } from './EChart';
import type { ChartEventParams } from './EChart';
import type { CountryProduct, Partner } from '../schemas';
import { fmtCompact, fmtTradeB } from '../format';

/** 饼图 / 树图展示的最大商品数，未单列部分聚合为「其他」 */
const TOP_PRODUCTS = 8;
/** 条形图展示的最大伙伴数 */
const TOP_PARTNERS = 10;
/** 「其他」聚合项的伪编码：不可点击、不参与选中 */
const OTHER_CODE = '__other__';
/** Y 轴国家名标签的最大像素宽度，超出由 ECharts 截断为 … */
const AXIS_LABEL_WIDTH = 96;

/** 深色主题下的商品配色盘（与全站金 / 青 / 红基调一致），末位灰色固定留给「其他」 */
const PRODUCT_COLORS = ['#e0a94f', '#57a9c9', '#4e8571', '#d07a6e', '#7c9cc9', '#9a86c8', '#a8a25e', '#5ba395'];
const OTHER_COLOR = '#5b6675';
/** 出口 / 进口条形配色（与趋势图同口径） */
const EXPORT_COLOR = '#57a9c9';
const IMPORT_COLOR = 'rgba(208,122,110,0.85)';

interface ProductSlice {
  code: string; // 商品编码（「其他」为 OTHER_CODE）
  name: string;
  share: number; // 占出口比 %
  color: string;
  product: CountryProduct | null; // 「其他」无对应商品实体
}

interface MergedPartner {
  code: string;
  name: string;
  exportValue: number; // 本国 → 伙伴 的出口额，美元
  importValue: number; // 本国 ← 伙伴 的进口额，美元
  total: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

let measureCtx: CanvasRenderingContext2D | null = null;
/** 以与 Y 轴标签一致的字号（axisStyle.axisLabel: 11px sans-serif）测量文本像素宽度，判断标签是否被截断 */
function measureLabelWidth(text: string): number {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  if (!measureCtx) return 0;
  measureCtx.font = '11px sans-serif';
  return measureCtx.measureText(text).width;
}

/** 出口商品 → 图表切片：按占比降序取前 N，剩余份额（含未单列商品）聚合为「其他」补足到 100% */
function buildProductSlices(products: CountryProduct[]): ProductSlice[] {
  const exports = products
    .filter((p) => p.flowType === 'ex')
    .sort((a, b) => b.share - a.share);
  const top = exports.slice(0, TOP_PRODUCTS);
  const slices: ProductSlice[] = top.map((p, i) => ({
    code: p.productCode,
    name: p.productName,
    share: p.share,
    color: PRODUCT_COLORS[i % PRODUCT_COLORS.length],
    product: p,
  }));
  const otherShare = round1(100 - top.reduce((s, p) => s + p.share, 0));
  if (otherShare > 0.05) {
    slices.push({ code: OTHER_CODE, name: '其他', share: otherShare, color: OTHER_COLOR, product: null });
  }
  return slices;
}

/** 出口 / 进口两个伙伴榜单按国家合并，按进出口总额降序取前 N */
function mergePartners(partners: { exportPartners: Partner[]; importPartners: Partner[] }): MergedPartner[] {
  const map = new Map<string, MergedPartner>();
  for (const p of partners.exportPartners) {
    map.set(p.code, { code: p.code, name: p.name, exportValue: p.value, importValue: 0, total: p.value });
  }
  for (const p of partners.importPartners) {
    const m = map.get(p.code);
    if (m) {
      m.importValue = p.value;
      m.total += p.value;
    } else {
      map.set(p.code, { code: p.code, name: p.name, exportValue: 0, importValue: p.value, total: p.value });
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, TOP_PARTNERS);
}

export default function TradeComboCharts({ products, partners, year, onSelectProduct, onSelectPartner }: {
  products: CountryProduct[];
  partners: { exportPartners: Partner[]; importPartners: Partner[] };
  year: number;
  /** 点击商品切片时上抛：选中传商品实体，取消选中传 null（「其他」不触发） */
  onSelectProduct?: (product: CountryProduct | null) => void;
  /** 点击伙伴条形 / 国家名时上抛：选中传伙伴（value 为进出口总额），取消选中传 null */
  onSelectPartner?: (partner: Partner | null) => void;
}) {
  const [view, setView] = useState<'pie' | 'treemap'>('pie');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  /** 被截断的 Y 轴标签的悬浮提示（相对图表容器的坐标 + 完整名称） */
  const [labelTip, setLabelTip] = useState<{ x: number; y: number; text: string } | null>(null);

  const slices = useMemo(() => buildProductSlices(products), [products]);
  const merged = useMemo(() => mergePartners(partners), [partners]);

  const pickProduct = (code: string | null) => {
    setSelectedProduct(code);
    onSelectProduct?.(slices.find((s) => s.code === code)?.product ?? null);
  };
  const pickPartner = (code: string | null) => {
    setSelectedPartner(code);
    setLabelTip(null); // 选中变化时收起可能悬停的截断标签提示
    const m = merged.find((d) => d.code === code);
    onSelectPartner?.(m ? { code: m.code, name: m.name, value: m.total } : null);
  };

  /* ---------------- 出口商品：饼图 / 矩形树图 ---------------- */

  const productTooltip = {
    ...darkTooltip,
    formatter: (p: { name: string; value: number; marker: string }) =>
      `${p.marker} ${p.name}<br/>占出口比重 <b>${p.value}%</b>`,
  };

  const pieOption = {
    tooltip: productTooltip,
    series: [
      {
        type: 'pie',
        radius: ['36%', '66%'],
        center: ['50%', '52%'],
        selectedMode: 'single',
        selectedOffset: 8,
        itemStyle: { borderColor: '#10151e', borderWidth: 2, borderRadius: 4 },
        label: { color: '#8b97a9', fontSize: 11, formatter: '{b} {c}%' },
        labelLine: { lineStyle: { color: 'rgba(150,175,205,0.35)' } },
        emphasis: { scale: true, scaleSize: 4, label: { color: '#e6ebf2', fontWeight: 600 } },
        data: slices.map((s) => ({
          name: s.name,
          value: s.share,
          selected: s.code === selectedProduct,
          itemStyle: { color: s.color },
        })),
      },
    ],
  };

  const treemapOption = {
    tooltip: productTooltip,
    series: [
      {
        type: 'treemap',
        left: 2, top: 2, right: 2, bottom: 2,
        roam: false,
        nodeClick: false, // 关闭默认下钻，点击语义统一为「选中」
        breadcrumb: { show: false },
        label: { show: true, formatter: '{b}\n{c}%', fontSize: 11, color: 'rgba(10,14,20,0.9)', fontWeight: 600 },
        itemStyle: { borderColor: '#10151e', borderWidth: 1, gapWidth: 2 },
        data: slices.map((s) => ({
          name: s.name,
          value: s.share,
          itemStyle: {
            color: s.color,
            // 选中项以亮色描边高亮（树图无 pie 的 selected 状态，用边框表达）
            ...(s.code === selectedProduct ? { borderColor: '#e6ebf2', borderWidth: 2.5 } : {}),
          },
        })),
      },
    ],
  };

  // 点击扇区 / 方块切换选中；「其他」为聚合项，不触发选中与上抛事件
  const productEvents = {
    click: (p: ChartEventParams) => {
      const item = slices[p.dataIndex ?? -1];
      if (!item || item.code === OTHER_CODE) return;
      pickProduct(item.code === selectedProduct ? null : item.code);
    },
  };

  /* ---------------- 贸易伙伴：水平条形图 ---------------- */

  // 有选中项时压低其余条形的透明度，形成高亮对比
  const barItem = (m: MergedPartner, color: string) => ({
    color,
    opacity: selectedPartner === null || m.code === selectedPartner ? 1 : 0.22,
    borderRadius: [0, 3, 3, 0],
  });

  const barOption = {
    tooltip: {
      trigger: 'axis',
      ...darkTooltip,
      axisPointer: { type: 'shadow' },
      // axisValue 为完整国家名（不受 Y 轴标签截断影响）
      formatter: (items: Array<{ axisValue: string; marker: string; seriesName: string; value: number }>) =>
        `<b>${items[0]?.axisValue ?? ''}</b><br/>` +
        items.map((it) => `${it.marker} ${it.seriesName}：${fmtTradeB(it.value)}`).join('<br/>'),
    },
    legend: { data: ['出口到该伙伴', '自该伙伴进口'], textStyle: { color: '#8b97a9' }, top: 0, right: 0 },
    grid: { left: 8, right: 30, top: 30, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      ...axisStyle,
      splitLine,
      axisLabel: { ...axisStyle.axisLabel, formatter: (v: number) => `$${fmtCompact(v)}` },
    },
    yAxis: {
      type: 'category',
      ...axisStyle,
      data: merged.map((m) => m.name),
      inverse: true, // 总额最大者排在最上方
      triggerEvent: true, // 让轴标签可响应点击 / 悬浮（截断标签的 Tooltip 依赖此开关）
      axisLabel: {
        ...axisStyle.axisLabel,
        width: AXIS_LABEL_WIDTH,
        overflow: 'truncate', // 名称过长时截断为 …，防止文字溢出画布
      },
    },
    series: [
      {
        name: '出口到该伙伴',
        type: 'bar',
        barMaxWidth: 10,
        data: merged.map((m) => ({ value: m.exportValue, itemStyle: barItem(m, EXPORT_COLOR) })),
      },
      {
        name: '自该伙伴进口',
        type: 'bar',
        barMaxWidth: 10,
        data: merged.map((m) => ({ value: m.importValue, itemStyle: barItem(m, IMPORT_COLOR) })),
      },
    ],
  };

  const togglePartnerByName = (name: unknown) => {
    const m = merged.find((d) => d.name === name);
    if (m) pickPartner(m.code === selectedPartner ? null : m.code);
  };

  const partnerEvents = {
    click: [
      // 点击条形：dataIndex 与 merged 顺序一致
      {
        query: { componentType: 'series' },
        handler: (p: ChartEventParams) => {
          const m = merged[p.dataIndex ?? -1];
          if (m) pickPartner(m.code === selectedPartner ? null : m.code);
        },
      },
      // 点击 Y 轴国家名：与点击条形等效
      { query: { componentType: 'yAxis' }, handler: (p: ChartEventParams) => togglePartnerByName(p.value) },
    ],
    // 悬浮被截断的 Y 轴标签：在标签左侧弹出完整名称（未截断时不提示，避免冗余浮层）
    mouseover: {
      query: { componentType: 'yAxis' },
      handler: (p: ChartEventParams) => {
        const name = typeof p.value === 'string' ? p.value : '';
        if (!name || measureLabelWidth(name) <= AXIS_LABEL_WIDTH) {
          setLabelTip(null);
          return;
        }
        setLabelTip({ x: p.event?.offsetX ?? 0, y: p.event?.offsetY ?? 0, text: name });
      },
    },
    mouseout: { query: { componentType: 'yAxis' }, handler: () => setLabelTip(null) },
    globalout: () => setLabelTip(null),
  };

  /* ---------------- 渲染 ---------------- */

  const selectedSlice = slices.find((s) => s.code === selectedProduct) ?? null;
  const selectedMerged = merged.find((m) => m.code === selectedPartner) ?? null;
  // 条形图高度随伙伴数量伸缩，避免行数少时大片留白
  const barHeight = Math.max(230, merged.length * 30 + 70);

  return (
    <>
      <div className="section-title">贸易结构图解（{year} 年）</div>
      <div className="chart-grid">
        <div className="chart-card">
          <div className="chart-card-head">
            <div>
              <h4>主要出口商品</h4>
              <p>前 {Math.min(TOP_PRODUCTS, slices.length)} 大商品占出口比 · 点击图形高亮，再次点击取消</p>
            </div>
            <div className="chart-toggle" role="tablist">
              <button type="button" className={view === 'pie' ? 'active' : ''} onClick={() => setView('pie')}>
                饼图
              </button>
              <button type="button" className={view === 'treemap' ? 'active' : ''} onClick={() => setView('treemap')}>
                树图
              </button>
            </div>
          </div>
          {slices.length === 0 ? (
            <div className="chart-fallback" role="status">暂无出口商品结构数据。</div>
          ) : (
            <EChart option={view === 'pie' ? pieOption : treemapOption} height={300} onEvents={productEvents} />
          )}
          {selectedSlice && (
            <div className="chart-pick" role="status">
              <i className="chart-pick-dot" style={{ background: selectedSlice.color }} />
              <b>{selectedSlice.name}</b>
              <span>占出口 {selectedSlice.share}%</span>
              {selectedSlice.product?.chainId && (
                <Link className="chart-pick-link" to={`/chain/${selectedSlice.product.chainId}`}>
                  查看产业链 →
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="chart-card">
          <h4>主要贸易伙伴</h4>
          <p>按进出口总额取前 {merged.length} 位 · 点击条形或国家名高亮</p>
          {merged.length === 0 ? (
            <div className="chart-fallback" role="status">{year} 年暂无贸易伙伴数据。</div>
          ) : (
            <div className="bar-wrap">
              <EChart option={barOption} height={barHeight} onEvents={partnerEvents} />
              {labelTip && (
                <div className="axis-label-tip" style={{ left: labelTip.x - 8, top: labelTip.y }}>
                  {labelTip.text}
                </div>
              )}
            </div>
          )}
          {selectedMerged && (
            <div className="chart-pick" role="status">
              <b>{selectedMerged.name}</b>
              <span>
                出口 {fmtTradeB(selectedMerged.exportValue)} · 进口 {fmtTradeB(selectedMerged.importValue)}
              </span>
              <Link className="chart-pick-link" to={`/country/${selectedMerged.code}?year=${year}`}>
                查看该国画像 →
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
