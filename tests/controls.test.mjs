import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {captureDom} from '../scripts/capture-dom.mjs';
import {launchBrowser,properties} from '../scripts/browser.mjs';
import {inspectControls} from '../scripts/inspect-controls.mjs';
import {compile} from '../scripts/build.mjs';
import {qualityReview} from '../scripts/quality.mjs';
import {controlKinds,controlCoverage,controlWarnings} from '../scripts/control-coverage.mjs';
const fixture=fs.readFileSync(fileURLToPath(new URL('./fixtures/controls.html',import.meta.url)),'utf8');
const modules=process.env.DESIGN_TEST_PLAYWRIGHT;
async function withSite(run){
 let posts=0;const server=http.createServer((req,res)=>{if(req.method==='POST')posts++;res.setHeader('content-type','text/html');res.end(fixture);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'design-controls-'));
 try{return await run(`http://127.0.0.1:${server.address().port}/`,dir,()=>posts);}
 finally{await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});}
}

test('inventory covers nineteen control families and retains native boundaries, mixed/errors and custom checkbox paint',async()=>{
 const browser=await launchBrowser(modules);try{
 const page=await browser.newPage();await page.setContent(fixture);const sample=await page.evaluate(captureDom,properties);
 assert.deepEqual(new Set(sample.controlInventory.map(c=>c.kind)),new Set(controlKinds));
 assert.equal(sample.controlInventory.find(c=>c.selector==='#mixed').indeterminate,true);
 assert.equal(sample.controlInventory.find(c=>c.selector==='#email').invalid,'true');
 const checkbox=sample.controlInventory.find(c=>c.selector==='#check');assert.equal(checkbox.rendered,false);assert.ok(checkbox.visualProxy.length);
 assert.ok(sample.surfaces.some(c=>c.pseudo==='::before'&&c.styles['background-color']==='rgb(36, 92, 204)'));
 assert.ok(sample.controlInventory.find(c=>c.kind==='file').nativeBoundary);
 assert.equal(sample.controlInventory.find(c=>c.kind==='progress').value,40);
 assert.ok(sample.controlInventory.find(c=>c.kind==='table').cells.some(c=>c.tag==='th'));
 assert.equal(sample.controlInventory.find(c=>c.kind==='tab'&&c.selected==='true').styles['border-bottom-width'],'3px');
 assert.ok(sample.controlInventory.some(c=>c.kind==='tooltip'&&c.nativeBoundary));
 const hiddenDialog=sample.floatingControls.find(c=>c.id==='edit-dialog');assert.equal(hiddenDialog.rendered,false);assert.equal(hiddenDialog.styles,undefined);
 }finally{await browser.close();}
});

test('explicit dialog inspection captures styled HTML dialog and backdrop at both widths, then closes and restores focus',()=>withSite(async(url,dir,posts)=>{
 await inspectControls(launchBrowser,url,dir,modules,'#open-dialog');const e=JSON.parse(fs.readFileSync(path.join(dir,'evidence.json')));
 assert.equal(e.controlInteractions.length,2);assert.ok(e.controlInteractions.every(i=>i.closedAfterEscape&&i.focusRestoredAfterEscape));
 for(const width of [1440,390]){
 const opened=e.samples.find(s=>s.viewport.width===width&&s.phase==='opened');const dialog=opened.floatingControls.find(c=>c.id==='edit-dialog');
 assert.equal(dialog.modal,true);assert.equal(dialog.styles['border-radius'],'11px');assert.equal(dialog.backdrop.styles['background-color'],'rgba(9, 20, 31, 0.55)');
 assert.ok(fs.statSync(path.join(dir,(width===1440?'desktop':'mobile')+'-opened.png')).size>1000);
 }
 assert.equal(posts(),0);
}));

test('custom dropdown inspection captures selected/disabled and actual item hover without choosing an option',()=>withSite(async(url,dir)=>{
 await inspectControls(launchBrowser,url,dir,modules,'#open-select');const e=JSON.parse(fs.readFileSync(path.join(dir,'evidence.json')));
 assert.ok(e.controlInteractions.every(i=>i.closedAfterEscape&&i.focusRestoredAfterEscape));
 for(const width of [1440,390]){
 const hover=e.samples.find(s=>s.viewport.width===width&&s.phase==='item-hover').floatingControls.find(c=>c.id==='choices');
 assert.equal(hover.items.find(i=>i.text==='Standard').selected,'true');assert.ok(hover.items.find(i=>i.text==='Unavailable').disabled);
 assert.equal(hover.items.find(i=>i.text==='Professional').styles['background-color'],'rgb(227, 237, 255)');
 }
}));

