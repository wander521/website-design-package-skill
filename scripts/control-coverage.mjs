// The ledger lives in design.md; structured JSON and review warnings derive from it.
export const controlKinds=['dialog','dropdown','text-field','checkbox','radio','switch','button','date-time','color','file','range','tab','disclosure','tooltip','feedback','progress','table','pagination','navigation'];
export function controlCoverage(components=[]){
 const ledger=components.find(c=>/^control coverage$/i.test(c.name.trim()));const result={};
 for(const line of (ledger?.description||'').split('\n')){
  const match=line.match(/^\s*-\s*([a-z-]+):\s*(observed|native|not-observed|blocked|derived)\b\s*[-—:]?\s*(.*)$/i);
  if(match&&controlKinds.includes(match[1].toLowerCase()))result[match[1].toLowerCase()]={status:match[2].toLowerCase(),description:match[3]};
 }
 return result;
}
export function controlWarnings(components,evidence){
 const ledger=controlCoverage(components);const warnings=[];
 if(!Object.keys(ledger).length)warnings.push({code:'control-coverage-ledger-missing'});
 else for(const kind of controlKinds)if(!ledger[kind])warnings.push({code:'control-coverage-entry-missing',kind});
 const inventory=(evidence.samples||[]).flatMap(s=>s.controlInventory||[]);
 for(const kind of new Set(inventory.filter(c=>c.rendered||c.visualProxy?.length).map(c=>c.kind))){
  if(!ledger[kind]||ledger[kind].status==='not-observed')warnings.push({code:'observed-control-undocumented',kind});
 }
 return warnings;
}
