# 全球经济图谱

一个基于 React、Vite、Express 和 SQLite 的全球经济数据可视化 MVP。当前使用 `server/src/data` 中整理的近似示例数据，数据说明和页面口径以“示例数据集”为准，不代表实时统计发布。

## 当前功能

### 探索地图

- 世界地图展示已收录经济体。
- 按 GDP 总量、人均 GDP、贸易额、GDP 增速切换着色指标。
- 时间轴支持 2000、2005、2010、2015、2020、2023 六个年度切换。
- 支持播放时间轴，观察指标和全球经济规模变化。
- 点击国家查看年度经济概览，并进入国家画像。
- 地图缩放、拖拽和悬浮提示。
- 打开全球贸易网络后，展示主要双边贸易流；选中国家后可聚焦其贸易伙伴。

### 国家经济画像

- 统一通过 `GET /api/country-profile?countryCode=ISO3&year=YYYY` 获取画像数据。
- 国家来自路由参数 `/country/:code`；年份以全局时间轴状态（zustand）为唯一数据源，URL 的 `?year=` 仅在进入页面 / 路由跳转 / 浏览器前进后退时初始化它，全局切换年份会即时生效并 replace 回地址栏。
- 无论在画像页内切换国家（伙伴国跳转）还是全局切换年份，都会重新触发 `/api/country-profile` 请求（hook 带竞态保护，深链进入不会先用旧年份多发一次请求）。
- 加载期间展示骨架屏（Skeleton）；404 未知国家与该年度空数据展示友好空态（Empty State），页面不会抛出 undefined 异常。
- 返回数据经 Zod Schema（`client/src/schemas.ts`）校验，核心字段包含国家基本信息、GDP、人口、贸易总额（`summary.tradeTotal = 出口 + 进口`）。
- 展示最新年度 GDP、人均 GDP、人口、出口、进口和贸易差额。
- 展示 GDP、出口与进口、实际 GDP 增速的历史图表。
- 展示主要出口商品、进口商品和主要贸易伙伴。
- 支持从贸易伙伴跳转到伙伴国画像。
- 支持从关联商品跳转到汽车、锂电池、半导体、粮食、石油和手机产业链。

### 全球产业链

- 提供汽车、锂电池、半导体、粮食、石油和手机六类产业链。
- 用阶段流程图展示国家在不同环节的角色。
- 用全球地图展示产业链节点和跨阶段流向。
- 点击节点进入对应国家画像。

## 运行

```bash
npm install
npm run dev
```

- 前端开发地址：`http://localhost:5173`
- 后端 API：`http://localhost:4000`
- 健康检查：`http://localhost:4000/api/health`

生产构建：

```bash
npm run build
npm start
```

数据库首次启动时会自动创建并播种到 `server/data/app.db`。如需重建示例数据：

```bash
npm run seed
```

## 目录结构

```text
client/src/
  components/   地图、图表、时间轴、骨架屏、空态、产业链流程等可复用组件
  hooks/        画像页数据请求 hook 与 URL/全局状态同步 hook（countryCode/year 监听 + 竞态保护）
  pages/        探索地图、国家画像、产业链页面
  api.ts        前端 API 类型和请求层（含 Zod 校验封装与错误分类）
  schemas.ts    接口返回数据的 Zod Schema
  store.ts      年份、选中国家、指标和贸易网络状态
server/src/
  index.ts      Express API 和生产静态资源入口
  db.ts         SQLite schema 和数据库初始化
  seed.ts       数据播种脚本
  data/         国家、指标、贸易、商品和产业链示例数据
```

## 已处理的基础问题

- 接口连接失败、未知国家和未知产业链不再无限停留在加载状态。
- 地图点击贸易弧线不会误清空当前选中的国家。
- 时间轴默认年份会根据后端元数据校正。
- 空数据时图例不会显示 `Infinity`。
- 后端增加 `/api/health` 和 API 未匹配路由的 JSON 错误响应。
