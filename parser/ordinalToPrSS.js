// ============================================================================
//  序数表达式 → PrSS 序列 转换器
//  基于你提供的代码，仅保留核心转换逻辑，移除交互部分
// ============================================================================

// -------------------- 常量与节点 --------------------
const W = Symbol('W');          // 表示 ω
const One = Symbol('One');      // 表示 1

class Num {
  constructor(value) {
    this.value = value;
  }
}
class Add {
  constructor(children) {
    this.children = children;
  }
}
class Mul {
  constructor(left, right) {
    this.left = left;
    this.right = right;
  }
}
class Pow {
  constructor(base, exp) {
    this.base = base;
    this.exp = exp;
  }
}

// -------------------- 词法分析 --------------------
class Token {
  constructor(type, value) {
    this.type = type;
    this.value = value;
  }
}

function tokenize(s) {
  const tokens = [];
  let i = 0;
  const n = s.length;
  while (i < n) {
    const c = s[i];
    if (c.match(/\s/)) {
      i++;
      continue;
    }
    if (c.match(/\d/)) {
      let j = i;
      while (j < n && s[j].match(/\d/)) j++;
      const num = parseInt(s.slice(i, j));
      if (num > 1000) throw new Error("数字超过1000");
      if (num < 1) throw new Error("数字必须是正整数");
      tokens.push(new Token('NUM', num));
      i = j;
      continue;
    }
    if (c === 'w') {
      tokens.push(new Token('W'));
      i++;
      continue;
    }
    if (c === '^' || c === '*' || c === '+') {
      const typeMap = { '^': 'POWER', '*': 'STAR', '+': 'PLUS' };
      tokens.push(new Token(typeMap[c]));
      i++;
      continue;
    }
    if (c === '(' || c === '{') {
      tokens.push(new Token('LPAREN'));
      i++;
      continue;
    }
    if (c === ')' || c === '}') {
      tokens.push(new Token('RPAREN'));
      i++;
      continue;
    }
    throw new Error(`非法字符: ${c}`);
  }
  return tokens;
}

// -------------------- 语法分析 --------------------
class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek() {
    return this.pos < this.tokens.length ? this.tokens[this.pos] : null;
  }

  consume(expectedType) {
    const token = this.peek();
    if (!token) throw new SyntaxError("意外的表达式结尾");
    if (expectedType && token.type !== expectedType) {
      throw new SyntaxError(`期望 ${expectedType}, 但得到 ${token.type}`);
    }
    this.pos++;
    return token;
  }

  parse() {
    const node = this.parseAdd();
    if (this.peek() !== null) {
      throw new SyntaxError("表达式已结束但仍有剩余字符");
    }
    return node;
  }

  parseAdd() {
    const children = [this.parseMul()];
    while (this.peek() && this.peek().type === 'PLUS') {
      this.consume('PLUS');
      children.push(this.parseMul());
    }
    return children.length === 1 ? children[0] : new Add(children);
  }

  parseMul() {
    let left = this.parsePow();
    while (this.peek() && this.peek().type === 'STAR') {
      this.consume('STAR');
      const right = this.parsePow();
      left = new Mul(left, right);
    }
    return left;
  }

  parsePow() {
    let left = this.parseAtom();
    if (this.peek() && this.peek().type === 'POWER') {
      if (left !== W) throw new SyntaxError("幂的底数必须是 w");
      this.consume('POWER');
      const right = this.parsePow();
      left = new Pow(left, right);
    }
    while (this.peek() && ['W', 'NUM', 'LPAREN'].includes(this.peek().type)) {
      const right = this.parsePow();
      left = new Mul(left, right);
    }
    return left;
  }

  parseAtom() {
    const token = this.peek();
    if (!token) throw new SyntaxError("意外的表达式结尾");
    if (token.type === 'W') {
      this.consume('W');
      return W;
    } else if (token.type === 'NUM') {
      const num = this.consume('NUM').value;
      if (this.peek() && this.peek().type === 'W') {
        throw new SyntaxError("有限数字不能乘超限序数");
      }
      return new Num(num);
    } else if (token.type === 'LPAREN') {
      this.consume('LPAREN');
      const expr = this.parseAdd();
      this.consume('RPAREN');
      return expr;
    } else {
      throw new SyntaxError(`意外的符号: ${token.type}`);
    }
  }
}

// -------------------- 合并 w^a * w^b = w^(a+b) --------------------
function mergePowMul(node) {
  if (node === W || node === One || node instanceof Num) {
    return node;
  }
  if (node instanceof Add) {
    return new Add(node.children.map(c => mergePowMul(c)));
  }
  if (node instanceof Pow) {
    return new Pow(node.base, mergePowMul(node.exp));
  }
  if (node instanceof Mul) {
    const left = mergePowMul(node.left);
    const right = mergePowMul(node.right);
    if (right instanceof Num) {
      return new Mul(left, right);
    }
    let leftExp;
    if (left instanceof Pow && left.base === W) {
      leftExp = left.exp;
    } else if (left === W) {
      leftExp = One;
    } else {
      throw new Error("乘法左操作数必须是 w 或 w^a");
    }
    let rightExp;
    if (right instanceof Pow && right.base === W) {
      rightExp = right.exp;
    } else if (right === W) {
      rightExp = One;
    } else {
      throw new Error("乘法仅允许 w^a * w^b 或 表达式 * 自然数");
    }
    return new Pow(W, new Add([leftExp, rightExp]));
  }
  throw new Error(`未知节点: ${node.constructor.name}`);
}

// -------------------- 展开自然数与自然数乘法 --------------------
function expand(node) {
  if (node instanceof Num) {
    const n = node.value;
    return n === 1 ? One : new Add(Array(n).fill(One));
  }
  if (node === W || node === One) {
    return node;
  }
  if (node instanceof Add) {
    return new Add(node.children.map(c => expand(c)));
  }
  if (node instanceof Mul) {
    const left = expand(node.left);
    const n = node.right.value;
    return n === 1 ? left : new Add(Array(n).fill(left));
  }
  if (node instanceof Pow) {
    return new Pow(node.base, expand(node.exp));
  }
  throw new Error(`未知节点: ${node.constructor.name}`);
}

// -------------------- 为非底数位置的 w 补上指数 1 --------------------
function addExplicitExponents(node, isBase = false) {
  if (node === W) {
    return isBase ? W : new Pow(W, One);
  }
  if (node === One) {
    return node;
  }
  if (node instanceof Add) {
    return new Add(node.children.map(c => addExplicitExponents(c, false)));
  }
  if (node instanceof Pow) {
    return new Pow(
      addExplicitExponents(node.base, true),
      addExplicitExponents(node.exp, false)
    );
  }
  throw new Error(`未知节点: ${node.constructor.name}`);
}

// -------------------- 遍历生成 PrSS 序列 --------------------
function traverse(node, depth, seq) {
  if (node instanceof Add) {
    for (const child of node.children) {
      traverse(child, depth, seq);
    }
  } else if (node instanceof Pow) {
    seq.push(depth);
    traverse(node.exp, depth + 1, seq);
  } else if (node === One) {
    seq.push(depth);
  } else if (node === W) {
    seq.push(depth);
  } else {
    throw new Error(`未知节点: ${node.constructor.name}`);
  }
}

// -------------------- 主转换函数（导出的入口） --------------------
export function ordinalToPrSS(exprStr) {
  const tokens = tokenize(exprStr);
  let ast = new Parser(tokens).parse();
  ast = mergePowMul(ast);
  ast = expand(ast);
  ast = addExplicitExponents(ast);
  const seq = [];
  traverse(ast, 0, seq);
  return seq.join(',');
}