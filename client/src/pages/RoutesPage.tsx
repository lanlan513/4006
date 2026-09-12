import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import TradeRouteMap, { ROUTE_KIND_LABEL } from '../components/TradeRouteMap';
import { api, ResourceBrief, ResourceRoutes, TradeRouteKind } from '../api';

/** 与航线图层一致的线宽公式：线宽 ∝ √贸易流量 */
const widthOf = (v: number, maxV: number) => 1.1 + 6.5 * Math.sqrt(v / maxV);

const KIND_ORDER: TradeRouteKind[] = ['sea', 'pipe', 'land'];

export default function RoutesPage() {
  const { id } = useParams<{ id: string }>();
  const [resources, setResources] = useState<ResourceBrief[]>([]);
  const [data, setData] = useState<ResourceRoutes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .resources()
      .then((r) => alive && setResources(r.resources))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  /*
   * 切换资源：先把 data 置空，卸载当前航线图层
   *（TradeRouteMap 中旧动画循环随 effect 清理停止并销毁），
   * 再请求并挂载新资源航线，防止跨资源动画叠加导致页面卡顿。
   */
  useEffect(() => {
    if (!id) return;
    let alive = true;
    setData(null);
    setError(null);
    api
      .resourceRoutes(id)
      .then((r) => alive && setData(r))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [id]);

  const routes = useMemo(() => data?.routes ?? [], [data]);
  const topRoutes = routes.slice(0, 8);
  const maxV = routes[0]?.value ?? 1; // 后端已按流量降序
  const minV = routes[routes.length - 1]?.value ?? 0;
  const midV = (maxV + minV) / 2;
  const totalV = Math.round(routes.reduce((s, r) => s + r.value, 0) * 10) / 10;
  const color = data?.resource.color ?? '#fff';
  const unit = data?.resource.unit ?? '';
  const kinds = KIND_ORDER.filter((k) => routes.some((r) => r.kind === k));

  return (
    <div className="page">
      <div className="explore-layout">
        {error && (
          <div className="overlay page-error" role="alert">
            <strong>航线数据加载失败</strong>
            <span>{error}</span>
            <Link to="/routes/oil" className="btn-ghost">
              返回石油航线
            </Link>
          </div>
        )}

        <TradeRouteMap data={data} playing={playing} />

        {/* 资源分类切换 + 图例 */}
        <div className="overlay controls-panel resource-panel">
          <div className="controls-title">资源分类</div>
          <div className="resource-tabs">
            {resources.map((r) => (
              <Link
                key={r.id}
                to={`/routes/${r.id}`}
                className={`resource-tab ${r.id === id ? 'active' : ''}`}
                style={r.id === id ? { borderColor: r.color, color: r.color } : undefined}
              >
                <i style={{ background: r.color }} />
                {r.name}
              </Link>
            ))}
          </div>

          {data && (
            <>
              <p className="resource-desc">{data.resource.description}</p>

              {routes.length > 0 ? (
                <div className="resource-legend">
                  <div className="controls-title" style={{ marginBottom: 6 }}>
                    图例 · 单位：{unit}
                  </div>

                  {/* 线宽 ∝ 贸易流量 */}
                  <div className="lg-block">
                    <svg className="lg-lines" viewBox="0 0 220 34" aria-hidden>
                      <line x1="4" y1="6" x2="118" y2="6" stroke={color} strokeWidth={widthOf(maxV, maxV)} strokeLinecap="round" opacity="0.85" />
                      <line x1="4" y1="17" x2="118" y2="17" stroke={color} strokeWidth={widthOf(midV, maxV)} strokeLinecap="round" opacity="0.85" />
                      <line x1="4" y1="28" x2="118" y2="28" stroke={color} strokeWidth={widthOf(minV, maxV)} strokeLinecap="round" opacity="0.85" />
                      <text x="126" y="9" className="lg-line-value">{maxV}</text>
                      <text x="126" y="20" className="lg-line-value">{Math.round(midV * 10) / 10}</text>
                      <text x="126" y="31" className="lg-line-value">{minV}</text>
                    </svg>
                    <em className="role-hint">连线粗细 ∝ 贸易流量</em>
                  </div>

                  {/* 线型 */}
                  {kinds.includes('sea') && (
                    <span>
                      <svg className="lg-kind" viewBox="0 0 26 6"><line x1="1" y1="3" x2="25" y2="3" stroke={color} strokeWidth="2.2" strokeLinecap="round" /></svg>
                      海运航线（实线）
                    </span>
                  )}
                  {kinds.includes('pipe') && (
                    <span>
                      <svg className="lg-kind" viewBox="0 0 26 6"><line x1="1" y1="3" x2="25" y2="3" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeDasharray="6 4" /></svg>
                      油气管道（长虚线）
                    </span>
                  )}
                  {kinds.includes('land') && (
                    <span>
                      <svg className="lg-kind" viewBox="0 0 26 6"><line x1="1" y1="3" x2="25" y2="3" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeDasharray="1.5 3.5" /></svg>
                      陆路运输（点线）
                    </span>
                  )}

                  {/* 端点与粒子 */}
                  <span>
                    <i className="lg-consumer" style={{ borderColor: color }} />
                    出口地（空心圈）
                  </span>
                  <span>
                    <i className="lg-site" style={{ background: color }} />
                    进口地（实心点）
                  </span>
                  <span>
                    <i className="lg-site lg-particle" style={{ background: '#fff' }} />
                    流动粒子：出口国 → 进口国
                  </span>
                  <em className="role-hint">悬停航线查看流量明细 · 滚轮缩放 / 拖拽平移</em>
                </div>
              ) : (
                <div className="resource-legend">
                  <div className="route-empty">
                    {data.resource.name}以流域内调配利用为主，暂无收录的跨区贸易运输航线。
                  </div>
                </div>
              )}

              {/* 粒子动画开关 */}
              <div className="network-toggle">
                <span>
                  粒子流动画
                  <small>切换资源时自动停止并销毁上一动画循环</small>
                </span>
                <button
                  className={`switch ${playing ? 'on' : ''}`}
                  role="switch"
                  aria-checked={playing}
                  aria-label="粒子流动画开关"
                  onClick={() => setPlaying((p) => !p)}
                />
              </div>
            </>
          )}
        </div>

        {/* 航线排行 */}
        {data && routes.length > 0 && (
          <div className="overlay resource-rank">
            <div className="controls-title">主要运输航线 · 年流量</div>
            {topRoutes.map((r) => (
              <div className="route-rank-row" key={r.key}>
                <div className="route-rank-head">
                  <span className="rank-name" title={`${r.from} → ${r.to}`}>
                    {r.from} → {r.to}
                  </span>
                  <span className={`kind-chip kind-${r.kind}`}>{ROUTE_KIND_LABEL[r.kind]}</span>
                  <span className="rank-value">{r.value}</span>
                </div>
                <span className="rank-bar">
                  <i style={{ width: `${(r.value / maxV) * 100}%`, background: color }} />
                </span>
              </div>
            ))}
            <div className="rank-unit">
              共 {routes.length} 条航线 · 合计约 {totalV} {unit}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
