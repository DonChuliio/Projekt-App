// Retired provider endpoint: nutrition entry now uses only the personal library.
Deno.serve((_request: Request) => Response.json({
 error: "Die externe Suche wurde eingestellt. Nährwerte werden manuell erfasst."
}, {status:410,headers:{"Cache-Control":"no-store","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"apikey,authorization,content-type,prefer","Access-Control-Allow-Methods":"POST,OPTIONS"}}));
