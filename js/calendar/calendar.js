// js/calendar/calendar.js

import { showView } from "../router.js";

/*
 Feste Aufgaben unseres Wochenplans.

 Später können wir diese Liste dynamisch machen,
 sodass eigene Aufgaben hinzugefügt werden können.
*/
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
    }
];


/*
 Initialisiert den Kalender.
*/
export function initCalendar() {

    const weekElement = document.getElementById("calendar-current-week");
    const tasksElement = document.getElementById("calendar-week-tasks");

    const editButton = document.getElementById("calendar-edit");
    const editBackButton = document.getElementById("calendar-edit-back");

    if (
        !weekElement ||
        !tasksElement ||
        !editButton ||
        !editBackButton
    ) {
        console.error("❌ Kalender-Elemente nicht gefunden");
        return;
    }


    /* ------------------------------------------
       Normale Kalenderansicht anzeigen
       ------------------------------------------ */

    renderCurrentWeek();


    /* ------------------------------------------
       Bearbeiten öffnen
       ------------------------------------------ */

    editButton.addEventListener("click", () => {

        // Tabelle neu aufbauen
        renderWeekEditor();

        // Bearbeitungsansicht öffnen
        showView("calendar-edit");
    });


    /* ------------------------------------------
       Bearbeiten verlassen
       ------------------------------------------ */

    editBackButton.addEventListener("click", () => {

        // Normale Ansicht aktualisieren
        renderCurrentWeek();

        // Zurück zum Kalender
        showView("calendar");
    });
}


/*
 Zeigt die aktuelle KW und ihre aktiven Aufgaben.
*/
function renderCurrentWeek() {

    const weekElement = document.getElementById("calendar-current-week");
    const tasksElement = document.getElementById("calendar-week-tasks");

    if (!weekElement || !tasksElement) return;

    const today = new Date();

    const week = getISOWeek(today);
    const year = getISOWeekYear(today);

    weekElement.textContent = `KW ${week} · ${year}`;

    // Gespeicherten Jahresplan laden
    const plan = loadYearPlan(year);

    // Aufgaben dieser KW ermitteln
    const activeTaskIds = plan[week] || [];

    // Alte Anzeige löschen
    tasksElement.innerHTML = "";

    /*
     Falls für diese Woche noch nichts aktiviert wurde.
    */
    if (activeTaskIds.length === 0) {

        const empty = document.createElement("p");
        empty.className = "calendar-no-tasks";
        empty.textContent = "Für diese Woche sind keine Aufgaben geplant.";

        tasksElement.appendChild(empty);

        return;
    }


    /*
     Aktive Aufgaben anzeigen.
    */
    const list = document.createElement("ul");
    list.className = "calendar-task-list";

    WEEK_TASKS.forEach(task => {

        if (!activeTaskIds.includes(task.id)) {
            return;
        }

        const li = document.createElement("li");

        li.textContent = `✓ ${task.name}`;

        list.appendChild(li);
    });

    tasksElement.appendChild(list);
}


