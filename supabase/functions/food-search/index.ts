const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info,prefer','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store'};
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:cors});
const nutrient=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100000?value:null;
export function foodProducts(raw:any){return (Array.isArray(raw?.hits)?raw.hits:Array.isArray(raw?.products)?raw.products:[]).slice(0,8).filter((p:any)=>/^\d{4,20}$/.test(String(p.code))&&typeof p.product_name==='string'&&p.product_name.trim()).map((p:any)=>({name:(p.product_name+(p.brands?' · '+(Array.isArray(p.brands)?p.brands.filter((brand:any)=>typeof brand==='string').map((brand:string)=>brand.trim()).filter(Boolean).join(', '):String(p.brands)):'')).slice(0,200),basis:'',kcal:nutrient(p.nutriments?.['energy-kcal_100g']),protein:nutrient(p.nutriments?.proteins_100g),carbs:nutrient(p.nutriments?.carbohydrates_100g),fat:nutrient(p.nutriments?.fat_100g),source_ref:'https://world.openfoodfacts.org/product/'+p.code}));}
export async function handleFoodSearch(req:Request){
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return reply({error:'Methode nicht erlaubt.'},405);
 const authorization=req.headers.get('Authorization');if(!authorization?.startsWith('Bearer '))return reply({error:'Bitte anmelden.'},401);
 try{
  const url=Deno.env.get('SUPABASE_URL'),key=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!url||!key)return reply({error:'Suchdienst nicht eingerichtet.'},503);
  const auth=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:authorization},signal:AbortSignal.timeout(8000)});if(!auth.ok)return reply({error:'Bitte erneut anmelden.'},401);const user=await auth.json();if(!user?.id)return reply({error:'Bitte anmelden.'},401);
  if(Number(req.headers.get('Content-Length')||0)>2048)return reply({error:'Suchanfrage zu groß.'},413);
  const text=await req.text();if(text.length>2048)return reply({error:'Suchanfrage zu groß.'},413);let body;try{body=JSON.parse(text);}catch{return reply({error:'Ungültige Suchanfrage.'},400);}
  const term=typeof body.term==='string'?body.term.trim().replace(/\s+/g,' ').toLocaleLowerCase('de'):'';if(term.length<2||term.length>80)return reply({error:'Bitte 2 bis 80 Zeichen eingeben.'},400);
  const rpcHeaders:Record<string,string>={apikey:key,'Content-Type':'application/json'};if(!key.startsWith('sb_secret_'))rpcHeaders.Authorization='Bearer '+key;
  const rpc=async(name:string,data:any)=>{const response=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers:rpcHeaders,body:JSON.stringify(data),signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('internal');const value=await response.text();return value?JSON.parse(value):null;};
  const gate=await rpc('begin_food_search',{p_query:term});if(gate.cached)return reply({products:gate.products});if(!gate.allowed)return reply({error:'Suchlimit erreicht. Bitte in einer Minute erneut versuchen oder eigene Werte verwenden.'},429);
  const response=await fetch('https://search.openfoodfacts.org/search',{method:'POST',headers:{'User-Agent':'Dock/1.107 (https://donchuliio.github.io/Projekt-App/)','Accept':'application/json','Content-Type':'application/json'},body:JSON.stringify({q:term,langs:['de'],page_size:8,fields:['code','product_name','brands','nutriments']}),redirect:'error',signal:AbortSignal.timeout(10000)});
  if(response.status===429)return reply({error:'Open Food Facts begrenzt gerade die Suchanfragen. Bitte später erneut versuchen oder eigene Werte verwenden.'},429);
  if(!response.ok)return reply({error:'Open Food Facts ist gerade nicht verfügbar. Eigene Werte bleiben möglich.'},503);
  const products=foodProducts(await response.json());await rpc('finish_food_search',{p_query:term,p_products:products});return reply({products});
 }catch{return reply({error:'Lebensmittelsuche momentan nicht verfügbar. Bitte erneut versuchen oder eigene Werte eingeben.'},503);}
}
Deno.serve(handleFoodSearch);
