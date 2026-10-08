const fs=require('node:fs'),assert=require('node:assert/strict');
const theme=fs.readFileSync('style.css','utf8'),css=fs.readFileSync('js/documents/documents.css','utf8');
const hex=name=>theme.match(new RegExp('--'+name+':\\s*(#[0-9a-f]{6})','i'))[1];
const luminance=hex=>hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
const ratio=contrast(hex('text'),hex('surface')),muted=contrast(hex('text-muted'),hex('surface'));assert.ok(ratio>=7);assert.ok(muted>=4.5);assert.match(css,/\.documents-module \.documents-row \{color:var\(--text\)/);assert.match(css,/min-height:44px/);assert.match(css,/font-size:16px/);assert.match(css,/calc\(100vw - 24px\)/);assert.match(css,/overflow-wrap:anywhere/);console.log(`PASS: dark theme folder contrast ${ratio.toFixed(2)}:1, secondary text ${muted.toFixed(2)}:1, 44px targets, 16px input text and bounded responsive dialog (static checks; physical iPhone pending).`);
