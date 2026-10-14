// Runs in the browser realm. Do not reference Node globals here.
export function captureDom(props) {
  const visible=el=>{
    const r=el.getBoundingClientRect(),s=getComputedStyle(el);
    if(!r.width||!r.height||r.right<=0||r.left>=innerWidth||s.display==='none'||s.visibility==='hidden'||s.opacity==='0'||s.clip==='rect(1px, 1px, 1px, 1px)'||s.clipPath==='inset(50%)')return false;
    if(el.checkVisibility&&!el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}))return false;
    for(let parent=el.parentElement;parent&&parent!==document.body;parent=parent.parentElement){const cs=getComputedStyle(parent),box=parent.getBoundingClientRect();if(/hidden|clip|scroll|auto/.test(cs.overflowX)&&(r.right<=box.left||r.left>=box.right))return false;if(/hidden|clip|scroll|auto/.test(cs.overflowY)&&(r.bottom<=box.top||r.top>=box.bottom))return false;}
    return true;
  };
  const selectorFor=el=>{
    if(el.id&&document.querySelectorAll('#'+CSS.escape(el.id)).length===1)return '#'+CSS.escape(el.id);
    const parts=[];let p=el;
    while(p){const tag=p.tagName.toLowerCase();const siblings=p.parentElement?[...p.parentElement.children].filter(x=>x.tagName===p.tagName):[p];parts.unshift(tag+(siblings.length>1?`:nth-of-type(${siblings.indexOf(p)+1})`:''));if(p===document.body||p===document.documentElement)break;p=p.parentElement;}
    return parts.join(' > ');
  };
  const record=(el,group,pseudo=null)=>{
    const s=getComputedStyle(el,pseudo);const r=el.getBoundingClientRect();
    const directText=[...el.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join(' ').trim();
    return {tag:el.tagName.toLowerCase(),group,pseudo,selector:selectorFor(el),classes:String(el.className).slice(0,180),text:(el.innerText||el.textContent||'').trim().slice(0,120),directText:directText.slice(0,120),rect:{x:r.x,y:r.y,width:r.width,height:r.height},styles:Object.fromEntries(props.map(p=>[p,s.getPropertyValue(p).trim()]))};
  };
  const navigationScope='header,nav,[role="navigation"],[class*="Navbar"],[class*="navbar"],[class*="Header"],[class*="header"]';
  const footerScope='footer,[role="contentinfo"],[class*="Footer"],[class*="footer"]';
  const descendantLinks=scope=>scope.split(',').flatMap(x=>[x+' a',x+' button']).join(',');
  const groups=[
    ['root','html,body',2],
    ['headings','h1,h2,h3,[role="heading"]',36],
    ['text','p,li',44],
    ['navigation',descendantLinks(navigationScope),32],
    ['actions','a,button,[role="button"]',32],
    ['fields','input,select,textarea',16],
    ['technical-text','code,pre,kbd',16],
    ['layout','main,section,article,[class*="container"],[class*="Container"]',24],
    ['footer',footerScope+','+descendantLinks(footerScope),12],
    ['text-fragments','h1 span,h1 em,h1 strong,h1 mark,h2 span,h2 em,h2 strong,h2 mark',32],
    ['overlays','[role="dialog"],[aria-modal="true"],[class*="cookie"],[id*="cookie"],[id*="consent"]',12],
  ];
  const elements=[],seen=new Set(),coverage={};
  for(const [group,selector,limit]of groups){
    let candidates=[...document.querySelectorAll(selector)].filter(visible);
    if(group==='text-fragments')candidates=candidates.filter(el=>[...el.childNodes].some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim())||getComputedStyle(el).backgroundColor!=='rgba(0, 0, 0, 0)');
    if(group==='actions')candidates=candidates.filter(el=>!el.closest(navigationScope)&&!el.closest(footerScope));
    const picked=candidates.slice(0,limit);coverage[group]={available:candidates.length,captured:picked.length,truncated:candidates.length>limit};
    for(const el of picked){if(seen.has(el))continue;seen.add(el);elements.push(record(el,group));}
  }
  const surfaces=[],surfaceSeen=new Set();let surfaceCount=0;
  for(const el of document.querySelectorAll('div,section,article,main,header,footer')){
    if(!visible(el))continue;
    for(const pseudo of [null,'::before','::after']){
      const s=getComputedStyle(el,pseudo);if(s.visibility==='hidden'||s.opacity==='0'||(pseudo&&['none','normal'].includes(s.content)))continue;
      if(s.backgroundImage==='none'&&['rgba(0, 0, 0, 0)','transparent'].includes(s.backgroundColor)&&s.boxShadow==='none'&&s.borderRadius==='0px'&&s.borderTopWidth==='0px')continue;
      const key=[s.backgroundImage,s.backgroundColor,s.boxShadow,s.borderRadius,s.borderTopColor,s.borderTopWidth].join('|');if(surfaceSeen.has(key))continue;surfaceSeen.add(key);surfaceCount++;
      if(surfaces.length<64)surfaces.push(record(el,'surface',pseudo));
    }
  }
  coverage.surfaces={available:surfaceCount,captured:surfaces.length,truncated:surfaceCount>64};
  const rootStyle=getComputedStyle(document.documentElement),rootCustomProperties={};
  for(const key of rootStyle)if(key.startsWith('--'))rootCustomProperties[key]=rootStyle.getPropertyValue(key).trim();
  const overlays=elements.filter(el=>el.group==='overlays').map(el=>({selector:el.selector,text:el.text,position:el.styles.position}));
  // Consent managers often render in open Shadow DOM, absent from page HTML.
  let roots=[document],visited=0;
  for(let i=0;i<roots.length&&visited<32;i++){for(const host of roots[i].querySelectorAll('*'))if(host.shadowRoot){roots.push(host.shadowRoot);visited++;const items=[...host.shadowRoot.querySelectorAll('[role="dialog"],[aria-modal="true"],button,[class*="cookie"],[id*="consent"]')].filter(visible);if(items.length){const text=(host.shadowRoot.textContent||'').replace(/\s+/g,' ').slice(0,300);overlays.push({selector:selectorFor(host)+' ::shadow',shadow:true,text,elements:items.slice(0,8).map(el=>record(el,'shadow-overlay'))});}if(visited>=32)break;}}
  return {viewport:{width:innerWidth,height:innerHeight},scrollWidth:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,elements,surfaces,rootCustomProperties,overlays,coverage};
}

