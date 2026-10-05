// js/packlists/packlists.js

import { showView } from "../router.js";
import { initPacklistEditor } from "./packlist-editor.js";
import { initPacklistRun } from "./packlist-run.js";

const STORAGE_KEY = "packlists";


/* ---------- Storage ---------- */

function loadPacklists() {
    return JSON.parse(
        localStorage.getItem(STORAGE_KEY)
    ) || [];
}


function savePacklists(packlists) {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(packlists)
    );
}


/* ---------- Titel ---------- */

function setRunTitle(name) {
    const el =
        document.getElementById(
            "packlist-run-title"
        );

    if (el) {
        el.textContent = name;
    }
}


function setEditTitle(name) {
    const el =
        document.getElementById(
            "packlist-edit-title"
        );

    if (el) {
        el.textContent = name;
    }
}


/* ---------- Auswahl-Dialog ---------- */

function openPacklistDialog(packlist) {

    /*
     Falls bereits ein Dialog existiert,
     entfernen wir ihn zuerst.
    */
    const oldDialog =
        document.getElementById(
            "packlist-action-dialog"
        );

    if (oldDialog) {
        oldDialog.remove();
    }


    /*
     Dunkler Hintergrund hinter dem Dialog.
    */
    const overlay =
        document.createElement("div");

    overlay.id =
        "packlist-action-dialog";

    overlay.className =
        "packlist-dialog-overlay";


    /*
     Eigentliche Dialogbox.
    */
    const dialog =
        document.createElement("div");

    dialog.className =
        "packlist-dialog";


    /*
     Titel der Packliste.
    */
    const title =
        document.createElement("h3");

    title.textContent =
        packlist.name;

    dialog.appendChild(title);


    /*
     Beschreibung.
    */
    const text =
        document.createElement("p");

    text.textContent =
        "Was möchtest du machen?";

    dialog.appendChild(text);


    /*
     -----------------------------------------
     FORTSETZEN
     -----------------------------------------
    */

    const continueButton =
        document.createElement("button");

    continueButton.type =
        "button";

    continueButton.textContent =
        "Fortsetzen";


    continueButton.addEventListener(
        "click",
        () => {

            /*
             Dialog schließen.
            */
            overlay.remove();


            /*
             Packliste als aktiv speichern.
            */
            localStorage.setItem(
                "active-packlist-id",
                packlist.id
            );


            /*
             Bestehenden Fortschritt benutzen.
            */
            localStorage.setItem(
                "packlist-run-mode",
                "continue"
            );


            /*
             Titel setzen.
            */
            setRunTitle(
                packlist.name
            );


            /*
             Packansicht öffnen.
            */
            showView(
                "packlist-run"
            );


            /*
             Packliste initialisieren.
            */
            initPacklistRun();
        }
    );


    dialog.appendChild(
        continueButton
    );


    /*
     -----------------------------------------
     NEU STARTEN
     -----------------------------------------
    */

    const newButton =
        document.createElement("button");

    newButton.type =
        "button";

    newButton.textContent =
        "Neu starten";


    newButton.addEventListener(
        "click",
        () => {

            overlay.remove();


            localStorage.setItem(
                "active-packlist-id",
                packlist.id
            );


            /*
             Neue Packrunde starten.
            */
            localStorage.setItem(
                "packlist-run-mode",
                "new"
            );


            setRunTitle(
                packlist.name
            );


            showView(
                "packlist-run"
            );


            initPacklistRun();
        }
    );


    dialog.appendChild(
        newButton
    );


    /*
     -----------------------------------------
     BEARBEITEN
     -----------------------------------------
    */

    const editButton =
        document.createElement("button");

    editButton.type =
        "button";

    editButton.textContent =
        "Liste bearbeiten";


    editButton.addEventListener(
        "click",
        () => {

            overlay.remove();


            localStorage.setItem(
                "active-packlist-id",
                packlist.id
            );


            setEditTitle(
                packlist.name
            );


            showView(
                "packlist-edit"
            );


            initPacklistEditor();
        }
    );


    dialog.appendChild(
        editButton
    );


    /*
     -----------------------------------------
     ABBRECHEN
     -----------------------------------------
    */

    const cancelButton =
        document.createElement("button");

    cancelButton.type =
        "button";

    cancelButton.className =
        "packlist-dialog-cancel";

    cancelButton.textContent =
        "Abbrechen";


    cancelButton.addEventListener(
        "click",
        () => {

            overlay.remove();
        }
    );


    dialog.appendChild(
        cancelButton
    );


    /*
     Dialog in Overlay einsetzen.
    */
    overlay.appendChild(
        dialog
    );


    /*
     Overlay in die Seite einsetzen.
    */
    document.body.appendChild(
        overlay
    );


    /*
     Wenn man neben den Dialog tippt,
     wird er ebenfalls geschlossen.
    */
    overlay.addEventListener(
        "click",
        event => {

            if (event.target === overlay) {
                overlay.remove();
            }
        }
    );
}


/* ---------- Render ---------- */

function renderPacklists() {

    const listEl =
        document.getElementById(
            "packlists-list"
        );


    if (!listEl) {
        return;
    }


    listEl.innerHTML = "";


    const packlists =
        loadPacklists();


    packlists.forEach(packlist => {

        const li =
            document.createElement("li");


        li.textContent =
            packlist.name;


        /*
         Packliste antippen.

         Statt prompt() öffnen wir jetzt
         unseren eigenen Dialog.
        */
        li.addEventListener(
            "click",
            () => {

                openPacklistDialog(
                    packlist
                );
            }
        );


        listEl.appendChild(li);
    });
}


/* ---------- Init ---------- */

export function initPacklists() {

    console.log(
        "initPacklists() wurde aufgerufen"
    );


    const createBtn =
        document.getElementById(
            "create-packlist"
        );


    if (!createBtn) {

        console.error(
            "create-packlist Button nicht gefunden"
        );

        return;
    }


    /*
     Neue Packliste erstellen.

     Diesen prompt lassen wir vorerst bestehen,
     da hier tatsächlich Texteingabe benötigt wird.
    */
    createBtn.addEventListener(
        "click",
        () => {

            const name =
                prompt(
                    "Name der Packliste:"
                );


            if (!name) {
                return;
            }


            const packlists =
                loadPacklists();


            packlists.push({

                id:
                    Date.now().toString(),

                name:
                    name
            });


            savePacklists(
                packlists
            );


            renderPacklists();
        }
    );


    renderPacklists();
}
