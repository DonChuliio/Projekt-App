// js/todo/todo.js

import { loadTodos, addTodo, deleteTodo } from "../data/todo-data.js?v=1.35";

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
            todos = await loadTodos(type);
            renderList(list, todos, reloadTodos);
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
            await reloadTodos();

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
}

function renderList(listElement, todos, reloadTodos) {
    listElement.innerHTML = "";

    todos.forEach(todo => {
        const li = document.createElement("li");

        const textElement = document.createElement("span");
        textElement.textContent = todo.text;
        textElement.className = "todo-text";
        li.appendChild(textElement);

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "×";
        deleteButton.className = "todo-delete";
        deleteButton.setAttribute("aria-label", "Aufgabe löschen");

        deleteButton.addEventListener("click", async () => {
            deleteButton.disabled = true;

            try {
                await deleteTodo(todo.id);
                await reloadTodos();
            } catch (error) {
                console.error("To-Do konnte nicht gelöscht werden:", error);
                deleteButton.disabled = false;
            }
        });

        li.appendChild(deleteButton);
        listElement.appendChild(li);
    });
}
