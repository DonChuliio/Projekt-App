// js/app.js

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
