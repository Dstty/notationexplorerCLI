﻿// ============================================================================
//  记号注册表
// ============================================================================
const NOTATION_REGISTRY = {
  help: {
    name: 'help',          // 显示名称，可自定义
    load: () => import('./notation/Help.js'),
  },
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
  // 必须导出的核心函数（compare 已加入必选列表）
  const required = ['parse', 'expandLimit', 'expandNormal', 'isLimit', 'display', 'compare'];
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
    compare: mod.compare, // 必选，直接使用

    // 可选函数 toNative：若模块未提供，默认返回 null
    toNative(expr) {
      return typeof mod.toNative === 'function' ? mod.toNative(expr) : null;
    },

    // 以下为可选函数，若模块提供则覆盖默认实现
    isSuccessor(expr) {
      return typeof mod.isSuccessor === 'function' ? mod.isSuccessor(expr) : false;
    },

    truncate(expr) {
      return typeof mod.truncate === 'function' ? mod.truncate(expr) : null;
    },

    isEmpty(expr) {
      if (typeof mod.isEmpty === 'function') return mod.isEmpty(expr);
      // 默认的空值判断
      if (expr === null || expr === undefined) return true;
      if (Array.isArray(expr) && expr.length === 0) return true;
      return false;
    },
  };

  return adapter;
}