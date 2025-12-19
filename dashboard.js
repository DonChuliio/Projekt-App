// Importiert die Router-Funktion
import { showView } from "./router.js";

/*
 Initialisiert das Dashboard.
 Wird einmal beim App-Start aufgerufen.
*/
export function initDashboard() {

    // Kachel "Notizen" anklicken → Notizen-View anzeigen
    document
        .querySelector("[data-tile='notes']")
        .addEventListener("click", () => {
            showView("notes");
        });

    // Kachel "Kalender" anklicken → Kalender-View anzeigen
    document
        .querySelector("[data-tile='calendar']")
        .addEventListener("click", () => {
            showView("calendar");
        });

    // 🔮 Neue Kacheln kommen hier einfach dazu
}
