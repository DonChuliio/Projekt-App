const fs=require('node:fs'),vm=require('node:vm'),a=require('node:assert/strict');
let status=200,providerRequest,cacheWrites=0;
const hit={code:'8710400200857',product_name:'Paprika',brands:[' Test ','Marke'],nutriments:{'energy-kcal_100g':24,proteins_100g:.8,carbohydrates_100g:4,fat_100g:0}};
const ctx={Response,Request,AbortSignal,Deno:{env:{get:k=>({SUPABASE_URL:'https://db.test',SUPABASE_SERVICE_ROLE_KEY:'placeholder'})[k]},serve(){}},fetch:async(url,options)=>{
 if(url.endsWith('/auth/v1/user'))return Response.json({id:'synthetic-user'});
 if(url.endsWith('/begin_food_search'))return Response.json({allowed:true});
 if(url.endsWith('/finish_food_search')){cacheWrites++;return Response.json(null);}
 a.equal(url,'https://search.openfoodfacts.org/search');providerRequest=options;
 return status===200?Response.json({hits:[hit,{code:'123456',product_name:'Unvollständig'},...Array(10).fill(hit)]}):new Response('',{status});
}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('supabase/functions/food-search/index.ts','utf8').replace(/export /g,'').replace(/:Record<string,string>/g,'').replace(/:unknown|:any|:Request|:string/g,''),ctx);
const request=()=>new Request('https://test',{method:'POST',headers:{Authorization:'Bearer synthetic'},body:JSON.stringify({term:'Paprika'})});
(async()=>{
 let response=await ctx.handleFoodSearch(request());a.equal(response.status,200);const products=(await response.json()).products;
 a.equal(providerRequest.method,'POST');a.deepEqual(JSON.parse(providerRequest.body),{q:'paprika',langs:['de'],page_size:8,fields:['code','product_name','brands','nutriments']});
 a.equal(providerRequest.headers['Content-Type'],'application/json');a.equal(providerRequest.redirect,'error');a.ok(!providerRequest.headers.Authorization);
 a.equal(products.length,8);a.equal(products[0].name,'Paprika · Test, Marke');a.equal(products[0].kcal,24);a.equal(products[0].fat,0);a.equal(products[1].kcal,null);a.equal(products[0].basis,'');a.equal(cacheWrites,1);
 status=429;response=await ctx.handleFoodSearch(request());a.equal(response.status,429);a.match((await response.json()).error,/begrenzt/);a.equal(cacheWrites,1);
 status=503;response=await ctx.handleFoodSearch(request());a.equal(response.status,503);a.equal(cacheWrites,1);
 if(process.env.OFF_SEARCH_JSON){const raw=JSON.parse(fs.readFileSync(process.env.OFF_SEARCH_JSON,'utf8'));a.ok(Array.isArray(raw.hits)&&raw.hits.length);const parsed=ctx.foodProducts(raw);a.ok(parsed.length&&parsed.some(p=>p.kcal!==null));a.ok(parsed.every(p=>!('salt'in p)&&!('sugars'in p)));}
 console.log('PASS: official search-a-licious POST/de/field contract, hits and brand arrays, eight-product cap, four nullable nutrients, explicit basis, provider rate-limit/outage, no failure caching; optional real production response parsed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
