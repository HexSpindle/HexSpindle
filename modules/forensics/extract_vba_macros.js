import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { streamTransform } from '../compression/_streams.js';
import { getVbaProject, extractModules } from './_vba.js';

// Keywords that reveal what a macro actually does — auto-run triggers and the usual malware primitives.
const SUSPICIOUS = [
  [/\b(?:Auto_?Open|AutoOpen|Auto_?Close|AutoExec|Document_Open|Workbook_Open|Workbook_Activate|Auto_?Exec)\b/i, 'runs automatically when the document opens'],
  [/\bShell\b|\bWScript\.Shell\b|\bVBA\.Shell\b/i, 'runs an external command (Shell)'], [/\bCreateObject\b/i, 'creates COM objects (CreateObject)'], [/\bGetObject\b/i, 'binds to COM objects (GetObject)'],
  [/\bPowerShell\b|\bpwsh\b/i, 'invokes PowerShell'], [/\b(?:URLDownloadToFile|MSXML2|XMLHTTP|WinHttp|ServerXMLHTTP|InternetOpenUrl)\b/i, 'downloads from the internet'],
  [/\bADODB\.Stream\b/i, 'writes files (ADODB.Stream)'], [/\bEnviron\b/i, 'reads environment variables'], [/\bChr[WB]?\s*\(|\bStrReverse\b|\bXor\b/i, 'uses string obfuscation (Chr / StrReverse / Xor)'],
  [/\bDeclare\b.*\bLib\b/i, 'calls Windows API functions directly (Declare … Lib)'], [/\bProcess\b|\bWin32_Process\b/i, 'starts processes via WMI'], [/\bRegWrite\b|\bRegistry\b/i, 'writes to the registry'],
  [/\bApplication\.Run\b/i, 'calls other macros (Application.Run)'], [/\bCallByName\b/i, 'calls methods indirectly (CallByName)'], [/\bExecuteExcel4Macro\b/i, 'runs Excel 4.0 macros'],
];

module('Extract VBA Macros',
  'Extracts and decompresses the VBA macro source from an Office document — a legacy OLE file (.doc/.xls/.ppt) or an Office Open XML file with macros (.docm/.xlsm/.pptm), or a raw vbaProject.bin. '
  + 'Decompresses the MS-OVBA module streams to recover the readable source of every module, and flags the keywords that matter for triage: auto-run triggers, Shell / PowerShell, downloads, file writes and obfuscation. '
  + 'Nothing is executed. Decompile-resistant stomped macros (where only p-code remains) are reported as having no source.',
  [A.select('Output', ['Source and analysis', 'Source only', 'Analysis only'])],
  async (data, output) => {
    const inflate = bytes => streamTransform(bytes, 'deflate-raw', 'decompress');
    const project = await getVbaProject(data, inflate);
    const modules = extractModules(project);
    const withSource = modules.filter(m => m.source && m.source.trim());
    if (output === 'Source only') return withSource.map(m => `' ===== ${m.name} =====\n${m.source.replace(/\r\n/g, '\n').trimEnd()}`).join('\n\n') || "' (no readable VBA source; the modules may be p-code only / VBA-stomped)";
    const allSource = modules.map(m => m.source || '').join('\n');
    const findings = SUSPICIOUS.filter(([rx]) => rx.test(allSource)).map(([, m]) => m);
    const lines = [`VBA project: ${modules.length} module(s), ${withSource.length} with readable source`, ''];
    lines.push('Modules:', ...modules.map(m => `  ${m.name}${m.error ? ` — ${m.error}` : m.source && m.source.trim() ? ` (${m.source.split(/\r?\n/).length} lines)` : ' (empty or p-code only)'}`));
    lines.push('', findings.length ? 'Behaviour found in the macro source:' : 'No notable keywords found in the source.', ...findings.map(f => `  - ${f}`));
    if (modules.length && !withSource.length) lines.push('', 'No readable source was recovered — the macros may be "VBA stomped" (source removed, only compiled p-code left). Analyse the p-code with a dedicated tool.');
    if (output === 'Analysis only') return lines.join('\n');
    return lines.join('\n') + '\n\n' + withSource.map(m => `' ===== ${m.name} =====\n${m.source.replace(/\r\n/g, '\n').trimEnd()}`).join('\n\n');
  }, { aliases: ['vba', 'macros', 'olevba', 'maldoc', 'extract macros', 'docm', 'xlsm'] });
