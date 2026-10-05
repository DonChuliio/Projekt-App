// js/calendar/calendar.js

import { showView } from "../router.js";

import {
    syncNotificationState
} from "../push/notification-state.js";


/* =========================================================
   FESTE WOCHENAUFGABEN
   ========================================================= */

const WEEK_TASKS = [
    {
        id: "plants",
        name: "Pflanzen gießen",
        shortName: "Pflanzen"
    },
    {
        id: "orchids",
        name: "Orchideen wässern",
        shortName: "Orchideen"
    },
    {
        id: "aquarium-small",
        name: "Aquarium kleiner Wasserwechsel",
        shortName: "Aqua klein"
    },
    {
        id: "aquarium-large",
        name: "Aquarium großer Wasserwechsel",
        shortName: "Aqua groß"
    },
    {
        id: "water-test",
        name: "Wassertest",
        shortName: "Wassertest"
    }
];


/* =========================================================
   KALENDER INITIALISIEREN
   ========================================================= */

export function initCalendar() {

    const weekElement =
        document.getElementById(
            "calendar-current-week"
        );

    const tasksElement =
        document.getElementById(
            "calendar-week-tasks"
        );

    const editButton =
        document.getElementById(
            "calendar-edit"
        );

    const editBackButton =
        document.getElementById(
            "calendar-edit-back"
        );


    if (
        !weekElement ||
        !tasksElement ||
        !editButton ||
        !editBackButton
    ) {

        console.error(
            "Kalender-Elemente nicht gefunden"
        );

        return;
    }


    /*
     Aktuelle Woche anzeigen.
    */
    renderCurrentWeek();


    /*
     Beim Start auch den Push-Status
     mit Supabase abgleichen.
    */
    syncNotificationState();


    /* =====================================================
       BEARBEITUNG ÖFFNEN
       ===================================================== */

    editButton.addEventListener(
        "click",
        () => {

            renderWeekEditor();

            showView(
                "calendar-edit"
            );
        }
    );


    /* =====================================================
       BEARBEITUNG VERLASSEN
       ===================================================== */

    editBackButton.addEventListener(
        "click",
        () => {

            renderCurrentWeek();

            /*
             Sicherheitshalber nach Änderungen
             am Wochenplan erneut synchronisieren.
            */
            syncNotificationState();

            showView(
                "calendar"
            );
        }
    );
}


/* =========================================================
   AKTUELLE WOCHE ANZEIGEN
   ========================================================= */

function renderCurrentWeek() {

    const weekElement =
        document.getElementById(
            "calendar-current-week"
        );

    const tasksElement =
        document.getElementById(
            "calendar-week-tasks"
        );


    if (
        !weekElement ||
        !tasksElement
    ) {
        return;
    }


    const today =
        new Date();


    const week =
        getISOWeek(today);


    const year =
        getISOWeekYear(today);


    weekElement.textContent =
        `KW ${week} · ${year}`;


    /*
     Geplante Aufgaben laden.
    */
    const plan =
        loadYearPlan(year);


    const activeTaskIds =
        plan[week] || [];


    /*
     Bereits erledigte Aufgaben laden.
    */
    let doneTaskIds =
        loadDoneTasks(
            year,
            week
        );


    tasksElement.innerHTML = "";


    /* =====================================================
       KEINE AUFGABEN
       ===================================================== */

    if (
        activeTaskIds.length === 0
    ) {

        const empty =
            document.createElement(
                "p"
            );


        empty.className =
            "calendar-no-tasks";


        empty.textContent =
            "Für diese Woche sind keine Aufgaben geplant.";


        tasksElement.appendChild(
            empty
        );


        return;
    }


    /* =====================================================
       AUFGABENLISTE
       ===================================================== */

    const list =
        document.createElement(
            "ul"
        );


    list.className =
        "calendar-task-list";


    WEEK_TASKS.forEach(
        task => {

            /*
             Nur Aufgaben anzeigen,
             die für diese KW geplant sind.
            */
            if (
                !activeTaskIds.includes(
                    task.id
                )
            ) {
                return;
            }


            const li =
                document.createElement(
                    "li"
                );


            /*
             Prüfen, ob diese Aufgabe
             bereits erledigt ist.
            */
            const isDone =
                doneTaskIds.includes(
                    task.id
                );


            /*
             Kein Emoji mehr.

             Der Text bleibt gleich.
             Der erledigt-Zustand wird
             über die CSS-Klasse "done"
             dargestellt.
            */
            li.textContent =
                task.name;


            li.classList.toggle(
                "done",
                isDone
            );


            /*
             Zusätzlich einen eindeutigen
             Zustand für HTML/CSS setzen.
            */
            li.dataset.done =
                isDone
                    ? "true"
                    : "false";


            /* =============================================
               AUFGABE ANTIPPEN
               ============================================= */

            li.addEventListener(
                "click",
                async () => {

                    /*
                     Ist die Aufgabe bereits erledigt?
                    */
                    if (
                        doneTaskIds.includes(
                            task.id
                        )
                    ) {

                        /*
                         Wieder auf offen setzen.
                        */
                        doneTaskIds =
                            doneTaskIds.filter(
                                id =>
                                    id !== task.id
                            );

                    } else {

                        /*
                         Als erledigt markieren.
                        */
                        doneTaskIds.push(
                            task.id
                        );
                    }


                    /*
                     WICHTIG:

                     Zuerst lokal speichern.
                    */
                    saveDoneTasks(
                        year,
                        week,
                        doneTaskIds
                    );


                    /*
                     Danach Supabase aktualisieren.

                     notification-state.js liest jetzt
                     den gerade gespeicherten Zustand
                     aus localStorage.

                     Eine erledigte Aufgabe wird dadurch
                     NICHT mehr als open_week gezählt.
                    */
                    await syncNotificationState();


                    /*
                     Erst anschließend die Ansicht
                     neu aufbauen.
                    */
                    renderCurrentWeek();
                }
            );


            list.appendChild(
                li
            );
        }
    );


    tasksElement.appendChild(
        list
    );
}


