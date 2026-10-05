// js/watertest/watertest.js

import { showView } from "../router.js";


/*
 =========================================================
 WASSERWERTE
 =========================================================
*/

const WATER_VALUES = [

    {
        id: "no3",
        name: "NO₃",
        unit: "mg/l",
        values: [
            { value: "0",   status: "green" },
            { value: "10",  status: "green" },
            { value: "25",  status: "green" },
            { value: "50",  status: "orange" },
            { value: "100", status: "red" },
            { value: "250", status: "red" },
            { value: "500", status: "red" }
        ]
    },

    {
        id: "no2",
        name: "NO₂",
        unit: "mg/l",
        values: [
            { value: "0",   status: "green" },
            { value: "0,5", status: "green" },
            { value: "2",   status: "green" },
            { value: "5",   status: "orange" },
            { value: "10",  status: "red" }
        ]
    },

    {
        id: "gh",
        name: "GH",
        unit: "°dH",
        values: [
            { value: "<3",  status: "red" },
            { value: "<4",  status: "green" },
            { value: "<7",  status: "green" },
            { value: "<14", status: "green" },
            { value: "<21", status: "orange" }
        ]
    },

    {
        id: "kh",
        name: "KH",
        unit: "°dH",
        values: [
            { value: "0",  status: "red" },
            { value: "3",  status: "orange" },
            { value: "6",  status: "green" },
            { value: "10", status: "green" },
            { value: "15", status: "green" },
            { value: "20", status: "orange" }
        ]
    },

    {
        id: "ph",
        name: "pH",
        unit: "",
        values: [
            { value: "6.4", status: "orange" },
            { value: "6.8", status: "green" },
            { value: "7.2", status: "green" },
            { value: "7.6", status: "green" },
            { value: "8.0", status: "orange" },
            { value: "8.4", status: "orange" },
            { value: "9.0", status: "red" }
        ]
    },

    {
        id: "cl2",
        name: "Cl₂",
        unit: "mg/l",
        values: [
            { value: "0",   status: "green" },
            { value: "0.8", status: "red" },
            { value: "1.5", status: "red" },
            { value: "3.0", status: "red" }
        ]
    }

];


let currentValues = {};


/*
 =========================================================
 INITIALISIERUNG
 =========================================================
*/

export function initWatertest() {

    const addButton =
        document.getElementById("watertest-add");

    const backButton =
        document.getElementById("watertest-entry-back");


    if (!addButton || !backButton) {

        console.error(
            "❌ Wassertest-Navigation nicht gefunden"
        );

        return;
    }


    /*
     Übersicht beim Start vorbereiten.
    */
    renderOverview();


    /*
     Neuen Test beginnen.
    */
    addButton.addEventListener("click", () => {

        // Alte Eingabe leeren
        currentValues = {};

        // Aktuelle KW anzeigen
        renderCurrentWeekTitle();

        // Eingabemaske erstellen
        renderWatertestForm();

        // Eingabe öffnen
        showView("watertest-entry");
    });


    /*
     Von Eingabe zurück zur Übersicht.
    */
    backButton.addEventListener("click", () => {

        renderOverview();

        showView("watertest");
    });
}


/*
 =========================================================
 EINGABEMASKE
 =========================================================
*/

function renderWatertestForm() {

    const container =
        document.getElementById("watertest-form");


    if (!container) {
        return;
    }


    container.innerHTML = "";


    /*
     Normale Wasserwerte
    */
    WATER_VALUES.forEach(parameter => {

        const section =
            document.createElement("section");

        section.className =
            "watertest-section";


        const title =
            document.createElement("h3");


        title.textContent =
            parameter.unit
                ? `${parameter.name} (${parameter.unit})`
                : parameter.name;


        section.appendChild(title);


        const buttons =
            document.createElement("div");

        buttons.className =
            "watertest-values";


        parameter.values.forEach(option => {

            const button =
                document.createElement("button");


            button.type = "button";

            button.className =
                "watertest-value";

            button.textContent =
                option.value;


            const isSelected =
                currentValues[parameter.id]
                === option.value;


            if (isSelected) {

                button.classList.add(
                    "selected",
                    `status-${option.status}`
                );
            }


            button.addEventListener(
                "click",
                () => {

                    currentValues[
                        parameter.id
                    ] = option.value;

                    renderWatertestForm();
                }
            );


            buttons.appendChild(button);
        });


        section.appendChild(buttons);

        container.appendChild(section);
    });


    /* ==================================================
       TEMPERATUR – MANUELLE EINGABE
       ================================================== */

    const temperatureSection =
        document.createElement("section");

    temperatureSection.className =
        "watertest-section";


    const temperatureTitle =
        document.createElement("h3");

    temperatureTitle.textContent =
        "Temperatur (°C)";

    temperatureSection.appendChild(
        temperatureTitle
    );


    /*
     Textfeld statt number verwenden.

     Dadurch können wir auf dem iPhone
     sowohl 24,5 als auch 24.5 akzeptieren.
    */
    const temperatureInput =
        document.createElement("input");

    temperatureInput.type =
        "text";

    temperatureInput.inputMode =
        "decimal";

    temperatureInput.placeholder =
        "z. B. 24,5";

    temperatureInput.className =
        "watertest-temperature";


    /*
     Falls bereits etwas eingegeben wurde,
     bleibt es beim erneuten Rendern erhalten.
    */
    temperatureInput.value =
        currentValues.temperature ?? "";


    temperatureInput.addEventListener(
        "input",
        () => {

            currentValues.temperature =
                temperatureInput.value;
        }
    );


    temperatureSection.appendChild(
        temperatureInput
    );

    container.appendChild(
        temperatureSection
    );


    /*
     Speichern
    */
    const saveButton =
        document.createElement("button");

    saveButton.type =
        "button";

    saveButton.className =
        "watertest-save";

    saveButton.textContent =
        "Wassertest speichern";


    saveButton.addEventListener(
        "click",
        saveWatertest
    );


    container.appendChild(saveButton);
}


