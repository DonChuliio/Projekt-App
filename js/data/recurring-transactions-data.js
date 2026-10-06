import { SUPABASE_URL, SUPABASE_KEY } from "../config/supabase.js";
import { getValidAccessToken } from "../auth/auth.js";

const TABLE_URL = `${SUPABASE_URL}/rest/v1/recurring_transactions`;

async function headers(prefer = null) {
    const token = await getValidAccessToken();
    const result = {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };
    if (prefer) result.Prefer = prefer;
    return result;
}

export async function loadRecurringTransactions() {
    const response = await fetch(
        `${TABLE_URL}?select=id,name,amount,transaction_type,frequency,start_date&order=start_date.asc,created_at.asc`,
        { headers: await headers() }
    );
    if (!response.ok) throw new Error(`Wiederkehrende Buchungen konnten nicht geladen werden (${response.status}): ${await response.text()}`);
    return await response.json();
}

export async function addRecurringTransaction(entry) {
    const response = await fetch(TABLE_URL, {
        method: "POST",
        headers: await headers("return=representation"),
        body: JSON.stringify(entry)
    });
    if (!response.ok) throw new Error(`Eintrag konnte nicht gespeichert werden (${response.status}): ${await response.text()}`);
    return (await response.json())[0];
}

export async function deleteRecurringTransaction(id) {
    const response = await fetch(`${TABLE_URL}?id=eq.${id}`, {
        method: "DELETE",
        headers: await headers()
    });
    if (!response.ok) throw new Error(`Eintrag konnte nicht gelöscht werden (${response.status}): ${await response.text()}`);
}