/* =========================================================
   WOCHENPLAN-EDITOR
   ========================================================= */

function renderWeekEditor() {

    const editView =
        document.querySelector(
            "[data-view='calendar-edit']"
        );


    if (!editView) {
        return;
    }


    /*
     Alte Tabelle entfernen.
    */
    const oldEditor =
        document.getElementById(
            "week-plan-editor"
        );


    if (oldEditor) {
        oldEditor.remove();
    }


    const today =
        new Date();


    const year =
        getISOWeekYear(today);


    const plan =
        loadYearPlan(year);


    const numberOfWeeks =
        getISOWeeksInYear(year);


    /* =====================================================
       CONTAINER
       ===================================================== */

    const editor =
        document.createElement(
            "div"
        );


    editor.id =
        "week-plan-editor";


    const yearTitle =
        document.createElement(
            "p"
        );


    yearTitle.className =
        "week-plan-year";


    yearTitle.textContent =
        `Wochenplan ${year}`;


    editor.appendChild(
        yearTitle
    );


    /* =====================================================
       SCROLL-CONTAINER
       ===================================================== */

    const scrollContainer =
        document.createElement(
            "div"
        );


    scrollContainer.className =
        "week-plan-scroll";


    /* =====================================================
       TABELLE
       ===================================================== */

    const table =
        document.createElement(
            "table"
        );


    table.className =
        "week-plan-table";


    /* =====================================================
       TABELLENKOPF
       ===================================================== */

    const thead =
        document.createElement(
            "thead"
        );


    const headerRow =
        document.createElement(
            "tr"
        );


    const kwHeader =
        document.createElement(
            "th"
        );


    kwHeader.textContent =
        "KW";


    headerRow.appendChild(
        kwHeader
    );


    WEEK_TASKS.forEach(
        task => {

            const th =
                document.createElement(
                    "th"
                );


            th.textContent =
                task.shortName;


            th.title =
                task.name;


            headerRow.appendChild(
                th
            );
        }
    );


    thead.appendChild(
        headerRow
    );


    table.appendChild(
        thead
    );


    /* =====================================================
       KALENDERWOCHEN
       ===================================================== */

    const tbody =
        document.createElement(
            "tbody"
        );


    for (
        let week = 1;
        week <= numberOfWeeks;
        week++
    ) {

        const row =
            document.createElement(
                "tr"
            );


        const weekCell =
            document.createElement(
                "th"
            );


        weekCell.textContent =
            week;


        row.appendChild(
            weekCell
        );


        WEEK_TASKS.forEach(
            task => {

                const cell =
                    document.createElement(
                        "td"
                    );


                const activeTasks =
                    plan[week] || [];


                const isActive =
                    activeTasks.includes(
                        task.id
                    );


                const button =
                    document.createElement(
                        "button"
                    );


                button.type =
                    "button";


                button.className =
                    "week-task-toggle";


                if (isActive) {

                    button.classList.add(
                        "active"
                    );

                    /*
                     Kein Symbol nötig.
                     CSS kann den aktiven Zustand
                     darstellen.
                    */
                    button.textContent =
                        "Aktiv";

                } else {

                    button.textContent =
                        "";
                }


                /* =========================================
                   WOCHENAUFGABE AKTIVIEREN / DEAKTIVIEREN
                   ========================================= */

                button.addEventListener(
                    "click",
                    async () => {

                        toggleWeekTask(
                            year,
                            week,
                            task.id
                        );


                        const updatedPlan =
                            loadYearPlan(
                                year
                            );


                        const updatedTasks =
                            updatedPlan[week] ||
                            [];


                        const nowActive =
                            updatedTasks.includes(
                                task.id
                            );


                        button.classList.toggle(
                            "active",
                            nowActive
                        );


                        button.textContent =
                            nowActive
                                ? "Aktiv"
                                : "";


                        /*
                         Falls gerade die aktuelle KW
                         geändert wurde, wird dadurch
                         open_week neu berechnet.

                         Wir können die Funktion auch
                         für andere Wochen aufrufen.
                         Sie zählt ohnehin ausschließlich
                         die aktuelle KW.
                        */
                        await syncNotificationState();


                        button.blur();
                    }
                );


                cell.appendChild(
                    button
                );


                row.appendChild(
                    cell
                );
            }
        );


        tbody.appendChild(
            row
        );
    }


    table.appendChild(
        tbody
    );


    scrollContainer.appendChild(
        table
    );


    editor.appendChild(
        scrollContainer
    );


    editView.appendChild(
        editor
    );
}


