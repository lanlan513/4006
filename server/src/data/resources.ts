/**
 * 全球资源分布种子数据。
 * 每类资源包含：
 *  - sites：产地坐标列表（油田 / 矿区 / 流域等，自带经纬度，不依赖国家表）
 *  - consumers：主要消费国列表（country_code 关联 countries 表取坐标）
 * value 为生产量 / 消费量数值，单位见各资源的 unit 字段。
 * 数值为公开统计口径整理的近似示例数据（约 2023 年量级），不代表实时统计发布。
 */

export interface ResourceSiteSeed {
  name: string; // 产地名称
  country: string; // 所在国家 / 地区（展示用）
  lon: number;
  lat: number;
  value: number; // 生产量
}

export interface ResourceConsumerSeed {
  code: string; // 消费国 ISO3，关联 countries 表
  value: number; // 消费量
}

export interface ResourceSeed {
  id: string;
  name: string;
  unit: string; // 生产量 / 消费量计量单位
  color: string; // 图层主题色
  description: string;
  sites: ResourceSiteSeed[];
  consumers: ResourceConsumerSeed[];
}

export const RESOURCES: ResourceSeed[] = [
  {
    id: 'oil',
    name: '石油',
    unit: '百万吨/年',
    color: '#e0a94f',
    description:
      '原油生产高度集中于中东、北美与俄罗斯：波斯湾的加瓦尔、巴士拉等巨型油田，美国二叠纪页岩区与加拿大油砂，以及西西伯利亚盆地构成全球供给主力；消费重心则在北美、东亚与南亚。',
    sites: [
      { name: '二叠纪盆地', country: '美国', lon: -102.4, lat: 31.9, value: 300 },
      { name: '西西伯利亚盆地', country: '俄罗斯', lon: 72.5, lat: 61.0, value: 270 },
      { name: '加瓦尔油田', country: '沙特阿拉伯', lon: 49.6, lat: 25.4, value: 250 },
      { name: '巴士拉油田群', country: '伊拉克', lon: 47.8, lat: 30.4, value: 200 },
      { name: '桑托斯盆地盐下层', country: '巴西', lon: -42.0, lat: -25.0, value: 170 },
      { name: '阿萨巴斯卡油砂', country: '加拿大', lon: -111.6, lat: 57.0, value: 160 },
      { name: '胡齐斯坦油田', country: '伊朗', lon: 48.7, lat: 31.3, value: 160 },
      { name: '阿布扎比陆上油田', country: '阿联酋', lon: 54.4, lat: 24.2, value: 150 },
      { name: '布尔甘油田', country: '科威特', lon: 47.9, lat: 29.0, value: 130 },
      { name: '北海油田', country: '挪威', lon: 3.0, lat: 59.6, value: 90 },
      { name: '尼日尔三角洲', country: '尼日利亚', lon: 6.5, lat: 4.7, value: 70 },
      { name: '长庆油田', country: '中国', lon: 108.7, lat: 35.7, value: 65 },
      { name: '田吉兹油田', country: '哈萨克斯坦', lon: 53.3, lat: 46.2, value: 45 },
    ],
    consumers: [
      { code: 'USA', value: 900 },
      { code: 'CHN', value: 770 },
      { code: 'IND', value: 280 },
      { code: 'RUS', value: 165 },
      { code: 'JPN', value: 160 },
      { code: 'SAU', value: 140 },
      { code: 'KOR', value: 135 },
      { code: 'BRA', value: 120 },
      { code: 'DEU', value: 100 },
      { code: 'CAN', value: 100 },
    ],
  },
  {
    id: 'gas',
    name: '天然气',
    unit: '十亿立方米/年',
    color: '#57a9c9',
    description:
      '北美页岩气革命重塑了全球天然气格局：美国马塞勒斯、俄罗斯亚马尔、伊朗南帕尔斯与卡塔尔北方气田是最大的产气区；LNG 贸易把产气区与东亚、欧洲的消费中心连接起来。',
    sites: [
      { name: '马塞勒斯页岩气区', country: '美国', lon: -79.5, lat: 40.5, value: 350 },
      { name: '亚马尔半岛气田', country: '俄罗斯', lon: 70.5, lat: 68.0, value: 300 },
      { name: '南帕尔斯气田', country: '伊朗', lon: 51.6, lat: 27.0, value: 250 },
      { name: '北方气田', country: '卡塔尔', lon: 51.6, lat: 26.3, value: 180 },
      { name: '蒙特尼气区', country: '加拿大', lon: -120.5, lat: 56.0, value: 180 },
      { name: '加瓦尔伴生气', country: '沙特阿拉伯', lon: 49.6, lat: 25.0, value: 120 },
      { name: '北海气田', country: '挪威', lon: 3.0, lat: 60.5, value: 120 },
      { name: '鄂尔多斯盆地', country: '中国', lon: 109.5, lat: 38.5, value: 110 },
      { name: '哈西鲁迈勒气田', country: '阿尔及利亚', lon: 3.3, lat: 32.9, value: 100 },
      { name: '西北大陆架气田', country: '澳大利亚', lon: 115.0, lat: -20.0, value: 90 },
      { name: '加尔金内什气田', country: '土库曼斯坦', lon: 63.0, lat: 38.0, value: 80 },
    ],
    consumers: [
      { code: 'USA', value: 920 },
      { code: 'RUS', value: 450 },
      { code: 'CHN', value: 405 },
      { code: 'IRN', value: 245 },
      { code: 'CAN', value: 130 },
      { code: 'SAU', value: 130 },
      { code: 'JPN', value: 100 },
      { code: 'DEU', value: 90 },
      { code: 'MEX', value: 90 },
      { code: 'GBR', value: 76 },
    ],
  },
  {
    id: 'lithium',
    name: '锂',
    unit: '万吨（碳酸锂当量）/年',
    color: '#b48ac9',
    description:
      '锂资源呈「澳洲硬岩 + 南美盐湖」双极格局：格林布什等澳洲锂辉石矿与智利、阿根廷的盐湖卤水构成供给主体；消费则高度集中于中、日、韩的电池材料产业链。',
    sites: [
      { name: '格林布什锂矿', country: '澳大利亚', lon: 116.1, lat: -33.9, value: 25 },
      { name: '阿塔卡马盐湖', country: '智利', lon: -68.2, lat: -23.5, value: 23 },
      { name: '皮尔甘古拉锂矿', country: '澳大利亚', lon: 118.7, lat: -20.9, value: 12 },
      { name: '察尔汗盐湖', country: '中国·青海', lon: 95.3, lat: 37.0, value: 8 },
      { name: '宜春锂云母矿区', country: '中国·江西', lon: 114.4, lat: 27.8, value: 6 },
      { name: '翁布雷穆埃尔托盐湖', country: '阿根廷', lon: -67.0, lat: -25.4, value: 3 },
      { name: '比基塔锂矿', country: '津巴布韦', lon: 30.8, lat: -20.1, value: 2 },
      { name: '米纳斯吉拉斯锂矿', country: '巴西', lon: -43.9, lat: -19.5, value: 1.5 },
      { name: '乌尤尼盐湖', country: '玻利维亚', lon: -67.5, lat: -20.3, value: 0.5 },
    ],
    consumers: [
      { code: 'CHN', value: 65 },
      { code: 'KOR', value: 12 },
      { code: 'JPN', value: 10 },
      { code: 'USA', value: 8 },
      { code: 'DEU', value: 5 },
    ],
  },
  {
    id: 'rare_earth',
    name: '稀土',
    unit: '万吨（稀土氧化物）/年',
    color: '#d98a6e',
    description:
      '稀土供给高度集中：中国白云鄂博与南方离子型矿区占全球产量六成以上，美国芒廷帕斯、澳大利亚芒特韦尔德为补充；消费集中于中、日、美的磁材与催化材料产业。',
    sites: [
      { name: '白云鄂博矿', country: '中国·内蒙古', lon: 110.0, lat: 41.8, value: 16 },
      { name: '芒廷帕斯矿', country: '美国', lon: -117.5, lat: 35.5, value: 4.3 },
      { name: '赣州离子型稀土矿区', country: '中国·江西', lon: 114.9, lat: 25.8, value: 4 },
      { name: '克钦邦离子型矿区', country: '缅甸', lon: 98.3, lat: 25.4, value: 3 },
      { name: '芒特韦尔德矿', country: '澳大利亚', lon: 122.1, lat: -20.8, value: 2.4 },
      { name: '洛沃泽罗矿', country: '俄罗斯', lon: 35.0, lat: 68.0, value: 0.3 },
      { name: '东海岸砂矿', country: '印度', lon: 80.3, lat: 13.5, value: 0.3 },
    ],
    consumers: [
      { code: 'CHN', value: 18 },
      { code: 'JPN', value: 2.5 },
      { code: 'USA', value: 1.8 },
      { code: 'DEU', value: 0.8 },
      { code: 'KOR', value: 0.6 },
    ],
  },
  {
    id: 'grain',
    name: '粮食',
    unit: '百万吨/年',
    color: '#7fb069',
    description:
      '谷物与大豆主产带分布于北半球温带平原与南美高原：美国玉米带、中国东北与黄淮海平原、巴西中央高原、黑土带与潘帕斯草原是全球粮仓；消费则以人口大国为主。',
    sites: [
      { name: '玉米带', country: '美国', lon: -93.5, lat: 42.0, value: 450 },
      { name: '黄淮海平原', country: '中国', lon: 115.5, lat: 34.8, value: 200 },
      { name: '恒河平原', country: '印度', lon: 80.5, lat: 26.5, value: 200 },
      { name: '东北平原', country: '中国', lon: 126.5, lat: 45.8, value: 170 },
      { name: '中央高原', country: '巴西', lon: -54.5, lat: -13.5, value: 150 },
      { name: '黑土带', country: '俄罗斯', lon: 40.5, lat: 51.5, value: 140 },
      { name: '潘帕斯草原', country: '阿根廷', lon: -62.0, lat: -34.5, value: 120 },
      { name: '草原三省', country: '加拿大', lon: -106.5, lat: 52.5, value: 90 },
      { name: '巴黎盆地', country: '法国', lon: 2.8, lat: 48.8, value: 70 },
      { name: '黑土平原', country: '乌克兰', lon: 32.0, lat: 48.5, value: 60 },
      { name: '墨累-达令盆地', country: '澳大利亚', lon: 143.5, lat: -34.5, value: 50 },
    ],
    consumers: [
      { code: 'CHN', value: 830 },
      { code: 'USA', value: 380 },
      { code: 'IND', value: 320 },
      { code: 'BRA', value: 140 },
      { code: 'IDN', value: 90 },
      { code: 'MEX', value: 50 },
      { code: 'BGD', value: 45 },
      { code: 'EGY', value: 45 },
      { code: 'NGA', value: 35 },
      { code: 'JPN', value: 30 },
    ],
  },
  {
    id: 'water',
    name: '水资源',
    unit: '十亿立方米/年',
    color: '#4f9fd9',
    description:
      '可再生淡水资源集中于亚马逊、刚果、西伯利亚等大河流域，与人口稠密、用水量巨大的南亚、东亚和北美形成鲜明空间错位；消费量为各国年用水量的近似量级。',
    sites: [
      { name: '亚马逊流域', country: '巴西', lon: -62.0, lat: -3.5, value: 5600 },
      { name: '西伯利亚河系', country: '俄罗斯', lon: 95.0, lat: 63.0, value: 1800 },
      { name: '恒河-布拉马普特拉流域', country: '南亚', lon: 85.5, lat: 25.5, value: 1400 },
      { name: '刚果河流域', country: '刚果（金）', lon: 23.5, lat: -1.5, value: 1300 },
      { name: '长江流域', country: '中国', lon: 112.0, lat: 30.5, value: 1000 },
      { name: '北部水系', country: '加拿大', lon: -110.0, lat: 60.0, value: 900 },
      { name: '巴拉那-拉普拉塔流域', country: '南美洲', lon: -58.5, lat: -30.5, value: 800 },
      { name: '密西西比流域', country: '美国', lon: -90.5, lat: 35.5, value: 600 },
      { name: '湄公河流域', country: '东南亚', lon: 104.5, lat: 16.5, value: 470 },
      { name: '尼罗河流域', country: '东北非', lon: 31.5, lat: 22.5, value: 90 },
    ],
    consumers: [
      { code: 'IND', value: 760 },
      { code: 'CHN', value: 600 },
      { code: 'USA', value: 480 },
      { code: 'IDN', value: 220 },
      { code: 'IRN', value: 95 },
      { code: 'MEX', value: 90 },
      { code: 'VNM', value: 82 },
      { code: 'EGY', value: 80 },
      { code: 'BRA', value: 75 },
      { code: 'THA', value: 57 },
    ],
  },
];
