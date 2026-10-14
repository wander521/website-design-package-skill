import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {compile,pack,zipFiles,hash} from '../scripts/build.mjs';
const draft=`# Fixture — Style Reference
> A captured fixture with a custom font stack and real token references.

**Theme:** light

**Source website:** [https://fixture.example/path](https://fixture.example/path)

## Tokens — Colors

| Name | Value | Token | Role |
|---|---|---|---|
| Ink | rgb(20, 30, 40) | --brand-ink | Text |
| Surface | #fff | --color-surface | Background |

## Tokens — Typography

### Original Sans · \`--font-body\`
- **Substitute:** "Original Sans", Arial, sans-serif
- **Weights:** 400, 600
- **Role:** Text

### Type Scale

| Role | Size | Line Height | Letter Spacing | Token |
|---|---|---|---|---|
| body | 16px | 1.5 | normal | --text-body |

## Tokens — Spacing & Shapes

### Spacing Scale

| Name | Value | Token |
|---|---|---|
| Tight | 8px | --space-tight |

### Border Radius

| Name | Value | Token |
|---|---|---|
| Compact | 4px | --radius-compact |

## Layout

- **Max content width:** 60rem
`;
const evidence={schemaVersion:1,requestedUrl:'https://fixture.example/path',finalUrl:'https://fixture.example/path',status:200,capturedAt:'2026-10-14T00:00:00Z',samples:[{viewport:{width:1440,height:1000},elements:[{styles:{'font-weight':'400'}}]}],source:{declarations:['rgb(20, 30, 40)','#fff','"Original Sans", Arial, sans-serif','400','600','16px','1.5','normal','8px','4px','60rem'].map((value,index)=>({value,property:['color','background-color','font-family','font-weight','font-weight','font-size','line-height','letter-spacing','padding','border-radius','max-width'][index],selector:'body'}))}};
function changedValue(value){const e=structuredClone(evidence);e.source.declarations.push({value});return e;}

