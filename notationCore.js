// ============================================================================
//  记号注册表
// ============================================================================
const NOTATION_REGISTRY = {
  help: {
    name: 'help',
    load: () => import('./notation/Help.js'),
    aliases: [],
  },
  prss: {
    name: 'PrSS',
    load: () => import('./notation/PrSS.js'),
    aliases: [],
  },
  bms: {
    name: 'BMS',
    load: () => import('./notation/BM.js'),
    aliases: ['BM4'],                 // 允许输入 bm4
  },
  y: {
    name: 'Y',
    load: () => import('./notation/1-Y.js'),
    aliases: ['1-Y','1Y'],   
  },
  wy: {
    name: 'wY',
    load: () => import('./notation/omega-Y.js'),
    aliases: ['w-Y', 'ω-Y', 'ωY', 'omega-Y', 'omegaY'],   
  },
  iblp: {
    name: 'iblp',
    load: () => import('./notation/DEN2.js'),
    aliases: ['DEN2'],
  },
  upms: {
    name: 'UPMS',
    load: () => import('./notation/UPMS.js'),
    aliases: [],   
  },
  bhm: {
    name: 'BHM',
    load: () => import('./notation/BHM.js'),
    aliases: [],
  },
  bsm: {
    name: 'BSM',
    load: () => import('./notation/BSM.js'),
    aliases: [],
  },
  pps: {
    name: 'PPS(已降链)',
    load: () => import('./notation/PPS.js'),
    aliases: ['PPS1'],   
  },
  dfss: {
    name: 'DFSS',
    load: () => import('./notation/DFSS.js'),
    aliases: [],
  },
  den: {
    name: 'DEN',
    load: () => import('./notation/DEN.js'),
    aliases: [],   
  },
  sps: {
    name: 'SPS(已降链)',
    load: () => import('./notation/SPS.js'),
    aliases: [],   
  },
};

export { NOTATION_REGISTRY };

// ============================================================================
//  构建别名 → 主键 映射（供解析器使用）
// ============================================================================
export function buildAliasMap() {
  const map = new Map();
  for (const [key, entry] of Object.entries(NOTATION_REGISTRY)) {
    // 主键本身
    map.set(key.toLowerCase(), key);
    // 所有别名（转为小写，去空格）
    if (entry.aliases) {
      for (const alias of entry.aliases) {
        const normalized = alias.toLowerCase().replace(/\s/g, '');
        map.set(normalized, key);
      }
    }
  }
  return map;
}

// ============================================================================
//  记号缓存与加载（不变）
// ============================================================================
export const notationCache = new Map();

export async function loadNotation(key) {
  if (notationCache.has(key)) return notationCache.get(key);
  const entry = NOTATION_REGISTRY[key];
  if (!entry) throw new Error(`未知记号: ${key}`);
  const mod = await entry.load();
  const required = ['parse', 'expandLimit', 'expandNormal', 'display', 'compare'];
  for (const fn of required) {
    if (typeof mod[fn] !== 'function') {
      throw new Error(`记号 "${key}" 缺少导出函数: ${fn}`);
    }
  }
  notationCache.set(key, mod);
  return mod;
}

// ============================================================================
//  适配器工厂（不变）
// ============================================================================
export function createNotationAdapter(mod, notationKey) {
  const adapter = {
    parse: mod.parse,
    expandLimit: mod.expandLimit,
    expandNormal: mod.expandNormal,
    display: mod.display,
    compare: mod.compare,
    isLimit(expr) {
      return typeof mod.isLimit === 'function' ? mod.isLimit(expr) : false;
    },
    toNative(expr) {
      return typeof mod.toNative === 'function' ? mod.toNative(expr) : null;
    },
    isSuccessor(expr) {
      return typeof mod.isSuccessor === 'function' ? mod.isSuccessor(expr) : false;
    },
    truncate(expr) {
      return typeof mod.truncate === 'function' ? mod.truncate(expr) : null;
    },
    isEmpty(expr) {
      if (typeof mod.isEmpty === 'function') return mod.isEmpty(expr);
      if (expr === null || expr === undefined) return true;
      if (Array.isArray(expr) && expr.length === 0) return true;
      return false;
    },
  };
  return adapter;
}