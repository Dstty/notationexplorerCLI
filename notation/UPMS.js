// UPMS.js (ES Module)
// Unupgrading Projection Matrix System support for hypcos/notation-explorer.
// Optimized version: fewer temporary matrices, array-backed caches, numeric VR table.

const STRICT_BASE_COLUMN = true;
// true follows the prompt literally: for z=A(i,k), use the first k+1 entries
// of column i, and add 1 to the first k entries. Set to false only if you
// need to mimic an older standalone demo that used first k entries instead.

const isPseudoInfinity = expr => '' + expr === 'Infinity';
const cloneColumn = col => col.slice();
const cloneMatrix = matrix => matrix.map(cloneColumn);

const isNatural = value =>
  Number.isInteger(value) && value >= 0 && Number.isFinite(value);

const standardizeMatrix = matrix => {
  if (!Array.isArray(matrix) || matrix.length === 0) return [];
  let rows = 1;
  for (const col of matrix) {
    if (!Array.isArray(col)) return [];
    rows = Math.max(rows, col.length);
  }

  const result = matrix.map(col => {
    const out = col.slice();
    while (out.length < rows) out.push(0);
    return out;
  });

  // Remove globally trailing zero rows
  while (rows > 1 && result.every(col => col[rows - 1] === 0)) {
    result.forEach(col => col.pop());
    rows--;
  }
  return result;
};

const isLegalUPMSMatrix = matrix => {
  if (isPseudoInfinity(matrix)) return true;
  if (!Array.isArray(matrix)) return false;
  if (matrix.length === 0) return true;

  for (const col of matrix) {
    if (!Array.isArray(col)) return false;
    for (const value of col) {
      if (!isNatural(value)) return false;
    }
  }

  const m = standardizeMatrix(matrix);
  if (m.length === 0) return true;
  const rows = m[0].length;

  for (let r = 0; r < rows; r++) {
    if (m[0][r] !== 0) return false;
  }
  for (let c = 0; c < m.length; c++) {
    const col = m[c];
    for (let r = 1; r < rows; r++) {
      if (col[r] > col[r - 1]) return false;
    }
  }
  return true;
};

// sequence compare (internal)
const compare = (seq1, seq2) => {
  const len = Math.max(seq1.length, seq2.length);
  for (let i = 0; i < len; i++) {
    const a = i < seq1.length ? seq1[i] : 0;
    const b = i < seq2.length ? seq2[i] : 0;
    if (a < b) return -1;
    if (a > b) return 1;
  }
  return 0;
};

const matrixCompare = (m1, m2) => {
  const inf1 = isPseudoInfinity(m1);
  const inf2 = isPseudoInfinity(m2);
  if (inf1 || inf2) return inf1 === inf2 ? 0 : (inf1 ? 1 : -1);

  const a = standardizeMatrix(m1);
  const b = standardizeMatrix(m2);
  const len = Math.max(a.length, b.length);
  for (let c = 0; c < len; c++) {
    if (c >= a.length) return -1;
    if (c >= b.length) return 1;
    const cmp = compare(a[c], b[c]);
    if (cmp !== 0) return cmp;
  }
  return 0;
};

// display
const display = expr => {
  if (isPseudoInfinity(expr)) return 'Limit';
  return standardizeMatrix(expr).map(col => '(' + col.join(',') + ')').join('');
};

