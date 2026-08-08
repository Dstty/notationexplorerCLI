// 内部工具函数（Naruyoko 的 FS 代码，原封不动）
var itemSeparatorRegex = /[\t ,]/g;

function parseSequenceElement(s, i) {
  if (s.indexOf("v") == -1 || !isFinite(Number(s.substring(s.indexOf("v") + 1)))) {
    var numval = Number(s);
    return {
      value: numval,
      position: i,
      parentIndex: -1
    };
  } else {
    return {
      value: Number(s.substring(0, s.indexOf("v"))),
      position: i,
      parentIndex: Math.max(Math.min(i - 1, Number(s.substring(s.indexOf("v") + 1))), -1),
      forcedParent: true
    };
  }
}

function calcMountain(s) {
  var lastLayer;
  if (typeof s == "string") {
    lastLayer = s.split(itemSeparatorRegex).map(parseSequenceElement);
  } else lastLayer = s;
  var calculatedMountain = [lastLayer];
  while (true) {
    var hasNextLayer = false;
    for (var i = 0; i < lastLayer.length; i++) {
      if (lastLayer[i].forcedParent) {
        if (lastLayer[i].parentIndex != -1) hasNextLayer = true;
        continue;
      }
      var p;
      if (calculatedMountain.length == 1) {
        p = lastLayer[i].position + 1;
      } else {
        p = 0;
        while (calculatedMountain[calculatedMountain.length - 2][p].position < lastLayer[i].position + 1) p++;
      }
      while (true) {
        if (p < 0) break;
        var j;
        if (calculatedMountain.length == 1) {
          p--;
          j = p - 1;
        } else {
          p = calculatedMountain[calculatedMountain.length - 2][p].parentIndex;
          if (p < 0) break;
          j = 0;
          while (lastLayer[j].position < calculatedMountain[calculatedMountain.length - 2][p].position - 1) j++;
        }
        if (j < 0 || j < lastLayer.length - 1 && lastLayer[j].position + 1 != lastLayer[j + 1].position) break;
        if (lastLayer[j].value < lastLayer[i].value) {
          lastLayer[i].parentIndex = j;
          hasNextLayer = true;
          break;
        }
      }
    }
    if (!hasNextLayer) break;
    var currentLayer = [];
    calculatedMountain.push(currentLayer);
    for (var i = 0; i < lastLayer.length; i++) {
      if (lastLayer[i].parentIndex != -1) {
        currentLayer.push({
          value: lastLayer[i].value - lastLayer[lastLayer[i].parentIndex].value,
          position: lastLayer[i].position - 1,
          parentIndex: -1
        });
      }
    }
    lastLayer = currentLayer;
  }
  return calculatedMountain;
}

function calcDiagonal(mountain) {
  var diagonal = [];
  var diagonalTree = [];
  for (var i = 0; i < mountain[0].length; i++) {
    for (var j = mountain.length - 1; j >= 0; j--) {
      var k = 0;
      while (mountain[j][k] && mountain[j][k].position + j < i) k++;
      if (!mountain[j][k] || mountain[j][k].position + j != i) continue;
      var height = j;
      var lastIndex = k;
      while (true) {
        if (height == 0) {
          lastIndex = mountain[height][lastIndex].parentIndex;
        } else {
          var l = 0;
          while (mountain[height - 1][l].position != mountain[height][lastIndex].position + 1) l++;
          l = mountain[height - 1][l].parentIndex;
          var m = 0;
          while (mountain[height][m].position < mountain[height - 1][l].position - 1) m++;
          if (mountain[height][m].position == mountain[height - 1][l].position - 1) {
            lastIndex = m;
          } else {
            height--;
            lastIndex = l;
          }
        }
        if (!mountain[height][lastIndex] || mountain[height][lastIndex].parentIndex == -1) {
          diagonal.push(mountain[j][k].value);
          diagonalTree.push((mountain[height][lastIndex] ? mountain[height][lastIndex].position : -1) + height);
          break;
        }
      }
      break;
    }
  }
  var pw = [];
  for (var i = 0; i < diagonal.length; i++) {
    var p = -1;
    for (var j = i - 1; j >= 0; j--) {
      if (diagonal[j] < diagonal[i]) {
        p = j;
        break;
      }
    }
    pw.push(p);
  }
  var r = [];
  for (var i = 0; i < diagonal.length; i++) {
    var p = i;
    while (true) {
      p = diagonalTree[p];
      if (p < 0 || diagonal[p] < diagonal[i]) break;
    }
    if (p == pw[i]) r.push(diagonal[i]);
    else r.push(diagonal[i] + "v" + p);
  }
  return r.join(",");
}

