// js/app.js

import { initDashboard } from "./dashboard.js";
import { initNotes } from "./notes/notes.js";
import { initCalendar } from "./calendar/calendar.js";
import { showView } from "./router.js";

// Sofortiger Beweis, dass app.js überhaupt geladen wurde
console.log("✅ app.js geladen");

// Wartet, bis das DOM da ist
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ DOMContentLoaded");

  // Jedes Modul einzeln schützen, damit ein Fehler nicht alles killt
  try {
    initDashboard();
    console.log("✅ Dashboard init ok");
  } catch (e) {
    console.error("❌ Dashboard init FEHLER:", e);
  }

  try {
    initNotes();
    console.log("✅ Notes init ok");
  } catch (e) {
    console.error("❌ Notes init FEHLER:", e);
  }

  try {
    initCalendar();
    console.log("✅ Calendar init ok");
  } catch (e) {
    console.error("❌ Calendar init FEHLER:", e);
  }

  // Startansicht
  try {
    showView("dashboard");
    console.log("✅ View dashboard angezeigt");
  } catch (e) {
    console.error("❌ showView FEHLER:", e);
  }
});
