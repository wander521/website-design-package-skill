import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {capture,launchBrowser,properties} from '../scripts/browser.mjs';
import {captureDom} from '../scripts/capture-dom.mjs';
import {boundedScreenshot,stableEvaluate} from '../scripts/capture.mjs';
async function server(handler){const s=http.createServer(handler);await new Promise(r=>s.listen(0,'127.0.0.1',r));return s;}
const close=s=>new Promise(resolve=>s.close(resolve));
test('capture preserves heading/technical roles under crowded navigation, reads cross-origin CSS, separates focus and finds shadow consent',async()=>{
 const cssServer=await server((req,res)=>{res.setHeader('content-type','text/css');res.end(':root{--brand:#135791;--content:60rem} body{font-family:Arial,sans-serif;color:#222} .Navbar a{color:#222;display:inline-block} .cta{background:#111;color:white;padding:12px 24px;border-radius:8px} .cta:hover{background:#444} .cta:focus-visible{outline:3px solid #2468ac} h1{color:green} h1 span{color:#123456} code{font-family:monospace} .hidden-parent{opacity:0} @media(min-width:800px){h1{font-size:64px}} @supports(display:grid){.grid{display:grid}} @container(min-width:400px){.container{padding:24px}}');});
 const cssUrl=`http://127.0.0.1:${cssServer.address().port}/style.css`;
 const site=await server((req,res)=>{res.setHeader('content-type','text/html');res.end(`<!doctype html><html><head><title>Capture Fixture</title><link rel="stylesheet" href="${cssUrl}"></head><body><section style="position:fixed;bottom:0;right:0;width:300px;height:80px;background:white">Cookie settings <button style="background:red;color:white">Reject optional</button></section><div class="Navbar">${'<a href="#">Nav</a>'.repeat(260)}</div><main><h1><span>True headline</span></h1><p>Body copy</p><code>git push</code>${'<div><div><div>'.repeat(4)}<a class="cta" href="#">Get started</a>${'</div></div></div>'.repeat(4)}<div class="hidden-parent"><p>Hidden text</p></div></main><div class="Footer"><a href="#">Terms</a></div><div id="consent-host"></div><script>const root=document.getElementById('consent-host').attachShadow({mode:'open'});root.innerHTML='<section role="dialog" style="position:fixed;bottom:0;right:0;background:white;padding:10px">Cookie preference <button>Accept</button></section>';</script></body></html>`);});
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'capture-skill-test-'));
 try{
  await capture(`http://127.0.0.1:${site.address().port}/`,dir,process.env.DESIGN_TEST_PLAYWRIGHT);
  const e=JSON.parse(fs.readFileSync(path.join(dir,'evidence.json'),'utf8'));assert.equal(e.captureVersion,3);
  for(const sample of e.samples){
   assert.ok(sample.elements.some(el=>el.tag==='h1'));
   assert.ok(sample.elements.some(el=>el.group==='technical-text'&&el.tag==='code'));
   assert.ok(sample.elements.some(el=>el.group==='text-fragments'&&el.styles.color==='rgb(18, 52, 86)'));
   assert.ok(!sample.elements.some(el=>el.text==='Hidden text'));
   assert.ok(sample.coverage.navigation.truncated);assert.ok(sample.coverage.footer.available>0);
   assert.ok(sample.overlays.some(o=>o.shadow));assert.equal(sample.rootCustomProperties['--brand'],'#135791');
  }
  assert.ok(e.source.externalStylesheets.some(x=>x.status==='read'));
  assert.ok(e.source.breakpoints.some(x=>x.includes('800px')));
  assert.ok(!e.source.breakpoints.some(x=>x.includes('display: grid')));
  assert.ok(e.source.containerQueries.some(x=>x.includes('400px')));
  assert.ok(!e.states.some(s=>s.baseline?.text==='Reject optional'));
  const state=e.states.find(s=>s.baseline?.text==='Get started');assert.ok(state?.focus);assert.equal(state.focus.focusVisible,true);assert.equal(state.focus.hovered,false);
 }finally{await close(site);await close(cssServer);fs.rmSync(dir,{recursive:true,force:true});}
});
test('capture finds nested CTA glyphs, non-heading display text and anonymous consent without flagging static cookie links',async()=>{
 const browser=await launchBrowser(process.env.DESIGN_TEST_PLAYWRIGHT);try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.setContent(`<main><div style="font:64px Georgia">A real hero</div><button style="color:blue;background:transparent"><span style="color:black;background:white">Get started</span></button></main><footer><a id="cookie-manager" href="#">Manage Cookies</a></footer><div style="position:fixed;bottom:0;right:0;width:400px;height:200px;background:white">We use cookies <button>Reject optional</button></div>`);
 const sample=await page.evaluate(captureDom,properties);
 assert.ok(sample.elements.some(el=>el.group==='display-text'&&el.directText==='A real hero'));
 assert.ok(sample.elements.some(el=>el.group==='text-fragments'&&el.directText==='Get started'&&el.styles.color==='rgb(0, 0, 0)'));
 assert.equal(sample.overlays.length,1);assert.ok(sample.overlays[0].text.includes('Reject optional'));
 assert.ok(sample.elements.find(el=>el.text==='Reject optional').inOverlay);
 assert.ok(!sample.overlays.some(el=>el.selector==='#cookie-manager'));
 assert.equal(sample.elements.find(el=>el.tag==='button'&&el.text==='Get started').textOwner,false);
 await page.evaluate(()=>{const host=document.createElement('div');host.id='transcend-consent-manager';host.style.position='fixed';document.documentElement.append(host);host.attachShadow({mode:'closed'}).innerHTML='<div style="position:fixed;top:0;left:0">Cookie settings</div>';});
 const opaque=await page.evaluate(captureDom,properties);assert.equal(opaque.opaqueConsentHosts.length,1);assert.equal(opaque.opaqueConsentHosts[0].shadowAccess,'none-or-closed');assert.ok(!opaque.overlays.some(x=>x.selector==='#transcend-consent-manager'));
 }finally{await browser.close();}
});
test('pending font does not prevent bounded native screenshot, and the limitation is recorded',async()=>{
 const browser=await launchBrowser(process.env.DESIGN_TEST_PLAYWRIGHT);const dir=fs.mkdtempSync(path.join(os.tmpdir(),'design-font-test-'));try{
 const page=await browser.newPage();await page.route('https://font.invalid/**',()=>{});
 await page.setContent(`<style>@font-face{font-family:Pending;src:url(https://font.invalid/font.woff2)}p{font-family:Pending}</style><p>Visible snapshot while font loads</p>`,{waitUntil:"domcontentloaded"});
 const notes=[];const file=path.join(dir,'pending.png');await boundedScreenshot(page,file,false,notes,100);
 assert.equal(fs.readFileSync(file).subarray(1,4).toString(),'PNG');assert.ok(notes.some(x=>x.includes('font status: loading')));
 }finally{await browser.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('an inaccessible page retains failure diagnostics without successful evidence',async()=>{
 const site=await server((req,res)=>{res.statusCode=403;res.end('Access denied');});const dir=fs.mkdtempSync(path.join(os.tmpdir(),'design-failure-test-'));try{
 await assert.rejects(capture(`http://127.0.0.1:${site.address().port}/`,dir,process.env.DESIGN_TEST_PLAYWRIGHT),/403/);
 const failure=JSON.parse(fs.readFileSync(path.join(dir,'failure.json'),'utf8'));assert.equal(failure.complete,false);assert.equal(failure.status,403);assert.ok(!fs.existsSync(path.join(dir,'evidence.json')));
 }finally{await close(site);fs.rmSync(dir,{recursive:true,force:true});}
});

test('read interrupted by a normal document navigation settles once without re-requesting the URL',async()=>{
 const browser=await launchBrowser(process.env.DESIGN_TEST_PLAYWRIGHT);const site=await server((req,res)=>{res.setHeader('content-type','text/html');res.end('<title>Final document</title><main>Public destination</main>');});try{
 const page=await browser.newPage();await page.setContent('<title>Initial document</title>');const notes=[];
 const read=stableEvaluate(page,async()=>{await new Promise(r=>setTimeout(r,600));return document.title;},undefined,notes);
 await new Promise(r=>setTimeout(r,100));await page.goto(`http://127.0.0.1:${site.address().port}/`);
 assert.equal(await read,'Final document');assert.equal(notes.length,1);
 }finally{await browser.close();await close(site);}
});