/*
 =========================================================
 TEST SPEICHERN
 =========================================================
*/

function saveWatertest() {

    /*
     Sind alle sechs Wasserwerte ausgewählt?
    */
    const allSelected =
        WATER_VALUES.every(
            parameter =>
                currentValues[
                    parameter.id
                ] !== undefined
        );


    if (!allSelected) {

        alert(
            "Bitte für alle Wasserwerte einen Wert auswählen."
        );

        return;
    }


    /*
     Temperatur prüfen.

     Komma und Punkt werden beide akzeptiert.
    */
    const temperature =
        parseFloat(
            String(
                currentValues.temperature ?? ""
            ).replace(",", ".")
        );


    if (!Number.isFinite(temperature)) {

        alert(
            "Bitte eine gültige Temperatur eingeben."
        );

        return;
    }


    /*
     Temperatur immer mit genau
     einer Nachkommastelle speichern.

     Beispiel:
     24,5 -> "24.5"
     24   -> "24.0"
    */
    currentValues.temperature =
        temperature.toFixed(1);


    const today =
        new Date();

    const week =
        getISOWeek(today);

    const year =
        getISOWeekYear(today);


    let history =
        loadHistory();


    /*
     Gibt es bereits einen Test
     für diese KW und dieses Jahr?

     Dann entfernen wir ihn.

     Dadurch gibt es immer nur
     EINEN Test pro Kalenderwoche.
    */
    history =
        history.filter(test =>
            !(
                test.week === week &&
                test.year === year
            )
        );


    /*
     Neuen Test erstellen.
    */
    const test = {

        id:
            Date.now().toString(),

        date:
            new Date().toISOString(),

        year:
            year,

        week:
            week,

        values: {
            ...currentValues
        }

    };


    history.push(test);


    /*
     Verlauf speichern.
    */
    localStorage.setItem(
        "watertest-history",
        JSON.stringify(history)
    );


    /*
     Eingabe zurücksetzen.
    */
    currentValues = {};


    /*
     Übersicht aktualisieren.
    */
    renderOverview();


    /*
     Direkt zurück zur Übersicht.
    */
    showView("watertest");
}


/*
 =========================================================
 ÜBERSICHT
 =========================================================
*/

