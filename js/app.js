import { initNavigation } from './navigation.js?v=1.66';
import { initDocuments } from "./documents/documents.js?v=1.66";
// js/app.js
import { initPushRouting } from "./push/push-routing.js?v=1.60";
import { initRoutineTodos } from "./data/routine-todos-data.js?v=1.59";

import { initMorning } from "./morning/morning.js?v=1.59";

import { initDashboard } from "./dashboard.js?v=1.54";
import { initNotes } from "./notes/notes.js?v=1.54";
import { initCalendar } from "./calendar/calendar.js?v=1.59";
import { showView } from "./router.js";
import { initTodo } from "./todo/todo.js?v=1.59";
import { initPacklists } from "./packlists/packlists.js?v=1.54";
import { initPacklistEditor } from "./packlists/packlist-editor.js?v=1.54";
import { initPacklistRun } from "./packlists/packlist-run.js?v=1.54";
import { initWatertest } from "./watertest/watertest.js?v=1.54";
import { initPush } from "./push/push.js?v=1.54";
import { initAuth } from "./auth/auth-view.js?v=1.61";
import { initPlannerTexts } from "./planner-texts/planner-texts.js?v=1.54";
import { initHouseCalculator } from "./finances/house-calculator.js?v=1.54";
import { initSavingsCalculator } from "./finances/savings-calculator.js?v=1.54";
import { initRecurringTransactions } from "./finances/recurring-transactions.js?v=1.54";
import { initPocketMoney } from "./finances/pocket-money.js?v=1.54";
import { initExpensesOverview } from "./finances/expenses-overview.js?v=1.60";
import { initRecipes } from "./recipes/recipes.js?v=1.56";
/*
 Einstiegspunkt der App.
 Wird ausgeführt, sobald das DOM vollständig geladen ist.
*/
document.addEventListener("DOMContentLoaded", () => {
    console.log("app.js geladen");

// Versionsnummer direkt aus der URL von app.js lesen.
// Beispiel: js/app.js?v=1.54 → Version 0.36

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
initExpensesOverview();
initRecipes();
initDocuments();

    initNavigation();

    // Startansicht
    showView("dashboard");
    initRoutineTodos();
    initPushRouting();
    initMorning();
});
