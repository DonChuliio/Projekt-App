const SUPABASE_EXPORT_URL =
  "https://osmmjfuzuxhwtfcttdxp.supabase.co/functions/v1/bring-export";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

export default async function handler(req, res) {
  const id = typeof req.query.id === "string" ? req.query.id : "";

  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Robots-Tag", "noindex, noarchive");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Export-ID fehlt.");
    return;
  }

  try {
    const source = await fetch(
      SUPABASE_EXPORT_URL + "?id=" + encodeURIComponent(id),
      { headers: { Accept: "application/json" } }
    );

    if (!source.ok) {
      res.statusCode = source.status === 404 ? 404 : 502;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Der Bring!-Export ist abgelaufen oder nicht verfügbar.");
      return;
    }

    const data = await source.json();
    const name = String(data?.name || "Dock Packliste");
    const items = Array.isArray(data?.items)
      ? data.items.map(String).map((item) => item.trim()).filter(Boolean)
      : [];

    if (!items.length) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Keine Einträge für den Export gefunden.");
      return;
    }

    const recipe = {
      "@context": "https://schema.org",
      "@type": "Recipe",
      name,
      author: { "@type": "Person", name: "Dock" },
      image: "https://donchuliio.github.io/Projekt-App/dock-icon-512.png",
      recipeYield: "1 Packliste",
      recipeIngredient: items
    };

    const safeJson = JSON.stringify(recipe).replace(/</g, "\\u003c");
    const list = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");

    const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#121212">
<title>${escapeHtml(name)} – Dock</title>
<script type="application/ld+json">${safeJson}</script>
<script async="async" src="https://platform.getbring.com/widgets/import.js"></script>
<style>
:root{color-scheme:dark;--bg:#121212;--surface:#1e1e1e;--border:#2a2a2a;--text:#eaeaea;--muted:#9aa0a6;--petrol:#2bb0a6}
*{box-sizing:border-box}
body{margin:0;padding:24px;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
main{max-width:520px;margin:0 auto}
.card{padding:20px;background:var(--surface);border:1px solid var(--border);border-radius:14px}
h1{margin:0 0 8px;font-size:24px}
p{line-height:1.45}
li{padding:5px 0}
.back{display:inline-block;margin-top:18px;color:var(--petrol)}
</style>
</head>
<body>
<main>
<div class="card">
<h1>${escapeHtml(name)}</h1>
<p>Diese Auswahl wird an Bring! übergeben.</p>
<ul>${list}</ul>
<div data-bring-import="" style="display:none"></div>
</div>
<a class="back" href="https://donchuliio.github.io/Projekt-App/">Zurück zu Dock</a>
</main>
</body>
</html>`;

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(html);
  } catch (error) {
    console.error("Bring export failed", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Der Bring!-Export konnte nicht geladen werden.");
  }
}
