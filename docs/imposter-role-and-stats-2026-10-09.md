# Imposter: Rollenhinweis und aufklappbare Statistik · v1.79

- Normale Spieler sehen „Kein Imposter“ und darunter „Das Wort ist …“. Imposter sehen weiterhin ausschließlich ihren Hinweis.
- Statistik zeigt nur Siege **als Imposter**, nach Siegen absteigend und bei Gleichstand nach Namen sortiert. Siege als normaler Spieler oder Spielleitung und Runden ohne Ergebnis zählen nicht. Entfernte Teilnehmer aus der Einrichtung erscheinen nicht in der Rangliste.
- Die Anzeige berechnet diese Siege aus der vorhandenen eigentümergeschützten Rundenhistorie (Gewinnergruppe plus Imposter-Namen). Diese Namen sind seit Spielstart unveränderlich. Keine zusätzlichen Datensätze, keine Änderung der Ergebnisse oder RLS.
- Aktuelle Runde, Rundenhistorie und Siege als Imposter sind als native details/summary-Elemente zunächst geschlossen. Historische Runden lassen sich einzeln öffnen. Der Öffnungszustand bleibt beim automatischen Aktualisieren und innerhalb desselben Spiels erhalten; beim Abmelden/Verlassen des Moduls wird er zurückgesetzt.

## Dateien

`js/games/public.js`: Rollenhinweis. `js/games/stats.js`: neue Auswertung aus Historie. `js/games/admin.js`: native Aufklappbereiche und kompakte Rangliste. `js/games/games.css`: Gestaltung. `index.html`, `imposter.html`, `js/app.js`, `js/games/admin-data.js`: Cache-Version v1.79. Drei aktualisierte/neue Tests: `tests/imposter-admin.test.cjs`, `tests/imposter-public-ui.test.cjs`, `tests/imposter-stats.test.cjs`.

## Prüfung

Alle **19 lokalen Testsuiten** und Syntaxprüfungen bestanden. Neue Prüfungen: ausdrückliche normale Rollenanzeige; nur Imposter-Siege bei einem/zwei Impostern, keine normalen/Host-/ungewerteten Siege, Nullwerte, Sortierung und ausgeschlossene Einrichtungs-Teilnehmer; eingeklappte Standarddarstellung, Auf-/Zuklappen und erhaltene Auswahl beim Polling. Der Dock-DOM-Test nutzt den echten Statistik-Helper und absichtlich abweichende alte Gesamtsieg-Zahlen, um nachzuweisen, dass diese nicht mehr angezeigt werden. RPCs in DOM-Tests gemockt; kein tatsächlicher iPhone-Test behauptet.

Die zunächst geplante Änderung der serverseitigen Gesamtsieg-Abfrage konnte wegen `Invalid or expired requestState` bei Supabase-Schreibaufrufen nicht übernommen werden. Stattdessen verwendet die fertige Anzeige die bereits vorhandene Rundenhistorie. Kontrollabfrage bestätigt die unveränderte ursprüngliche Funktion; kein neues Migrationsskript veröffentlicht und keine Benutzerdaten verändert. Dies blockiert die gewünschte Auswertung nicht. Die früher offenen echten HTTP-/Parallel-/iPhone-Abnahmen sind weiterhin nicht durchgeführt.
