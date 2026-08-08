// PPS.js (ES Module)
export { expand, Limit, display, compare, expandNormal, expandLimit, parse, isSuccessor };

function expand(seq, FSterm) {
    var len = seq.length;
    if (len > 0 && seq[len - 1] === 0) return seq.slice(0, -1);

    var x = len > 0 ? seq[len - 1] : null;
    var parentY = x;
    var rootY = null;
    var b = null;
    var badpart = [];
    var L = 0;
    var flag = false;
    if (parentY >= 1 && parentY <= len) {
        rootY = parentY;
        b = seq[rootY - 1];
        badpart = seq.slice(rootY, len - 1);
        L = len - rootY;
        flag = badpart.some(val => val === b);
    } else {
        L = len - parentY;
    }
    var goodpart = seq.slice(0, -1);
    var result = goodpart.slice();
    for (var i = 1; i <= FSterm; i++) {
        result.push(flag ? b : x - 1);
        var bad_modified = badpart.map(val => val < x ? val : val + L * i);
        result = result.concat(bad_modified);
    }
    return result;
}

function Limit(n) {
    if (n === 0) return [0];
    return Limit(n - 1).concat(n);
}

function display(expr) {
    return expr.map(v => v === Infinity ? 'Infinity' : String(v)).join(',');
}

function compare(seq1, seq2) {
    if (seq1.length !== seq2.length) return seq1.length - seq2.length;
    for (let i = 0; i < seq1.length; i++) {
        let a = seq1[i], b = seq2[i];
        if (a === Infinity && b === Infinity) continue;
        if (a === Infinity) return 1;
        if (b === Infinity) return -1;
        if (a !== b) return a - b;
    }
    return 0;
}

function expandNormal(m, FSterm) {
    if ('' + m === 'Infinity') return Limit(FSterm);
    if (m.length === 0) return [];
    return expand(m, FSterm);
}

function expandLimit(n) {
    return expandNormal([Infinity], n);
}

function parse(str) {
    str = str.trim();
    if (str === '') return [];

    // 支持带方括号的 JSON 格式
    if (str.startsWith('[') && str.endsWith(']')) {
        let jsonStr = str.replace(/Infinity/g, '"__INF__"');
        try {
            let parsed = JSON.parse(jsonStr);
            function replaceInf(obj) {
                if (Array.isArray(obj)) return obj.map(replaceInf);
                if (obj === '__INF__') return Infinity;
                return obj;
            }
            return replaceInf(parsed);
        } catch {
            return [];
        }
    }

    // 支持纯逗号分隔格式
    let parts = str.split(',').map(s => s.trim()).filter(s => s !== '');
    return parts.map(s => {
        if (s === 'Infinity') return Infinity;
        let num = Number(s);
        return isNaN(num) ? 0 : num;
    });
}

function isSuccessor(expr) {
    return expr.length > 0 && expr[expr.length - 1] === 0;
}