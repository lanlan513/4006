/**
 * 数据库播种脚本：将 src/data 下整理的种子数据写入 SQLite。
 * 运行方式：npm run seed -w server（服务首次启动时也会自动播种）。
 */
import Database from 'better-sqlite3';
import { existsSync, rmSync } from 'node:fs';
import { COUNTRIES, YEARS } from './data/countries.js';
import { METRICS } from './data/metrics.js';
import { TRADE_FLOWS } from './data/trade.js';
import { PRODUCTS, COUNTRY_PRODUCTS } from './data/products.js';
import { CHAINS } from './data/chains.js';
import { DB_PATH, getDb } from './db.js';

/** 在三个锚点年份 (2000 / 2010 / 2023) 之间线性插值 */
function interp(year: number, anchors: [number, number, number]): number {
  const ys = [2000, 2010, 2023];
  if (year <= ys[0]) return anchors[0];
  if (year >= ys[2]) return anchors[2];
  let k = 0;
  while (year > ys[k + 1]) k++;
  const t = (year - ys[k]) / (ys[k + 1] - ys[k]);
  return anchors[k] + (anchors[k + 1] - anchors[k]) * t;
}

const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

export function seedAll(db: Database.Database) {
  db.exec('PRAGMA foreign_keys = OFF');
  const tx = db.transaction(() => {
    db.exec(`
      DELETE FROM chain_edges; DELETE FROM chain_nodes; DELETE FROM value_chains;
      DELETE FROM country_products; DELETE FROM products;
      DELETE FROM trade_flows; DELETE FROM country_metrics; DELETE FROM countries;
    `);

    // 国家
    const insCountry = db.prepare(
      'INSERT INTO countries (code, name, region, iso_numeric, lon, lat) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const c of COUNTRIES) {
      insCountry.run(c.code, c.name, c.region, c.iso, c.lon, c.lat);
    }

    // 宏观指标
    const insMetric = db.prepare(
      `INSERT INTO country_metrics
       (country_code, year, gdp, gdp_growth, population, gdp_per_capita, exports, imports,
        pop_growth, aging_rate, urban_rate, labor_force)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const m of METRICS) {
      YEARS.forEach((year, i) => {
        const gdp = m.gdp[i] * 1e12;
        const pop = m.pop[i] * 1e6;
        const exportsUsd = interp(year, m.ex) * 1e9;
        const importsUsd = interp(year, m.im) * 1e9;
        insMetric.run(
          m.code,
          year,
          round(gdp),
          round(m.growth[i], 1),
          round(pop),
          round(gdp / pop),
          round(exportsUsd),
          round(importsUsd),
          round(m.popGrowth[i], 1),
          round(m.aging[i], 1),
          round(m.urban[i], 1),
          round(m.labor[i] * 1e6)
        );
      });
    }

    // 贸易流
    const insFlow = db.prepare(
      'INSERT INTO trade_flows (year, exporter, importer, value) VALUES (?, ?, ?, ?)'
    );
    for (const [exporter, importer, a, b, c] of TRADE_FLOWS) {
      for (const year of YEARS) {
        const value = interp(year, [a, b, c]) * 1e9;
        insFlow.run(year, exporter, importer, round(value));
      }
    }

    // 商品
    const insProduct = db.prepare(
      'INSERT INTO products (code, name, category, chain_id) VALUES (?, ?, ?, ?)'
    );
    for (const p of PRODUCTS) insProduct.run(p.code, p.name, p.category, p.chainId);

    // 各国主要进出口商品（2023 结构）
    const insCp = db.prepare(
      `INSERT INTO country_products (country_code, product_code, year, flow_type, share, rank)
       VALUES (?, ?, 2023, ?, ?, ?)`
    );
    const rankOf = new Map<string, number>();
    for (const [code, flow, product, share] of COUNTRY_PRODUCTS) {
      const key = `${code}:${flow}`;
      const rank = (rankOf.get(key) ?? 0) + 1;
      rankOf.set(key, rank);
      insCp.run(code, product, flow, share, rank);
    }

    // 产业链
    const insChain = db.prepare(
      'INSERT INTO value_chains (id, name, subtitle, description, stages) VALUES (?, ?, ?, ?, ?)'
    );
    const insNode = db.prepare(
      `INSERT INTO chain_nodes (chain_id, country_code, stage, role, detail, weight)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    const insEdge = db.prepare(
      `INSERT INTO chain_edges (chain_id, from_code, to_code, from_stage, to_stage, label, value)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    for (const ch of CHAINS) {
      insChain.run(ch.id, ch.name, ch.subtitle, ch.description, JSON.stringify(ch.stages));
      for (const n of ch.nodes) {
        insNode.run(ch.id, n.code, n.stage, n.role, n.detail, n.weight);
      }
      for (const e of ch.edges) {
        insEdge.run(ch.id, e.from, e.to, e.fromStage, e.toStage, e.label, e.value);
      }
    }
  });
  tx();
  db.exec('PRAGMA foreign_keys = ON');
}

/** 独立运行：删除旧库后重新播种 */
const isMain = process.argv[1] && process.argv[1].endsWith('seed.ts');
if (isMain) {
  for (const f of [DB_PATH, DB_PATH + '-wal', DB_PATH + '-shm']) {
    if (existsSync(f)) rmSync(f);
  }
  const db = getDb();
  const metrics = db.prepare('SELECT COUNT(*) AS c FROM country_metrics').get() as { c: number };
  const flows = db.prepare('SELECT COUNT(*) AS c FROM trade_flows').get() as { c: number };
  const nodes = db.prepare('SELECT COUNT(*) AS c FROM chain_nodes').get() as { c: number };
  console.log(`播种完成：${metrics.c} 条国家年度指标，${flows.c} 条贸易流，${nodes.c} 个产业链节点。`);
  db.close();
}
