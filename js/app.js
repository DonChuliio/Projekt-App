// js/app.js

import { initDashboard } from "./dashboard.js";
import { initNotes } from "./notes/notes.js?v=1.04";
import { initCalendar } from "./calendar/calendar.js?v=1.04";
import { showView, goToDashboard } from "./router.js";
import { initTodo } from "./todo/todo.js?v=1.04";
import { initPacklists } from "./packlists/packlists.js?v=1.04";
import { initPacklistEditor } from "./packlists/packlist-editor.js?v=1.04";
import { initPacklistRun } from "./packlists/packlist-run.js?v=1.04";
import { initWatertest } from "./watertest/watertest.js?v=1.04";
import { initPush } from "./push/push.js?v=1.04";
import { initAuth } from "./auth/auth-view.js";
/*
 Einstiegspunkt der App.
 Wird ausgeführt, sobald das DOM vollständig geladen ist.
*/
document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ app.js geladen");

// Versionsnummer direkt aus der URL von app.js lesen.
// Beispiel: js/app.js?v=1.04 → Version 0.36

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

    // Home-Button neben jedem Zurück-Button ergänzen.
    document.querySelectorAll(".back-button").forEach((backButton) => {
        const homeButton = document.createElement("button");
        homeButton.type = "button";
        homeButton.className = "home-button";
        homeButton.textContent = "Home";

        homeButton.addEventListener("click", () => {
            goToDashboard();
        });

        backButton.insertAdjacentElement("afterend", homeButton);
    });

    // Startansicht
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
