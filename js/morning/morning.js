// Guten-Morgen-Ansicht: vorhandene Daten, keine eigenen Aufgabenbestände.
import { getSession, isLoggedIn, getValidAccessToken } from "../auth/auth.js";
import { loadTodos } from "../data/todo-data.js?v=1.59";
import { syncRoutineTodos } from "../data/routine-todos-data.js?v=1.59";
import { getISOWeek } from "../utils/date.js";
import { showView } from "../router.js";

let generation = 0;
const shownThisSession = new Map();

function localDay(date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")].join("-");
}

function message(container, text) {
    container.replaceChildren();
    const p = document.createElement("p");
    p.className = "morning-status";
    p.textContent = text;
    container.appendChild(p);
}

function taskButton(container, text, navigate) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "morning-task";
    button.textContent = text;
    button.addEventListener("click", navigate);
    container.appendChild(button);
}

function openTodos() {
    generation++;
    showView("todo");
    document.dispatchEvent(new CustomEvent("dock:todos-changed"));
}

export async function maybeShowMorning() {
    const today = new Date();
    const userId = getSession()?.user?.id;
    const view = document.querySelector('[data-view="good-morning"]');
    const dashboard = document.querySelector('[data-view="dashboard"]');
    if (!userId || !isLoggedIn() || today.getHours() >= 12 || !view ||
        !dashboard || dashboard.classList.contains("hidden") ||
        document.visibilityState === "hidden") return;

    const day = localDay(today);
    const key = "dock-morning-last-shown:" + userId;
    let stored;
    try { stored = localStorage.getItem(key); } catch { /* Session fallback */ }
    if (stored === day || shownThisSession.get(userId) === day) return;

    const week = getISOWeek(today);
    const todos = document.getElementById("morning-todo-list");
    const dateLabel = document.getElementById("morning-date");
    if (!todos || !dateLabel) return;
    dateLabel.textContent = today.toLocaleDateString("de-DE", {
        weekday: "long", day: "2-digit", month: "long"
    }) + " · KW " + week;
    message(todos, "Wichtige To-dos werden geladen…");
    showView("good-morning");
    if (view.classList.contains("hidden")) return;
    shownThisSession.set(userId, day);
    try { localStorage.setItem(key, day); } catch { /* Session fallback */ }
    const request = ++generation;
    const current = () => request === generation &&
        getSession()?.user?.id === userId &&
        !view.classList.contains("hidden");
    try {
        await getValidAccessToken();
    } catch (error) {
        if (current()) {
            message(todos, "To-dos konnten nicht geladen werden.");
        }
        return;
    }
    if (!current()) return;
    let syncFailed = false;
    try { await syncRoutineTodos(); } catch { syncFailed = true; }
    if (!current()) return;
    const syncStatus = document.getElementById("morning-sync-status");
    if (syncStatus) syncStatus.textContent = syncFailed
        ? "Routinen konnten nicht übernommen werden. Deine vorhandenen To-dos werden angezeigt." : "";
    await Promise.all([
        loadTodos("a").then(rows => {
            if (!current()) return;
            const open = rows.filter(row => row.priority === "a" && !row.completed_at);
            if (!open.length) {
                message(todos, "Keine wichtigen To-dos offen. Ein guter Start!");
                return;
            }
            todos.replaceChildren();
            for (const row of open) taskButton(todos, row.text, openTodos);
        }).catch(() => {
            if (current()) message(todos, "To-dos konnten nicht geladen werden.");
        })
    ]);
}

export function initMorning() {
    document.getElementById("morning-todo-open")?.addEventListener("click", openTodos);
    document.getElementById("morning-dashboard")?.addEventListener("click", () => {
        generation++;
        showView("dashboard");
    });
    document.addEventListener("dock:auth-changed", () => {
        generation++;
        showView("dashboard");
        maybeShowMorning();
    });
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            if (!document.querySelector('[data-view="good-morning"]')?.classList.contains("hidden")) {
                generation++;
                showView("dashboard");
            }
            maybeShowMorning();
        }
    });
    window.addEventListener("pageshow", event => {
        if (event.persisted) {
            generation++;
            showView("dashboard");
            maybeShowMorning();
        }
    });
    maybeShowMorning();
}
