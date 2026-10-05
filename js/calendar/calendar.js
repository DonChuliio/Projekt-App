// js/calendar/calendar.js

// Router importieren, damit wir zwischen
// Kalender und Bearbeitungsansicht wechseln können
import { showView } from "../router.js";


/*
 Initialisiert unseren KW-Kalender.

 Aktuell macht er:
 - aktuelles Jahr bestimmen
 - aktuelle ISO-Kalenderwoche bestimmen
 - KW und Jahr anzeigen
 - Bearbeitungsansicht öffnen
 - von Bearbeitung zurück zum Kalender wechseln
*/
export function initCalendar() {

    // Anzeige für die aktuelle Kalenderwoche
    const weekElement = document.getElementById("calendar-current-week");

    // Bearbeiten-Button in der normalen Kalenderansicht
    const editButton = document.getElementById("calendar-edit");

    // Zurück-Button in der Bearbeitungsansicht
    const editBackButton = document.getElementById("calendar-edit-back");


    // Sicherheitscheck
    if (!weekElement || !editButton || !editBackButton) {
        console.error("❌ Kalender-Elemente nicht gefunden");
        return;
    }


    /* ==================================================
       AKTUELLE KALENDERWOCHE
       ================================================== */

    // Heutiges Datum
    const today = new Date();

    // Aktuelle ISO-Kalenderwoche berechnen
    const week = getISOWeek(today);

    // Passendes ISO-Jahr bestimmen
    const year = getISOWeekYear(today);

    // KW und Jahr anzeigen
    weekElement.textContent = `KW ${week} · ${year}`;

    console.log(`📅 Aktuelle Kalenderwoche: KW ${week} / ${year}`);


    /* ==================================================
       NAVIGATION
       ================================================== */

    // Klick auf "Bearbeiten"
    editButton.addEventListener("click", () => {
        showView("calendar-edit");
    });

    // Klick auf "Zurück" im Editor
    editBackButton.addEventListener("click", () => {
        showView("calendar");
    });
}


/*
 Berechnet die ISO-Kalenderwoche.

 ISO-Regeln:
 - Woche beginnt am Montag
 - KW 1 ist die Woche mit dem ersten
   Donnerstag des Jahres
*/
function getISOWeek(date) {

    // Kopie des Datums erstellen
    const tempDate = new Date(
        Date.UTC(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        )
    );

    // ISO-Wochentag:
    // Montag = 1
    // ...
    // Sonntag = 7
    const dayNumber = tempDate.getUTCDay() || 7;

    // Auf Donnerstag derselben Woche springen
    tempDate.setUTCDate(
        tempDate.getUTCDate() + 4 - dayNumber
    );

    // Jahresanfang bestimmen
    const yearStart = new Date(
        Date.UTC(
            tempDate.getUTCFullYear(),
            0,
            1
        )
    );

    // Kalenderwoche berechnen
    return Math.ceil(
        (((tempDate - yearStart) / 86400000) + 1) / 7
    );
}


/*
 Bestimmt das ISO-Jahr.

 Wichtig beim Jahreswechsel:
 Beispielsweise kann Ende Dezember bereits
 zu KW 1 des nächsten Jahres gehören.
*/
function getISOWeekYear(date) {

    // Kopie des Datums erstellen
    const tempDate = new Date(
        Date.UTC(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        )
    );

    const dayNumber = tempDate.getUTCDay() || 7;

    // Donnerstag derselben ISO-Woche bestimmen
    tempDate.setUTCDate(
        tempDate.getUTCDate() + 4 - dayNumber
    );

    // Das Jahr dieses Donnerstags ist das ISO-Jahr
    return tempDate.getUTCFullYear();
}
