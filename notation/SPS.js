// SPS 展开器 - 模块化版本（修改版）

/**
 * 将逗号分隔的字符串解析为整数数组（内部表达式结构）
 * @param {string} str - 如 "0,1,2"
 * @returns {number[]}
 */
export function parse(str) {
    return str.split(',').map(Number);
}

/**
 * 将数组转换为不带 [] 的字符串，用逗号连接
 * @param {number[]} expr
 * @returns {string}
 */
export function display(expr) {
    return expr.join(',');
}

/**
 * 字典序比较两个整数序列
 * @param {number[]} seq1
 * @param {number[]} seq2
 * @returns {-1 | 0 | 1}  -1: seq1 < seq2, 0: 相等, 1: seq1 > seq2
 */
export function compare(seq1, seq2) {
    const len = Math.min(seq1.length, seq2.length);
    for (let i = 0; i < len; i++) {
        if (seq1[i] < seq2[i]) return -1;
        if (seq1[i] > seq2[i]) return 1;
    }
    if (seq1.length < seq2.length) return -1;
    if (seq1.length > seq2.length) return 1;
    return 0;
}

/**
 * 生成 [0, 1, ..., n] 的序列
 * @param {number} n
 * @returns {number[]}
 */
export function expandLimit(n) {
    return Array.from({ length: n + 1 }, (_, i) => i);
}

/**
 * 判断序列是否为后继形式（结尾为 0 则返回 true）
 * @param {number[]} expr
 * @returns {boolean}
 */
export function isSuccessor(expr) {
    return expr.length > 0 && expr[expr.length - 1] === 0;
}

/**
 * 标准展开函数（原算法），但新增特殊规则：
 * 若输入序列的末项为 0，则直接返回去掉末项的新序列（不展开）
 * @param {number[]} expr - 输入序列（不会被修改）
 * @param {number} n - 展开次数
 * @returns {number[]} 展开后的新序列
 */
export function expandNormal(expr, n) {
    // ***** 修改点：如果末项为 0，直接去掉末项返回 *****
    if (expr.length > 0 && expr[expr.length - 1] === 0) {
        return expr.slice(0, -1);
    }

    // 原展开逻辑（复制一份，避免修改原数组）
    const sequence = expr.slice();
    const lastNumber = sequence[sequence.length - 1];
    const badPart = [];

    // 构造 badPart：从后往前寻找等于 lastNumber-1 的元素
    for (let i = 0; i < sequence.length; i++) {
        const idx = sequence.length - 1 - i;
        badPart.unshift(sequence[idx]);
        if (sequence[idx] === lastNumber - 1) {
            break;
        }
    }
    badPart.pop();          // 移除 badPart 中最后一个元素
    sequence.pop();         // 移除原序列最后一个元素

    const isStrongExpand = badPart.length > 0 && badPart[0] < badPart[badPart.length - 1];

    // 执行展开
    for (let i = 0; i < n; i++) {
        for (const j of badPart) {
            if (isStrongExpand && j >= lastNumber) {
                sequence.push(j + i + 1);
            } else {
                sequence.push(j);
            }
        }
    }

    return sequence;
}