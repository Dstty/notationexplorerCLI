// 补充缺失的 sequence_compare
const sequence_compare = (seq1, seq2) => {
    for (let i = 0; i < Math.min(seq1.length, seq2.length); i++) {
        if (seq1[i] !== seq2[i]) return seq1[i] - seq2[i];
    }
    return seq1.length - seq2.length;
};

// 原始内部函数（未改动）
const toShort = expr => expr.slice(1).map(row => row.slice(1, -row[0]).concat(row[row.length - 1]));

const seqseq_compare = (m1, m2) => {
    if (m1.length === 0) {
        if (m2.length === 0) return 0;
        else return -1;
    } else {
        if (m2.length === 0) return 1;
        else {
            var cmp = sequence_compare(m1[0], m2[0]);
            if (cmp) return cmp;
            else return seqseq_compare(m1.slice(1), m2.slice(1));
        }
    }
};

const compare = (expr1, expr2) => seqseq_compare(toShort(expr1), toShort(expr2));

const display = expr => '' + expr === 'Infinity' ? 'Limit' : expr.slice(1).map(row => '(' + row.slice(1).join(',') + ')' + row[0]).join('') + ';' + expr[0].join(',');

const isNonzero = expr => expr.length > 1;

const pleasantUntil = (rows, t) => {
    var tcheck = t.slice(1 + t[0]),
        tmax = tcheck[0],
        tmin = tcheck[tcheck.length - 1],
        scheck, i1, i2;
    for (var n = 0; n < rows.length; n++) {
        scheck = rows[n].slice(1);
        i1 = scheck.findIndex(x => x < tmax);
        i2 = scheck.findLastIndex(x => x > tmin);
        if (~i1 && ~i2 && i1 <= i2 && scheck.slice(i1, i2 + 1).some(x => !tcheck.includes(x))) return n;
    }
    return -1;
};

const isLimit = expr => {
    if ('' + expr === 'Infinity') return true;
    var active = expr[expr.length - 1];
    if (!active[1 + active[0]]) return false;
    return pleasantUntil(expr.slice(active[1 + active[0]], -1), active) === -1;
};

const cut = expr0 => {
    var expr = expr0.slice(0, -1).map(row => row.slice());
    expr[0].pop();
    return expr;
};

const compute_parent_for_mapped_row = (r_old, row_idx, start, end, old_height, tmin) => {
    var parent = 0;
    if (row_idx <= r_old.length && row_idx >= 1) parent = r_old[row_idx - 1];
    if (parent && start <= parent && parent <= end) return parent - start + old_height;
    var ancestor = parent;
    while (ancestor) {
        if (ancestor < tmin) return ancestor;
        ancestor = r_old[ancestor - 1];
    }
    return 0;
};

const ap = (s, t) => [s[0]].concat(s.slice(1).map(x => x < t[t.length - 1] ? x : x >= t[1 + t[0]] ? x - t[1 + t[0]] + t[1] : t[t.lastIndexOf(x) - t[0]]));

const copy = (raw, flag) => {
    var active = raw[raw.length - 1],
        expr = cut(raw),
        row_idx;
    expr = expr.concat(raw.slice(active[1 + active[0]], active[1 + active[0]] + flag).map(row => ap(row, active)));
    for (row_idx = active[1 + active[0]]; row_idx < active[1 + active[0]] + flag; ++row_idx) {
        expr[0].push(compute_parent_for_mapped_row(raw[0], row_idx, active[1 + active[0]], active[1 + active[0]] + flag - 1, raw.length - 1, active[active.length - 1]));
    }
    return expr;
};

const extend = raw => {
    var active = raw[raw.length - 1],
        expr = cut(raw),
        row_idx;
    expr = expr.concat(raw.slice(active[1 + active[0]]).map(row => ap(row, active)));
    for (row_idx = active[1 + active[0]]; row_idx < raw.length; ++row_idx) {
        expr[0].push(compute_parent_for_mapped_row(raw[0], row_idx, active[1 + active[0]], raw.length - 1, raw.length - 1, active[active.length - 1]));
    }
    return expr;
};

const isAncestor = (R, i, j) => i === j || (i < j && isAncestor(R, i, R[j - 1]));

