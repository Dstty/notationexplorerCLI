// ./notation/Help.js

const HELP_TEXT = `输入格式: 记号名 表达式
或直接输入记号名

例如：
      PrSS(0,1,2,3)
      PrSS 0,1,2,3
      PrSS

命令列表：
  /list
      列出当前已注册的记号名称。

  /save
      保存当前树

  /clear
      清除所有日志和树，重置界面。

  /set 参数=值
      设置运行时参数。支持以下参数：
        default=N  或  default_expand=N
          设置初始展开次数。输入表达式后，根节点自动展开 N 层。N 必须为正整数。
          示例：/set default=5

        additional=N  或  additional_expand=N
          设置"更多"按钮每次加载的节点数。点击"…"时额外展开 N 个子节点。N 必须为正整数。
          示例：/set additional=3

        theme=主题名
          切换界面配色。支持的主题：dark, light, paper, sl (Solarized Light), sd (Solarized Dark)。
          示例：/set theme=sl

导航快捷键：
  ↑ / k       上移焦点
  ↓ / j       下移焦点
  ← / h       折叠节点（若已展开），否则跳转到父节点
  → / l       展开节点（若可展开），否则无操作
  n           添加注释
  ,           跳转到父节点
  Backspace   跳转到父节点
  0-9         跳转到当前父节点下的第 N 个子节点（FS 索引）
  + / =       加载更多节点（相当于点击"…"）
  Enter/空格  展开/折叠节点，或点击"更多"按钮
  Esc         将焦点移至输入框`;

const LINES = HELP_TEXT.split('\n');

export function parse(str) {
  // 任何输入都视为请求帮助（忽略参数）
  return { type: 'root' };
}

export function isLimit(expr) {
  return expr.type === 'root';
}

// 根据 k（从 0 开始）返回第 k 行数据
export function expandLimit(k) {
  if (k < LINES.length) {
    return { type: 'line', index: k, text: LINES[k] };
  }
  return null; // 没有更多行了
}

export function expandNormal(expr, k) {
  // 行节点不可再展开
  if (expr.type === 'line') return null;
  if (k < LINES.length) {
    return { type: 'line', index: k, text: LINES[k] };
  }
  return null; // 没有更多行了
}

export function display(expr) {
  if (expr.type === 'root') return '📖 帮助文档';
  if (expr.type === 'line') return expr.text;
  return '';
}

export function compare(a, b) {
  if (a.type === 'root' && b.type === 'root') return 0;
  if (a.type === 'root') return -1;
  if (b.type === 'root') return 1;
  if (a.type === 'line' && b.type === 'line') {
    return a.index - b.index;
  }
  return (a.type || '').localeCompare(b.type || '');
}

export function isEmpty(expr) {
  return expr === null || expr === undefined;
}

// 行节点是后继，不能再展开
export function isSuccessor(expr) {
  return expr.type === 'line';
}