/*
 Erstellt die komplette Bearbeitungstabelle.
*/
function renderWeekEditor() {

    const editView = document.querySelector(
        "[data-view='calendar-edit']"
    );

    if (!editView) return;


    /*
     Falls bereits eine Tabelle vorhanden ist,
     entfernen wir sie vor dem Neurendern.
    */
    const oldEditor = document.getElementById("week-plan-editor");

    if (oldEditor) {
        oldEditor.remove();
    }


    const today = new Date();
    const year = getISOWeekYear(today);

    const plan = loadYearPlan(year);

    // Anzahl der ISO-Wochen dieses Jahres
    const numberOfWeeks = getISOWeeksInYear(year);


    /*
     Hauptcontainer
    */
    const editor = document.createElement("div");
    editor.id = "week-plan-editor";


    /*
     Jahresanzeige
    */
    const yearTitle = document.createElement("p");
    yearTitle.className = "week-plan-year";
    yearTitle.textContent = `Wochenplan ${year}`;

    editor.appendChild(yearTitle);


    /*
     Scrollbarer Bereich für die Tabelle
    */
    const scrollContainer = document.createElement("div");
    scrollContainer.className = "week-plan-scroll";


    /*
     Tabelle erstellen
    */
    const table = document.createElement("table");
    table.className = "week-plan-table";


    /* ==========================
       Tabellenkopf
       ========================== */

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    const kwHeader = document.createElement("th");
    kwHeader.textContent = "KW";

    headerRow.appendChild(kwHeader);


    WEEK_TASKS.forEach(task => {

        const th = document.createElement("th");

        th.textContent = task.shortName;
        th.title = task.name;

        headerRow.appendChild(th);
    });


    thead.appendChild(headerRow);
    table.appendChild(thead);


    /* ==========================
       KW-Zeilen
       ========================== */

    const tbody = document.createElement("tbody");


    for (let week = 1; week <= numberOfWeeks; week++) {

        const row = document.createElement("tr");


        /*
         KW-Nummer
        */
        const weekCell = document.createElement("th");
        weekCell.textContent = week;

        row.appendChild(weekCell);


        /*
         Eine Zelle pro Aufgabe
        */
        WEEK_TASKS.forEach(task => {

            const cell = document.createElement("td");

            const activeTasks = plan[week] || [];

            const isActive = activeTasks.includes(task.id);


            /*
             Button innerhalb der Zelle.
            */
            const button = document.createElement("button");

            button.type = "button";
            button.className = "week-task-toggle";

            if (isActive) {
                button.classList.add("active");
                button.textContent = "✓";
            } else {
                button.textContent = "";
            }


            /*
             Zelle anklicken → Aufgabe aktiv/inaktiv.
            */
            button.addEventListener("click", () => {

                toggleWeekTask(
                    year,
                    week,
                    task.id
                );

                /*
                 Nur den Button optisch aktualisieren.
                 Die komplette Tabelle muss nicht
                 neu aufgebaut werden.
                */
                const updatedPlan = loadYearPlan(year);

                const updatedTasks =
                    updatedPlan[week] || [];

                const nowActive =
                    updatedTasks.includes(task.id);


                button.classList.toggle(
                    "active",
                    nowActive
                );

                button.textContent =
                    nowActive ? "✓" : "";
            });


            cell.appendChild(button);
            row.appendChild(cell);
        });


        tbody.appendChild(row);
    }


    table.appendChild(tbody);

    scrollContainer.appendChild(table);
    editor.appendChild(scrollContainer);

    editView.appendChild(editor);
}


/*
 Aktiviert oder deaktiviert eine Aufgabe
 für eine bestimmte Kalenderwoche.
*/
function toggleWeekTask(year, week, taskId) {

    const plan = loadYearPlan(year);

    // Falls KW noch nicht existiert → leeres Array
    const tasks = plan[week] || [];


    /*
     Aufgabe bereits aktiv?
     → entfernen
    */
    if (tasks.includes(taskId)) {

        plan[week] = tasks.filter(
            id => id !== taskId
        );

    } else {

        /*
         Sonst Aufgabe hinzufügen
        */
        plan[week] = [
            ...tasks,
            taskId
        ];
    }


    saveYearPlan(year, plan);
}


/*
 Lädt den Wochenplan eines bestimmten Jahres.

 Beispiel-Key:
 calendar-week-plan-2026
*/
function loadYearPlan(year) {

    const key = `calendar-week-plan-${year}`;

    const raw = localStorage.getItem(key);

    if (!raw) {
        return {};
    }


    try {
        return JSON.parse(raw);
    } catch (error) {

        console.error(
            "❌ Wochenplan konnte nicht geladen werden",
            error
        );

        return {};
    }
}


/*
 Speichert den Wochenplan eines Jahres.
*/
function saveYearPlan(year, plan) {

    const key = `calendar-week-plan-${year}`;

    localStorage.setItem(
        key,
        JSON.stringify(plan)
    );
}


/*
 Berechnet die ISO-Kalenderwoche.
*/
function getISOWeek(date) {

    const tempDate = new Date(
        Date.UTC(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        )
    );

    const dayNumber =
        tempDate.getUTCDay() || 7;

    tempDate.setUTCDate(
        tempDate.getUTCDate() + 4 - dayNumber
    );

    const yearStart = new Date(
        Date.UTC(
            tempDate.getUTCFullYear(),
            0,
            1
        )
    );

    return Math.ceil(
        (((tempDate - yearStart) / 86400000) + 1) / 7
    );
}


/*
 Bestimmt das ISO-Jahr.
*/
function getISOWeekYear(date) {

    const tempDate = new Date(
        Date.UTC(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        )
    );

    const dayNumber =
        tempDate.getUTCDay() || 7;

    tempDate.setUTCDate(
        tempDate.getUTCDate() + 4 - dayNumber
    );

    return tempDate.getUTCFullYear();
}


/*
 Ermittelt, ob ein Jahr 52 oder 53 ISO-Wochen hat.
*/
function getISOWeeksInYear(year) {

    // Der 28. Dezember liegt immer
    // in der letzten ISO-Woche des Jahres.
    const december28 = new Date(
        year,
        11,
        28
    );

    return getISOWeek(december28);
}
