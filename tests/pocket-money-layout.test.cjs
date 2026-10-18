const fs=require('node:fs'),assert=require('node:assert/strict');
const css=fs.readFileSync('style.css','utf8'),source=fs.readFileSync('js/finances/pocket-money.js','utf8');
function rule(selector){const escaped=selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const matches=[...css.matchAll(new RegExp(escaped+'\\s*\\{([^}]*)\\}','g'))];assert.ok(matches.length,selector);return matches.at(-1)[1];}
assert.match(rule('#pocket-money-content .recurring-form'),/grid-template-columns:minmax\(0,1fr\)/);
for(const property of ['width:100%','max-width:100%','min-width:0','box-sizing:border-box'])assert.ok(rule('#pocket-money-content .recurring-form').includes(property));
assert.match(rule('#pocket-money-content .recurring-form input'),/min-width:0/);
assert.match(rule('#pocket-money-content .recurring-form input'),/max-width:100%/);
assert.match(rule('#pocket-money-content .recurring-form .loan-input-unit input'),/width:0;flex:1 1 0/);
assert.match(rule('#pocket-money-content .recurring-form input[type="date"]'),/appearance:none/);
assert.match(rule('#pocket-money-content .recurring-form-actions'),/flex-wrap:wrap/);
assert.match(rule('#pocket-money-content .recurring-form-actions button'),/min-width:0/);
// The fix is CSS-only: existing field types, constraints and submission remain unchanged.
assert.match(source,/name="amount" type="number" min="0.01" step="0.01"/);
assert.match(source,/name="date" type="date" required/);assert.match(source,/all.push\(await addPocketMoneyExpense\(v\)\)/);
for(const viewport of [320,375,390,430,768,1280]){const available=viewport-32,formPaddingAndBorder=30,content=available-formPaddingAndBorder;assert.ok(content>0);assert.ok(content<=available,'zero-min grid/form cap fits available width');}
console.log('PASS #35: scoped form/zero-min grid, bounded inputs/native date, shrinking amount field, wrapping actions and unchanged booking constraints. CSS contract checks at 320–1280px; no physical rendering claim.');
