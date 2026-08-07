/**
 * ============================================================================
 *  PrSS (原始基本序列) 展开引擎
 *  --------------------------------------
 *  输入：整数序列 seq，自然数索引 n（从 1 开始）
 *  输出：展开后的新序列
 *  遵循标准 PrSS 规则：
 *    1. 首元素必须为 0 或 1
 *    2. 每个元素的父元素必须是它本身减 1
 *    3. 若末项等于首项，则删去末项
 *    4. 否则找到最后一个小于末项的元素作为坏根，复制坏部 n 次
 * ============================================================================
 */

/**
 * 展开 PrSS 序列（标准展开）
 * @param {number[]} seq - 非负整数序列
 * @param {number} n - 自然数索引（从 1 开始）
 * @returns {number[]} 展开后的序列
 */
export function expandNormal(seq, n) {
    // 空序列直接返回
    if (!seq || seq.length === 0) {
        return [];
    }

    // 首元素必须为 0 或 1
    if (seq[0] !== 0 && seq[0] !== 1) {
        throw new Error("序列第一个元素必须为0或1");
    }

    // ---------- 标准 PrSS 校验：每个元素的父元素必须为 val - 1 ----------
    for (let j = 0; j < seq.length; j++) {
        const val = seq[j];
        if (val !== seq[0]) {
            let parent = null;
            for (let i = j - 1; i >= 0; i--) {
                if (seq[i] < val) {
                    parent = seq[i];
                    break;
                }
            }
            if (parent === null) {
                throw new Error(`元素 ${val} 在位置 ${j} 前没有比它小的元素`);
            }
            if (parent !== val - 1) {
                throw new Error(
                    `元素 ${val} 在位置 ${j} 的父元素为 ${parent}，不等于 ${val} - 1`
                );
            }
        }
    }
    // ---------- 校验结束 ----------

    const last = seq[seq.length - 1];

    // 若末项等于首项，直接删去末项
    if (last === seq[0]) {
        return seq.slice(0, -1);
    }

    // 从右向左找第一个小于末项的元素位置 i
    let i = seq.length - 2;
    while (i >= 0 && seq[i] >= last) {
        i--;
    }
    if (i < 0) {
        throw new Error("无效序列：找不到小于最后一个元素的元素");
    }

    // 分割为 good 部分和 bad 部分
    const good = seq.slice(0, i);
    const bad = seq.slice(i, -1);

    // 结果为 good + bad 重复 n 次（n 从 1 开始）
    const result = good.slice();
    for (let _ = 0; _ < n; _++) {
        result.push(...bad);
    }
    return result;
}

/**
 * 判断表达式是否为极限序数
 * 若序列非空且最后一个元素 > 第一个元素，则为极限
 * @param {number[]} seq
 * @returns {boolean}
 */
export function isLimit(seq) {
    if (!seq || seq.length === 0) return false;
    return seq[seq.length - 1] > seq[0];
}

/**
 * 判断表达式是否为后继序数
 * 若序列非空且最后一个元素 === 第一个元素（通常为 0 或 1），则为后继
 * @param {number[]} seq
 * @returns {boolean}
 */
export function isSuccessor(seq) {
    if (!seq || seq.length === 0) return false;
    return seq[seq.length - 1] === seq[0];
}

/**
 * 截断函数：返回比当前表达式小一级的表达式（删除最后一个元素）
 * @param {number[]} seq
 * @returns {number[] | null}
 */
export function truncate(seq) {
    if (!seq || seq.length === 0) return null;
    return seq.slice(0, -1);
}

/**
 * 比较两个 PrSS 表达式（数组的字典序）
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number} -1 若 a<b, 0 若相等, 1 若 a>b
 */
export function compare(a, b) {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        if (a[i] > b[i]) return 1;
        if (a[i] < b[i]) return -1;
    }
    return a.length - b.length;
}

/**
 * 将表达式转换为可读字符串
 * @param {number[]} seq
 * @param {boolean} compact - true 时只显示元素序列（用逗号分隔），false 时显示为数组形式
 * @returns {string}
 */
export function display(seq, compact) {
    if (!seq || seq.length === 0) return compact ? "0" : "( )";
    if (compact) {
        return seq.join(", ");
    } else {
        return `(${seq.join(", ")})`;
    }
}

/**
 * 解析用户输入的字符串为内部表达式（整数数组）
 * @param {string} input - 用户输入的原始字符串
 * @returns {number[]} 解析出的整数数组
 */
export function parse(input) {
    // 1. 去除首尾空白，并复制给 cleaned 变量
    let cleaned = input.trim();

    // 2. 如果带有 [ ] 或 ( )，则剥掉外壳，只取内部内容
    const arrayMatch = cleaned.match(/^[\(\[]\s*(.*)\s*[\)\]]$/);
    if (arrayMatch) {
        cleaned = arrayMatch[1];
    }

    // 3. 用 JSON 解析（自动处理数字和逗号）
    try {
        const parsed = JSON.parse(`[${cleaned}]`);
        if (!Array.isArray(parsed)) {
            throw new Error("解析结果不是数组");
        }
        // 检查是否全部为非负整数
        for (const v of parsed) {
            if (!Number.isInteger(v) || v < 0) {
                throw new Error(`序列元素必须为非负整数，但遇到了 ${v}`);
            }
        }
        return parsed;
    } catch (err) {
        throw new Error(`PrSS 序列解析失败: ${err.message}`);
    }
}

/**
 * 生成从 0 到 n 的递增序列（用于极限展开示例）
 * @param {number} n - 非负整数
 * @returns {number[]} 序列 [0, 1, 2, ..., n]
 */
export function expandLimit(n) {
    if (!Number.isInteger(n) || n < 0) {
        throw new Error("expandLimit 的参数 n 必须为非负整数");
    }
    return Array.from({ length: n + 1 }, (_, i) => i);
}