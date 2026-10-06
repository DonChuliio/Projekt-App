// js/auth/auth.js

import {
    SUPABASE_URL,
    SUPABASE_KEY
} from "../config/supabase.js";

const SESSION_KEY = "dock-auth-session";

export function getSession() {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch {
        localStorage.removeItem(SESSION_KEY);
        return null;
    }
}

export function getAccessToken() {
    return getSession()?.access_token || null;
}

export function isLoggedIn() {
    return Boolean(getAccessToken());
}

export async function signIn(email, password) {
    const response = await fetch(
        `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
        {
            method: "POST",
            headers: {
                "apikey": SUPABASE_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email.trim(),
                password
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.error_description ||
            data.msg ||
            "Anmeldung fehlgeschlagen."
        );
    }

    localStorage.setItem(
        SESSION_KEY,
        JSON.stringify(data)
    );

    return data;
}

export function signOut() {
    localStorage.removeItem(SESSION_KEY);
}
