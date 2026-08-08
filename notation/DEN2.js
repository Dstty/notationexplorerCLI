// ==================== 内部工具函数 ====================

// 将表达式转为短形式（用于比较）
const toShort = expr => expr.map(row =>
  row.slice(1, -row[0]).concat([row[row.length - 1]]).map(x => x[0])
);

// 比较两个行数组（逐项比较）
const compareRows = (a, b) => {
  if (a.length !== b.length) return a.length - b.length;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
};

// 序列序列比较（先比较第一行，再递归比较剩余）
const seqseq_compare = (m1, m2) => {
  if (m1.length === 0) {
    if (m2.length === 0) return 0;
    else return -1;
  } else {
    if (m2.length === 0) return 1;
    else {
      const cmp = compareRows(m1[0], m2[0]);
      if (cmp) return cmp;
      else return seqseq_compare(m1.slice(1), m2.slice(1));
    }
  }
};

// 获取行的数值数组
const values = row => [row[0]].concat(row.slice(1).map(x => x[0]));

// 判断表达式是否非零（非空）
const isNonzero = expr => expr.length > 0;

// 辅助函数 pleasantUntil
const pleasantUntil = (rows, t) => {
  const tcheck = values(t).slice(1 + t[0]);
  const tmax = tcheck[0];
  const tmin = tcheck[tcheck.length - 1];
  let scheck, i1, i2;
  for (let n = 0; n < rows.length; n++) {
    scheck = values(rows[n]).slice(1);
    i1 = scheck.findIndex(x => x < tmax);
    i2 = scheck.findLastIndex(x => x > tmin);
    if (~i1 && ~i2 && i1 <= i2 && scheck.slice(i1, i2 + 1).some(x => !tcheck.includes(x)))
      return n;
  }
  return -1;
};

// 判断是否为极限
const isLimit = expr => {
  if ('' + expr === 'Infinity') return true;
  const active = expr[expr.length - 1];
  if (!(active[1 + active[0]]?.[0])) return false;
  return pleasantUntil(expr.slice(active[1 + active[0]][0] - 1, -1), active) === -1;
};

// 裁剪（去掉最后一行）
const cut = expr => expr.slice(0, -1).map(row => [row[0]].concat(row.slice(1).map(x => x.slice())));

// ---------- 修正 seqFrom 中 val 为 let ----------
const seqFrom = (expr, i, j) => {
  let row = expr[i];
  let val = row[j][0];                    // 改为 let
  const threshold = row[j + row[0]]?.[0] ?? 0;
  let idx;
  const record = [[i + 1, j], [val]];
  while (val > threshold) {
    row = expr[val - 1];
    idx = 1 + row[0];
    record[record.length - 1][1] = idx;
    val = row[idx]?.[0];                 // 重新赋值，合法
    record.push([val]);
  }
  record.pop();
  return record;
};
// ------------------------------------------------

const apv = (s, t) =>
  s.map(x =>
    x < t[t.length - 1] ? x :
    x >= t[1 + t[0]] ? x - t[1 + t[0]] + t[1] :
    t[t.lastIndexOf(x) - t[0]]
  );

const ap = (s, t) => [s[0]].concat(apv(values(s).slice(1), values(t)).map(x => [x]));

const copy = (raw, flag) => {
  const active = raw[raw.length - 1];
  const expr = cut(raw);
  const begin = active[1 + active[0]][0];
  const end = ~flag ? active[1 + active[0]][0] + flag : raw.length + 1;
  const offset = raw.length - begin;
  expr.push(...raw.slice(begin - 1, end - 1).map(row => ap(row, active)));
  let row, targetrow, i, j, seq;
  for (i = begin - 1; i < end - 1; ++i) {
    row = raw[i];
    targetrow = expr[i + offset];
    for (j = 1; j < row.length; ++j) {
      if (!row[j][1]) continue;
      seq = seqFrom(raw, i, j);
      const nomove = seq.findIndex(x => x[0] < active[1 + active[0]][0]);
      if (nomove === -1) {
        targetrow[j][1] = true;
        continue;
      }
      if (seq[nomove][0] < active[active.length - 1][0]) {
        targetrow[j][1] = true;
        continue;
      }
      const c = seq[nomove - 1][0] + offset;
      const rowc = expr[c - 1];
      const b = rowc[seq[nomove - 1][1]][0];
      if (targetrow[j + targetrow[0] - 1]?.[0] <= active[active.length - 1][0] &&
          (active.slice(1).find(x => x[0] === b))?.[1])
        targetrow[j][1] = true;
    }
  }
  return expr;
};

const compTo = (raw, r, already) => {
  const expr = raw.map(row => [row[0]].concat(row.slice(1).map(x => x.slice())));
  for (let j = raw[r].length - 1; j > 0; --j) {
    if (!raw[r][j][1]) continue;
    const n = raw[r][j][0];
    const seq = seqFrom(raw, r, j);
    const t = seq[seq.length - 1][0];
    const T = already[t - 1];
    if (!T) continue;
    const q = T.length;
    const entries = expr[r].slice(1).map(x => x.slice())
      .concat(T.map(x => [x]))
      .concat(Array(q).fill(0).map((x, uu) => [n + 1 + uu, true]));
    entries.sort((x, y) => y[0] - x[0]);
    expr[r] = [expr[r][0] + q].concat(entries);
  }
  return expr;
};

