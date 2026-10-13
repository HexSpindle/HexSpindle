#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Builds the deployable site from the modular source tree. The source tree itself is never modified.
//
//   node build-site.mjs [--out <dir>]        (default: ../dist)
//
// * Everything app.js loads at startup (its static import graph) is bundled into HexSpindle.js.
// * Libraries that are only loaded on demand (dynamic imports) are copied byte-for-byte to the paths they
//   already have, so vendored code keeps its exact bytes, licence headers and replaceability.
// * A lazily loaded module that shares code with the startup graph cannot be copied (it would get a second
//   copy of that shared code, e.g. an empty operation registry), so it is emitted as a bundler chunk instead.
// The build fails rather than emit a site with an import it cannot account for.
import { build, version as esbuildVersion } from 'esbuild';
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { resolve, dirname, relative, join, sep, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ENTRY = 'app.js';
export const BUNDLE = 'HexSpindle.js';
export const NOTICES = 'HexSpindle.LICENSES.txt';
export const BUILD_INFO = 'build-info.json';
// Files and directories copied unchanged. index.html and app.js are generated (see below).
export const RELEASE_FILES = ['app.css', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'DATA_SOURCE_NOTICES.md', 'robots.txt', 'sitemap.xml', '.nojekyll', 'google8833fe62b3f6acca.html'];
export const RELEASE_DIRS = ['assets', 'licenses', 'analytics'];
// Modules allowed to read import.meta: bundling moves a module, so its own URL stops meaning what it did.
const IMPORT_META_ALLOWED = new Set(['modules/networking/_feed_mirror.js']);

const toPosix = p => p.split(sep).join('/');
const rel = abs => toPosix(relative(ROOT, abs));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const kb = n => `${(n / 1024).toFixed(1)} KB`;

const STATIC_IMPORT = /^\s*(?:import\s+(?!\()(?:(?:[^'";]*?\s+from\s*)?)|export\s+(?:[^'";]*?\s+from\s*))['"](\.{1,2}\/[^'"\r\n]+)['"]/gm;
const DYNAMIC_IMPORT = /\bimport\s*\(\s*['"](\.{1,2}\/[^'"\r\n]+)['"]\s*\)/g;

function scan(file) {
  const text = readFileSync(join(ROOT, file), 'utf8');
  const target = spec => posix.normalize(posix.join(posix.dirname(file), spec));
  return {
    statics: [...text.matchAll(STATIC_IMPORT)].map(m => target(m[1])),
    dynamics: [...text.matchAll(DYNAMIC_IMPORT)].map(m => target(m[1])),
    usesImportMeta: /\bimport\.meta\b/.test(text),
  };
}

// Files reachable from `entries` through static imports only.
function staticClosure(entries, cache) {
  const seen = new Set(), stack = [...entries];
  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    if (!existsSync(join(ROOT, file))) throw new Error(`Missing static import target: ${file}`);
    seen.add(file);
    if (!cache.has(file)) cache.set(file, scan(file));
    stack.push(...cache.get(file).statics);
  }
  return seen;
}

// Splits the module graph into what the bundler handles and what is copied verbatim.
export function planGraph(vendored = new Set()) {
  const cache = new Map();
  const bundled = staticClosure([ENTRY], cache);          // startup graph, grows with chunked lazy modules
  const verbatimRoots = new Set(), verbatim = new Set(), chunkRoots = new Set(), ignored = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const file of [...bundled, ...verbatim]) {
      for (const target of cache.get(file).dynamics) {
        if (bundled.has(target) || verbatimRoots.has(target)) continue;
        if (!existsSync(join(ROOT, target))) {
          // Vendored bundles sometimes carry a dead import of a file that was never part of the distribution.
          if (!vendored.has(file)) throw new Error(`Dynamic import of a missing file: ${file} -> ${target}`);
          if (!ignored.some(x => x.from === file && x.target === target)) ignored.push({ from: file, target });
          continue;
        }
        const closure = staticClosure([target], cache);
        changed = true;
        if ([...closure].some(f => bundled.has(f))) { chunkRoots.add(target); for (const f of closure) bundled.add(f); }
        else { verbatimRoots.add(target); for (const f of closure) verbatim.add(f); }
      }
    }
    // A file copied verbatim must not also be pulled into the bundle later (it would exist twice).
    for (const root of [...verbatimRoots]) {
      const closure = staticClosure([root], cache);
      if ([...closure].some(f => bundled.has(f))) {
        verbatimRoots.delete(root); chunkRoots.add(root);
        for (const f of closure) { verbatim.delete(f); bundled.add(f); }
        for (const other of verbatimRoots) for (const f of staticClosure([other], cache)) verbatim.add(f);
        changed = true;
      }
    }
  }
  for (const file of bundled) {
    if (cache.get(file).usesImportMeta && !IMPORT_META_ALLOWED.has(file))
      throw new Error(`${file} reads import.meta but would be bundled; its own URL changes when bundled. Resolve paths from document.baseURI instead, or add it to IMPORT_META_ALLOWED after review.`);
  }
  return { bundled, verbatimRoots, verbatim, chunkRoots, ignored };
}

// The leading comment block of a file (licence and attribution headers live there).
function leadingComment(text) {
  const m = /^(?:\s*(?:\/\*[\s\S]*?\*\/|\/\/[^\n]*\n))+/.exec(text);
  return m ? m[0].trim() : '';
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);
}

function prepareOutput(out) {
  if (out === ROOT || ROOT.startsWith(out + sep) || existsSync(join(out, '.git'))) throw new Error(`Refusing to build into ${out}`);
  if (existsSync(out)) {
    const entries = readdirSync(out);
    // Only ever delete a directory that is empty or that an earlier build of this script produced.
    if (entries.length && !existsSync(join(out, BUILD_INFO))) throw new Error(`${out} is not empty and was not produced by this build; choose another --out directory`);
    rmSync(out, { recursive: true, force: true });
  }
  mkdirSync(out, { recursive: true });
  // Marks the directory as ours from the start, so a build that fails part-way can simply be re-run.
  writeFileSync(join(out, BUILD_INFO), JSON.stringify({ name: 'HexSpindle', incomplete: true }) + '\n');
}

export async function buildSite(out) {
  const started = Date.now();
  const inventory = JSON.parse(readFileSync(join(ROOT, 'tools/vendor-inventory.json'), 'utf8')).components;
  const vendored = new Map(inventory.map(c => [c.path, c.licenseFiles]));
  const plan = planGraph(new Set(vendored.keys()));
  prepareOutput(out);

  const lazy = {
    name: 'hexspindle-verbatim-lazy',
    setup(b) {
      // All bundler output sits in the site root, so a root-relative "./modules/..." path is right from every chunk.
      b.onResolve({ filter: /^\.{1,2}\// }, args => {
        if (args.kind !== 'dynamic-import') return null;
        const target = rel(resolve(args.resolveDir, args.path));
        return plan.verbatimRoots.has(target) ? { path: './' + target, external: true } : null;
      });
    },
  };
  const result = await build({
    absWorkingDir: ROOT,
    entryPoints: { HexSpindle: join(ROOT, ENTRY) },
    outdir: out,
    bundle: true, format: 'esm', splitting: true, target: 'esnext', charset: 'utf8',
    chunkNames: 'HexSpindle.[name]-[hash]',
    // Whitespace and syntax are compacted; identifiers keep their names so stack traces and the shipped code stay readable.
    minifyWhitespace: true, minifySyntax: true, minifyIdentifiers: false,
    legalComments: 'inline',
    banner: { js: `/*! HexSpindle (MIT). Bundled from https://github.com/HexSpindle/HexSpindle. Third-party notices: ${NOTICES}, THIRD_PARTY_NOTICES.md, licenses/ */` },
    external: ['node:crypto'],
    plugins: [lazy], metafile: true, logLevel: 'silent',
  });
  if (result.warnings.length) throw new Error('esbuild reported warnings:\n' + result.warnings.map(w => `  ${w.location?.file || ''}: ${w.text}`).join('\n'));

  const outputs = Object.fromEntries(Object.entries(result.metafile.outputs).map(([file, info]) => [toPosix(relative(out, resolve(ROOT, file))), info]));
  const bundledInputs = new Set(Object.keys(result.metafile.inputs).map(toPosix));
  for (const file of bundledInputs) if (plan.verbatim.has(file)) throw new Error(`${file} was both bundled and marked for verbatim copy`);

  // Lazily loaded libraries and their own dependencies, exactly as they are in the source tree.
  for (const file of plan.verbatim) {
    mkdirSync(dirname(join(out, file)), { recursive: true });
    cpSync(join(ROOT, file), join(out, file));
  }
  for (const file of RELEASE_FILES) cpSync(join(ROOT, file), join(out, file));
  for (const dir of RELEASE_DIRS) cpSync(join(ROOT, dir), join(out, dir), { recursive: true });

  // Chunks the entry imports statically are preloaded so they download alongside it instead of after it.
  const preload = new Set(), pending = [BUNDLE];
  while (pending.length) {
    for (const imp of outputs[pending.pop()].imports) {
      const file = toPosix(relative(out, resolve(ROOT, imp.path)));
      if (imp.kind === 'import-statement' && !imp.external && !preload.has(file)) { preload.add(file); pending.push(file); }
    }
  }
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const scriptTag = `<script type="module" src="${ENTRY}"></script>`;
  if (html.split(scriptTag).length !== 2) throw new Error(`index.html must contain exactly one ${scriptTag}`);
  const stylesheet = '<link rel="stylesheet" href="app.css">';
  if (!html.includes(stylesheet)) throw new Error(`index.html must contain ${stylesheet}`);
  const preloads = [BUNDLE, ...[...preload].sort()].map(f => `<link rel="modulepreload" href="${f}">`).join('\n');
  writeFileSync(join(out, 'index.html'), html.replace(stylesheet, `${stylesheet}\n${preloads}`).replace(scriptTag, `<script type="module" src="${BUNDLE}"></script>`));
  // Pages caches index.html for ten minutes; a copy cached before this layout existed still asks for app.js.
  writeFileSync(join(out, ENTRY), `import './${BUNDLE}';\n`);

  const sections = [...vendored.keys()].filter(f => bundledInputs.has(f)).sort().map(file =>
    `${'-'.repeat(78)}\n${file}\nLicence texts: ${vendored.get(file).join(', ')}\n\n${leadingComment(readFileSync(join(ROOT, file), 'utf8')) || '(no header comment; see THIRD_PARTY_NOTICES.md)'}\n`);
  writeFileSync(join(out, NOTICES), [
    `Third-party code bundled into ${BUNDLE} and its HexSpindle.*.js chunks`,
    '',
    "HexSpindle's own code is MIT licensed (see LICENSE). The components below are compiled into the bundle;",
    'their original header comments are reproduced here because minification removes ordinary comments.',
    'Libraries loaded on demand are shipped unmodified under modules/ with their headers intact.',
    'Full attribution for every component: THIRD_PARTY_NOTICES.md. Licence texts: licenses/.',
    '', ...sections,
  ].join('\n'));

  // Every relative import in every shipped script must point at a file that is actually in the output.
  const problems = [];
  for (const file of Object.keys(outputs)) {
    const text = readFileSync(join(out, file), 'utf8');
    for (const m of text.matchAll(/\bimport\s*\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)|\bfrom\s*["'](\.{1,2}\/[^"']+)["']|\bimport\s*["'](\.{1,2}\/[^"']+)["']/g)) {
      const target = posix.normalize(posix.join(posix.dirname(file), m[1] || m[2] || m[3]));
      if (!existsSync(join(out, target))) problems.push(`${file} imports ${target}, which is not in the build`);
    }
  }
  for (const file of plan.verbatim) {
    const info = scan(file);
    for (const target of info.statics) if (!existsSync(join(out, target))) problems.push(`${file} (verbatim) imports ${target}, which is not in the build`);
    for (const target of info.dynamics) {
      if (!existsSync(join(out, target)) && !plan.ignored.some(x => x.from === file && x.target === target)) problems.push(`${file} (verbatim) lazily imports ${target}, which is not in the build`);
    }
  }
  const shipped = walk(out).map(f => toPosix(relative(out, f))).filter(f => f !== BUILD_INFO).sort();
  for (const file of shipped) if (/\.(?:map|pem|key|env|log|zip|bak|orig|patch)$/i.test(file)) problems.push(`${file} must not be deployed`);
  if (problems.length) throw new Error('Build verification failed:\n' + problems.map(p => '  ' + p).join('\n'));

  const files = shipped.map(file => { const bytes = readFileSync(join(out, file)); return { path: file, bytes: bytes.length, sha256: sha256(bytes) }; });
  const commit = process.env.GITHUB_SHA || '';
  writeFileSync(join(out, BUILD_INFO), JSON.stringify({ name: 'HexSpindle', sourceCommit: commit, esbuild: esbuildVersion, entry: BUNDLE,
    startup: [BUNDLE, ...[...preload].sort()], chunks: Object.keys(outputs).sort(), verbatimModules: plan.verbatim.size, files }, null, 2) + '\n');

  const startup = [BUNDLE, ...preload], size = f => statSync(join(out, f)).size, gz = f => gzipSync(readFileSync(join(out, f)), { level: 9 }).length;
  console.log(`Bundled ${bundledInputs.size} modules into ${Object.keys(outputs).length} files with esbuild ${esbuildVersion} in ${Date.now() - started} ms`);
  console.log(`  ${BUNDLE.padEnd(40)} ${kb(size(BUNDLE)).padStart(10)}  (${kb(gz(BUNDLE))} gzipped)`);
  for (const f of Object.keys(outputs).filter(f => f !== BUNDLE).sort()) console.log(`  ${f.padEnd(40)} ${kb(size(f)).padStart(10)}  ${preload.has(f) ? 'startup' : 'on demand'}`);
  console.log(`Startup scripts: ${startup.length} files, ${kb(startup.reduce((s, f) => s + size(f), 0))} (${kb(startup.reduce((s, f) => s + gz(f), 0))} gzipped)`);
  console.log(`Copied verbatim: ${plan.verbatim.size} lazily loaded modules (${plan.verbatimRoots.size} entry points); ${plan.chunkRoots.size} lazy module(s) chunked because they share startup code: ${[...plan.chunkRoots].join(', ') || 'none'}`);
  for (const x of plan.ignored) console.log(`  note: ${x.from} references ${x.target}, which does not exist in the source tree (left as is)`);
  console.log(`Site: ${shipped.length + 1} files, ${(files.reduce((s, f) => s + f.bytes, 0) / 1048576).toFixed(2)} MiB in ${out}`);
  return { out, outputs, plan, startup, files };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const i = process.argv.indexOf('--out');
  const out = resolve(i > 0 && process.argv[i + 1] ? process.argv[i + 1] : join(ROOT, 'dist'));
  buildSite(out).catch(e => { console.error(`ERROR ${e.message}`); process.exitCode = 1; });
}
