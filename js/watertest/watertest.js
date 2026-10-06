// js/watertest/watertest.js

import { showView } from "../router.js";
import {
    getISOWeek,
    getISOWeekYear
} from "../utils/date.js";
import { loadWaterTests, loadWaterTest, saveWaterTest } from "../data/watertest-data.js?v=0.97";

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


/*
 =========================================================
 AKTUELL BEARBEITETE WERTE
 =========================================================
*/

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

        console.error("Wassertest-Navigation nicht gefunden");

        return;
    }


    /*
     Übersicht beim Start vorbereiten.
    */
    await renderOverview();

    document.querySelector('[data-tile="watertest"]')?.addEventListener("click", renderOverview);


    /*
     =====================================================
     WASSERTEST DER AKTUELLEN KW ÖFFNEN
     =====================================================

     Wenn bereits ein Test existiert:
     -> gespeicherte Werte laden

     Wenn noch keiner existiert:
     -> leere Eingabe öffnen
    */
    addButton.addEventListener("click", async () => {

        const today =
            new Date();

        const week =
            getISOWeek(today);

        const year =
            getISOWeekYear(today);


        let existingTest = null;
        try {
            existingTest = await loadWaterTest(year, week);
        } catch (error) {
            console.error("Wassertest konnte nicht geladen werden:", error);
        }


        /*
         Es gibt bereits einen Test
         für die aktuelle KW.
        */
        if (
            existingTest &&
            existingTest.values
        ) {

            currentValues = {

                no3:
                    existingTest.values.no3,

                no2:
                    existingTest.values.no2,

                gh:
                    existingTest.values.gh,

                kh:
                    existingTest.values.kh,

                ph:
                    existingTest.values.ph,

                cl2:
                    existingTest.values.cl2,

                temperature:
                    existingTest.values.temperature ?? ""
            };


            console.log("Bestehender Wassertest geladen.");

        } else {

            /*
             Noch kein Test für diese KW.
             Deshalb leere Eingabe.
            */
            currentValues = {};


            console.log("Noch kein Wassertest für diese KW.");
        }


        /*
         Aktuelle KW oben anzeigen.
        */
        renderCurrentWeekTitle();


        /*
         Eingabemaske erstellen.

         Wenn bereits Werte geladen wurden,
         werden diese direkt markiert.
        */
        renderWatertestForm();


        /*
         Eingabeseite öffnen.
        */
        showView("watertest-entry");
    });


    /*
     Von Eingabe zurück zur Übersicht.
    */
    backButton.addEventListener("click", async () => {

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
        document.getElementById(
            "watertest-form"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    /*
     =====================================================
     WASSERWERTE
     =====================================================
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


        /*
         Auswahlmöglichkeiten erzeugen.
        */
        parameter.values.forEach(option => {

            const button =
                document.createElement("button");


            button.type =
                "button";

            button.className =
                "watertest-value";

            button.textContent =
                option.value;


            /*
             Prüfen, ob dieser Wert bereits
             ausgewählt / gespeichert ist.
            */
            const isSelected =
                String(
                    currentValues[
                        parameter.id
                    ] ?? ""
                )
                ===
                String(option.value);


            /*
             Bereits gespeicherten Wert
             farbig markieren.
            */
            if (isSelected) {

                button.classList.add(
                    "selected",
                    `status-${option.status}`
                );
            }


            /*
             Wert auswählen.
            */
            button.addEventListener(
                "click",
                () => {

                    currentValues[
                        parameter.id
                    ] = option.value;


                    /*
                     Formular neu zeichnen,
                     damit die neue Auswahl
                     farbig dargestellt wird.
                    */
                    renderWatertestForm();
                }
            );


            buttons.appendChild(button);
        });


        section.appendChild(buttons);

        container.appendChild(section);
    });


    /*
     =====================================================
     TEMPERATUR
     =====================================================
    */

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
     Manuelles Eingabefeld.

     inputMode decimal sorgt auf dem
     Handy für eine passende Tastatur.
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
     Gespeicherte Temperatur anzeigen.

     Intern kann sie mit Punkt gespeichert sein.
     Für die Eingabe zeigen wir ein Komma.
    */
    if (
        currentValues.temperature !== undefined &&
        currentValues.temperature !== null &&
        currentValues.temperature !== ""
    ) {

        temperatureInput.value =
            String(
                currentValues.temperature
            ).replace(".", ",");

    } else {

        temperatureInput.value = "";
    }


    /*
     Eingabe merken.
    */
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
     =====================================================
     SPEICHERN
     =====================================================
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


    container.appendChild(
        saveButton
    );
}


