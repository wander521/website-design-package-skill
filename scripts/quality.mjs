import {controlWarnings} from './control-coverage.mjs';
export const normalizeValue=value=>String(value).trim().replace(/\s+/g,' ').replace(/\s*([,():])\s*/g,'$1');
const families=value=>value.split(',').map(x=>x.trim().replace(/^["']|["']$/g,'').toLowerCase());
export function evidenceIndex(evidence){
  const index=new Map();
  const add=(value,source)=>{if(value===undefined||value==='')return;const key=normalizeValue(value);if(!index.has(key))index.set(key,[]);index.get(key).push(source);};
  for(const [i,d]of(evidence.source?.declarations||[]).entries())add(d.value,{kind:d.property?.startsWith('--')?'declared-variable':'declared',pointer:`source.declarations[${i}]`,property:d.property,selector:d.selector,scope:d.scope,href:d.href});
  for(const [i,sample]of(evidence.samples||[]).entries()){
    for(const group of ['elements','surfaces'])for(const [j,el]of(sample[group]||[]).entries())for(const [property,value]of Object.entries(el.styles||{}))add(value,{kind:'computed',pointer:`samples[${i}].${group}[${j}].styles.${property}`,property,selector:el.selector,tag:el.tag,text:el.directText||el.text,group:el.group,viewport:sample.viewport,phase:sample.phase});
    for(const [property,value]of Object.entries(sample.rootCustomProperties||{}))add(value,{kind:'root-variable',pointer:`samples[${i}].rootCustomProperties.${property}`,property,viewport:sample.viewport});
  }
  for(const [i,state]of(evidence.states||[]).entries())for(const phase of ['baseline','hover','focus'])for(const [property,value]of Object.entries(state[phase]?.styles||{}))add(value,{kind:'state',pointer:`states[${i}].${phase}.styles.${property}`,property,selector:state.selector,state:phase,hovered:state[phase].hovered,focusVisible:state[phase].focusVisible,viewport:state.viewport});
  for(const [i,item]of(evidence.publishedTokens||[]).entries())add(item.value,{kind:'published',pointer:`publishedTokens[${i}]`,property:item.property,href:item.sourceUrl});
  return index;
}
export function propertyMatches(expected,actual){
  if(!actual)return false;
  if(actual===expected)return true;
  const group={color:/^(color|background-color|border(?:-(?:top|right|bottom|left))?-color|outline-color|accent-color|caret-color|text-decoration-color|fill|stroke)$/,padding:/^(padding(?:-.+)?|margin(?:-.+)?|gap|row-gap|column-gap)$/,gap:/^(gap|row-gap|column-gap)$/, 'row-gap':/^(gap|row-gap)$/};
  return Boolean(group[expected]?.test(actual));
}
export function fontInventory(evidence){
  const inventory=new Map();
  for(const [i,sample]of(evidence.samples||[]).entries())for(const [j,el]of(sample.elements||[]).entries()){
    if(['root','layout','surface','overlays'].includes(el.group))continue;
    if((el.textOwner===false||(el.textOwner===undefined&&el.directText!==undefined&&!el.directText.trim()))&&!['input','textarea','select'].includes(el.tag))continue;
    if(!el.text?.trim()&&!['input','textarea'].includes(el.tag))continue;
    const stack=el.styles?.['font-family'];if(!stack)continue;const primary=families(stack)[0];
    if(!inventory.has(primary))inventory.set(primary,{primary,stack,occurrences:0,roles:new Set(),examples:[]});
    const entry=inventory.get(primary);entry.occurrences++;entry.roles.add(el.group||el.tag);
    if(entry.examples.length<3)entry.examples.push({text:el.directText||el.text,tag:el.tag,selector:el.selector,pointer:`samples[${i}].elements[${j}]`});
  }
  return [...inventory.values()].map(entry=>({...entry,roles:[...entry.roles]}));
}
export function qualityReview(tokens,evidence){
  const warnings=controlWarnings(tokens.components||[],evidence);const inventory=fontInventory(evidence);const included=new Set(tokens.typography.fontFamilies.map(f=>families(f.substitute||f.name)[0]));
  for(const family of inventory)if(!included.has(family.primary))warnings.push({code:'observed-font-omitted',family:family.primary,roles:family.roles,examples:family.examples});
  if(evidence.source?.declarationsTruncated)warnings.push({code:'css-capture-capped'});
  for(const [i,sample]of(evidence.samples||[]).entries()){
    if(!sample.elements?.length)warnings.push({code:'missing-core-capture',viewport:sample.viewport});
    for(const [group,coverage]of Object.entries(sample.coverage||{}))if(coverage.truncated)warnings.push({code:'sampling-group-capped',viewport:sample.viewport,group,available:coverage.available,captured:coverage.captured});
    if(sample.scrollCoverage?.capped)warnings.push({code:'scroll-coverage-partial',viewport:sample.viewport,...sample.scrollCoverage});
    if(sample.opaqueConsentHosts?.length)warnings.push({code:'opaque-consent-host',viewport:sample.viewport,hosts:sample.opaqueConsentHosts});
    if(sample.fontStatus==='loading')warnings.push({code:'fonts-still-loading',viewport:sample.viewport});
    if(sample.overlays?.length||sample.overlaysBeforeStates?.length)warnings.push({code:'visible-overlay',viewport:sample.viewport,overlays:sample.overlays,overlaysBeforeStates:sample.overlaysBeforeStates});
    if(sample.viewport?.width&&sample.scrollWidth>sample.viewport.width+1)warnings.push({code:'source-horizontal-overflow',viewport:sample.viewport,scrollWidth:sample.scrollWidth});
  }
  const componentText=(tokens.components||[]).map(c=>[c.name,c.role,c.description].join(' '));
  for(const [kind,pattern]of [['dialog',/dialog|modal|对话框|弹窗/i],['dropdown',/dropdown|combobox|listbox|下拉|选择器/i]]){
    if(!componentText.some(text=>pattern.test(text)))warnings.push({code:'floating-component-undocumented',kind,note:'Document observed, native, not observed, blocked, or derived scope; do not invent source styles.'});
  }
  if(!(tokens.components||[]).some(c=>/frontend implementation|前端实现约定/i.test(c.name)))warnings.push({code:'frontend-implementation-contract-missing'});
  for(const sample of evidence.samples||[])for(const control of sample.floatingControls||[]){
    if(['native-select','native-datalist'].includes(control.kind))warnings.push({code:'native-picker-uninspected',selector:control.selector,viewport:sample.viewport});
    if(control.kind==='trigger'&&control.expanded!=='true'&&!evidence.samples.some(s=>{const linked=(s.floatingControls||[]).find(c=>c.selector===control.selector);const ids=(control.controls||linked?.controls||'').split(/\s+/);return(s.floatingControls||[]).some(c=>['dialog','menu','listbox','popover'].includes(c.kind)&&c.rendered&&ids.includes(c.id));}))warnings.push({code:'floating-trigger-open-state-unobserved',selector:control.selector,viewport:sample.viewport});
  }
  const states=evidence.states||[];
  for(const interaction of evidence.controlInteractions||[]){
    if(interaction.status==='observed'&&!interaction.closedAfterEscape)warnings.push({code:'floating-escape-did-not-close',trigger:interaction.trigger,viewport:interaction.viewport});
    if(interaction.status==='observed'&&!interaction.focusRestoredAfterEscape)warnings.push({code:'floating-focus-not-restored',trigger:interaction.trigger,viewport:interaction.viewport});
  }
  if(!states.some(x=>x.hover)&&!evidence.controlInteractions?.some(x=>x.status==='observed'))warnings.push({code:'interaction-states-unsampled'});
  if(states.some(x=>x.focus?.hovered))warnings.push({code:'mixed-hover-focus-state',count:states.filter(x=>x.focus?.hovered).length});
  if(states.some(x=>x.error))warnings.push({code:'some-state-targets-unavailable',count:states.filter(x=>x.error).length});
  return{status:warnings.length?'review':'checked',warnings,fontInventory:inventory};
}
