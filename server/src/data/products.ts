/**
 * 商品目录与各国主要进出口商品（约 2023 年结构，占比为近似值 %）。
 * chain_id 将商品关联到对应的全球产业链模块。
 */

export interface ProductSeed {
  code: string;
  name: string;
  category: string;
  chainId: string | null;
}

export const PRODUCTS: ProductSeed[] = [
  { code: 'crude_oil', name: '原油', category: '能源', chainId: 'oil' },
  { code: 'oil_products', name: '成品油', category: '能源', chainId: 'oil' },
  { code: 'lng', name: '天然气 / LNG', category: '能源', chainId: 'oil' },
  { code: 'coal', name: '煤炭', category: '能源', chainId: null },
  { code: 'iron_ore', name: '铁矿石', category: '矿产', chainId: null },
  { code: 'copper', name: '铜及铜材', category: '矿产', chainId: null },
  { code: 'lithium', name: '锂矿 / 锂盐', category: '关键矿产', chainId: 'battery' },
  { code: 'cobalt', name: '钴', category: '关键矿产', chainId: 'battery' },
  { code: 'nickel', name: '镍', category: '关键矿产', chainId: 'battery' },
  { code: 'soybeans', name: '大豆', category: '农产品', chainId: 'grain' },
  { code: 'grain', name: '粮食(小麦/玉米/稻米)', category: '农产品', chainId: 'grain' },
  { code: 'autos', name: '汽车(整车)', category: '运输设备', chainId: 'auto' },
  { code: 'auto_parts', name: '汽车零部件', category: '运输设备', chainId: 'auto' },
  { code: 'semiconductors', name: '半导体 / 芯片', category: '电子', chainId: 'chip' },
  { code: 'electronics', name: '电子制成品(电脑/手机)', category: '电子', chainId: 'phone' },
  { code: 'machinery', name: '机械设备', category: '工业制品', chainId: null },
  { code: 'chemicals', name: '化工品', category: '工业制品', chainId: null },
  { code: 'pharma', name: '医药产品', category: '工业制品', chainId: null },
  { code: 'textiles', name: '纺织服装', category: '轻工业', chainId: null },
  { code: 'aircraft', name: '航空航天产品', category: '高端制造', chainId: null },
  { code: 'ships', name: '船舶', category: '高端制造', chainId: null },
  { code: 'palm_oil', name: '棕榈油', category: '农产品', chainId: null },
  { code: 'gold', name: '黄金 / 贵金属', category: '矿产', chainId: null },
  { code: 'meat', name: '肉类产品', category: '农产品', chainId: null },
  { code: 'fish', name: '水产品', category: '农产品', chainId: null },
  { code: 'paper', name: '纸浆与纸品', category: '轻工业', chainId: null },
  { code: 'footwear', name: '鞋类', category: '轻工业', chainId: null },
  { code: 'rubber', name: '橡胶制品', category: '工业制品', chainId: null },
  { code: 'cotton', name: '棉花', category: '农产品', chainId: null },
  { code: 'coconut', name: '椰子制品', category: '农产品', chainId: null },
  { code: 'steel', name: '钢铁制品', category: '工业制品', chainId: null },
];

/** [国家, 流向(ex出口/im进口), 商品, 占比%] —— 数组顺序即排名 */
export type CountryProductSeed = [string, 'ex' | 'im', string, number];

