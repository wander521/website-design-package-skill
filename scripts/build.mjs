import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {parseDesignMd} from './vendor/lib/parser/parse-design-md.mjs';
import {exportToCss,exportToTailwindTheme} from './vendor/lib/export/export-css.mjs';
import {exportToJson} from './vendor/lib/export/export-json.mjs';
import {getTokenExportReadiness} from './vendor/lib/validation/export-readiness.mjs';
import {evidenceIndex,propertyMatches,normalizeValue,qualityReview} from './quality.mjs';
import {slugify} from './vendor/lib/utils.mjs';

export const filenames=['design.md','token.json','variables.css','theme.css'];
export const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
const norm=s=>String(s).trim().replace(/\s+/g,' ').replace(/\s*([,():])\s*/g,'$1');
const safe=s=>!/[;{}\n\r]|\/\*|\*\//.test(s)&&!/(?:url\s*\(|@import|expression\s*\()/i.test(s);
function declarations(css) {
  return [...css.matchAll(/^\s*(--[a-zA-Z_][\w-]*)\s*:\s*(.+);$/gm)].map(m=>({name:m[1],value:m[2]}));
}
function guardReferences(entries,label) {
  const definitions=new Map();
  for(const {name,value} of entries) {
    if(definitions.has(name))throw new Error(`Duplicate exported token ${name} in ${label}`);
    definitions.set(name,value);
  }
  function visit(name,seen=new Set()) {
    if(seen.has(name))throw new Error(`Circular reference ${name} in ${label}`);
    if(!definitions.has(name))throw new Error(`Unresolved case-sensitive reference ${name} in ${label}`);
    const next=new Set(seen);next.add(name);
    for(const m of definitions.get(name).matchAll(/var\(\s*(--[\w-]+)/g))visit(m[1],next);
  }
  for(const name of definitions.keys())visit(name);
}
function cssProperty(group) {
  return {colors:'color',gradients:'background-image',spacing:'padding',radius:'border-radius',shadows:'box-shadow'}[group];
}
export function compile(markdown,evidence) {
  if(!evidence||evidence.schemaVersion!==1||!evidence.requestedUrl||!evidence.samples?.length)throw new Error('Missing rendered website evidence.');
  const sourceUrl=new URL(evidence.requestedUrl);
  if(!['http:','https:'].includes(sourceUrl.protocol)||sourceUrl.username||sourceUrl.password)throw new Error('Invalid source URL.');
  if(evidence.samples.every(sample=>!sample.elements?.length))throw new Error('No observed elements; capture is incomplete.');
  if(!evidence.finalUrl||!Number.isInteger(evidence.status)||evidence.status<200||evidence.status>=400||evidence.complete===false)throw new Error('Invalid captured page status.');
  const normalized=markdown.replace(/\r\n?/g,'\n').trim()+'\n';
  if(!/^# .+ — Style Reference\s*$/m.test(normalized)||!/^> \S/m.test(normalized))throw new Error('Use a canonical brand title and description.');
  if(!/^\*\*Theme:\*\* (light|dark)\s*$/m.test(normalized))throw new Error('Missing canonical Theme declaration.');
  if(!normalized.includes(`**Source website:** [${evidence.requestedUrl}](${evidence.requestedUrl})`))throw new Error('Source attribution must match the requested URL exactly.');
  // The parser ignores malformed table rows; catch them before parsing.
  const lines=normalized.split('\n');let columns=0;
  for(const line of lines){
    if(!line.trim().startsWith('|')){columns=0;continue;}
    const count=line.split(/(?<!\\)\|/).length-2;
    if(!columns)columns=count;
    if(count!==columns)throw new Error(`Malformed table row: ${line}`);
  }
  const {tokens}=parseDesignMd(normalized);
  // Upstream classifies radial/conic rows under Decorative as both color and gradient.
  tokens.colors=tokens.colors.filter(c=>!tokens.gradients.some(g=>g.token===c.token&&g.value===c.value&&/^(?:repeating-)?(?:linear|radial|conic)-gradient\(/i.test(c.value)));
  // Detect duplicate source token cells before upstream's font-block deduplication.
  const cells=[...normalized.matchAll(/^\|.*\|/gm)].flatMap(m=>m[0].split(/(?<!\\)\|/).map(c=>c.trim().replace(/^`|`$/g,''))).filter(c=>/^--[a-z_][a-z0-9_-]*$/i.test(c));
  const namedFonts=[...normalized.matchAll(/^### .+?\s+`?(--font-[\w-]+)`?\s*$/gm)].map(m=>m[1]);
  const sourceNames=new Set();for(const name of [...cells,...namedFonts]){if(sourceNames.has(name))throw new Error('Duplicate source token '+name);sourceNames.add(name);}
  const parsedNames=new Set([...tokens.colors,...tokens.gradients,...tokens.spacing,...tokens.radius,...tokens.shadows,...tokens.typography.fontFamilies,...tokens.typography.typeScale].map(t=>t.token));
  const missingParsed=[...sourceNames].filter(name=>!parsedNames.has(name));if(missingParsed.length)throw new Error('Unparsed token declarations (check orphan rows/headings): '+missingParsed.join(', '));
  const ready=getTokenExportReadiness(tokens);
  if(!ready.ready)throw new Error(`Export blocked: ${JSON.stringify(ready.issues)}`);
  if(!tokens.colors.length||!tokens.typography.fontFamilies.length||!tokens.typography.typeScale.length)throw new Error('Capture at least colors, font family, and body typography; do not export empty groups as success.');
  if(/[\r\n]|\*\//.test(tokens.meta.name)||tokens.meta.name.length>200)throw new Error('Unsafe metadata.');
  const values=new Set();
  for(const d of evidence.source?.declarations||[])values.add(norm(d.value));
  for(const sample of evidence.samples){for(const el of [...(sample.elements||[]),...(sample.surfaces||[])])for(const value of Object.values(el.styles||{}))values.add(norm(value));for(const value of Object.values(sample.rootCustomProperties||{}))values.add(norm(value));}
  for(const state of evidence.states||[])for(const phase of ['baseline','hover','focus'])for(const value of Object.values(state[phase]?.styles||{}))values.add(norm(value));
  // A published document is evidence only if independently fetched and attributed by the agent.
  for(const item of evidence.publishedTokens||[]){if(!item.sourceUrl||!item.value)throw new Error('Published token evidence needs sourceUrl and value.');values.add(norm(item.value));}
  const checks=[];const defined=new Set();const origins=evidenceIndex(evidence);
  const originWarnings=[];
  function check(value,property,name,requireEvidence=true){
    if(!value||!safe(value))throw new Error(`Unsafe or empty CSS value ${name||property}: ${value}`);
    if(requireEvidence&&!values.has(norm(value)))throw new Error(`Unverified source value ${name||property}: ${value}`);
    const matches=origins.get(normalizeValue(value))||[];
    const compatible=matches.filter(source=>propertyMatches(property,source.property)||['root-variable','declared-variable','published'].includes(source.kind));
    if(!compatible.length&&matches.some(source=>source.property))throw new Error(`Value only appears under unrelated properties ${name||property}: ${value}`);
    if(property==='max-width'&&!compatible.some(source=>propertyMatches(property,source.property)||source.kind==='published'))throw new Error(`Layout width lacks max-width property evidence ${name||property}: ${value}`);
    const ranked=compatible.length?compatible:matches;
    const preferred=/hover/i.test(name||'')?'hover':/focus/i.test(name||'')?'focus':null;
    const score=source=>source.kind==='state'&&source.state===preferred?0:source.kind==='state'?1:source.kind==='computed'?2:3;
    ranked.sort((a,b)=>score(a)-score(b));
    if(!ranked.some(source=>['computed','state'].includes(source.kind)&&propertyMatches(property,source.property)))originWarnings.push({code:'declared-only-or-variable-value',name,property,value,note:'Verify the declared selector, scope and semantic role; value membership alone does not prove role.'});
    checks.push({name,property,value,evidenceSources:ranked.slice(0,6),evidenceSourceCounts:{total:ranked.length,state:ranked.filter(s=>s.kind==='state').length,computed:ranked.filter(s=>s.kind==='computed').length,declared:ranked.filter(s=>['declared','declared-variable'].includes(s.kind)).length}});
  }
  for(const group of ['colors','gradients','spacing','radius','shadows'])for(const t of tokens[group]){
    if(defined.has(t.token))throw new Error(`Duplicate source token ${t.token}`);defined.add(t.token);
    check(t.value,cssProperty(group),t.token);
  }
  for(const f of tokens.typography.fontFamilies){
    if(defined.has(f.token))throw new Error(`Duplicate source token ${f.token}`);defined.add(f.token);
    // The upstream exporter uses Substitute. It must be the captured complete stack.
    check(f.substitute,'font-family',f.token);
    for(const weight of f.weights)if(!values.has(norm(weight)))throw new Error(`Unverified font weight ${weight}`);
  }
  for(const t of tokens.typography.typeScale){
    if(defined.has(t.token))throw new Error(`Duplicate source token ${t.token}`);defined.add(t.token);
    check(t.size,'font-size');check(t.lineHeight,'line-height');
    if(t.letterSpacing)check(t.letterSpacing,'letter-spacing');
  }
  for(const [key,value] of Object.entries(tokens.layout))if(value)check(value,({maxContentWidth:'max-width',cardPadding:'padding',sectionGap:'row-gap',elementGap:'gap'})[key]);
  // Reference-only source values are resolved in browser; primitive values still need captured evidence.
  // CSS identifiers follow the explicit source token, independent of localized labels.
  const cssTokens=structuredClone(tokens);
  cssTokens.typography.typeScale=cssTokens.typography.typeScale.map(t=>({...t,role:t.token.replace(/^--text-/, '').replace(/^--/, '')}));
  let variables=exportToCss(cssTokens);
  const typeAliases=tokens.typography.typeScale.map(t=>`  ${t.token}: ${t.size};`);
  variables=variables.replace(/}\s*$/,typeAliases.join('\n')+'\n}\n');
  const themeTokens=structuredClone(tokens);
  themeTokens.spacing=themeTokens.spacing.map(s=>({...s,token:s.token.startsWith('--spacing-')?s.token.replace(/^--spacing-/, '--space-'):s.token,name:slugify(s.name)?s.name:s.token.slice(2)}));
  let theme=exportToTailwindTheme(themeTokens);
  const variableRows=declarations(variables);
  guardReferences(variableRows,'variables.css');
  // Preserve source tokens, while supplying Tailwind v4 namespace aliases and type companions.
  const extra=[];
  for(const t of tokens.colors)if(!t.token.startsWith('--color-'))extra.push(`  --color-${slugify(t.name)}: ${t.value};`);
  for(const f of tokens.typography.fontFamilies)if(!f.token.startsWith('--font-'))extra.push(`  --font-${slugify(f.name)}: ${f.substitute};`);
  for(const t of tokens.typography.typeScale){
    const name=t.token.startsWith('--text-')?t.token:`--text-${slugify(t.role)}`;
    extra.push(`  ${name}--line-height: ${t.lineHeight};`);
    if(t.letterSpacing)extra.push(`  ${name}--letter-spacing: ${t.letterSpacing};`);
  }
  // Source references may point to gradients, spacing, or type names renamed by @theme.
  const present=new Set(declarations(theme).map(x=>x.name));
  for(const row of variableRows)if(!present.has(row.name)){extra.push(`  ${row.name}: ${row.value};`);present.add(row.name);}
  theme=theme.replace(/}\s*$/,extra.join('\n')+'\n}\n');
  guardReferences(declarations(theme),'theme.css');
  const files={'design.md':normalized,'token.json':exportToJson(tokens)+'\n','variables.css':variables,'theme.css':theme};
  const hashes=Object.fromEntries(Object.entries(files).map(([n,v])=>[n,hash(v)]));
  return {files,report:{schemaVersion:1,compilerVersion:'2.1.0',captureVersion:evidence.captureVersion||1,sourceUrl:evidence.requestedUrl,finalUrl:evidence.finalUrl,capturedAt:evidence.capturedAt,sourceSha256:hash(normalized),hashes,browserVerified:false,cssChecks:checks,quality:{...qualityReview(tokens,evidence),...(originWarnings.length?{status:'review'}:{}),originWarnings},counts:Object.fromEntries(['colors','gradients','spacing','radius','shadows'].map(g=>[g,tokens[g].length])),format:'RICOUI-compatible JSON (DTCG-style, not a strict DTCG conformance claim)',upstream:'ricocc/ricoui-design-md@570aef63c0b747db8110efae161299948d83b9e6'}};
}
// Dependency-free, deterministic ZIP (UTF-8, stored entries, fixed timestamps).
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return(crc^0xffffffff)>>>0;}
export function zipFiles(files){const local=[],central=[];let offset=0;for(const name of filenames){
 const filename=Buffer.from(name),data=Buffer.from(files[name]);const crc=crc32(data);
 const head=Buffer.alloc(30);head.writeUInt32LE(0x04034b50);head.writeUInt16LE(20,4);head.writeUInt16LE(0x800,6);head.writeUInt16LE(33,12);head.writeUInt32LE(crc,14);head.writeUInt32LE(data.length,18);head.writeUInt32LE(data.length,22);head.writeUInt16LE(filename.length,26);
 local.push(head,filename,data);const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt16LE(33,14);c.writeUInt32LE(crc,16);c.writeUInt32LE(data.length,20);c.writeUInt32LE(data.length,24);c.writeUInt16LE(filename.length,28);c.writeUInt32LE(offset,42);central.push(c,filename);offset+=head.length+filename.length+data.length;
 }const directory=Buffer.concat(central);const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(filenames.length,8);end.writeUInt16LE(filenames.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...local,directory,end]);}
export function pack(dir,zipPath){
 const report=JSON.parse(fs.readFileSync(path.join(dir,'validation.json'),'utf8'));
 if(!report.browserVerified)throw new Error('Run browser.mjs verify before packing.');
 const files={};for(const n of filenames){files[n]=fs.readFileSync(path.join(dir,n),'utf8');if(hash(files[n])!==report.hashes[n])throw new Error(`File changed after validation: ${n}`);}
 fs.writeFileSync(zipPath,zipFiles(files));return {zip:zipPath,sha256:hash(fs.readFileSync(zipPath)),files:filenames};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [command,...args]=process.argv.slice(2);
 try{
 if(command==='compile'&&args.length===3){const [draft,evidenceFile,out]=args;const result=compile(fs.readFileSync(draft,'utf8'),JSON.parse(fs.readFileSync(evidenceFile,'utf8')));fs.mkdirSync(out,{recursive:true});for(const [name,text]of Object.entries(result.files))fs.writeFileSync(path.join(out,name),text);fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(result.report,null,2)+'\n');console.log(JSON.stringify({directory:path.resolve(out),counts:result.report.counts}));}
 else if(command==='pack'&&args.length===2)console.log(JSON.stringify(pack(args[0],args[1])));
 else throw new Error('Usage: node build.mjs compile DRAFT EVIDENCE OUT | pack OUT ZIP');
 }catch(e){console.error(e.message);process.exitCode=1;}
}
