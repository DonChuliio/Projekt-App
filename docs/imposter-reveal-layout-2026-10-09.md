# Imposter: Rollenfeld und Rundenleitungsansicht · v1.82

- Rollenfläche erst nach bestätigter/gespeicherter Namensauswahl sichtbar; beim ungültigen/beendeten Link verborgen.
- Wortanzeige ohne „Das Wort ist …“: nur das Wort, weiterhin mit eigenem Rollenhinweis und Haltebedienung.
- Rundenleitung sieht beim Halten ihre Imposter-Namen, Wort und optionalen Hinweis. Neue Imposter-Liste wird ausschließlich im geschützten Abruf der aktuellen Rundenleitung während einer laufenden Runde ausgegeben. Öffentliches Status-Polling und normale Spieler erhalten sie nicht. Die optionale gegenseitige Imposter-Anzeige bleibt unverändert.
- Gewinnerknöpfe unterhalb des Rollenfelds/Halteknopfs, nebeneinander mit zwei gleich großen Spalten. Bestätigung darunter; Folgerundenstart ebenfalls unterhalb des Felds.
- Inhaltsbereich hat feste Höhe 320px. Auge und Text belegen denselben reservierten Platz, Halteknopf bleibt außerhalb. Sehr lange Wörter/Namen/Hinweise können innerhalb dieses Bereichs scrollen. Keine Positionierung abhängig von der Textlänge. Die Halte-/Loslasslogik bleibt unverändert.
- Manuelle Bestätigungsdarstellung nutzt den letzten Controllerzustand, um keine bereits verborgene Rollenansicht aus einer alten Event-Closure erneut darzustellen.

## Dateien / Nachweise

`js/games/public.js`, `imposter.html`, `js/games/games.css`: Sichtbarkeit, Worttext, stabile Rollenfläche und untere Knöpfe. `database/imposter_host_reveal.sql`: Migration `imposter_host_role_reveal` erfolgreich angewandt, ausschließlich bestehende Rollenfunktion erweitert; Auth-/RLS-Grenzen und eigene Imposter-Hinweise bleiben erhalten. `index.html`, `js/app.js`, `js/games/admin.js`, `js/games/admin-data.js`: Cache-Version v1.82. `tests/imposter-public-ui.test.cjs`, `tests/imposter-teammates.sql`: neue Abnahmefälle.

Alle **20 lokalen Testsuiten** und Syntaxprüfungen bestanden. DOM-/Strukturprüfung: Feld vor Wahl verborgen/nach Wahl sichtbar; nur Worttext; Host-Imposter-Anzeige; Gewinnerknöpfe gemeinsame Gruppe nach Haltefeld im HTML; reservierte Höhe und interner Überlauf. Kein tatsächlicher Pixel-/iPhone-Geometrietest behauptet.

Realer SQL-Test gegen Supabase innerhalb vollständig zurückgerollter Transaktion bestanden: ein/zwei Imposter, korrekte Namen für Rundenleitung, keine Host-Namenliste an normale Spieler oder öffentlichen Status; optionale Imposter-Mitspieler weiterhin nur bei aktivierter Einstellung. Keine Benutzer-Spiele verändert. Die zuvor offenen tatsächlichen Browser-/iPhone-/HTTP-/Parallelprüfungen bleiben offen.