function renderOverview() {

    const container =
        document.getElementById(
            "watertest-overview"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    const history =
        loadHistory();


    /*
     Noch keine Tests vorhanden.
    */
    if (history.length === 0) {

        const empty =
            document.createElement("p");

        empty.className =
            "watertest-empty";

        empty.textContent =
            "Noch keine Wassertests gespeichert.";

        container.appendChild(empty);

        return;
    }


    /*
     Neueste Kalenderwoche zuerst.

     Dadurch steht die aktuellste KW
     direkt links in der Tabelle.
    */
    const sortedHistory =
        [...history].sort((a, b) => {

            if (a.year !== b.year) {
                return b.year - a.year;
            }

            return b.week - a.week;
        });


    /*
     Scrollbarer Bereich für das Handy.
    */
    const scroll =
        document.createElement("div");

    scroll.className =
        "watertest-overview-scroll";


    /*
     Tabelle erstellen.
    */
    const table =
        document.createElement("table");

    table.className =
        "watertest-overview-table";


    /* ==================================================
       TABELLENKOPF

       Erste Spalte = Wasserwert
       Danach kommen die Kalenderwochen
       ================================================== */

    const thead =
        document.createElement("thead");


    const headerRow =
        document.createElement("tr");


    /*
     Linke obere Ecke bleibt leer.
    */
    const emptyHeader =
        document.createElement("th");

    emptyHeader.textContent = "";

    headerRow.appendChild(
        emptyHeader
    );


    /*
     Jede gespeicherte KW bekommt
     eine eigene Spalte.
    */
    sortedHistory.forEach(test => {

        const th =
            document.createElement("th");


        th.textContent =
            `KW ${test.week}`;


        headerRow.appendChild(th);
    });


    thead.appendChild(headerRow);

    table.appendChild(thead);


    /* ==================================================
       TABELLENINHALT

       Jeder Wasserwert bekommt
       eine eigene Zeile.
       ================================================== */

    const tbody =
        document.createElement("tbody");


    WATER_VALUES.forEach(parameter => {

        const row =
            document.createElement("tr");


        /*
         Name des Wasserwertes links.
        */
        const parameterCell =
            document.createElement("th");


        parameterCell.textContent =
            parameter.name;


        row.appendChild(
            parameterCell
        );


        /*
         Für jede KW den gespeicherten
         Messwert anzeigen.
        */
        sortedHistory.forEach(test => {

            const cell =
                document.createElement("td");


            const value =
                test.values[
                    parameter.id
                ];


            const status =
                getStatus(
                    parameter,
                    value
                );


            /*
             Farbiger Statuspunkt.
            */
            const dot =
                document.createElement("span");


            dot.className =
                `watertest-status-dot status-${status}`;


            /*
             Tatsächlicher Messwert.
            */
            const valueText =
                document.createElement("span");


            valueText.className =
                "watertest-overview-value";


            valueText.textContent =
                value;


            cell.appendChild(dot);

            cell.appendChild(
                valueText
            );


            row.appendChild(cell);
        });


        tbody.appendChild(row);
    });


    /* ==================================================
       TEMPERATUR-ZEILE
       ================================================== */

    const temperatureRow =
        document.createElement("tr");


    const temperatureName =
        document.createElement("th");

    temperatureName.textContent =
        "Temp.";

    temperatureRow.appendChild(
        temperatureName
    );


    /*
     Für jede gespeicherte KW
     die Temperatur anzeigen.
    */
    sortedHistory.forEach(test => {

        const cell =
            document.createElement("td");


        const rawTemperature =
            test.values?.temperature;


        /*
         Alte Tests wurden noch ohne
         Temperatur gespeichert.

         In diesem Fall zeigen wir
         einfach einen Strich.
        */
        if (
            rawTemperature === undefined ||
            rawTemperature === null ||
            rawTemperature === ""
        ) {

            const valueText =
                document.createElement("span");

            valueText.className =
                "watertest-overview-value";

            valueText.textContent =
                "–";

            cell.appendChild(valueText);

            temperatureRow.appendChild(cell);

            return;
        }


        const temperature =
            Number(
                String(rawTemperature)
                    .replace(",", ".")
            );


        const status =
            getTemperatureStatus(
                temperature
            );


        /*
         Farbiger Statuspunkt.
        */
        const dot =
            document.createElement("span");

        dot.className =
            `watertest-status-dot status-${status}`;


        /*
         Temperatur anzeigen.

         Punkt wird für die Anzeige
         wieder zum deutschen Komma.
        */
        const valueText =
            document.createElement("span");

        valueText.className =
            "watertest-overview-value";

        valueText.textContent =
            `${temperature
                .toFixed(1)
                .replace(".", ",")}°`;


        cell.appendChild(dot);

        cell.appendChild(
            valueText
        );

        temperatureRow.appendChild(cell);
    });


    tbody.appendChild(
        temperatureRow
    );


    table.appendChild(tbody);

    scroll.appendChild(table);

    container.appendChild(scroll);
}


/*
 =========================================================
 TEMPERATUR-STATUS BESTIMMEN
 =========================================================
*/

function getTemperatureStatus(
    temperature
) {

    /*
     GRÜN:
     22,0 bis unter 26,0 °C
    */
    if (
        temperature >= 22 &&
        temperature < 26
    ) {
        return "green";
    }


    /*
     ORANGE:

     20,0 bis unter 22,0 °C

     ODER

     26,0 bis unter 28,0 °C
    */
    if (
        (
            temperature >= 20 &&
            temperature < 22
        ) ||
        (
            temperature >= 26 &&
            temperature < 28
        )
    ) {
        return "orange";
    }


    /*
     Alles andere ist ROT:

     unter 20,0 °C
     oder ab 28,0 °C
    */
    return "red";
}


/*
 =========================================================
 STATUS EINES WASSERWERTES BESTIMMEN
 =========================================================
*/

function getStatus(
    parameter,
    value
) {

    const option =
        parameter.values.find(
            option =>
                option.value === value
        );


    return option
        ? option.status
        : "unknown";
}


/*
 =========================================================
 VERLAUF LADEN
 =========================================================
*/

function loadHistory() {

    const raw =
        localStorage.getItem(
            "watertest-history"
        );


    if (!raw) {
        return [];
    }


    try {

        const history =
            JSON.parse(raw);

        return Array.isArray(history)
            ? history
            : [];

    } catch (error) {

        console.error(
            "❌ Wassertest-Verlauf konnte nicht geladen werden",
            error
        );

        return [];
    }
}


/*
 =========================================================
 AKTUELLE KW IN DER EINGABE
 =========================================================
*/

function renderCurrentWeekTitle() {

    const element =
        document.getElementById(
            "watertest-current-week"
        );


    if (!element) {
        return;
    }


    const today =
        new Date();

    const week =
        getISOWeek(today);

    const year =
        getISOWeekYear(today);


    element.textContent =
        `KW ${week} · ${year}`;
}


/*
 =========================================================
 ISO-KALENDERWOCHE
 =========================================================
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
 =========================================================
 ISO-JAHR
 =========================================================
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
