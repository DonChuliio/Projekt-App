import { SUPABASE_URL, SUPABASE_KEY } from "../config/supabase.js";
import { getValidAccessToken } from "../auth/auth.js";

const TABLE_URL = `${SUPABASE_URL}/rest/v1/calendar_settings`;

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

export async function loadCalendarSettings() {
    const response = await fetch(
        `${TABLE_URL}?select=month_end_savings_reminder&limit=1`,
        { headers: await createHeaders() }
    );
    if (!response.ok) throw new Error(`Kalender-Einstellungen konnten nicht geladen werden (${response.status}): ${await response.text()}`);
    const rows = await response.json();
    return rows[0] || null;
}

export async function saveMonthEndSavingsReminder(enabled) {
    const response = await fetch(
        `${TABLE_URL}?on_conflict=user_id`,
        {
            method: "POST",
            headers: await createHeaders("resolution=merge-duplicates,return=minimal"),
            body: JSON.stringify({
                month_end_savings_reminder: enabled,
                updated_at: new Date().toISOString()
            })
        }
    );
    if (!response.ok) throw new Error(`Kalender-Einstellung konnte nicht gespeichert werden (${response.status}): ${await response.text()}`);
}
