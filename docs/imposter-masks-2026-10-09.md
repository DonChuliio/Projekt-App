# Imposter: getrennte Masken · v1.77

Die Verwaltung ist in drei Ansichten innerhalb des bestehenden Imposter-Moduls aufgeteilt:

1. Spielname eingeben und Spiel erstellen; vorhandene Spiele über eine Liste öffnen.
2. Spieler anlegen, bearbeiten und anschließend „Spieler bestätigen“. Mindestens drei Teilnehmer inklusive Spielleitung erforderlich. Keine Rundeneingaben auf dieser Maske.
3. Spielansicht: fester Gruppenlink und Teilen oben, „Spieler anzeigen“ öffnet die separate Spielerliste, darunter Spielleiter, Wort, optionaler Hinweis und Imposter-Anzahl. Der letzte Formularbutton heißt „Runde 1 starten“, anschließend „Runde 2 starten“ usw.

Die Rundennummer stammt weiterhin aus Supabase und wird serverseitig fortlaufend erhöht. Kein neuer Aufgabenbestand, keine Migration, keine Änderung an Auth/RLS oder der öffentlichen Spielseite. Die Bestätigung der Spielerliste ist ein Bedienungsschritt; gespeicherte Teilnehmer bleiben unabhängig davon erhalten. Bestehende Spiele mit mindestens drei Teilnehmern öffnen direkt die Spielansicht, kleinere Teilnehmerlisten öffnen die Spieleranlage.

Zurück führt aus der nachträglich geöffneten Spielerliste ins Spiel, aus dem Spiel zur Spieleliste, von dort zu Spiele. Während der Erstanlage führt Zurück zur Spieleliste. Home führt über die bestehende globale Navigation direkt zum Dashboard. Das Modul verwendet dafür denselben Ansatz eines eigenen Zurück-Handlers wie das Dokumentenmodul.

## Dateien und Prüfung

- `js/games/admin.js`: getrennte Masken, Spielauswahl, Spielerbestätigung, Rundennummer im Startknopf, modulinterne Zurück-Navigation.
- `js/navigation.js`, `index.html`: bestehendes Home beibehalten, doppelten Zurück-Handler für Imposter verhindern.
- `js/games/games.css`: lesbare Liste vorhandener Spiele.
- `js/app.js`, `imposter.html`, `js/games/admin-data.js`, `js/games/public.js`: Cache-Version v1.77.
- `tests/imposter-admin.test.cjs`: Erstellen → Spieleranlage → Bestätigen → Spiel, zu kleine Liste abgewiesen, Spieler auf Spielansicht verborgen, Link oben und unverändert, Rundenzähler 1/2/3, bestehende Spielerliste öffnen, bearbeiten/resetten/löschen, zurück ins Spiel und zur Spieleliste, vorhandenes Spiel wieder öffnen, zurück zu Spiele. RPCs gemockt; keine echten Benutzer-Spiele verändert.
- `tests/navigation.test.cjs`: weiterhin getrennte Home/Zurück-Buttons in 38 Modulansichten, kein konkurrierender Imposter-Zurück-Handler.

Alle 17 lokalen Testsuiten sowie Syntaxprüfungen bestanden. Kein tatsächlicher iPhone-/Browser-Test behauptet. Die noch offenen Parallel-/HTTP- und iPhone-Prüfungen aus Issue #25 sind unverändert offen.
