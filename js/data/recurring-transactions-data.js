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

export async function updateRecurringTransaction(id, entry) {
    const response = await fetch(`${TABLE_URL}?id=eq.${encodeURIComponent(id)}&select=id,name,amount,transaction_type,frequency,start_date`, {
        method: "PATCH",
        headers: await headers("return=representation"),
        body: JSON.stringify({ name: entry.name, amount: entry.amount, transaction_type: entry.transaction_type, frequency: entry.frequency, start_date: entry.start_date })
    });
    if (!response.ok) throw new Error("Eintrag konnte nicht geändert werden. Bitte erneut versuchen.");
    const rows = await response.json();
    if (rows.length !== 1) throw new Error("Eintrag ist nicht mehr verfügbar oder darf nicht geändert werden. Bitte neu laden.");
    return rows[0];
}

