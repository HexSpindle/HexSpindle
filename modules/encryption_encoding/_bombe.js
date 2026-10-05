import { Rotor, Plugboard, a2i, i2a, mod } from './_enigma_lib.js';

class CopyRotor extends Rotor {
  copy() {
    return {
      map: this.map,
      revMap: this.revMap,
      pos: this.pos,
      step: this.step,
      transform: this.transform,
      revTransform: this.revTransform,
    };
  }
}

class Node {
  constructor(letter) {
    this.letter = letter;
    this.edges = new Set();
    this.visited = false;
  }
}

class Edge {
  constructor(pos, node1, node2) {
    this.pos = pos;
    this.node1 = node1;
    this.node2 = node2;
    node1.edges.add(this);
    node2.edges.add(this);
    this.visited = false;
  }
  getOther(node) { return this.node1 === node ? this.node2 : this.node1; }
}

class SharedScrambler {
  constructor(rotors, reflector) {
    this.lowerCache = new Array(26);
    this.higherCache = new Array(26);
    for (let i = 0; i < 26; i++) this.higherCache[i] = new Array(26);
    this.changeRotors(rotors, reflector);
  }
  changeRotors(rotors, reflector) {
    this.reflector = reflector;
    this.rotors = rotors;
    this.rotorsRev = [].concat(rotors).reverse();
    this.cacheGen();
  }
  step(n) {
    for (let i = 0; i < n - 1; i++) this.rotors[i].step();
    this.cacheGen();
  }
  cacheGen() {
    for (let i = 0; i < 26; i++) {
      this.lowerCache[i] = undefined;
      for (let j = 0; j < 26; j++) this.higherCache[i][j] = undefined;
    }
    for (let i = 0; i < 26; i++) {
      if (this.lowerCache[i] !== undefined) continue;
      let letter = i;
      for (const rotor of this.rotors) letter = rotor.transform(letter);
      letter = this.reflector.transform(letter);
      for (const rotor of this.rotorsRev) letter = rotor.revTransform(letter);
      this.lowerCache[i] = letter;
      this.lowerCache[letter] = i;
    }
  }
  transform(i) { return this.lowerCache[i]; }
}

class Scrambler {
  constructor(base, rotor, pos, end1, end2) {
    this.baseScrambler = base;
    this.initialPos = pos;
    this.changeRotor(rotor);
    this.end1 = end1;
    this.end2 = end2;
    this.cache = this.baseScrambler.higherCache[pos];
  }
  changeRotor(rotor) {
    this.rotor = rotor;
    this.rotor.pos += this.initialPos;
  }
  step() {
    this.rotor.step();
    this.cache = this.baseScrambler.higherCache[this.rotor.pos];
  }
  transform(i) {
    const cached = this.cache[i];
    if (cached !== undefined) return cached;
    let letter = this.rotor.transform(i);
    letter = this.baseScrambler.transform(letter);
    letter = this.rotor.revTransform(letter);
    this.cache[i] = letter;
    this.cache[letter] = i;
    return letter;
  }
  getOtherEnd(end) { return this.end1 === end ? this.end2 : this.end1; }
  getPos() {
    let result = '';
    let pos = mod(this.rotor.pos - 1, 26);
    result += i2a(pos);
    for (let i = 0; i < this.baseScrambler.rotors.length; i++) {
      pos = this.baseScrambler.rotors[i].pos;
      result += i2a(pos);
    }
    return result.split('').reverse().join('');
  }
}

