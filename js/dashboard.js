// js/dashboard.js

import { showView } from "./router.js";

/*
 Initialisiert das Dashboard.
 Verbindet Kacheln mit Views.
*/
export function initDashboard() {

    const notesTile = document.querySelector("[data-tile='notes']");
    const calendarTile = document.querySelector("[data-tile='calendar']");

    if (!notesTile || !calendarTile) {
        console.error("❌ Dashboard-Kacheln nicht gefunden. Prüfe data-tile Attribute.");
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
}