/* =========================================================
   WOCHENAUFGABE AKTIVIEREN / DEAKTIVIEREN
   ========================================================= */

function toggleWeekTask(
    year,
    week,
    taskId
) {

    const plan =
        loadYearPlan(year);


    const tasks =
        plan[week] || [];


    if (
        tasks.includes(
            taskId
        )
    ) {

        /*
         Aufgabe aus dieser KW entfernen.
        */
        plan[week] =
            tasks.filter(
                id =>
                    id !== taskId
            );

    } else {

        /*
         Aufgabe dieser KW hinzufügen.
        */
        plan[week] = [
            ...tasks,
            taskId
        ];
    }


    saveYearPlan(
        year,
        plan
    );
}


/* =========================================================
   JAHRESPLAN LADEN
   ========================================================= */

function loadYearPlan(year) {

    const key =
        `calendar-week-plan-${year}`;


    const raw =
        localStorage.getItem(
            key
        );


    if (!raw) {
        return {};
    }


    try {

        return JSON.parse(
            raw
        );

    } catch (error) {

        console.error(
            "Wochenplan konnte nicht geladen werden",
            error
        );


        return {};
    }
}


/* =========================================================
   JAHRESPLAN SPEICHERN
   ========================================================= */

function saveYearPlan(
    year,
    plan
) {

    const key =
        `calendar-week-plan-${year}`;


    localStorage.setItem(
        key,
        JSON.stringify(
            plan
        )
    );
}


/* =========================================================
   ERLEDIGTE AUFGABEN LADEN
   ========================================================= */

function loadDoneTasks(
    year,
    week
) {

    const key =
        `calendar-done-${year}-${week}`;


    const raw =
        localStorage.getItem(
            key
        );


    if (!raw) {
        return [];
    }


    try {

        const tasks =
            JSON.parse(
                raw
            );


        /*
         Sicherheit:
         Wir erwarten ein Array.
        */
        return Array.isArray(tasks)
            ? tasks
            : [];


    } catch (error) {

        console.error(
            "Erledigte Kalender-Aufgaben konnten nicht geladen werden",
            error
        );


        return [];
    }
}


/* =========================================================
   ERLEDIGTE AUFGABEN SPEICHERN
   ========================================================= */

function saveDoneTasks(
    year,
    week,
    tasks
) {

    const key =
        `calendar-done-${year}-${week}`;


    localStorage.setItem(
        key,
        JSON.stringify(
            tasks
        )
    );
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


/* =========================================================
   ANZAHL ISO-KALENDERWOCHEN
   ========================================================= */

function getISOWeeksInYear(year) {

    const december28 =
        new Date(
            year,
            11,
            28
        );


    return getISOWeek(
        december28
    );
}
