import { module } from './_cat.js';
import { A, Html } from '../../core/registry.js';

const LANGS = ["1c","abnf","accesslog","actionscript","ada","angelscript","apache","applescript","arcade","arduino","armasm","xml","asciidoc","aspectj","autohotkey","autoit","avrasm","awk","axapta","bash","basic","bnf","brainfuck","c","cal","capnproto","ceylon","clean","clojure","clojure-repl","cmake","coffeescript","coq","cos","cpp","crmsh","crystal","csharp","csp","css","d","markdown","dart","delphi","diff","django","dns","dockerfile","dos","dsconfig","dts","dust","ebnf","elixir","elm","ruby","erb","erlang-repl","erlang","excel","fix","flix","fortran","freedesktop","fsharp","gams","gauss","gcode","gherkin","glsl","gml","go","golo","gradle","graphql","groovy","haml","handlebars","haskell","haxe","hsp","http","hy","inform7","ini","irpf90","isbl","java","javascript","jboss-cli","json","julia","julia-repl","kotlin","lasso","latex","ldif","leaf","less","lisp","livecodeserver","livescript","llvm","lsl","lua","makefile","mathematica","matlab","maxima","mel","mercury","mipsasm","mizar","perl","mojolicious","monkey","moonscript","n1ql","nestedtext","nginx","nim","nix","node-repl","nsis","objectivec","ocaml","openscad","oxygene","parser3","pf","pgsql","php","php-template","plaintext","pony","powershell","processing","profile","prolog","properties","protobuf","puppet","purebasic","python","python-repl","q","qml","r","reasonml","rib","roboconf","routeros","rsl","ruleslanguage","rust","sas","scala","scheme","scilab","scss","shell","smali","smalltalk","sml","sqf","sql","stan","stata","step21","stylus","subunit","swift","taggerscript","yaml","tap","tcl","thrift","tp","twig","typescript","vala","vbnet","vbscript","vbscript-html","verilog","vhdl","vim","wasm","wren","x86asm","xl","xquery","zephir"];

// Language names used by older HexSpindle recipes.
const LEGACY = { 'JavaScript': 'javascript', 'JSON': 'json', 'CSS': 'css', 'XML / HTML': 'xml', 'SQL': 'sql' };

let hljsPromise = null;

module('Syntax highlighter', 'Adds syntax highlighting (highlight.js, HTML with hljs-* classes) to a range of source code languages, or auto-detects the language. Note that this will not indent the code - use one of the Beautify operations for that.',
  [A.select('Language', ['auto detect', ...LANGS])],
  async (t, lang) => {
    if (!hljsPromise) hljsPromise = import('./_highlight.mjs').then(m => m.default);
    const hljs = await hljsPromise;
    lang = LEGACY[lang] || lang;
    if (lang === 'auto detect') return new Html(hljs.highlightAuto(t).value);
    return new Html(hljs.highlight(t, { language: lang, ignoreIllegals: true }).value);
  }, { text: true }
);
