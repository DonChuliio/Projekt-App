// js/packlists/packlists.js

import { showView } from "../router.js";

/*
 Schlüssel im localStorage, unter dem alle Packlisten gespeichert werden
*/
const STORAGE_KEY = "packlists";

/*
 Lädt alle Packlisten aus dem localStorage.
 Gibt immer ein Array zurück.
*/
function loadPacklists() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

/*
 Speichert das komplette Packlisten-Array im localStorage
*/
function savePacklists(packlists) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(packlists));
}

/*
 Setzt den Titel für den "Packen"-View
*/
function setRunTitle(name) {
    const el = document.getElementById("packlist-run-title");
    if (el) {
        el.textContent = `📦 ${name}`;
    }
}

/*
 Setzt den Titel für den "Bearbeiten"-View
*/
function setEditTitle(name) {
    const el = document.getElementById("packlist-edit-title");
    if (el) {
        el.textContent = `✏️ ${name}`;
    }
}

/*
 Rendert die Übersicht aller Packlisten
*/
function renderPacklists() {
    const listEl = document.getElementById("packlists-list");
    if (!listEl) return;

    listEl.innerHTML = "";

    const packlists = loadPacklists();

    packlists.forEach((pl) => {
        const li = document.createElement("li");
        li.textContent = pl.name;

        // Klick auf eine Packliste → Auswahl-Dialog
        li.addEventListener("click", () => {
            const choice = prompt(
                `Packliste: ${pl.name}\n\n` +
                `Tippe:\n` +
                `1 = Fortsetzen\n` +
                `2 = Neu\n` +
                `3 = Bearbeiten`
            );

            // Fortsetzen
            if (choice === "1") {
                localStorage.setItem("active-packlist-id", pl.id);
                localStorage.setItem("packlist-run-mode", "continue");

                setRunTitle(pl.name);
                showView("packlist-run");
            }

            // Neu starten
            if (choice === "2") {
                localStorage.setItem("active-packlist-id", pl.id);
                localStorage.setItem("packlist-run-mode", "new");

                setRunTitle(pl.name);
                showView("packlist-run");
            }

            // Bearbeiten
// Bearbeiten
if (choice === "3") {
    localStorage.setItem("active-packlist-id", pl.id);

    setEditTitle(pl.name);
    showView("packlist-edit");

    // 🔑 FEHLENDER AUFRUF
    initPacklistEditor();
}

        });

        listEl.appendChild(li);
    });
}

/*
 Initialisierung der Packlisten-Funktion
*/
export function initPacklists() {
    console.log("🟢 initPacklists() wurde aufgerufen");

    const createBtn = document.getElementById("create-packlist");
    if (!createBtn) {
        console.error("❌ create-packlist Button nicht gefunden");
        return;
    }

    // Neue Packliste anlegen
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

    // Beim Laden direkt anzeigen
    renderPacklists();
}
