// js/notes/notes.js

import {
    loadNote,
    saveNote
} from "../data/notes-data.js?v=0.96";

export function initNotes() {
    const textarea = document.getElementById("note");
    const notesTile = document.querySelector('[data-tile="general-note"]');

    if (!textarea) return;

    let saveTimer = null;
    let loading = false;

    async function refreshNote() {
        if (loading) return;
        loading = true;

        try {
            const note = await loadNote();
            textarea.value = note?.content || "";
        } catch (error) {
            // Beim App-Start kann noch keine Anmeldung vorhanden sein.
            console.log("Notiz noch nicht geladen:", error.message);
        } finally {
            loading = false;
        }
    }

    // Beim Öffnen erneut laden, damit Änderungen von einem anderen Gerät erscheinen.
    notesTile?.addEventListener("click", refreshNote);

    textarea.addEventListener("input", () => {
        clearTimeout(saveTimer);

        // Erst speichern, wenn kurz nicht mehr getippt wurde.
        saveTimer = setTimeout(async () => {
            try {
                await saveNote(textarea.value);
            } catch (error) {
                console.error("Notiz konnte nicht automatisch gespeichert werden:", error);
            }
        }, 700);
    });

    refreshNote();
}
