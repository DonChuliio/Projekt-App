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

            addTodo();
        }
    );


    /*
     Zusätzlich kann mit Enter
     eine Aufgabe hinzugefügt werden.
    */
    input.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                event.preventDefault();

                addTodo();
            }
        }
    );


    /* =====================================================
       HINZUFÜGEN
       ===================================================== */

    function addTodo() {

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
         Nur A-To-Dos sind für
         Push relevant.
        */
        if (type === "a") {

            syncNotificationState();
        }


        /*
         Eingabefeld direkt wieder
         aktivieren.
        */
        input.focus();
    }
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
                document.createElement(
                    "li"
                );


            /*
             Text bekommt ein eigenes Element.

             Dadurch können Aufgabe und X
             sauber nebeneinander stehen.
            */
            const textElement =
                document.createElement(
                    "span"
                );


            textElement.textContent =
                text;


            textElement.className =
                "todo-text";


            li.appendChild(
                textElement
            );


            /* =============================================
               LÖSCHEN
               ============================================= */

            const deleteButton =
                document.createElement(
                    "button"
                );


            deleteButton.type =
                "button";


            deleteButton.textContent =
                "×";


            deleteButton.className =
                "todo-delete";


            deleteButton.setAttribute(
                "aria-label",
                "Aufgabe löschen"
            );


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
                     Bei Änderungen an A
                     Supabase aktualisieren.
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
