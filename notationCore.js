// ============================================================================
//  记号注册表
// ============================================================================
const NOTATION_REGISTRY = {
  prss: {
    name: 'PrSS',
    load: () => import('./notation/PrSS.js'),
  },
  bms: {
    name: 'BMS',
    load: () => import('./notation/BM.js'),
  },
};

export { NOTATION_REGISTRY };

// ============================================================================
//  记号缓存与加载
// ============================================================================
export const notationCache = new Map();

export async function loadNotation(key) {
  if (notationCache.has(key)) return notationCache.get(key);
  const entry = NOTATION_REGISTRY[key];
  if (!entry) throw new Error(`未知记号: ${key}`);
  const mod = await entry.load();
  const required = ['parse', 'expandLimit', 'expandNormal', 'isLimit', 'display'];
  for (const fn of required) {
    if (typeof mod[fn] !== 'function') {
      throw new Error(`记号 "${key}" 缺少导出函数: ${fn}`);
    }
  }
  notationCache.set(key, mod);
  return mod;
}

// ============================================================================
//  适配器工厂
// ============================================================================
export function createNotationAdapter(mod, notationKey) {
  const adapter = {
    parse: mod.parse,
    expandLimit: mod.expandLimit,
    expandNormal: mod.expandNormal,
    isLimit: mod.isLimit,
    display: mod.display,

    isSuccessor(expr) {
      return false;
    },

    truncate(expr) {
      return null;
    },

    compare(a, b) {
      const sa = JSON.stringify(a);
      const sb = JSON.stringify(b);
      if (sa > sb) return 1;
      if (sa < sb) return -1;
      return 0;
    },

    isEmpty(expr) {
      if (expr === null || expr === undefined) return true;
      if (Array.isArray(expr) && expr.length === 0) return true;
      return false;
    },
  };

  if (mod.isSuccessor) adapter.isSuccessor = mod.isSuccessor;
  if (mod.truncate) adapter.truncate = mod.truncate;
  if (mod.compare) adapter.compare = mod.compare;
  if (mod.isEmpty) adapter.isEmpty = mod.isEmpty;

  return adapter;
}

// ============================================================================
//  输入解析（支持嵌套括号和纯记号名）
// ============================================================================
export function parseInput(input) {
  const trimmed = input.trim();

  // 纯记号名或 "记号名 limit"
  const pureMatch = trimmed.match(/^([A-Za-z][A-Za-z0-9_]*)\s*(?:\(limit\)|\s+limit)?$/i);
  if (pureMatch) {
    const rawName = pureMatch[1];
    const key = rawName.toLowerCase();
    if (!NOTATION_REGISTRY[key]) {
      const available = Object.keys(NOTATION_REGISTRY).map(k => NOTATION_REGISTRY[k].name).join(', ');
      throw new Error(`未知记号 "${rawName}"，可用: ${available || '无'}`);
    }
    return { notationKey: key, rawName, inner: 'LIMIT_PLACEHOLDER' };
  }

  // 括号格式：记号名(表达式)
  const nameMatch = trimmed.match(/^([A-Za-z][A-Za-z0-9_]*)\s*\(/);
  if (nameMatch) {
    const rawName = nameMatch[1];
    const key = rawName.toLowerCase();
    if (!NOTATION_REGISTRY[key]) {
      const available = Object.keys(NOTATION_REGISTRY).map(k => NOTATION_REGISTRY[k].name).join(', ');
      throw new Error(`未知记号 "${rawName}"，可用: ${available || '无'}`);
    }
    let depth = 0;
    const startIdx = nameMatch[0].length - 1;
    let endIdx = -1;
    for (let i = startIdx; i < trimmed.length; i++) {
      if (trimmed[i] === '(') depth++;
      else if (trimmed[i] === ')') {
        depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
    }
    if (endIdx !== -1) {
      const after = trimmed.substring(endIdx + 1).trim();
      if (after === '') {
        const inner = trimmed.substring(startIdx + 1, endIdx).trim();
        return { notationKey: key, rawName, inner };
      }
    }
  }

  // 空格格式：记号名 表达式
  const nameMatchSpace = trimmed.match(/^([A-Za-z][A-Za-z0-9_]*)\s+(.+)$/);
  if (nameMatchSpace) {
    const rawName = nameMatchSpace[1];
    const key = rawName.toLowerCase();
    if (!NOTATION_REGISTRY[key]) {
      const available = Object.keys(NOTATION_REGISTRY).map(k => NOTATION_REGISTRY[k].name).join(', ');
      throw new Error(`未知记号 "${rawName}"，可用: ${available || '无'}`);
    }
    const inner = nameMatchSpace[2].trim();
    return { notationKey: key, rawName, inner };
  }

  throw new Error('输入格式必须为 记号名(表达式) 或 记号名 表达式，例如 PrSS(0,1,2) 或 PrSS 0,1,2；或直接输入记号名如 BMS 创建占位极限');
}