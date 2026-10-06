// js/data/calendar-data.js

import {
    SUPABASE_URL,
    SUPABASE_KEY
} from "../config/supabase.js";

import {
    getAccessToken
} from "../auth/auth.js";

const TABLE_URL =
    `${SUPABASE_URL}/rest/v1/calendar_tasks`;

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

export async function loadCalendarTasks(year, week = null) {
    let url =
        `${TABLE_URL}?year=eq.${encodeURIComponent(year)}&select=id,year,week,task_id,done&order=week.asc`;

    if (week !== null) {
        url += `&week=eq.${encodeURIComponent(week)}`;
    }

    const response = await fetch(url, {
        method: "GET",
        headers: createHeaders()
    });

    if (!response.ok) {
        throw new Error(
            `Kalender konnte nicht geladen werden (${response.status}): ${await response.text()}`
        );
    }

    return await response.json();
}

export async function addCalendarTask(year, week, taskId) {
    const response = await fetch(TABLE_URL, {
        method: "POST",
        headers: {
            ...createHeaders(),
            "Prefer": "return=representation"
        },
        body: JSON.stringify({
            year,
            week,
            task_id: taskId,
            done: false
        })
    });

    if (!response.ok) {
        throw new Error(
            `Kalender-Aufgabe konnte nicht gespeichert werden (${response.status}): ${await response.text()}`
        );
    }

    const rows = await response.json();
    return rows[0] || null;
}

export async function deleteCalendarTask(year, week, taskId) {
    const response = await fetch(
        `${TABLE_URL}?year=eq.${encodeURIComponent(year)}&week=eq.${encodeURIComponent(week)}&task_id=eq.${encodeURIComponent(taskId)}`,
        {
            method: "DELETE",
            headers: createHeaders()
        }
    );

    if (!response.ok) {
        throw new Error(
            `Kalender-Aufgabe konnte nicht gelöscht werden (${response.status}): ${await response.text()}`
        );
    }
}

export async function setCalendarTaskDone(id, done) {
    const response = await fetch(
        `${TABLE_URL}?id=eq.${encodeURIComponent(id)}`,
        {
            method: "PATCH",
            headers: {
                ...createHeaders(),
                "Prefer": "return=minimal"
            },
            body: JSON.stringify({ done })
        }
    );

    if (!response.ok) {
        throw new Error(
            `Kalender-Aufgabe konnte nicht aktualisiert werden (${response.status}): ${await response.text()}`
        );
    }
}

export async function countOpenCalendarTasks(year, week) {
    const rows = await loadCalendarTasks(year, week);
    return rows.filter(row => !row.done).length;
}
