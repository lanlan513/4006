import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedAll } from './seed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DB_PATH = resolve(__dirname, '../data/app.db');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS countries (
  code        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  region      TEXT NOT NULL,
  iso_numeric TEXT NOT NULL,
  lon         REAL NOT NULL,
  lat         REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS country_metrics (
  country_code   TEXT NOT NULL REFERENCES countries(code),
  year           INTEGER NOT NULL,
  gdp            REAL,        -- 名义 GDP，现价美元
  gdp_growth     REAL,        -- 实际 GDP 增速 %
  population     REAL,        -- 人口（人）
  gdp_per_capita REAL,        -- 人均 GDP，美元
  exports        REAL,        -- 货物出口额，美元
  imports        REAL,        -- 货物进口额，美元
  pop_growth     REAL,        -- 人口年增长率 %
  aging_rate     REAL,        -- 老龄化率（65+ 占比 %）
  urban_rate     REAL,        -- 城市化率（城镇人口占比 %）
  labor_force    REAL,        -- 劳动力规模（人）
  youth_rate     REAL,        -- 0-14 岁人口占比 %（15-64 岁占比 = 100 − youth − aging）
  PRIMARY KEY (country_code, year)
);

CREATE TABLE IF NOT EXISTS trade_flows (
  year      INTEGER NOT NULL,
  exporter  TEXT NOT NULL REFERENCES countries(code),
  importer  TEXT NOT NULL REFERENCES countries(code),
  value     REAL NOT NULL,    -- 双边出口额，美元
  PRIMARY KEY (year, exporter, importer)
);
CREATE INDEX IF NOT EXISTS idx_trade_exporter ON trade_flows(year, exporter);
CREATE INDEX IF NOT EXISTS idx_trade_importer ON trade_flows(year, importer);

CREATE TABLE IF NOT EXISTS products (
  code      TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  category  TEXT NOT NULL,
  chain_id  TEXT REFERENCES value_chains(id)
);

CREATE TABLE IF NOT EXISTS country_products (
  country_code TEXT NOT NULL REFERENCES countries(code),
  product_code TEXT NOT NULL REFERENCES products(code),
  year         INTEGER NOT NULL,
  flow_type    TEXT NOT NULL CHECK (flow_type IN ('ex', 'im')),
  share        REAL NOT NULL,  -- 占该国出/进口总额 %
  rank         INTEGER NOT NULL,
  PRIMARY KEY (country_code, product_code, year, flow_type)
);

CREATE TABLE IF NOT EXISTS value_chains (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  subtitle    TEXT NOT NULL,
  description TEXT NOT NULL,
  stages      TEXT NOT NULL    -- JSON: [{key,label}]
);

CREATE TABLE IF NOT EXISTS chain_nodes (
  chain_id     TEXT NOT NULL REFERENCES value_chains(id),
  country_code TEXT NOT NULL REFERENCES countries(code),
  stage        TEXT NOT NULL,
  role         TEXT NOT NULL,
  detail       TEXT NOT NULL,
  weight       REAL NOT NULL,
  PRIMARY KEY (chain_id, country_code, stage)
);

CREATE TABLE IF NOT EXISTS chain_edges (
  chain_id   TEXT NOT NULL REFERENCES value_chains(id),
  from_code  TEXT NOT NULL REFERENCES countries(code),
  to_code    TEXT NOT NULL REFERENCES countries(code),
  from_stage TEXT NOT NULL,
  to_stage   TEXT NOT NULL,
  label      TEXT NOT NULL,
  value      REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chain_nodes ON chain_nodes(chain_id);
CREATE INDEX IF NOT EXISTS idx_chain_edges ON chain_edges(chain_id);
`;

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA);
  // 旧库迁移：country_metrics 缺少人口指标列时补列并重新播种（种子数据是确定性的，重播安全）
  const metricCols = db.prepare('PRAGMA table_info(country_metrics)').all() as { name: string }[];
  if (!metricCols.some((c) => c.name === 'pop_growth')) {
    console.log('[db] 检测到旧版数据结构，补充人口指标列并重新播种…');
    db.exec(`
      ALTER TABLE country_metrics ADD COLUMN pop_growth REAL;
      ALTER TABLE country_metrics ADD COLUMN aging_rate REAL;
      ALTER TABLE country_metrics ADD COLUMN urban_rate REAL;
      ALTER TABLE country_metrics ADD COLUMN labor_force REAL;
    `);
    seedAll(db);
  }
  // 年龄结构迁移：缺少 0-14 岁占比列时补列并重新播种
  const colsAfter = db.prepare('PRAGMA table_info(country_metrics)').all() as { name: string }[];
  if (!colsAfter.some((c) => c.name === 'youth_rate')) {
    console.log('[db] 检测到旧版数据结构，补充年龄结构列并重新播种…');
    db.exec('ALTER TABLE country_metrics ADD COLUMN youth_rate REAL');
    seedAll(db);
  }
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM countries').get() as { c: number };
  if (c === 0) {
    console.log('[db] 数据库为空，开始写入种子数据…');
    seedAll(db);
    console.log('[db] 种子数据写入完成。');
  }
  _db = db;
  return db;
}
