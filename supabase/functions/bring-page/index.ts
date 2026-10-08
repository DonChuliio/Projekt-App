import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const esc=(v:string)=>v.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));

Deno.serve(async(req:Request)=>{
 const id=new URL(req.url).searchParams.get("id")||"";
 if (req.method !== "GET" && req.method !== "OPTIONS") return new Response("Method not allowed", { status: 405 });
 if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "https://donchuliio.github.io", "Access-Control-Allow-Methods": "GET, OPTIONS" } });
 if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return new Response("Not found", { status: 404 });
 const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
 const {data}=await db.from("bring_exports").select("name,items").eq("id",id).gt("expires_at",new Date().toISOString()).maybeSingle();
 if(!data)return new Response("Export nicht gefunden",{status:404,headers:{"content-type":"text/plain; charset=utf-8"}});
 const name=String(data.name||"Dock Packliste");
 const items=Array.isArray(data.items)?data.items.map(String).filter(Boolean):[];
 const recipe=JSON.stringify({"@context":"https://schema.org","@type":"Recipe","name":name,"author":{"@type":"Person","name":"Dock"},"image":"https://donchuliio.github.io/Projekt-App/dock-icon-512.png","recipeYield":"1 Packliste","recipeIngredient":items}).replace(/</g,"\\u003c");
 const lis=items.map((x:string)=>"<li>"+esc(x)+"</li>").join("");
 const html='<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>'+esc(name)+'</title><script type="application/ld+json">'+recipe+'</'+'script><script async="async" src="https://platform.getbring.com/widgets/import.js"></'+'script><style>:root{color-scheme:dark;--bg:#121212;--surface:#1e1e1e;--border:#2a2a2a;--text:#eaeaea;--muted:#9aa0a6;--petrol:#2bb0a6}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:24px}main{max-width:520px;margin:0 auto}.card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px}h1{margin-top:0}li{padding:7px 0}a.back{display:inline-block;margin-top:18px;color:var(--petrol)}</style></head><body><main><div class="card"><h1>'+esc(name)+'</h1><p>Diese Auswahl wird an Bring! übergeben.</p><ul>'+lis+'</ul><div data-bring-import="" style="display:none"></div></div><a class="back" href="https://donchuliio.github.io/Projekt-App/">Zurück zu Dock</a></main></body></html>';
 return new Response(html,{status:200,headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store","referrer-policy":"no-referrer","x-content-type-options":"nosniff","x-robots-tag":"noindex, noarchive"}});
});