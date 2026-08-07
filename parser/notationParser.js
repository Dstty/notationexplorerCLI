// ============================================================================
//  记号表达式解析器
// ============================================================================
import { NOTATION_REGISTRY } from '../notationCore.js';
import { ordinalToPrSS } from './ordinalToPrSS.js';

export function parseNotation(input) {
  const trimmed = input.trim();

  // ① 优先检测：是否为序数表达式
  if (/[w^*+]/.test(trimmed)) {
    try {
      const prssSeq = ordinalToPrSS(trimmed);
      return {
        notationKey: 'prss',
        rawName: 'PrSS',
        inner: prssSeq,
        fromOrdinal: true,   // 🆕 标记来自序数表达式
      };
    } catch (err) {
      // 转换失败，继续尝试标准格式
    }
  }

  // ② 纯记号名或 "记号名 limit"
  const pureMatch = trimmed.match(/^([A-Za-z][A-Za-z0-9_]*)\s*(?:\(limit\)|\s+limit)?$/i);
  if (pureMatch) {
    const rawName = pureMatch[1];
    const key = rawName.toLowerCase();
    if (!NOTATION_REGISTRY[key]) {
      const available = Object.keys(NOTATION_REGISTRY).map(k => NOTATION_REGISTRY[k].name).join(', ');
      throw new Error(`未知记号 "${rawName}"，查询可用记号可输入/list`);
    }
    return { notationKey: key, rawName, inner: 'LIMIT_PLACEHOLDER', fromOrdinal: false };
  }

  // ③ 括号格式：记号名(表达式)
  const nameMatch = trimmed.match(/^([A-Za-z][A-Za-z0-9_]*)\s*\(/);
  if (nameMatch) {
    const rawName = nameMatch[1];
    const key = rawName.toLowerCase();
    if (!NOTATION_REGISTRY[key]) {
      const available = Object.keys(NOTATION_REGISTRY).map(k => NOTATION_REGISTRY[k].name).join(', ');
      throw new Error(`未知记号 "${rawName}"，查询可用记号可输入/list`);
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
        return { notationKey: key, rawName, inner, fromOrdinal: false };
      }
    }
  }

  // ④ 空格格式：记号名 表达式
  const nameMatchSpace = trimmed.match(/^([A-Za-z][A-Za-z0-9_]*)\s+(.+)$/);
  if (nameMatchSpace) {
    const rawName = nameMatchSpace[1];
    const key = rawName.toLowerCase();
    if (!NOTATION_REGISTRY[key]) {
      const available = Object.keys(NOTATION_REGISTRY).map(k => NOTATION_REGISTRY[k].name).join(', ');
      throw new Error(`未知记号 "${rawName}"，查询可用记号可输入/list`);
    }
    const inner = nameMatchSpace[2].trim();
    return { notationKey: key, rawName, inner, fromOrdinal: false };
  }

  throw new Error(
    '无效输入'
  );
}