const comp = (raw, i, T) => {
    var expr = raw.slice(0, i).map(row => row.slice()),
        u = T.length,
        li = raw[i].length < raw[i][0] * 2 + 1 ? raw[i][0] : raw[i][0] + 1,
        ci = raw[i].length < raw[i][0] * 2 + 1 ? raw[i].slice(1, -raw[i][0]).concat(raw[i].slice(1 + raw[i][0])) : raw[i].slice(1);
    for (var r = 0; r < u; ++r) {
        var values = ci.concat(T.slice(0, 1 + r)).concat(Array(r).fill(0).map((x, rr) => raw[i][1] + 1 + rr));
        values.sort((x, y) => y - x);
        expr[i + r] = [li + r].concat(values);
    }
    for (var ii = i; ii < raw.length; ++ii) {
        values = raw[ii].slice(1).map(x => x <= i ? x : x + u);
        var flag = isAncestor(raw[0], i, ii) && values.findIndex(x => x <= i) <= raw[ii][0];
        if (flag) {
            values = values.concat(T).concat(Array(u).fill(0).map((x, uu) => i + 1 + uu));
            values.sort((x, y) => y - x);
        }
        expr[ii + u] = [raw[ii][0] + (flag ? u : 0)].concat(values);
    }
    var m = x => x < i ? x : x + u;
    expr[0] = raw[0].slice(0, i);
    for (r = 0; r < u; ++r) expr[0][i + r] = i + r;
    for (ii = i + 1; ii < raw.length; ++ii) expr[0][m(ii) - 1] = m(raw[0][ii - 1]);
    return expr;
};

const fullcomp = (expr, i) => {
    var T = [expr[i][expr[i][0]]];
    do {
        T.unshift(expr[T[0]][2]);
    } while (T[0] > expr[i][expr[i][0] + 1]);
    T = T.slice(1, -1);
    return T.length ? comp(expr, i, T) : expr;
};

const expand = (raw, FSterm, longer) => {
    var active = raw[raw.length - 1];
    if (!active[1 + active[0]]) return cut(raw);
    var flag = pleasantUntil(raw.slice(active[1 + active[0]], -1), active);
    var expr = raw;
    if (~flag) {
        expr = copy(expr, flag);
    } else {
        for (var n = 1; n <= FSterm; ++n) expr = extend(expr);
        expr = longer ? copy(expr, 1) : cut(expr);
    }
    for (var i = raw.length - 1; i < expr.length; ++i) {
        if (expr[i].length <= expr[i][0] * 2 + 1) expr = fullcomp(expr, i);
    }
    return expr;
};

const LimitR = n => n ? [0, 0, 0].concat(Array(n - 1).fill(0).map((x, nn) => 3 + nn)) : [0, 0];
const Limit_row = n => Array(3 + n).fill(0).map((x, nn) => nn).concat(2).reverse();
const Limit = n => [LimitR(n), [1, 1, 0], [1, 2, 1, 0]].concat(Array(n).fill(0).map((x, nn) => Limit_row(1 + nn)));

// ---------- 导出的函数 ----------
// 原 FS 重命名为 expandNormal，并修改：当表达式为 [ [] ] 时返回 null
function expandNormal(expr, FSterm) {
    if ('' + expr === 'Infinity') return Limit(FSterm);
    // 如果 expr 是 [ [] ]（即 0），返回 null
    if (expr.length === 1 && expr[0].length === 0) return null;
    // 其他长度 <=1 的情况（理论上只有 [ [] ] 或 []）保持原行为
    if (expr.length <= 1) return [[]];
    return expand(expr, FSterm, false);
}

// 新增 expandLimit
function expandLimit(n) {
    return expandNormal([Infinity], n);
}

// 新增 isSuccessor（原 able 取反）
function isSuccessor(expr) {
    return !isLimit(expr);
}

// 改进 parse，能处理单独分号等情况
function parse(str) {
    str = str.replace(/\s/g, '');
    if (!str) return [[]];
    const parts = str.split(';');
    let rowsPart = parts[0] || '';
    let RPart = parts.length > 1 ? parts[1] : '';
    const R = RPart ? RPart.split(',').map(Number) : [];
    const regex = /\(([^)]*)\)(\d+)/g;
    let match;
    const rows = [];
    while ((match = regex.exec(rowsPart)) !== null) {
        const bracketContent = match[1];
        const L = parseInt(match[2], 10);
        let seq = bracketContent ? bracketContent.split(',').map(Number) : [];
        const m = seq.length;
        if (m === 0) {
            rows.push([L, 0]);
        } else {
            const row = [L];
            for (let i = 0; i < m - 1; i++) row.push(seq[i]);
            for (let i = 0; i < L - 1; i++) row.push(0);
            row.push(seq[m - 1]);
            rows.push(row);
        }
    }
    if (rows.length === 0) return [[]];
    return [R, ...rows];
}

// 导出
export { compare, display, expandNormal, expandLimit, parse, isSuccessor };