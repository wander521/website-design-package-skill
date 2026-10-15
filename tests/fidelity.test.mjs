import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {auditFrontend,prepareAudit,compareCss} from '../scripts/fidelity.mjs';
const designPath=fileURLToPath(new URL('./fixtures/fidelity.md',import.meta.url));
const markdown=fs.readFileSync(designPath,'utf8');
const html=fs.readFileSync(new URL('./fixtures/controls.html',import.meta.url),'utf8').replaceAll('Arial,sans-serif','sans-serif');
const modules=process.env.DESIGN_TEST_PLAYWRIGHT;
const css=(id,selector,property,token,category='controls',state)=>({id,selector,property,token,category,...(state?{state}:{})});
const basic=[css('heading-ink','h1','color','--color-ink','palette'),css('heading-font','h1','font-family','--font-body','typography'),css('panel-space','main','padding-top','--space-panel','spacing'),css('content-width','main','max-width','--layout-max-width','layout')];
async function run(checks,htmlText=html,referenceMarkdown=markdown){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'design-fidelity-'));let posts=0;
 const server=http.createServer((req,res)=>{if(req.method==='POST')posts++;res.setHeader('content-type','text/html');res.end(htmlText);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
   const planPath=path.join(dir,'plan.json');fs.writeFileSync(planPath,JSON.stringify({schemaVersion:1,checks}));
   const localDesign=path.join(dir,'reference.md');fs.writeFileSync(localDesign,referenceMarkdown);
   const out=path.join(dir,'out');
   const summary=await auditFrontend({designPath:localDesign,url:`http://127.0.0.1:${server.address().port}/`,planPath,out,modulePath:modules});
   const report=JSON.parse(fs.readFileSync(path.join(out,'fidelity.json')));
   const images=fs.readdirSync(out).filter(f=>f.endsWith('.png'));
   const imageSizes=Object.fromEntries(images.map(f=>{const bytes=fs.readFileSync(path.join(out,f));return [f,{width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)}];}));
   return {summary,report,posts,markdown:fs.readFileSync(path.join(out,'fidelity.md'),'utf8'),screenshots:images.length,imageSizes};
 }finally{await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});}
}

