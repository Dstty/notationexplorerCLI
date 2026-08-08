// ============================================================================
//  记号表达式解析器
// ============================================================================
import { NOTATION_REGISTRY } from '../notationCore.js';
import { ordinalToPrSS } from './ordinalToPrSS.js';

export function parseNotation(input) {
  const trimmed = input.trim();

  // ---------- 第一步：匹配注册表中的记号名（最长匹配） ----------
  const lowerInput = trimmed.toLowerCase();
  const keys = Object.keys(NOTATION_REGISTRY);
  let matchedKey = null;
  for (const key of keys) {
    if (lowerInput.startsWith(key)) {
      if (!matchedKey || key.length > matchedKey.length) {
        matchedKey = key;
      }
    }
  }

  if (matchedKey) {
    const key = matchedKey;
    const rawName = NOTATION_REGISTRY[key].name;
    const rest = trimmed.substring(matchedKey.length).trimStart();

    // ---- limit 格式 ----
    if (rest === '' || /^(\(limit\)|limit)$/i.test(rest)) {
      return { notationKey: key, rawName, inner: 'LIMIT_PLACEHOLDER', fromOrdinal: false };
    }

    // ---- 括号格式（支持单括号和多括号序列） ----
    if (rest.startsWith('(')) {
      let depth = 0, endIdx = -1;
      for (let i = 0; i < rest.length; i++) {
        if (rest[i] === '(') depth++;
        else if (rest[i] === ')') {
          depth--;
          if (depth === 0) { endIdx = i; break; }
        }
      }
      if (endIdx !== -1) {
        const after = rest.substring(endIdx + 1).trim();
        if (after === '') {
          // 单括号：提取括号内
          const inner = rest.substring(1, endIdx).trim();
          return { notationKey: key, rawName, inner, fromOrdinal: false };
        } else if (after.startsWith('(')) {
          // 后续还有括号：整个 rest 作为 inner
          return { notationKey: key, rawName, inner: rest, fromOrdinal: false };
        } else {
          throw new Error('括号格式不完整或有多余内容');
        }
      }
      throw new Error('括号格式不完整（括号未闭合）');
    }

    // ---- 无分隔符格式（如 prss0,1,2） ----
    if (rest.length > 0 && !/^\s/.test(rest)) {
      return { notationKey: key, rawName, inner: rest, fromOrdinal: false };
    }

    // ---- 空格格式（如 prss 0,1,2） ----
    if (/^\s/.test(rest)) {
      const inner = rest.trim();
      if (inner === '') throw new Error('空格格式缺少表达式');
      return { notationKey: key, rawName, inner, fromOrdinal: false };
    }

    throw new Error('无效输入');
  }

  // ---------- 第二步：无记号名 → 尝试序数表达式 ----------
  if (/[w^*+]/.test(trimmed)) {
    try {
      const prssSeq = ordinalToPrSS(trimmed);
      return {
        notationKey: 'prss',
        rawName: 'PrSS',
        inner: prssSeq,
        fromOrdinal: true,
      };
    } catch (_) {
      // 转换失败则继续
    }
  }

  throw new Error('无效输入：既不是记号表达式，也不是序数表达式，查询已有记号请输入/list');
}