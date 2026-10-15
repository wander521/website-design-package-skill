import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {parseDesignMd} from './vendor/lib/parser/parse-design-md.mjs';
import {exportToCss} from './vendor/lib/export/export-css.mjs';
import {launchBrowser,properties} from './browser.mjs';
import {captureDom} from './capture-dom.mjs';
import {boundedScreenshot} from './capture.mjs';

const categories=['palette','typography','spacing','shape','layout','imagery','controls'];
const viewports=[{id:'desktop',width:1440,height:1000},{id:'mobile',width:390,height:844}];
const hash=s=>createHash('sha256').update(s).digest('hex');
const safeValue=s=>typeof s==='string'&&s.length>0&&s.length<2000&&!/[;{}<>]|\/\*|url\s*\(/i.test(s);

// Bind every expectation to the supplied document, never to the target stylesheet.
export function prepareAudit(markdown,plan){
  if(plan.schemaVersion!==1||!Array.isArray(plan.checks)||!plan.checks.length||plan.checks.length>300)throw new Error('A schemaVersion 1 plan with 1–300 checks is required');
  if(plan.colorScheme&&!['light','dark'].includes(plan.colorScheme))throw new Error('colorScheme must be light or dark');
  const {tokens}=parseDesignMd(markdown);
  const entries=[...exportToCss(tokens).matchAll(/^\s*(--[\w-]+): (.+);$/gm)].map(m=>[m[1],m[2]]);
  if(new Set(entries.map(([name])=>name)).size!==entries.length)throw new Error('Ambiguous duplicate exported design tokens');
  const variables=Object.fromEntries(entries);
  for(const value of Object.values(variables))if(!safeValue(value))throw new Error('Unsafe design token');
  const ids=new Set();
  for(const c of plan.checks){
    if(typeof c.id!=='string'||!c.id||ids.has(c.id))throw new Error('Check IDs must be unique strings');ids.add(c.id);
    if(!categories.includes(c.category)||typeof c.selector!=='string'||!c.selector||!properties.includes(c.property))throw new Error(`Invalid check ${c.id}: category, selector and supported CSS property required`);
    if(c.pseudo&&!['::before','::after','::placeholder','::backdrop'].includes(c.pseudo))throw new Error('Unsupported pseudo element');
    if(c.token!==undefined){
      if(c.expected!==undefined||c.sourceQuote!==undefined||!Object.hasOwn(variables,c.token))throw new Error(`Unknown or ambiguous design token: ${c.token}`);
    }else if(!safeValue(c.expected)||!c.sourceQuote||!markdown.includes(c.sourceQuote)||!c.sourceQuote.includes(c.expected))throw new Error(`Expected value for ${c.id} needs an exact sourceQuote containing that value`);
    if(c.tolerance!==undefined&&(!Number.isFinite(c.tolerance)||c.tolerance<0||c.tolerance>2))throw new Error('Tolerance must be 0–2 CSS pixels');
    if(c.viewports&&(!Array.isArray(c.viewports)||!c.viewports.length||c.viewports.some(v=>!viewports.some(x=>x.id===v))))throw new Error('Unknown viewport');
    if(c.state&&(Object.keys(c.state).some(k=>!['trigger','hover','focus'].includes(k))||Object.values(c.state).some(v=>typeof v!=='string'||!v)))throw new Error('State supports explicit trigger, hover and keyboard focus selectors only');
  }
  return {variables,checks:plan.checks,document:{name:tokens.meta.name,theme:tokens.meta.theme},categories};
}

export function compareCss(actual,expected,tolerance=0){
  const tidy=s=>s.trim().replace(/\s+/g,' ').replace(/\s*,\s*/g,',');
  if(tidy(actual)===tidy(expected))return true;
  if(!tolerance)return false;
  const a=actual.trim().split(/\s+/),b=expected.trim().split(/\s+/);
  return a.length===b.length&&a.every((v,i)=>/^-?\d*\.?\d+px$/.test(v)&&/^-?\d*\.?\d+px$/.test(b[i])&&Math.abs(parseFloat(v)-parseFloat(b[i]))<=tolerance);
}

async function applyState(page,state,dialogs){
  if(state.trigger){
    const trigger=page.locator(state.trigger);
    if(await trigger.count()!==1)throw new Error('Trigger must resolve to exactly one element');
    const safe=await trigger.evaluate(el=>{
      const tag=el.tagName.toLowerCase();
      return !el.disabled&&!el.closest('a[href]')&&!(el.form&&['submit','reset'].includes(el.type))&&
        (el.hasAttribute('aria-haspopup')||el.hasAttribute('aria-controls')||el.hasAttribute('popovertarget')||tag==='summary');
    });
    if(!safe)throw new Error('Trigger is not an explicitly identified reversible UI control; use a safe local preview or inspect manually');
    await trigger.scrollIntoViewIfNeeded();await trigger.click({timeout:4000});
    await page.waitForTimeout(180);
    if(dialogs.length)throw new Error('Browser JS dialog used instead of the documented frontend control');
  }
  if(state.hover)await page.locator(state.hover).hover({timeout:4000});
  if(state.focus){
    const target=page.locator(state.focus);if(await target.count()!==1)throw new Error('Focus selector must resolve to one element');
    await target.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
    if(!await target.evaluate(el=>el===document.activeElement&&el.matches(':focus-visible')))throw new Error('Requested keyboard focus-visible state was not reached');
  }
}

async function platformFonts(page,selector){
  const cdp=await page.context().newCDPSession(page);
  try{
    await cdp.send('DOM.enable');await cdp.send('CSS.enable');
    const {root}=await cdp.send('DOM.getDocument');
    const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector});
    if(!nodeId)return {unavailable:'Selector is not a document CSS selector'};
    return await cdp.send('CSS.getPlatformFontsForNode',{nodeId});
  }catch(e){return {unavailable:e.message};}finally{await cdp.detach();}
}

