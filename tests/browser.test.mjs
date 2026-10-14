import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {compile,pack} from '../scripts/build.mjs';
import {checkCss} from '../scripts/browser.mjs';
const md=`# Browser Fixture — Style Reference
> Test an actual browser's native CSS parsing.

**Theme:** light

**Source website:** [https://fixture.example/](https://fixture.example/)

## Tokens — Colors

| Name | Value | Token | Role |
|---|---|---|---|
| Text | rgb(20, 30, 40) | --color-text | Text |

## Tokens — Typography

### Arial · \`--font-body\`
- **Substitute:** Arial, sans-serif
- **Weights:** 400
- **Role:** Body

### Type Scale

| Role | Size | Line Height | Letter Spacing | Token |
|---|---|---|---|---|
| body | 16px | normal | normal | --text-body |

## Tokens — Spacing & Shapes

### Border Radius

| Name | Value | Token |
|---|---|---|
| Surface | 24px 24px 0px 0px | --radius-surface |
`;
const evidence={schemaVersion:1,requestedUrl:'https://fixture.example/',finalUrl:'https://fixture.example/',status:200,samples:[{elements:[{styles:{}}]}],source:{declarations:['rgb(20, 30, 40)','Arial, sans-serif','400','16px','normal','24px 24px 0px 0px','not-a-color'].map(value=>({value}))}};
function stage(source){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'design-browser-test-'));const r=compile(source,evidence);for(const [n,v]of Object.entries(r.files))fs.writeFileSync(path.join(dir,n),v);fs.writeFileSync(path.join(dir,'validation.json'),JSON.stringify(r.report));return dir;}
test('browser parses the actual @theme directive despite @theme in comments, then permits ZIP',async()=>{
 const dir=stage(md);try{
 assert.ok(fs.readFileSync(path.join(dir,'theme.css'),'utf8').includes('的 Tailwind CSS @theme'));
 const r=await checkCss(dir,process.env.DESIGN_TEST_PLAYWRIGHT);assert.equal(r.verified,true);
 assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'validation.json'),'utf8')).browserVerified,true);
 const result=pack(dir,path.join(dir,'out.zip'));assert.equal(result.files.length,4);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('browser rejects CSS that static custom-property parsing would accept, leaving packaging blocked',async()=>{
 const dir=stage(md.replace('rgb(20, 30, 40)','not-a-color'));try{
 await assert.rejects(checkCss(dir,process.env.DESIGN_TEST_PLAYWRIGHT),/Invalid CSS/);
 assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'validation.json'),'utf8')).browserVerified,false);
 assert.throws(()=>pack(dir,path.join(dir,'out.zip')),/verify/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('browser rejects a defined CSS variable that resolves to the wrong property type',async()=>{
 const dir=stage(md);try{
 const report=JSON.parse(fs.readFileSync(path.join(dir,'validation.json'),'utf8'));
 report.cssChecks.push({property:'color',value:'var(--radius-surface)'});fs.writeFileSync(path.join(dir,'validation.json'),JSON.stringify(report));
 await assert.rejects(checkCss(dir,process.env.DESIGN_TEST_PLAYWRIGHT),/Invalid resolved CSS value/);
 assert.throws(()=>pack(dir,path.join(dir,'out.zip')),/verify/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
