# Routinen – Issues #9/#10, v1.73

| Issue | Umsetzung | Prüfungen |
|---|---|---|
| #9 | Frei benennbare Spalten; mehrere eigene Aufgaben pro Spalte. Hinzufügen und gezieltes Entfernen mit eigener Bestätigung/Abbrechen. KW-Auswahl persistent. Spalten und Aufgaben werden archiviert; bestehende To-dos und historische Daten bleiben erhalten. | DOM: Hinzufügen, Neuladen, KW-Änderung, Fehler-Rücknahme, Entfernen/Abbrechen und unbetroffene Nachbaraufgaben/-spalten PASS. SQL: atomisches Spaltenarchiv, keine Löschung der Historie, Hard-Delete gesperrt, RLS/Fremdzuordnung/Anonymzugriff PASS. |
| #10 | Jahresunabhängige KW-Vorlagen. Dieselben Routinen stehen im Folgejahr bereit. ISO-Jahresvorschau mit 52/53 Wochen; KW-53-Plan bleibt für entsprechende Jahre gespeichert. Automatische Priorität-A-To-dos behalten die vorhandene eindeutige Identität Benutzer/Routine/ISO-Jahr/KW. | DOM/Datumsfunktionen: 01.01.2027 = ISO 2026/KW53, 04.01.2027 = ISO 2027/KW1, Vorschau 2026/2027, Reload PASS. SQL: 2026 erledigt/2027 offen getrennt, KW53 nur in zulässigem ISO-Jahr, wiederholte Synchronisation ohne Duplikat PASS. |

## Daten und Architektur

Migration `dynamic_annual_routines` ergänzt `routine_columns` und `routine_tasks` ausschließlich für wiederverwendbare Definitionen (Name, Zuordnung, KW-Auswahl). `calendar_tasks` bleibt für vorhandene jahresbezogene Pläne und Erledigungsstände unverändert. Alle 39 vorhandenen Zeilen vor/nach Migration und SQL-Tests durch identischen Fingerprint verifiziert. Fünf bisherige Standardaufgaben werden mit ihren bisherigen IDs/Namen übernommen; auch andere vorhandene Task-IDs werden bewahrt. Der jeweils jüngste vorhandene Plan pro Benutzer/Aufgabe wird zur Jahresvorlage. Keine Vereinigung alter und neuer Jahrespläne, die frühere Abwahlen wieder aktivieren würde.

KW-Auswahl in der neuen Verwaltung gilt für alle Jahre. Die Jahresvorschau zeigt, ob ein ISO-Jahr 52 oder 53 Wochen hat; sie ist keine getrennte Planung pro Jahr. Vorhandene Erledigungshistorie wird nicht zur neuen jährlichen Vorlage gemacht.

Synchronisation aktualisiert `sync_routine_todos_for_user`; Auth-RPC und bestehende Push-Edge-Function benutzen dieselbe Funktion. Historische Kalenderstände werden berücksichtigt, neue Jahresvorkommen erzeugen eigene wichtige To-dos. Vorherige offene To-dos bleiben erhalten. Abhaken deaktiviert keine Routine. Archivieren verhindert zukünftige Erzeugung, löscht keine vorhandenen To-dos. Unique-Constraint verhindert doppelte Jahres-/Wochenvorkommen auch bei mehreren Geräten. Keine zusätzlichen Push-Termine oder Änderungen an Finanz-Erinnerungen, Guten-Morgen-Ansicht oder Dokumentenspeicher.

Neue Tabellen mit benutzerbezogenem RLS, zusammengesetztem Eigentümer-Fremdschlüssel, bestätigtem Archiv-RPC als Security Invoker mit leerem Search Path und ohne anonymen Zugriff. Keine privilegierten Testendpunkte. KW-Änderungen vergleichen den vorher geladenen Plan; veraltete Änderungen eines anderen Geräts werden abgewiesen statt überschrieben. Vorherige Auth/RLS für Kalender/To-dos bleiben erhalten.

## Dateien und Tests

`database/dynamic_annual_routines.sql`, `js/data/routine-templates-data.js`, `js/calendar/routine-editor.js`, `js/calendar/calendar.js`, `js/app.js`, `index.html`, `style.css`, `tests/dynamic-routines.test.cjs`, `tests/dynamic-annual-routines.sql`.

15 lokale Testsuiten und Syntaxprüfungen bestanden. Echte zurückgerollte SQL-Tests für dynamische/jährliche Routinen bestanden; bestehender Live-SQL-Routine-To-do-Test erneut bestanden. Ausschließlich synthetische Testeinträge/Änderungen innerhalb zurückgerollter Transaktionen. Security Advisors: keine neue RLS-/Datenbankwarnung; bereits bekannte Leaked-Password-Protection-Warnung unverändert: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Grenze: DOM-/Request-Mocks und echte SQL-Tests, kein vollständiger Browser-/iPhone-Test. Gemeinsame Supabase-Vorgaben wurden für Eigentümerschutz, Invoker-Funktionen, Archivierung und Testbereinigung verwendet. Issues #9/#10 nach Implementierung und Tests abgeschlossen; mobile Sichtprüfung separat offen.
