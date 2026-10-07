// js/data/notes-data.js
// Supabase persistence for multiple general notes.

import { SUPABASE_URL, SUPABASE_KEY } from "../config/supabase.js";
import { getValidAccessToken } from "../auth/auth.js";

const TABLE_URL = `${SUPABASE_URL}/rest/v1/notes`;

async function headers(extra = {}) {
    const accessToken = await getValidAccessToken();
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...extra
    };
}

async function api(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: await headers(options.headers || {})
    });
    if (!response.ok) {
        throw new Error(`Notizen-Fehler ${response.status}: ${await response.text()}`);
    }
    return response;
}

export async function loadNotes() {
    const response = await api(
        `${TABLE_URL}?select=id,content,created_at,updated_at&order=updated_at.desc,id.desc`
    );
    return response.json();
}

export async function createNote(content = "") {
    const response = await api(TABLE_URL, {
        method: "POST",
        headers: { "Prefer": "return=representation" },
        body: JSON.stringify({
            content,
            updated_at: new Date().toISOString()
        })
    });
    const rows = await response.json();
    return rows[0];
}

export async function updateNote(id, content) {
    await api(`${TABLE_URL}?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Prefer": "return=minimal" },
        body: JSON.stringify({
            content,
            updated_at: new Date().toISOString()
        })
    });
}