const makeContext = matrix => {
  const m = standardizeMatrix(matrix);
  const colCount = m.length;
  const rowCount = colCount === 0 ? 0 : m[0].length;

  const parentCache = Array.from({ length: rowCount + 1 }, () => Array(colCount).fill(-2));
  const ancestorCache = Array.from({ length: rowCount + 1 }, () => Array(colCount).fill(null));

  const getZeroParent = colIndex => colIndex > 0 ? colIndex - 1 : -1;

  const getAAncestors = (colIndex, a) => {
    if (a < 0 || a > rowCount || colIndex < 0 || colIndex >= colCount) {
      return { list: [], mask: new Uint8Array(colCount) };
    }
    const cached = ancestorCache[a][colIndex];
    if (cached !== null) return cached;

    const list = [];
    const mask = new Uint8Array(colCount);
    let current = colIndex;
    let guard = 0;

    while (current !== -1 && !mask[current] && guard++ <= colCount + 2) {
      list.push(current);
      mask[current] = 1;
      current = a === 0 ? getZeroParent(current) : getBParent(current, a);
    }

    const result = { list, mask };
    ancestorCache[a][colIndex] = result;
    return result;
  };

  const getBParent = (colIndex, b) => {
    if (b < 1 || b > rowCount || colIndex < 0 || colIndex >= colCount) return -1;
    const cached = parentCache[b][colIndex];
    if (cached !== -2) return cached;

    const row = b - 1;
    const value = m[colIndex][row];
    const ancestors = getAAncestors(colIndex, b - 1).list;
    let best = -1;

    for (let i = 0; i < ancestors.length; i++) {
      const candidate = ancestors[i];
      if (candidate >= colIndex) continue;
      if (m[candidate][row] < value) {
        best = candidate;
        break;
      }
    }

    parentCache[b][colIndex] = best;
    return best;
  };

  return { m, colCount, rowCount, getBParent, getAAncestors };
};

const lastColumnIsZero = matrix => {
  if (matrix.length === 0) return true;
  const last = matrix[matrix.length - 1];
  for (let r = 0; r < last.length; r++) {
    if (last[r] !== 0) return false;
  }
  return true;
};

const findLastNonZeroRowLabel = matrix => {
  if (matrix.length === 0) return -1;
  const last = matrix[matrix.length - 1];
  for (let r = last.length - 1; r >= 0; r--) {
    if (last[r] !== 0) return r + 1;
  }
  return -1;
};

const findBadRoot = ctx => {
  const lastCol = ctx.colCount - 1;
  const t = findLastNonZeroRowLabel(ctx.m);
  if (t === -1) return null;
  const rootCol = ctx.getBParent(lastCol, t);
  if (rootCol === -1) return null;
  return { rootCol, t };
};

const computeDelta = (ctx, rootCol, t) => {
  const lastCol = ctx.colCount - 1;
  const delta = new Array(ctx.rowCount);
  for (let r = 0; r < ctx.rowCount; r++) {
    delta[r] = r >= t - 1 ? 0 : ctx.m[lastCol][r] - ctx.m[rootCol][r];
  }
  return delta;
};

const maxEntry = matrix => {
  let max = 0;
  for (let c = 0; c < matrix.length; c++) {
    const col = matrix[c];
    for (let r = 0; r < col.length; r++) {
      if (col[r] > max) max = col[r];
    }
  }
  return max;
};