/*
 =========================================================
 TEST SPEICHERN
 =========================================================
*/

async function saveWatertest() {

    /*
     Prüfen, ob alle sechs Wasserwerte
     ausgewählt wurden.
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
     =====================================================
     TEMPERATUR PRÜFEN
     =====================================================
    */

    const temperature =
        parseFloat(
            String(
                currentValues.temperature ?? ""
            )
            .replace(",", ".")
        );


    if (!Number.isFinite(temperature)) {

        alert(
            "Bitte eine gültige Temperatur eingeben."
        );

        return;
    }


    /*
     Temperatur mit genau einer
     Nachkommastelle speichern.

     Beispiel:
     24,5 -> "24.5"
     24   -> "24.0"
    */
    currentValues.temperature =
        temperature.toFixed(1);


    /*
     Aktuelle KW bestimmen.
    */
    const today =
        new Date();

    const week =
        getISOWeek(today);

    const year =
        getISOWeekYear(today);


    try {
        await saveWaterTest(year, week, { ...currentValues });
    } catch (error) {
        console.error("Wassertest konnte nicht gespeichert werden:", error);
        alert("Wassertest konnte nicht gespeichert werden.");
        return;
    }


    /*
     Eingabe zurücksetzen.
    */
    currentValues = {};


    /*
     Übersicht aktualisieren.
    */
    renderOverview();


    /*
     Zurück zur Übersicht.
    */
    showView("watertest");
}


/*
 =========================================================
 ÜBERSICHT
 =========================================================
*/

