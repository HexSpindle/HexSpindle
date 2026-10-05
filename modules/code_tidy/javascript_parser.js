import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { tokenize } from './_jstok.js';

class ParseError extends Error {}

function lex(src) {
  const raw = tokenize(src);
  let offset = 0;
  const toks = [];
  const comments = [];
  for (const [kind, text] of raw) {
    const start = offset;
    offset += text.length;
    const end = offset;
    if (kind === 'ws') continue;
    if (kind === 'lc' || kind === 'bc') {
      comments.push({ type: kind === 'lc' ? 'Line' : 'Block', value: kind === 'lc' ? text.slice(2) : text.slice(2, -2), start, end });
      continue;
    }
    toks.push({ kind, text, start, end });
  }
  return { toks, comments };
}

function makeLocator(src) {
  const lineStarts = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === '\n') lineStarts.push(i + 1);
  return (offset) => {
    let lo = 0, hi = lineStarts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStarts[mid] <= offset) lo = mid; else hi = mid - 1; }
    return { line: lo + 1, column: offset - lineStarts[lo] };
  };
}

const ASSIGN_OPS = new Set(['=', '+=', '-=', '*=', '/=', '%=', '**=', '<<=', '>>=', '>>>=', '&=', '|=', '^=', '&&=', '||=', '??=']);
const KEYWORD_STATEMENTS = new Set(['var', 'let', 'const', 'if', 'for', 'while', 'do', 'function', 'return', 'break', 'continue',
  'throw', 'try', 'switch', 'class', 'async']);

class Parser {
  constructor(src, opts) {
    this.src = src;
    this.opts = opts;
    const { toks, comments } = lex(src);
    this.toks = toks;
    this.comments = comments;
    this.i = 0;
    this.locate = makeLocator(src);
  }

  tok(k = 0) { return this.toks[this.i + k] || { kind: 'eof', text: '', start: this.src.length, end: this.src.length }; }
  text(k = 0) { return this.tok(k).text; }
  atEnd() { return this.i >= this.toks.length; }
  is(text, k = 0) { return this.text(k) === text; }
  isKind(kind, k = 0) { return this.tok(k).kind === kind; }
  advance() { const t = this.tok(); this.i++; return t; }
  fail(msg, at) {
    const tk = at || this.tok();
    const loc = this.locate(tk.start);
    throw new ParseError(`${msg} at line ${loc.line}, column ${loc.column} (found ${JSON.stringify(tk.text || '<end of input>')})`);
  }
  expect(text) {
    if (!this.is(text)) this.fail(`Expected '${text}'`);
    return this.advance();
  }
  eat(text) { if (this.is(text)) { this.advance(); return true; } return false; }
  eatSemi() {
    if (this.eat(';')) return;
    if (this.is('}') || this.atEnd()) return; // ASI at block/EOF boundary (documented simplification)
    this.fail("Expected ';'");
  }

  node(type, start, fields) {
    const n = { type, ...fields };
    if (this.opts.loc) {
      const endTok = this.toks[this.i - 1];
      const end = endTok ? endTok.end : start;
      n.loc = { start: this.locate(start), end: this.locate(end) };
    }
    return n;
  }

  parseProgram() {
    const start = this.tok().start;
    const body = [];
    while (!this.atEnd()) body.push(this.parseStatement());
    const prog = this.node('Program', start, { body, sourceType: 'script' });
    if (this.opts.comments) prog.comments = this.comments.map((c) => ({ type: c.type, value: c.value }));
    return prog;
  }

  parseStatement() {
    const start = this.tok().start;
    if (this.is(';')) { this.advance(); return this.node('EmptyStatement', start, {}); }
    if (this.is('{')) return this.parseBlock();
    if (this.isKind('id')) {
      const kw = this.text();
      if (kw === 'var' || kw === 'let' || kw === 'const') return this.parseVarStatement();
      if (kw === 'if') return this.parseIf();
      if (kw === 'for') return this.parseFor();
      if (kw === 'while') return this.parseWhile();
      if (kw === 'do') return this.parseDoWhile();
      if (kw === 'function') return this.parseFunction(true, false);
      if (kw === 'async' && this.is('function', 1)) { this.advance(); return this.parseFunction(true, true); }
      if (kw === 'return') return this.parseReturn();
      if (kw === 'break' || kw === 'continue') return this.parseBreakContinue(kw);
      if (kw === 'throw') return this.parseThrow();
      if (kw === 'try') return this.parseTry();
      if (kw === 'switch') return this.parseSwitch();
      if (kw === 'class') return this.parseClass(true);
      if (!KEYWORD_STATEMENTS.has(kw) && this.is(':', 1)) {
        this.advance(); this.advance();
        const body = this.parseStatement();
        return this.node('LabeledStatement', start, { label: { type: 'Identifier', name: kw }, body });
      }
    }
    return this.parseExpressionStatement();
  }

