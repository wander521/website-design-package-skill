import fs from 'node:fs/promises';
import path from 'node:path';
import {captureDom,readCssom,parseCssText} from './capture-dom.mjs';

export const properties=['color','background-color','background-image','font-family','font-size','font-weight','line-height','letter-spacing','font-feature-settings','font-variation-settings','mix-blend-mode','background-clip','-webkit-text-fill-color','filter','text-transform','text-decoration-line','opacity','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','gap','row-gap','column-gap','border-radius','border-top-color','border-top-width','border-top-style','box-shadow','max-width','width','height','min-height','display','position','grid-template-columns','outline','outline-color','outline-width','outline-style','outline-offset','transition-duration','transition-timing-function','animation-name','animation-duration','animation-timing-function','cursor','transform'];
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function stableEvaluate(page,fn,arg,notes=[]){
  try{return await page.evaluate(fn,arg);}
  catch(error){
    if(!/Execution context was destroyed|Cannot find context with specified id/i.test(error.message))throw error;
    await page.waitForLoadState('domcontentloaded',{timeout:8000});await delay(250);
    if(/just a moment|attention required|access denied|security verification/i.test(await page.title()))throw new Error('Access challenge after navigation; do not extract challenge-page styles.');
    notes.push('A normal document navigation interrupted a read; retried that read once after DOMContentLoaded. No URL was re-requested.');
    return page.evaluate(fn,arg);
  }
}
async function settle(page,ms=250,notes=[]){await stableEvaluate(page,async()=>{await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,3000))]);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));},undefined,notes);await delay(ms);}
async function sampleStates(page,sample){
  const candidates=[];const transparent=value=>value==='transparent'||/^rgba\([^)]*,\s*0\)$/.test(value)||/\/\s*0\s*\)$/.test(value);
  const actions=sample.elements.filter(el=>!el.inOverlay&&['a','button','input','textarea'].includes(el.tag)&&el.rect.x>=0&&el.rect.y>=0&&el.rect.y<sample.viewport.height);
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
      await page.evaluate(()=>document.activeElement?.blur?.());await page.mouse.move(-10,-10);await settle(page,150);
      const baseline=await read('default');await locator.hover({timeout:1800});await settle(page,220);const hover=await read('hover');
      await page.mouse.move(-10,-10);await settle(page,150);
      await locator.focus({timeout:1800});await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');await settle(page,220);
      const focused=await locator.evaluate(el=>document.activeElement===el);
      const focus=focused?await read('keyboard-focus'):null;
      states.push({selector:target.selector,viewport:sample.viewport,baseline,hover,focus,note:focus?undefined:'Keyboard navigation did not return to target; focus was not sampled.'});
    }catch(error){states.push({selector:target.selector,viewport:sample.viewport,error:error.message.split('\n')[0]});}
  }
  await page.keyboard.press('Escape');await page.evaluate(()=>{document.activeElement?.blur?.();scrollTo(0,0);});await page.mouse.move(-10,-10);
  return states;
}
export async function boundedScreenshot(page,file,fullPage,notes,timeout=8000){
  try{await page.screenshot({path:file,fullPage,timeout});return;}
  catch(error){if(error.name!=='TimeoutError')throw error;}
  const client=await page.context().newCDPSession(page);let timer;
  try{
    const viewport=page.viewportSize();const metrics=await client.send('Page.getLayoutMetrics');
    const width=fullPage?Math.min(metrics.cssContentSize.width,8192):viewport.width;
    const height=fullPage?Math.min(metrics.cssContentSize.height,32767):viewport.height;
    const result=await Promise.race([client.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:fullPage,clip:{x:0,y:0,width,height,scale:1}}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Native screenshot timed out')),8000);})]);
    await fs.writeFile(file,Buffer.from(result.data,'base64'));
    const fonts=await page.evaluate(()=>document.fonts.status);
    notes.push(`Screenshot ${path.basename(file)} used native capture after timeout; font status: ${fonts}. Pending-font imagery is a limited snapshot; inspect before choosing typography.${fullPage&&(metrics.cssContentSize.height>height||metrics.cssContentSize.width>width)?' Screenshot dimensions capped.':''}`);
  }finally{clearTimeout(timer);await client.detach();}
}
function prioritize(declarations){
  const score=d=>d.selector==='@font-face'?0:d.property.startsWith('--')?1:/(^|[\s,])(html|body|h1|h2|button|input)(?:[\s,:.#[]|$)/.test(d.selector)?2:3;
  return declarations.map((d,index)=>({d,index,score:score(d)})).sort((a,b)=>a.score-b.score||a.index-b.index).slice(0,20000).map(x=>x.d);
}
export async function captureSite(launchBrowser,url,out,modulePath,colorScheme='light'){
  const parsed=new URL(url);if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password)throw new Error('Use an HTTP(S) URL without credentials.');
  const browser=await launchBrowser(modulePath);
  let page,lastStatus,samples=[],states=[],notes=[];
  try{
    await fs.mkdir(out,{recursive:true});await fs.rm(path.join(out,'evidence.json'),{force:true});
    const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme});page=await context.newPage();page.on('response',res=>{if(res.request().isNavigationRequest()&&res.frame()===page.mainFrame())lastStatus=res.status();});
    const evaluate=(fn,arg)=>stableEvaluate(page,fn,arg,notes);const pause=ms=>settle(page,ms,notes);
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});if(!response||response.status()>=400)throw new Error(`Website returned ${response?.status()}; do not extract an error page.`);
    await page.waitForLoadState('load',{timeout:8000}).catch(()=>{});await pause(500);
    const title=await page.title();if(/just a moment|attention required|access denied|security verification/i.test(title))throw new Error('Access challenge detected; do not extract challenge-page styles.');

    for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
      await page.setViewportSize(viewport);await pause(300);
      const pageHeight=await evaluate(()=>document.documentElement.scrollHeight);const limit=Math.min(pageHeight,12000);let steps=0;
      // Allow actual intersection observers and transitions to run at each bounded scroll stop.
      for(let y=0;y<limit&&steps<18;y+=Math.max(650,viewport.height*0.85),steps++){await evaluate(y=>scrollTo(0,y),y);await delay(140);}
      await evaluate(()=>scrollTo(0,0));await pause(450);
      let sample=await evaluate(captureDom,properties);sample.scrollCoverage={visitedTo:limit,documentHeight:pageHeight,capped:pageHeight>limit};
      const overlaysBeforeStates=sample.overlays;
      states.push(...await sampleStates(page,sample));await pause(200);
      sample=Object.assign(await evaluate(captureDom,properties),{scrollCoverage:sample.scrollCoverage,overlaysBeforeStates});
      if(JSON.stringify(overlaysBeforeStates)!==JSON.stringify(sample.overlays))notes.push(`Overlay visibility changed during hover/focus/Escape cleanup at ${viewport.width}px; before-state observations are preserved in overlaysBeforeStates.`);
      const screenshotPath=path.join(out,viewport.width===1440?'desktop.png':'mobile.png');
      samples.push(sample);
      await boundedScreenshot(page,screenshotPath,true,notes);
      const after=await evaluate(captureDom,properties);
      if(JSON.stringify(sample.overlays)!==JSON.stringify(after.overlays)){
        notes.push(`Overlay changed while capturing ${viewport.width}px; refreshed the sample and screenshot once.`);
        sample=Object.assign(after,{scrollCoverage:sample.scrollCoverage,overlaysBeforeStates});await boundedScreenshot(page,screenshotPath,true,notes);
      }
      samples[samples.length-1]=sample;
      await boundedScreenshot(page,path.join(out,viewport.width===1440?'desktop-top.png':'mobile-top.png'),false,notes);
    }
    const cssom=await evaluate(readCssom);const externalResults=[];
    // Fetch only observed public stylesheet URLs, using this fresh browser context (no user cookies).
    for(const href of cssom.inaccessibleStylesheets.slice(0,12)){
      try{
        const remote=new URL(href);if(!['https:','http:'].includes(remote.protocol)||remote.username||remote.password)throw new Error('Unsupported stylesheet URL');
        const response=await context.request.get(href,{timeout:6000});if(!response.ok())throw new Error(`HTTP ${response.status()}`);
        const body=await response.body();if(body.length>2_000_000)throw new Error('Stylesheet exceeds 2 MB capture limit');
        const contentType=response.headers()['content-type']||'';if(!/css|text\/plain/i.test(contentType))throw new Error('Not a CSS response');
        const parsed=await evaluate(parseCssText,body.toString('utf8'));
        cssom.declarations.push(...parsed.declarations.map(d=>({...d,href})));cssom.conditions.push(...parsed.conditions);
        externalResults.push({href,status:'read',declarations:parsed.declarations.length});
      }catch(error){externalResults.push({href,status:'unavailable',error:error.message.split('\n')[0]});}
    }
    const source=await evaluate(()=>({title:document.title,description:document.querySelector('meta[name="description"]')?.content||'',language:document.documentElement.lang,text:document.body.innerText.slice(0,24000),links:[...document.querySelectorAll('link,a[href]')].map(el=>({href:el.href,rel:el.rel||'',text:el.textContent.trim().slice(0,80)})).filter(x=>/design\.md(?:$|[?#])|design-tokens/i.test(x.href)).slice(0,20)}));
    const media=cssom.conditions.filter(c=>c.kind==='CSSMediaRule'),containers=cssom.conditions.filter(c=>c.kind==='CSSContainerRule');
    Object.assign(source,{declarations:prioritize(cssom.declarations),declarationCount:cssom.declarations.length,declarationsTruncated:cssom.declarations.length>20000,breakpoints:[...new Set(media.map(c=>c.value))],containerQueries:[...new Set(containers.map(c=>c.value))],inaccessibleStylesheets:cssom.inaccessibleStylesheets,externalStylesheets:externalResults});
    if(source.declarationsTruncated)notes.push('CSS capture is capped at 20000 declarations, prioritized for fonts, named custom properties and core elements; computed values and root variables are recorded separately.');
    if(source.inaccessibleStylesheets.length>12)notes.push('Cross-origin CSS capture capped at 12 observed stylesheets.');
    if(samples.some(s=>Object.values(s.coverage).some(g=>g.truncated)||s.scrollCoverage.capped))notes.push('Some sampling groups or scroll coverage reached their stated limits; coverage is partial.');
    if(samples.some(s=>s.opaqueConsentHosts?.length))notes.push('Potential fixed consent hosts have no readable internal DOM; inspect screenshots. Host presence alone does not prove a visible overlay, and internal styles were not captured.');
    if(samples.some(s=>s.overlays.length))notes.push('A visible consent/modal overlay was recorded; no consent action was clicked. State sampling uses hover, keyboard focus and Escape cleanup.');
    const evidence={schemaVersion:1,captureVersion:3,requestedUrl:url,finalUrl:page.url(),capturedAt:new Date().toISOString(),colorScheme,status:lastStatus??response.status(),source,samples,states,notes};
    await fs.writeFile(path.join(out,'evidence.json'),JSON.stringify(evidence,null,2));await fs.writeFile(path.join(out,'page.html'),await page.content());
    return{evidence:path.join(out,'evidence.json'),captureVersion:3,finalUrl:evidence.finalUrl,states:states.filter(x=>x.hover).length,externalCss:externalResults.filter(x=>x.status==='read').length};
  }catch(error){
    // Failed/partial captures cannot masquerade as compilable evidence.
    await fs.mkdir(out,{recursive:true});
    const failure={schemaVersion:1,captureVersion:3,complete:false,requestedUrl:url,finalUrl:page?.url(),status:lastStatus,capturedAt:new Date().toISOString(),error:error.message.split('\n')[0],samples,states,notes};
    await fs.writeFile(path.join(out,'failure.json'),JSON.stringify(failure,null,2));
    if(page)await fs.writeFile(path.join(out,'partial-page.html'),await page.content().catch(()=>''));
    throw error;
  }finally{await browser.close();}
}
