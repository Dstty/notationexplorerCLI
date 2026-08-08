// ============================================================
// 模块：BHM（Bashicu Hyper Matrix）
// 导出：compare, display, expandNormal, expandLimit, parse, isSuccessor
// ============================================================

// 内部缓存，用于 expandNormal 的记忆化
const data = {};

// ---------- 显示函数 ----------
export function display(matrix) {
    return matrix.map(col =>
        '(' + col.map(v => v === Infinity ? 'Infinity' : v).join(',') + ')'
    ).join('');
}

// ---------- 比较函数 ----------
export function compare(A, B) {
    let i = 0;
    while (i < A.length && i < B.length) {
        const colA = A[i], colB = B[i];
        const len = Math.max(colA.length, colB.length);
        for (let j = 0; j < len; j++) {
            const va = j < colA.length ? colA[j] : 0;
            const vb = j < colB.length ? colB[j] : 0;
            if (va === Infinity && vb === Infinity) continue;
            if (va === Infinity) return 1;
            if (vb === Infinity) return -1;
            if (va !== vb) return va - vb;
        }
        i++;
    }
    if (A.length === B.length) return 0;
    return A.length - B.length;
}

// ---------- 极限判断 ----------
function able(matrix) {
    if (matrix.length === 0) return false;
    const lastCol = matrix[matrix.length - 1];
    return lastCol.every(v => v === 0);
}

// ---------- 后继判断 ----------
export function isSuccessor(expr) {
    return able(expr);
}

// ---------- 解析函数（自动补齐列长度） ----------
export function parse(str) {
    str = str.trim();
    if (str === '') return [];

    // 匹配所有 (…) 形式的列
    const columnPattern = /\(([^)]*)\)/g;
    const matches = str.match(columnPattern);
    if (!matches) return [];

    // 先将每一列解析为数组，同时记录最大长度
    const columns = matches.map(match => {
        const content = match.slice(1, -1);
        if (content === '') return [];
        return content.split(',').map(v => {
            v = v.trim();
            if (v === 'Infinity') return Infinity;
            return Number(v);
        });
    });

    // 若没有列，直接返回空
    if (columns.length === 0) return [];

    // 计算最大列长度
    const maxLen = Math.max(...columns.map(col => col.length));

    // 补齐所有列至 maxLen，缺失位补 0
    return columns.map(col => {
        const padded = col.slice(); // 拷贝
        while (padded.length < maxLen) {
            padded.push(0);
        }
        return padded;
    });
}

// ---------- 核心展开引擎 ----------
function expand(m, FSterm) {
    let parent_cache, ascending_cache;

    const parent = function(x, y) {
        const str = x + ',' + y;
        if (parent_cache[str] !== undefined) return parent_cache[str];
        let p = x;
        for (; (p = y ? parent(p, y - 1) : p - 1) >= 0; ) {
            if (m[p][y] < m[x][y]) break;
        }
        return parent_cache[str] = p;
    };

    const ascending = function(r, x, y) {
        const str = r + ',' + x + ',' + y;
        if (ascending_cache[str] !== undefined) return ascending_cache[str];
        return ascending_cache[str] = r <= x && (roots.includes(x) || ascending(r, parent(x, y), y));
    };

    const delta = function(r) {
        return m[r].map((value, y) => y < LNZ ? child[y] - value : 0);
    };

    const expansion = function(r, n) {
        const ss = m.slice(0, endcol);
        const delr = delta(r);
        for (let a = 1; a <= n; ++a) {
            for (let x = r; x < endcol; ++x) {
                ss.push(ss[x].map((value, y) => value + a * delr[y] * ascending(r, x, y)));
            }
        }
        return ss;
    };

    const expansionappend = function(r) {
        const delr = delta(r);
        const res = expansion(r, 1);
        res.push(m[endcol].map((value, y) => value + delr[y] * ascending(r, endcol, y)));
        return res;
    };

    const endcol = m.length - 1;
    let result = m.slice(0, endcol);
    const child = m[endcol];
    const ymax = child.length - 1;
    let LNZ;
    for (LNZ = ymax; LNZ >= 0; --LNZ) {
        if (child[LNZ] > 0) break;
    }
    if (LNZ < 0) return result;

    parent_cache = {};
    ascending_cache = {};
    const specialroot = parent(parent(endcol, LNZ), LNZ);
    const roots = [];
    for (let n = endcol; (n = LNZ ? parent(n, LNZ - 1) : n - 1) > specialroot; ) {
        if (parent(n, LNZ) === specialroot) roots.push(n);
    }

    const threshould = expansionappend(roots[0]);
    let idx = roots.findIndex(r => compare(expansionappend(r), threshould) < 0);
    if (idx === -1) idx = roots.length;

    result = expansion(roots[idx - 1], FSterm);
    if (ymax > 0 && result.every(col => col[ymax] === 0)) {
        result = result.map(col => col.slice(0, ymax));
    }
    return result;
}

// ---------- 公开的展开函数 ----------
export function expandNormal(m, FSterm) {
    if (Array.isArray(m) && m.length === 1 && m[0] === Infinity) {
        return [Array(FSterm + 1).fill(0), Array(FSterm + 1).fill(1)];
    }
    if (m.length === 0) return [];

    const key = display(m);
    if (!data[key]) data[key] = [];
    else if (data[key][FSterm] !== undefined) return data[key][FSterm];

    const result = expand(m, FSterm);
    data[key][FSterm] = result;
    return result;
}

// ---------- 极限展开 ----------
export function expandLimit(n) {
    return expandNormal([Infinity], n);
}