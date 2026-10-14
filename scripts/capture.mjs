import fs from 'node:fs/promises';
import path from 'node:path';
import {captureDom,readCssom,parseCssText} from './capture-dom.mjs';

export const properties=['color','background-color','background-image','font-family','font-size','font-weight','line-height','letter-spacing','font-feature-settings','font-variation-settings','mix-blend-mode','background-clip','-webkit-text-fill-color','filter','text-transform','text-decoration-line','opacity','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','gap','row-gap','column-gap','border-radius','border-top-color','border-top-width','border-top-style','box-shadow','max-width','width','height','min-height','display','position','grid-template-columns','outline','outline-color','outline-width','outline-style','outline-offset','transition-duration','transition-timing-function','animation-name','animation-duration','animation-timing-function','cursor','transform'];
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function settle(page,ms=250){await page.evaluate(async()=>{await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,3000))]);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});await delay(ms);}
async function sampleStates(page,sample){
  const candidates=[];const transparent=value=>value==='transparent'||/^rgba\([^)]*,\s*0\)$/.test(value)||/\/\s*0\s*\)$/.test(value);
  const actions=sample.elements.filter(el=>['a','button','input','textarea'].includes(el.tag)&&el.rect.x>=0&&el.rect.y>=0&&el.rect.y<sample.viewport.height);
  // One navigation, one prominent colored action, and one field, if present.
  for(const choice of [actions.find(x=>x.group==='navigation'&&x.text.trim().length>1),actions.find(x=>x.group==='actions'&&x.text.trim().length>1&&!transparent(x.styles['background-color'])),actions.find(x=>x.group==='fields')])if(choice&&!candidates.some(x=>x.selector===choice.selector))candidates.push(choice);
  const states=[];
  for(const target of candidates){
    const locator=page.locator(target.selector);
    const read=state=>locator.evaluate((el,{props,state})=>({state,selector:el.id?'#'+el.id:null,tag:el.tagName.toLowerCase(),text:(el.innerText||el.value||'').slice(0,80),focusVisible:el.matches(':focus-visible'),hovered:el.matches(':hover'),focused:document.activeElement===el,styles:Object.fromEntries(props.map(p=>[p,getComputedStyle(el).getPropertyValue(p).trim()]))}),{props:properties,state});
    try{
      if(await locator.count()!==1)throw new Error('State selector must identify exactly one element');
      const identity=await locator.evaluate(el=>({tag:el.tagName.toLowerCase(),text:(el.innerText||el.textContent||'').trim().slice(0,120)}));
      if(identity.tag!==target.tag||identity.text!==target.text)throw new Error('State selector identity changed; target not sampled');
      await page.evaluate(()=>document.activeElement?.blur?.());await page.mouse.move(0,sample.viewport.height-1);await settle(page,150);
      const baseline=await read('default');await locator.hover({timeout:1800});await settle(page,220);const hover=await read('hover');
      await page.mouse.move(0,sample.viewport.height-1);await settle(page,150);
      await locator.focus({timeout:1800});await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');await settle(page,220);
      const focused=await locator.evaluate(el=>document.activeElement===el);
      const focus=focused?await read('keyboard-focus'):null;
      states.push({selector:target.selector,viewport:sample.viewport,baseline,hover,focus,note:focus?undefined:'Keyboard navigation did not return to target; focus was not sampled.'});
    }catch(error){states.push({selector:target.selector,viewport:sample.viewport,error:error.message.split('\n')[0]});}
  }
  await page.evaluate(()=>{document.activeElement?.blur?.();scrollTo(0,0);});await page.mouse.move(0,0);
  return states;
}
function prioritize(declarations){
  const score=d=>d.selector==='@font-face'?0:d.property.startsWith('--')?1:/(^|[\s,])(html|body|h1|h2|button|input)(?:[\s,:.#[]|$)/.test(d.selector)?2:3;
  return declarations.map((d,index)=>({d,index,score:score(d)})).sort((a,b)=>a.score-b.score||a.index-b.index).slice(0,20000).map(x=>x.d);
}
export async function captureSite(launchBrowser,url,out,modulePath,colorScheme='light'){
  const parsed=new URL(url);if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password)throw new Error('Use an HTTP(S) URL without credentials.');
  const browser=await launchBrowser(modulePath);
  try{
    await fs.mkdir(out,{recursive:true});
    const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme});const page=await context.newPage();
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});if(!response||response.status()>=400)throw new Error(`Website returned ${response?.status()}; do not extract an error page.`);
    await page.waitForLoadState('load',{timeout:8000}).catch(()=>{});await settle(page,500);
    const title=await page.title();if(/just a moment|attention required|access denied|security verification/i.test(title))throw new Error('Access challenge detected; do not extract challenge-page styles.');
    const samples=[],states=[],notes=[];
    for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
      await page.setViewportSize(viewport);await settle(page,300);
      const pageHeight=await page.evaluate(()=>document.documentElement.scrollHeight);const limit=Math.min(pageHeight,12000);let steps=0;
      // Allow actual intersection observers and transitions to run at each bounded scroll stop.
      for(let y=0;y<limit&&steps<18;y+=Math.max(650,viewport.height*0.85),steps++){await page.evaluate(y=>scrollTo(0,y),y);await delay(140);}
      await page.evaluate(()=>scrollTo(0,0));await settle(page,450);
      let sample=await page.evaluate(captureDom,properties);sample.scrollCoverage={visitedTo:limit,documentHeight:pageHeight,capped:pageHeight>limit};
      states.push(...await sampleStates(page,sample));await settle(page,200);
      sample=Object.assign(await page.evaluate(captureDom,properties),{scrollCoverage:sample.scrollCoverage});
      const screenshotPath=path.join(out,viewport.width===1440?'desktop.png':'mobile.png');
      await page.screenshot({path:screenshotPath,fullPage:true});
      const after=await page.evaluate(captureDom,properties);
      if(JSON.stringify(sample.overlays)!==JSON.stringify(after.overlays)){
        notes.push(`Overlay changed while capturing ${viewport.width}px; refreshed the sample and screenshot once.`);
        sample=Object.assign(after,{scrollCoverage:sample.scrollCoverage});await page.screenshot({path:screenshotPath,fullPage:true});
      }
      samples.push(sample);
      await page.screenshot({path:path.join(out,viewport.width===1440?'desktop-top.png':'mobile-top.png'),fullPage:false});
    }
    const cssom=await page.evaluate(readCssom);const externalResults=[];
    // Fetch only observed public stylesheet URLs, using this fresh browser context (no user cookies).
    for(const href of cssom.inaccessibleStylesheets.slice(0,12)){
      try{
        const remote=new URL(href);if(!['https:','http:'].includes(remote.protocol)||remote.username||remote.password)throw new Error('Unsupported stylesheet URL');
        const response=await context.request.get(href,{timeout:6000});if(!response.ok())throw new Error(`HTTP ${response.status()}`);
        const body=await response.body();if(body.length>2_000_000)throw new Error('Stylesheet exceeds 2 MB capture limit');
        const contentType=response.headers()['content-type']||'';if(!/css|text\/plain/i.test(contentType))throw new Error('Not a CSS response');
        const parsed=await page.evaluate(parseCssText,body.toString('utf8'));
        cssom.declarations.push(...parsed.declarations.map(d=>({...d,href})));cssom.conditions.push(...parsed.conditions);
        externalResults.push({href,status:'read',declarations:parsed.declarations.length});
      }catch(error){externalResults.push({href,status:'unavailable',error:error.message.split('\n')[0]});}
    }
    const source=await page.evaluate(()=>({title:document.title,description:document.querySelector('meta[name="description"]')?.content||'',language:document.documentElement.lang,text:document.body.innerText.slice(0,24000),links:[...document.querySelectorAll('link,a[href]')].map(el=>({href:el.href,rel:el.rel||'',text:el.textContent.trim().slice(0,80)})).filter(x=>/design\.md(?:$|[?#])|design-tokens/i.test(x.href)).slice(0,20)}));
    const media=cssom.conditions.filter(c=>c.kind==='CSSMediaRule'),containers=cssom.conditions.filter(c=>c.kind==='CSSContainerRule');
    Object.assign(source,{declarations:prioritize(cssom.declarations),declarationCount:cssom.declarations.length,declarationsTruncated:cssom.declarations.length>20000,breakpoints:[...new Set(media.map(c=>c.value))],containerQueries:[...new Set(containers.map(c=>c.value))],inaccessibleStylesheets:cssom.inaccessibleStylesheets,externalStylesheets:externalResults});
    if(source.declarationsTruncated)notes.push('CSS capture is capped at 20000 declarations, prioritized for fonts, named custom properties and core elements; computed values and root variables are recorded separately.');
    if(source.inaccessibleStylesheets.length>12)notes.push('Cross-origin CSS capture capped at 12 observed stylesheets.');
    if(samples.some(s=>Object.values(s.coverage).some(g=>g.truncated)||s.scrollCoverage.capped))notes.push('Some sampling groups or scroll coverage reached their stated limits; coverage is partial.');
    if(samples.some(s=>s.overlays.length))notes.push('A visible consent/modal overlay was recorded; no consent was submitted or dismissed.');
    const evidence={schemaVersion:1,captureVersion:2,requestedUrl:url,finalUrl:page.url(),capturedAt:new Date().toISOString(),colorScheme,status:response.status(),source,samples,states,notes};
    await fs.writeFile(path.join(out,'evidence.json'),JSON.stringify(evidence,null,2));await fs.writeFile(path.join(out,'page.html'),await page.content());
    return{evidence:path.join(out,'evidence.json'),captureVersion:2,finalUrl:evidence.finalUrl,states:states.filter(x=>x.hover).length,externalCss:externalResults.filter(x=>x.status==='read').length};
  }finally{await browser.close();}
}
