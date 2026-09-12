import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedAll, seedResources, seedResourceRoles } from './seed.js';

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

CREATE TABLE IF NOT EXISTS resources (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  unit        TEXT NOT NULL,    -- 生产量 / 消费量计量单位
  color       TEXT NOT NULL,    -- 图层主题色
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS resource_sites (
  resource_id TEXT NOT NULL REFERENCES resources(id),
  name        TEXT NOT NULL,    -- 产地名称（油田 / 矿区 / 流域等）
  country     TEXT NOT NULL,    -- 所在国家 / 地区（展示用）
  lon         REAL NOT NULL,
  lat         REAL NOT NULL,
  value       REAL NOT NULL,    -- 生产量
  PRIMARY KEY (resource_id, name)
);
CREATE INDEX IF NOT EXISTS idx_resource_sites ON resource_sites(resource_id);

CREATE TABLE IF NOT EXISTS resource_consumers (
  resource_id  TEXT NOT NULL REFERENCES resources(id),
  country_code TEXT NOT NULL REFERENCES countries(code),
  value        REAL NOT NULL,   -- 消费量
  PRIMARY KEY (resource_id, country_code)
);
CREATE INDEX IF NOT EXISTS idx_resource_consumers ON resource_consumers(resource_id);

CREATE TABLE IF NOT EXISTS resource_country_roles (
  resource_id       TEXT NOT NULL REFERENCES resources(id),
  country_code      TEXT NOT NULL REFERENCES countries(code),
  annual_production REAL,          -- 年产量（单位同 resources.unit；水资源为年可再生量）
  export_share      REAL,          -- 出口比重 %
  import_dependency REAL,          -- 对外依赖度（净进口 / 消费）%
  PRIMARY KEY (resource_id, country_code)
);
CREATE INDEX IF NOT EXISTS idx_resource_roles ON resource_country_roles(resource_id);
`;

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA);
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM countries').get() as { c: number };
  if (c === 0) {
    console.log('[db] 数据库为空，开始写入种子数据…');
    seedAll(db);
    console.log('[db] 种子数据写入完成。');
  } else {
    // 兼容已有数据库：资源表为空时单独增量播种，避免整库重建
    const { c: resourceCount } = db.prepare('SELECT COUNT(*) AS c FROM resources').get() as {
      c: number;
    };
    if (resourceCount === 0) {
      console.log('[db] 资源数据为空，增量播种资源图层数据…');
      seedResources(db);
    }
    // 资源国家角色表为空时增量播种（旧库升级）
    const { c: roleCount } = db.prepare(
      'SELECT COUNT(*) AS c FROM resource_country_roles'
    ).get() as { c: number };
    if (roleCount === 0) {
      console.log('[db] 资源国家角色数据为空，增量播种角色标注数据…');
      seedResourceRoles(db);
    }
  }
  _db = db;
  return db;
}
