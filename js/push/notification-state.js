// js/push/notification-state.js

import {
    SUPABASE_URL,
    SUPABASE_KEY
} from "../config/supabase.js";

import {
    getISOWeek,
    getISOWeekYear
} from "../utils/date.js";

import {
    loadTodos
} from "../data/todo-data.js?v=0.94";

import {
    countOpenCalendarTasks
} from "../data/calendar-data.js?v=0.94";

export async function syncNotificationState() {
    try {
        const today = new Date();
        const week = getISOWeek(today);
        const year = getISOWeekYear(today);

        const [aTodos, openWeek] = await Promise.all([
            loadTodos("a"),
            countOpenCalendarTasks(year, week)
        ]);

        const openA = aTodos.length;

        console.log("Notification State:", {
            openA,
            openWeek
        });

        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/notification_state?id=eq.1`,
            {
                method: "PATCH",
                headers: {
                    "apikey": SUPABASE_KEY,
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal"
                },
                body: JSON.stringify({
                    open_a: openA,
                    open_week: openWeek,
                    updated_at: new Date().toISOString()
                })
            }
        );

        if (!response.ok) {
            throw new Error(
                `Supabase Fehler ${response.status}: ${await response.text()}`
            );
        }

        console.log("Notification State wurde synchronisiert.");
    } catch (error) {
        console.error(
            "Notification State konnte nicht synchronisiert werden:",
            error
        );
    }
}
