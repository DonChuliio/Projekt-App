// js/packlists/packlists.js

import { showView } from "../router.js";
import { initPacklistEditor } from "./packlist-editor.js";
import { initPacklistRun } from "./packlist-run.js";

const STORAGE_KEY = "packlists";

/* ---------- Storage ---------- */

function loadPacklists() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

function savePacklists(packlists) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(packlists));
}

/* ---------- Titel ---------- */

function setRunTitle(name) {
    const el = document.getElementById("packlist-run-title");
    if (el) el.textContent = `📦 ${name}`;
}

function setEditTitle(name) {
    const el = document.getElementById("packlist-edit-title");
    if (el) el.textContent = `✏️ ${name}`;
}

/* ---------- Render ---------- */

function renderPacklists() {
    const listEl = document.getElementById("packlists-list");
    if (!listEl) return;

    listEl.innerHTML = "";
    const packlists = loadPacklists();

    packlists.forEach(pl => {
        const li = document.createElement("li");
        li.textContent = pl.name;

        li.addEventListener("click", () => {
            const choice = prompt(
                `Packliste: ${pl.name}\n\n` +
                `1 = Fortsetzen\n` +
                `2 = Neu\n` +
                `3 = Bearbeiten`
            );

            if (choice === "1") {
                localStorage.setItem("active-packlist-id", pl.id);
                localStorage.setItem("packlist-run-mode", "continue");
                setRunTitle(pl.name);
                showView("packlist-run");
                initPacklistRun();
            }

            if (choice === "2") {
                localStorage.setItem("active-packlist-id", pl.id);
                localStorage.setItem("packlist-run-mode", "new");
                setRunTitle(pl.name);
                showView("packlist-run");
                initPacklistRun();
            }

            if (choice === "3") {
                localStorage.setItem("active-packlist-id", pl.id);
                setEditTitle(pl.name);
                showView("packlist-edit");
                initPacklistEditor();
            }
        });

        listEl.appendChild(li);
    });
}

/* ---------- Init ---------- */

export function initPacklists() {
    console.log("🟢 initPacklists() wurde aufgerufen");

    const createBtn = document.getElementById("create-packlist");
    if (!createBtn) {
        console.error("❌ create-packlist Button nicht gefunden");
        return;
    }

    createBtn.addEventListener("click", () => {
        const name = prompt("Name der Packliste:");
        if (!name) return;

        const packlists = loadPacklists();
        packlists.push({
            id: Date.now().toString(),
            name
        });

        savePacklists(packlists);
        renderPacklists();
    });

    renderPacklists();
}
