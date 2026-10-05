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

    const weekElement =
        document.getElementById("calendar-current-week");

    const tasksElement =
        document.getElementById("calendar-week-tasks");

    const editButton =
        document.getElementById("calendar-edit");

    const editBackButton =
        document.getElementById("calendar-edit-back");


    // Sicherheitscheck
    if (
        !weekElement ||
        !tasksElement ||
        !editButton ||
        !editBackButton
    ) {
        console.error("❌ Kalender-Elemente nicht gefunden");
        return;
    }


    /* ==================================================
       NORMALE KALENDERANSICHT
       ================================================== */

    renderCurrentWeek();


    /* ==================================================
       BEARBEITEN ÖFFNEN
       ================================================== */

    editButton.addEventListener("click", () => {

        // Tabelle neu aufbauen
        renderWeekEditor();

        // Bearbeitungsansicht öffnen
        showView("calendar-edit");
    });


    /* ==================================================
       BEARBEITEN VERLASSEN
       ================================================== */

    editBackButton.addEventListener("click", () => {

        // Normale Kalenderansicht aktualisieren
        renderCurrentWeek();

        // Zurück zum Kalender
        showView("calendar");
    });
}


/*
 Zeigt die aktuelle KW und ihre aktiven Aufgaben.
*/
function renderCurrentWeek() {

    const weekElement =
        document.getElementById("calendar-current-week");

    const tasksElement =
        document.getElementById("calendar-week-tasks");


    if (!weekElement || !tasksElement) {
        return;
    }


    // Heutiges Datum
    const today = new Date();


    // Aktuelle ISO-Kalenderwoche
    const week = getISOWeek(today);


    // Aktuelles ISO-Jahr
    const year = getISOWeekYear(today);


    // Überschrift anzeigen
    weekElement.textContent =
        `KW ${week} · ${year}`;


    // Gespeicherten Jahresplan laden
    const plan = loadYearPlan(year);


    // Aufgaben dieser KW
    const activeTaskIds =
        plan[week] || [];


    // Bereits erledigte Aufgaben dieser KW laden
    let doneTaskIds =
        loadDoneTasks(year, week);


    // Alte Anzeige löschen
    tasksElement.innerHTML = "";


    /*
     Keine Aufgaben für diese Woche geplant
    */
    if (activeTaskIds.length === 0) {

        const empty =
            document.createElement("p");

        empty.className =
            "calendar-no-tasks";

        empty.textContent =
            "Für diese Woche sind keine Aufgaben geplant.";

        tasksElement.appendChild(empty);

        return;
    }


    /*
     Liste erstellen
    */
    const list =
        document.createElement("ul");

    list.className =
        "calendar-task-list";


    /*
     Alle möglichen Aufgaben durchgehen.
    */
    WEEK_TASKS.forEach(task => {

        /*
         Aufgabe gehört nicht zu dieser KW?
         Dann überspringen.
        */
        if (!activeTaskIds.includes(task.id)) {
            return;
        }


        const li =
            document.createElement("li");


        /*
         Prüfen, ob die Aufgabe bereits
         erledigt wurde.
        */
        const isDone =
            doneTaskIds.includes(task.id);


        /*
         Checkbox-Symbol + Aufgabenname
        */
        li.textContent =
            `${isDone ? "☑" : "☐"} ${task.name}`;


        /*
         Erledigte Aufgabe optisch markieren.
        */
        li.classList.toggle(
            "done",
            isDone
        );


        /*
         Aufgabe antippen:
         erledigt / nicht erledigt
        */
        li.addEventListener("click", () => {

            if (doneTaskIds.includes(task.id)) {

                /*
                 Aufgabe wieder auf offen setzen.
                */
                doneTaskIds =
                    doneTaskIds.filter(
                        id => id !== task.id
                    );

            } else {

                /*
                 Aufgabe als erledigt markieren.
                */
                doneTaskIds.push(task.id);
            }


            /*
             Zustand speichern.
            */
            saveDoneTasks(
                year,
                week,
                doneTaskIds
            );


            /*
             Kalender neu anzeigen.
            */
            renderCurrentWeek();
        });


        list.appendChild(li);
    });


    tasksElement.appendChild(list);
}


