// js/push/notification-state.js


/* =========================================================
   SUPABASE
   ========================================================= */

const SUPABASE_URL =
    "https://osmmjfuzuxhwtfcttdxp.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_Yymu98h5pEe8S1Rsxl8u6A_ZKisJcdy";


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

        const openA =
            getOpenATodoCount();


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
   OFFENE A-TODOS
   ========================================================= */

function getOpenATodoCount() {

    const raw =
        localStorage.getItem(
            "todo-a"
        );


    if (!raw) {
        return 0;
    }


    try {

        const todos =
            JSON.parse(raw);


        if (!Array.isArray(todos)) {
            return 0;
        }


        /*
         In deiner aktuellen To-Do-Struktur
         entspricht jeder vorhandene Eintrag
         einer offenen Aufgabe.
        */
        return todos.length;


    } catch (error) {

        console.error(
            "A-To-Dos konnten nicht gelesen werden:",
            error
        );

        return 0;
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


/* =========================================================
   ISO-KALENDERWOCHE
   ========================================================= */

function getISOWeek(date) {

    const tempDate =
        new Date(
            Date.UTC(
                date.getFullYear(),
                date.getMonth(),
                date.getDate()
            )
        );


    const dayNumber =
        tempDate.getUTCDay() || 7;


    tempDate.setUTCDate(
        tempDate.getUTCDate()
        + 4
        - dayNumber
    );


    const yearStart =
        new Date(
            Date.UTC(
                tempDate.getUTCFullYear(),
                0,
                1
            )
        );


    return Math.ceil(
        (
            (
                tempDate - yearStart
            )
            / 86400000
            + 1
        )
        / 7
    );
}


/* =========================================================
   ISO-JAHR
   ========================================================= */

function getISOWeekYear(date) {

    const tempDate =
        new Date(
            Date.UTC(
                date.getFullYear(),
                date.getMonth(),
                date.getDate()
            )
        );


    const dayNumber =
        tempDate.getUTCDay() || 7;


    tempDate.setUTCDate(
        tempDate.getUTCDate()
        + 4
        - dayNumber
    );


    return tempDate.getUTCFullYear();
}
