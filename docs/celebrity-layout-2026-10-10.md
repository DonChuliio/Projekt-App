# Promi-Raten: Anzeige und Platzierungen · v1.94

- Die bestehende 190px hohe Inhaltsfläche bleibt beim Auf-/Abblenden und unabhängig von der Spielerzahl gleich hoch. Ab sechs anderen Promis erscheinen die Einträge in zwei Spalten. Lange Namen werden umgebrochen; überlaufende Inhalte scrollen innerhalb der festen Fläche.
- Der Platzierungsüberblick erscheint erst, sobald der Server den eigenen Gewinn mit einer Platznummer bestätigt hat. Bis dahin bleiben die persönlichen Notizen sichtbar, sofern sie für das Spiel aktiviert sind.
- Nach dem eigenen Gewinn ersetzt der Platzierungsüberblick das ausgeblendete Notizfeld. Notizen werden nicht gelöscht; der bestehende Controller bereinigt sie weiterhin erst beim Rundenwechsel oder Reset.
- Die Platzmeldung und die Ergebnisse der abgeschlossenen Runde bleiben beim automatischen Rundenwechsel erhalten.

Geändert: js/games/celebrity-public.js, js/games/games.css und tests/celebrity-public.test.cjs. Cache-Version der Spiele-Einstiegspunkte und Modulimporte auf v1.94 erhöht.

Prüfung: Alle 24 lokalen Testsuiten erfolgreich. Erweiterter DOM-/CSS-Test prüft elf und zwölf Teilnehmer, Zweispaltenklasse und Rückkehr zur verborgenen Anzeige, unveränderte Höhenregel, keine Platzliste vor eigenem Gewinn, ausgeblendete Notizen nach Gewinn und Ergebnisse der Folgerunde. Kein physischer iPhone-Test; die reale mobile Darstellung bleibt zur Sichtprüfung offen. Keine Datenbank- oder Rechteänderungen.
