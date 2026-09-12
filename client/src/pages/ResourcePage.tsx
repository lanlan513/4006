import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ResourceMap from '../components/ResourceMap';
import ResourceRolePanel from '../components/ResourceRolePanel';
import { ROLE_META } from '../components/resourceRoles';
import { api, ResourceBrief, ResourceDetail } from '../api';

export default function ResourcePage() {
  const { id } = useParams<{ id: string }>();
  const [resources, setResources] = useState<ResourceBrief[]>([]);
  const [detail, setDetail] = useState<ResourceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  /*
   * 资源节点交互状态：
   *  - selectedCode === null 且 detail.roles 未激活 → 底图默认样式
   *  - 点击任一资源节点后 active=true，三类角色国家按颜色标注，浮层面板展开
   *  - 点击空白区域 / 切换资源 → active=false、selectedCode=null，
   *    所有国家标记随 roles 清空一并移除，底图恢复默认样式
   */
  const [active, setActive] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

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
   * 切换资源：先把 detail 置空，卸载当前图层的点位与热力数据
   * （ResourceMap 中旧点位随 React 卸载、热力图层由管理器 unmount），
   * 同时清除全部国家角色标记，再请求并挂载新资源图层，防止跨资源数据叠加。
   */
  useEffect(() => {
    if (!id) return;
    let alive = true;
    setDetail(null);
    setActive(false);
    setSelectedCode(null);
    setError(null);
    api
      .resource(id)
      .then((r) => alive && setDetail(r))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [id]);

  const topSites = useMemo(
    () => (detail ? detail.production.features.slice(0, 5) : []),
    [detail]
  );
  const topConsumers = useMemo(
    () => (detail ? detail.consumption.features.slice(0, 5) : []),
    [detail]
  );
  const maxSite = topSites[0]?.properties.value ?? 1;
  const maxConsumer = topConsumers[0]?.properties.value ?? 1;
  const color = detail?.resource.color ?? '#fff';

  const roles = active ? detail?.roles ?? [] : [];
  const selectedValid = selectedCode && roles.some((r) => r.code === selectedCode) ? selectedCode : null;

  /* 点击资源节点：激活标注并选中目标国家（无匹配时默认首位主要生产国） */
  const handleActivate = (code: string | null) => {
    if (!detail || detail.roles.length === 0) return;
    setActive(true);
    setSelectedCode(code && detail.roles.some((r) => r.code === code) ? code : detail.roles[0].code);
  };
  /* 点击空白：清除全部国家标记，恢复底图默认样式 */
  const handleClear = () => {
    setActive(false);
    setSelectedCode(null);
  };

  return (
    <div className="page">
      <div className="explore-layout">
        {error && (
          <div className="overlay page-error" role="alert">
            <strong>资源数据加载失败</strong>
            <span>{error}</span>
            <Link to="/resources/oil" className="btn-ghost">
              返回石油图层
            </Link>
          </div>
        )}

        <ResourceMap
          detail={detail}
          roles={roles}
          selectedCode={selectedValid}
          onActivate={handleActivate}
          onSelectRole={(code) => {
            setActive(true);
            setSelectedCode(code);
          }}
          onClear={handleClear}
        />

        {/* 资源分类切换 */}
        <div className="overlay controls-panel resource-panel">
          <div className="controls-title">资源分类</div>
          <div className="resource-tabs">
            {resources.map((r) => (
              <Link
                key={r.id}
                to={`/resources/${r.id}`}
                className={`resource-tab ${r.id === id ? 'active' : ''}`}
                style={r.id === id ? { borderColor: r.color, color: r.color } : undefined}
              >
                <i style={{ background: r.color }} />
                {r.name}
              </Link>
            ))}
          </div>

          {detail && (
            <>
              <p className="resource-desc">{detail.resource.description}</p>
              <div className="resource-legend">
                <div className="controls-title" style={{ marginBottom: 6 }}>
                  图例 · 单位：{detail.resource.unit}
                </div>
                <span>
                  <i className="lg-site" style={{ background: color }} />
                  产地（圆点大小 = 生产量）
                </span>
                <span>
                  <i className="lg-consumer" style={{ borderColor: color }} />
                  主要消费国（圆环 = 消费量）
                </span>
                <span>
                  <i className="lg-heat" style={{ background: color }} />
                  资源富集热力
                </span>
              </div>

              {/* 角色标注图例：点击资源节点后出现 */}
              {active && (
                <div className="resource-legend role-legend">
                  <div className="controls-title" style={{ marginBottom: 6 }}>
                    国家角色标注
                  </div>
                  <span>
                    <i className="lg-role" style={{ background: ROLE_META.producer.color }} />
                    {ROLE_META.producer.label}（填充）
                  </span>
                  <span>
                    <i className="lg-role lg-role-dash" style={{ borderColor: ROLE_META.exporter.color }} />
                    {ROLE_META.exporter.label}（虚线描边）
                  </span>
                  <span>
                    <i className="lg-role lg-role-dot" style={{ borderColor: ROLE_META.dependent.color }} />
                    {ROLE_META.dependent.label}（点状描边）
                  </span>
                  <em className="role-hint">点击任意资源节点查看角色 · 点空白清除</em>
                </div>
              )}
              {!active && (
                <em className="role-hint">点击地图上的资源节点，标注生产 / 出口 / 高依赖国</em>
              )}
            </>
          )}
        </div>

        {/* 角色浮层面板：激活后滑入，与右侧排行面板错位（左侧中下部） */}
        {active && detail && (
          <ResourceRolePanel
            detail={detail}
            roles={roles}
            selectedCode={selectedValid}
            onSelect={setSelectedCode}
            onClose={handleClear}
          />
        )}

        {/* 排行面板 */}
        {detail && (
          <div className="overlay resource-rank">
            <div className="controls-title">主要产地 · 生产量</div>
            {topSites.map((f) => (
              <div className="rank-row" key={f.properties.name}>
                <span className="rank-name" title={`${f.properties.name} · ${f.properties.country ?? ''}`}>
                  {f.properties.name}
                </span>
                <span className="rank-bar">
                  <i style={{ width: `${(f.properties.value / maxSite) * 100}%`, background: color }} />
                </span>
                <span className="rank-value">{f.properties.value}</span>
              </div>
            ))}
            <div className="controls-title" style={{ marginTop: 14 }}>
              主要消费国 · 消费量
            </div>
            {topConsumers.map((f) => (
              <div className="rank-row" key={f.properties.code}>
                <span className="rank-name">{f.properties.name}</span>
                <span className="rank-bar">
                  <i
                    style={{
                      width: `${(f.properties.value / maxConsumer) * 100}%`,
                      background: color,
                    }}
                  />
                </span>
                <span className="rank-value">{f.properties.value}</span>
              </div>
            ))}
            <div className="rank-unit">单位：{detail.resource.unit}</div>
          </div>
        )}
      </div>
    </div>
  );
}
