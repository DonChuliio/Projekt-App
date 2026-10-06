import { SUPABASE_URL, SUPABASE_KEY } from "../config/supabase.js";
import { getValidAccessToken } from "../auth/auth.js";

const TABLE_URL = `${SUPABASE_URL}/rest/v1/planner_texts`;

async function createHeaders(prefer = null) {
    const token = await getValidAccessToken();
    const headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };
    if (prefer) headers.Prefer = prefer;
    return headers;
}

export async function loadPlannerText(pageKey) {
    const response = await fetch(
        `${TABLE_URL}?page_key=eq.${encodeURIComponent(pageKey)}&select=id,content,updated_at&limit=1`,
        { headers: await createHeaders() }
    );
    if (!response.ok) throw new Error(`Text konnte nicht geladen werden (${response.status}): ${await response.text()}`);
    const rows = await response.json();
    return rows[0] || null;
}

export async function savePlannerText(pageKey, content) {
    const response = await fetch(
        `${TABLE_URL}?on_conflict=user_id,page_key`,
        {
            method: "POST",
            headers: await createHeaders("resolution=merge-duplicates,return=minimal"),
            body: JSON.stringify({
                page_key: pageKey,
                content,
                updated_at: new Date().toISOString()
            })
        }
    );
    if (!response.ok) throw new Error(`Text konnte nicht gespeichert werden (${response.status}): ${await response.text()}`);
}
