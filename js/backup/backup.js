// js/backup/backup.js


// Key, unter dem gespeichert wird,
// wann das letzte Backup erstellt wurde.
const BACKUP_TIME_KEY = "backup-last-time";


/* =========================================================
   BACKUP INITIALISIEREN
   ========================================================= */

export function initBackup() {

    // Elemente aus der Backup-View holen.
    const statusEl =
        document.getElementById("backup-status");

    const exportBtn =
        document.getElementById("backup-export");

    const importBtn =
        document.getElementById("backup-import");


    // Sicherheitscheck.
    if (!statusEl || !exportBtn || !importBtn) {

        console.error(
            "Backup-UI nicht gefunden. Prüfe IDs in index.html."
        );

        return;
    }


    // Statusanzeige aktualisieren.
    updateBackupStatus(statusEl);


    // Export-Button.
    exportBtn.addEventListener("click", () => {

        exportBackup(statusEl);

    });


    // Import-Button.
    importBtn.addEventListener("click", () => {

        importBackup();

    });
}


/* =========================================================
   LETZTES BACKUP
   ========================================================= */

function getLastBackupTime() {

    const raw =
        localStorage.getItem(BACKUP_TIME_KEY);

    return raw ? Number(raw) : null;
}


function setLastBackupTimeNow() {

    localStorage.setItem(
        BACKUP_TIME_KEY,
        String(Date.now())
    );
}


function formatTimestamp(ts) {

    return new Date(ts).toLocaleString(
        "de-DE"
    );
}


function updateBackupStatus(statusEl) {

    const last =
        getLastBackupTime();


    statusEl.textContent = last
        ? `Letztes Backup: ${formatTimestamp(last)}`
        : "Letztes Backup: nie";
}


/* =========================================================
   BACKUP EXPORTIEREN
   ========================================================= */

function exportBackup(statusEl) {

    const data = {};


    // Alle localStorage-Einträge übernehmen.
    for (
        let i = 0;
        i < localStorage.length;
        i++
    ) {

        const key =
            localStorage.key(i);

        data[key] =
            localStorage.getItem(key);
    }


    // JSON erzeugen.
    const jsonText =
        JSON.stringify(
            data,
            null,
            2
        );


    // Download-Datei erzeugen.
    const blob =
        new Blob(
            [jsonText],
            {
                type: "application/json"
            }
        );


    const url =
        URL.createObjectURL(blob);


    const a =
        document.createElement("a");


    a.href = url;

    a.download =
        `backup-${new Date()
            .toISOString()
            .slice(0, 10)}.json`;


    a.click();


    // Temporäre URL wieder entfernen.
    URL.revokeObjectURL(url);


    // Zeitpunkt des Backups speichern.
    setLastBackupTimeNow();

    updateBackupStatus(statusEl);
}


/* =========================================================
   BACKUP IMPORTIEREN
   ========================================================= */

function importBackup() {

    const input =
        document.createElement("input");


    input.type = "file";

    input.accept =
        "application/json";


    input.addEventListener(
        "change",
        () => {

            const file =
                input.files?.[0];


            if (!file) {
                return;
            }


            const reader =
                new FileReader();


            reader.onload = () => {

                try {

                    const data =
                        JSON.parse(
                            String(
                                reader.result
                            )
                        );


                    // Sicherheitscheck.
                    if (
                        typeof data !== "object" ||
                        data === null
                    ) {

                        alert(
                            "Ungültiges Backup-Format."
                        );

                        return;
                    }


                    // Bestehende Daten löschen.
                    localStorage.clear();


                    // Backup wiederherstellen.
                    Object.entries(data)
                        .forEach(
                            ([key, value]) => {

                                localStorage.setItem(
                                    key,
                                    String(value)
                                );

                            }
                        );


                    // Import zählt als aktueller Backup-Zeitpunkt.
                    setLastBackupTimeNow();


                    // App neu laden.
                    location.reload();


                } catch (error) {

                    console.error(
                        "Backup-Import fehlgeschlagen:",
                        error
                    );


                    alert(
                        "Import fehlgeschlagen. Datei ist kein gültiges JSON-Backup."
                    );
                }
            };


            reader.readAsText(file);
        }
    );


    input.click();
}