test('fidelity expectations must originate in the supplied document, with precise unique mappings',()=>{
 assert.throws(()=>prepareAudit(markdown,{schemaVersion:1,checks:[css('wrong','h1','color','--unobserved')]}),/Unknown/);
 assert.throws(()=>prepareAudit(markdown,{schemaVersion:1,checks:[{...basic[0],token:undefined,expected:'red',sourceQuote:'not in document'}]}),/sourceQuote/);
 assert.throws(()=>prepareAudit(markdown,{schemaVersion:1,checks:[basic[0],basic[0]]}),/unique/);
 assert.throws(()=>prepareAudit(markdown,{schemaVersion:1,checks:[{...basic[0],tolerance:99}]}),/Tolerance/);
 assert.throws(()=>prepareAudit(markdown,{schemaVersion:1,checks:[{...basic[0],state:{click:'anything'}}]}),/State/);
 assert.throws(()=>prepareAudit(markdown.replace('--color-hover','--color-ink'),{schemaVersion:1,checks:[basic[0]]}),/duplicate/);
});
test('numeric tolerance is explicit and cannot hide color or unit differences',()=>{
 assert.equal(compareCss('9.5px','10px',.5),true);assert.equal(compareCss('9px','10px'),false);
 assert.equal(compareCss('rgb(1, 2, 3)','rgb(1,2,3)'),true);
 assert.equal(compareCss('rgb(1,2,3)','rgb(2,2,3)',2),false);assert.equal(compareCss('1rem','16px',2),false);
});
test('matching frontend measures actual fonts, layout, custom popup panels, backdrop, hover and keyboard focus at both widths',async()=>{
 const checks=[...basic,
  css('dialog-radius','#edit-dialog','border-radius','--radius-dialog','shape',{trigger:'#open-dialog'}),
  css('dialog-surface','#edit-dialog','background-color','--color-surface','palette',{trigger:'#open-dialog'}),
  {id:'backdrop',selector:'#edit-dialog',pseudo:'::backdrop',property:'background-color',expected:'rgba(9, 20, 31, 0.55)',sourceQuote:'Backdrop background is rgba(9, 20, 31, 0.55).',category:'controls',state:{trigger:'#open-dialog'}},
  css('dropdown-radius','#choices','border-radius','--radius-dropdown','shape',{trigger:'#open-select'}),
  css('option-hover','#choices [role=option]:nth-child(2)','background-color','--color-hover','controls',{trigger:'#open-select',hover:'#choices [role=option]:nth-child(2)'}),
  css('focus-outline','#open-dialog','outline-color','--color-accent','controls',{focus:'#open-dialog'})];
 const {summary,report,screenshots,imageSizes}=await run(checks);
 assert.equal(summary.pass,20,JSON.stringify(report.results.filter(r=>r.status!=='pass')));assert.equal(summary.fail,0);assert.equal(summary.blocked,0);
 assert.equal(summary.status,'checks-pass-review-required');assert.deepEqual(summary.uncoveredCategories,['imagery']);assert.equal(screenshots,10);
 assert.ok(report.results.find(r=>r.id==='heading-font').renderedFonts.fonts.some(f=>f.glyphCount>0));
 assert.ok(report.captures.some(c=>c.nativeBoundaries.some(x=>x.kind==='native-select')));
 for(const c of report.captures.filter(c=>c.state.trigger))assert.deepEqual(imageSizes[c.screenshot],{width:c.viewport.width,height:c.viewport.height});
 assert.equal(report.manualReview.status,'required');
});
test('imported correct tokens cannot mask wrongly painted color, spacing, fallback fonts and mobile drift',async()=>{
 const changed=html.replace('</style>','h1{color:#ff0000;font-family:"Missing Brand Font",Arial,sans-serif}main{padding-top:4px}@media(max-width:500px){h1{color:#00ff00}}</style>');
 // The extra reference font is intentionally unavailable in this generated frontend.
 const drift=await run(basic,changed);
 assert.equal(drift.summary.fail,6);assert.equal(drift.summary.pass,2);assert.equal(drift.summary.status,'drift-detected');
 assert.notEqual(drift.report.results.find(r=>r.id==='heading-ink'&&r.viewport==='desktop').actual,drift.report.results.find(r=>r.id==='heading-ink'&&r.viewport==='mobile').actual);
 const fallbackHtml=html.replaceAll('16px/1.5 sans-serif','16px/1.5 "Unavailable Brand",sans-serif');
 // A computed stack can match while the actual primary font is missing.
 const fallback=await run([basic[1]],fallbackHtml,markdown.replace('**Substitute:** sans-serif','**Substitute:** "Unavailable Brand", sans-serif'));
 assert.equal(fallback.summary.fail,2);assert.ok(fallback.report.results.every(r=>r.reason.includes('primary font')));
 const chinese=await run([basic[1]],fallbackHtml.replace('Controls evidence fixture</h1>','中文界面</h1>'),markdown.replace('**Substitute:** sans-serif','**Substitute:** "Unavailable Brand", sans-serif'));
 assert.equal(chinese.summary.blocked,2);assert.equal(chinese.summary.fail,0);
});
test('hidden and ambiguous mappings remain blocked rather than being counted as passes',async()=>{
 const {summary}=await run([css('hidden','#edit-dialog','border-radius','--radius-dialog','shape'),css('absent','#absent','color','--color-ink','palette'),css('ambiguous','button','color','--color-ink','palette'),{...css('no-pseudo','h1','color','--color-ink','palette'),pseudo:'::before'},css('wrapper','main','color','--color-ink','palette')]);
 assert.equal(summary.blocked,10);assert.equal(summary.pass,0);assert.equal(summary.status,'incomplete');
});
test('relative aliases and equivalent modern color notations need context rather than a false match or mismatch',async()=>{
 const contextualMd=markdown.replace('| Panel | 24px | --space-panel |','| Panel | var(--space-root) | --space-panel |\n| Root | 1.5rem | --space-root |');
 const modern=html.replace('--ink:#152238','--ink:color(srgb 0.082352941 0.133333333 0.219607843)');
 const {summary,report}=await run([basic[0],basic[2]],modern,contextualMd);
 assert.equal(summary.blocked,4);assert.equal(summary.fail,0);assert.equal(summary.pass,0);
 assert.ok(report.results.filter(r=>r.id==='panel-space').every(r=>r.referenceResolved==='1.5rem'));
});
test('native business dialogs fail and submitting triggers are blocked without sending a form',async()=>{
 const native=await run([css('native','#edit-dialog','border-radius','--radius-dialog','controls',{trigger:'#native-alert'})]);
 assert.equal(native.summary.fail,2);assert.ok(native.report.captures.every(c=>c.nativeDialogs[0].type==='alert'));
 const submit=await run([css('submit','#edit-dialog','border-radius','--radius-dialog','controls',{trigger:'#unsafe-submit'})]);
 assert.equal(submit.summary.blocked,2);assert.equal(submit.posts,0);
});
