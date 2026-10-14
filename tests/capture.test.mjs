import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {capture} from '../scripts/browser.mjs';
async function server(handler){const s=http.createServer(handler);await new Promise(r=>s.listen(0,'127.0.0.1',r));return s;}
const close=s=>new Promise(resolve=>s.close(resolve));
test('capture preserves heading/technical roles under crowded navigation, reads cross-origin CSS, separates focus and finds shadow consent',async()=>{
 const cssServer=await server((req,res)=>{res.setHeader('content-type','text/css');res.end(':root{--brand:#135791;--content:60rem} body{font-family:Arial,sans-serif;color:#222} .Navbar a{color:#222;display:inline-block} .cta{background:#111;color:white;padding:12px 24px;border-radius:8px} .cta:hover{background:#444} .cta:focus-visible{outline:3px solid #2468ac} h1{color:green} h1 span{color:#123456} code{font-family:monospace} .hidden-parent{opacity:0} @media(min-width:800px){h1{font-size:64px}} @supports(display:grid){.grid{display:grid}} @container(min-width:400px){.container{padding:24px}}');});
 const cssUrl=`http://127.0.0.1:${cssServer.address().port}/style.css`;
 const site=await server((req,res)=>{res.setHeader('content-type','text/html');res.end(`<!doctype html><html><head><title>Capture Fixture</title><link rel="stylesheet" href="${cssUrl}"></head><body><div class="Navbar">${'<a href="#">Nav</a>'.repeat(260)}</div><main><h1><span>True headline</span></h1><p>Body copy</p><code>git push</code>${'<div><div><div>'.repeat(4)}<a class="cta" href="#">Get started</a>${'</div></div></div>'.repeat(4)}<div class="hidden-parent"><p>Hidden text</p></div></main><div class="Footer"><a href="#">Terms</a></div><div id="consent-host"></div><script>const root=document.getElementById('consent-host').attachShadow({mode:'open'});root.innerHTML='<section role="dialog" style="position:fixed;bottom:0;right:0;background:white;padding:10px">Cookie preference <button>Accept</button></section>';</script></body></html>`);});
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'capture-skill-test-'));
 try{
  await capture(`http://127.0.0.1:${site.address().port}/`,dir,process.env.DESIGN_TEST_PLAYWRIGHT);
  const e=JSON.parse(fs.readFileSync(path.join(dir,'evidence.json'),'utf8'));assert.equal(e.captureVersion,2);
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
  const state=e.states.find(s=>s.baseline?.text==='Get started');assert.ok(state?.focus);assert.equal(state.focus.focusVisible,true);assert.equal(state.focus.hovered,false);
 }finally{await close(site);await close(cssServer);fs.rmSync(dir,{recursive:true,force:true});}
});