const compFrom = (raw, r, T) => {
  const expr = raw.slice(0, r).map(row => [row[0]].concat(row.slice(1).map(x => x.slice())));
  const q = T.length;
  const lr = raw[r].length < raw[r][0] * 2 + 1 ? raw[r][0] : raw[r][0] + 1;
  const cr = raw[r].length < raw[r][0] * 2 + 1 ?
    raw[r].slice(1, -raw[r][0]).concat(raw[r].slice(1 + raw[r][0])) :
    raw[r].slice(1);
  for (let qq = 0; qq < q; ++qq) {
    const entries = cr.map(x => x.slice())
      .concat(T.slice(0, 1 + qq).map(x => [x]))
      .concat(Array(qq).fill(0).map((x, uu) => [raw[r][1][0] + 1 + uu]));
    entries.sort((x, y) => y[0] - x[0]);
    expr[r + qq] = [lr + qq].concat(entries);
  }
  const entries = raw[r].slice(1).map(x => x.slice())
    .concat(T.map(x => [x]))
    .concat(Array(q).fill(0).map((x, uu) => [raw[r][1][0] + 1 + uu]));
  entries.sort((x, y) => y[0] - x[0]);
  expr[r + q] = [raw[r][0] + q].concat(entries);
  for (let qq = 1; qq <= q; ++qq)
    for (let uu = 2; uu <= 1 + qq; ++uu)
      expr[r + qq][uu][1] = true;
  const m = (x, idx) => {
    if (!idx) return x;
    const xx = x.slice();
    xx[0] += (xx[0] <= raw[r][1][0] ? 0 : q);
    return xx;
  };
  expr.push(...raw.slice(r + 1).map(row => row.map(m)));
  return expr;
};

// ==================== 主要导出函数 ====================

// 原 expand，更名为 expandNormal
const expandNormal = (raw, FSterm, longer) => {
  const active = raw[raw.length - 1];
  if (!(active[1 + active[0]]?.[0])) return cut(raw);
  let flag = pleasantUntil(raw.slice(active[1 + active[0]][0] - 1, -1), active);
  let expr = raw;
  if (~flag) {
    expr = copy(expr, flag);
  } else {
    for (let n = 1; n <= FSterm; ++n) expr = copy(expr, flag);
    expr = longer ? copy(expr, 1) : cut(expr);
  }
  const already = [];
  for (let r = raw.length - 1; r < expr.length; ++r) {
    expr = compTo(expr, r, already);
    if (!(expr[r].length <= expr[r][0] * 2 + 1)) continue;
    let T = [expr[r][expr[r][0]][0]];
    do {
      T.unshift(expr[T[0] - 1][2][0]);
    } while (T[0] > expr[r][expr[r][0] + 1][0]);
    T = T.slice(1, -1);
    if (T.length < 1) continue;
    expr = compFrom(expr, r, T);
    already[r] = T;
    r += T.length;
  }
  return expr;
};

// 辅助构造 Limit 行
const Limit_row = n =>
  Array(3 + n).fill(0).map((x, nn) =>
    3 <= nn && nn < 2 + n ? [nn, true] : [nn]
  ).concat(2).reverse();

// 构造极限表达式
const Limit = n =>
  [[1, [1], [0]], [1, [2], [1], [0]]]
    .concat(Array(n).fill(0).map((x, nn) => Limit_row(1 + nn)));

// 导出 compare
const compare = (expr1, expr2) => seqseq_compare(toShort(expr1), toShort(expr2));

// 导出 display
const display = expr =>
  '' + expr === 'Infinity' ? 'Limit' :
  expr.map(row =>
    '(' + row.slice(1).map(x => (x[1] ? '*' : '') + x[0]).join(',') + ')' + row[0]
  ).join('');

// 导出 expandLimit（直接返回 Limit(n)）
const expandLimit = n => Limit(n);

// 导出 parse（逆解析 display 字符串）
const parse = str => {
  if (str === 'Limit') return [Infinity];
  if (str === '') return [];
  const rows = [];
  const regex = /\(([^)]*)\)(\d+)/g;
  let match;
  while ((match = regex.exec(str)) !== null) {
    const content = match[1];
    const L = parseInt(match[2], 10);
    const entries = content ?
      content.split(',').map(item => {
        const trimmed = item.trim();
        let mark = false;
        let valueStr = trimmed;
        if (trimmed.startsWith('*')) {
          mark = true;
          valueStr = trimmed.slice(1);
        }
        const value = parseInt(valueStr, 10);
        return [value, mark];
      }) :
      [];
    rows.push([L, ...entries]);
  }
  return rows;
};

// 导出 isSuccessor（原 able 取反）
const isSuccessor = expr => isNonzero(expr) && !isLimit(expr);

// ==================== 导出声明 ====================
export {
  compare,
  display,
  expandNormal,
  expandLimit,
  parse,
  isSuccessor
};