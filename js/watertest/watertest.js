// js/watertest/watertest.js


/*
 =========================================================
 WASSERTEST – KONFIGURATION
 =========================================================

 Hier stehen alle Messwerte des JBL-Teststreifens.

 value:
 Der Messwert, der gespeichert und angezeigt wird.

 status:
 green  = guter Bereich
 orange = Warnbereich
 red    = kritischer Bereich
*/
const WATER_VALUES = [

    /* ==================================================
       NO3
       ================================================== */
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


    /* ==================================================
       NO2
       ================================================== */
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


    /* ==================================================
       GH
       ================================================== */
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


    /* ==================================================
       KH
       ================================================== */
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


    /* ==================================================
       pH
       ================================================== */
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


    /* ==================================================
       Chlor / Cl2
       ================================================== */
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
 AKTUELLE EINGABE
 =========================================================

 Hier speichern wir vorübergehend die Werte,
 die gerade in der Eingabemaske ausgewählt wurden.

 Beispiel:

 {
     no3: "25",
     no2: "0",
     gh: "<7",
     kh: "6",
     ph: "7.2",
     cl2: "0"
 }
*/
let currentValues = {};


/*
 =========================================================
 INITIALISIERUNG
 =========================================================
*/
export function initWatertest() {

    const container =
        document.getElementById("watertest-form");


    if (!container) {

        console.error(
            "❌ watertest-form nicht gefunden"
        );

        return;
    }


    renderWatertestForm();
}


/*
 =========================================================
 EINGABEMASKE AUFBAUEN
 =========================================================
*/
function renderWatertestForm() {

    const container =
        document.getElementById("watertest-form");


    if (!container) {
        return;
    }


    /*
     Alten Inhalt entfernen.

     Danach bauen wir die komplette Maske
     mit dem aktuellen Auswahlzustand neu auf.
    */
    container.innerHTML = "";


    /*
     Jeden Wasserparameter durchgehen.
    */
    WATER_VALUES.forEach(parameter => {

        /*
         Bereich für einen Wasserwert erstellen.
        */
        const section =
            document.createElement("section");

        section.className =
            "watertest-section";


        /*
         Überschrift erstellen.

         Beispiel:
         NO₃ (mg/l)
        */
        const title =
            document.createElement("h3");


        title.textContent =
            parameter.unit
                ? `${parameter.name} (${parameter.unit})`
                : parameter.name;


        section.appendChild(title);


        /*
         Container für die Auswahlbuttons.
        */
        const buttons =
            document.createElement("div");

        buttons.className =
            "watertest-values";


        /*
         Alle möglichen Werte dieses
         Parameters durchgehen.
        */
        parameter.values.forEach(option => {

            /*
             Button erstellen.
            */
            const button =
                document.createElement("button");


            button.type =
                "button";


            button.className =
                "watertest-value";


            /*
             Messwert auf dem Button anzeigen.
            */
            button.textContent =
                option.value;


            /*
             Prüfen, ob dieser Wert gerade
             ausgewählt ist.
            */
            const isSelected =
                currentValues[parameter.id]
                === option.value;


            /*
             Wenn ausgewählt:

             - selected hinzufügen
             - passende Feedbackfarbe hinzufügen
            */
            if (isSelected) {

                button.classList.add(
                    "selected",
                    `status-${option.status}`
                );
            }


            /*
             Klick auf einen Wert.
            */
            button.addEventListener(
                "click",
                () => {

                    /*
                     Ausgewählten Wert speichern.
                    */
                    currentValues[
                        parameter.id
                    ] = option.value;


                    /*
                     Eingabemaske neu zeichnen.

                     Dadurch wird nur der aktuell
                     ausgewählte Wert eingefärbt.
                    */
                    renderWatertestForm();

                }
            );


            buttons.appendChild(button);

        });


        section.appendChild(buttons);

        container.appendChild(section);

    });


    /* ==================================================
       SPEICHERN-BUTTON
       ================================================== */

    const saveButton =
        document.createElement("button");


    saveButton.type =
        "button";


    saveButton.className =
        "watertest-save";


    saveButton.textContent =
        "Wassertest speichern";


    /*
     Beim Klick wird der komplette Test gespeichert.
    */
    saveButton.addEventListener(
        "click",
        saveWatertest
    );


    container.appendChild(saveButton);
}


/*
 =========================================================
 WASSERTEST SPEICHERN
 =========================================================
*/
function saveWatertest() {

    /*
     Prüfen, ob für alle sechs Parameter
     ein Wert ausgewählt wurde.
    */
    const allSelected =
        WATER_VALUES.every(
            parameter =>
                currentValues[
                    parameter.id
                ] !== undefined
        );


    /*
     Falls noch etwas fehlt:
     nicht speichern.
    */
    if (!allSelected) {

        alert(
            "Bitte für alle Wasserwerte einen Wert auswählen."
        );

        return;
    }


    /*
     Bereits vorhandene Wassertests laden.
    */
    const raw =
        localStorage.getItem(
            "watertest-history"
        );


    let history = [];


    /*
     Falls bereits Daten vorhanden sind,
     versuchen wir sie einzulesen.
    */
    if (raw) {

        try {

            history =
                JSON.parse(raw);

        } catch (error) {

            console.error(
                "❌ Wassertest-Verlauf konnte nicht geladen werden",
                error
            );

            history = [];
        }
    }


    /*
     Neuen Wassertest erstellen.

     Wir speichern:

     - eindeutige ID
     - Datum und Uhrzeit
     - die sechs Messwerte
    */
    const test = {

        id:
            Date.now().toString(),

        date:
            new Date().toISOString(),

        values: {
            ...currentValues
        }

    };


    /*
     Neuen Test zum Verlauf hinzufügen.
    */
    history.push(test);


    /*
     Kompletten Verlauf wieder speichern.
    */
    localStorage.setItem(
        "watertest-history",
        JSON.stringify(history)
    );


    /*
     Aktuelle Eingabe zurücksetzen.
    */
    currentValues = {};


    /*
     Eingabemaske zurücksetzen.
    */
    renderWatertestForm();


    /*
     Kurze Bestätigung.
    */
    alert(
        "Wassertest gespeichert."
    );
}