  parseBlock() {
    const start = this.tok().start;
    this.expect('{');
    const body = [];
    while (!this.is('}')) {
      if (this.atEnd()) this.fail("Expected '}'");
      body.push(this.parseStatement());
    }
    this.expect('}');
    return this.node('BlockStatement', start, { body });
  }

  parseVarStatement() {
    const decl = this.parseVarDeclaration();
    this.eatSemi();
    return decl;
  }

  parseVarDeclaration() {
    const start = this.tok().start;
    const kind = this.advance().text; // var/let/const
    const declarations = [];
    do {
      const idStart = this.tok().start;
      if (!this.isKind('id')) this.fail('Expected a binding identifier (destructuring patterns are not supported)');
      const id = { type: 'Identifier', name: this.advance().text };
      let init = null;
      if (this.eat('=')) init = this.parseAssignExpr();
      declarations.push(this.node('VariableDeclarator', idStart, { id, init }));
    } while (this.eat(','));
    return this.node('VariableDeclaration', start, { kind, declarations });
  }

  parseIf() {
    const start = this.tok().start;
    this.advance(); this.expect('(');
    const test = this.parseExpression();
    this.expect(')');
    const consequent = this.parseStatement();
    let alternate = null;
    if (this.isKind('id') && this.is('else')) { this.advance(); alternate = this.parseStatement(); }
    return this.node('IfStatement', start, { test, consequent, alternate });
  }

  parseFor() {
    const start = this.tok().start;
    this.advance(); this.expect('(');
    let init = null;
    if (!this.is(';')) {
      if (this.isKind('id') && (this.is('var') || this.is('let') || this.is('const'))) {
        init = this.parseVarDeclaration();
      } else {
        init = this.parseExpression(true);
      }
    }
    if (this.isKind('id') && (this.is('in') || this.is('of'))) {
      const kind = this.advance().text;
      const right = kind === 'in' ? this.parseExpression() : this.parseAssignExpr();
      this.expect(')');
      const body = this.parseStatement();
      return this.node(kind === 'in' ? 'ForInStatement' : 'ForOfStatement', start, { left: init, right, body });
    }
    this.expect(';');
    const test = this.is(';') ? null : this.parseExpression();
    this.expect(';');
    const update = this.is(')') ? null : this.parseExpression();
    this.expect(')');
    const body = this.parseStatement();
    return this.node('ForStatement', start, { init, test, update, body });
  }

  parseWhile() {
    const start = this.tok().start;
    this.advance(); this.expect('(');
    const test = this.parseExpression();
    this.expect(')');
    const body = this.parseStatement();
    return this.node('WhileStatement', start, { test, body });
  }

  parseDoWhile() {
    const start = this.tok().start;
    this.advance();
    const body = this.parseStatement();
    if (!(this.isKind('id') && this.is('while'))) this.fail("Expected 'while'");
    this.advance(); this.expect('(');
    const test = this.parseExpression();
    this.expect(')');
    this.eatSemi();
    return this.node('DoWhileStatement', start, { test, body });
  }

  parseParamList() {
    this.expect('(');
    const params = [];
    while (!this.is(')')) {
      const pStart = this.tok().start;
      if (this.eat('...')) {
        if (!this.isKind('id')) this.fail('Expected an identifier after rest parameter ...');
        params.push(this.node('RestElement', pStart, { argument: { type: 'Identifier', name: this.advance().text } }));
      } else {
        if (!this.isKind('id')) this.fail('Expected a parameter identifier (destructuring parameters are not supported)');
        const id = { type: 'Identifier', name: this.advance().text };
        if (this.eat('=')) {
          const right = this.parseAssignExpr();
          params.push(this.node('AssignmentPattern', pStart, { left: id, right }));
        } else {
          params.push(id);
        }
      }
      if (!this.is(')')) this.expect(',');
    }
    this.expect(')');
    return params;
  }

