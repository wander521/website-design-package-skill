import fs from 'node:fs/promises';
import path from 'node:path';
import {captureDom,readCssom} from './capture-dom.mjs';
import {properties,boundedScreenshot,stableEvaluate} from './capture.mjs';

// Explicit selectors only. The caller must first identify a reversible popup
// trigger in the screenshot/DOM; this never searches for buttons to click.
export async function inspectControls(launchBrowser,url,out,modulePath,trigger,colorScheme='light'){
 const parsed=new URL(url);if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password)throw new Error('Use an HTTP(S) URL without credentials.');
 if(!trigger)throw new Error('An explicitly inspected --trigger selector is required.');
 const browser=await launchBrowser(modulePath);const samples=[],interactions=[],notes=[],nativeDialogs=[];let page;
 await fs.mkdir(out,{recursive:true});await fs.rm(path.join(out,'evidence.json'),{force:true});
 try{
  const context=await browser.newContext({colorScheme});let source,status,finalUrl;
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
   page=await context.newPage();await page.setViewportSize(viewport);
   page.on('dialog',async dialog=>{nativeDialogs.push({type:dialog.type(),message:dialog.message().slice(0,120)});await dialog.dismiss();});
   const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});status=response?.status();if(!response||status>=400)throw new Error('Cannot inspect an error page.');
   await page.waitForLoadState('load',{timeout:6000}).catch(()=>{});
   await stableEvaluate(page,async()=>{await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,3000))]);},undefined,notes);
   if(/just a moment|access denied|attention required|security verification/i.test(await page.title()))throw new Error('Access challenge; do not inspect it as brand UI.');
   const control=page.locator(trigger);if(await control.count()!==1)throw new Error('Trigger must identify exactly one element.');
   await control.scrollIntoViewIfNeeded({timeout:2500});await control.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest'}));
   if(!notes.includes('Triggers were centered for inspection; edge collision behavior was not verified.'))notes.push('Triggers were centered for inspection; edge collision behavior was not verified.');
   const identity=await control.evaluate(el=>({tag:el.tagName.toLowerCase(),native:el.tagName==='SELECT'||(el.tagName==='INPUT'&&el.hasAttribute('list')),disabled:el.matches(':disabled,[aria-disabled="true"]'),submit:Boolean(el.form&&['submit','image','reset'].includes(el.type)),popup:el.getAttribute('aria-haspopup'),role:el.getAttribute('role'),target:el.getAttribute('aria-controls')||el.getAttribute('popovertarget')||el.getAttribute('commandfor'),declarative:el.hasAttribute('popovertarget')||el.getAttribute('command')==='show-modal'}));
   if(identity.disabled||identity.submit)throw new Error('Disabled/submitting/reset controls cannot be inspected by activation.');
   if(!identity.native&&!identity.declarative&&!['dialog','menu','listbox','true'].includes(identity.popup)&&identity.role!=='combobox')throw new Error('Trigger must declare dialog/menu/listbox/combobox/popover semantics; use a browser-tool review for ambiguous controls.');
   const before=await page.evaluate(captureDom,properties);Object.assign(before,{phase:'closed',capturedAt:new Date().toISOString(),finalUrl:page.url(),captureVersion:4,sourceCapture:path.basename(out)+'/evidence.json'});samples.push(before);
   const prefix=viewport.width===1440?'desktop':'mobile';await boundedScreenshot(page,path.join(out,prefix+'-closed.png'),false,notes);
   const originalUrl=page.url();
   if(identity.native){interactions.push({viewport,trigger,status:'native-picker-uninspected',note:'Closed field and options recorded. Native popup is not page DOM; no option was chosen.'});}
   else{
    await control.click({timeout:2500});await page.waitForTimeout(200);
    if(nativeDialogs.length)throw new Error('Trigger opened a browser alert/confirm/prompt; no brand popup styles were captured.');
    if(page.url()!==originalUrl)throw new Error('Trigger navigated; stop inspection instead of extracting the destination.');
    const opened=await page.evaluate(captureDom,properties);Object.assign(opened,{phase:'opened',capturedAt:new Date().toISOString(),finalUrl:page.url(),captureVersion:4,sourceCapture:path.basename(out)+'/evidence.json'});samples.push(opened);
    const beforeVisible=new Set(before.floatingControls.filter(c=>c.rendered).map(c=>c.selector));
    const targets=(identity.target||'').split(/\s+/).filter(Boolean);
    const panels=opened.floatingControls.filter(c=>['dialog','menu','listbox','popover'].includes(c.kind)&&c.viewportVisible&&(targets.length?targets.includes(c.id):!beforeVisible.has(c.selector)));
    if(!panels.length)throw new Error('No associated visible popup was observed after activation.');
    await boundedScreenshot(page,path.join(out,prefix+'-opened.png'),false,notes);
    const items=panels.flatMap(p=>p.items||[]).filter(i=>!i.disabled&&['option','menuitem','menuitemcheckbox','menuitemradio'].includes(i.role));const item=items.find(i=>i.selected!=='true')||items[0];
    if(item){await page.locator(item.selector).hover({timeout:1500});await page.waitForTimeout(150);const hovered=await page.evaluate(captureDom,properties);Object.assign(hovered,{phase:'item-hover',capturedAt:new Date().toISOString(),finalUrl:page.url(),captureVersion:4,sourceCapture:path.basename(out)+'/evidence.json'});samples.push(hovered);}
    await page.keyboard.press('Escape');await page.waitForTimeout(150);
    const closed=await page.evaluate(captureDom,properties);Object.assign(closed,{phase:'after-escape',capturedAt:new Date().toISOString(),finalUrl:page.url(),captureVersion:4,sourceCapture:path.basename(out)+'/evidence.json'});samples.push(closed);
    const focusRestored=await control.evaluate(el=>document.activeElement===el);
    const stillOpen=closed.floatingControls.some(c=>panels.some(p=>p.selector===c.selector)&&c.viewportVisible);
    interactions.push({viewport,trigger,status:'observed',panels:panels.map(p=>p.selector),focusRestoredAfterEscape:focusRestored,closedAfterEscape:!stillOpen,note:'Only trigger activation, optional item hover, and Escape; no option/action/form was submitted.'});
   }
   finalUrl=page.url();const css=await page.evaluate(readCssom);
   source={title:await page.title(),prefersDark:await page.evaluate(()=>matchMedia('(prefers-color-scheme: dark)').matches),declarations:css.declarations.slice(0,20000),declarationCount:css.declarations.length,declarationsTruncated:css.declarations.length>20000,inaccessibleStylesheets:css.inaccessibleStylesheets};
   await page.close();page=null;
  }
  const evidence={schemaVersion:1,captureVersion:4,requestedUrl:url,finalUrl,status,colorScheme,capturedAt:new Date().toISOString(),source,samples,states:[],controlInteractions:interactions,notes,nativeDialogs};
  await fs.writeFile(path.join(out,'evidence.json'),JSON.stringify(evidence,null,2));
  return{evidence:path.join(out,'evidence.json'),interactions,notes};
 }catch(error){if(page)await boundedScreenshot(page,path.join(out,'failure.png'),false,notes).catch(()=>{});await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({complete:false,requestedUrl:url,error:error.message.split('\n')[0],samples,interactions,nativeDialogs,notes},null,2));throw error;}
 finally{await browser.close();}
}
