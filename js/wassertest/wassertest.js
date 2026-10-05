
// js/watertest/watertest.js


/*
 Alle auswählbaren Werte des JBL-Teststreifens.

 value:
 Der Wert, den wir intern speichern.

 label:
 Der Text, der auf dem Button angezeigt wird.
*/
const WATER_VALUES = [

    {
        id: "no3",
        name: "NO₃",
        unit: "mg/l",
        values: [
            "0",
            "10",
            "25",
            "50",
            "100",
            "250",
            "500"
        ]
    },

    {
        id: "no2",
        name: "NO₂",
        unit: "mg/l",
        values: [
            "0",
            "0,5",
            "2",
            "5",
            "10"
        ]
    },

    {
        id: "gh",
        name: "GH",
        unit: "°dH",
        values: [
            "<3",
            "<4",
            "<7",
            "<14",
            "<21"
        ]
    },

    {
        id: "kh",
        name: "KH",
        unit: "°dH",
        values: [
            "0",
            "3",
            "6",
            "10",
            "15",
            "20"
        ]
    },

    {
        id: "ph",
        name: "pH",
        unit: "",
        values: [
            "6.4",
            "6.8",
            "7.2",
            "7.6",
            "8.0",
            "8.4",
            "9.0"
        ]
    },

    {
        id: "cl2",
        name: "Cl₂",
        unit: "mg/l",
        values: [
            "0",
            "0.8",
            "1.5",
            "3.0"
        ]
    }

];


/*
 Temporäre Auswahl.

 Hier landen die Werte, die der Benutzer
 während der Eingabe auswählt.
*/
let currentValues = {};


/*
 Wassertest initialisieren.
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
 Baut die komplette Eingabemaske auf.
*/
function renderWatertestForm() {

    const container =
        document.getElementById("watertest-form");


    if (!container) {
        return;
    }


    // Vorherigen Inhalt entfernen
    container.innerHTML = "";


    /*
     Für jeden Wasserwert
     einen eigenen Bereich erstellen.
    */
    WATER_VALUES.forEach(parameter => {

        const section =
            document.createElement("section");

        section.className =
            "watertest-section";


        /*
         Überschrift, z.B.:

         NO₃ mg/l
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
         Einzelne Werte erzeugen.
        */
        parameter.values.forEach(value => {

            const button =
                document.createElement("button");


            button.type = "button";

            button.className =
                "watertest-value";


            button.textContent =
                value;


            /*
             Prüfen, ob dieser Wert
             momentan ausgewählt ist.
            */
            if (
                currentValues[parameter.id]
                === value
            ) {

                button.classList.add(
                    "selected"
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
                    ] = value;


                    /*
                     Maske neu zeichnen,
                     damit die Auswahl sichtbar wird.
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
     Speicherbutton
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
 Speichert den aktuellen Wassertest.

 Wir speichern direkt Datum und Uhrzeit mit.
 Das brauchen wir später für die Historie.
*/
function saveWatertest() {

    /*
     Prüfen, ob wirklich für alle
     sechs Werte etwas gewählt wurde.
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
     Bereits gespeicherte Tests laden.
    */
    const raw =
        localStorage.getItem(
            "watertest-history"
        );


    let history = [];


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
     Neuen Test erstellen.
    */
    const test = {

        id: Date.now().toString(),

        date: new Date().toISOString(),

        values: {
            ...currentValues
        }

    };


    /*
     Test zum Verlauf hinzufügen.
    */
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
     Maske neu zeichnen.
    */
    renderWatertestForm();


    alert(
        "Wassertest gespeichert."
    );
}