function cloneMountain(mountain) {
  var newMountain = [];
  for (var i = 0; i < mountain.length; i++) {
    var layer = [];
    for (var j = 0; j < mountain[i].length; j++) {
      layer.push({
        value: mountain[i][j].value,
        position: mountain[i][j].position,
        parentIndex: mountain[i][j].parentIndex,
        forcedParent: mountain[i][j].forcedParent
      });
    }
    newMountain.push(layer);
  }
  return newMountain;
}

function getBadRoot(s) {
  var mountain;
  if (typeof s == "string") mountain = calcMountain(s);
  else mountain = cloneMountain(s);
  var diagonal = calcMountain(calcDiagonal(mountain));
  if (diagonal[0][diagonal[0].length - 1].value != 1) {
    return getBadRoot(diagonal);
  } else {
    for (var i = mountain.length - 1; i >= 0; i--) {
      if (mountain[i][mountain[i].length - 1].position + i == mountain[0].length - 1) return mountain[i - 1][mountain[i - 1][mountain[i - 1].length - 1].parentIndex].position + i - 1;
    }
  }
}

function expand(s, n, stringify) {
  var mountain;
  if (typeof s == "string") mountain = calcMountain(s);
  else mountain = cloneMountain(s);
  var result = cloneMountain(mountain);
  if (mountain[0][mountain[0].length - 1].parentIndex == -1) {
    result[0].pop();
  } else {
    var result = cloneMountain(mountain);
    var cutHeight = mountain.length - 1;
    while (mountain[cutHeight][mountain[cutHeight].length - 1].position + cutHeight != mountain[0].length - 1) cutHeight--;
    var actualCutHeight = cutHeight;
    var badRootSeam = getBadRoot(mountain);
    var badRootHeight;
    var diagonal = calcMountain(calcDiagonal(mountain));
    var newDiagonal;
    var yamakazi = diagonal[0][diagonal[0].length - 1].value == 1;
    if (yamakazi) {
      newDiagonal = cloneMountain(diagonal);
      newDiagonal[0].pop();
      for (var i = 0; i < n; i++) {
        for (var j = badRootSeam; j < mountain[0].length - 1; j++) {
          newDiagonal[0].push(newDiagonal[0][j]);
        }
      }
      cutHeight--;
      badRootHeight = cutHeight;
    } else {
      newDiagonal = expand(diagonal, n, false);
      badRootHeight = mountain.length - 1;
      while (true) {
        var i = 0;
        while (mountain[badRootHeight][i] && mountain[badRootHeight][i].position + badRootHeight < badRootSeam) i++;
        if (mountain[badRootHeight][i] && mountain[badRootHeight][i].position + badRootHeight == badRootSeam) break;
        badRootHeight--;
      }
    }
    for (var i = 0; i <= actualCutHeight; i++) result[i].pop();
    if (!result[result.length - 1].length) result.pop();
    var afterCutHeight = result.length;
    var afterCutMountain = cloneMountain(result);
    var afterCutLength = result[0].length;
    var badRootSeamHeight = afterCutHeight - 1;
    while (true) {
      var l = 0;
      while (mountain[badRootSeamHeight][l] && mountain[badRootSeamHeight][l].position + badRootSeamHeight < badRootSeam) l++;
      if (mountain[badRootSeamHeight][l] && mountain[badRootSeamHeight][l].position + badRootSeamHeight == badRootSeam) break;
      badRootSeamHeight--;
    }
    badRootSeamHeight++;
    for (var i = 1; i <= n; i++) {
      for (var j = badRootSeam; j < afterCutLength; j++) {
        var isAscending;
        var p = 0;
        while (mountain[badRootHeight][p].position + badRootHeight < j) p++;
        if (mountain[badRootHeight][p].position + badRootHeight == j) {
          while (true) {
            if (!mountain[badRootHeight][p] || mountain[badRootHeight][p].position + badRootHeight < badRootSeam) {
              isAscending = false;
              break;
            }
            if (mountain[badRootHeight][p].position + badRootHeight == badRootSeam) {
              isAscending = true;
              break;
            }
            p = mountain[badRootHeight][p].parentIndex;
          }
        } else {
          isAscending = false;
        }
        var seamHeight = afterCutHeight - 1;
        while (true) {
          var l = 0;
          while (mountain[seamHeight][l] && mountain[seamHeight][l].position + seamHeight < j) l++;
          if (mountain[seamHeight][l] && mountain[seamHeight][l].position + seamHeight == j) break;
          seamHeight--;
        }
        seamHeight++;
        var isReplacingCut = j == badRootSeam;
        if (isAscending) {
          for (var k = 0; k < seamHeight + (cutHeight - badRootHeight) * i; k++) {
            if (!result[k]) result.push([]);
            if (k < badRootHeight) {
              var sy = k;
              var sx;
              if (isReplacingCut) {
                sx = mountain[sy].length - 1;
              } else {
                sx = 0;
                while (mountain[sy][sx].position + sy < j) sx++;
              }
              var sourceParentIndex = mountain[sy][sx].parentIndex;
              var parentShifts = i - isReplacingCut;
              var parentPosition = mountain[sy][sourceParentIndex] ? mountain[sy][sourceParentIndex].position + parentShifts * (afterCutLength - badRootSeam) * (mountain[sy][sourceParentIndex].position + sy >= badRootSeam) - (k - sy) : -1;
              var parentIndex = 0;
              while (result[k][parentIndex] && result[k][parentIndex].position < parentPosition) parentIndex++;
              if (!result[k][parentIndex] || result[k][parentIndex].position != parentPosition) parentIndex = -1;
              result[k].push({
                value: parentIndex == -1 ? newDiagonal[0][j + (afterCutLength - badRootSeam) * i].value : NaN,
                position: j + (afterCutLength - badRootSeam) * i - k,
                parentIndex: parentIndex,
                forcedParent: mountain[sy][sx].forcedParent
              });
            } else if (k <= badRootHeight + (cutHeight - badRootHeight) * (i - isReplacingCut)) {
              var sy = badRootHeight;
              var sx;
              if (!yamakazi && isReplacingCut) {
                sx = mountain[sy].length - 1;
              } else {
                sx = 0;
                while (mountain[sy][sx].position + sy < j) sx++;
              }
              var sourceParentIndex = mountain[sy][sx].parentIndex;
              var parentShifts = i - isReplacingCut;
              var parentPosition = mountain[sy][sourceParentIndex] ? mountain[sy][sourceParentIndex].position + parentShifts * (afterCutLength - badRootSeam) * (mountain[sy][sourceParentIndex].position + sy >= badRootSeam) - (k - sy) : -1;
              var parentIndex = 0;
              while (result[k][parentIndex] && result[k][parentIndex].position < parentPosition) parentIndex++;
              if (!result[k][parentIndex] || result[k][parentIndex].position != parentPosition) parentIndex = -1;
              result[k].push({
                value: parentIndex == -1 ? newDiagonal[0][j + (afterCutLength - badRootSeam) * i].value : NaN,
                position: j + (afterCutLength - badRootSeam) * i - k,
                parentIndex: parentIndex,
                forcedParent: mountain[sy][sx].forcedParent
              });
            } else if (isReplacingCut && k <= badRootHeight + (cutHeight - badRootHeight) * i) {
              var sy = k - (cutHeight - badRootHeight) * (i - 1);
              var sx;
              if (!yamakazi && isReplacingCut) {
                sx = mountain[sy].length - 1;
              } else {
                sx = 0;
                while (mountain[sy][sx].position + sy < j) sx++;
              }
              var sourceParentIndex = mountain[sy][sx].parentIndex;
              var parentShifts = i - isReplacingCut;
              var parentPosition = mountain[sy][sourceParentIndex] ? mountain[sy][sourceParentIndex].position + parentShifts * (afterCutLength - badRootSeam) * (mountain[sy][sourceParentIndex].position + sy >= badRootSeam) - (k - sy) : -1;
              var parentIndex = 0;
              while (result[k][parentIndex] && result[k][parentIndex].position < parentPosition) parentIndex++;
              if (!result[k][parentIndex] || result[k][parentIndex].position != parentPosition) parentIndex = -1;
              result[k].push({
                value: parentIndex == -1 ? newDiagonal[0][j + (afterCutLength - badRootSeam) * i].value : NaN,
                position: j + (afterCutLength - badRootSeam) * i - k,
                parentIndex: parentIndex,
                forcedParent: mountain[sy][sx].forcedParent
              });
            } else {
              var sy = k - (cutHeight - badRootHeight) * i;
              var sx;
              if (!yamakazi && isReplacingCut) {
                sx = mountain[sy].length - 1;
              } else {
                sx = 0;
                while (mountain[sy][sx].position + sy < j) sx++;
              }
              var sourceParentIndex = mountain[sy][sx].parentIndex;
              var parentShifts = i - isReplacingCut;
              var parentPosition = mountain[sy][sourceParentIndex] ? mountain[sy][sourceParentIndex].position + parentShifts * (afterCutLength - badRootSeam) * (mountain[sy][sourceParentIndex].position + sy >= badRootSeam) - (k - sy) : -1;
              var parentIndex = 0;
              while (result[k][parentIndex] && result[k][parentIndex].position < parentPosition) parentIndex++;
              if (!result[k][parentIndex] || result[k][parentIndex].position != parentPosition) parentIndex = -1;
              result[k].push({
                value: parentIndex == -1 ? newDiagonal[0][j + (afterCutLength - badRootSeam) * i].value : NaN,
                position: j + (afterCutLength - badRootSeam) * i - k,
                parentIndex: parentIndex,
                forcedParent: mountain[sy][sx].forcedParent
              });
            }
          }
        } else {
          if (isReplacingCut) console.warn("Cut child and not connected to bad root. Makes sense.");
          for (var k = 0; k < seamHeight; k++) {
            if (!result[k]) result.push([]);
            if (true) {
              var sy = k;
              var sx;
              if (isReplacingCut) {
                sx = mountain[sy].length - 1;
              } else {
                sx = 0;
                while (mountain[sy][sx].position + sy < j) sx++;
              }
              var sourceParentIndex = mountain[sy][sx].parentIndex;
              var parentShifts = i - isReplacingCut;
              var parentPosition = mountain[sy][sourceParentIndex] ? mountain[sy][sourceParentIndex].position + parentShifts * (afterCutLength - badRootSeam) * (mountain[sy][sourceParentIndex].position + sy >= badRootSeam) - (k - sy) : -1;
              var parentIndex = 0;
              while (result[k][parentIndex] && result[k][parentIndex].position < parentPosition) parentIndex++;
              if (!result[k][parentIndex] || result[k][parentIndex].position != parentPosition) parentIndex = -1;
              result[k].push({
                value: parentIndex == -1 ? newDiagonal[0][j + (afterCutLength - badRootSeam) * i].value : NaN,
                position: j + (afterCutLength - badRootSeam) * i - k,
                parentIndex: parentIndex,
                forcedParent: mountain[sy][sx].forcedParent
              });
            }
          }
        }
      }
    }
  }
  for (var i = result.length - 1; i >= 0; i--) {
    if (!result[i].length) {
      result.pop();
      continue;
    }
    for (var j = 0; j < result[i].length; j++) {
      if (!isNaN(result[i][j].value)) continue;
      var k = 0;
      while (result[i + 1][k].position < result[i][j].position - 1) k++;
      if (result[i + 1][k].position != result[i][j].position - 1) throw Error("Mountain not complete");
      result[i][j].value = result[i][result[i][j].parentIndex].value + result[i + 1][k].value;
    }
  }
  var rr;
  if (stringify) {
    rr = [];
    for (var i = 0; result[0] && i < result[0].length; i++) {
      rr.push(result[0][i].value + (result[0].forcedParent ? "v" + result[0].parentIndex : ""));
    }
    rr = rr.join(",");
  } else {
    rr = result;
  }
  return rr;
}

