import { showView } from "./router.js";
export function initDashboard() {

    console.log("✅ initDashboard läuft");

    const notesTile    = document.querySelector("[data-tile='notes']");
    const calendarTile = document.querySelector("[data-tile='calendar']");
    const todoTile     = document.querySelector("[data-tile='todo']");
    const backupBtn = document.getElementById("open-backup");

    console.log("Dashboard Tiles gefunden:", {
        notes: !!notesTile,
        calendar: !!calendarTile,
        todo: !!todoTile
    });

    if (!notesTile || !calendarTile || !todoTile) {
        console.error("❌ Mindestens eine Dashboard-Kachel fehlt in DOM");
        return;
    }

    notesTile.addEventListener("click", () => {
        console.log("🟦 Notizen-Kachel geklickt");
        showView("notes");
    });

    calendarTile.addEventListener("click", () => {
        console.log("🟦 Kalender-Kachel geklickt");
        showView("calendar");
    });

    todoTile.addEventListener("click", () => {
        console.log("🟦 To-Do-Kachel geklickt");
        showView("todo");
    });
}
