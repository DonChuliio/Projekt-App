# Imposter: erster Rundenstart · v1.76

## Fehler

„Neue Runde starten“ öffnete lediglich eine zweite Bestätigung am Anfang der langen Verwaltungsseite. Sie war beim unten stehenden Startknopf nicht sichtbar. Ohne zweiten Klick entstand keine Runde; die öffentliche Seite zeigte korrekt den Wartestatus. Read-only-Kontrolle des bestehenden Spiels: drei aktive Teilnehmer, kein Rundendatensatz. Kein Spiel wurde für die Diagnose verändert oder gestartet.

## Änderung

- Die erste Runde sowie eine Folgerunde nach einer bereits geschlossenen Runde starten direkt über den ausdrücklich beschrifteten Startknopf.
- Beim Ersetzen einer laufenden Runde bleibt eine zusätzliche Bestätigung erhalten, direkt innerhalb des Rundenformulars. Die Konfiguration wird beim Öffnen dieser Bestätigung übernommen.
- Validierungs- und Serverfehler erscheinen am Rundenformular und werden in den sichtbaren Bereich gescrollt. Konkrete Mindestzahlen: ein Imposter benötigt mindestens drei Teilnehmer inklusive Spielleitung; zwei Imposter benötigen mindestens vier.
- Bestehende RPCs, Auth, RLS, Zufallsvergabe, Gruppenlink und öffentliche Statusabfrage unverändert.

## Dateien / Tests

`js/games/admin.js`: Startlogik und sichtbare Meldungen. `tests/imposter-admin.test.cjs`: erster Start ohne zweiten Klick, Bestätigung der nächsten laufenden Runde im selben Formular, drei Teilnehmer/zwei Imposter abgelehnt mit konkreter Meldung, Serverfehler am Formular, erneuter erfolgreicher Versuch. Die vorhandenen Host-/Link-/CRUD-Prüfungen bestehen weiter. DOM-Test mit gemocktem RPC, kein tatsächlicher iPhone-Test.

`index.html`, `imposter.html`, `js/app.js`, `js/games/admin-data.js`, `js/games/public.js`: Cache-Version der geänderten App auf v1.76 angehoben.

Alle 17 lokalen Testsuiten und Syntaxprüfungen der sechs Spielmodule bestanden. Keine Datenbankmigration erforderlich. Der echte Parallel-/HTTP-Test sowie die iPhone-Abnahme aus Issue #25 bleiben weiterhin offen.
