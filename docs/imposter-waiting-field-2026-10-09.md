# Imposter: Wartefeld und Darstellung · v1.84

- Namenswahl ergänzt um Hinweis, den Link wegen der Speicherung nicht in einem privaten Tab zu öffnen. Kein Erkennen oder Blockieren privater Tabs.
- Abstand von 16px zwischen Namens-Dropdown und Bestätigung.
- Erfolg „Link kopiert“ in Petrol. Wiederverwendete Statusmeldung wechselt bei einem Fehler zurück zur Fehlerfarbe.
- Automatische-Aktualisierungs- und Neue-Runde-Hinweise außerhalb des Rollenfelds entfernt; notwendiger Hinweis nach zurückgesetzter Belegung bleibt erhalten.
- Nach bestätigter Namenswahl bleibt der Rahmen während der Wortwahl sichtbar. Darin steht ein Wartehinweis (bei der Rundenleitung eigene Eingabeaufforderung). Nach Freigabe ersetzt Auge/verborgene Rolle diesen Hinweis, und der Halteknopf erscheint. Steuerfläche reserviert ihren Platz, damit der Rahmen beim Freigeben stabil bleibt. Vor Namenswahl oder bei beendetem/ungültigem Link kein Rahmen.
- Doppelte Bezeichnung der Rundenleitung im aufgedeckten Feld entfernt. Obere Identitätsanzeige bleibt bestehen.
- Rolle, Wort, Hinweis und Imposter-Namen in gleicher Schriftgröße 1.2rem. Inhaltsbereich von 240 auf 190px reduziert; lange Inhalte scrollen intern. Feste Steuerfläche von 90px hält den Aufdeckknopf unabhängig von der Inhaltslänge an derselben Position.

## Dateien und Tests

`js/games/public.js`, `js/games/admin.js`, `js/games/games.css`, `imposter.html`; Cache-Version in `index.html`, `js/app.js`, `js/games/admin-data.js` sowie Modulimporten. `tests/imposter-public-ui.test.cjs` und `tests/imposter-admin.test.cjs` erweitert.

Vier lokale Testsuiten bestanden: Admin-Bedienung, öffentliche Ansicht, Controller und Haltebedienung. Explizit geprüft: privater-Tab-Hinweis, Namensformular-Abstand (CSS), Wartefeld für Rundenleitung und Spieler, keine Auge-Anzeige beim Warten, Steuerfläche erst nach Wortfreigabe, keine doppelte Rundenleitungsbezeichnung im Feld, entfernte Neue-Runde-Texte, gleiche Schriftgrößen/kleinere feste Höhe (CSS), Petrol bei erfolgreichem Kopieren und Fehlerfarbe bei anschließend gescheitertem Kopieren. Syntaxprüfungen erfolgreich.

Keine Datenbank-, Auth- oder Berechtigungsänderungen. Die Sicherheits- und Rundenlogik bleiben erhalten. DOM/CSS-Prüfungen, keine tatsächliche iPhone-/Pixelprüfung; diese bleibt offen. Die Gesamtfläche ist inklusive reservierter Steuerfläche kleiner als v1.83.
