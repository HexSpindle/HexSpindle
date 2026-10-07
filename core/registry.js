export const MODULES = {};

export const CATEGORY_LABELS = {
  data_format: 'Data format',
  encryption_encoding: 'Encryption / Encoding',
  public_key: 'Public Key',
  arithmetic_logic: 'Arithmetic / Logic',
  networking: 'Networking',
  language: 'Language',
  utils: 'Utils',
  date_time: 'Date / Time',
  extractors: 'Extractors',
  compression: 'Compression',
  hashing: 'Hashing',
  code_tidy: 'Code tidy',
  forensics: 'Forensics',
  multimedia: 'Multimedia',
  other: 'Other',
  flow_control: 'Flow control',
};

export class Html extends String {}

// Lets an operation expose one normal display value while also passing structured
// data to the engine when the operation participates in a parallel enrichment group.
export class StructuredResult {
  constructor(output, mergeData = null) {
    this.output = output;
    this.mergeData = mergeData;
  }
}

export function register(name, desc, args, fn, opts = {}) {
  MODULES[name] = {
    name, desc, args: args || [], func: fn,
    text: !!opts.text, flow: !!opts.flow, net: !!opts.net, nondeterministic: !!opts.nondeterministic,
    parallelSafe: !!opts.parallelSafe,
    parallelGroup: opts.parallelGroup || '',
    parallelProvider: opts.parallelProvider || '',
    connection: opts.connection || null,
    category: opts.category || 'other', aliases: opts.aliases || [],
  };
}

export function describe(m) {
  return {
    name: m.name, category: m.category, categoryLabel: CATEGORY_LABELS[m.category] || m.category,
    desc: m.desc, args: m.args, flow: m.flow, text: m.text, aliases: m.aliases, net: m.net,
    nondeterministic: m.nondeterministic, parallelSafe: m.parallelSafe, parallelGroup: m.parallelGroup,
    parallelProvider: m.parallelProvider, connection: m.connection,
  };
}

export const TOGGLE_ENCODINGS = ['Hex', 'UTF8', 'Latin1', 'Base64', 'Decimal', 'Binary'];

export const A = {
  string: (name, value = '', hint = '') => ({ name, type: 'string', value, hint }),
  area: (name, value = '', hint = '') => ({ name, type: 'area', value, hint }),
  regex: (name, value = '', hint = '') => ({ name, type: 'regex', value, hint }),
  number: (name, value = 0, min = null, max = null, step = 1) => ({ name, type: 'number', value, min, max, step }),
  boolean: (name, value = false) => ({ name, type: 'boolean', value }),
  files: (name, accept = '', multiple = true, hint = '') => ({ name, type: 'files', value: '', accept, multiple, hint }),
  select: (name, options, value = null) => {
    options = options.map(o =>
      typeof o === 'string'
        ? o
        : { label: o.label, options: [...o.options] }
    );

    let first = '';
    for (const o of options) {
      if (typeof o === 'string') {
        first = o;
        break;
      }
      if (o.options?.length) {
        first = o.options[0];
        break;
      }
    }

    return {
      name,
      type: 'select',
      options,
      value: value ?? first,
    };
  },
  combo: (name, presets, value = null) => { presets = presets.map(p => [...p]); return { name, type: 'combo', presets, value: value ?? presets[0][1] }; },
  toggle: (name, value = '', options = null, option = null) => { options = options || TOGGLE_ENCODINGS; return { name, type: 'toggle', value, options, option: option || options[0] }; },
};

export function makeModule(category) {
  return (name, desc, args, fn, opts = {}) => register(name, desc, args, fn, { ...opts, category });
}
