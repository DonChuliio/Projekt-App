// js/push/notification-state.js


/* =========================================================
   SUPABASE
   ========================================================= */

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
} from "../data/todo-data.js?v=0.93";
/* =========================================================
   BENACHRICHTIGUNGS-STATUS SYNCHRONISIEREN
   ========================================================= */

/*
 Diese Funktion berechnet:

 - Anzahl offener A-To-Dos
 - Anzahl offener Aufgaben der aktuellen KW

 Danach werden nur diese beiden Zahlen
 an Supabase übertragen.
*/
export async function syncNotificationState() {

    try {

        /*
         A-To-Dos liegen inzwischen in Supabase.
         Deshalb wird die Anzahl nicht mehr aus
         localStorage gelesen.
        */
        const aTodos =
            await loadTodos("a");

        const openA =
            aTodos.length;


        const openWeek =
            getOpenCurrentWeekCount();


        console.log(
            "Notification State:",
            {
                openA,
                openWeek
            }
        );


        const response =
            await fetch(
                `${SUPABASE_URL}/rest/v1/notification_state?id=eq.1`,
                {
                    method: "PATCH",

                    headers: {
                        "apikey":
                            SUPABASE_KEY,

                        "Content-Type":
                            "application/json",

                        "Prefer":
                            "return=minimal"
                    },

                    body:
                        JSON.stringify({
                            open_a:
                                openA,

                            open_week:
                                openWeek,

                            updated_at:
                                new Date()
                                    .toISOString()
                        })
                }
            );


        if (!response.ok) {

            const errorText =
                await response.text();


            throw new Error(
                `Supabase Fehler ${response.status}: ${errorText}`
            );
        }


        console.log(
            "Notification State wurde synchronisiert."
        );


    } catch (error) {

        /*
         Wichtig:
         Ein Fehler bei Supabase darf die eigentliche
         To-Do-/Kalender-Funktion nicht kaputtmachen.
        */
        console.error(
            "Notification State konnte nicht synchronisiert werden:",
            error
        );
    }
}


/* =========================================================
   OFFENE AUFGABEN DER AKTUELLEN KW
   ========================================================= */

function getOpenCurrentWeekCount() {

    const today =
        new Date();


    const week =
        getISOWeek(today);


    const year =
        getISOWeekYear(today);


    /*
     Jahresplan laden.
    */
    const plan =
        loadJSON(
            `calendar-week-plan-${year}`,
            {}
        );


    /*
     Für diese KW geplante Aufgaben.
    */
    const activeTasks =
        plan[week] || [];


    /*
     Bereits erledigte Aufgaben dieser KW.
    */
    const doneTasks =
        loadJSON(
            `calendar-done-${year}-${week}`,
            []
        );


    if (!Array.isArray(activeTasks)) {
        return 0;
    }


    /*
     Offen bedeutet:

     geplant
     UND
     noch nicht erledigt
    */
    const openTasks =
        activeTasks.filter(
            taskId =>
                !doneTasks.includes(
                    taskId
                )
        );


    return openTasks.length;
}


/* =========================================================
   JSON AUS LOCALSTORAGE LADEN
   ========================================================= */

function loadJSON(
    key,
    fallback
) {

    const raw =
        localStorage.getItem(key);


    if (!raw) {
        return fallback;
    }


    try {

        return JSON.parse(raw);

    } catch (error) {

        console.error(
            `localStorage konnte nicht gelesen werden: ${key}`,
            error
        );

        return fallback;
    }
}

