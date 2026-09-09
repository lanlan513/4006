/**
 * 全球产业链种子数据。
 * 每条链由若干「阶段」(stages)、节点 (nodes: 国家在某阶段的角色) 和
 * 流向 (edges: 从上一阶段国家到下一阶段国家的货物流) 组成。
 * weight / value 为相对量级 (1-10)，用于节点大小与连线粗细。
 */

export interface ChainStage {
  key: string;
  label: string;
}

export interface ChainNodeSeed {
  code: string;
  stage: string;
  role: string;
  detail: string;
  weight: number; // 1-10
}

export interface ChainEdgeSeed {
  from: string;
  to: string;
  fromStage: string;
  toStage: string;
  label: string;
  value: number; // 1-10
}

export interface ChainSeed {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  stages: ChainStage[];
  nodes: ChainNodeSeed[];
  edges: ChainEdgeSeed[];
}

export const CHAINS: ChainSeed[] = [
  {
    id: 'oil',
    name: '石油',
    subtitle: '从油田到加油站',
    description:
      '原油是全球贸易额最大的大宗商品。油轮与管道把波斯湾、西伯利亚、西非和北美的油田，连接到中国、印度、欧美和东北亚的炼厂与消费市场。',
    stages: [
      { key: 'resource', label: '资源开采' },
      { key: 'refine', label: '炼化加工' },
      { key: 'consume', label: '终端消费' },
    ],
    nodes: [
      { code: 'SAU', stage: 'resource', role: '全球最大原油出口国', detail: '加瓦尔等巨型油田；原油主要流向中国、日本与韩国', weight: 9 },
      { code: 'RUS', stage: 'resource', role: '第二大原油出口国', detail: '西西伯利亚油田；2023 年出口重心东移至中国与印度', weight: 8 },
      { code: 'USA', stage: 'resource', role: '页岩革命后的最大产油国', detail: '二叠纪盆地页岩油；产量居全球首位', weight: 8 },
      { code: 'CAN', stage: 'resource', role: '油砂与页岩油', detail: '原油几乎全部输往美国中西部与墨西哥湾炼厂', weight: 6 },
      { code: 'IRQ', stage: 'resource', role: 'OPEC 第二大产油国', detail: '巴士拉轻质原油；中国与印度是最大买家', weight: 6 },
      { code: 'ARE', stage: 'resource', role: '海湾传统产油国', detail: '阿布扎比油田；兼营炼化与转口贸易', weight: 5 },
      { code: 'IRN', stage: 'resource', role: '波斯湾资源国', detail: '储量居全球前列；出口渠道受制裁影响', weight: 5 },
      { code: 'NGA', stage: 'resource', role: '非洲最大产油国', detail: '几内亚湾轻质低硫原油，销往印度与欧洲', weight: 4 },
      { code: 'KAZ', stage: 'resource', role: '里海油气国', detail: '田吉兹油田；经管道输往中国与欧洲', weight: 4 },
      { code: 'NOR', stage: 'resource', role: '西欧最大油气生产国', detail: '北海油田；原油与天然气供应欧洲', weight: 4 },
      { code: 'KWT', stage: 'resource', role: '波斯湾产油国', detail: '原油与成品油出口并重', weight: 3 },
      { code: 'CHN', stage: 'refine', role: '全球最大炼油国', detail: '山东、辽宁炼化集群；进口原油加工供国内消费', weight: 9 },
      { code: 'IND', stage: 'refine', role: '增长最快的炼化中心', detail: '信实等私营炼厂进口中东原油，大量出口成品油', weight: 7 },
      { code: 'KOR', stage: 'refine', role: '高端炼化强国', detail: '蔚山炼化集群；成品油与石化品出口', weight: 6 },
      { code: 'USA', stage: 'refine', role: '最大成品油生产国', detail: '墨西哥湾炼厂带加工本土与加拿大原油', weight: 6 },
      { code: 'JPN', stage: 'refine', role: '成熟炼化国', detail: '进口中东原油加工后供国内消费', weight: 5 },
      { code: 'SAU', stage: 'refine', role: '向下游延伸', detail: '延布炼化合资项目，原油就地加工增值', weight: 4 },
      { code: 'USA', stage: 'consume', role: '最大石油消费国', detail: '交通燃料与化工原料需求全球第一', weight: 9 },
      { code: 'CHN', stage: 'consume', role: '最大原油进口国', detail: '2023 年自沙特、俄罗斯、伊拉克进口居前', weight: 9 },
      { code: 'IND', stage: 'consume', role: '第三大石油消费国', detail: '机动化与工业化推动需求快速增长', weight: 7 },
      { code: 'JPN', stage: 'consume', role: '成熟油气进口国', detail: '几乎全部依赖进口，储备体系完善', weight: 6 },
      { code: 'DEU', stage: 'consume', role: '欧洲最大能源消费市场', detail: '化工与交通需求；进口来源多元化', weight: 5 },
    ],
    edges: [
      { from: 'SAU', to: 'CHN', fromStage: 'resource', toStage: 'refine', label: '原油', value: 9 },
      { from: 'SAU', to: 'JPN', fromStage: 'resource', toStage: 'refine', label: '原油', value: 6 },
      { from: 'SAU', to: 'KOR', fromStage: 'resource', toStage: 'refine', label: '原油', value: 5 },
      { from: 'RUS', to: 'CHN', fromStage: 'resource', toStage: 'refine', label: '管道原油', value: 8 },
      { from: 'RUS', to: 'IND', fromStage: 'resource', toStage: 'refine', label: '海运原油', value: 6 },
      { from: 'RUS', to: 'DEU', fromStage: 'resource', toStage: 'consume', label: '管道油气(骤降)', value: 2 },
      { from: 'CAN', to: 'USA', fromStage: 'resource', toStage: 'refine', label: '管道原油', value: 8 },
      { from: 'IRQ', to: 'CHN', fromStage: 'resource', toStage: 'refine', label: '巴士拉原油', value: 6 },
      { from: 'IRQ', to: 'IND', fromStage: 'resource', toStage: 'refine', label: '原油', value: 4 },
      { from: 'NGA', to: 'IND', fromStage: 'resource', toStage: 'refine', label: '轻质原油', value: 3 },
      { from: 'KAZ', to: 'CHN', fromStage: 'resource', toStage: 'refine', label: '中哈管道原油', value: 3 },
      { from: 'NOR', to: 'DEU', fromStage: 'resource', toStage: 'consume', label: '北海原油', value: 3 },
      { from: 'IRN', to: 'CHN', fromStage: 'resource', toStage: 'refine', label: '原油(受限渠道)', value: 3 },
      { from: 'ARE', to: 'JPN', fromStage: 'resource', toStage: 'refine', label: '原油', value: 3 },
      { from: 'KWT', to: 'CHN', fromStage: 'resource', toStage: 'refine', label: '原油', value: 2 },
      { from: 'CHN', to: 'CHN', fromStage: 'refine', toStage: 'consume', label: '成品油内需', value: 8 },
      { from: 'IND', to: 'IND', fromStage: 'refine', toStage: 'consume', label: '成品油内需', value: 6 },
      { from: 'KOR', to: 'JPN', fromStage: 'refine', toStage: 'consume', label: '成品油', value: 3 },
    ],
  },
  {
    id: 'auto',
    name: '汽车',
    subtitle: '三万个零件的全球分工',
    description:
      '汽车是产业链最长的制成品之一：品牌与设计在德日美韩，零部件在日本、中国、墨西哥和东南亚，整车组装贴近最大市场，最终销往北美、中国与欧洲。',
    stages: [
      { key: 'brand', label: '品牌设计' },
      { key: 'parts', label: '核心零部件' },
      { key: 'assembly', label: '制造组装' },
      { key: 'market', label: '销售市场' },
    ],
    nodes: [
      { code: 'DEU', stage: 'brand', role: '豪华车与工业设计', detail: '大众、宝马、奔驰；全球供应链组织者', weight: 9 },
      { code: 'JPN', stage: 'brand', role: '精益生产标杆', detail: '丰田、本田；混动技术与全球分工', weight: 9 },
      { code: 'USA', stage: 'brand', role: '本土品牌与皮卡市场', detail: '福特、通用与特斯拉；电动化转型', weight: 8 },
      { code: 'KOR', stage: 'brand', role: '快速崛起的车企', detail: '现代 / 起亚；新能源转型激进', weight: 7 },
      { code: 'CHN', stage: 'brand', role: '最大市场与新能源出口国', detail: '比亚迪等；2023 年成为全球最大汽车出口国', weight: 7 },
      { code: 'JPN', stage: 'parts', role: '核心零部件强国', detail: '电装、爱信；发动机与汽车电子', weight: 8 },
      { code: 'DEU', stage: 'parts', role: '高端零部件集群', detail: '博世、大陆；工业技术输出全球', weight: 7 },
      { code: 'CHN', stage: 'parts', role: '完整零部件体系', detail: '动力电池、电子件具备成本与规模优势', weight: 6 },
      { code: 'MEX', stage: 'parts', role: '近岸零部件基地', detail: '为北美总装线配套，深度嵌入美墨加链条', weight: 6 },
      { code: 'THA', stage: 'parts', role: '亚洲零部件配套', detail: '为日系车东南亚产能配套', weight: 5 },
      { code: 'MEX', stage: 'assembly', role: '对美汽车出口平台', detail: '整车与零部件年对美出口近千亿美元', weight: 8 },
      { code: 'CHN', stage: 'assembly', role: '新能源汽车制造中心', detail: '完整产业链支撑整车出口新兴市场与欧洲', weight: 7 },
      { code: 'KOR', stage: 'assembly', role: '整车出口国', detail: '现代 / 起亚整车销往美欧', weight: 6 },
      { code: 'THA', stage: 'assembly', role: '亚洲皮卡制造中心', detail: '日系品牌主导，出口澳新与东盟', weight: 6 },
      { code: 'USA', stage: 'market', role: '全球最大汽车利润市场', detail: '皮卡与 SUV 需求旺盛', weight: 9 },
      { code: 'CHN', stage: 'market', role: '最大新车销售市场', detail: '年销量超过 2600 万辆', weight: 9 },
      { code: 'DEU', stage: 'market', role: '欧洲核心市场', detail: '豪华车主场与欧洲枢纽', weight: 6 },
      { code: 'GBR', stage: 'market', role: '成熟进口市场', detail: '欧系与日系车主导', weight: 5 },
      { code: 'AUS', stage: 'market', role: '日系皮卡主要进口国', detail: '泰国制造的皮卡与 SUV 大量进口', weight: 4 },
    ],
    edges: [
      { from: 'JPN', to: 'THA', fromStage: 'parts', toStage: 'assembly', label: '发动机 / 电子件', value: 6 },
      { from: 'JPN', to: 'MEX', fromStage: 'parts', toStage: 'assembly', label: '零部件', value: 5 },
      { from: 'DEU', to: 'MEX', fromStage: 'parts', toStage: 'assembly', label: '高端零部件', value: 4 },
      { from: 'MEX', to: 'USA', fromStage: 'assembly', toStage: 'market', label: '整车出口', value: 9 },
      { from: 'THA', to: 'AUS', fromStage: 'assembly', toStage: 'market', label: '皮卡 / SUV', value: 5 },
      { from: 'KOR', to: 'USA', fromStage: 'assembly', toStage: 'market', label: '整车', value: 7 },
      { from: 'CHN', to: 'DEU', fromStage: 'assembly', toStage: 'market', label: '新能源整车', value: 4 },
      { from: 'JPN', to: 'USA', fromStage: 'brand', toStage: 'market', label: '整车出口', value: 7 },
      { from: 'DEU', to: 'CHN', fromStage: 'brand', toStage: 'market', label: '豪华车', value: 6 },
      { from: 'DEU', to: 'USA', fromStage: 'brand', toStage: 'market', label: '豪华车', value: 5 },
      { from: 'USA', to: 'USA', fromStage: 'brand', toStage: 'market', label: '本土产销', value: 6 },
      { from: 'CHN', to: 'CHN', fromStage: 'brand', toStage: 'market', label: '本土产销', value: 7 },
    ],
  },
  {
    id: 'chip',
    name: '半导体',
    subtitle: '指甲盖上的全球分工',
    description:
      '芯片可能是全球分工最细的产品：核心设备在荷兰、材料在日本、设计在美国与英国、最先进的制造在台湾和韩国、封装测试在中国与东南亚，最后进入全球的手机、电脑与汽车。',
    stages: [
      { key: 'equip', label: '设备与材料' },
      { key: 'design', label: '芯片设计' },
      { key: 'fab', label: '晶圆制造' },
      { key: 'atp', label: '封装测试' },
      { key: 'terminal', label: '终端产品' },
    ],
    nodes: [
      { code: 'NLD', stage: 'equip', role: 'ASML 光刻机', detail: '全球唯一 EUV 光刻机供应商，先进制程的咽喉', weight: 9 },
      { code: 'JPN', stage: 'equip', role: '半导体材料与设备', detail: '光刻胶、硅片、精密化学品份额全球领先', weight: 8 },
      { code: 'USA', stage: 'equip', role: 'EDA 与核心设备', detail: '芯片设计软件与应用材料等设备', weight: 7 },
      { code: 'USA', stage: 'design', role: 'Fabless 设计中心', detail: '英伟达、苹果、高通、AMD 定义芯片架构', weight: 9 },
      { code: 'GBR', stage: 'design', role: '芯片 IP', detail: 'ARM 架构授权全球绝大多数移动芯片', weight: 6 },
      { code: 'TWN', stage: 'design', role: '芯片设计', detail: '联发科等，与本地制造紧密协同', weight: 6 },
      { code: 'TWN', stage: 'fab', role: '全球先进制程中心', detail: '台积电占全球最先进制程九成以上份额', weight: 9 },
      { code: 'KOR', stage: 'fab', role: '存储与先进制程', detail: '三星；存储芯片双寡头之一', weight: 8 },
      { code: 'USA', stage: 'fab', role: '本土制造回流', detail: '英特尔；政策推动晶圆厂建设', weight: 6 },
      { code: 'CHN', stage: 'atp', role: '封装测试重镇', detail: '长电等企业承接全球封测订单', weight: 7 },
      { code: 'TWN', stage: 'atp', role: '封测一体化', detail: '日月光；与晶圆制造协同', weight: 5 },
      { code: 'MYS', stage: 'atp', role: '东南亚封测中心', detail: '槟城电子集群；英特尔、AMD 封测基地', weight: 6 },
      { code: 'VNM', stage: 'atp', role: '新兴封测与组装', detail: '英特尔、三星等持续投资布局', weight: 5 },
      { code: 'USA', stage: 'terminal', role: '芯片终端与标准', detail: '苹果、英伟达生态；高端需求所在地', weight: 8 },
      { code: 'CHN', stage: 'terminal', role: '最大电子制造与消费市场', detail: '手机、PC 整机制造与消费一体', weight: 8 },
      { code: 'KOR', stage: 'terminal', role: '终端品牌', detail: '三星手机与消费电子', weight: 6 },
    ],
    edges: [
      { from: 'NLD', to: 'TWN', fromStage: 'equip', toStage: 'fab', label: 'EUV / 光刻机', value: 9 },
      { from: 'NLD', to: 'KOR', fromStage: 'equip', toStage: 'fab', label: '光刻机', value: 8 },
      { from: 'JPN', to: 'TWN', fromStage: 'equip', toStage: 'fab', label: '光刻胶 / 硅片', value: 7 },
      { from: 'USA', to: 'TWN', fromStage: 'equip', toStage: 'fab', label: '设备 / EDA', value: 6 },
      { from: 'USA', to: 'TWN', fromStage: 'design', toStage: 'fab', label: '设计订单(代工)', value: 9 },
      { from: 'USA', to: 'KOR', fromStage: 'design', toStage: 'fab', label: '设计订单', value: 6 },
      { from: 'GBR', to: 'TWN', fromStage: 'design', toStage: 'fab', label: 'ARM IP 授权', value: 5 },
      { from: 'TWN', to: 'CHN', fromStage: 'fab', toStage: 'atp', label: '晶圆 / 芯片', value: 8 },
      { from: 'TWN', to: 'MYS', fromStage: 'fab', toStage: 'atp', label: '芯片封测', value: 6 },
      { from: 'TWN', to: 'VNM', fromStage: 'fab', toStage: 'atp', label: '芯片封测', value: 4 },
      { from: 'KOR', to: 'VNM', fromStage: 'fab', toStage: 'atp', label: '存储 / 芯片', value: 5 },
      { from: 'CHN', to: 'USA', fromStage: 'atp', toStage: 'terminal', label: '电子整机', value: 7 },
      { from: 'MYS', to: 'USA', fromStage: 'atp', toStage: 'terminal', label: '芯片 / 整机', value: 4 },
      { from: 'VNM', to: 'KOR', fromStage: 'atp', toStage: 'terminal', label: '电子组装', value: 5 },
      { from: 'CHN', to: 'CHN', fromStage: 'atp', toStage: 'terminal', label: '本土整机配套', value: 6 },
    ],
  },
  {
    id: 'phone',
    name: '手机',
    subtitle: '口袋里的全球供应链',
    description:
      '一部手机汇集了刚果的钴、南美的锂、印尼的镍、台湾的芯片、韩国的屏幕，最后在中国或越南组装，销往美国、中国与印度等市场。',
    stages: [
      { key: 'mineral', label: '关键矿产' },
      { key: 'component', label: '核心器件' },
      { key: 'assembly', label: '品牌与组装' },
      { key: 'market', label: '消费市场' },
    ],
    nodes: [
      { code: 'COD', stage: 'mineral', role: '钴矿主产国', detail: '全球约七成钴产量，电池稳定性关键原料', weight: 7 },
      { code: 'CHL', stage: 'mineral', role: '锂资源大国', detail: '阿塔卡马盐湖；碳酸锂重要来源', weight: 6 },
      { code: 'IDN', stage: 'mineral', role: '镍矿主产国', detail: '全球最大镍生产国；电池与不锈钢原料', weight: 6 },
      { code: 'AUS', stage: 'mineral', role: '锂矿出口国', detail: '格林布什硬岩锂矿，精矿运往中国精炼', weight: 7 },
      { code: 'TWN', stage: 'component', role: '核心处理器芯片', detail: '台积电代工苹果与安卓旗舰芯片', weight: 8 },
      { code: 'KOR', stage: 'component', role: '存储与屏幕', detail: '三星存储、OLED 屏与核心被动元件', weight: 8 },
      { code: 'JPN', stage: 'component', role: '精密元器件', detail: 'CMOS 传感器、被动元件与材料', weight: 6 },
      { code: 'CHN', stage: 'component', role: '电池与结构件', detail: '电池模组、连接器与整机零部件', weight: 6 },
      { code: 'USA', stage: 'assembly', role: '品牌与设计总部', detail: '苹果定义产品与生态', weight: 7 },
      { code: 'KOR', stage: 'assembly', role: '三星品牌', detail: '芯片、屏幕到整机垂直整合', weight: 7 },
      { code: 'CHN', stage: 'assembly', role: '全球最大组装基地', detail: '富士康等组装全球多数 iPhone', weight: 8 },
      { code: 'VNM', stage: 'assembly', role: '新兴组装中心', detail: '富士康、三星产能转移；对美出口快速增长', weight: 7 },
      { code: 'IND', stage: 'assembly', role: '成长中的组装基地', detail: '苹果供应链转移；面向本土大市场', weight: 6 },
      { code: 'USA', stage: 'market', role: '高端手机最大利润市场', detail: '高 ASP 市场，品牌利润集中', weight: 8 },
      { code: 'CHN', stage: 'market', role: '最大智能手机市场', detail: '国产与国际品牌充分竞争', weight: 8 },
      { code: 'IND', stage: 'market', role: '增长最快的大市场', detail: '功能机转智能机红利', weight: 7 },
      { code: 'DEU', stage: 'market', role: '欧洲核心市场', detail: '高端机型需求稳定', weight: 5 },
    ],
    edges: [
      { from: 'COD', to: 'CHN', fromStage: 'mineral', toStage: 'component', label: '钴原料', value: 7 },
      { from: 'CHL', to: 'CHN', fromStage: 'mineral', toStage: 'component', label: '锂盐', value: 5 },
      { from: 'IDN', to: 'CHN', fromStage: 'mineral', toStage: 'component', label: '镍产品', value: 6 },
      { from: 'AUS', to: 'CHN', fromStage: 'mineral', toStage: 'component', label: '锂精矿', value: 6 },
      { from: 'TWN', to: 'CHN', fromStage: 'component', toStage: 'assembly', label: '处理器芯片', value: 8 },
      { from: 'TWN', to: 'VNM', fromStage: 'component', toStage: 'assembly', label: '芯片', value: 7 },
      { from: 'KOR', to: 'VNM', fromStage: 'component', toStage: 'assembly', label: '屏幕 / 存储', value: 7 },
      { from: 'JPN', to: 'CHN', fromStage: 'component', toStage: 'assembly', label: '精密元器件', value: 6 },
      { from: 'CHN', to: 'IND', fromStage: 'component', toStage: 'assembly', label: '零部件', value: 5 },
      { from: 'VNM', to: 'USA', fromStage: 'assembly', toStage: 'market', label: '手机整机', value: 8 },
      { from: 'CHN', to: 'USA', fromStage: 'assembly', toStage: 'market', label: '手机整机', value: 7 },
      { from: 'VNM', to: 'DEU', fromStage: 'assembly', toStage: 'market', label: '手机整机', value: 5 },
      { from: 'KOR', to: 'USA', fromStage: 'assembly', toStage: 'market', label: '三星整机', value: 5 },
      { from: 'CHN', to: 'CHN', fromStage: 'assembly', toStage: 'market', label: '本土产销', value: 7 },
      { from: 'IND', to: 'IND', fromStage: 'assembly', toStage: 'market', label: '本土组装销售', value: 5 },
    ],
  },
  {
    id: 'battery',
    name: '锂电池',
    subtitle: '新能源浪潮的核心载体',
    description:
      '锂、钴、镍从澳大利亚、智利、刚果和印尼的矿场出发，绝大部分在中国精炼，制成电芯后装入中国、美国与欧洲的电动车。',
    stages: [
      { key: 'resource', label: '资源开采' },
      { key: 'refine', label: '精炼加工' },
      { key: 'cell', label: '电芯制造' },
      { key: 'pack', label: '电池包与整车' },
      { key: 'market', label: '终端市场' },
    ],
    nodes: [
      { code: 'AUS', stage: 'resource', role: '锂矿核心供应国', detail: '硬岩锂矿；出口精矿至中国精炼', weight: 8 },
      { code: 'CHL', stage: 'resource', role: '盐湖锂资源', detail: '全球最大锂储量；碳酸锂出口', weight: 7 },
      { code: 'COD', stage: 'resource', role: '钴资源国', detail: '铜钴伴生矿；电池稳定性关键原料', weight: 6 },
      { code: 'IDN', stage: 'resource', role: '镍资源霸主', detail: '镍产量占全球一半以上；高镍电池原料', weight: 7 },
      { code: 'CHN', stage: 'resource', role: '石墨与稀土', detail: '天然石墨负极原料与加工体系', weight: 5 },
      { code: 'CHN', stage: 'refine', role: '锂电材料精炼中心', detail: '全球约七成锂、九成钴精炼产能在中国', weight: 9 },
      { code: 'KOR', stage: 'refine', role: '正极材料加工', detail: 'POSCO 等为本土电池产业配套', weight: 5 },
      { code: 'CHN', stage: 'cell', role: '电芯制造双巨头', detail: '宁德时代、比亚迪；全球份额过半', weight: 8 },
      { code: 'KOR', stage: 'cell', role: '电芯三强', detail: 'LG 新能源、SK On、三星 SDI', weight: 7 },
      { code: 'JPN', stage: 'cell', role: '动力电池老牌', detail: '松下；与特斯拉深度绑定', weight: 6 },
      { code: 'CHN', stage: 'pack', role: '电池包与电动车制造', detail: '比亚迪与特斯拉上海；整车出口', weight: 7 },
      { code: 'USA', stage: 'pack', role: '北美电池包与整车', detail: '通胀削减法案推动本土产能建设', weight: 6 },
      { code: 'DEU', stage: 'pack', role: '欧洲电池与整车厂', detail: '大众、宝马欧洲电动化平台', weight: 5 },
      { code: 'CHN', stage: 'market', role: '最大新能源车市场', detail: '年销量占全球六成以上', weight: 9 },
      { code: 'USA', stage: 'market', role: '高增长电动化市场', detail: '政策补贴驱动渗透率快速提升', weight: 7 },
      { code: 'DEU', stage: 'market', role: '欧洲最大电动车市场', detail: '本土与中国品牌竞争加剧', weight: 6 },
    ],
    edges: [
      { from: 'AUS', to: 'CHN', fromStage: 'resource', toStage: 'refine', label: '锂精矿', value: 8 },
      { from: 'CHL', to: 'CHN', fromStage: 'resource', toStage: 'refine', label: '碳酸锂', value: 7 },
      { from: 'COD', to: 'CHN', fromStage: 'resource', toStage: 'refine', label: '钴原料', value: 7 },
      { from: 'IDN', to: 'CHN', fromStage: 'resource', toStage: 'refine', label: '镍产品', value: 7 },
      { from: 'KOR', to: 'USA', fromStage: 'cell', toStage: 'pack', label: '电芯', value: 6 },
      { from: 'JPN', to: 'USA', fromStage: 'cell', toStage: 'pack', label: '电芯', value: 5 },
      { from: 'KOR', to: 'DEU', fromStage: 'cell', toStage: 'pack', label: '电芯(波兰工厂)', value: 5 },
      { from: 'CHN', to: 'USA', fromStage: 'pack', toStage: 'market', label: '电池包 / 整车', value: 6 },
      { from: 'CHN', to: 'DEU', fromStage: 'pack', toStage: 'market', label: '电池 / 整车', value: 5 },
      { from: 'CHN', to: 'CHN', fromStage: 'refine', toStage: 'market', label: '本土一体化', value: 9 },
    ],
  },
  {
    id: 'grain',
    name: '粮食',
    subtitle: '养活世界的贸易航线',
    description:
      '粮食贸易决定进口国的餐桌与通胀：黑海的小麦流向中东与北非，美洲的大豆运往中国压榨，东南亚的稻米供应人口大国。',
    stages: [
      { key: 'farm', label: '生产出口' },
      { key: 'process', label: '加工中转' },
      { key: 'consume', label: '进口消费' },
    ],
    nodes: [
      { code: 'USA', stage: 'farm', role: '玉米 / 大豆 / 小麦全能出口国', detail: '中部平原；大豆玉米销往中国与墨西哥', weight: 9 },
      { code: 'BRA', stage: 'farm', role: '大豆与玉米超级出口国', detail: '中部农业带；大豆出口量全球第一', weight: 9 },
      { code: 'ARG', stage: 'farm', role: '大豆与小麦出口国', detail: '潘帕斯草原；豆粕大量出口', weight: 7 },
      { code: 'RUS', stage: 'farm', role: '小麦出口霸主', detail: '黑海地区；小麦供应北非与中东', weight: 8 },
      { code: 'CAN', stage: 'farm', role: '小麦与油菜籽出口', detail: '草原三省；油菜籽主要销往中国', weight: 6 },
      { code: 'AUS', stage: 'farm', role: '小麦出口国', detail: '墨累-达令盆地；销往亚洲', weight: 5 },
      { code: 'THA', stage: 'farm', role: '稻米出口大国', detail: '湄南河三角洲；茉莉香米', weight: 5 },
      { code: 'VNM', stage: 'farm', role: '稻米出口国', detail: '湄公河三角洲', weight: 5 },
      { code: 'FRA', stage: 'farm', role: '欧盟小麦主产国', detail: '巴黎盆地小麦；区内贸易为主', weight: 5 },
      { code: 'CHN', stage: 'process', role: '大豆压榨与饲料中心', detail: '全球最大大豆进口国；榨油与蛋白饲料', weight: 8 },
      { code: 'NLD', stage: 'process', role: '欧洲农产品中转枢纽', detail: '鹿特丹港；豆粕与粮食分拨', weight: 5 },
      { code: 'EGY', stage: 'process', role: '小麦加工与补贴体系', detail: '全球最大小麦进口国之一；大饼补贴', weight: 4 },
      { code: 'CHN', stage: 'consume', role: '最大农产品进口国', detail: '大豆进口量占全球约六成', weight: 9 },
      { code: 'EGY', stage: 'consume', role: '小麦进口依赖', detail: '口粮高度依赖黑海小麦', weight: 7 },
      { code: 'JPN', stage: 'consume', role: '粮食净进口国', detail: '饲料谷物与食品高度依赖进口', weight: 6 },
      { code: 'MEX', stage: 'consume', role: '玉米进口大国', detail: '饲用玉米主要依赖美国', weight: 6 },
      { code: 'NGA', stage: 'consume', role: '人口大国粮食进口', detail: '稻米与小麦进口持续增长', weight: 5 },
      { code: 'BGD', stage: 'consume', role: '稻米与小麦进口', detail: '人口密集，口粮缺口大', weight: 5 },
      { code: 'SAU', stage: 'consume', role: '饲料粮进口', detail: '耕地稀缺，粮食几乎全部进口', weight: 5 },
      { code: 'PHL', stage: 'consume', role: '稻米进口国', detail: '全球主要大米进口国之一', weight: 5 },
      { code: 'TUR', stage: 'consume', role: '小麦加工枢纽', detail: '进口小麦加工面粉后再出口', weight: 5 },
    ],
    edges: [
      { from: 'USA', to: 'CHN', fromStage: 'farm', toStage: 'process', label: '大豆 / 玉米', value: 9 },
      { from: 'BRA', to: 'CHN', fromStage: 'farm', toStage: 'process', label: '大豆', value: 9 },
      { from: 'ARG', to: 'CHN', fromStage: 'farm', toStage: 'process', label: '大豆', value: 4 },
      { from: 'ARG', to: 'NLD', fromStage: 'farm', toStage: 'process', label: '豆粕', value: 5 },
      { from: 'CAN', to: 'CHN', fromStage: 'farm', toStage: 'process', label: '油菜籽', value: 4 },
      { from: 'FRA', to: 'NLD', fromStage: 'farm', toStage: 'process', label: '小麦', value: 5 },
      { from: 'RUS', to: 'EGY', fromStage: 'farm', toStage: 'process', label: '小麦', value: 8 },
      { from: 'RUS', to: 'TUR', fromStage: 'farm', toStage: 'consume', label: '小麦', value: 6 },
      { from: 'USA', to: 'MEX', fromStage: 'farm', toStage: 'consume', label: '玉米', value: 7 },
      { from: 'AUS', to: 'JPN', fromStage: 'farm', toStage: 'consume', label: '小麦', value: 5 },
      { from: 'THA', to: 'SAU', fromStage: 'farm', toStage: 'consume', label: '稻米', value: 4 },
      { from: 'VNM', to: 'PHL', fromStage: 'farm', toStage: 'consume', label: '稻米', value: 4 },
      { from: 'USA', to: 'NGA', fromStage: 'farm', toStage: 'consume', label: '小麦', value: 3 },
      { from: 'THA', to: 'BGD', fromStage: 'farm', toStage: 'consume', label: '稻米', value: 3 },
      { from: 'CHN', to: 'CHN', fromStage: 'process', toStage: 'consume', label: '豆粕 / 食用油', value: 8 },
      { from: 'EGY', to: 'EGY', fromStage: 'process', toStage: 'consume', label: '补贴面粉', value: 6 },
    ],
  },
];
