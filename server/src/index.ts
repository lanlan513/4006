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

/* ---------------- 国家中心点 GeoJSON ---------------- */

app.get('/api/geo/country-centroids', (_req, res) => {
  const rows = db
    .prepare('SELECT code, name, region, lon, lat FROM countries ORDER BY code')
    .all() as { code: string; name: string; region: string; lon: number; lat: number }[];
  res.json({
    type: 'FeatureCollection',
    features: rows.map((c) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [c.lon, c.lat] },
      properties: { code: c.code, name: c.name, region: c.region },
    })),
  });
});

/* ---------------- 贸易网络 ---------------- */

// 每条贸易流附带主导商品类别：取出口国排名第一的出口商品所属类别，
// 供前端整理为 {source, target, volume, category} 邻接表并按类别着色。
const TRADE_SELECT = `
  SELECT f.exporter, f.importer, f.value,
         COALESCE(p.category, '综合') AS category
  FROM trade_flows f
  LEFT JOIN country_products cp
    ON cp.country_code = f.exporter AND cp.flow_type = 'ex' AND cp.rank = 1
   AND cp.year = (SELECT MAX(year) FROM country_products)
  LEFT JOIN products p ON p.code = cp.product_code`;

app.get('/api/trade', (req, res) => {
  const year = clampYear(Number(req.query.year));
  const focus = req.query.country ? String(req.query.country).toUpperCase() : null;

  let rows: unknown;
  if (focus) {
    rows = db
      .prepare(
        `${TRADE_SELECT}
         WHERE f.year = ? AND (f.exporter = ? OR f.importer = ?)
         ORDER BY f.value DESC`
      )
      .all(year, focus, focus);
  } else {
    rows = db
      .prepare(
        `${TRADE_SELECT}
         WHERE f.year = ?
         ORDER BY f.value DESC LIMIT 72`
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