test('preserves exact source, observed original font and RICOUI token values',()=>{
 const {files,report}=compile(draft,evidence);const json=JSON.parse(files['token.json']);
 assert.equal(files['design.md'],draft);assert.equal(json.color['--brand-ink'].$value,'rgb(20, 30, 40)');
 assert.ok(files['variables.css'].includes('--font-body: "Original Sans", Arial, sans-serif;'));
 assert.ok(files['theme.css'].includes('--color-ink: rgb(20, 30, 40);'));
 assert.ok(files['theme.css'].includes('--text-body--line-height: 1.5;'));
 assert.ok(files['theme.css'].includes('--text-body--letter-spacing: normal;'));
 assert.ok(files['theme.css'].includes('--spacing-tight: 8px;'));
 assert.equal(report.sourceSha256,hash(draft));assert.equal(report.browserVerified,false);
});
test('rejects missing evidence and exact source mismatch',()=>{
 assert.throws(()=>compile(draft,null),/evidence/);
 assert.throws(()=>compile(draft.replaceAll('/path','/other'),evidence),/attribution/);
});
test('rejects unverified source values',()=>assert.throws(()=>compile(draft.replace('8px','9px'),evidence),/Unverified/));
test('rejects duplicate token definitions',()=>assert.throws(()=>compile(draft.replace('--color-surface','--brand-ink'),evidence),/Duplicate/));
test('rejects unresolved references',()=>assert.throws(()=>compile(draft.replace('#fff','var(--missing)'),changedValue('var(--missing)')),/unresolved-reference/));
test('rejects circular references',()=>assert.throws(()=>compile(draft.replace('rgb(20, 30, 40)','var(--color-surface)').replace('#fff','var(--brand-ink)'),changedValue('var(--color-surface)')),/unresolved-reference/));
test('uses case-sensitive CSS resolution',()=>{
 const md=draft.replace('#fff','var(--BRAND-INK)');assert.throws(()=>compile(md,changedValue('var(--BRAND-INK)')),/case-sensitive reference/);
});
test('rejects invalid and placeholder values',()=>{
 for(const value of ['TBD','16px (1rem)','8px — 16px','0.5rem (assumed)','…'])assert.throws(()=>compile(draft.replace('8px',value),changedValue(value)));
});
test('rejects declaration injection and URLs',()=>{
 for(const value of ['8px; color:red','url(https://tracking.example/a)','8px /* hidden */'])assert.throws(()=>compile(draft.replace('8px',value),changedValue(value)),/Unsafe/);
});
test('rejects malformed token tables',()=>assert.throws(()=>compile(draft.replace('| Tight | 8px | --space-tight |','| Tight | 8px |'),evidence),/Malformed table/));
test('requires core groups without inventing optional groups',()=>{
 assert.throws(()=>compile(draft.replace('## Tokens — Colors','## Unrecognized'),evidence),/at least colors|Unparsed token/);
 const minimal=draft.slice(0,draft.indexOf('## Tokens — Spacing'));const r=compile(minimal,evidence);assert.equal(r.report.counts.spacing,0);
});
test('supports CRLF without diverging source revisions',()=>assert.deepEqual(compile(draft.replaceAll('\n','\r\n'),evidence).files,compile(draft,evidence).files));
test('ZIP is deterministic and contains four entries',()=>{
 const r=compile(draft,evidence);const a=zipFiles(r.files),b=zipFiles(r.files);assert.deepEqual(a,b);assert.equal(a.readUInt16LE(a.length-14),4);
});
test('packing refuses unverified or subsequently edited artifacts',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'design-skill-test-'));try{
 const r=compile(draft,evidence);for(const [name,value]of Object.entries(r.files))fs.writeFileSync(path.join(dir,name),value);
 fs.writeFileSync(path.join(dir,'validation.json'),JSON.stringify(r.report));assert.throws(()=>pack(dir,path.join(dir,'out.zip')),/verify/);
 r.report.browserVerified=true;fs.writeFileSync(path.join(dir,'validation.json'),JSON.stringify(r.report));
 fs.appendFileSync(path.join(dir,'theme.css'),'/* changed */');assert.throws(()=>pack(dir,path.join(dir,'out.zip')),/changed after validation/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('radial and conic gradients are exported once in the gradient group',()=>{
 for(const kind of ['radial','conic','repeating-radial']) {
 const value=kind+'-gradient(#fff, rgb(20, 30, 40))';
 const md=draft.replace('## Tokens — Typography',`### Decorative / Gradient\n\n| Name | Value | Token | Role |\n|---|---|---|---|\n| Atmosphere | ${value} | --gradient-atmosphere | Decoration |\n\n## Tokens — Typography`);
 const r=compile(md,changedValue(value));const json=JSON.parse(r.files['token.json']);
 assert.equal(r.report.counts.gradients,1);assert.equal(r.report.counts.colors,2);
 assert.equal(json.gradient['--gradient-atmosphere'].$value,value);assert.equal(json.color['--gradient-atmosphere'],undefined);
 assert.ok(r.files['theme.css'].includes('--gradient-atmosphere: '+value));
 }
});

test('localized names never change source spacing/type identifiers',()=>{
 const md=draft.replace('| Tight |','| 紧凑 |').replace('| body |','| 正文 |').replace('| 紧凑 | 8px | --space-tight |','| 紧凑 | 8px | --space-tight |\n| 紧凑二 | 8px | --spacing-second |');
 const r=compile(md,evidence);
 assert.ok(r.files['theme.css'].includes('--spacing-tight: 8px;'));
 assert.ok(r.files['theme.css'].includes('--spacing-second: 8px;'));
 assert.ok(r.files['variables.css'].includes('--type-body-size: 16px;'));
 assert.ok(r.files['variables.css'].includes('--text-body: 16px;'));
});
test('orphan token rows cannot silently disappear during parsing',()=>{
 const md=draft.replace('## Tokens — Typography','| Orphan | #fff | --color-orphan | Supposed role |\n\n## Tokens — Typography');
 assert.throws(()=>compile(md,evidence),/Unparsed token declarations/);
});
test('a max-height value cannot masquerade as a radius',()=>{
 const e=structuredClone(evidence);e.source.declarations.push({property:'max-height',selector:'.menu',value:'9999px'});
 assert.throws(()=>compile(draft.replace('4px','9999px'),e),/unrelated properties/);
});
test('an unused webinar custom property cannot establish homepage width',()=>{
 const e=structuredClone(evidence);e.source.declarations.push({property:'--webinar-width',selector:':root',value:'1440px'});
 assert.throws(()=>compile(draft.replace('60rem','1440px'),e),/Layout width lacks max-width/);
});
test('observed secondary-font omissions are surfaced for semantic review',()=>{
 const e=structuredClone(evidence);e.samples[0].elements.push({tag:'code',group:'technical-text',text:'git push',styles:{'font-family':'"Berkeley Mono", monospace'}});
 const r=compile(draft,e);assert.ok(r.report.quality.warnings.some(w=>w.code==='observed-font-omitted'&&w.family==='berkeley mono'));
});
test('captures root variable and decomposed focus color origins without borrowing a template',()=>{
 const e=structuredClone(evidence);e.samples[0].rootCustomProperties={'--border':'#aabbcc'};
 e.states=[{selector:'#cta',focus:{hovered:false,focusVisible:true,styles:{'outline-color':'rgb(94, 105, 209)'}}}];
 const md=draft.replace('| Surface | #fff | --color-surface | Background |','| Surface | #fff | --color-surface | Background |\n| Focus | rgb(94, 105, 209) | --color-focus | Keyboard outline |');
 const r=compile(md,e);const c=r.report.cssChecks.find(c=>c.name==='--color-focus');
 assert.equal(c.evidenceSources[0].kind,'state');assert.equal(c.evidenceSources[0].state,'focus');assert.equal(c.evidenceSources[0].hovered,false);
});
test('hover evidence is not displaced by many identical body colors',()=>{
 const e=structuredClone(evidence);for(let i=0;i<20;i++)e.samples[0].elements.push({tag:'p',text:'copy',styles:{color:'#fff'}});
 e.states=[{selector:'#cta',hover:{styles:{'background-color':'#fff'}}}];
 const md=draft.replace('--color-surface','--color-cta-hover');const r=compile(md,e);const c=r.report.cssChecks.find(c=>c.name==='--color-cta-hover');
 assert.equal(c.evidenceSources[0].state,'hover');assert.ok(c.evidenceSourceCounts.total>6);
});
test('duplicate backtick font blocks cannot be silently replaced by the parser',()=>{
 const md=draft.replace('### Type Scale','### Duplicate · `--font-body`\n- **Substitute:** "Original Sans", Arial, sans-serif\n- **Weights:** 400\n- **Role:** Another font\n\n### Type Scale');
 assert.throws(()=>compile(md,evidence),/Duplicate source token/);
});
test('missing HTTP status and explicitly partial evidence cannot compile',()=>{
 const missing=structuredClone(evidence);delete missing.status;assert.throws(()=>compile(draft,missing),/status/);
 const partial={...evidence,complete:false};assert.throws(()=>compile(draft,partial),/status/);
});
test('declaration-only origins keep the quality report in review even if families are complete',()=>{
 const result=compile(draft,evidence);assert.ok(result.report.quality.originWarnings.length>0);assert.equal(result.report.quality.status,'review');
});
test('unused inherited wrapper font is excluded while its actual glyph font is retained',()=>{
 const e=structuredClone(evidence);e.samples[0].elements=[{tag:'button',group:'actions',text:'Start',directText:'',textOwner:false,styles:{'font-family':'Times New Roman'}},{tag:'span',group:'text-fragments',text:'Start',directText:'Start',textOwner:true,styles:{'font-family':'Original Sans'}}];
 const report=compile(draft,e).report;assert.deepEqual(report.quality.fontInventory.map(f=>f.primary),['original sans']);assert.ok(!report.quality.warnings.some(w=>w.code==='observed-font-omitted'));
});

test('all-empty viewport evidence cannot compile; partial empty viewports remain explicit review warnings',()=>{
 const empty=structuredClone(evidence);empty.samples[0].elements=[];assert.throws(()=>compile(draft,empty),/No observed elements/);
 const partial=structuredClone(evidence);partial.samples.push({viewport:{width:390,height:844},elements:[]});assert.ok(compile(draft,partial).report.quality.warnings.some(w=>w.code==='missing-core-capture'));
});