/*
 Erstellt die komplette Bearbeitungstabelle
 mit allen Kalenderwochen.
*/
function renderWeekEditor() {

    const editView =
        document.querySelector(
            "[data-view='calendar-edit']"
        );


    if (!editView) {
        return;
    }


    /*
     Falls bereits eine Tabelle vorhanden ist,
     entfernen wir sie zuerst.
    */
    const oldEditor =
        document.getElementById(
            "week-plan-editor"
        );


    if (oldEditor) {
        oldEditor.remove();
    }


    // Aktuelles Jahr bestimmen
    const today = new Date();

    const year =
        getISOWeekYear(today);


    // Jahresplan laden
    const plan =
        loadYearPlan(year);


    /*
     Anzahl der Kalenderwochen bestimmen.
     Je nach Jahr 52 oder 53.
    */
    const numberOfWeeks =
        getISOWeeksInYear(year);


    /* ==================================================
       EDITOR-CONTAINER
       ================================================== */

    const editor =
        document.createElement("div");

    editor.id =
        "week-plan-editor";


    /*
     Jahresanzeige
    */
    const yearTitle =
        document.createElement("p");

    yearTitle.className =
        "week-plan-year";

    yearTitle.textContent =
        `Wochenplan ${year}`;

    editor.appendChild(yearTitle);


    /*
     Scrollbarer Tabellenbereich
    */
    const scrollContainer =
        document.createElement("div");

    scrollContainer.className =
        "week-plan-scroll";


    /*
     Tabelle
    */
    const table =
        document.createElement("table");

    table.className =
        "week-plan-table";


    /* ==================================================
       TABELLENKOPF
       ================================================== */

    const thead =
        document.createElement("thead");

    const headerRow =
        document.createElement("tr");


    /*
     Erste Spalte = Kalenderwoche
    */
    const kwHeader =
        document.createElement("th");

    kwHeader.textContent = "KW";

    headerRow.appendChild(kwHeader);


    /*
     Danach eine Spalte pro Aufgabe
    */
    WEEK_TASKS.forEach(task => {

        const th =
            document.createElement("th");

        th.textContent =
            task.shortName;

        th.title =
            task.name;

        headerRow.appendChild(th);
    });


    thead.appendChild(headerRow);

    table.appendChild(thead);


    /* ==================================================
       KALENDERWOCHEN
       ================================================== */

    const tbody =
        document.createElement("tbody");


    /*
     KW 1 bis KW 52 bzw. 53 erzeugen.
    */
    for (
        let week = 1;
        week <= numberOfWeeks;
        week++
    ) {

        const row =
            document.createElement("tr");


        /*
         KW-Nummer
        */
        const weekCell =
            document.createElement("th");

        weekCell.textContent =
            week;

        row.appendChild(weekCell);


        /*
         Eine Zelle pro Aufgabe.
        */
        WEEK_TASKS.forEach(task => {

            const cell =
                document.createElement("td");


            /*
             Aktive Aufgaben dieser KW.
            */
            const activeTasks =
                plan[week] || [];


            /*
             Ist diese Aufgabe aktiviert?
            */
            const isActive =
                activeTasks.includes(task.id);


            /*
             Button für die Zelle.
            */
            const button =
                document.createElement("button");

            button.type =
                "button";

            button.className =
                "week-task-toggle";


            /*
             Aktuellen Zustand anzeigen.
            */
            if (isActive) {

                button.classList.add(
                    "active"
                );

                button.textContent = "✓";

            } else {

                button.textContent = "";
            }


            /*
             Klick auf die Zelle:
             Aufgabe aktivieren/deaktivieren.
            */
            button.addEventListener(
                "click",
                () => {

                    toggleWeekTask(
                        year,
                        week,
                        task.id
                    );


                    /*
                     Aktualisierten Plan laden.
                    */
                    const updatedPlan =
                        loadYearPlan(year);


                    const updatedTasks =
                        updatedPlan[week] || [];


                    const nowActive =
                        updatedTasks.includes(
                            task.id
                        );


                    /*
                     Button aktualisieren.
                    */
                    button.classList.toggle(
                        "active",
                        nowActive
                    );


                    button.textContent =
                        nowActive
                            ? "✓"
                            : "";


                    /*
                     Fokus entfernen.

                     Besonders auf iPhone/Safari
                     verhindert das einen optisch
                     hängenbleibenden Button-Zustand.
                    */
                    button.blur();
                }
            );


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
function toggleWeekTask(
    year,
    week,
    taskId
) {

    const plan =
        loadYearPlan(year);


    /*
     Aufgaben dieser KW holen.

     Falls noch nichts gespeichert wurde,
     starten wir mit einem leeren Array.
    */
    const tasks =
        plan[week] || [];


    /*
     Aufgabe bereits aktiv?
    */
    if (tasks.includes(taskId)) {

        /*
         Dann entfernen.
        */
        plan[week] =
            tasks.filter(
                id => id !== taskId
            );

    } else {

        /*
         Sonst hinzufügen.
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


/*
 Lädt den Wochenplan eines Jahres.

 Beispiel:

 calendar-week-plan-2026
*/
function loadYearPlan(year) {

    const key =
        `calendar-week-plan-${year}`;


    const raw =
        localStorage.getItem(key);


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
function saveYearPlan(
    year,
    plan
) {

    const key =
        `calendar-week-plan-${year}`;


    localStorage.setItem(
        key,
        JSON.stringify(plan)
    );
}


/*
 Lädt die erledigten Aufgaben
 einer bestimmten Kalenderwoche.

 Beispiel:

 calendar-done-2026-41
*/
function loadDoneTasks(
    year,
    week
) {

    const key =
        `calendar-done-${year}-${week}`;


    const raw =
        localStorage.getItem(key);


    if (!raw) {
        return [];
    }


    try {

        return JSON.parse(raw);

    } catch (error) {

        console.error(
            "❌ Erledigte Kalender-Aufgaben konnten nicht geladen werden",
            error
        );

        return [];
    }
}


/*
 Speichert die erledigten Aufgaben
 einer Kalenderwoche.
*/
function saveDoneTasks(
    year,
    week,
    tasks
) {

    const key =
        `calendar-done-${year}-${week}`;


    localStorage.setItem(
        key,
        JSON.stringify(tasks)
    );
}


/*
 Berechnet die ISO-Kalenderwoche.

 ISO:
 - Woche beginnt Montag
 - KW 1 enthält den ersten Donnerstag
   des Jahres
*/
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


    /*
     Auf Donnerstag derselben
     ISO-Woche springen.
    */
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
                (tempDate - yearStart)
                / 86400000
            )
            + 1
        )
        / 7
    );
}


/*
 Bestimmt das ISO-Jahr.

 Das ist besonders rund um
 Silvester wichtig.
*/
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


/*
 Ermittelt, ob das Jahr
 52 oder 53 ISO-Kalenderwochen hat.

 Der 28. Dezember liegt immer
 in der letzten ISO-Woche eines Jahres.
*/
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