  parseFunction(isDeclaration, isAsync) {
    const start = this.tok().start;
    this.advance(); // 'function'
    if (this.is('*')) this.fail('Generator functions (function*) are not supported');
    let id = null;
    if (this.isKind('id') && !this.is('(')) { id = { type: 'Identifier', name: this.advance().text }; }
    if (isDeclaration && !id) this.fail('Function declarations require a name');
    const params = this.parseParamList();
    const body = this.parseBlock();
    return this.node(isDeclaration ? 'FunctionDeclaration' : 'FunctionExpression', start, { id, params, body, async: !!isAsync, generator: false });
  }

  parseReturn() {
    const start = this.tok().start;
    this.advance();
    let argument = null;
    if (!this.is(';') && !this.is('}') && !this.atEnd()) argument = this.parseExpression();
    this.eatSemi();
    return this.node('ReturnStatement', start, { argument });
  }

  parseBreakContinue(kw) {
    const start = this.tok().start;
    this.advance();
    let label = null;
    if (this.isKind('id') && !this.is(';') && !this.is('}')) label = { type: 'Identifier', name: this.advance().text };
    this.eatSemi();
    return this.node(kw === 'break' ? 'BreakStatement' : 'ContinueStatement', start, { label });
  }

  parseThrow() {
    const start = this.tok().start;
    this.advance();
    const argument = this.parseExpression();
    this.eatSemi();
    return this.node('ThrowStatement', start, { argument });
  }

  parseTry() {
    const start = this.tok().start;
    this.advance();
    const block = this.parseBlock();
    let handler = null, finalizer = null;
    if (this.isKind('id') && this.is('catch')) {
      const cStart = this.tok().start;
      this.advance();
      let param = null;
      if (this.eat('(')) {
        if (!this.isKind('id')) this.fail('Expected a catch binding identifier (destructuring is not supported)');
        param = { type: 'Identifier', name: this.advance().text };
        this.expect(')');
      }
      const cbody = this.parseBlock();
      handler = this.node('CatchClause', cStart, { param, body: cbody });
    }
    if (this.isKind('id') && this.is('finally')) { this.advance(); finalizer = this.parseBlock(); }
    if (!handler && !finalizer) this.fail("Expected 'catch' or 'finally'");
    return this.node('TryStatement', start, { block, handler, finalizer });
  }

  parseSwitch() {
    const start = this.tok().start;
    this.advance(); this.expect('(');
    const discriminant = this.parseExpression();
    this.expect(')'); this.expect('{');
    const cases = [];
    while (!this.is('}')) {
      const cStart = this.tok().start;
      let test = null;
      if (this.isKind('id') && this.is('case')) { this.advance(); test = this.parseExpression(); }
      else if (this.isKind('id') && this.is('default')) { this.advance(); }
      else this.fail("Expected 'case' or 'default'");
      this.expect(':');
      const consequent = [];
      while (!this.is('}') && !(this.isKind('id') && (this.is('case') || this.is('default')))) consequent.push(this.parseStatement());
      cases.push(this.node('SwitchCase', cStart, { test, consequent }));
    }
    this.expect('}');
    return this.node('SwitchStatement', start, { discriminant, cases });
  }

  parseClass(isDeclaration) {
    const start = this.tok().start;
    this.advance(); // 'class'
    let id = null;
    if (this.isKind('id') && !this.is('extends') && !this.is('{')) id = { type: 'Identifier', name: this.advance().text };
    let superClass = null;
    if (this.isKind('id') && this.is('extends')) { this.advance(); superClass = this.parseLeftHandSide(); }
    this.expect('{');
    const body = [];
    while (!this.is('}')) {
      if (this.eat(';')) continue;
      body.push(this.parseClassMember());
    }
    this.expect('}');
    return this.node(isDeclaration ? 'ClassDeclaration' : 'ClassExpression', start, { id, superClass, body: { type: 'ClassBody', body } });
  }

