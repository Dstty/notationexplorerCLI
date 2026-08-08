// ==================== 核心函数定义 ====================

/**
 * 将矩阵转换为字符串表示，例如 "(0,0)(1,1)(0,0)"
 * 用于缓存键
 */
export function display(matrix) {
    if (!Array.isArray(matrix)) return String(matrix);
    return matrix.map(col => `(${col.join(',')})`).join('');
}

/**
 * 比较两个矩阵的序数大小
 * 返回 -1 (seq1 < seq2), 0 (相等), 1 (seq1 > seq2)
 * 按列依次比较，第一处不同的列决定大小；若所有列相同，则较长者大
 */
export function compare(seq1, seq2) {
    const len = Math.min(seq1.length, seq2.length);
    for (let i = 0; i < len; i++) {
        const col1 = seq1[i];
        const col2 = seq2[i];
        const rowLen = Math.min(col1.length, col2.length);
        for (let j = 0; j < rowLen; j++) {
            if (col1[j] !== col2[j]) {
                return col1[j] < col2[j] ? -1 : 1;
            }
        }
        if (col1.length !== col2.length) {
            return col1.length < col2.length ? -1 : 1;
        }
    }
    if (seq1.length !== seq2.length) {
        return seq1.length < seq2.length ? -1 : 1;
    }
    return 0;
}

/**
 * 判断矩阵是否为极限序数（最后一列全部为0）
 */
export function matrix_limit(matrix) {
    if (matrix.length === 0) return false;
    const lastCol = matrix[matrix.length - 1];
    return lastCol.every(v => v === 0);
}

/**
 * 标准扩张函数（原名 FS）
 * 带有缓存，避免重复计算
 */
export const expandNormal = (() => {
    const data = {};

    function expand(m, FSterm) {
        // 重写 parent 函数，使用 while 循环确保变量 p 始终可访问
        const parent = (x, y) => {
            const str = x + ',' + y;
            if (parent_cache[str] !== undefined) return parent_cache[str];
            let p = x;
            while (true) {
                p = y ? parent(p, y - 1) : p - 1;
                if (p < 0) break;
                if (m[p][y] < m[x][y]) break;
            }
            parent_cache[str] = p;
            return p;
        };

        const ascending = (r, x, y) => {
            const str = r + ',' + x + ',' + y;
            if (ascending_cache[str] !== undefined) return ascending_cache[str];
            return ascending_cache[str] = r <= x && (roots.includes(x) || ascending(r, parent(x, y), y));
        };

        const delta = r => m[r].map((value, y) => 
            y < LNZ ? child[y] - value :
            y === LNZ ? child[y] - value - 1 :
            0
        );

        const expansion = (r, n) => {
            const ss = m.slice(0, endcol);
            const delr = delta(r);
            for (let a = 1; a <= n; ++a) {
                for (let x = r; x < endcol; ++x) {
                    ss.push(ss[x].map((value, y) => value + a * delr[y] * ascending(r, x, y)));
                }
            }
            return ss;
        };

        const expansionappend = r => {
            const delr = delta(r);
            const res = expansion(r, 1);
            res.push(m[endcol].map((value, y) => value + delr[y] * ascending(r, endcol, y)));
            return res;
        };

        const endcol = m.length - 1;
        const result = m.slice(0, endcol);
        const child = m[endcol];
        const ymax = child.length - 1;
        let LNZ;
        for (LNZ = ymax; LNZ >= 0; --LNZ) {
            if (child[LNZ] > 0) break;
        }
        if (LNZ < 0) return result;

        let parent_cache = {};
        let ascending_cache = {};
        const specialroots = [];
        let roots = [];
        let n;
        for (n = endcol; n >= 0; ) {
            specialroots.push(n = parent(n, LNZ));
        }
        for (n = specialroots[0]; n >= 0; n = LNZ ? parent(n, LNZ - 1) : n - 1) {
            if (specialroots.includes(parent(n, LNZ))) roots.push(n);
        }

        const testroot = m[roots[0]].slice(LNZ + 1);
        const threshould = expansionappend(roots[0]);
        n = roots.findIndex(r => 
            specialroots.includes(r) ? 
                m[r].slice(LNZ + 1).some((value, dy) => value !== testroot[dy]) :
                compare(expansionappend(r), threshould) < 0
        );
        if (n === -1) n = roots.length;

        let res = expansion(roots[n - 1], FSterm);
        if (ymax > 0 && res.every(column => column[ymax] === 0)) {
            res = res.map(column => column.slice(0, ymax));
        }
        return res;
    }

    return function(m, FSterm) {
        if ('' + m === 'Infinity') {
            return [Array(FSterm + 1).fill(0), Array(FSterm + 1).fill(1)];
        }
        if (m.length === 0) return [];
        const datakey = display(m);
        if (!data[datakey]) data[datakey] = [];
        else if (data[datakey][FSterm] !== undefined) return data[datakey][FSterm];
        return data[datakey][FSterm] = expand(m, FSterm);
    };
})();

/**
 * 极限扩张：对 [Infinity] 应用 n 次扩张
 */
export function expandLimit(n) {
    return expandNormal([Infinity], n);
}

/**
 * 解析字符串为矩阵结构，并自动补全列长度（缺失位补0）
 * 支持格式：
 *   - "(0,0)(1,1)(0,0)"   (标准括号表示)
 *   - "0,0;1,1;0,0"       (分号分隔列)
 *   - "[]" 或 ""          空矩阵
 *   每列内数字用逗号分隔，可包含 "Infinity"
 *   例：parse("()(1,1,1)(2,1)") → [[0,0,0], [1,1,1], [2,1,0]]
 */
export function parse(str) {
    if (!str || str.trim() === '' || str === '[]') return [];

    const trimmed = str.replace(/\s/g, '');
    let columns = [];

    // 尝试按括号解析
    if (trimmed.startsWith('(')) {
        const matches = trimmed.match(/\([^)]*\)/g);
        if (matches) {
            columns = matches.map(colStr => {
                const inner = colStr.slice(1, -1);
                if (inner === '') return [];
                return inner.split(',').map(token => {
                    token = token.trim();
                    if (token === 'Infinity') return Infinity;
                    return Number(token);
                });
            });
        }
    } 
    // 尝试按分号解析
    else if (trimmed.includes(';')) {
        columns = trimmed.split(';').map(colStr => {
            if (colStr === '') return [];
            return colStr.split(',').map(token => {
                token = token.trim();
                if (token === 'Infinity') return Infinity;
                return Number(token);
            });
        });
    } 
    // 按逗号解析为一列
    else if (trimmed.includes(',')) {
        columns = [trimmed.split(',').map(token => {
            token = token.trim();
            if (token === 'Infinity') return Infinity;
            return Number(token);
        })];
    } 
    // 单个数字
    else if (trimmed !== '') {
        const num = trimmed === 'Infinity' ? Infinity : Number(trimmed);
        columns = [[num]];
    }

    // 如果没有解析出任何列，返回空矩阵
    if (columns.length === 0) return [];

    // 自动补全列长度：找出最大长度，所有列补齐到该长度，缺失位补0
    const maxLen = columns.reduce((max, col) => Math.max(max, col.length), 0);
    if (maxLen > 0) {
        columns = columns.map(col => {
            if (col.length === maxLen) return col;
            // 补齐缺失位（在末尾添加0）
            return col.concat(Array(maxLen - col.length).fill(0));
        });
    }

    return columns;
}

/**
 * 判断表达式是否为后继序数（非极限）
 */
export function isSuccessor(expr) {
    return matrix_limit(expr);
}