export async function auditFrontend({designPath,url,planPath,out,modulePath},launch=launchBrowser){
  const parsedUrl=new URL(url);if(!['http:','https:'].includes(parsedUrl.protocol)||parsedUrl.username||parsedUrl.password)throw new Error('Use an HTTP(S) preview URL without credentials');
  const markdown=await fs.readFile(designPath,'utf8'),planText=await fs.readFile(planPath,'utf8');
  const plan=JSON.parse(planText),prepared=prepareAudit(markdown,plan);
  // A fresh directory prevents stale successful reports after an interrupted run.
  await fs.mkdir(out,{recursive:true});if((await fs.readdir(out)).length)throw new Error('Audit output directory must be empty');
  const report={schemaVersion:1,auditVersion:'2.3.0',capturedAt:new Date().toISOString(),url,
    design:{path:path.resolve(designPath),sha256:hash(markdown),...prepared.document},planSha256:hash(planText),
    scope:'Documented constraints on mapped elements; not a whole-page visual similarity score',results:[],captures:[],notes:[],
    manualReview:{status:'required',areas:['composition and hierarchy','images and icons','text fragments and rendered fonts','responsive clipping and wrapping','all documented control families and states','reference screenshot alignment (if recreating an existing page)']}};
  const browser=await launch(modulePath);
  try{
    const context=await browser.newContext({colorScheme:plan.colorScheme||prepared.document.theme||'light'});
    const reference=await context.newPage();await reference.setContent('<!doctype html><html><body></body></html>');
    for(const viewport of viewports){
      const relevant=prepared.checks.filter(c=>!c.viewports||c.viewports.includes(viewport.id));
      const groups=new Map();
      for(const c of relevant){const key=JSON.stringify(c.state||{});if(!groups.has(key))groups.set(key,[]);groups.get(key).push(c);}
      let groupIndex=0;
      for(const [stateKey,checks] of groups){
        const state=JSON.parse(stateKey),page=await context.newPage(),dialogs=[];
        await page.setViewportSize({width:viewport.width,height:viewport.height});
        await reference.setViewportSize({width:viewport.width,height:viewport.height});
        page.setDefaultTimeout(4000);
        page.on('dialog',async d=>{dialogs.push({type:d.type(),message:d.message()});await d.dismiss().catch(()=>{});});
        const captureId=`${viewport.id}-${groupIndex++}`,capture={id:captureId,viewport,state,notes:[]};
        try{
          const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});
          if(!response||response.status()<200||response.status()>=400)throw new Error(`Page returned ${response?.status()}`);
          if(/just a moment|access denied|verify you are human/i.test(await page.title()))throw new Error('Access/challenge page requires review');
          await page.evaluate(()=>Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,3000))]));
          const initialUrl=page.url();capture.finalUrl=initialUrl;capture.title=await page.title();
          if(dialogs.length)throw new Error('Preview opened an unexpected browser JS dialog');
          await applyState(page,state,dialogs);
          if(page.url()!==initialUrl)throw new Error('State action navigated away from the preview');
          const snapshot=await page.evaluate(captureDom,properties);
          capture.controls=snapshot.controlInventory.map(({kind,selector,nativeBoundary,rendered})=>({kind,selector,nativeBoundary,rendered}));
          capture.nativeBoundaries=snapshot.floatingControls.filter(c=>c.picker).map(({selector,kind,picker})=>({selector,kind,picker}));
          capture.fonts=snapshot.fonts;capture.fontStatus=snapshot.fontStatus;capture.scrollWidth=snapshot.scrollWidth;
          if(snapshot.scrollWidth>viewport.width+1)capture.notes.push('Horizontal overflow: compare to the documented mobile/desktop layout');
          if(snapshot.fontStatus!=='loaded')capture.notes.push('Fonts not settled; typography evidence is limited');
          for(const check of checks){
            const row={...check,viewport:viewport.id,capture:captureId,status:'blocked'};
            try{
              const target=page.locator(check.selector);
              if(await target.count()!==1)throw new Error('Selector missing or ambiguous; map the actual painted element');
              if(!await target.isVisible())throw new Error('Mapped element is hidden in this state');
              const observed=await target.evaluate((el,{property,pseudo})=>{
                const s=getComputedStyle(el,pseudo||null),r=el.getBoundingClientRect();
                const painted=el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&(!pseudo||
                  (pseudo==='::backdrop'?el.matches(':modal'):pseudo==='::placeholder'?!!el.getAttribute('placeholder')&&!el.value:s.content!=='none'&&s.content!=='normal'&&s.display!=='none'&&s.opacity!=='0'));
                const directText=[...el.childNodes].filter(n=>n.nodeType===3).some(n=>n.textContent.trim())||el.matches('input,textarea,select,option');
                return {actual:s.getPropertyValue(property),painted,fontSize:getComputedStyle(el).fontSize,rect:{x:r.x,y:r.y,width:r.width,height:r.height},text:el.textContent?.slice(0,160),directText};
              },check);
              Object.assign(row,observed);
              if(!observed.painted)throw new Error('Mapped element or pseudo element does not paint in this state');
              if(!check.pseudo&&!observed.directText&&['color','font-family','font-size','font-weight','line-height','letter-spacing','text-transform','text-decoration-line','text-decoration-color'].includes(check.property))throw new Error('Map the text-bearing fragment; inherited wrapper styles are not glyph evidence');
              const expectedValue=check.token?prepared.variables[check.token]:check.expected;
              row.expectedRaw=expectedValue;
              const referenceValue=await reference.evaluate(({variables,property,value,fontSize})=>{
                const root=document.documentElement;
                for(const [name,v] of Object.entries(variables))root.style.setProperty(name,v);
                const probe=document.createElement('div');probe.style.cssText='all: initial; position: absolute;';
                probe.style.fontSize=fontSize;document.body.append(probe);
                probe.style.setProperty('--audit-value',value);
                const resolved=getComputedStyle(probe).getPropertyValue('--audit-value').trim();
                if(!resolved||!CSS.supports(property,resolved)){probe.remove();return null;}
                probe.style.setProperty(property,resolved);const result=getComputedStyle(probe).getPropertyValue(property);probe.remove();return {value:result,resolved};
              },{variables:prepared.variables,property:check.property,value:expectedValue,fontSize:observed.fontSize});
              if(referenceValue===null)throw new Error('Document value cannot resolve as this CSS property');
              row.expected=referenceValue.value;row.referenceResolved=referenceValue.resolved;
              // Percentages and parent-relative geometry need source-aware layout review.
              if(/%|[\d.](?:em|rem|cqw|cqh)\b|\b(?:currentcolor|inherit|unset|revert)\b/i.test(referenceValue.resolved)&&
                !(check.property==='line-height'&&/^[\d.]+(?:%|em)$/.test(referenceValue.resolved)))throw new Error('Relative value needs a contextual layout/font check; use a documented viewport-specific pixel expectation');
              if(/width|height|margin|padding|gap|columns/.test(check.property)&&/\b(?:auto|fit-content|min-content|max-content)\b|[\d.]fr\b/.test(referenceValue.resolved))throw new Error('Content/parent-dependent geometry needs a contextual layout check');
              row.status=compareCss(row.actual,row.expected,check.tolerance||0)?'pass':'fail';
              if(row.status==='fail'&&/^(?:color|background-color|background-image|box-shadow|outline|border-.*-color|outline-color|accent-color|caret-color|fill|stroke)$/.test(check.property)&&
                /(?:lab|lch|color|color-mix)\(/.test(row.actual+' '+row.expected)){row.status='blocked';row.reason='Color notation/gamut needs contextual browser normalization before judging equivalence';}
              if(check.property==='font-family'&&!check.pseudo){
                row.renderedFonts=await platformFonts(page,check.selector);
                if(!observed.directText){row.status='blocked';row.reason='Map the text-bearing fragment; inherited wrapper fonts are not glyph evidence';}
                else{
                  const primary=expectedValue.split(',')[0].trim().replaceAll(/['"]/g,'');
                  const generic=/^(system-ui|sans-serif|serif|monospace|ui-.+|cursive|fantasy)$/i.test(primary);
                  const fonts=row.renderedFonts.fonts?.filter(f=>f.glyphCount>0)||[];
                  if(!generic&&!fonts.some(f=>f.familyName.toLowerCase()===primary.toLowerCase())){
                    const aliasLoaded=await page.evaluate(primary=>[...document.fonts].some(f=>f.family.replaceAll(/['"]/g,'').toLowerCase()===primary.toLowerCase()&&f.status==='loaded'),primary);
                    if(/\p{L}/u.test(observed.text||'')&&!/\p{Script=Latin}/u.test(observed.text||'')){row.status='blocked';row.reason='Non-Latin glyph fallback needs reference/script coverage review before judging the primary family';}
                    else if(aliasLoaded&&fonts.some(f=>f.isCustomFont)){row.status='blocked';row.reason='Loaded CSS font alias differs from platform family name; verify face-to-glyph association';}
                    else{row.status=fonts.length?'fail':'blocked';row.reason=fonts.length?'Expected primary font was not used for the mapped glyphs':'Rendered font data unavailable';}
                  }
                }
              }
              if(check.property==='font-family'&&snapshot.fontStatus!=='loaded'){row.status='blocked';row.reason='Fonts are still loading; recapture stable typography before judging fallback';}
              if(row.status==='fail'&&!row.reason)row.reason='Rendered property differs from the documented expectation';
            }catch(e){row.status='blocked';row.reason=e.message;}
            report.results.push(row);
          }
          capture.screenshot=`${captureId}.png`;
          capture.screenshotMode=state.trigger?'viewport':'full-page';
          // Full-page screenshots can misleadingly show a modal backdrop ending at
          // the viewport while revealing unscrollable page content beneath it.
          await boundedScreenshot(page,path.join(out,capture.screenshot),!state.trigger,capture.notes);
          if(state.trigger){
            await page.keyboard.press('Escape');
            capture.escape={focusRestored:await page.locator(state.trigger).evaluate(el=>el===document.activeElement)};
            capture.notes.push('Escape focus is recorded; verify panel closure, focus trap and arrow-key behavior with the control inspector/manual review');
          }
        }catch(e){
          capture.error=e.message;capture.nativeDialogs=dialogs;
          for(const check of checks)if(!report.results.some(r=>r.id===check.id&&r.viewport===viewport.id))report.results.push({...check,viewport:viewport.id,capture:captureId,status:dialogs.length?'fail':'blocked',reason:e.message});
        }finally{report.captures.push(capture);await page.close();}
      }
    }
  }finally{await browser.close();}
  const counts={pass:0,fail:0,blocked:0};for(const r of report.results)counts[r.status]++;
  const captureFailures=report.captures.filter(c=>c.error).length;
  report.summary={...counts,planned:report.results.length,measured:counts.pass+counts.fail,captureFailures,
    uncoveredCategories:categories.filter(c=>!report.results.some(r=>r.category===c)),
    untestedViewports:viewports.filter(v=>!report.captures.some(c=>c.viewport.id===v.id)).map(v=>v.id),
    status:counts.fail?'drift-detected':counts.blocked||captureFailures?'incomplete':'checks-pass-review-required'};
  await fs.writeFile(path.join(out,'fidelity.json'),JSON.stringify(report,null,2)+'\n');
  const cell=v=>String(v??'').replaceAll('|','\\|').replaceAll('\n',' ');
  const lines=['# Frontend fidelity evidence','',`Status: **${report.summary.status}**`,
    `Mapped checks: ${counts.pass} pass, ${counts.fail} fail, ${counts.blocked} blocked. This is not a visual similarity percentage.`,
    `Design SHA-256: ${report.design.sha256}`,`Uncovered categories: ${report.summary.uncoveredCategories.join(', ')||'none (category presence is not complete coverage)'}`,
    '', '## Findings','','| Check / viewport | Status | Expected | Actual | Reason |','|---|---|---|---|---|',
    ...report.results.map(r=>`| ${cell(r.id)} / ${r.viewport} | ${r.status} | ${cell(r.expected??r.expectedRaw??r.token??r.expected)} | ${cell(r.actual)} | ${cell(r.reason)} |`),
    '', '## Screenshots and limits','',...report.captures.map(c=>`- ${c.id}: ${c.screenshot?`[screenshot](${c.screenshot})`:'no screenshot'}; ${cell(c.error||c.notes.join('; '))}`),
    '', '## Required visual review','',...report.manualReview.areas.map(a=>`- [ ] ${a}`),
    '', 'Write the reviewed conclusion, evidence links, source gaps and prioritized fixes in a separate audit.md. Do not convert these mapped checks into an overall restoration percentage.',''];
  await fs.writeFile(path.join(out,'fidelity.md'),lines.join('\n'));
  return report.summary;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=process.argv.slice(2),i=args.indexOf('--playwright');const modulePath=i>=0?args.splice(i,2)[1]:undefined;
  try{
    if(args.length!==4)throw new Error('Usage: node fidelity.mjs DESIGN.md PREVIEW_URL PLAN.json EMPTY_OUT [--playwright MODULE_DIRECTORY]');
    const result=await auditFrontend({designPath:args[0],url:args[1],planPath:args[2],out:args[3],modulePath});
    console.log(JSON.stringify(result));if(result.fail)process.exitCode=2;else if(result.status==='incomplete')process.exitCode=3;
  }catch(e){console.error(e.message);process.exitCode=1;}
}
