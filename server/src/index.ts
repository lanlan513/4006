/**
 * 全球经济图谱 —— 后端 API 服务
 * 提供国家、年度指标、贸易流、商品与产业链的只读接口。
 * 数据层为 SQLite，未来可将数据访问层替换为世界银行 / IMF / WTO 等数据源。
 */
import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Database } from 'better-sqlite3';
import { getDb } from './db.js';
import { REGIONS, YEARS } from './data/countries.js';
import { RESOURCE_ROLE_NOTES } from './data/resourceRoles.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const db = getDb() as Database;

app.use(cors());
app.use(express.json());

const DEFAULT_YEAR = 2023;
const clampYear = (y?: number) => (YEARS.includes(Number(y)) ? Number(y) : DEFAULT_YEAR);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'global-economy-atlas', year: DEFAULT_YEAR });
});

/* ---------------- 元数据 ---------------- */

app.get('/api/meta', (_req, res) => {
  res.json({
    years: YEARS,
    regions: Object.entries(REGIONS).map(([id, name]) => ({ id, name })),
  });
});

/* ---------------- 国家列表（地图用） ---------------- */

app.get('/api/countries', (req, res) => {
  const year = clampYear(Number(req.query.year));
  const rows = db
    .prepare(
      `SELECT c.code, c.name, c.region, c.iso_numeric AS isoNumeric, c.lon, c.lat,
              m.gdp, m.gdp_growth AS gdpGrowth, m.population, m.gdp_per_capita AS gdpPerCapita,
              m.exports, m.imports
       FROM countries c
       LEFT JOIN country_metrics m
         ON m.country_code = c.code AND m.year = ?
       ORDER BY m.gdp DESC NULLS LAST`
    )
    .all(year);
  res.json({ year, countries: rows });
});

/* ---------------- 国家经济画像 ---------------- */

app.get('/api/countries/:code', (req, res) => {
  const code = String(req.params.code).toUpperCase();
  const country = db
    .prepare(
      `SELECT code, name, region, iso_numeric AS isoNumeric, lon, lat
       FROM countries WHERE code = ?`
    )
    .get(code);
  if (!country) return res.status(404).json({ error: 'country not found' });

  const timeseries = db
    .prepare(
      `SELECT year, gdp, gdp_growth AS gdpGrowth, population, gdp_per_capita AS gdpPerCapita,
              exports, imports
       FROM country_metrics WHERE country_code = ? ORDER BY year`
    )
    .all(code);

  const products = db
    .prepare(
      `SELECT cp.flow_type AS flowType, cp.share, cp.rank,
              p.code AS productCode, p.name AS productName, p.category, p.chain_id AS chainId
       FROM country_products cp
       JOIN products p ON p.code = cp.product_code
       WHERE cp.country_code = ?
       ORDER BY cp.flow_type, cp.rank`
    )
    .all(code);

  const latestYear = YEARS[YEARS.length - 1];
  const partnerSql = (side: 'exporter' | 'importer', other: string) =>
    db
      .prepare(
        `SELECT c.code, c.name, f.value
         FROM trade_flows f
         JOIN countries c ON c.code = f.${other}
         WHERE f.${side} = ? AND f.year = ?
         ORDER BY f.value DESC LIMIT 8`
      )
      .all(code, latestYear);

  const partners = {
    // 该国出口的目的地 = 出口伙伴
    exportPartners: partnerSql('exporter', 'importer'),
    // 该国进口的来源地 = 进口伙伴
    importPartners: partnerSql('importer', 'exporter'),
  };

  const chains = db
    .prepare(
      `SELECT DISTINCT vc.id, vc.name, vc.subtitle
       FROM chain_nodes n
       JOIN value_chains vc ON vc.id = n.chain_id
       WHERE n.country_code = ?`
    )
    .all(code);

  res.json({ country, timeseries, products, partners, chains, latestYear });
});

/* ---------------- 贸易网络 ---------------- */

app.get('/api/trade', (req, res) => {
  const year = clampYear(Number(req.query.year));
  const focus = req.query.country ? String(req.query.country).toUpperCase() : null;

  let rows: unknown;
  if (focus) {
    rows = db
      .prepare(
        `SELECT exporter, importer, value
         FROM trade_flows
         WHERE year = ? AND (exporter = ? OR importer = ?)
         ORDER BY value DESC`
      )
      .all(year, focus, focus);
  } else {
    rows = db
      .prepare(
        `SELECT exporter, importer, value
         FROM trade_flows
         WHERE year = ?
         ORDER BY value DESC LIMIT 72`
      )
      .all(year);
  }
  res.json({ year, focus, flows: rows });
});

/* ---------------- 产业链 ---------------- */

app.get('/api/chains', (_req, res) => {
  const rows = db
    .prepare('SELECT id, name, subtitle, description FROM value_chains ORDER BY id')
    .all();
  res.json({ chains: rows });
});

app.get('/api/chains/:id', (req, res) => {
  const id = String(req.params.id);
  const chain = db
    .prepare('SELECT id, name, subtitle, description, stages FROM value_chains WHERE id = ?')
    .get(id) as { stages: string } & Record<string, unknown> | undefined;
  if (!chain) return res.status(404).json({ error: 'chain not found' });

  const nodes = db
    .prepare(
      `SELECT n.country_code AS code, c.name, n.stage, n.role, n.detail, n.weight, c.lon, c.lat
       FROM chain_nodes n
       JOIN countries c ON c.code = n.country_code
       WHERE n.chain_id = ?`
    )
    .all(id);
  const edges = db
    .prepare(
      `SELECT from_code AS "from", to_code AS "to", from_stage AS fromStage,
              to_stage AS toStage, label, value
       FROM chain_edges WHERE chain_id = ?`
    )
    .all(id);

  res.json({
    chain: {
      id: chain.id,
      name: chain.name,
      subtitle: chain.subtitle,
      description: chain.description,
      stages: JSON.parse(chain.stages),
    },
    nodes,
    edges,
  });
});

