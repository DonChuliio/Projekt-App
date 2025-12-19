// js/app.js
const BACKUP_TIME_KEY = "backup-last-time";

function getLastBackupTime() {
    const value = localStorage.getItem(BACKUP_TIME_KEY);
    return value ? Number(value) : null;
}

function setLastBackupTime() {
    localStorage.setItem(BACKUP_TIME_KEY, Date.now());
}

function formatTimestamp(ts) {
    return new Date(ts).toLocaleString("de-DE");
}
const backupStatus = document.getElementById("backup-status");
const exportBtn = document.getElementById("backup-export");
const importBtn = document.getElementById("backup-import");

function updateBackupStatus() {
    const last = getLastBackupTime();
    backupStatus.textContent = last
        ? `Letztes Backup: ${formatTimestamp(last)}`
        : "Letztes Backup: nie";
}

updateBackupStatus();
exportBtn.addEventListener("click", () => {

    const data = {};

    // gesamten localStorage sichern
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        data[key] = localStorage.getItem(key);
    }

    const blob = new Blob(
        [JSON.stringify(data, null, 2)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();

    URL.revokeObjectURL(url);

    setLastBackupTime();
    updateBackupStatus();
});
importBtn.addEventListener("click", () => {

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";

    input.addEventListener("change", () => {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = () => {
            const data = JSON.parse(reader.result);

            localStorage.clear();

            Object.entries(data).forEach(([key, value]) => {
                localStorage.setItem(key, value);
            });

            setLastBackupTime();
            location.reload();
        };

        reader.readAsText(file);
    });

    input.click();
});
const DAY = 24 * 60 * 60 * 1000;
const last = getLastBackupTime();

if (!last || Date.now() - last > DAY) {
    alert("Hinweis: Dein letztes Backup ist älter als 24 Stunden.");
}

import { initDashboard } from "./dashboard.js";
import { initNotes } from "./notes/notes.js";
import { initCalendar } from "./calendar/calendar.js";
import { showView, goToDashboard } from "./router.js";
import { initTodo } from "./todo/todo.js";


/*
 Einstiegspunkt der App.
 Wird ausgeführt, sobald das DOM vollständig geladen ist.
*/
document.addEventListener("DOMContentLoaded", () => {

    // Debug-Hinweis: zeigt, dass app.js geladen wurde
    console.log("✅ app.js geladen");

    // Dashboard initialisieren
    initDashboard();

     // to-do initialisieren
    initTodo();

    // Notizen initialisieren
    initNotes();

    // Kalender initialisieren
    initCalendar();

    // Zentrale Zurück-Buttons verbinden
    document.querySelectorAll("[data-back]").forEach(button => {
        button.addEventListener("click", () => {
            goToDashboard();
        });
    });

    // Startansicht: Dashboard
    showView("dashboard");
});
