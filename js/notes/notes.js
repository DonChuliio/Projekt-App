// Importiert Speicherfunktionen
import { save, load } from "../storage.js";

/*
 Initialisiert die Notizen-Funktion.
 Wird beim App-Start aufgerufen.
*/
export function initNotes() {

    // Textfeld für die Notiz holen
    const textarea = document.getElementById("note");

    // Speicher-Button holen
    const saveButton = document.getElementById("saveBtn");

    // Gespeicherte Notiz laden und anzeigen
    textarea.value = load("main-note", "");

    // Klick-Event für den Speichern-Button
    saveButton.addEventListener("click", () => {

        // Inhalt des Textfeldes speichern
        save("main-note", textarea.value);

        // Kurzes Feedback für den Nutzer
        alert("Notiz gespeichert");
    });
}
