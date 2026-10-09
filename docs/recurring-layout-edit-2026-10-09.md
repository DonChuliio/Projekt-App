# Wiederkehrende Finanzposten – v1.74

Liste: vollständige Namen mit Zeilenumbruch; fester 44-px-Bearbeiten-Knopf rechts. Zweiten Löschknopf aus der Liste entfernt. Grid mit `minmax(0,1fr) 44px` verhindert, dass der Aktionsbereich in die Namen hineinragt.

Bearbeiten: vorausgefüllte Bezeichnung, Betrag, Einnahme/Ausgabe, Intervall (monatlich/quartalsweise/jährlich), Tag und bei Bedarf Monat. Intervallwechsel aktualisiert die Gruppenzuordnung; unveränderte Fälligkeit bleibt erhalten. Löschen nur hier, mit eigener Bestätigung und Abbrechen. Fehler behalten den Eintrag und zeigen eine Meldung. Speichern/Löschen gegen parallele Bedienaktionen geschützt. Vorhandener authentifizierter PATCH/DELETE und RLS unverändert; keine Datenbankänderung.

Dateien: `js/finances/recurring-transactions.js`, `js/app.js`, `index.html`, `style.css`, `tests/recurring-edit.test.cjs`.

15 Testsuiten und Syntaxprüfung PASS. Ergänzte Tests: exakt ein Edit-Control pro Zeile, alle Felder inkl. Intervallwechsel speichern, ID erhalten, bestätigtes gezieltes Löschen, Abbrechen und Fehler/Retry ohne Verlust anderer Einträge. Layout-Strukturtest für feste Aktionsbreite, Umbruch und fehlende Ellipse PASS. Bestehende Finanz-/Routinen-/Dokument-/Push-/Auth-Tests weiterhin bestanden.

Grenze: DOM-/Request- und statische CSS-Tests, keine tatsächliche iPhone-Sichtprüfung. Vorhandene echte RLS-Prüfung aus v1.72 bleibt unverändert; keine neue Live-Datenänderung oder zusätzliche Sicherheitsfreigabe behauptet.