  parseClassMember() {
    const start = this.tok().start;
    let isStatic = false;
    if (this.isKind('id') && this.is('static') && !this.is('(', 1) && !this.is('=', 1)) { this.advance(); isStatic = true; }
    let kind = 'method';
    if (this.isKind('id') && (this.is('get') || this.is('set')) && !this.is('(', 1) && !this.is('=', 1)) { kind = this.advance().text; }
    let computed = false, key;
    if (this.eat('[')) { computed = true; key = this.parseAssignExpr(); this.expect(']'); }
    else if (this.isKind('str')) { key = { type: 'Literal', value: this.advance().text.slice(1, -1) }; }
    else if (this.isKind('id') || this.isKind('num')) { key = { type: 'Identifier', name: this.advance().text }; }
    else this.fail('Expected a method name (class fields are not supported, only methods)');
    if (!this.is('(')) this.fail('Expected \'(\' - class fields are not supported, only methods/getters/setters');
    const params = this.parseParamList();
    const bodyBlock = this.parseBlock();
    const name = key.name ?? key.value;
    const value = { type: 'FunctionExpression', id: null, params, body: bodyBlock, async: false, generator: false };
    return this.node('MethodDefinition', start, { key, computed, static: isStatic, kind: name === 'constructor' && kind === 'method' ? 'constructor' : kind, value });
  }

  parseExpressionStatement() {
    const start = this.tok().start;
    const expression = this.parseExpression();
    this.eatSemi();
    return this.node('ExpressionStatement', start, { expression });
  }

  parseExpression(noIn = false) {
    const start = this.tok().start;
    let expr = this.parseAssignExpr(noIn);
    if (this.is(',')) {
      const expressions = [expr];
      while (this.eat(',')) expressions.push(this.parseAssignExpr(noIn));
      expr = this.node('SequenceExpression', start, { expressions });
    }
    return expr;
  }

  parseAssignExpr(noIn = false) {
    const start = this.tok().start;
    const arrow = this.tryParseArrow();
    if (arrow) return arrow;
    const left = this.parseConditional(noIn);
    if (this.isKind('p') && ASSIGN_OPS.has(this.text())) {
      if (left.type !== 'Identifier' && left.type !== 'MemberExpression') this.fail('Invalid assignment target (destructuring assignment targets are not supported)');
      const operator = this.advance().text;
      const right = this.parseAssignExpr(noIn);
      return this.node('AssignmentExpression', start, { operator, left, right });
    }
    return left;
  }

  tryParseArrow() {
    const startI = this.i;
    let isAsync = false;
    if (this.isKind('id') && this.is('async') && (this.is('(', 1) || this.isKind('id', 1))) {
      const save = this.i;
      this.advance();
      const got = this._tryArrowAfterAsync();
      if (got) return got;
      this.i = save;
      return null;
    }
    const start = this.tok().start;
    if (this.isKind('id') && this.is('=>', 1) && this.text() !== 'async') {
      const name = this.advance().text;
      this.expect('=>');
      return this.finishArrow(start, [{ type: 'Identifier', name }], false);
    }
    if (this.is('(')) {
      const save = this.i;
      try {
        const params = this.parseParamList();
        if (this.is('=>')) { this.advance(); return this.finishArrow(start, params, false); }
      } catch { /* not an arrow function - fall through to backtrack */ }
      this.i = save;
    }
    this.i = startI;
    return null;
  }

  _tryArrowAfterAsync() {
    const start = this.toks[this.i - 1].start;
    if (this.isKind('id') && this.is('=>', 1)) {
      const name = this.advance().text;
      this.expect('=>');
      return this.finishArrow(start, [{ type: 'Identifier', name }], true);
    }
    if (this.is('(')) {
      const save = this.i;
      try {
        const params = this.parseParamList();
        if (this.is('=>')) { this.advance(); return this.finishArrow(start, params, true); }
      } catch { /* not an arrow function */ }
      this.i = save;
    }
    return null;
  }

  finishArrow(start, params, isAsync) {
    let body, expression;
    if (this.is('{')) { body = this.parseBlock(); expression = false; }
    else { body = this.parseAssignExpr(); expression = true; }
    return this.node('ArrowFunctionExpression', start, { id: null, params, body, expression, async: isAsync, generator: false });
  }

  parseConditional(noIn) {
    const start = this.tok().start;
    const test = this.parseNullish(noIn);
    if (this.eat('?')) {
      const consequent = this.parseAssignExpr();
      this.expect(':');
      const alternate = this.parseAssignExpr(noIn);
      return this.node('ConditionalExpression', start, { test, consequent, alternate });
    }
    return test;
  }

