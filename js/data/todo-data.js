// js/data/todo-data.js

import {
    SUPABASE_URL,
    SUPABASE_KEY
} from "../config/supabase.js";


/*
 =========================================================
 TODO-DATENSCHICHT
 =========================================================

 Dieses Modul ist die einzige Stelle, an der der
 To-Do-Bereich direkt mit Supabase kommuniziert.

 todo.js soll später nur noch diese Funktionen benutzen:
 - loadTodos()
 - addTodo()
 - deleteTodo()

 Dadurch bleibt die Oberfläche unabhängig davon,
 wie und wo die Daten gespeichert werden.
*/


const TODO_TABLE_URL =
    `${SUPABASE_URL}/rest/v1/todos`;


/*
 Lädt alle To-Dos einer Priorität.

 priority:
 - a
 - b
 - c
*/
export async function loadTodos(priority) {

    validatePriority(priority);


    const response =
        await fetch(
            `${TODO_TABLE_URL}?priority=eq.${encodeURIComponent(priority)}&select=id,text,priority,created_at&order=created_at.asc`,
            {
                method: "GET",
                headers: createHeaders()
            }
        );


    if (!response.ok) {

        const errorText =
            await response.text();

        throw new Error(
            `To-Dos konnten nicht geladen werden (${response.status}): ${errorText}`
        );
    }


    return await response.json();
}


/*
 Erstellt ein neues To-Do.

 Supabase gibt den neu angelegten Datensatz zurück.
*/
export async function addTodo(
    text,
    priority
) {

    const cleanText =
        text.trim();


    if (cleanText === "") {

        throw new Error(
            "Ein To-Do benötigt einen Text."
        );
    }


    validatePriority(priority);


    const response =
        await fetch(
            TODO_TABLE_URL,
            {
                method: "POST",
                headers: {
                    ...createHeaders(),
                    "Prefer": "return=representation"
                },
                body: JSON.stringify({
                    text: cleanText,
                    priority
                })
            }
        );


    if (!response.ok) {

        const errorText =
            await response.text();

        throw new Error(
            `To-Do konnte nicht gespeichert werden (${response.status}): ${errorText}`
        );
    }


    const rows =
        await response.json();


    return rows[0] || null;
}


/*
 Löscht ein To-Do anhand seiner Supabase-ID.
*/
export async function deleteTodo(id) {

    if (id === null || id === undefined) {

        throw new Error(
            "Zum Löschen wird eine To-Do-ID benötigt."
        );
    }


    const response =
        await fetch(
            `${TODO_TABLE_URL}?id=eq.${encodeURIComponent(id)}`,
            {
                method: "DELETE",
                headers: createHeaders()
            }
        );


    if (!response.ok) {

        const errorText =
            await response.text();

        throw new Error(
            `To-Do konnte nicht gelöscht werden (${response.status}): ${errorText}`
        );
    }
}


/*
 Gemeinsame Header für Supabase REST.
*/
function createHeaders() {

    return {
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json"
    };
}


/*
 Verhindert ungültige Prioritäten,
 bevor überhaupt eine Anfrage gesendet wird.
*/
function validatePriority(priority) {

    if (
        priority !== "a" &&
        priority !== "b" &&
        priority !== "c"
    ) {

        throw new Error(
            `Ungültige To-Do-Priorität: ${priority}`
        );
    }
}
