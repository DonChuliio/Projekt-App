// js/app.js

import { initDashboard } from "./dashboard.js";
import { initNotes } from "./notes/notes.js";
import { initCalendar } from "./calendar/calendar.js";
import { showView, goToDashboard } from "./router.js";
import { initTodo } from "./todo/todo.js";
import { initBackup } from "./backup/backup.js";
import { initPacklists } from "./packlists/packlists.js";
import { initPacklistEditor } from "./packlists/packlist-editor.js";
import { initPacklistRun } from "./packlists/packlist-run.js";

// Wassertest-Modul
import { initWatertest } from "./watertest/watertest.js";


/*
 Einstiegspunkt der App.
 Wird ausgeführt, sobald das DOM vollständig geladen ist.
*/
document.addEventListener("DOMContentLoaded", () => {

    console.log("✅ app.js geladen");


    /* ==================================================
       VERSION
       ================================================== */

    // Versionsnummer direkt aus der URL von app.js lesen.
    // Beispiel:
    // js/app.js?v=0.38
    // → Version 0.38

    const appScript =
        document.getElementById("app-script");

    const scriptUrl =
        new URL(appScript.src);

    const APP_VERSION =
        scriptUrl.searchParams.get("v");

    const versionEl =
        document.getElementById("app-version");

    if (versionEl) {
        versionEl.textContent =
            `v${APP_VERSION}`;
    }


    /* ==================================================
       FEATURE-MODULE INITIALISIEREN
       ================================================== */

    initDashboard();

    initTodo();

    initBackup();

    initNotes();

    initCalendar();

    initPacklists();

    initPacklistEditor();

    initPacklistRun();

    // Wassertest initialisieren
    initWatertest();


    /* ==================================================
       ZENTRALE ZURÜCK-BUTTONS
       ================================================== */

    document
        .querySelectorAll("[data-back]")
        .forEach((button) => {

            button.addEventListener(
                "click",
                () => {

                    goToDashboard();

                }
            );

        });


    /* ==================================================
       STARTANSICHT
       ================================================== */

    showView("dashboard");

});
