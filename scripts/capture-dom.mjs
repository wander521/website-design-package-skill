// Runs in the browser realm. Do not reference Node globals here.
export function captureDom(props) {
  const visible=el=>{
    const r=el.getBoundingClientRect(),s=getComputedStyle(el);
    if(!r.width||!r.height||r.right<=0||r.left>=innerWidth||s.display==='none'||s.visibility==='hidden'||s.opacity==='0'||s.clip==='rect(1px, 1px, 1px, 1px)'||s.clipPath==='inset(50%)')return false;
    if(el.checkVisibility&&!el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}))return false;
    for(let parent=el.parentElement;parent&&parent!==document.body;parent=parent.parentElement){const cs=getComputedStyle(parent),box=parent.getBoundingClientRect();if(/hidden|clip|scroll|auto/.test(cs.overflowX)&&(r.right<=box.left||r.left>=box.right))return false;if(/hidden|clip|scroll|auto/.test(cs.overflowY)&&(r.bottom<=box.top||r.top>=box.bottom))return false;}
    return true;
  };
  // A cookie link in a static footer is not an overlay. Include anonymous fixed
  // consent panels, but only when their boxes intersect the current viewport.
  const overlayNodes=[...document.querySelectorAll('div,section,aside,dialog,[role="dialog"],[aria-modal="true"]')].filter(el=>{
    if(!visible(el))return false;const r=el.getBoundingClientRect();if(r.bottom<=0||r.top>=innerHeight)return false;
    const text=(el.innerText||'').trim();const semantic=el.matches('dialog[open],[role="dialog"],[aria-modal="true"]');
    const consent=/cookie|consent|privacy preferences|privacy settings|optional tracking|隐私|同意|饼干/i.test(text+' '+el.id+' '+String(el.className));
    let fixed=false;for(let n=el;n&&n!==document.body;n=n.parentElement)if(['fixed','sticky'].includes(getComputedStyle(n).position)){fixed=true;break;}
    return semantic||(fixed&&consent&&text.length<6000&&r.width>120&&r.height>45);
  }).filter((el,_,all)=>!all.some(other=>other!==el&&other.contains(el)));
  const selectorFor=el=>{
    if(el.id&&document.querySelectorAll('#'+CSS.escape(el.id)).length===1)return '#'+CSS.escape(el.id);
    const parts=[];let p=el;
    while(p){const tag=p.tagName.toLowerCase();const siblings=p.parentElement?[...p.parentElement.children].filter(x=>x.tagName===p.tagName):[p];parts.unshift(tag+(siblings.length>1?`:nth-of-type(${siblings.indexOf(p)+1})`:''));if(p===document.body||p===document.documentElement)break;p=p.parentElement;}
    return parts.join(' > ');
  };
  const record=(el,group,pseudo=null)=>{
    const s=getComputedStyle(el,pseudo);const r=el.getBoundingClientRect();
    const directText=[...el.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join(' ').trim();
    return {tag:el.tagName.toLowerCase(),group,pseudo,selector:selectorFor(el),classes:String(el.className).slice(0,180),text:(el.innerText||el.textContent||'').trim().slice(0,120),directText:directText.slice(0,120),textOwner:Boolean(directText),inOverlay:overlayNodes.some(panel=>panel.contains(el)),rect:{x:r.x,y:r.y,width:r.width,height:r.height},styles:Object.fromEntries(props.map(p=>[p,s.getPropertyValue(p).trim()]))};
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
    ['text-fragments','h1 span,h1 em,h1 strong,h1 mark,h2 span,h2 em,h2 strong,h2 mark,h3 span,a span,a p,button span,button p,[role="button"] span,nav p,header p',64],
    ['display-text','main div,main span,section div,section span',24],
    ['overlays','[role="dialog"],[aria-modal="true"],[class*="cookie"],[id*="cookie"],[id*="consent"]',12],
  ];
  const elements=[],seen=new Set(),coverage={};
  for(const [group,selector,limit]of groups){
    let candidates=[...document.querySelectorAll(selector)].filter(visible);
    if(group==='text-fragments')candidates=candidates.filter(el=>[...el.childNodes].some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim())||getComputedStyle(el).backgroundColor!=='rgba(0, 0, 0, 0)');
    if(group==='text-fragments')candidates.sort((a,b)=>{const rank=el=>el.closest('h1,h2,h3')?0:el.closest('a,button,[role="button"]')&&!el.closest(navigationScope)?1:2;return rank(a)-rank(b);});
    if(group==='display-text')candidates=candidates.filter(el=>el.getBoundingClientRect().top<innerHeight&&parseFloat(getComputedStyle(el).fontSize)>=32&&[...el.childNodes].some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim()));
    if(group==='overlays')candidates=overlayNodes;
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
  const overlays=overlayNodes.map(el=>({selector:selectorFor(el),text:(el.innerText||'').trim().slice(0,300),position:getComputedStyle(el).position}));
  // Consent managers often render in open Shadow DOM, absent from page HTML.
  let roots=[document],visited=0;
  for(let i=0;i<roots.length&&visited<32;i++){for(const host of roots[i].querySelectorAll('*'))if(host.shadowRoot){roots.push(host.shadowRoot);visited++;const items=[...host.shadowRoot.querySelectorAll('[role="dialog"],[aria-modal="true"],button,[class*="cookie"],[id*="consent"]')].filter(visible);if(items.length&&(/cookie|consent|privacy|隐私/i.test(host.shadowRoot.textContent||'')||items.some(el=>el.matches('[role="dialog"],[aria-modal="true"]')))){const text=(host.shadowRoot.textContent||'').replace(/\s+/g,' ').slice(0,300);overlays.push({selector:selectorFor(host)+' ::shadow',shadow:true,text,elements:items.slice(0,8).map(el=>record(el,'shadow-overlay'))});}if(visited>=32)break;}}
  // A zero-sized consent host can paint children in an opaque shadow tree.
  // Record the boundary without pretending to read or see its internals.
  const opaqueConsentHosts=[...document.querySelectorAll('[id*="consent" i],[id*="cookie" i],[class*="consent-manager" i]')].filter(el=>getComputedStyle(el).position==='fixed'&&!el.shadowRoot&&!el.innerText?.trim()).slice(0,12).map(el=>({selector:selectorFor(el),position:getComputedStyle(el).position,shadowAccess:'none-or-closed',rect:{x:el.getBoundingClientRect().x,y:el.getBoundingClientRect().y,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height},note:'Potential consent host; presence does not establish visible overlay or access to internal styles.'}));
  return {opaqueConsentHosts,fontStatus:document.fonts.status,fonts:[...document.fonts].map(face=>({family:face.family,status:face.status,weight:face.weight,style:face.style})).slice(0,80),viewport:{width:innerWidth,height:innerHeight},scrollWidth:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,elements,surfaces,rootCustomProperties,overlays,coverage};
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
