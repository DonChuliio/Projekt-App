# Erinnerungen · direkte Bedienung und Ablaufbereinigung · v1.104 · 2026-10-15

- Löschen sofort ohne Bestätigung; Fehler lassen den Eintrag sichtbar, Busy-Sperre verhindert doppelte Anfragen.
- Bearbeiten/Löschen als neutrale SVG-Piktogramme mit Beschriftung für Screenreader und 44px Touchflächen.
- Planner-Kachel wie ihre Nachbarn: schlichtes div.tile „Erinnerungen“, keine Glocke/Preview/Sondergestaltung.
- Feld heißt „Uhrzeit“. Nur bei Neuanlage 09:00 vorbelegt; bestehende Zeiten beim Bearbeiten unverändert.
- Endgültige automatische Löschung nach dem Erinnerungsdatum, nicht dem Erstellungsdatum. Heutige und zukünftige Einträge bleiben erhalten. Keine Änderung an To-dos, Push-Text oder Versandlogik.

## Serverseitige Bereinigung
Migration planner_reminders_remove_after_berlin_day angewendet. Neuer interner Cron dock-reminders-cleanup: 0 22,23 * * * (UTC). So wird sowohl im Sommer als auch Winter der Berliner Tageswechsel abgedeckt; der zusätzliche Lauf ist durch die Datumsbedingung idempotent. DELETE betrifft ausschließlich reminder_date < aktuelles Berliner Datum. Kein öffentlicher Test-/Löschendpoint, keine zusätzlichen Benutzerrechte. Erinnerung vom 12. wird am Berliner Tageswechsel zum 13. endgültig entfernt, auch ohne geöffnete App. Die App bietet dafür keine Wiederherstellung.

Vorprüfung: 0 bereits abgelaufene Erinnerungen. In diesem Änderungslauf keine bestehenden Benutzererinnerungen manuell entfernt.

## Tests
Alle 31 lokalen Testsuites erfolgreich. Ergänzt: Piktogramme vorhanden, keine Löschrückfrage, unmittelbarer Löschaufruf, Fehler-/Doppelklickschutz, 09:00 als Vorgabe, Label ohne optional, exakte Standard-Kachel. 43 Home-/Back-Routen weiterhin erfolgreich.

Echte schreibgeschützte DB-Tests: Berliner Tageswechsel Sommer/Winter sowie Prädikat für gestern/heute/morgen jeweils true. Cron-Konfiguration aktiv bestätigt; bestehender Push-Cron unverändert.

Offen: Der echte rollback-basierte Löschtest tests/planner-reminders-cleanup.sql (nur synthetische IDs) wurde vom Tool mit Invalid or expired requestState blockiert. Nicht als bestanden gewertet. Der reale erste Mitternachtslauf und physische iPhone-Bedienung sind nicht abgenommen. Die älteren offenen Versandabnahmen aus Issue 31 bleiben bestehen.
