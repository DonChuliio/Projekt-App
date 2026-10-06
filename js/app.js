// js/app.js

import { initDashboard } from "./dashboard.js";
import { initNotes } from "./notes/notes.js";
import { initCalendar } from "./calendar/calendar.js";
import { showView, goToDashboard } from "./router.js";
import { initTodo } from "./todo/todo.js?v=0.93";
import { initBackup } from "./backup/backup.js";
import { initPacklists } from "./packlists/packlists.js";
import { initPacklistEditor } from "./packlists/packlist-editor.js";
import { initPacklistRun } from "./packlists/packlist-run.js";
import { initWatertest } from "./watertest/watertest.js";
import { initPush } from "./push/push.js?v=0.68";
import { initAuth } from "./auth/auth-view.js";
/*
 Einstiegspunkt der App.
 Wird ausgeführt, sobald das DOM vollständig geladen ist.
*/
document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ app.js geladen");

// Versionsnummer direkt aus der URL von app.js lesen.
// Beispiel: js/app.js?v=0.36 → Version 0.36

const appScript = document.getElementById("app-script");
const scriptUrl = new URL(appScript.src);

const APP_VERSION = scriptUrl.searchParams.get("v");

const versionEl = document.getElementById("app-version");

if (versionEl) {
    versionEl.textContent = `v${APP_VERSION}`;
}

    initAuth();

    // Feature-Module initialisieren
    initDashboard();
    initTodo();
    initBackup();
    initNotes();
    initCalendar();
 initPacklists();
initPacklistEditor();
initPacklistRun();
initWatertest();
initPush();

    // ✅ Zentrale Zurück-Buttons verbinden
    document.querySelectorAll("[data-back]").forEach((button) => {
        button.addEventListener("click", () => {
            goToDashboard();
        });
    });

    // ✅ Startansicht
    showView("dashboard");
});
/*
 Neue Zurück-Navigation für
 verschachtelte Ansichten.

 Beispiel:
 Aquaristik -> Hobby -> Dashboard
*/
document
    .querySelectorAll("[data-view-back]")
    .forEach((button) => {

        button.addEventListener(
            "click",
            () => {

                const targetView =
                    button.dataset.viewBack;

                showView(targetView);
            }
        );
    });