test('native select and datalist record the boundary rather than claiming that its OS picker was themed',()=>withSite(async(url,dir)=>{
 const result=await inspectControls(launchBrowser,url,dir,modules,'#native-select','dark');assert.ok(result.interactions.every(i=>i.status==='native-picker-uninspected'));
 const e=JSON.parse(fs.readFileSync(path.join(dir,'evidence.json')));assert.ok(e.samples.every(s=>s.phase==='closed'));assert.equal(e.colorScheme,'dark');assert.equal(e.source.prefersDark,true);assert.ok(e.samples.every(s=>s.captureVersion===4&&s.sourceCapture&&s.capturedAt));
 const datalist=await inspectControls(launchBrowser,url,path.join(dir,'datalist'),modules,'#native-datalist');assert.ok(datalist.interactions.every(i=>i.status==='native-picker-uninspected'));
}));

test('submitting trigger and browser JS popup cannot produce successful popup evidence',()=>withSite(async(url,dir,posts)=>{
 await assert.rejects(inspectControls(launchBrowser,url,dir,modules,'#unsafe-submit'),/submitting/);assert.equal(posts(),0);assert.ok(!fs.existsSync(path.join(dir,'evidence.json')));
 await assert.rejects(inspectControls(launchBrowser,url,dir,modules,'#native-alert'),/browser alert/);assert.ok(!fs.existsSync(path.join(dir,'evidence.json')));
 assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'failure.json'))).nativeDialogs[0].type,'alert');
}));

const ledger=controlKinds.map(kind=>`- ${kind}: ${kind==='dropdown'?'observed':'not-observed'} — fixture scope`).join('\n');
const draft=`# Controls — Style Reference
> A controls handoff fixture.

**Theme:** light

**Source website:** [https://controls.example/](https://controls.example/)

## Tokens — Colors

| Name | Value | Token | Role |
|---|---|---|---|
| Ink | rgb(21, 34, 56) | --color-ink | Body |

## Tokens — Typography

### Arial · \`--font-body\`
- **Substitute:** Arial, sans-serif
- **Weights:** 400
- **Role:** Body

### Type Scale

| Role | Size | Line Height | Letter Spacing | Token |
|---|---|---|---|---|
| body | 16px | 24px | normal | --text-body |

## Components

### Dialog
**Role:** Dialog coverage

Not observed; do not invent source dialog styles.

### Dropdown / Select
**Role:** Custom dropdown

Opened panel and selected/disabled options captured; do not substitute an unstyled picker.

### Frontend Implementation
**Role:** Downstream implementation requirements

Use styled accessible controls. Do not use window.alert/confirm/prompt for business dialogs. A styled HTML dialog is permitted. Apply the theme to input, choice, navigation and feedback states. New controls absent from the source must be labeled derived.

### Control Coverage
**Role:** Reference coverage ledger

${ledger}
`;
const evidence={schemaVersion:1,requestedUrl:'https://controls.example/',finalUrl:'https://controls.example/',status:200,samples:[{elements:[{styles:{color:'rgb(21, 34, 56)','font-family':'Arial, sans-serif','font-weight':'400','font-size':'16px','line-height':'24px','letter-spacing':'normal'}}],controlInventory:[{kind:'dropdown',rendered:true}]}],source:{}};
test('JSON retains component instructions and structured coverage from the same Markdown without changing the four-file contract',()=>{
 const r=compile(draft,evidence);assert.deepEqual(Object.keys(r.files),['design.md','token.json','variables.css','theme.css']);
 const json=JSON.parse(r.files['token.json']);const ext=json.$extensions['website-design-package'];
 assert.equal(ext.controlCoverage.dropdown.status,'observed');assert.equal(Object.keys(ext.controlCoverage).length,19);
 assert.ok(ext.components.find(c=>c.name==='Frontend Implementation').description.includes('window.alert/confirm/prompt'));
 assert.equal(controlWarnings(ext.components,evidence).length,0);
 const old=compile(draft.slice(0,draft.indexOf('## Components')),evidence);assert.ok(old.report.quality.warnings.some(w=>w.code==='control-coverage-ledger-missing'));
});
test('observed controls cannot silently be described as absent in the coverage review',()=>{
 const components=[{name:'Control Coverage',description:'- dropdown: not-observed — claimed absent'}];
 assert.equal(controlCoverage(components).dropdown.status,'not-observed');assert.ok(controlWarnings(components,evidence).some(w=>w.code==='observed-control-undocumented'));
});

test('a dynamically associated opened panel resolves only its own closed-trigger warning',()=>{
 const e=structuredClone(evidence);e.samples[0].floatingControls=[{kind:'trigger',selector:'#trigger',expanded:'false',controls:null}];
 e.samples.push({elements:[],floatingControls:[{kind:'trigger',selector:'#trigger',expanded:'true',controls:'panel'},{kind:'dialog',id:'panel',rendered:true}]});
 const tokens={typography:{fontFamilies:[]},components:[]};assert.ok(!qualityReview(tokens,e).warnings.some(w=>w.code==='floating-trigger-open-state-unobserved'));
 e.samples[1].floatingControls[0].selector='#other-trigger';assert.ok(qualityReview(tokens,e).warnings.some(w=>w.code==='floating-trigger-open-state-unobserved'));
});
