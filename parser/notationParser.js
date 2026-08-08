// ============================================================================
//  记号表达式解析器
// ============================================================================
import { NOTATION_REGISTRY, buildAliasMap } from '../notationCore.js';
import { ordinalToPrSS } from './ordinalToPrSS.js';

// 预构建别名映射（避免重复构建）
const aliasMap = buildAliasMap();

// 获取所有可用的候选键（主键 + 别名），并去重
const allCandidates = Array.from(aliasMap.keys());

export function parseNotation(input) {
  let trimmed = input.trim();

  // ---------- 第一步：处理 "limit" 前缀 ----------
  const limitParenMatch = trimmed.match(/^limit\s*\((.+)\)\s*$/i);
  if (limitParenMatch) {
    trimmed = limitParenMatch[1].trim();
  } else {
    const limitSpaceMatch = trimmed.match(/^limit\s+(.+)/i);
    if (limitSpaceMatch) {
      trimmed = limitSpaceMatch[1].trim();
    }
  }
  if (trimmed === '') {
    throw new Error('limit 关键字后缺少表达式');
  }

  // ---------- 第二步：全角 ω → 半角 w（统一格式） ----------
  const normalized = trimmed.replace(/ω/g, 'w');
  const lowerInput = normalized.toLowerCase();

  // ---------- 第三步：匹配注册表中的记号名（主键 + 别名） ----------
  const matchedCandidates = allCandidates.filter(candidate => lowerInput.startsWith(candidate));

  if (matchedCandidates.length === 0) {
    // 无匹配 → 尝试序数表达式
    try {
      const prssSeq = ordinalToPrSS(normalized); // 已转换 ω
      return {
        notationKey: 'prss',
        rawName: 'PrSS',
        inner: prssSeq,
        fromOrdinal: true,
      };
    } catch (e) {
      console.error('ordinalToPrSS error:', e);
      throw new Error('无效输入：既不是记号表达式，也不是序数表达式，查询已有记号请输入 /list');
    }
  }

  // 排序：无括号优先，同级别按长度降序（最长匹配）
  matchedCandidates.sort((a, b) => {
    const aHasParen = a.includes('(') || a.includes(')');
    const bHasParen = b.includes('(') || b.includes(')');
    if (aHasParen !== bHasParen) return aHasParen ? 1 : -1;
    return b.length - a.length;
  });

  const matchedCandidate = matchedCandidates[0];
  const key = aliasMap.get(matchedCandidate); // 获取主键
  const rawName = NOTATION_REGISTRY[key].name;

  // 截取剩余部分（从 matchedCandidate 之后开始）
  const rest = normalized.substring(matchedCandidate.length).trimStart();

  // ---- limit 格式 ----
  if (rest === '' || /^(\(limit\)|limit)$/i.test(rest)) {
    return { notationKey: key, rawName, inner: 'LIMIT_PLACEHOLDER', fromOrdinal: false };
  }

  // ---- （已删除括号格式分支） ----
  // 原先的括号匹配逻辑已移除，现在 rest 将直接进入后续分支

  // ---- 无分隔符格式（如 prss0,1,2） ----
  // 注意：此分支会匹配所有以非空格开头的 rest，包括以 '(' 开头的情况
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