const computeUPMSVerificationRoots = (ctx, rootCol, t) => {
  const m = ctx.m;
  const alpha = ctx.colCount - 1;
  const y = rootCol;
  const width = ctx.colCount;
  const height = ctx.rowCount;
  const maxTwice = maxEntry(m) * 2;

  const vr = new Int8Array(width * height);
  vr.fill(-1);
  const vrIndex = (col, row) => col * height + row;
  const inBadPart = (col, row) => col >= y && col < alpha && row < t - 1;
  const getVR = (col, row) => inBadPart(col, row) ? vr[vrIndex(col, row)] : -1;
  const setVR = (col, row, value) => { vr[vrIndex(col, row)] = value; };

  const baseValue = (col, k, r) => {
    if (STRICT_BASE_COLUMN) return m[col][r] + (r < k ? 1 : 0);
    return m[col][r] + (r < k - 1 ? 1 : 0);
  };

  const columnLessThanBase = (candidate, col, k) => {
    const limit = STRICT_BASE_COLUMN ? k + 1 : k;
    for (let r = 0; r < limit; r++) {
      const a = r < height ? m[candidate][r] : 0;
      const b = baseValue(col, k, r);
      if (a < b) return true;
      if (a > b) return false;
    }
    return false;
  };

  const transformedXValue = (sourceCol, row, iCol, k) => {
    let value = m[sourceCol][row];
    if (row < k - 1 && getVR(sourceCol, row) === 1) {
      value += maxTwice - m[iCol][row];
    }
    return value;
  };

  const transformedYValue = (sourceCol, row, jCol, k) => {
    let value = m[sourceCol][row];
    if (row < k - 1) {
      const colIsJ = sourceCol === jCol;
      const containsJ = ctx.getAAncestors(sourceCol, row + 1).mask[jCol] === 1;
      if (colIsJ || containsJ) value += maxTwice - m[jCol][row];
    }
    return value;
  };

  const compareTransformedParts = (xStart, xEnd, yStart, jCol, iCol, k) => {
    const xLen = xEnd - xStart + 1;
    const yLen = alpha - yStart + 1;
    const commonCols = Math.min(xLen, yLen);

    for (let local = 0; local < commonCols; local++) {
      const xCol = xStart + local;
      const yCol = yStart + local;
      for (let row = 0; row < height; row++) {
        const xv = transformedXValue(xCol, row, iCol, k);
        const yv = transformedYValue(yCol, row, jCol, k);
        if (xv < yv) return -1;
        if (xv > yv) return 1;
      }
    }
    if (xLen < yLen) return -1;
    if (xLen > yLen) return 1;
    return 0;
  };

  for (let row = 0; row < t - 1; row++) {
    const k = row + 1;
    for (let col = y; col < alpha; col++) {
      if (col === y || row === 0) {
        setVR(col, row, 1);
        continue;
      }

      const kAncestors = ctx.getAAncestors(col, k);
      let ancestorHasVR0 = false;
      for (let a = 0; a < kAncestors.list.length; a++) {
        const ancCol = kAncestors.list[a];
        if (getVR(ancCol, row) === 0) {
          ancestorHasVR0 = true;
          break;
        }
      }

      const kParent = ctx.getBParent(col, k);
      if (kAncestors.mask[y] !== 1 || ancestorHasVR0 || kParent === -1) {
        setVR(col, row, 0);
        continue;
      }

      if (kParent !== y) {
        setVR(col, row, 1);
        continue;
      }

      let earlierRowHasVR0 = false;
      for (let wRow = 0; wRow < row; wRow++) {
        if (getVR(col, wRow) === 0) {
          earlierRowHasVR0 = true;
          break;
        }
      }
      if (earlierRowHasVR0) {
        setVR(col, row, 0);
        continue;
      }

      let higherParentEscapesBadRoot = false;
      for (let vRow = row + 1; vRow < t - 1; vRow++) {
        const v = vRow + 1;
        if (ctx.getBParent(col, v) !== y) {
          higherParentEscapesBadRoot = true;
          break;
        }
      }
      if (higherParentEscapesBadRoot) {
        setVR(col, row, 0);
        continue;
      }

      let u = -1;
      for (let candidate = col + 1; candidate <= alpha; candidate++) {
        if (columnLessThanBase(candidate, col, k)) {
          u = candidate;
          break;
        }
      }

      if (u === -1) {
        setVR(col, row, 1);
        continue;
      }

      const Ayk = m[y][row];
      const alphaAncestors = ctx.getAAncestors(alpha, k).list;
      let j = -1;
      for (let a = 0; a < alphaAncestors.length; a++) {
        const ancCol = alphaAncestors[a];
        if (m[ancCol][row] === Ayk + 1) {
          j = ancCol;
          break;
        }
      }
      if (j === -1) j = alpha;

      const cmp = compareTransformedParts(col, u - 1, j, j, col, k);
      setVR(col, row, cmp < 0 ? 0 : 1);
    }
  }

  return { data: vr, index: vrIndex, height };
};

