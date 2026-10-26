import { loadTodayReminders } from '../data/reminders-data.js?v=1.109';
import { morningSummary, reminderLabel } from '../reminders/model.js?v=1.109';
import { loadBirthdays } from '../data/birthdays-data.js?v=1.112';
import { upcomingBirthdays, nextBirthdayLabel } from '../birthdays/model.js?v=1.112';
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
    const reminders = document.getElementById("morning-reminder-list");
    const summary = document.getElementById("morning-summary");
    const birthdaySection = document.getElementById("morning-birthday-section");
    const birthdayList = document.getElementById("morning-birthday-list");
    const birthdayStatus = document.getElementById("morning-birthday-status");
    if (birthdaySection) birthdaySection.hidden = true;
    if (birthdayList) birthdayList.replaceChildren();
    if (birthdayStatus) birthdayStatus.textContent = "";
    let todoCount = null, reminderCount = null;
    const updateSummary = () => { if (summary) summary.textContent = morningSummary(todoCount, reminderCount); };
    if (summary) summary.textContent = "Tagesübersicht wird geladen …";
    if (reminders) message(reminders, "Erinnerungen werden geladen …");
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
            if(reminders)message(reminders,"Erinnerungen konnten nicht geladen werden.");
            if(birthdayStatus)birthdayStatus.textContent="Geburtstage konnten nicht geladen werden.";
            updateSummary();
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
            todoCount=open.length; updateSummary();
            if (!open.length) {
                message(todos, "Keine wichtigen To-dos offen. Ein guter Start!");
                return;
            }
            todos.replaceChildren();
            for (const row of open) taskButton(todos, row.text, openTodos);
        }).catch(() => {
            if (current()) {message(todos, "To-dos konnten nicht geladen werden.");updateSummary();}
        }),
        loadTodayReminders(day).then(rows => {
            if(!current())return;
            const todayRows=rows.filter(r=>r.reminder_date===day);
            reminderCount=todayRows.length;updateSummary();
            if(!reminders)return;
            reminders.replaceChildren();
            if(!todayRows.length)message(reminders,"Keine Erinnerungen für heute.");
            for(const row of todayRows)taskButton(reminders,row.title+" · "+reminderLabel(row),()=>{
                generation++;document.dispatchEvent(new CustomEvent("dock:open-reminder",{detail:{id:row.id}}));
            });
        }).catch(()=>{if(current()){if(reminders)message(reminders,"Erinnerungen konnten nicht geladen werden.");updateSummary();}}),
        birthdaySection && birthdayList ? loadBirthdays().then(rows => {
            if (!current()) return;
            const upcoming = upcomingBirthdays(rows, today);
            birthdayList.replaceChildren();
            for (const row of upcoming) taskButton(birthdayList, row.name + " · " + nextBirthdayLabel(row), () => {
                generation++;
                document.dispatchEvent(new CustomEvent("dock:open-birthday", {detail:{id:row.id}}));
            });
            birthdaySection.hidden = upcoming.length === 0;
        }).catch(() => { if(current() && birthdayStatus)birthdayStatus.textContent="Geburtstage konnten nicht geladen werden."; }) : Promise.resolve()
    ]);
}

export function initMorning() {
    document.getElementById("morning-birthday-open")?.addEventListener("click", () => { generation++; showView("birthdays"); });
    document.getElementById("morning-reminder-open")?.addEventListener("click", () => { generation++; showView("reminders"); });
    document.getElementById("morning-todo-open")?.addEventListener("click", openTodos);
    document.getElementById("morning-dashboard")?.addEventListener("click", () => {
        generation++;
        showView("dashboard");
    });
    document.addEventListener("dock:auth-changed", () => {
        generation++;
        const birthdays = document.getElementById("morning-birthday-section");
        if (birthdays) birthdays.hidden = true;
        document.getElementById("morning-birthday-list")?.replaceChildren();
        const birthdayStatus = document.getElementById("morning-birthday-status");
        if (birthdayStatus) birthdayStatus.textContent = "";
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

