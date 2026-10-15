import {inspectControls} from './inspect-controls.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

export async function launchBrowser(modulePath) {
  let pw;
  try { pw = modulePath ? createRequire(path.resolve(modulePath,'package.json'))('playwright') : await import('playwright'); }
  catch { throw new Error('Playwright is required for browser capture/verification. Use an available runtime module directory with --playwright, or collect evidence using the browser tools described in references/browser-evidence.md.'); }
  try { return await pw.chromium.launch({headless:true}); }
  catch (error) {
    if (!error.message.includes('Executable doesn')) throw error;
    try { return await pw.chromium.launch({channel:'chrome',headless:true}); }
    catch (chromeError) { throw new Error('Browser launch failed (Chrome fallback): '+chromeError.message+'\nIf the sandbox blocks launching the installed browser, use the host approval mechanism; if the executable is missing, use an available browser tool. Do not fabricate evidence.'); }
  }
}
export {properties} from './capture.mjs';
import {captureSite} from './capture.mjs';
export async function capture(url,out,modulePath,colorScheme='light') {
  return captureSite(launchBrowser,url,out,modulePath,colorScheme);
}

export async function checkCss(dir,modulePath) {
  const browser=await launchBrowser(modulePath);
  try {
    const page=await browser.newPage();
    const report=JSON.parse(await fs.readFile(path.join(dir,'validation.json'),'utf8'));
    const variables=await fs.readFile(path.join(dir,'variables.css'),'utf8');
    const theme=await fs.readFile(path.join(dir,'theme.css'),'utf8');
    const failures=await page.evaluate(({checks,variables,theme})=>{
      const invalid=checks.filter(({property,value})=>!CSS.supports(property,value));
      const style=document.createElement('style');style.textContent=variables;document.head.append(style);
      const root=getComputedStyle(document.documentElement);
      for(const {name,value} of checks.filter(x=>x.name)) {
        if(!root.getPropertyValue(name).trim())invalid.push({name,value,error:'Empty computed custom property'});
      }
      // Resolve var() using the browser, then check its actual property type.
      const probe=document.createElement('div');document.body.append(probe);
      for(const {property,value,name} of checks){
        probe.style.setProperty('--design-verification-value',value);
        const resolved=getComputedStyle(probe).getPropertyValue('--design-verification-value').trim();
        if(!resolved||!CSS.supports(property,resolved))invalid.push({property,value,name,resolved,error:'Invalid resolved CSS value'});
      }
      probe.remove();
      // @theme is a Tailwind build directive; validate its declarations as custom properties.
      const themeStyle=document.createElement('style');themeStyle.textContent=theme.replace(/^\s*@theme\s*\{/m,':root {');document.head.append(themeStyle);
      if(!style.sheet?.cssRules.length||!themeStyle.sheet?.cssRules.length)invalid.push({error:'CSS parse failed'});
      return invalid;
    },{checks:report.cssChecks,variables,theme});
    if(failures.length)throw new Error(`Invalid CSS: ${JSON.stringify(failures)}`);
    report.browserVerified=true;
    await fs.writeFile(path.join(dir,'validation.json'),JSON.stringify(report,null,2)+'\n');
    return {verified:true,checks:report.cssChecks.length};
  } finally {await browser.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const [command,...args]=process.argv.slice(2);const moduleIndex=args.indexOf('--playwright');
  const modulePath=moduleIndex>=0?args.splice(moduleIndex,2)[1]:undefined;
  const schemeIndex=args.indexOf('--color-scheme');const scheme=schemeIndex>=0?args.splice(schemeIndex,2)[1]:'light';
  if(!['light','dark'].includes(scheme))throw new Error('color-scheme must be light or dark');
  try {
    const triggerIndex=args.indexOf('--trigger');const trigger=triggerIndex>=0?args.splice(triggerIndex,2)[1]:undefined;
    if(command==='inspect'&&args.length===2)console.log(JSON.stringify(await inspectControls(launchBrowser,args[0],path.resolve(args[1]),modulePath,trigger,scheme)));
    else if(command==='capture'&&args.length===2)console.log(JSON.stringify(await capture(args[0],path.resolve(args[1]),modulePath,scheme)));
    else if(command==='verify'&&args.length===1)console.log(JSON.stringify(await checkCss(path.resolve(args[0]),modulePath)));
    else throw new Error('Usage: node browser.mjs capture URL OUT | inspect URL OUT --trigger SELECTOR | verify OUT [--playwright MODULE_DIRECTORY]');
  } catch(e){console.error(e.message);process.exitCode=1;}
}
