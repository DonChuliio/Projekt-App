// js/auth/auth.js

import {
    SUPABASE_URL,
    SUPABASE_KEY
} from "../config/supabase.js";

const SESSION_KEY = "dock-auth-session";
const REFRESH_MARGIN_SECONDS = 60;

let refreshPromise = null;
let sessionGeneration = 0;

function saveSession(session) {
    sessionGeneration++;
    if (!session.expires_at && session.expires_in) session.expires_at = Math.floor(Date.now()/1000) + Number(session.expires_in);
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

    return 0;
}

export function getSession() {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    try {
        const session = JSON.parse(raw);
        if (!session || typeof session !== "object" || !session.access_token || !session.user?.id) return null;
        return session;
    } catch {
        localStorage.removeItem(SESSION_KEY);
        return null;
    }
}

export function getAccessToken() {
    return getSession()?.access_token || null;
}

export function isLoggedIn() {
    const session = getSession();
    return Boolean(session?.refresh_token ||
        (session?.access_token && tokenExpiresAt(session) > Date.now()/1000));
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

    const generation = sessionGeneration;
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
            if ((response.status === 400 || response.status === 401) && generation === sessionGeneration) {
                localStorage.removeItem(SESSION_KEY);
                sessionGeneration++;
                document.dispatchEvent(new CustomEvent("dock:auth-changed"));
            }
            throw new Error(
                data.error_description ||
                data.msg ||
                "Sitzung konnte nicht erneuert werden."
            );
        }

        if (generation !== sessionGeneration) return null;
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

export async function signOut() {
    const token = getAccessToken();
    sessionGeneration++;
    localStorage.removeItem(SESSION_KEY);
    refreshPromise = null;
    if (!token) return true;
    try {
        const response = await fetch(SUPABASE_URL + "/auth/v1/logout?scope=local", {
            method: "POST",
            headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + token }
        });
        return response.ok;
    } catch { return false; }
}

window.addEventListener("storage", event => {
    if (event.key !== SESSION_KEY) return;
    sessionGeneration++;
    refreshPromise = null;
    document.dispatchEvent(new CustomEvent("dock:auth-changed"));
});
