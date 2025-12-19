// js/dashboard.js

import { showView } from "./router.js";

/*
 Initialisiert das Dashboard.
 Verbindet alle Kacheln mit ihren Views.
*/
export function initDashboard() {

    // Alle Kacheln einsammeln
    const notesTile    = document.querySelector("[data-tile='notes']");
    const calendarTile = document.querySelector("[data-tile='calendar']");
    const todoTile     = document.querySelector("[data-tile='todo']");

    // Sicherheitscheck: alle benötigten Kacheln vorhanden?
    if (!notesTile || !calendarTile || !todoTile) {
        console.error("❌ Dashboard-Kacheln nicht gefunden. Prüfe data-tile Attribute.", {
            notes: !!notesTile,
            calendar: !!calendarTile,
            todo: !!todoTile
        });
        return;
    }

    // Kachel → Notizen
    notesTile.addEventListener("click", () => {
        console.log("🟦 Notizen-Kachel geklickt");
        showView("notes");
    });

    // Kachel → Kalender
    calendarTile.addEventListener("click", () => {
        console.log("🟦 Kalender-Kachel geklickt");
        showView("calendar");
    });

    // Kachel → To-Do
    todoTile.addEventListener("click", () => {
        console.log("🟦 To-Do-Kachel geklickt");
        showView("todo");
    });
}