export class BombeMachine {
  /**
   * @param {string[]} rotors - rotor wiring strings (no step points), fast-to-slow order
   * @param {Object} reflector - a Reflector
   * @param {string} ciphertext
   * @param {string} crib
   * @param {boolean} check - whether to use the checking machine
   * @param {function} [update] - optional progress callback (nLoops, nStops, progress)
   */
  constructor(rotors, reflector, ciphertext, crib, check, update = undefined) {
    if (ciphertext.length < crib.length) throw new Error('Crib overruns supplied ciphertext');
    if (crib.length < 2) throw new Error('Crib is too short');
    if (crib.length > 25) throw new Error('Crib is too long');
    for (let i = 0; i < crib.length; i++) {
      if (ciphertext[i] === crib[i]) throw new Error(`Invalid crib: character ${ciphertext[i]} at pos ${i} in both ciphertext and crib`);
    }
    this.ciphertext = ciphertext;
    this.crib = crib;
    this.initRotors(rotors);
    this.check = check;
    this.updateFn = update;

    const [mostConnected, edges] = this.makeMenu();

    this.wires = new Array(26 * 26);
    this.scramblers = [];
    for (let i = 0; i < 26; i++) this.scramblers.push([]);
    this.sharedScrambler = new SharedScrambler(this.baseRotors.slice(1), reflector);
    this.allScramblers = [];
    this.indicator = undefined;
    for (const edge of edges) {
      const cRotor = this.baseRotors[0].copy();
      const end1 = a2i(edge.node1.letter);
      const end2 = a2i(edge.node2.letter);
      const scrambler = new Scrambler(this.sharedScrambler, cRotor, edge.pos, end1, end2);
      if (edge.pos === 0) this.indicator = scrambler;
      this.scramblers[end1].push(scrambler);
      this.scramblers[end2].push(scrambler);
      this.allScramblers.push(scrambler);
    }
    if (this.indicator === undefined) {
      this.indicator = new Scrambler(this.sharedScrambler, this.baseRotors[0].copy(), 0, undefined, undefined);
      this.allScramblers.push(this.indicator);
    }

    this.testRegister = a2i(mostConnected.letter);
    for (const edge of mostConnected.edges) {
      this.testInput = [this.testRegister, a2i(edge.getOther(mostConnected).letter)];
      break;
    }
  }

  initRotors(rotors) {
    this.baseRotors = [];
    for (const rstr of rotors) this.baseRotors.push(new CopyRotor(rstr, '', 'A', 'A'));
  }

  changeRotors(rotors, reflector) {
    this.initRotors(rotors);
    this.sharedScrambler.changeRotors(this.baseRotors.slice(1), reflector);
    for (const scrambler of this.allScramblers) scrambler.changeRotor(this.baseRotors[0].copy());
  }

  update(...msg) {
    if (this.updateFn !== undefined) this.updateFn(...msg);
  }

  dfs(node) {
    let loops = 0;
    let nNodes = 1;
    let mostConnected = node;
    let nConnections = mostConnected.edges.size;
    let edges = new Set();
    node.visited = true;
    for (const edge of node.edges) {
      if (edge.visited) continue;
      edge.visited = true;
      edges.add(edge);
      const other = edge.getOther(node);
      if (other.visited) { loops += 1; continue; }
      const [oLoops, oNNodes, oMostConnected, oNConnections, oEdges] = this.dfs(other);
      loops += oLoops;
      nNodes += oNNodes;
      edges = new Set([...edges, ...oEdges]);
      if (oNConnections > nConnections) { mostConnected = oMostConnected; nConnections = oNConnections; }
    }
    return [loops, nNodes, mostConnected, nConnections, edges];
  }

  makeMenu() {
    const nodes = new Map();
    for (const c of this.ciphertext + this.crib) {
      if (!nodes.has(c)) nodes.set(c, new Node(c));
    }
    for (let i = 0; i < this.crib.length; i++) {
      const a = this.crib[i];
      const b = this.ciphertext[i];
      new Edge(i, nodes.get(a), nodes.get(b));
    }
    const graphs = [];
    for (const start of nodes.keys()) {
      if (nodes.get(start).visited) continue;
      graphs.push(this.dfs(nodes.get(start)));
    }
    graphs.sort((a, b) => {
      let result = b[0] - a[0];
      if (result === 0) result = b[1] - a[1];
      return result;
    });
    this.nLoops = graphs[0][0];
    return [graphs[0][2], graphs[0][4]];
  }