/* ---------------- 全球资源地图 ---------------- */

app.get('/api/resources', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT r.id, r.name, r.unit, r.color, r.description,
              (SELECT COUNT(*) FROM resource_sites s WHERE s.resource_id = r.id) AS siteCount,
              (SELECT COUNT(*) FROM resource_consumers c WHERE c.resource_id = r.id) AS consumerCount
       FROM resources r
       ORDER BY r.rowid`
    )
    .all();
  res.json({ resources: rows });
});

/** 资源分布图层：产地与消费国分别以 GeoJSON FeatureCollection 返回 */
app.get('/api/resources/:id', (req, res) => {
  const id = String(req.params.id);
  const resource = db
    .prepare('SELECT id, name, unit, color, description FROM resources WHERE id = ?')
    .get(id) as Record<string, unknown> | undefined;
  if (!resource) return res.status(404).json({ error: 'resource not found' });

  const sites = db
    .prepare(
      `SELECT name, country, lon, lat, value
       FROM resource_sites WHERE resource_id = ? ORDER BY value DESC`
    )
    .all(id) as { name: string; country: string; lon: number; lat: number; value: number }[];

  const consumers = db
    .prepare(
      `SELECT rc.country_code AS code, c.name, c.iso_numeric AS isoNumeric, c.lon, c.lat, rc.value
       FROM resource_consumers rc
       JOIN countries c ON c.code = rc.country_code
       WHERE rc.resource_id = ? ORDER BY rc.value DESC`
    )
    .all(id) as { code: string; name: string; isoNumeric: string; lon: number; lat: number; value: number }[];

  /*
   * 三类国家角色动态判定（阈值统一，角色不写死在数据里）：
   *  producer  主要生产国：年产量 ≥ 最大生产国的 6%
   *  exporter  主要出口国：出口比重 ≥ 15%
   *  dependent 高依赖进口国：对外依赖度 ≥ 40%
   */
  const PRODUCER_MIN = 0.06;
  const EXPORTER_MIN = 15;
  const DEPENDENT_MIN = 40;

  const roleRows = db
    .prepare(
      `SELECT rr.country_code AS code, c.name, c.iso_numeric AS isoNumeric,
              rr.annual_production AS annualProduction,
              rr.export_share AS exportShare,
              rr.import_dependency AS importDependency
       FROM resource_country_roles rr
       JOIN countries c ON c.code = rr.country_code
       WHERE rr.resource_id = ?`
    )
    .all(id) as {
    code: string;
    name: string;
    isoNumeric: string;
    annualProduction: number | null;
    exportShare: number | null;
    importDependency: number | null;
  }[];

  const maxProduction = roleRows.reduce(
    (m, r) => Math.max(m, r.annualProduction ?? 0),
    0
  );
  const roles = roleRows
    .map((r) => {
      const roles: string[] = [];
      if (r.annualProduction != null && r.annualProduction >= maxProduction * PRODUCER_MIN) {
        roles.push('producer');
      }
      if (r.exportShare != null && r.exportShare >= EXPORTER_MIN) roles.push('exporter');
      if (r.importDependency != null && r.importDependency >= DEPENDENT_MIN) {
        roles.push('dependent');
      }
      return { ...r, roles };
    })
    .filter((r) => r.roles.length > 0)
    .sort(
      (a, b) =>
        (b.annualProduction ?? 0) - (a.annualProduction ?? 0) ||
        (b.exportShare ?? 0) - (a.exportShare ?? 0)
    );

  res.json({
    resource,
    roles,
    roleNotes: RESOURCE_ROLE_NOTES[id] ?? null,
    production: {
      type: 'FeatureCollection',
      features: sites.map((s) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
        properties: { name: s.name, country: s.country, value: s.value, unit: resource.unit },
      })),
    },
    consumption: {
      type: 'FeatureCollection',
      features: consumers.map((c) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [c.lon, c.lat] },
        properties: { code: c.code, name: c.name, value: c.value, unit: resource.unit },
      })),
    },
  });
});

/* ---------------- 资源贸易运输航线 ---------------- */

/**
 * 某类资源的海上 / 陆路贸易运输航线。
 * waypoints 为途径点 JSON，首点 = 出口地、末点 = 进口地，
 * 前端粒子动画严格沿 waypoints 顺序由出口国流向进口国。
 */
app.get('/api/resources/:id/routes', (req, res) => {
  const id = String(req.params.id);
  const resource = db
    .prepare('SELECT id, name, unit, color, description FROM resources WHERE id = ?')
    .get(id) as Record<string, unknown> | undefined;
  if (!resource) return res.status(404).json({ error: 'resource not found' });

  const rows = db
    .prepare(
      `SELECT route_key AS key, from_name AS "from", to_name AS "to",
              kind, value, waypoints
       FROM resource_routes WHERE resource_id = ?
       ORDER BY value DESC`
    )
    .all(id) as { key: string; from: string; to: string; kind: string; value: number; waypoints: string }[];

  res.json({
    resource,
    routes: rows.map(({ waypoints, ...r }) => ({ ...r, points: JSON.parse(waypoints) })),
  });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'api route not found' });
});

/* ---------------- 生产环境静态资源 ---------------- */

const clientDist = resolve(__dirname, '../../client/dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(resolve(clientDist, 'index.html'));
  });
}

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server] 未处理错误', err);
  res.status(500).json({ error: 'internal server error' });
});

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`[server] 全球经济图谱 API 运行于 http://localhost:${PORT}`);
});
