// Importiert Speicherfunktionen
import { save, load } from "../storage.js";

/*
 Initialisiert das komplette To-Do-Feature
*/
export function initTodo() {

    // Initialisierung aller drei Listen
    initList("a");
    initList("b");
    initList("c");
}

/*
 Initialisiert eine einzelne Liste (A, B oder C)
*/
function initList(type) {

    // IDs dynamisch zusammensetzen
    const input = document.getElementById(`todo-${type}-input`);
    const addButton = document.getElementById(`todo-${type}-add`);
    const list = document.getElementById(`todo-${type}-list`);

    // Sicherheitscheck
    if (!input || !addButton || !list) {
        console.error(`To-Do ${type}: Elemente fehlen`);
        return;
    }

    // Key für localStorage
    const storageKey = `todo-${type}`;

    // Gespeicherte Aufgaben laden (oder leeres Array)
    let todos = load(storageKey, []);

    // Liste initial anzeigen
    renderList(list, todos, storageKey);

    // Klick auf "Hinzufügen"
    addButton.addEventListener("click", () => {

        const text = input.value.trim();

        // Leere Einträge ignorieren
        if (text === "") return;

        // Aufgabe hinzufügen
        todos.push(text);

        // Speichern
        save(storageKey, todos);

        // Input leeren
        input.value = "";

        // Neu rendern
        renderList(list, todos, storageKey);
    });
}

/*
 Rendert eine To-Do-Liste komplett neu
*/
function renderList(listElement, todos, storageKey) {

    // Liste leeren
    listElement.innerHTML = "";

    // Jede Aufgabe darstellen
    todos.forEach((text, index) => {

        const li = document.createElement("li");

        li.textContent = text;

        // Löschen-Button
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "✖";

        deleteButton.style.marginLeft = "10px";

        // Klick → Aufgabe löschen
        deleteButton.addEventListener("click", () => {

            todos.splice(index, 1);
            save(storageKey, todos);
            renderList(listElement, todos, storageKey);
        });

        li.appendChild(deleteButton);
        listElement.appendChild(li);
    });
}

