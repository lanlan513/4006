/**
 * 资源—国家角色种子数据。
 *
 * 每个资源下记录一组「有角色」的国家及其三项指标：
 *  - annualProduction：该资源年产量（单位与 resources.unit 一致；水资源为年可再生量）
 *  - exportShare：出口量占本国产量（或消费量）的比重，%
 *  - importDependency：净进口量占国内消费量的比重，即对外依赖度，%
 *
 * 角色不直接写死，由 API 层按统一阈值动态判定：
 *  - producer 主要生产国：年产量 ≥ 最大生产国的 6%
 *  - exporter 主要出口国：出口比重 ≥ 15%
 *  - dependent 高依赖进口国：对外依赖度 ≥ 40%
 * 一个国家可同时具备多个角色（如中国石油：生产国 + 高依赖进口国）。
 *
 * 数值为公开统计口径整理的近似示例数据（约 2023 年量级），不代表实时统计发布。
 */

export type ResourceRoleKey = 'producer' | 'exporter' | 'dependent';

export interface ResourceRoleSeed {
  code: string; // ISO3，关联 countries 表
  annualProduction: number | null;
  exportShare: number | null; // %
  importDependency: number | null; // %
}

export interface ResourceRoleNotes {
  production: string; // 年产量指标口径说明
  export: string; // 出口比重口径说明
  dependency: string; // 对外依赖度口径说明
  yearLabel: string; // 数据年份 / 量级说明
}

export const RESOURCE_ROLE_NOTES: Record<string, ResourceRoleNotes> = {
  oil: {
    production: '原油及凝析油年产量',
    export: '原油与油品出口量占本国产量比重',
    dependency: '石油净进口量占国内消费量比重（对外依存度）',
    yearLabel: '约 2023 年量级 · 示例数据集',
  },
  gas: {
    production: '天然气年产量',
    export: '管道气与 LNG 出口量占本国产量比重',
    dependency: '天然气净进口量占国内消费量比重',
    yearLabel: '约 2023 年量级 · 示例数据集',
  },
  lithium: {
    production: '锂矿折碳酸锂当量（LCE）年产量',
    export: '锂精矿与锂盐出口量占本国产量比重',
    dependency: '锂资源净进口量占下游消费量比重',
    yearLabel: '约 2023 年量级 · 示例数据集',
  },
  rare_earth: {
    production: '稀土矿折稀土氧化物（REO）年产量',
    export: '稀土原料出口量占本国产量比重',
    dependency: '分离稀土与磁材净进口量占国内消费比重',
    yearLabel: '约 2023 年量级 · 示例数据集',
  },
  grain: {
    production: '谷物与大豆年产量',
    export: '粮食出口量占本国产量比重',
    dependency: '粮食净进口量占国内消费量比重',
    yearLabel: '约 2023 年量级 · 示例数据集',
  },
  water: {
    production: '年可再生淡水资源量',
    export: '虚拟水净出口（隐含于农产品贸易）占资源量比重',
    dependency: '用水净进口（虚拟水）与跨境取水依赖度',
    yearLabel: '多年平均量级 · 示例数据集',
  },
};