// ===== 导出函数定义 =====

/**
 * 比较两个序列（内部表示为数字数组）
 * @param {number[]} seq1
 * @param {number[]} seq2
 * @returns {number} 负数表示 seq1 < seq2，正数表示 seq1 > seq2，0 表示相等
 */
export function compare(seq1, seq2) {
  if (seq1.length !== seq2.length) {
    return seq1.length - seq2.length;
  }
  for (let i = 0; i < seq1.length; i++) {
    if (seq1[i] !== seq2[i]) {
      return seq1[i] - seq2[i];
    }
  }
  return 0;
}

/**
 * 将内部表达式（序列数组）转换为可读字符串
 * @param {number[]} expr
 * @returns {string}
 */
export function display(expr) {
  return expr.map(v => v === Infinity ? '∞' : String(v)).join(',');
}

/**
 * 基本展开函数（原 FS）
 * @param {number[]|string} seq  序列（或字符串，但推荐数组）
 * @param {number} FSterm        展开步数
 * @returns {number[]}           展开后的序列数组
 */
export function expandNormal(seq, FSterm) {
  if ('' + seq === 'Infinity') {
    return [1, 1 + FSterm];
  }
  const resultStr = expand('' + seq, FSterm, true);
  return resultStr.split(',').map(e => +e);
}

/**
 * 对极限序列 [Infinity] 进行展开
 * @param {number} n  展开步数
 * @returns {number[]}
 */
export function expandLimit(n) {
  return expandNormal([Infinity], n);
}

/**
 * 将字符串解析为内部表达式结构（数字数组）
 * 支持 "1,2,3" 或 "1v0,2" 等形式（v 后缀会被忽略，仅取数值部分）
 * @param {string} str
 * @returns {number[]}
 */
export function parse(str) {
  if (str.trim() === '') return [];
  return str.split(',').map(s => {
    s = s.trim();
    if (s === 'Infinity' || s === '∞') return Infinity;
    const vIdx = s.indexOf('v');
    if (vIdx !== -1) s = s.substring(0, vIdx);
    return Number(s);
  });
}