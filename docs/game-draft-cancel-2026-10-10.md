# Spielentwürfe abbrechen · v1.99 · 2026-10-10

## Befund und Korrektur
Bei Imposter, Promi und Rotes Sieb führte Abbrechen zuvor nur zurück; der bereits gespeicherte Entwurf blieb vorhanden. Bei Imposter prüfte ein bestehender Test ausdrücklich dieses alte Verhalten.

Alle drei Erstellseiten verwenden jetzt ihre bestehende authentifizierte Löschfunktion. Abbrechen ist nur für einen angezeigten Entwurf möglich. Nach erfolgreicher Löschung werden lokale Auswahl/Ansicht geleert und die Spielübersicht neu geladen. Kein Bestätigungsdialog. Bei einem Fehler bleiben Entwurf und Erstellseite erhalten; Fehlermeldung und erneutes Abbrechen sind möglich. Die vorhandene Busy-Sperre verhindert doppelte Löschanfragen.

Zurück und Home bleiben Navigation und löschen nicht automatisch. Spielstart sowie Löschen/Beenden bestehender Spiele bleiben unverändert. Keine Datenbankmigration oder Änderung der Auth-/Zugriffsregeln; keine realen Benutzerentwürfe zu Testzwecken gelöscht.

## Tests
Alle 27 lokalen Testsuites erfolgreich. Für jedes der drei Spiele ergänzt/geprüft:
- Entwurf erstellen; bei Promi/Rotes Sieb zusätzlich Spieler hinzufügen.
- Zurück lässt den Entwurf erhalten; Entwurf erneut öffnen.
- Löschfehler beim Abbrechen: Entwurf/Spieler erhalten, Fehlermeldung sichtbar.
- Erfolgreiches Abbrechen: Löschaufruf, Rückkehr zur Übersicht, kein verbliebener Entwurf.
- Zweifaches Klicken erzeugt genau eine Löschanfrage.
- Bestehende Start-/Auswertungs-/Archiv-/Navigationstests weiterhin erfolgreich.

Grenze: DOM-/API-Mocks; kein neuer Live-Löschtest auf Supabase und kein physischer iPhone-Test. Bereits gestartete Alt-Entwürfe werden nicht pauschal bereinigt.