  binaryLevel(next, ops, logical = false) {
    return (noIn) => {
      const start = this.tok().start;
      let left = next.call(this, noIn);
      while (this.isKind('p') && ops.includes(this.text())) {
        const operator = this.advance().text;
        const right = next.call(this, noIn);
        left = this.node(logical ? 'LogicalExpression' : 'BinaryExpression', start, { operator, left, right });
      }
      return left;
    };
  }

  parseNullish(noIn) { return this._nullish(noIn); }

  parseEquality(noIn) { return this._equality(noIn); }

  parseUnary(noIn) {
    const start = this.tok().start;
    if (this.isKind('p') && ['+', '-', '!', '~'].includes(this.text())) {
      const operator = this.advance().text;
      const argument = this.parseUnary(noIn);
      return this.node('UnaryExpression', start, { operator, argument, prefix: true });
    }
    if (this.isKind('id') && ['typeof', 'void', 'delete'].includes(this.text())) {
      const operator = this.advance().text;
      const argument = this.parseUnary(noIn);
      return this.node('UnaryExpression', start, { operator, argument, prefix: true });
    }
    if (this.isKind('id') && this.text() === 'await') {
      this.advance();
      const argument = this.parseUnary(noIn);
      return this.node('AwaitExpression', start, { argument });
    }
    if (this.isKind('p') && (this.text() === '++' || this.text() === '--')) {
      const operator = this.advance().text;
      const argument = this.parseUnary(noIn);
      return this.node('UpdateExpression', start, { operator, argument, prefix: true });
    }
    return this.parsePostfix(noIn);
  }

  parsePostfix(noIn) {
    const start = this.tok().start;
    let expr = this.parseCallNewMember(noIn);
    if (this.isKind('p') && (this.is('++') || this.is('--'))) {
      const operator = this.advance().text;
      expr = this.node('UpdateExpression', start, { operator, argument: expr, prefix: false });
    }
    return expr;
  }

  parseNew() {
    const start = this.tok().start;
    this.advance(); // 'new'
    if (this.isKind('id') && this.text() === 'new') this.fail('new.target is not supported');
    let callee = this.parseMemberOnly(this.parsePrimary());
    let args = [];
    if (this.is('(')) args = this.parseArgs();
    let expr = this.node('NewExpression', start, { callee, arguments: args });
    return this.parseCallTail(expr, start);
  }

  parseMemberOnly(expr) {
    for (;;) {
      if (this.eat('.')) {
        if (!this.isKind('id')) this.fail('Expected a property name after .');
        const property = { type: 'Identifier', name: this.advance().text };
        expr = { type: 'MemberExpression', object: expr, property, computed: false, optional: false };
      } else if (this.eat('[')) {
        const property = this.parseExpression();
        this.expect(']');
        expr = { type: 'MemberExpression', object: expr, property, computed: true, optional: false };
      } else break;
    }
    return expr;
  }

  parseCallNewMember(noIn) {
    const start = this.tok().start;
    if (this.isKind('id') && this.text() === 'new') return this.parseNew();
    let expr = this.parsePrimary(noIn);
    return this.parseCallTail(expr, start);
  }

