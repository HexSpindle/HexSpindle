import { module } from './_cat.js';

function genericBeautify(input) {
  const preserved = [];
  let code = input, t = 0, m;
  const preserve = (rx) => {
    while ((m = rx.exec(code))) {
      preserved[t] = m[0];
      code = code.substring(0, m.index) + '###preservedToken' + t + '###' + code.substring(m.index + m[0].length);
      t++;
      rx.lastIndex = m.index;
    }
  };
  preserve(/'([^'\\]|\\.)*'/g);
  preserve(/"([^"\\]|\\.)*"/g);
  preserve(/\/\/[^\n\r]*/g);
  preserve(/\/\*[\s\S]*?\*\//gm);
  preserve(/(^|\n)#[^\n\r#]+/g);
  preserve(/\/.*?[^\\]\/[gim]{0,3}/gi);

  code = code
    .replace(/;/g, ';\n')
    .replace(/{/g, '{\n')
    .replace(/}/g, '\n}\n')
    .replace(/\r/g, '')
    .replace(/^\s+/g, '')
    .replace(/\n\s+/g, '\n')
    .replace(/\s*$/g, '')
    .replace(/\n{/g, '{');

  let i = 0, level = 0;
  while (i < code.length) {
    if (code[i] === '{') level++;
    else if (code[i] === '\n' && i + 1 < code.length) {
      if (code[i + 1] === '}') level--;
      const indent = level >= 0 ? ' '.repeat(level * 4) : '';
      code = code.substring(0, i + 1) + indent + code.substring(i + 1);
      if (level > 0) i += level * 4;
    }
    i++;
  }

  code = code
    .replace(/\s*([!<>=+-/*]?)=\s*/g, ' $1= ')
    .replace(/\s*<([=]?)\s*/g, ' <$1 ')
    .replace(/\s*>([=]?)\s*/g, ' >$1 ')
    .replace(/([^+])\+([^+=])/g, '$1 + $2')
    .replace(/([^-])-([^-=])/g, '$1 - $2')
    .replace(/([^*])\*([^*=])/g, '$1 * $2')
    .replace(/([^/])\/([^/=])/g, '$1 / $2')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s*{/g, ' {')
    .replace(/}\n/g, '}\n\n')
    .replace(/(if|for|while|with|elif|elseif)\s*\(([^\n]*)\)\s*\n([^{])/gim, '$1 ($2)\n    $3')
    .replace(/(if|for|while|with|elif|elseif)\s*\(([^\n]*)\)([^{])/gim, '$1 ($2) $3')
    .replace(/else\s*\n([^{])/gim, 'else\n    $1')
    .replace(/else\s+([^{])/gim, 'else $1')
    .replace(/\s+;/g, ';')
    .replace(/\{\s+\}/g, '{}')
    .replace(/\[\s+\]/g, '[]')
    .replace(/}\s*(else|catch|except|finally|elif|elseif|else if)/gi, '} $1');

  const ptokens = /###preservedToken(\d+)###/g;
  while ((m = ptokens.exec(code))) {
    const ti = parseInt(m[1], 10);
    code = code.substring(0, m.index) + preserved[ti] + code.substring(m.index + m[0].length);
    ptokens.lastIndex = m.index;
  }
  return code;
}

module('Generic Code Beautify', 'Attempts to pretty print C-style languages such as C, C++, C#, Java, PHP, JavaScript etc. Not a parser: output is for reading only.', [],
  (t) => genericBeautify(t),
  { text: true }
);
