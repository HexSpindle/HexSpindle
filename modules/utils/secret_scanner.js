import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const RULES = [
  ['AWS Access Key ID', '\\b(?:AKIA|ASIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASCA)[A-Z0-9]{16}\\b'],
  ["AWS Secret Access Key (near 'secret')", "(?i)aws(.{0,20})?(?:secret|private)[_-]?(?:access)?[_-]?key(.{0,5})?[\"'=:\\s]+([A-Za-z0-9/+=]{40})"],
  ['GitHub token', '\\bgh[pousr]_[A-Za-z0-9]{36,255}\\b'],
  ['GitHub fine-grained PAT', '\\bgithub_pat_[A-Za-z0-9_]{22,255}\\b'],
  ['Slack token', '\\bxox[baprs]-[A-Za-z0-9-]{10,72}\\b'],
  ['Slack webhook', 'https://hooks\\.slack\\.com/services/[A-Za-z0-9/]{20,}'],
  ['Google API key', '\\bAIza[0-9A-Za-z\\-_]{35}\\b'],
  ['Stripe key', '\\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{10,99}\\b'],
  ['Private key block', '-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY(?: BLOCK)?-----'],
  ['JWT', '\\bey[A-Za-z0-9_-]{10,}\\.ey[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\b'],
  ['Generic API key assignment', "(?i)\\b(?:api[_-]?key|apikey|access[_-]?token|auth[_-]?token|secret[_-]?key|client[_-]?secret)\\b\\s*[\"'=:]+\\s*[\"']?([A-Za-z0-9_\\-./+=]{12,100})"],
  ['Password in URL', '[a-zA-Z][a-zA-Z0-9+.\\-]*://[^/\\s:@]+:([^/\\s:@]{3,})@'],
  ['Hardcoded password assignment', "(?i)\\b(?:password|passwd|pwd)\\b\\s*[\"'=:]+\\s*[\"']?([^\\s\"'<>]{4,64})"],
  ['Azure connection string', 'DefaultEndpointsProtocol=https?;AccountName=[^;]+;AccountKey=[A-Za-z0-9+/=]{20,}'],
  ['Discord bot token', '\\b[MN][A-Za-z\\d_-]{23,25}\\.[A-Za-z\\d_-]{6}\\.[A-Za-z\\d_-]{27,38}\\b'],
  ['NPM token', '\\bnpm_[A-Za-z0-9]{36}\\b'],
  ['Basic auth header', '(?i)Authorization:\\s*Basic\\s+[A-Za-z0-9+/=]{10,}'],
  ['Bearer token header', '(?i)Authorization:\\s*Bearer\\s+[A-Za-z0-9_\\-.=]{10,}'],
];

function compile(pattern) {
  let flags = 'g', p = pattern;
  if (p.startsWith('(?i)')) { flags += 'i'; p = p.slice(4); }
  return new RegExp(p, flags);
}

module('Secret Scanner', 'Scans text (source code, config, logs) for likely API keys, tokens, private keys and hardcoded credentials. A triage aid for finding secrets accidentally committed to a repo - expect some false positives.',
  [A.boolean('Mask found secrets in the report', true), A.number('Context characters', 20, 0, 200)],
  (t, mask, ctx) => {
    const lines = t.split('\n');
    const offsets = []; let pos = 0;
    for (const l of lines) { offsets.push(pos); pos += l.length + 1; }
    const findings = [];
    for (const [name, pattern] of RULES) {
      const re = compile(pattern);
      let m;
      while ((m = re.exec(t)) !== null) {
        let lineNo = 1;
        for (let i = 0; i < offsets.length; i++) { if (offsets[i] <= m.index) lineNo = i + 1; else break; }
        const val = m.length > 1 ? (m[1] ?? '') : m[0];
        const shown = mask ? (val.length > 10 ? val.slice(0, 4) + '…' + val.slice(-4) : '***') : val;
        const s = Math.max(0, m.index - ctx), e = Math.min(t.length, m.index + m[0].length + ctx);
        let snippet = t.slice(s, e).replace(/\n/g, ' ');
        if (mask) snippet = snippet.split(val).join(shown);
        findings.push([lineNo, name, shown, snippet]);
        if (m[0].length === 0) re.lastIndex++;
      }
    }
    if (!findings.length) return 'No likely secrets found (note: this is a pattern-based triage aid, not a guarantee).';
    findings.sort((a, b) => {
      for (let i = 0; i < 4; i++) { if (a[i] < b[i]) return -1; if (a[i] > b[i]) return 1; }
      return 0;
    });
    const out = [`${findings.length} potential secret(s) found:\n`];
    for (const [lineNo, name, shown, snippet] of findings) {
      out.push(`Line ${lineNo}: ${name}`);
      out.push(`  Value: ${shown}`);
      out.push(`  Context: …${snippet}…`);
      out.push('');
    }
    return out.join('\n').replace(/\s+$/, '');
  }, { text: true });
