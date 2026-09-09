/**
 * 国家主数据
 * region 为内部区域编码，前端映射为中文展示名。
 * lon/lat 为国家大致地理中心（或首都），用于地图上的贸易弧线与产业链节点定位。
 * iso 为 ISO 3166-1 numeric 编码，与 Natural Earth / world-atlas 拓扑数据的 feature id 对应。
 */
export interface CountrySeed {
  code: string; // ISO3
  name: string; // 中文名
  region: string;
  iso: string; // ISO numeric
  lon: number;
  lat: number;
}

export const REGIONS: Record<string, string> = {
  north_america: '北美',
  east_asia: '东亚与太平洋',
  europe: '欧洲',
  south_asia: '南亚',
  latin_america: '拉美与加勒比',
  mideast: '中东与北非',
  sub_saharan_africa: '撒哈拉以南非洲',
  central_asia: '中亚',
};

export const COUNTRIES: CountrySeed[] = [
  { code: 'USA', name: '美国', region: 'north_america', iso: '840', lon: -98.5, lat: 39.0 },
  { code: 'CHN', name: '中国', region: 'east_asia', iso: '156', lon: 104.0, lat: 35.0 },
  { code: 'JPN', name: '日本', region: 'east_asia', iso: '392', lon: 138.0, lat: 36.5 },
  { code: 'DEU', name: '德国', region: 'europe', iso: '276', lon: 10.5, lat: 51.2 },
  { code: 'IND', name: '印度', region: 'south_asia', iso: '356', lon: 78.5, lat: 22.0 },
  { code: 'GBR', name: '英国', region: 'europe', iso: '826', lon: -2.0, lat: 54.0 },
  { code: 'FRA', name: '法国', region: 'europe', iso: '250', lon: 2.5, lat: 46.5 },
  { code: 'ITA', name: '意大利', region: 'europe', iso: '380', lon: 12.5, lat: 42.5 },
  { code: 'BRA', name: '巴西', region: 'latin_america', iso: '076', lon: -53.0, lat: -10.5 },
  { code: 'CAN', name: '加拿大', region: 'north_america', iso: '124', lon: -106.0, lat: 56.5 },
  { code: 'RUS', name: '俄罗斯', region: 'europe', iso: '643', lon: 90.0, lat: 60.0 },
  { code: 'KOR', name: '韩国', region: 'east_asia', iso: '410', lon: 127.8, lat: 36.5 },
  { code: 'AUS', name: '澳大利亚', region: 'east_asia', iso: '036', lon: 134.0, lat: -25.0 },
  { code: 'MEX', name: '墨西哥', region: 'north_america', iso: '484', lon: -102.0, lat: 23.5 },
  { code: 'ESP', name: '西班牙', region: 'europe', iso: '724', lon: -3.7, lat: 40.0 },
  { code: 'IDN', name: '印度尼西亚', region: 'east_asia', iso: '360', lon: 118.0, lat: -2.5 },
  { code: 'NLD', name: '荷兰', region: 'europe', iso: '528', lon: 5.3, lat: 52.1 },
  { code: 'SAU', name: '沙特阿拉伯', region: 'mideast', iso: '682', lon: 45.0, lat: 24.0 },
  { code: 'TUR', name: '土耳其', region: 'mideast', iso: '792', lon: 35.0, lat: 39.0 },
  { code: 'CHE', name: '瑞士', region: 'europe', iso: '756', lon: 8.2, lat: 46.8 },
  { code: 'POL', name: '波兰', region: 'europe', iso: '616', lon: 19.0, lat: 52.0 },
  { code: 'ARG', name: '阿根廷', region: 'latin_america', iso: '032', lon: -64.0, lat: -34.0 },
  { code: 'SWE', name: '瑞典', region: 'europe', iso: '752', lon: 16.5, lat: 62.0 },
  { code: 'ARE', name: '阿联酋', region: 'mideast', iso: '784', lon: 54.0, lat: 24.0 },
  { code: 'ZAF', name: '南非', region: 'sub_saharan_africa', iso: '710', lon: 24.0, lat: -29.0 },
  { code: 'SGP', name: '新加坡', region: 'east_asia', iso: '702', lon: 103.8, lat: 1.35 },
  { code: 'NOR', name: '挪威', region: 'europe', iso: '578', lon: 10.0, lat: 62.0 },
  { code: 'VNM', name: '越南', region: 'east_asia', iso: '704', lon: 108.0, lat: 16.0 },
  { code: 'THA', name: '泰国', region: 'east_asia', iso: '764', lon: 101.0, lat: 15.0 },
  { code: 'MYS', name: '马来西亚', region: 'east_asia', iso: '458', lon: 102.0, lat: 4.0 },
  { code: 'EGY', name: '埃及', region: 'mideast', iso: '818', lon: 30.0, lat: 27.0 },
  { code: 'NGA', name: '尼日利亚', region: 'sub_saharan_africa', iso: '566', lon: 8.0, lat: 9.0 },
  { code: 'BGD', name: '孟加拉国', region: 'south_asia', iso: '050', lon: 90.0, lat: 24.0 },
  { code: 'PHL', name: '菲律宾', region: 'east_asia', iso: '608', lon: 122.0, lat: 13.0 },
  { code: 'CHL', name: '智利', region: 'latin_america', iso: '152', lon: -71.0, lat: -30.0 },
  { code: 'TWN', name: '台湾', region: 'east_asia', iso: '158', lon: 121.0, lat: 23.7 },
  { code: 'IRN', name: '伊朗', region: 'mideast', iso: '364', lon: 53.0, lat: 32.5 },
  { code: 'IRQ', name: '伊拉克', region: 'mideast', iso: '368', lon: 44.0, lat: 33.0 },
  { code: 'QAT', name: '卡塔尔', region: 'mideast', iso: '634', lon: 51.2, lat: 25.3 },
  { code: 'KWT', name: '科威特', region: 'mideast', iso: '414', lon: 47.5, lat: 29.3 },
  { code: 'COD', name: '刚果(金)', region: 'sub_saharan_africa', iso: '180', lon: 22.0, lat: -3.0 },
  { code: 'PER', name: '秘鲁', region: 'latin_america', iso: '604', lon: -76.0, lat: -10.0 },
  { code: 'KAZ', name: '哈萨克斯坦', region: 'central_asia', iso: '398', lon: 67.0, lat: 48.0 },
];

export const YEARS = [2000, 2005, 2010, 2015, 2020, 2023];
