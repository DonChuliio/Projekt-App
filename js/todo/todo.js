// js/todo/todo.js

// Speicherfunktionen
import { save, load } from "../storage.js";

// Synchronisierung für Push-Benachrichtigungen
import {
    syncNotificationState
} from "../push/notification-state.js";


/* =========================================================
   TODO INITIALISIEREN
   ========================================================= */

export function initTodo() {

    initList("a");
    initList("b");
    initList("c");


    /*
     Beim Start einmal synchronisieren.

     Dadurch wird Supabase auch aktualisiert,
     wenn sich seit dem letzten Öffnen z. B.
     die Kalenderwoche geändert hat.
    */
    syncNotificationState();
}


/* =========================================================
   EINZELNE LISTE INITIALISIEREN
   ========================================================= */

function initList(type) {

    const input =
        document.getElementById(
            `todo-${type}-input`
        );

    const addButton =
        document.getElementById(
            `todo-${type}-add`
        );

    const list =
        document.getElementById(
            `todo-${type}-list`
        );


    if (
        !input ||
        !addButton ||
        !list
    ) {

        console.error(
            `To-Do ${type}: Elemente fehlen`
        );

        return;
    }


    const storageKey =
        `todo-${type}`;


    let todos =
        load(
            storageKey,
            []
        );


    renderList(
        list,
        todos,
        storageKey,
        type
    );


    /* =====================================================
       TODO HINZUFÜGEN
       ===================================================== */

    addButton.addEventListener(
        "click",
        () => {

            const text =
                input.value.trim();


            if (text === "") {
                return;
            }


            todos.push(text);


            save(
                storageKey,
                todos
            );


            input.value = "";


            renderList(
                list,
                todos,
                storageKey,
                type
            );


            /*
             Nur A-To-Dos sind für unsere
             Push-Benachrichtigung relevant.
            */
            if (type === "a") {

                syncNotificationState();
            }
        }
    );
}


/* =========================================================
   TODO-LISTE ANZEIGEN
   ========================================================= */

function renderList(
    listElement,
    todos,
    storageKey,
    type
) {

    listElement.innerHTML = "";


    todos.forEach(
        (text, index) => {

            const li =
                document.createElement("li");


            li.textContent = text;


            /* =============================================
               LÖSCHEN-BUTTON
               ============================================= */

            const deleteButton =
                document.createElement(
                    "button"
                );


            /*
             Kein Emoji/Symbol mehr.
            */
            deleteButton.textContent =
                "Löschen";


            deleteButton.style.marginLeft =
                "10px";


            deleteButton.addEventListener(
                "click",
                () => {

                    /*
                     Aufgabe lokal löschen.
                    */
                    todos.splice(
                        index,
                        1
                    );


                    save(
                        storageKey,
                        todos
                    );


                    renderList(
                        listElement,
                        todos,
                        storageKey,
                        type
                    );


                    /*
                     Bei einer Änderung der
                     A-Liste Supabase aktualisieren.
                    */
                    if (type === "a") {

                        syncNotificationState();
                    }
                }
            );


            li.appendChild(
                deleteButton
            );


            listElement.appendChild(
                li
            );
        }
    );
}
