import { loadTodayReminders } from '../data/reminders-data.js?v=1.114';
import { reminderLabel } from '../reminders/model.js?v=1.109';
import { loadBirthdays } from '../data/birthdays-data.js?v=1.112';
import { upcomingBirthdays, nextBirthdayLabel } from '../birthdays/model.js?v=1.114';
import { morningEnd, morningReminders } from './model.js?v=1.114';
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

export async function maybeShowMorning({manual=false}={}) {
    const today = new Date();
    const userId = getSession()?.user?.id;
    const view = document.querySelector('[data-view="good-morning"]');
    const dashboard = document.querySelector('[data-view="dashboard"]');
    if (!userId || !isLoggedIn() || (!manual && today.getHours() >= 12) || !view ||
        !dashboard || (!manual && dashboard.classList.contains("hidden")) ||
        document.visibilityState === "hidden") return;

    const day = localDay(today);
    const end = morningEnd(today);
    const key = "dock-morning-last-shown:" + userId;
    let stored;
    try { stored = localStorage.getItem(key); } catch { /* Session fallback */ }
    if (!manual && (stored === day || shownThisSession.get(userId) === day)) return;

    const week = getISOWeek(today);
    const todos = document.getElementById("morning-todo-list");
    const dateLabel = document.getElementById("morning-date");
    if (!todos || !dateLabel) return;
    dateLabel.textContent = today.toLocaleDateString("de-DE", {
        weekday: "long", day: "2-digit", month: "long"
    }) + " · KW " + week;
    const reminders = document.getElementById("morning-reminder-list");
    const todoSection=document.getElementById('morning-todo-section'),reminderSection=document.getElementById('morning-reminder-section');
    const todoStatus=document.getElementById('morning-todo-status'),reminderStatus=document.getElementById('morning-reminder-status');
    if(todoSection)todoSection.hidden=true;if(reminderSection)reminderSection.hidden=true;
    if(todoStatus)todoStatus.textContent='';if(reminderStatus)reminderStatus.textContent='';
    const birthdaySection = document.getElementById("morning-birthday-section");
    const birthdayList = document.getElementById("morning-birthday-list");
    const birthdayStatus = document.getElementById("morning-birthday-status");
    if (birthdaySection) birthdaySection.hidden = true;
    if (birthdayList) birthdayList.replaceChildren();
    if (birthdayStatus) birthdayStatus.textContent = "";
    if (reminders) message(reminders, "Erinnerungen werden geladen …");
    message(todos, "Wichtige To-dos werden geladen…");
    showView("good-morning");
    if (view.classList.contains("hidden")) return;
    if (!manual) {
        shownThisSession.set(userId, day);
        try { localStorage.setItem(key, day); } catch { /* Session fallback */ }
    }
    const request = ++generation;
    const current = () => request === generation &&
        getSession()?.user?.id === userId &&
        !view.classList.contains("hidden");
    try {
        await getValidAccessToken();
    } catch (error) {
        if (current()) {
            if(todoStatus)todoStatus.textContent="To-dos konnten nicht geladen werden.";
            if(reminderStatus)reminderStatus.textContent="Erinnerungen konnten nicht geladen werden.";
            if(birthdayStatus)birthdayStatus.textContent="Geburtstage konnten nicht geladen werden.";
            
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
            if(todoSection)todoSection.hidden=open.length===0;
            if (!open.length) {
                todos.replaceChildren();
                return;
            }
            todos.replaceChildren();
            for (const row of open) taskButton(todos, row.text, openTodos);
        }).catch(() => {
            if (current()) {if(todoStatus)todoStatus.textContent="To-dos konnten nicht geladen werden.";}
        }),
        loadTodayReminders(day,end).then(rows => {
            if(!current())return;
            const todayRows=morningReminders(rows,day,end);
            if(!reminders)return;
            reminders.replaceChildren();
            if(reminderSection)reminderSection.hidden=todayRows.length===0;
            for(const row of todayRows)taskButton(reminders,row.title+" · "+reminderLabel(row),()=>{
                generation++;document.dispatchEvent(new CustomEvent("dock:open-reminder",{detail:{id:row.id}}));
            });
        }).catch(()=>{if(current()){if(reminderStatus)reminderStatus.textContent="Erinnerungen konnten nicht geladen werden.";}}),
        birthdaySection && birthdayList ? loadBirthdays().then(rows => {
            if (!current()) return;
            const upcoming = upcomingBirthdays(rows, today,3);
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
    document.getElementById("settings-morning-open")?.addEventListener("click", () => maybeShowMorning({manual:true}));
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

