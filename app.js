// Importiert die Initialisierungsfunktion für das Dashboard
import { initDashboard } from "./dashboard.js";

// Importiert die Initialisierungsfunktion für die Notizen
import { initNotes } from "./notes/notes.js";

// Importiert die Initialisierungsfunktion für den Kalender
import { initCalendar } from "./calendar/calendar.js";

// Importiert die Router-Funktion zum Anzeigen von Views
import { showView } from "./router.js";

/*
 Wird ausgeführt, sobald das HTML-Dokument vollständig geladen ist.
 Das ist wichtig, damit alle DOM-Elemente existieren,
 bevor wir sie per JavaScript ansprechen.
*/
document.addEventListener("DOMContentLoaded", () => {

    // Initialisiert das Dashboard (Kacheln, Klick-Events)
    initDashboard();

    // Initialisiert die Notizen-Funktionalität
    initNotes();

    // Initialisiert den Kalender
    initCalendar();

    // Zeigt beim Start immer das Dashboard an
    showView("dashboard");
});