async function renderOverview() {

    const container =
        document.getElementById(
            "watertest-overview"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    let history = [];
    try {
        history = await loadWaterTests();
    } catch (error) {
        console.log("Wassertests noch nicht geladen:", error.message);
    }


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
    */
    const sortedHistory =
        [...history].sort((a, b) => {

            if (
                Number(a.year) !==
                Number(b.year)
            ) {

                return (
                    Number(b.year) -
                    Number(a.year)
                );
            }


            return (
                Number(b.week) -
                Number(a.week)
            );
        });


    /*
     Scrollbarer Bereich.
    */
    const scroll =
        document.createElement("div");

    scroll.className =
        "watertest-overview-scroll";


    /*
     Tabelle.
    */
    const table =
        document.createElement("table");

    table.className =
        "watertest-overview-table";


    /*
     =====================================================
     TABELLENKOPF
     =====================================================
    */

    const thead =
        document.createElement("thead");


    const headerRow =
        document.createElement("tr");


    /*
     Linke obere Ecke.
    */
    const emptyHeader =
        document.createElement("th");

    emptyHeader.textContent = "";

    headerRow.appendChild(
        emptyHeader
    );


    /*
     Kalenderwochen als Spalten.
    */
    sortedHistory.forEach(test => {

        const th =
            document.createElement("th");


        th.textContent =
            `KW ${test.week}`;


        headerRow.appendChild(th);
    });


    thead.appendChild(
        headerRow
    );


    table.appendChild(
        thead
    );


    /*
     =====================================================
     WASSERWERTE ALS ZEILEN
     =====================================================
    */

    const tbody =
        document.createElement("tbody");


    WATER_VALUES.forEach(parameter => {

        const row =
            document.createElement("tr");


        /*
         Name links.
        */
        const parameterCell =
            document.createElement("th");


        parameterCell.textContent =
            parameter.name;


        row.appendChild(
            parameterCell
        );


        /*
         Werte der einzelnen KWs.
        */
        sortedHistory.forEach(test => {

            const cell =
                document.createElement("td");


            const value =
                test.values?.[
                    parameter.id
                ];


            /*
             Falls ein sehr alter Test
             diesen Wert nicht enthält.
            */
            if (
                value === undefined ||
                value === null
            ) {

                const valueText =
                    document.createElement("span");

                valueText.className =
                    "watertest-overview-value";

                valueText.textContent =
                    "–";

                cell.appendChild(
                    valueText
                );

                row.appendChild(cell);

                return;
            }


            const status =
                getStatus(
                    parameter,
                    String(value)
                );


            /*
             Farbiger Punkt.
            */
            const dot =
                document.createElement("span");


            dot.className =
                `watertest-status-dot status-${status}`;


            /*
             Messwert.
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


    /*
     =====================================================
     TEMPERATUR-ZEILE
     =====================================================
    */

    const temperatureRow =
        document.createElement("tr");


    const temperatureName =
        document.createElement("th");

    temperatureName.textContent =
        "Temp.";


    temperatureRow.appendChild(
        temperatureName
    );


    sortedHistory.forEach(test => {

        const cell =
            document.createElement("td");


        const rawTemperature =
            test.values?.temperature;


        /*
         Alte Tests ohne Temperatur.
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


            cell.appendChild(
                valueText
            );

            temperatureRow.appendChild(
                cell
            );

            return;
        }


        const temperature =
            Number(
                String(rawTemperature)
                    .replace(",", ".")
            );


        /*
         Falls aus irgendeinem Grund
         keine gültige Zahl gespeichert ist.
        */
        if (!Number.isFinite(temperature)) {

            const valueText =
                document.createElement("span");

            valueText.className =
                "watertest-overview-value";

            valueText.textContent =
                "–";


            cell.appendChild(
                valueText
            );

            temperatureRow.appendChild(
                cell
            );

            return;
        }


        const status =
            getTemperatureStatus(
                temperature
            );


        /*
         Farbiger Punkt.
        */
        const dot =
            document.createElement("span");


        dot.className =
            `watertest-status-dot status-${status}`;


        /*
         Temperatur anzeigen.
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


        temperatureRow.appendChild(
            cell
        );
    });


    tbody.appendChild(
        temperatureRow
    );


    table.appendChild(
        tbody
    );


    scroll.appendChild(
        table
    );


    container.appendChild(
        scroll
    );
}


/*
 =========================================================
 TEMPERATUR-STATUS
 =========================================================
*/

function getTemperatureStatus(
    temperature
) {

    /*
     GRÜN
     22,0 bis unter 26,0 °C
    */
    if (
        temperature >= 22 &&
        temperature < 26
    ) {

        return "green";
    }


    /*
     ORANGE

     20,0 bis unter 22,0 °C

     oder

     26,0 bis unter 28,0 °C
    */
    if (
        (
            temperature >= 20 &&
            temperature < 22
        )
        ||
        (
            temperature >= 26 &&
            temperature < 28
        )
    ) {

        return "orange";
    }


    /*
     ROT

     unter 20,0 °C
     oder ab 28,0 °C
    */
    return "red";
}


/*
 =========================================================
 STATUS EINES WASSERWERTES
 =========================================================
*/

function getStatus(
    parameter,
    value
) {

    const option =
        parameter.values.find(
            option =>
                String(option.value)
                ===
                String(value)
        );


    return option
        ? option.status
        : "unknown";
}


/*
 =========================================================
 AKTUELLE KW ANZEIGEN
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




