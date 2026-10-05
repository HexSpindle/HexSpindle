import { module } from './_cat.js';
import { A } from '../../core/registry.js';

let yaraPromise = null;
function getYara() {
  if (!yaraPromise) yaraPromise = import('./_libyara.mjs').then((m) => m.default());
  return yaraPromise;
}

module('YARA Rules',
  'Matches YARA rules against the input bytes using the real libyara engine (compiled to WebAssembly, running entirely offline). See the rule syntax at yara.readthedocs.io. Not supported: the pe/elf/math/hash/cuckoo modules.',
  [
    A.area('Rules', 'rule example {\n    strings:\n        $a = "example"\n    condition:\n        $a\n}'),
    A.boolean('Show strings', false),
    A.boolean('Show string lengths', false),
    A.boolean('Show metadata', false),
    A.boolean('Show counts', true),
    A.boolean('Show rule warnings', true),
  ],
  async (data, rulesSrc, showStrings, showLengths, showMeta, showCounts, showWarnings) => {
    const yara = await getYara();
    const resp = yara.run(data, rulesSrc);
    let out = '';

    const nErrors = resp.compileErrors.size();
    for (let i = 0; i < nErrors; i++) {
      const err = resp.compileErrors.get(i);
      if (!err.warning) throw new Error(`Error on line ${err.lineNumber}: ${err.message}`);
      if (showWarnings) out += `Warning on line ${err.lineNumber}: ${err.message}\n`;
    }

    const rules = resp.matchedRules;
    const nRules = rules.size();
    for (let i = 0; i < nRules; i++) {
      const rule = rules.get(i);
      const matches = rule.resolvedMatches;
      const nMatches = matches.size();

      let meta = '';
      if (showMeta && rule.metadata.size() > 0) {
        const parts = [];
        for (let j = 0; j < rule.metadata.size(); j++) {
          const m = rule.metadata.get(j);
          parts.push(`${m.identifier}: ${m.data}`);
        }
        meta = ` [${parts.join(', ')}]`;
      }
      const countStr = nMatches === 0 ? '' : (showCounts ? ` (${nMatches} time${nMatches > 1 ? 's' : ''})` : '');

      if (nMatches === 0 || !(showStrings || showLengths)) {
        out += `Input matches rule "${rule.ruleName}"${meta}${countStr}.\n`;
      } else {
        out += `Rule "${rule.ruleName}"${meta} matches${countStr}:\n`;
        for (let j = 0; j < nMatches; j++) {
          const m = matches.get(j);
          out += `Pos ${m.location}, ${showLengths ? `length ${m.matchLength}, ` : ''}identifier ${m.stringIdentifier}${showStrings ? `, data: "${m.data}"` : ''}\n`;
        }
      }
    }

    if (!nRules && !nErrors) return 'No rules matched.';
    return out || 'No rules matched.';
  }
);