export const RESOURCE_ROLES: Record<string, ResourceRoleSeed[]> = {
  oil: [
    { code: 'USA', annualProduction: 670, exportShare: 12, importDependency: 5 },
    { code: 'RUS', annualProduction: 540, exportShare: 46, importDependency: 0 },
    { code: 'SAU', annualProduction: 510, exportShare: 72, importDependency: 0 },
    { code: 'CAN', annualProduction: 230, exportShare: 55, importDependency: 0 },
    { code: 'IRQ', annualProduction: 220, exportShare: 80, importDependency: 0 },
    { code: 'CHN', annualProduction: 210, exportShare: 0, importDependency: 72 },
    { code: 'BRA', annualProduction: 185, exportShare: 18, importDependency: 0 },
    { code: 'IRN', annualProduction: 170, exportShare: 44, importDependency: 0 },
    { code: 'ARE', annualProduction: 160, exportShare: 68, importDependency: 0 },
    { code: 'KWT', annualProduction: 135, exportShare: 70, importDependency: 0 },
    { code: 'NOR', annualProduction: 90, exportShare: 90, importDependency: 0 },
    { code: 'KAZ', annualProduction: 90, exportShare: 65, importDependency: 0 },
    { code: 'MEX', annualProduction: 85, exportShare: 12, importDependency: 10 },
    { code: 'NGA', annualProduction: 70, exportShare: 75, importDependency: 0 },
    { code: 'IND', annualProduction: 30, exportShare: null, importDependency: 86 },
    { code: 'THA', annualProduction: 10, exportShare: null, importDependency: 80 },
    { code: 'ITA', annualProduction: 5, exportShare: null, importDependency: 90 },
    { code: 'PER', annualProduction: 5, exportShare: null, importDependency: 60 },
    { code: 'DEU', annualProduction: 2, exportShare: null, importDependency: 97 },
    { code: 'NLD', annualProduction: 2, exportShare: null, importDependency: 92 },
    { code: 'TUR', annualProduction: 3, exportShare: null, importDependency: 90 },
    { code: 'FRA', annualProduction: 0.8, exportShare: null, importDependency: 96 },
    { code: 'JPN', annualProduction: 0.5, exportShare: null, importDependency: 99 },
    { code: 'ESP', annualProduction: 0.5, exportShare: null, importDependency: 95 },
    { code: 'PHL', annualProduction: 0.5, exportShare: null, importDependency: 95 },
    { code: 'CHL', annualProduction: 0.5, exportShare: null, importDependency: 90 },
    { code: 'BGD', annualProduction: 1, exportShare: null, importDependency: 95 },
    { code: 'POL', annualProduction: 0.9, exportShare: null, importDependency: 96 },
    { code: 'SWE', annualProduction: 0, exportShare: null, importDependency: 92 },
    { code: 'KOR', annualProduction: 0, exportShare: null, importDependency: 98 },
    { code: 'SGP', annualProduction: 0, exportShare: null, importDependency: 100 },
    { code: 'TWN', annualProduction: 0.05, exportShare: null, importDependency: 99 },
    { code: 'ZAF', annualProduction: 0.3, exportShare: null, importDependency: 80 },
  ],
  gas: [
    { code: 'USA', annualProduction: 1030, exportShare: 11, importDependency: 0 },
    { code: 'RUS', annualProduction: 610, exportShare: 38, importDependency: 0 },
    { code: 'IRN', annualProduction: 260, exportShare: 8, importDependency: 0 },
    { code: 'CAN', annualProduction: 185, exportShare: 44, importDependency: 0 },
    { code: 'QAT', annualProduction: 180, exportShare: 85, importDependency: 0 },
    { code: 'CHN', annualProduction: 230, exportShare: 0, importDependency: 42 },
    { code: 'AUS', annualProduction: 155, exportShare: 70, importDependency: 0 },
    { code: 'NOR', annualProduction: 125, exportShare: 92, importDependency: 0 },
    { code: 'SAU', annualProduction: 120, exportShare: null, importDependency: 0 },
    { code: 'MYS', annualProduction: 75, exportShare: 35, importDependency: 0 },
    { code: 'EGY', annualProduction: 65, exportShare: null, importDependency: 12 },
    { code: 'GBR', annualProduction: 38, exportShare: null, importDependency: 48 },
    { code: 'MEX', annualProduction: 35, exportShare: null, importDependency: 45 },
    { code: 'IND', annualProduction: 33, exportShare: null, importDependency: 52 },
    { code: 'THA', annualProduction: 28, exportShare: null, importDependency: 55 },
    { code: 'NLD', annualProduction: 20, exportShare: null, importDependency: 60 },
    { code: 'POL', annualProduction: 5, exportShare: null, importDependency: 75 },
    { code: 'ITA', annualProduction: 3, exportShare: null, importDependency: 93 },
    { code: 'DEU', annualProduction: 6, exportShare: null, importDependency: 95 },
    { code: 'FRA', annualProduction: 0.5, exportShare: null, importDependency: 98 },
    { code: 'ESP', annualProduction: 0.1, exportShare: null, importDependency: 90 },
    { code: 'TUR', annualProduction: 0.5, exportShare: null, importDependency: 99 },
    { code: 'JPN', annualProduction: 0, exportShare: null, importDependency: 99 },
    { code: 'KOR', annualProduction: 0, exportShare: null, importDependency: 97 },
    { code: 'SGP', annualProduction: 0, exportShare: null, importDependency: 98 },
  ],
  lithium: [
    { code: 'AUS', annualProduction: 37, exportShare: 98, importDependency: 0 },
    { code: 'CHL', annualProduction: 26, exportShare: 88, importDependency: 0 },
    { code: 'CHN', annualProduction: 11, exportShare: 0, importDependency: 70 },
    { code: 'ARG', annualProduction: 6, exportShare: 90, importDependency: 0 },
    { code: 'BRA', annualProduction: 3, exportShare: 60, importDependency: 0 },
    { code: 'USA', annualProduction: 1, exportShare: null, importDependency: 55 },
    { code: 'DEU', annualProduction: null, exportShare: null, importDependency: 80 },
    { code: 'JPN', annualProduction: 0, exportShare: null, importDependency: 95 },
    { code: 'KOR', annualProduction: 0, exportShare: null, importDependency: 98 },
  ],
  rare_earth: [
    { code: 'CHN', annualProduction: 24, exportShare: 22, importDependency: 15 },
    { code: 'USA', annualProduction: 4.5, exportShare: 85, importDependency: 95 },
    { code: 'AUS', annualProduction: 2.8, exportShare: 95, importDependency: 0 },
    { code: 'JPN', annualProduction: null, exportShare: null, importDependency: 100 },
    { code: 'DEU', annualProduction: null, exportShare: null, importDependency: 98 },
    { code: 'KOR', annualProduction: null, exportShare: null, importDependency: 99 },
  ],
  grain: [
    { code: 'CHN', annualProduction: 630, exportShare: 1, importDependency: 18 },
    { code: 'USA', annualProduction: 520, exportShare: 18, importDependency: 0 },
    { code: 'IND', annualProduction: 340, exportShare: 6, importDependency: 0 },
    { code: 'BRA', annualProduction: 300, exportShare: 35, importDependency: 0 },
    { code: 'RUS', annualProduction: 150, exportShare: 40, importDependency: 0 },
    { code: 'ARG', annualProduction: 130, exportShare: 55, importDependency: 0 },
    { code: 'CAN', annualProduction: 95, exportShare: 50, importDependency: 0 },
    { code: 'IDN', annualProduction: 70, exportShare: 2, importDependency: 15 },
    { code: 'FRA', annualProduction: 65, exportShare: 30, importDependency: 0 },
    { code: 'AUS', annualProduction: 55, exportShare: 60, importDependency: 0 },
    { code: 'VNM', annualProduction: 45, exportShare: 20, importDependency: 0 },
    { code: 'DEU', annualProduction: 45, exportShare: 12, importDependency: 10 },
    { code: 'BGD', annualProduction: 40, exportShare: 2, importDependency: 12 },
    { code: 'TUR', annualProduction: 40, exportShare: 10, importDependency: 12 },
    { code: 'MEX', annualProduction: 38, exportShare: 3, importDependency: 42 },
    { code: 'POL', annualProduction: 38, exportShare: 10, importDependency: 8 },
    { code: 'THA', annualProduction: 38, exportShare: 30, importDependency: 8 },
    { code: 'KAZ', annualProduction: 22, exportShare: 55, importDependency: 0 },
    { code: 'EGY', annualProduction: 18, exportShare: null, importDependency: 60 },
    { code: 'NGA', annualProduction: 28, exportShare: null, importDependency: 42 },
    { code: 'NLD', annualProduction: 3, exportShare: null, importDependency: 80 },
    { code: 'KOR', annualProduction: 5, exportShare: null, importDependency: 70 },
    { code: 'JPN', annualProduction: 10, exportShare: null, importDependency: 65 },
    { code: 'SAU', annualProduction: 1, exportShare: null, importDependency: 90 },
    { code: 'PER', annualProduction: 6, exportShare: null, importDependency: 65 },
    { code: 'ESP', annualProduction: 20, exportShare: null, importDependency: 45 },
    { code: 'ITA', annualProduction: 17, exportShare: null, importDependency: 55 },
    { code: 'GBR', annualProduction: 22, exportShare: null, importDependency: 40 },
    { code: 'MYS', annualProduction: 8, exportShare: null, importDependency: 60 },
    { code: 'SGP', annualProduction: 0, exportShare: null, importDependency: 98 },
  ],
  water: [
    { code: 'BRA', annualProduction: 5600, exportShare: 22, importDependency: 0 },
    { code: 'RUS', annualProduction: 4400, exportShare: 16, importDependency: 0 },
    { code: 'CAN', annualProduction: 2900, exportShare: 18, importDependency: 0 },
    { code: 'USA', annualProduction: 3000, exportShare: 17, importDependency: 8 },
    { code: 'CHN', annualProduction: 2800, exportShare: 3, importDependency: 5 },
    { code: 'IDN', annualProduction: 2000, exportShare: 5, importDependency: 0 },
    { code: 'PER', annualProduction: 1900, exportShare: 6, importDependency: 0 },
    { code: 'IND', annualProduction: 1900, exportShare: 2, importDependency: 6 },
    { code: 'COD', annualProduction: 1300, exportShare: null, importDependency: 0 },
    { code: 'BGD', annualProduction: 1200, exportShare: null, importDependency: 15 },
    { code: 'NGA', annualProduction: 950, exportShare: null, importDependency: 10 },
    { code: 'VNM', annualProduction: 880, exportShare: null, importDependency: 20 },
    { code: 'ARG', annualProduction: 850, exportShare: 16, importDependency: 0 },
    { code: 'MYS', annualProduction: 650, exportShare: 18, importDependency: 0 },
    { code: 'PHL', annualProduction: 480, exportShare: null, importDependency: 20 },
    { code: 'AUS', annualProduction: 490, exportShare: 20, importDependency: 0 },
    { code: 'JPN', annualProduction: 430, exportShare: null, importDependency: 30 },
    { code: 'MEX', annualProduction: 450, exportShare: null, importDependency: 25 },
    { code: 'ITA', annualProduction: 190, exportShare: null, importDependency: 50 },
    { code: 'IRN', annualProduction: 130, exportShare: null, importDependency: 45 },
    { code: 'GBR', annualProduction: 145, exportShare: null, importDependency: 52 },
    { code: 'DEU', annualProduction: 150, exportShare: null, importDependency: 55 },
    { code: 'ESP', annualProduction: 112, exportShare: null, importDependency: 55 },
    { code: 'CHL', annualProduction: 92, exportShare: null, importDependency: 45 },
    { code: 'NLD', annualProduction: 90, exportShare: null, importDependency: 70 },
    { code: 'POL', annualProduction: 60, exportShare: null, importDependency: 60 },
    { code: 'KOR', annualProduction: 70, exportShare: null, importDependency: 70 },
    { code: 'EGY', annualProduction: 57, exportShare: null, importDependency: 97 },
    { code: 'FRA', annualProduction: 210, exportShare: null, importDependency: 42 },
    { code: 'SAU', annualProduction: 2.5, exportShare: null, importDependency: 98 },
    { code: 'SGP', annualProduction: 0.6, exportShare: null, importDependency: 99 },
    { code: 'ARE', annualProduction: 0.15, exportShare: null, importDependency: 100 },
    { code: 'QAT', annualProduction: 0.06, exportShare: null, importDependency: 100 },
    { code: 'KWT', annualProduction: 0.02, exportShare: null, importDependency: 100 },
  ],
};