  energise(i, j) {
    const idx = 26 * i + j;
    if (this.wires[idx]) return;
    this.wires[idx] = true;
    const idxPair = 26 * j + i;
    this.wires[idxPair] = true;
    if (i === this.testRegister || j === this.testRegister) {
      this.energiseCount++;
      if (this.energiseCount === 26) return;
    }
    for (let k = 0; k < this.scramblers[i].length; k++) {
      const scrambler = this.scramblers[i][k];
      const out = scrambler.transform(j);
      const other = scrambler.getOtherEnd(i);
      const otherIdx = 26 * other + out;
      if (!this.wires[otherIdx]) {
        this.energise(other, out);
        if (this.energiseCount === 26) return;
      }
    }
    if (i === j) return;
    for (let k = 0; k < this.scramblers[j].length; k++) {
      const scrambler = this.scramblers[j][k];
      const out = scrambler.transform(i);
      const other = scrambler.getOtherEnd(j);
      const otherIdx = 26 * other + out;
      if (!this.wires[otherIdx]) {
        this.energise(other, out);
        if (this.energiseCount === 26) return;
      }
    }
  }

  tryDecrypt(stecker) {
    const fastRotor = this.indicator.rotor;
    const initialPos = fastRotor.pos;
    const res = [];
    const plugboard = new Plugboard(stecker);
    for (let i = 0; i < Math.min(26, this.ciphertext.length); i++) {
      const t = this.indicator.transform(plugboard.transform(a2i(this.ciphertext[i])));
      res.push(i2a(plugboard.transform(t)));
      this.indicator.step(1);
    }
    fastRotor.pos = initialPos;
    return res.join('');
  }

  formatPair(a, b) {
    if (a < b) return `${i2a(a)}${i2a(b)}`;
    return `${i2a(b)}${i2a(a)}`;
  }

  checkingMachine(pair) {
    if (pair !== this.testInput[1]) {
      for (let i = 0; i < this.wires.length; i++) this.wires[i] = false;
      this.energiseCount = 0;
      this.energise(this.testRegister, pair);
    }
    const results = new Set();
    results.add(this.formatPair(this.testRegister, pair));
    for (let i = 0; i < 26; i++) {
      let count = 0;
      let other;
      for (let j = 0; j < 26; j++) {
        if (this.wires[i * 26 + j]) { count++; other = j; }
      }
      if (count > 1) return '';
      else if (count === 0) continue;
      results.add(this.formatPair(i, other));
    }
    return [...results].join(' ');
  }

  checkStop() {
    const count = this.energiseCount;
    if (count === 26) return undefined;
    let steckerPair;
    if (count === 25) {
      for (let j = 0; j < 26; j++) {
        if (!this.wires[26 * this.testRegister + j]) { steckerPair = j; break; }
      }
    } else if (count === 1) {
      steckerPair = this.testInput[1];
    } else {
      if (!this.check) return [this.indicator.getPos(), '??', this.tryDecrypt('')];
      let stecker;
      for (let i = 0; i < 26; i++) {
        const newStecker = this.checkingMachine(i);
        if (newStecker !== '') {
          if (stecker !== undefined) return [this.indicator.getPos(), '??', this.tryDecrypt('')];
          stecker = newStecker;
        }
      }
      if (stecker === undefined) return undefined;
      return [this.indicator.getPos(), stecker, this.tryDecrypt(stecker)];
    }
    let stecker;
    if (this.check) {
      stecker = this.checkingMachine(steckerPair);
      if (stecker === '') return undefined;
    } else {
      stecker = `${i2a(this.testRegister)}${i2a(steckerPair)}`;
    }
    const testDecrypt = this.tryDecrypt(stecker);
    return [this.indicator.getPos(), stecker, testDecrypt];
  }

  run() {
    let stops = 0;
    const result = [];
    const nChecks = Math.pow(26, this.baseRotors.length);
    for (let i = 1; i <= nChecks; i++) {
      for (let k = 0; k < this.wires.length; k++) this.wires[k] = false;
      this.energiseCount = 0;
      this.energise(...this.testInput);

      const stop = this.checkStop();
      if (stop !== undefined) { stops++; result.push(stop); }

      let n = 1;
      for (let j = 1; j < this.baseRotors.length; j++) {
        if ((i % Math.pow(26, j)) === 0) n++;
        else break;
      }
      if (n > 1) this.sharedScrambler.step(n);
      for (const scrambler of this.allScramblers) scrambler.step();

      if (n > 3) this.update(this.nLoops, stops, i / nChecks);
    }
    return result;
  }
}
