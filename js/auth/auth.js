// js/auth/auth.js

import {
    SUPABASE_URL,
    SUPABASE_KEY
} from "../config/supabase.js";

const SESSION_KEY = "dock-auth-session";
const REFRESH_MARGIN_SECONDS = 60;

let refreshPromise = null;

function saveSession(session) {
    localStorage.setItem(
        SESSION_KEY,
        JSON.stringify(session)
    );
}

function tokenExpiresAt(session) {
    if (!session) return 0;

    if (session.expires_at) {
        return Number(session.expires_at);
    }

    if (session.expires_in) {
        return Math.floor(Date.now() / 1000) + Number(session.expires_in);
    }

    return 0;
}

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
    return Boolean(getSession()?.refresh_token || getAccessToken());
}

export async function refreshSession(force = false) {
    const session = getSession();

    if (!session) {
        return null;
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = tokenExpiresAt(session);

    if (
        !force &&
        session.access_token &&
        (!expiresAt || expiresAt - now > REFRESH_MARGIN_SECONDS)
    ) {
        return session;
    }

    if (!session.refresh_token) {
        return session;
    }

    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        const response = await fetch(
            `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
            {
                method: "POST",
                headers: {
                    "apikey": SUPABASE_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    refresh_token: session.refresh_token
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error_description ||
                data.msg ||
                "Sitzung konnte nicht erneuert werden."
            );
        }

        saveSession(data);
        return data;
    })();

    try {
        return await refreshPromise;
    } finally {
        refreshPromise = null;
    }
}

export async function getValidAccessToken() {
    const session = await refreshSession();

    if (!session?.access_token) {
        throw new Error("Keine aktive Anmeldung vorhanden.");
    }

    return session.access_token;
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

    saveSession(data);
    return data;
}

export function signOut() {
    localStorage.removeItem(SESSION_KEY);
}