  parseCallTail(expr, start) {
    for (;;) {
      if (this.eat('.')) {
        if (!this.isKind('id')) this.fail('Expected a property name after .');
        const property = { type: 'Identifier', name: this.advance().text };
        expr = this.node('MemberExpression', start, { object: expr, property, computed: false, optional: false });
      } else if (this.eat('?.')) {
        if (this.is('(')) { expr = this.node('CallExpression', start, { callee: expr, arguments: this.parseArgs(), optional: true }); }
        else if (this.eat('[')) { const property = this.parseExpression(); this.expect(']'); expr = this.node('MemberExpression', start, { object: expr, property, computed: true, optional: true }); }
        else { if (!this.isKind('id')) this.fail('Expected a property name after ?.'); const property = { type: 'Identifier', name: this.advance().text }; expr = this.node('MemberExpression', start, { object: expr, property, computed: false, optional: true }); }
      } else if (this.eat('[')) {
        const property = this.parseExpression();
        this.expect(']');
        expr = this.node('MemberExpression', start, { object: expr, property, computed: true, optional: false });
      } else if (this.is('(')) {
        expr = this.node('CallExpression', start, { callee: expr, arguments: this.parseArgs(), optional: false });
      } else if (this.isKind('str') && /^`/.test(this.text())) {
        const quasi = { type: 'TemplateLiteral', raw: this.advance().text };
        expr = this.node('TaggedTemplateExpression', start, { tag: expr, quasi });
      } else break;
    }
    return expr;
  }

  parseArgs() {
    this.expect('(');
    const args = [];
    while (!this.is(')')) {
      if (this.eat('...')) args.push(this.node('SpreadElement', this.tok().start, { argument: this.parseAssignExpr() }));
      else args.push(this.parseAssignExpr());
      if (!this.is(')')) this.expect(',');
    }
    this.expect(')');
    return args;
  }

  parsePrimary() {
    const start = this.tok().start;
    const t = this.tok();
    if (t.kind === 'num') { this.advance(); return this.node('Literal', start, { value: parseNumericLiteral(t.text), raw: t.text }); }
    if (t.kind === 'str') {
      this.advance();
      if (t.text[0] === '`') return this.node('TemplateLiteral', start, { raw: t.text });
      return this.node('Literal', start, { value: parseStringLiteral(t.text), raw: t.text });
    }
    if (t.kind === 're') { this.advance(); const li = t.text.lastIndexOf('/'); return this.node('Literal', start, { raw: t.text, regex: { pattern: t.text.slice(1, li), flags: t.text.slice(li + 1) } }); }
    if (t.kind === 'id') {
      if (t.text === 'true' || t.text === 'false') { this.advance(); return this.node('Literal', start, { value: t.text === 'true', raw: t.text }); }
      if (t.text === 'null') { this.advance(); return this.node('Literal', start, { value: null, raw: 'null' }); }
      if (t.text === 'this') { this.advance(); return this.node('ThisExpression', start, {}); }
      if (t.text === 'super') { this.advance(); return this.node('Super', start, {}); }
      if (t.text === 'function') return this.parseFunction(false, false);
      if (t.text === 'async' && this.is('function', 1)) { this.advance(); return this.parseFunction(false, true); }
      if (t.text === 'class') return this.parseClass(false);
      if (t.text === 'yield') this.fail('Generators / yield are not supported');
      this.advance();
      return this.node('Identifier', start, { name: t.text });
    }
    if (this.eat('(')) {
      const expr = this.parseExpression();
      this.expect(')');
      return expr;
    }
    if (this.eat('[')) return this.parseArrayLiteral(start);
    if (this.eat('{')) return this.parseObjectLiteral(start);
    this.fail('Unexpected token');
    return null;
  }

  parseArrayLiteral(start) {
    const elements = [];
    while (!this.is(']')) {
      if (this.is(',')) { elements.push(null); this.advance(); continue; }
      if (this.eat('...')) elements.push(this.node('SpreadElement', this.tok().start, { argument: this.parseAssignExpr() }));
      else elements.push(this.parseAssignExpr());
      if (!this.is(']')) { if (!this.eat(',')) break; }
    }
    this.expect(']');
    return this.node('ArrayExpression', start, { elements });
  }

  parseObjectLiteral(start) {
    const properties = [];
    while (!this.is('}')) {
      const pStart = this.tok().start;
      if (this.eat('...')) { properties.push(this.node('SpreadElement', pStart, { argument: this.parseAssignExpr() })); if (!this.is('}')) this.expect(','); continue; }
      let kind = 'init', isMethod = false;
      if (this.isKind('id') && (this.is('get') || this.is('set')) && !this.is(':', 1) && !this.is(',', 1) && !this.is('(', 1) && !this.is('}', 1)) {
        kind = this.advance().text;
      }
      let computed = false, key;
      if (this.eat('[')) { computed = true; key = this.parseAssignExpr(); this.expect(']'); }
      else if (this.isKind('str')) { key = this.node('Literal', this.tok().start, { value: parseStringLiteral(this.text()), raw: this.text() }); this.advance(); }
      else if (this.isKind('num')) { key = this.node('Literal', this.tok().start, { value: parseNumericLiteral(this.text()), raw: this.text() }); this.advance(); }
      else if (this.isKind('id')) { key = { type: 'Identifier', name: this.advance().text }; }
      else this.fail('Expected a property key');

      if (this.is('(')) {
        isMethod = true;
        const params = this.parseParamList();
        const body = this.parseBlock();
        const value = { type: 'FunctionExpression', id: null, params, body, async: false, generator: false };
        properties.push(this.node('Property', pStart, { key, value, kind: kind === 'init' ? 'init' : kind, method: kind === 'init', computed, shorthand: false }));
      } else if (this.eat(':')) {
        const value = this.parseAssignExpr();
        properties.push(this.node('Property', pStart, { key, value, kind: 'init', method: false, computed, shorthand: false }));
      } else {
        if (computed || key.type === 'Literal') this.fail('Expected \':\' after property key');
        properties.push(this.node('Property', pStart, { key, value: key, kind: 'init', method: false, computed: false, shorthand: true }));
      }
      if (!this.is('}')) { if (!this.eat(',')) break; }
    }
    this.expect('}');
    return this.node('ObjectExpression', start, { properties });
  }

  parseLeftHandSide() { return this.parseCallNewMember(false); }
}

function buildPrecedenceChain(ParserProto) {
  const levels = [
    ['parseLogicalOr', 'parseLogicalAnd', ['||']],
    ['parseLogicalAnd', 'parseBitOr', ['&&']],
    ['parseBitOr', 'parseBitXor', ['|']],
    ['parseBitXor', 'parseBitAnd', ['^']],
    ['parseBitAnd', 'parseEqualityImpl', ['&']],
    ['parseEqualityImpl', 'parseRelational', ['==', '!=', '===', '!==']],
    ['parseRelational', 'parseShift', ['<', '>', '<=', '>=', 'instanceof', 'in']],
    ['parseShift', 'parseAdditive', ['<<', '>>', '>>>']],
    ['parseAdditive', 'parseMultiplicative', ['+', '-']],
    ['parseMultiplicative', 'parseExponent', ['*', '/', '%']],
  ];
  for (const [name, nextName, ops] of levels) {
    ParserProto[name] = function (noIn) {
      const start = this.tok().start;
      let left = this[nextName](noIn);
      while ((this.isKind('p') && ops.includes(this.text())) || (this.isKind('id') && ops.includes(this.text()) && !(noIn && this.text() === 'in'))) {
        const operator = this.advance().text;
        const right = this[nextName](noIn);
        const type = (operator === '||' || operator === '&&') ? 'LogicalExpression' : 'BinaryExpression';
        left = this.node(type, start, { operator, left, right });
      }
      return left;
    };
  }
  ParserProto.parseExponent = function (noIn) {
    const start = this.tok().start;
    const left = this.parseUnary(noIn);
    if (this.is('**')) { this.advance(); const right = this.parseExponent(noIn); return this.node('BinaryExpression', start, { operator: '**', left, right }); }
    return left;
  };
  ParserProto._equality = ParserProto.parseEqualityImpl;
  ParserProto._nullish = function (noIn) {
    const start = this.tok().start;
    let left = this.parseLogicalOr(noIn);
    while (this.is('??')) { this.advance(); const right = this.parseLogicalOr(noIn); left = this.node('LogicalExpression', start, { operator: '??', left, right }); }
    return left;
  };
}
buildPrecedenceChain(Parser.prototype);

function parseNumericLiteral(text) {
  const n = Number(text.replace(/_/g, '').replace(/n$/, ''));
  return Number.isNaN(n) ? text : n;
}
function parseStringLiteral(text) {
  const q = text[0];
  const inner = text.slice(1, -1);
  return inner.replace(/\\(.)/g, (m, c) => ({ n: '\n', t: '\t', r: '\r', '\\': '\\', "'": "'", '"': '"', '0': '\0' }[c] ?? c));
}

function parse(src, opts) {
  const p = new Parser(src, opts);
  return p.parseProgram();
}

module('JavaScript Parser',
  'Parses JavaScript into an ESTree-shaped Abstract Syntax Tree (JSON), using a hand-written parser over a practical subset of the language rather than a vendored full parser. See the comment at the top of javascript_parser.js for exactly what is and is not supported (no destructuring, generators, import/export, JSX, decorators, or template-literal interpolation parsing; no ASI beyond simple block/EOF boundaries). Throws a descriptive error with line/column on anything outside that subset.',
  [A.boolean('Include location info', false), A.boolean('Include comments array', false)],
  (t, loc, comments) => {
    const ast = parse(t, { loc, comments });
    return JSON.stringify(ast, null, 2);
  },
  { text: true }
);
