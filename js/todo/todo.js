// js/todo/todo.js

import {
    loadTodos,
    addTodo,
    completeTodo,
    updateTodoPriority
} from "../data/todo-data.js?v=1.59";
import { syncRoutineTodos } from "../data/routine-todos-data.js?v=1.59";

export function initTodo() {
    initList("a");
    initList("b");
}

async function initList(type) {
    const input = document.getElementById(`todo-${type}-input`);
    const addButton = document.getElementById(`todo-${type}-add`);
    const list = document.getElementById(`todo-${type}-list`);

    if (!input || !addButton || !list) {
        console.error(`To-Do ${type}: Elemente fehlen`);
        return;
    }

    let todos = [];

    async function reloadTodos() {
        try {
            try { await syncRoutineTodos(); } catch (error) { console.error(error); }
            todos = await loadTodos(type);
            renderList(list, todos, type, reloadTodos);
        } catch (error) {
            console.log(`To-Do ${type} noch nicht geladen:`, error.message);
        }
    }

    await reloadTodos();

    async function addCurrentTodo() {
        const text = input.value.trim();
        if (!text) return;

        addButton.disabled = true;

        try {
            await addTodo(text, type);
            input.value = "";
            document.dispatchEvent(new CustomEvent("dock:todos-changed"));
            input.focus();
        } catch (error) {
            console.error("To-Do konnte nicht hinzugefügt werden:", error);
        } finally {
            addButton.disabled = false;
        }
    }

    addButton.addEventListener("click", addCurrentTodo);

    input.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            addCurrentTodo();
        }
    });

    document
        .querySelector('[data-tile="todo"]')
        ?.addEventListener("click", reloadTodos);

    document.addEventListener("dock:todos-changed", reloadTodos);
}

function renderList(listElement, todos, type, reloadTodos) {
    listElement.innerHTML = "";

    todos.forEach(todo => {
        const li = document.createElement("li");

        const textElement = document.createElement("span");
        textElement.textContent = todo.text;
        textElement.className = "todo-text";
        li.appendChild(textElement);

        const actions = document.createElement("div");
        actions.className = "todo-actions";

        const targetType = type === "a" ? "b" : "a";
        const moveButton = document.createElement("button");
        moveButton.type = "button";
        moveButton.textContent = type === "a" ? "↓" : "↑";
        moveButton.className = "todo-move";
        moveButton.setAttribute(
            "aria-label",
            type === "a" ? "Zu Später verschieben" : "Zu Wichtig verschieben"
        );
        moveButton.title =
            type === "a" ? "Zu Später verschieben" : "Zu Wichtig verschieben";

        moveButton.addEventListener("click", async () => {
            moveButton.disabled = true;

            try {
                await updateTodoPriority(todo.id, targetType);
                document.dispatchEvent(new CustomEvent("dock:todos-changed"));
            } catch (error) {
                console.error("To-Do konnte nicht verschoben werden:", error);
                moveButton.disabled = false;
            }
        });

        if (todo.routine_task_id) {
            const source = document.createElement("small");
            source.className = "todo-routine-source";
            source.textContent = `Routine · KW ${todo.routine_week}/${todo.routine_year}`;
            textElement.appendChild(source);
        }

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        const checkIcon = document.createElement("span");
        checkIcon.className = "todo-check-icon";
        checkIcon.setAttribute("aria-hidden", "true");
        deleteButton.appendChild(checkIcon);
        deleteButton.className = "todo-delete";
        deleteButton.setAttribute("aria-label", "Aufgabe erledigen");

        deleteButton.addEventListener("click", async () => {
            deleteButton.disabled = true;

            try {
                await completeTodo(todo.id);
                document.dispatchEvent(new CustomEvent("dock:todos-changed"));
            } catch (error) {
                console.error("To-Do konnte nicht gelöscht werden:", error);
                deleteButton.disabled = false;
            }
        });

        actions.append(moveButton, deleteButton);
        li.appendChild(actions);
        listElement.appendChild(li);
    });
}
