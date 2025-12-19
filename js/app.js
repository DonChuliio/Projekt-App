// js/app.js

import { initDashboard } from "./dashboard.js";
import { initNotes } from "./notes/notes.js";
import { initCalendar } from "./calendar/calendar.js";
import { showView, goToDashboard } from "./router.js";
import { initTodo } from "./todo/todo.js";
import { initBackup } from "./backup/backup.js";

// ✅ EINZIGE Quelle der Wahrheit für die UI-Version
const APP_VERSION = 17;

/*
 Einstiegspunkt der App.
 Wird ausgeführt, sobald das DOM vollständig geladen ist.
*/
document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ app.js geladen");

    // ✅ Versionsanzeige setzen
    const versionEl = document.getElementById("app-version");
    if (versionEl) {
        versionEl.textContent = `v${APP_VERSION}`;
    }

    // ✅ Feature-Module initialisieren
    initDashboard();
    initTodo();
    initBackup();
    initNotes();
    initCalendar();

    // ✅ Zentrale Zurück-Buttons verbinden
    document.querySelectorAll("[data-back]").forEach((button) => {
        button.addEventListener("click", () => {
            goToDashboard();
        });
    });

    // ✅ Startansicht
    showView("dashboard");
});