const generateBh = (ctx, B, delta, t, h, rootCol, vr) => {
  return B.map((col, localCol) => {
    const originalCol = rootCol + localCol;
    const next = new Array(ctx.rowCount);
    for (let r = 0; r < ctx.rowCount; r++) {
      const hasVerificationRoot = r < t - 1 && vr.data[vr.index(originalCol, r)] === 1;
      next[r] = col[r] + h * delta[r] * (hasVerificationRoot ? 1 : 0);
    }
    return next;
  });
};

const expandUPMS = (matrix, FSterm) => {
  if (!isLegalUPMSMatrix(matrix)) return [];
  const ctx = makeContext(matrix);
  const m = ctx.m;
  const n = Number.isFinite(FSterm) && FSterm >= 0 ? Math.floor(FSterm) : 0;

  if (m.length === 0) return [];
  if (lastColumnIsZero(m)) return standardizeMatrix(m.slice(0, -1).map(cloneColumn));

  const badRoot = findBadRoot(ctx);
  if (badRoot === null) return [];

  const { rootCol, t } = badRoot;
  const G = m.slice(0, rootCol).map(cloneColumn);
  const B = m.slice(rootCol, ctx.colCount - 1).map(cloneColumn);
  const delta = computeDelta(ctx, rootCol, t);
  const vr = computeUPMSVerificationRoots(ctx, rootCol, t);

  const result = [...G, ...B.map(cloneColumn)];
  for (let h = 1; h <= n; h++) {
    const Bh = generateBh(ctx, B, delta, t, h, rootCol, vr);
    for (let i = 0; i < Bh.length; i++) result.push(Bh[i]);
  }
  return standardizeMatrix(result);
};

const upmsLimit = expr => {
  if (isPseudoInfinity(expr)) return true;
  if (!isLegalUPMSMatrix(expr)) return false;
  const ctx = makeContext(expr);
  return ctx.m.length > 0 && !lastColumnIsZero(ctx.m) && findBadRoot(ctx) !== null;
};

// expandNormal with caching
const expandNormal = (() => {
  const cache = new Map();
  return (expr, FSterm) => {
    const n = Number.isFinite(FSterm) && FSterm >= 0 ? Math.floor(FSterm) : 0;

    // 恢复原始的 Infinity 处理：返回两列，每列长度为 n+1
    if (isPseudoInfinity(expr)) {
      // 第一列全 0，第二列全 1
      return [Array(n + 1).fill(0), Array(n + 1).fill(1)];
    }

    const standardized = standardizeMatrix(expr);
    const cacheKey = display(standardized) + '[' + n + ']';
    if (cache.has(cacheKey)) return cloneMatrix(cache.get(cacheKey));

    const result = expandUPMS(standardized, n);
    cache.set(cacheKey, cloneMatrix(result));
    return result;
  };
})();

// expandLimit 只接受步数 n，内部用 [Infinity] 表示极限矩阵
const expandLimit = (n) => expandNormal([Infinity], n);

// parse
const parse = str => {
  if (typeof str !== 'string') return [];
  str = str.trim();
  if (str === '' || str === '()') return [];
  const lower = str.toLowerCase();
  if (lower === 'infinity' || lower === 'limit') {
    return [Infinity];
  }

  const regex = /\(([^)]*)\)/g;
  const matches = [];
  let match;
  while ((match = regex.exec(str)) !== null) {
    const inner = match[1].trim();
    if (inner === '') {
      matches.push([]);
    } else {
      const nums = inner.split(',').map(s => {
        const trimmed = s.trim();
        if (trimmed === '') return 0;
        const num = Number(trimmed);
        return isNaN(num) ? 0 : num;
      });
      matches.push(nums);
    }
  }
  return matches.length ? matches : [];
};

// Exports
export {
  matrixCompare as compare,
  display,
  expandNormal,
  expandLimit,
  parse,
  upmsLimit as isLimit
};