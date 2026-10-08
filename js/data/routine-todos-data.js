// Synchronisation über eine atomare Datenbankfunktion mit UNIQUE pro Benutzer/Routine/KW.
import { SUPABASE_URL, SUPABASE_KEY } from "../config/supabase.js";
import { getSession, getValidAccessToken } from "../auth/auth.js";
import { getISOWeek, getISOWeekYear } from "../utils/date.js";
let pending = null;
let pendingKey = null;

export function syncRoutineTodos() {
    const user = getSession()?.user?.id;
    if (!user) return Promise.resolve(0);
    const today = new Date();
    const year = getISOWeekYear(today), week = getISOWeek(today);
    const key = user + ":" + year + ":" + week;
    if (pending && pendingKey === key) return pending;
    pendingKey = key;
    const request = (async () => {
        const token = await getValidAccessToken();
        if (getSession()?.user?.id !== user) return 0;
        const response = await fetch(SUPABASE_URL + "/rest/v1/rpc/sync_week_routine_todos", {
            method: "POST",
            headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + token, "Content-Type": "application/json" },
            body: JSON.stringify({ p_year: year, p_week: week })
        });
        if (!response.ok) throw new Error("Routinen konnten nicht übernommen werden (" + response.status + ").");
        return response.json();
    })();
    pending = request;
    request.finally(() => {
        if (pending === request) { pending = null; pendingKey = null; }
    }).catch(() => {});
    return request;
}

export function initRoutineTodos() {
    const check = async () => {
        try {
            const count = await syncRoutineTodos();
            if (count) document.dispatchEvent(new CustomEvent("dock:todos-changed"));
            const status = document.getElementById("routine-sync-status");
            if (status) status.textContent = "";
        } catch (error) {
            console.error(error);
            const status = document.getElementById("routine-sync-status");
            if (status) status.textContent = "Routinen konnten nicht übernommen werden. Beim nächsten Öffnen wird erneut geprüft.";
        }
    };
    document.addEventListener("dock:auth-changed", check);
    document.addEventListener("dock:routines-changed", check);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") check();
    });
    window.addEventListener("pageshow", check);
    // Auch eine dauerhaft offene App berücksichtigt den Wochenwechsel.
    window.setInterval(() => {
        if (document.visibilityState === "visible") check();
    }, 60000);
    check();
}
