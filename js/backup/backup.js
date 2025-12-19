// js/backup/backup.js

// Key, unter dem wir speichern, wann das letzte Backup erstellt wurde
const BACKUP_TIME_KEY = "backup-last-time";

// 24 Stunden in Millisekunden (für Reminder-Logik)
const DAY_MS = 24 * 60 * 60 * 1000;

/*
 Initialisiert die Backup-Seite:
 - zeigt "letztes Backup"
 - Export-Button
 - Import-Button
 - optional: Reminder, wenn >24h her
*/
export function initBackup() {

    // Elemente aus der Backup-View holen
    const statusEl = document.getElementById("backup-status");
    const exportBtn = document.getElementById("backup-export");
    const importBtn = document.getElementById("backup-import");

    // Sicherheitscheck: wenn die View/Buttons fehlen, abbrechen (sonst JS-Fehler)
    if (!statusEl || !exportBtn || !importBtn) {
        console.error("❌ Backup-UI nicht gefunden. Prüfe IDs in index.html.");
        return;
    }

    // Statusanzeige beim Start aktualisieren
    updateBackupStatus(statusEl);

    // Export-Button: vollständigen localStorage als JSON-Datei herunterladen
    exportBtn.addEventListener("click", () => {
        exportBackup(statusEl);
    });

    // Import-Button: JSON auswählen und localStorage wiederherstellen
    importBtn.addEventListener("click", () => {
        importBackup();
    });

    // Beim Start prüfen, ob letztes Backup älter als 24h ist → Hinweis anzeigen
    showBackupReminderIfNeeded(() => exportBackup(statusEl));
}

/* Liest den Zeitstempel des letzten Backups (oder null, falls nie) */
function getLastBackupTime() {
    const raw = localStorage.getItem(BACKUP_TIME_KEY);
    return raw ? Number(raw) : null;
}

/* Speichert "jetzt" als Zeitpunkt des letzten Backups */
function setLastBackupTimeNow() {
    localStorage.setItem(BACKUP_TIME_KEY, String(Date.now()));
}

/* Formatiert Zeitstempel lesbar (de-DE) */
function formatTimestamp(ts) {
    return new Date(ts).toLocaleString("de-DE");
}

/* Aktualisiert den Text "Letztes Backup: ..." */
function updateBackupStatus(statusEl) {
    const last = getLastBackupTime();

    statusEl.textContent = last
        ? `Letztes Backup: ${formatTimestamp(last)}`
        : "Letztes Backup: nie";
}

/* Exportiert localStorage in eine JSON-Datei */
function exportBackup(statusEl) {

    // Objekt, das alle localStorage-Einträge enthalten wird
    const data = {};

    // Alle Keys aus localStorage lesen und in unser Objekt kopieren
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        data[key] = localStorage.getItem(key);
    }

    // JSON-Text erzeugen (mit Einrückung für bessere Lesbarkeit)
    const jsonText = JSON.stringify(data, null, 2);

    // Blob = Dateiinhalts-Container, der heruntergeladen werden kann
    const blob = new Blob([jsonText], { type: "application/json" });

    // Temporäre URL für den Blob erstellen
    const url = URL.createObjectURL(blob);

    // Unsichtbaren Download-Link bauen und "klicken"
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();

    // URL wieder freigeben (Aufräumen)
    URL.revokeObjectURL(url);

    // Backup-Zeit speichern + Anzeige aktualisieren
    setLastBackupTimeNow();
    updateBackupStatus(statusEl);
}

/* Importiert eine JSON-Datei und schreibt alles in localStorage zurück */
function importBackup() {

    // Datei-Input dynamisch erstellen (damit du keinen im HTML brauchst)
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";

    // Wenn der Nutzer eine Datei gewählt hat:
    input.addEventListener("change", () => {
        const file = input.files?.[0];
        if (!file) return;

        const reader = new FileReader();

        // Wenn Datei gelesen wurde:
        reader.onload = () => {
            try {
                const data = JSON.parse(String(reader.result));

                // Sicherheitscheck: data muss ein Objekt sein
                if (typeof data !== "object" || data === null) {
                    alert("Ungültiges Backup-Format.");
                    return;
                }

                // Bestehende Daten löschen (Import = Restore-Zeitpunkt)
                localStorage.clear();

                // Alle Einträge wiederherstellen
                Object.entries(data).forEach(([key, value]) => {
                    localStorage.setItem(key, String(value));
                });

                // Nach Import "jetzt" als Backupzeit setzen
                setLastBackupTimeNow();

                // Seite neu laden, damit alle Features frisch aus Storage laden
                location.reload();

            } catch (e) {
                console.error("❌ Backup-Import fehlgeschlagen:", e);
                alert("Import fehlgeschlagen. Datei ist kein gültiges JSON-Backup.");
            }
        };

        // Datei als Text lesen
        reader.readAsText(file);
    });

    // Dateiauswahl öffnen
    input.click();
}

/*
 Zeigt beim Öffnen der Website einen Hinweis, wenn
 - noch nie ein Backup gemacht wurde, oder
 - letztes Backup älter als 24h ist
 In der Meldung gibt es einen Button, der den Export auslöst.
*/
function showBackupReminderIfNeeded(onBackupNow) {
    const last = getLastBackupTime();

    // Bedingung: nie oder zu alt
    const needsBackup = !last || (Date.now() - last > DAY_MS);

    if (!needsBackup) return;

    // Simple Variante: confirm() mit OK/Abbrechen
    // (Später können wir daraus ein schönes Modal im Dark-Style machen)
    const doNow = confirm("Dein letztes Backup ist älter als 24h (oder fehlt). Jetzt Backup erstellen?");

    if (doNow) {
        onBackupNow();
    }
}

