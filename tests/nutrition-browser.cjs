// Real browser with intercepted app assets and synthetic authenticated API data.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),a=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.DOCK_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[],outside=[];page.on('pageerror',e=>errors.push(e.message));
  let foods=[{id:'11111111-1111-4111-8111-111111111111',name:'Nudeln',basis:'g',kcal:350,protein:12,carbs:70,fat:2}];
  let recipe={id:12,name:'Testrezept',ingredients:['500gr Nudeln','3 Eier','Milch'],description:'999 kg Zucker – nur Beschreibung',nutrition_portions:1,nutrition_stale:false};
  let portionRequests=0;
  await page.route('**/*',route=>{outside.push(route.request().url());return route.abort();});
  await page.route('https://*.supabase.co/**',async route=>{
   const req=route.request(),url=req.url(),body=req.postDataJSON(),headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,OPTIONS'};
   if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
   let result=[];
   if(url.includes('/personal_foods'))result=foods;
   else if(url.includes('/rpc/save_manual_food')){
    a.ok(!('quantity' in body.p_food));let item=foods.find(x=>x.id===body.p_id);
    if(!item){item={...body.p_food,id:foods.length===1?'22222222-2222-4222-8222-222222222222':'33333333-3333-4333-8333-333333333333'};foods.push(item);}result=item;
   }else if(url.includes('/rpc/save_manual_recipe_nutrition')){
    a.deepEqual(body.p_lines.map(l=>[l.quantity,l.unit]),[[500,'g'],[3,'piece'],[200,'ml']]);
    recipe.nutrition_data={method:'manual',ingredients:recipe.ingredients,totals:{kcal:2090,protein:87,carbs:360,fat:29},lines:body.p_lines};
    result={nutrition_data:recipe.nutrition_data,nutrition_portions:recipe.nutrition_portions};
   }else if(url.includes('/recipes')){
    if(req.method()==='PATCH'){portionRequests++;recipe={...recipe,...body};}result=[recipe];
   }else{outside.push(url);return route.abort();}
   await route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(result)});
  });
  const origin='http://127.0.0.1:8765';
  await page.route(origin+'/**',route=>{
   const url=new URL(route.request().url()),rel=url.pathname==='/'?'index.html':url.pathname.slice(1),file=path.resolve(rel);
   if(!file.startsWith(process.cwd()+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404});
   if(rel==='index.html')return route.fulfill({contentType:'text/html',body:fs.readFileSync(file,'utf8').replace(/<script\b(?=[^>]*id="app-script")[\s\S]*?<\/script>/,'')});
   return route.fulfill({path:file});
  });
  await page.addInitScript(()=>localStorage.setItem('dock-auth-session',JSON.stringify({access_token:'synthetic',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:'synthetic-user'}})));
  await page.goto(origin+'/');
  await page.evaluate(async()=>{
   const n=await import('/js/recipes/nutrition.js?v=1.117'),r=await import('/js/router.js'),nav=await import('/js/navigation.js?v=1.105');
   nav.initNavigation();n.initNutrition(recipe=>{const root=document.getElementById('recipe-view-content');root.replaceChildren();n.appendNutritionSection(root,recipe,()=>n.openNutrition(recipe));r.showView('recipe-view');});
   await n.openNutrition({id:12});
  });
  const active=page.locator('[data-view="recipe-nutrition"]'),field=name=>active.getByLabel(name,{exact:true}),button=name=>active.getByRole('button',{name,exact:true});
  const fill=async values=>{for(const [i,key] of ['kcal','KH (g)','Eiweiß (g)','Fett (g)'].entries())await field(key).fill(String(values[i]));};
  a.equal(await field('Menge').inputValue(),'500');
  await button('Lebensmittelbibliothek öffnen').click();await field('Bibliothek durchsuchen').fill('Nudeln');await button('Nudeln · 100 g').click();a.equal(await field('kcal').inputValue(),'350');await button('Zutat bestätigen').click();
  await active.getByText('Zutat 2 von 3',{exact:true}).waitFor();a.equal(await field('Bezugsgröße').inputValue(),'piece');await fill([80,0,7,5]);await button('Zutat bestätigen').click();
  await active.getByText('Keine eindeutige Menge erkannt.',{exact:false}).waitFor();await field('Menge').fill('200');await field('Einheit').selectOption('ml');await field('Bezugsgröße').selectOption('ml');await fill([50,5,3,2]);await button('Zutat bestätigen').click();await button('Berechnung speichern').click();
  await page.getByRole('heading',{name:'Gesamtes Rezept',exact:true}).waitFor();a.ok(await page.getByText('2.090 kcal',{exact:true}).first().isVisible());await page.getByRole('spinbutton',{name:'Portionen',exact:true}).fill('2');await page.getByText('Portionen gespeichert.',{exact:true}).waitFor();a.ok(await page.getByText('1.045 kcal',{exact:true}).isVisible());a.equal(portionRequests,1);a.equal(foods.length,3);a.deepEqual(outside,[]);a.deepEqual(errors,[]);a.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  console.log('PASS: Chromium at 390px, manual ingredient entry, library icon reuse, missing quantity, piece/100ml, recipe save and portion change. Synthetic API only.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