export const COUNTRY_PRODUCTS: CountryProductSeed[] = [
  // 美国
  ['USA', 'ex', 'machinery', 14], ['USA', 'ex', 'chemicals', 10], ['USA', 'ex', 'crude_oil', 7],
  ['USA', 'ex', 'oil_products', 8], ['USA', 'ex', 'pharma', 8], ['USA', 'ex', 'aircraft', 6],
  ['USA', 'im', 'electronics', 14], ['USA', 'im', 'machinery', 11], ['USA', 'im', 'autos', 10],
  ['USA', 'im', 'pharma', 9], ['USA', 'im', 'textiles', 6],
  // 中国
  ['CHN', 'ex', 'electronics', 28], ['CHN', 'ex', 'machinery', 22], ['CHN', 'ex', 'textiles', 10],
  ['CHN', 'ex', 'chemicals', 8], ['CHN', 'ex', 'autos', 6],
  ['CHN', 'im', 'semiconductors', 15], ['CHN', 'im', 'crude_oil', 12], ['CHN', 'im', 'iron_ore', 8],
  ['CHN', 'im', 'machinery', 7], ['CHN', 'im', 'copper', 4],
  // 日本
  ['JPN', 'ex', 'autos', 20], ['JPN', 'ex', 'machinery', 16], ['JPN', 'ex', 'auto_parts', 8],
  ['JPN', 'ex', 'chemicals', 8], ['JPN', 'ex', 'semiconductors', 6],
  ['JPN', 'im', 'crude_oil', 15], ['JPN', 'im', 'electronics', 10], ['JPN', 'im', 'lng', 9],
  ['JPN', 'im', 'coal', 4],
  // 德国
  ['DEU', 'ex', 'machinery', 17], ['DEU', 'ex', 'autos', 16], ['DEU', 'ex', 'chemicals', 12],
  ['DEU', 'ex', 'auto_parts', 8], ['DEU', 'ex', 'pharma', 8],
  ['DEU', 'im', 'electronics', 12], ['DEU', 'im', 'chemicals', 10], ['DEU', 'im', 'autos', 8],
  ['DEU', 'im', 'lng', 8], ['DEU', 'im', 'crude_oil', 5],
  // 印度
  ['IND', 'ex', 'oil_products', 14], ['IND', 'ex', 'textiles', 11], ['IND', 'ex', 'machinery', 8],
  ['IND', 'ex', 'chemicals', 9], ['IND', 'ex', 'pharma', 7],
  ['IND', 'im', 'crude_oil', 22], ['IND', 'im', 'electronics', 11], ['IND', 'im', 'gold', 8],
  ['IND', 'im', 'coal', 7],
  // 英国
  ['GBR', 'ex', 'machinery', 15], ['GBR', 'ex', 'autos', 10], ['GBR', 'ex', 'chemicals', 10],
  ['GBR', 'ex', 'pharma', 9], ['GBR', 'ex', 'crude_oil', 6],
  ['GBR', 'im', 'machinery', 14], ['GBR', 'im', 'autos', 12], ['GBR', 'im', 'electronics', 12],
  ['GBR', 'im', 'pharma', 8],
  // 法国
  ['FRA', 'ex', 'chemicals', 12], ['FRA', 'ex', 'pharma', 12], ['FRA', 'ex', 'aircraft', 9],
  ['FRA', 'ex', 'machinery', 9], ['FRA', 'ex', 'autos', 8],
  ['FRA', 'im', 'electronics', 10], ['FRA', 'im', 'autos', 9], ['FRA', 'im', 'chemicals', 9],
  ['FRA', 'im', 'lng', 7],
  // 意大利
  ['ITA', 'ex', 'machinery', 20], ['ITA', 'ex', 'textiles', 12], ['ITA', 'ex', 'chemicals', 9],
  ['ITA', 'ex', 'autos', 8], ['ITA', 'ex', 'pharma', 7],
  ['ITA', 'im', 'chemicals', 12], ['ITA', 'im', 'electronics', 10], ['ITA', 'im', 'crude_oil', 10],
  ['ITA', 'im', 'auto_parts', 8],
  // 巴西
  ['BRA', 'ex', 'soybeans', 15], ['BRA', 'ex', 'iron_ore', 12], ['BRA', 'ex', 'crude_oil', 11],
  ['BRA', 'ex', 'meat', 8], ['BRA', 'ex', 'grain', 7],
  ['BRA', 'im', 'machinery', 16], ['BRA', 'im', 'electronics', 12], ['BRA', 'im', 'chemicals', 12],
  ['BRA', 'im', 'oil_products', 8],
  // 加拿大
  ['CAN', 'ex', 'crude_oil', 19], ['CAN', 'ex', 'autos', 10], ['CAN', 'ex', 'machinery', 7],
  ['CAN', 'ex', 'auto_parts', 6], ['CAN', 'ex', 'gold', 4],
  ['CAN', 'im', 'autos', 13], ['CAN', 'im', 'machinery', 12], ['CAN', 'im', 'electronics', 11],
  ['CAN', 'im', 'chemicals', 9],
  // 俄罗斯
  ['RUS', 'ex', 'crude_oil', 30], ['RUS', 'ex', 'lng', 12], ['RUS', 'ex', 'grain', 8],
  ['RUS', 'ex', 'coal', 6], ['RUS', 'ex', 'chemicals', 5],
  ['RUS', 'im', 'machinery', 18], ['RUS', 'im', 'electronics', 13], ['RUS', 'im', 'autos', 9],
  ['RUS', 'im', 'pharma', 7],
  // 韩国
  ['KOR', 'ex', 'semiconductors', 17], ['KOR', 'ex', 'electronics', 12], ['KOR', 'ex', 'autos', 10],
  ['KOR', 'ex', 'chemicals', 9], ['KOR', 'ex', 'ships', 5],
  ['KOR', 'im', 'crude_oil', 16], ['KOR', 'im', 'semiconductors', 9], ['KOR', 'im', 'lng', 8],
  ['KOR', 'im', 'machinery', 7],
  // 澳大利亚
  ['AUS', 'ex', 'iron_ore', 28], ['AUS', 'ex', 'coal', 17], ['AUS', 'ex', 'lng', 14],
  ['AUS', 'ex', 'gold', 8], ['AUS', 'ex', 'lithium', 3],
  ['AUS', 'im', 'machinery', 14], ['AUS', 'im', 'electronics', 11], ['AUS', 'im', 'autos', 9],
  ['AUS', 'im', 'oil_products', 9],
  // 墨西哥
  ['MEX', 'ex', 'autos', 21], ['MEX', 'ex', 'electronics', 14], ['MEX', 'ex', 'machinery', 11],
  ['MEX', 'ex', 'auto_parts', 10], ['MEX', 'ex', 'crude_oil', 5],
  ['MEX', 'im', 'electronics', 14], ['MEX', 'im', 'auto_parts', 12], ['MEX', 'im', 'machinery', 12],
  ['MEX', 'im', 'chemicals', 9],
  // 西班牙
  ['ESP', 'ex', 'autos', 14], ['ESP', 'ex', 'machinery', 13], ['ESP', 'ex', 'chemicals', 11],
  ['ESP', 'ex', 'textiles', 6],
  ['ESP', 'im', 'chemicals', 10], ['ESP', 'im', 'crude_oil', 11], ['ESP', 'im', 'electronics', 10],
  ['ESP', 'im', 'autos', 9],
  // 印度尼西亚
  ['IDN', 'ex', 'coal', 16], ['IDN', 'ex', 'palm_oil', 13], ['IDN', 'ex', 'nickel', 10],
  ['IDN', 'ex', 'electronics', 8],
  ['IDN', 'im', 'machinery', 15], ['IDN', 'im', 'electronics', 11], ['IDN', 'im', 'crude_oil', 9],
  ['IDN', 'im', 'chemicals', 9],
  // 荷兰
  ['NLD', 'ex', 'machinery', 14], ['NLD', 'ex', 'chemicals', 12], ['NLD', 'ex', 'electronics', 11],
  ['NLD', 'ex', 'oil_products', 10], ['NLD', 'ex', 'autos', 7],
  ['NLD', 'im', 'electronics', 13], ['NLD', 'im', 'crude_oil', 12], ['NLD', 'im', 'machinery', 12],
  ['NLD', 'im', 'autos', 8],
  // 沙特阿拉伯
  ['SAU', 'ex', 'crude_oil', 68], ['SAU', 'ex', 'chemicals', 10], ['SAU', 'ex', 'oil_products', 9],
  ['SAU', 'ex', 'gold', 4],
  ['SAU', 'im', 'machinery', 18], ['SAU', 'im', 'electronics', 14], ['SAU', 'im', 'autos', 12],
  ['SAU', 'im', 'chemicals', 10],
  // 土耳其
  ['TUR', 'ex', 'textiles', 13], ['TUR', 'ex', 'machinery', 12], ['TUR', 'ex', 'autos', 11],
  ['TUR', 'ex', 'chemicals', 8],
  ['TUR', 'im', 'machinery', 14], ['TUR', 'im', 'crude_oil', 12], ['TUR', 'im', 'chemicals', 11],
  ['TUR', 'im', 'electronics', 9],
  // 瑞士
  ['CHE', 'ex', 'pharma', 47], ['CHE', 'ex', 'machinery', 14], ['CHE', 'ex', 'gold', 9],
  ['CHE', 'ex', 'chemicals', 7],
  ['CHE', 'im', 'pharma', 17], ['CHE', 'im', 'gold', 14], ['CHE', 'im', 'chemicals', 10],
  ['CHE', 'im', 'machinery', 9],
  // 波兰
  ['POL', 'ex', 'machinery', 17], ['POL', 'ex', 'autos', 14], ['POL', 'ex', 'electronics', 10],
  ['POL', 'ex', 'auto_parts', 8],
  ['POL', 'im', 'machinery', 14], ['POL', 'im', 'electronics', 12], ['POL', 'im', 'chemicals', 10],
  ['POL', 'im', 'auto_parts', 9],
  // 阿根廷
  ['ARG', 'ex', 'soybeans', 25], ['ARG', 'ex', 'grain', 14], ['ARG', 'ex', 'autos', 8],
  ['ARG', 'ex', 'crude_oil', 7],
  ['ARG', 'im', 'machinery', 18], ['ARG', 'im', 'electronics', 12], ['ARG', 'im', 'chemicals', 11],
  ['ARG', 'im', 'auto_parts', 8],
  // 瑞典
  ['SWE', 'ex', 'machinery', 20], ['SWE', 'ex', 'autos', 10], ['SWE', 'ex', 'pharma', 8],
  ['SWE', 'ex', 'paper', 6],
  ['SWE', 'im', 'machinery', 12], ['SWE', 'im', 'electronics', 11], ['SWE', 'im', 'autos', 9],
  ['SWE', 'im', 'crude_oil', 9],
  // 阿联酋
  ['ARE', 'ex', 'crude_oil', 42], ['ARE', 'ex', 'gold', 18], ['ARE', 'ex', 'lng', 12],
  ['ARE', 'ex', 'electronics', 9],
  ['ARE', 'im', 'machinery', 16], ['ARE', 'im', 'electronics', 14], ['ARE', 'im', 'gold', 12],
  ['ARE', 'im', 'autos', 10],
  // 南非
  ['ZAF', 'ex', 'coal', 12], ['ZAF', 'ex', 'gold', 7], ['ZAF', 'ex', 'iron_ore', 6],
  ['ZAF', 'ex', 'chemicals', 6],
  ['ZAF', 'im', 'crude_oil', 14], ['ZAF', 'im', 'machinery', 14], ['ZAF', 'im', 'electronics', 10],
  ['ZAF', 'im', 'chemicals', 9],
  // 新加坡
  ['SGP', 'ex', 'electronics', 32], ['SGP', 'ex', 'oil_products', 20], ['SGP', 'ex', 'chemicals', 13],
  ['SGP', 'ex', 'machinery', 12],
  ['SGP', 'im', 'electronics', 26], ['SGP', 'im', 'crude_oil', 18], ['SGP', 'im', 'machinery', 12],
  ['SGP', 'im', 'chemicals', 8],
  // 挪威
  ['NOR', 'ex', 'crude_oil', 38], ['NOR', 'ex', 'lng', 30], ['NOR', 'ex', 'fish', 8],
  ['NOR', 'ex', 'machinery', 6],
  ['NOR', 'im', 'machinery', 17], ['NOR', 'im', 'electronics', 11], ['NOR', 'im', 'autos', 10],
  ['NOR', 'im', 'chemicals', 8],
  // 越南
  ['VNM', 'ex', 'electronics', 31], ['VNM', 'ex', 'textiles', 17], ['VNM', 'ex', 'machinery', 9],
  ['VNM', 'ex', 'footwear', 7],
  ['VNM', 'im', 'electronics', 24], ['VNM', 'im', 'machinery', 14], ['VNM', 'im', 'textiles', 8],
  ['VNM', 'im', 'chemicals', 7],
  // 泰国
  ['THA', 'ex', 'electronics', 18], ['THA', 'ex', 'autos', 12], ['THA', 'ex', 'machinery', 12],
  ['THA', 'ex', 'rubber', 6],
  ['THA', 'im', 'crude_oil', 14], ['THA', 'im', 'electronics', 14], ['THA', 'im', 'machinery', 12],
  ['THA', 'im', 'chemicals', 9],
  // 马来西亚
  ['MYS', 'ex', 'electronics', 30], ['MYS', 'ex', 'palm_oil', 9], ['MYS', 'ex', 'lng', 8],
  ['MYS', 'ex', 'oil_products', 9],
  ['MYS', 'im', 'electronics', 22], ['MYS', 'im', 'machinery', 12], ['MYS', 'im', 'crude_oil', 8],
  ['MYS', 'im', 'chemicals', 8],
  // 埃及
  ['EGY', 'ex', 'lng', 12], ['EGY', 'ex', 'chemicals', 9], ['EGY', 'ex', 'textiles', 8],
  ['EGY', 'ex', 'gold', 5],
  ['EGY', 'im', 'grain', 13], ['EGY', 'im', 'machinery', 12], ['EGY', 'im', 'crude_oil', 8],
  ['EGY', 'im', 'electronics', 9],
  // 尼日利亚
  ['NGA', 'ex', 'crude_oil', 70], ['NGA', 'ex', 'lng', 8],
  ['NGA', 'im', 'machinery', 18], ['NGA', 'im', 'oil_products', 14], ['NGA', 'im', 'electronics', 11],
  ['NGA', 'im', 'grain', 9],
  // 孟加拉国
  ['BGD', 'ex', 'textiles', 84],
  ['BGD', 'im', 'machinery', 10], ['BGD', 'im', 'cotton', 8], ['BGD', 'im', 'electronics', 8],
  ['BGD', 'im', 'crude_oil', 7],
  // 菲律宾
  ['PHL', 'ex', 'electronics', 42], ['PHL', 'ex', 'coconut', 4],
  ['PHL', 'im', 'electronics', 22], ['PHL', 'im', 'machinery', 12], ['PHL', 'im', 'crude_oil', 11],
  ['PHL', 'im', 'grain', 8],
  // 智利
  ['CHL', 'ex', 'copper', 48], ['CHL', 'ex', 'lithium', 8], ['CHL', 'ex', 'fish', 6],
  ['CHL', 'im', 'machinery', 15], ['CHL', 'im', 'electronics', 12], ['CHL', 'im', 'crude_oil', 10],
  ['CHL', 'im', 'chemicals', 8],
  // 台湾
  ['TWN', 'ex', 'semiconductors', 34], ['TWN', 'ex', 'electronics', 18], ['TWN', 'ex', 'machinery', 12],
  ['TWN', 'ex', 'chemicals', 10],
  ['TWN', 'im', 'electronics', 15], ['TWN', 'im', 'semiconductors', 14], ['TWN', 'im', 'machinery', 10],
  ['TWN', 'im', 'crude_oil', 8],
  // 伊朗
  ['IRN', 'ex', 'crude_oil', 58], ['IRN', 'ex', 'oil_products', 12], ['IRN', 'ex', 'chemicals', 9],
  ['IRN', 'im', 'machinery', 18], ['IRN', 'im', 'grain', 12], ['IRN', 'im', 'electronics', 11],
  // 伊拉克
  ['IRQ', 'ex', 'crude_oil', 92],
  ['IRQ', 'im', 'machinery', 22], ['IRQ', 'im', 'electronics', 14], ['IRQ', 'im', 'autos', 12],
  ['IRQ', 'im', 'grain', 10],
  // 卡塔尔
  ['QAT', 'ex', 'lng', 62], ['QAT', 'ex', 'crude_oil', 21],
  ['QAT', 'im', 'machinery', 18], ['QAT', 'im', 'electronics', 14], ['QAT', 'im', 'aircraft', 12],
  // 科威特
  ['KWT', 'ex', 'crude_oil', 78], ['KWT', 'ex', 'oil_products', 9],
  ['KWT', 'im', 'machinery', 18], ['KWT', 'im', 'electronics', 14], ['KWT', 'im', 'autos', 13],
  // 刚果(金)
  ['COD', 'ex', 'copper', 60], ['COD', 'ex', 'cobalt', 22],
  ['COD', 'im', 'machinery', 15], ['COD', 'im', 'grain', 12], ['COD', 'im', 'oil_products', 10],
  // 秘鲁
  ['PER', 'ex', 'copper', 30], ['PER', 'ex', 'gold', 18], ['PER', 'ex', 'coffee', 4],
  ['PER', 'im', 'machinery', 17], ['PER', 'im', 'electronics', 13], ['PER', 'im', 'crude_oil', 12],
  // 哈萨克斯坦
  ['KAZ', 'ex', 'crude_oil', 52], ['KAZ', 'ex', 'grain', 9], ['KAZ', 'ex', 'copper', 6],
  ['KAZ', 'im', 'machinery', 20], ['KAZ', 'im', 'electronics', 12], ['KAZ', 'im', 'steel', 8],
];
