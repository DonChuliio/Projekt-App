import { SUPABASE_URL, SUPABASE_KEY } from "../config/supabase.js";
import { getValidAccessToken } from "../auth/auth.js";

const TABLE_URL = `${SUPABASE_URL}/rest/v1/house_calculations`;

async function createHeaders(prefer = null) {
 const token = await getValidAccessToken();
 const headers = {"apikey": SUPABASE_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json"};
 if (prefer) headers.Prefer = prefer;
 return headers;
}

export async function loadHouseCalculation() {
 const response = await fetch(`${TABLE_URL}?select=total_amount,equity,interest_rate,years,updated_at&limit=1`, {headers: await createHeaders()});
 if (!response.ok) throw new Error(`Hausrechnung konnte nicht geladen werden (${response.status}): ${await response.text()}`);
 const rows = await response.json();
 return rows[0] || null;
}

export async function saveHouseCalculation(values) {
 const response = await fetch(`${TABLE_URL}?on_conflict=user_id`, {method:"POST", headers: await createHeaders("resolution=merge-duplicates,return=minimal"), body: JSON.stringify({total_amount:values.total,equity:values.equity,interest_rate:values.interest,years:values.years,updated_at:new Date().toISOString()})});
 if (!response.ok) throw new Error(`Hausrechnung konnte nicht gespeichert werden (${response.status}): ${await response.text()}`);
}
