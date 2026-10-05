// js/calendar/calendar.js

/*
 Initialisiert unseren neuen KW-Kalender.

 Aktuell macht er nur:
 - aktuelles Jahr bestimmen
 - aktuelle ISO-Kalenderwoche bestimmen
 - beides anzeigen

 Die Aufgaben und der Bearbeiten-Modus
 kommen in den nächsten Schritten dazu.
*/
export function initCalendar() {

    // Element holen, in dem die aktuelle KW angezeigt wird
    const weekElement = document.getElementById("calendar-current-week");

    // Sicherheitscheck
    if (!weekElement) {
        console.error("❌ calendar-current-week nicht gefunden");
        return;
    }

    // Heutiges Datum
    const today = new Date();

    // Aktuelle ISO-Kalenderwoche berechnen
    const week = getISOWeek(today);

    // Das zur ISO-Kalenderwoche gehörende Jahr bestimmen
    const year = getISOWeekYear(today);

    // Ausgabe in der Kalenderansicht
    weekElement.textContent = `KW ${week} · ${year}`;

    console.log(`📅 Aktuelle Kalenderwoche: KW ${week} / ${year}`);
}


/*
 Berechnet die ISO-Kalenderwoche eines Datums.

 ISO-Kalenderwochen:
 - Woche beginnt am Montag
 - KW 1 ist die Woche mit dem ersten Donnerstag des Jahres
*/
function getISOWeek(date) {

    // Kopie des Datums erstellen,
    // damit wir das ursprüngliche Datum nicht verändern
    const tempDate = new Date(
        Date.UTC(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        )
    );

    // Sonntag liefert getUTCDay() als 0.
    // Für ISO brauchen wir Montag = 1 bis Sonntag = 7.
    const dayNumber = tempDate.getUTCDay() || 7;

    // Auf den Donnerstag derselben Woche springen
    tempDate.setUTCDate(
        tempDate.getUTCDate() + 4 - dayNumber
    );

    // Ersten Tag dieses Jahres bestimmen
    const yearStart = new Date(
        Date.UTC(tempDate.getUTCFullYear(), 0, 1)
    );

    // Kalenderwoche berechnen
    return Math.ceil(
        (((tempDate - yearStart) / 86400000) + 1) / 7
    );
}


/*
 Bestimmt das ISO-Jahr.

 Das ist wichtig rund um Silvester/Neujahr:
 z.B. kann der 31. Dezember bereits zu KW 1
 des nächsten Jahres gehören.
*/
function getISOWeekYear(date) {

    const tempDate = new Date(
        Date.UTC(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        )
    );

    const dayNumber = tempDate.getUTCDay() || 7;

    // Wieder auf Donnerstag derselben ISO-Woche gehen
    tempDate.setUTCDate(
        tempDate.getUTCDate() + 4 - dayNumber
    );

    return tempDate.getUTCFullYear();
}
