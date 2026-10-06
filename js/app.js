// js/app.js

import { initDashboard } from "./dashboard.js";
import { initNotes } from "./notes/notes.js?v=1.23";
import { initCalendar } from "./calendar/calendar.js?v=1.23";
import { showView, goToDashboard } from "./router.js";
import { initTodo } from "./todo/todo.js?v=1.23";
import { initPacklists } from "./packlists/packlists.js?v=1.23";
import { initPacklistEditor } from "./packlists/packlist-editor.js?v=1.23";
import { initPacklistRun } from "./packlists/packlist-run.js?v=1.23";
import { initWatertest } from "./watertest/watertest.js?v=1.23";
import { initPush } from "./push/push.js?v=1.23";
import { initAuth } from "./auth/auth-view.js";
import { initPlannerTexts } from "./planner-texts/planner-texts.js?v=1.23";
import { initHouseCalculator } from "./finances/house-calculator.js?v=1.23";
import { initSavingsCalculator } from "./finances/savings-calculator.js?v=1.23";
import { initRecurringTransactions } from "./finances/recurring-transactions.js?v=1.23";
import { initPocketMoney } from "./finances/pocket-money.js?v=1.23";
/*
 Einstiegspunkt der App.
 Wird ausgeführt, sobald das DOM vollständig geladen ist.
*/
document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ app.js geladen");

// Versionsnummer direkt aus der URL von app.js lesen.
// Beispiel: js/app.js?v=1.23 → Version 0.36

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
initPlannerTexts();
initHouseCalculator();
initSavingsCalculator();
initRecurringTransactions();
initPocketMoney();

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
