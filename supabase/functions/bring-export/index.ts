import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") || "";
 if (req.method !== "GET" && req.method !== "OPTIONS") return new Response("Method not allowed", { status: 405 });
 if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "https://donchuliio.github.io", "Access-Control-Allow-Methods": "GET, OPTIONS" } });
 if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return new Response("Not found", { status: 404 });
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await db
    .from("bring_exports")
    .select("name,items,expires_at")
    .eq("id", id)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, noarchive",
    "Access-Control-Allow-Origin": "https://donchuliio.github.io",
    "Vary": "Origin"
  };

  if (error || !data) {
    return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers });
  }

  return new Response(JSON.stringify({ name: data.name, items: data.items }), { status: 200, headers });
});