// js/data/notes-data.js

import {
    SUPABASE_URL,
    SUPABASE_KEY
} from "../config/supabase.js";

import {
    getAccessToken
} from "../auth/auth.js";

const TABLE_URL = `${SUPABASE_URL}/rest/v1/notes`;

function createHeaders() {
    const accessToken = getAccessToken();

    if (!accessToken) {
        throw new Error("Keine aktive Anmeldung vorhanden.");
    }

    return {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
    };
}

export async function loadNote() {
    const response = await fetch(
        `${TABLE_URL}?select=id,content,updated_at&limit=1`,
        {
            method: "GET",
            headers: createHeaders()
        }
    );

    if (!response.ok) {
        throw new Error(
            `Notiz konnte nicht geladen werden (${response.status}): ${await response.text()}`
        );
    }

    const rows = await response.json();
    return rows[0] || null;
}

export async function saveNote(content) {
    const existing = await loadNote();

    if (existing) {
        const response = await fetch(
            `${TABLE_URL}?id=eq.${encodeURIComponent(existing.id)}`,
            {
                method: "PATCH",
                headers: {
                    ...createHeaders(),
                    "Prefer": "return=minimal"
                },
                body: JSON.stringify({
                    content,
                    updated_at: new Date().toISOString()
                })
            }
        );

        if (!response.ok) {
            throw new Error(
                `Notiz konnte nicht gespeichert werden (${response.status}): ${await response.text()}`
            );
        }

        return;
    }

    const response = await fetch(TABLE_URL, {
        method: "POST",
        headers: {
            ...createHeaders(),
            "Prefer": "return=minimal"
        },
        body: JSON.stringify({
            content,
            updated_at: new Date().toISOString()
        })
    });

    if (!response.ok) {
        throw new Error(
            `Notiz konnte nicht gespeichert werden (${response.status}): ${await response.text()}`
        );
    }
}
