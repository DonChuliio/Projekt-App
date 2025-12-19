import { showView } from "./router.js";

export function initDashboard() {
  const notesTile = document.querySelector("[data-tile='notes']");
  const calTile = document.querySelector("[data-tile='calendar']");

  if (!notesTile || !calTile) {
    console.error("Dashboard: Kacheln nicht gefunden. Prüfe data-tile im HTML.", {
      notesTileFound: !!notesTile,
      calendarTileFound: !!calTile,
    });
    return;
  }

  notesTile.addEventListener("click", () => showView("notes"));
  calTile.addEventListener("click", () => showView("calendar"));

  console.log("Dashboard initialisiert ✅");
}
