// js/utils/date.js


/*
 =========================================================
 DATUM / KALENDERWOCHEN
 =========================================================

 Gemeinsame Funktionen für ISO-Kalenderwochen.

 Dadurch müssen Kalender, Wassertest und andere
 Bereiche ihre eigene KW-Berechnung nicht mehr
 mehrfach enthalten.
*/


/*
 Berechnet die ISO-Kalenderwoche.

 ISO:
 - Woche beginnt Montag
 - KW 1 enthält den ersten Donnerstag des Jahres
*/
export function getISOWeek(date) {

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

 Wichtig rund um den Jahreswechsel,
 da z. B. der 31. Dezember bereits
 zur KW 1 des nächsten ISO-Jahres
 gehören kann.
*/
export function getISOWeekYear(date) {

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
 Ermittelt, ob ein ISO-Jahr
 52 oder 53 Kalenderwochen besitzt.

 Der 28. Dezember befindet sich immer
 in der letzten ISO-Woche des Jahres.
*/
export function getISOWeeksInYear(year) {

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
