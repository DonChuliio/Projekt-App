const APP_VERSION = 17;




import { initDashboard } from "./dashboard.js";
import { initNotes } from "./notes/notes.js";
import { initCalendar } from "./calendar/calendar.js";
import { showView, goToDashboard } from "./router.js";
import { initTodo } from "./todo/todo.js";
import { initBackup } from "./backup/backup.js";


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
    initBackup();

    // Notizen initialisieren
    initNotes();

    // Kalender initialisieren
    initCalendar();

    const versionEl = document.getElementById("app-version");
    if (versionEl) {
        versionEl.textContent = `v${APP_VERSION}`;
    }

    // … deine restlichen init-Aufrufe
});

    // Zentrale Zurück-Buttons verbinden
    document.querySelectorAll("[data-back]").forEach(button => {
        button.addEventListener("click", () => {
            goToDashboard();
        });
    });

    // Startansicht: Dashboard
    showView("dashboard");
});