export function readCssom() {
  const declarations=[],conditions=[],inaccessible=[];
  function walk(rules,scope=[],href='inline'){
    for(const rule of rules){
      let next=scope;
      if(rule.conditionText){const kind=rule.constructor.name;const condition={kind,value:rule.conditionText};conditions.push(condition);next=[...scope,condition];}
      if(rule.style)for(const property of rule.style)declarations.push({selector:rule.selectorText||(rule.constructor.name==='CSSFontFaceRule'?'@font-face':rule.constructor.name),property,value:rule.style.getPropertyValue(property).trim(),scope:next,href});
      try{if(rule.cssRules)walk(rule.cssRules,next,href);}catch{}
    }
  }
  for(const sheet of document.styleSheets){try{walk(sheet.cssRules,[],sheet.href||'inline');}catch{if(sheet.href)inaccessible.push(sheet.href);}}
  return {declarations,conditions,inaccessibleStylesheets:[...new Set(inaccessible)]};
}
export function parseCssText(css) {
  const sheet=new CSSStyleSheet();sheet.replaceSync(css);
  const declarations=[],conditions=[];
  function walk(rules,scope=[]){for(const rule of rules){let next=scope;if(rule.conditionText){const condition={kind:rule.constructor.name,value:rule.conditionText};conditions.push(condition);next=[...scope,condition];}if(rule.style)for(const property of rule.style)declarations.push({selector:rule.selectorText||(rule.constructor.name==='CSSFontFaceRule'?'@font-face':rule.constructor.name),property,value:rule.style.getPropertyValue(property).trim(),scope:next});if(rule.cssRules)walk(rule.cssRules,next);}}
  walk(sheet.cssRules);return{declarations,conditions};
}
