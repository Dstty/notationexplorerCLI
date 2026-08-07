// ===== BM4 核心算法 =====
function sequence_compare(a, b) {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        if (a[i] > b[i]) return 1;
        if (a[i] < b[i]) return -1;
    }
    return a.length - b.length;
}

function matrix_compare(m1, m2) {
    if (m1.length === 0) {
        if (m2.length === 0) return 0;
        else return -1;
    } else {
        if (m2.length === 0) return 1;
        else {
            let col1 = m1[0],
                col2 = m2[0];
            const lenDiff = col1.length - col2.length;
            if (lenDiff > 0) col2 = col2.concat(Array(lenDiff).fill(0));
            else if (lenDiff < 0) col1 = col1.concat(Array(-lenDiff).fill(0));
            const cmp = sequence_compare(col1, col2);
            if (cmp) return cmp;
            else return matrix_compare(m1.slice(1), m2.slice(1));
        }
    }
}

function matrix_display(expr) {
    if (expr === Infinity || String(expr) === 'Infinity') return 'Limit';
    return expr.map(col => '(' + col.join(',') + ')').join('');
}

function matrix_limit(m) {
    return m.length > 0 && m[m.length - 1][0] > 0;
}

// ===== expand 函数（原expand，现为expandNormal） =====
const expand = (() => {
    const data = {};
    function BM4(m, FSterm) {
        const parent = (x, y) => {
            const str = x + ',' + y;
            if (parent_cache[str] !== undefined) return parent_cache[str];
            let p;
            for (p = x; (p = y ? parent(p, y - 1) : p - 1) >= 0; ) {
                if (m[p][y] < m[x][y]) break;
            }
            return parent_cache[str] = p;
        };
        const ascending = (r, x, y) => {
            const str = r + ',' + x + ',' + y;
            if (ascending_cache[str] !== undefined) return ascending_cache[str];
            return ascending_cache[str] = r <= x && (r === x || ascending(r, parent(x, y), y));
        };
        const parent_cache = {},
            ascending_cache = {};
        const endcol = m.length - 1;
        const result = m.slice(0, endcol);
        const child = m[endcol];
        const ymax = child.length - 1;
        let LNZ;
        for (LNZ = ymax; LNZ >= 0; --LNZ) {
            if (child[LNZ] > 0) break;
        }
        if (LNZ < 0) return result;
        const BR = parent(endcol, LNZ);
        const BRcolumn = m[BR];
        const offset = child.map((value, y) => y < LNZ ? value - BRcolumn[y] : 0);
        const offset_asc = Array(endcol).fill(0).map((_, x) => offset.map((value, y) => ascending(BR, x, y) ? value : 0));
        let col, n;
        for (n = 0; ++n <= FSterm; ) {
            for (col = BR; col < endcol; ++col) {
                result.push(m[col].map((value, y) => value + offset_asc[col][y] * n));
            }
        }
        if (ymax > 0 && result.every(column => column[ymax] === 0)) {
            return result.map(column => column.slice(0, ymax));
        }
        return result;
    }
    return (m, FSterm) => {
        if (m === Infinity || String(m) === 'Infinity') {
            return [Array(FSterm + 1).fill(0), Array(FSterm + 1).fill(1)];
        }
        if (m.length === 0) return [];
        const datakey = matrix_display(m);
        if (!data[datakey]) data[datakey] = [];
        else if (data[datakey][FSterm] !== undefined) return data[datakey][FSterm];
        return data[datakey][FSterm] = BM4(m, FSterm);
    };
})();

// 新增 expandLimit：返回 (0,0,...,0)(1,1,...,1) 共 k 个 0 和 1
function expandLimit(k) {
    if (k < 0) throw new Error('k must >0');
    const zeroCol = Array(k+1).fill(0);
    const oneCol = Array(k+1).fill(1);
    return [zeroCol, oneCol];
}

// ===== parse 函数 =====
function parse(str) {
    str = str.trim();
    if (str === '' || str === '[]') return [];
    let columns;
    if (str.includes('(')) {
        const matches = str.match(/\(([^)]*)\)/g);
        if (!matches) throw new Error('无效的 BMS 格式');
        columns = matches.map(p => {
            const inner = p.slice(1, -1).trim();
            if (inner === '') return [];
            return inner.split(',').map(s => {
                const num = parseInt(s.trim(), 10);
                if (isNaN(num)) throw new Error(`无法解析数字: ${s}`);
                return num;
            });
        });
    } else {
        columns = str.split(',').map(s => {
            const num = parseInt(s.trim(), 10);
            if (isNaN(num)) throw new Error(`无法解析数字: ${s}`);
            return [num];
        });
    }
    // 补齐所有列到相同长度（最大列长），缺失位补0
    const maxLen = columns.reduce((max, col) => Math.max(max, col.length), 0);
    return columns.map(col => {
        if (col.length === maxLen) return col;
        const padded = col.slice();
        while (padded.length < maxLen) padded.push(0);
        return padded;
    });
}

// ===== 导出（新增 compare: matrix_compare） =====
export { 
    parse, 
    expand as expandNormal, 
    expandLimit, 
    matrix_limit as isLimit, 
    matrix_display as display,
    matrix_compare as compare   // 新增，供 TreeManager 使用
};