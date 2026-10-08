// js/data/recipes-data.js

import { SUPABASE_URL, SUPABASE_KEY } from "../config/supabase.js";
import { getValidAccessToken } from "../auth/auth.js";

const TABLE_URL = `${SUPABASE_URL}/rest/v1/recipes`;

async function createHeaders(extra = {}) {
    const token = await getValidAccessToken();
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        ...extra
    };
}

async function api(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: await createHeaders(options.headers || {})
    });

    if (!response.ok) {
        throw new Error(
            `Rezept-Fehler ${response.status}: ${await response.text()}`
        );
    }

    return response;
}

export async function loadRecipes() {
    const response = await api(
        `${TABLE_URL}?select=id,name,ingredients,description,created_at,updated_at&order=updated_at.desc,id.desc`
    );
    return response.json();
}

export async function createRecipe({ name, ingredients, description }) {
    const response = await api(TABLE_URL, {
        method: "POST",
        headers: { "Prefer": "return=representation" },
        body: JSON.stringify({
            name: name.trim(),
            ingredients,
            description,
            updated_at: new Date().toISOString()
        })
    });

    const rows = await response.json();
    return rows[0] || null;
}

export async function updateRecipe(id, { name, ingredients, description }) {
    const response = await api(
        `${TABLE_URL}?id=eq.${encodeURIComponent(id)}`,
        {
            method: "PATCH",
            headers: { "Prefer": "return=representation" },
            body: JSON.stringify({
                name: name.trim(),
                ingredients,
                description,
                updated_at: new Date().toISOString()
            })
        }
    );

    const rows = await response.json();
    return rows[0] || null;
}

export async function deleteRecipe(id) {
    await api(
        `${TABLE_URL}?id=eq.${encodeURIComponent(id)}`,
        {
            method: "DELETE",
            headers: { "Prefer": "return=minimal" }
        }
    );
}
