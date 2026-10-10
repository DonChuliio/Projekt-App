# Issue 26: Promi-Raten · ursprüngliche Abnahme v1.93

Aktueller Stand v1.95: Die nachträglich gewünschten Änderungen an Anzeige, Namensübernahme und vorzeitigem Rundenabschluss ersetzen die ursprüngliche erneute Namenswahl und das Verwerfen per Runden-Reset. Siehe [Anzeige v1.94](celebrity-layout-2026-10-10.md) und [Rundenabschluss v1.95](celebrity-rounds-2026-10-10.md).

Eigenständiges Spiel unter Spiele → Promi-Raten, getrennt von Imposter. Neuer Gruppenlink celebrity.html?game=… bleibt über Runden/Resets unverändert; nach Beenden oder Löschen ist er nicht mehr spielbar. Keine externen Dienste, Kostenmodelle, KI-Auswertung oder Emojis eingeführt.

## Funktion

- Einrichtung mit Spielname, Spieler-Eingabe/Plus, Entfernen-Piktogramm, Notizfeld-Schalter und Spiel starten/Abbrechen. Namen werden nach Start nicht geändert; alle nehmen teil, kein Spielleiter ausgeschlossen. Abbrechen behält den gespeicherten Entwurf.
- Pro Runde neue, zufällige 1:1-Zuordnung ohne Selbstzuweisung; vor Eingabe sichtbar „Du legst einen Promi für [Name] fest“. Server bildet einen zufällig angeordneten Kreis über alle aktiven Spieler. Neu ausgelost bedeutet nicht garantiert einen anderen Empfänger als in der vorigen Runde; bei zwei Personen wäre das ohnehin unmöglich.
- Namenswahl pro Runde neu. Kryptografisch zufälliges, rundengebundenes Belegungs-Secret im sessionStorage des Tabs ermöglicht Reload derselben Runde; bei Rundenwechsel oder Reset gelöscht. Gleichzeitige Doppelbelegung wird unter Spiel-Zeilenschloss und eindeutiger Claim-Constraint abgewiesen. Erneuter identischer Claim ist idempotent.
- Ratephase erst, wenn alle ihren Promi festgelegt haben. Eigene Zuordnung nicht in eigener UI oder öffentlichem Payload. Andere Promis erscheinen ausschließlich beim Halten von Promis anzeigen und verschwinden beim Loslassen/Verlassen/Fokusverlust.
- Persönliche Notizen unter dem Anzeigefeld; per Dock ein-/ausschaltbar. Nur im Tab gespeichert, nicht an Supabase gesendet. Bleiben beim Auf-/Abblenden und Reload erhalten, verschwinden bei neuer Runde/Reset/Belegungswechsel. Keine Promi-Liste im Browserspeicher.
- Gewonnen speichert atomar Platz 1 bis N. Doppelklickschutz im Client, idempotenter Server-Abruf desselben Platzes, einschließlich Wiederholung nach automatischer Folgerunde. Eigene Platzmeldung und aktuelle Platzierungen der anderen; nach Abschluss vorige Platzierungen bis zur nächsten Namensbestätigung einsehbar.
- Alle fertig → abgeschlossene Runde in Historie, neue Runde mit neuem ID und nächster Nummer. Dock-Reset verwirft nur aktuelle Runde, behält deren laufende Rundennummer, erzeugt neue Zuordnung und invalidiert alte Belegungen/Aktionen/Notizen. Frühere abgeschlossene Runden bleiben erhalten.
- Dock zeigt Eingabe-/Ratestatus, Spieler mit Belegungs-Haken/Refresh, Platzierungen, abgeschlossene Runden und spielübergreifende Statistik aus eigenen Promi-Spielen: Runden, erste Plätze, einzelne Platzierungen. Spiel beenden/löschen direkt wie aktuelles Imposter.

## Rechte und Datenbank

Eigenes internes Schema dock_celebrity: games, players, rounds, entries, claims. RLS auf allen fünf Tabellen, explizite Deny-Policies für anon/authenticated, keine direkten Tabellen-Grants. Öffentlich nur schmale Invoker-Wrapper; interne Definer-Funktionen mit leerem search_path. new_round und die frei nach Owner parametrisierte Statistikfunktion sind für öffentliche/authentifizierte Clients nicht aufrufbar.

Dock-RPC celebrity_manage verlangt auth.uid() und prüft Eigentümer. Public status zeigt nur Namen, Belegungs-/Eingabestatus und Plätze. celebrity_player/others/action benötigen gültiges Secret für die angegebene Runde. others schließt anhand der serverseitig ermittelten Spieler-ID den Datensatz aus, dessen Empfänger der eigene Spieler ist. Kein wählbarer Player-ID-Filter in dieser Abfrage. Vor Ratephase und nach Reset/Spielende keine Promi-Abfrage. Alte abgeschlossene Runden liefern mit eigener früherer Belegung nur eigenen Platz und öffentliche Namen/Plätze, keine Promis.

Spiel-Zeilenschloss serialisiert Claims, Eingaben, Gewinner und Admin-Mutationen; zusätzliche Constraints sichern eindeutige Empfänger, Claims und Plätze. Endgültiges Löschen entfernt abhängige Runden, Claims, Eingaben, Spieler und Statistik. FK-Cascades berücksichtigen auch übergeordnete Bereinigung. Keine Imposter-Tabellen/Funktionen geändert.

Angewandte Migrationen:

1. celebrity_game_isolated_rounds_and_rpc
2. celebrity_final_win_retry_and_cascade_cleanup
3. celebrity_completed_standings_and_retry_scope

## Nachweis der zehn Akzeptanzkriterien

| Nr. | Kriterium | Implementierung / Prüfung |
|---|---|---|
| 1 | Elf Spieler, zufällige 1:1-Zuordnung | Reales SQL: 11 Eingaben, 11 verschiedene Empfänger, keine Selbstzuweisung; bestanden. |
| 2 | Empfänger vor Eingabe, gemeinsamer Start | DOM prüft Empfänger-Formular; SQL prüft jede Eingabe, Ratephase erst nach Eingabe 11; bestanden. |
| 3 | Eigener Promi serverseitig ausgeschlossen | SQL prüft für alle elf Spieler zehn andere Promis und keine eigene Zuordnung; vor Freigabe abgewiesen. Status/Player enthalten keinen eigenen Promi. DOM prüft Halte-/Verbergendarstellung; bestanden. |
| 4 | Optionales Notizfeld darunter | SQL/DOM testen Notes-Flag; HTML-Reihenfolge, Erhalt bei Hold/Reload und Zurücksetzen im Controller; bestanden. |
| 5 | Eindeutige Plätze, eigene Meldung, Live-Ränge | SQL vergibt 1–11, wiederholte Meldungen einschließlich finalem Gewinner liefern denselben Platz; DOM/Controller prüfen eigene Meldung, andere Ränge und Doppelklickschutz. Reale parallele HTTP-Lastprüfung offen. |
| 6 | Automatische Folgerunde, gleicher Link | SQL/Controller: Runde 2 mit neuem ID, leeren Eingaben/Claims/Plätzen, frische Namenswahl und Notizen; alter Link unverändert. Vorige Ergebnisse weiterhin einsehbar; bestanden. |
| 7 | Reset in Eingabe-/Ratephase | Reales SQL prüft beide Phasen, neue Runde-ID bei gleicher laufender Nummer, Historie erhalten, alte Belegung ungültig; Dock-DOM prüft Reset/Fehler; bestanden. |
| 8 | Nur abgeschlossene Promi-Runden werten | SQL prüft abgeschlossene Runde, verworfene Runde nicht in Historie, zwei getrennte Spiele mit gemeinsamem Teilnehmer und zwei ersten Plätzen; bestanden. |
| 9 | Aktuelles Imposter-Design vergleichen | Gemeinsame CSS/hold/API/Auth/Navigation; Vergleich unten dokumentiert. DOM/CSS geprüft, physische iPhone-Sichtprüfung offen. |
| 10 | Dateien, Migrationen, Rechte, Grenzen dokumentieren | Dieser Bericht und reproduzierbare Tests im Repository; umgesetzt. |

## Vergleich mit finalem Imposter v1.92

| Element | Übernommen | Promi-Raten-Anpassung |
|---|---|---|
| Dock-Kacheln/Navigation | Helle Beschriftung, SVG, getrennte Zurück/Home | Eigene Kachel/View, eigene Back-Behandlung zur Spiel-/Spieleliste |
| Einrichtung | Spielerfeld mit Plus, gerahmte Liste, kleine Trash-Aktion, Start/Abbrechen unten | Notizen-Schalter anstelle Imposter-Anzahl |
| Namen | Dropdown, belegte Namen gesperrt, kurzer Vertrauenshinweis | Jede Runde neu, tab- und rundengebundene Belegung statt dauerhafter Gerätebindung |
| Anzeigen | Durchgestrichenes Auge, bestehender Hold-Handler, stabile 190px-Inhaltsfläche, internes Scrollen, kleine Bedienungsschrift | Namen und Promis der anderen, nie eigener Promi; optionaler Notizbereich darunter |
| Status | Klare Warte-/Fehleransicht, automatische Aktualisierung ohne Refresh-Schaltfläche | Eingaben aller Spieler erforderlich; kein Rundenleiter |
| Dock-Spieler | Aufklappbare Liste, Haken und Refresh-Piktogramm | Zusätzlicher Eingabe-/Ratestatus je Teilnehmer |
| Ergebnisse | Direkte Aktion, bewahrte Statistik, Abschluss-/Löschknöpfe unten | Persönliche Platzmeldung, Live-Ränge, automatische nächste Runde, Runden-Reset und abgeschlossene Historie |

## Dateien

- Neue Spielseite: celebrity.html.
- Neue Module: js/games/celebrity-admin.js, celebrity-data.js, celebrity-controller.js, celebrity-public.js.
- SQL: database/celebrity_game.sql, celebrity_retry_cleanup.sql, celebrity_final_results.sql.
- Integration: index.html, js/app.js, js/navigation.js, js/games/games.css. Cache-Version v1.93 auch in imposter.html und bestehenden games/admin.js, admin-data.js, public.js; deren Funktion unverändert.
- Neue Tests: tests/celebrity-admin.test.cjs, celebrity-controller.test.cjs, celebrity-public.test.cjs, celebrity.sql, celebrity-stats.sql, celebrity-api-smoke.py. Navigationstest um neue View ergänzt.

## Testresultate

- Alle 24 lokalen Testsuiten erfolgreich, inklusive Auth, Dokumente, Routinen, Push, Finanzen, bestehendem Imposter und neuer Promi-Verwaltung/Public-Controller/UI; Syntaxprüfungen erfolgreich.
- Zwei reale Supabase-SQL-Testläufe vollständig zurückgerollt: Elf-Spieler-Lebenszyklus/Privatsphäre/Rechte/Claims/Idempotenz/Resets; zwei Spiele mit gemeinsamer Teilnehmerstatistik. Nur synthetische Spieldaten, keine echten Spiele verändert.
- Bestehender Imposter-SQL-Regressionstest weiterhin erfolgreich.
- Echte HTTP-Prüfung mit vorhandenem öffentlichen Frontend-Key: ungültiger Link nicht verfügbar, ungültige Player-Abfrage null, ungültige Others/Claim/Win und anonyme Administration abgewiesen. Keine HTTP-Testfixtures oder privilegierten Test-Endpunkte angelegt.
- Supabase Security Advisor: keine neue Warnung; nur vorhandene Leaked Password Protection Disabled. [Supabase-Hinweis](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Offene Prüfung / Einschränkungen

Keine vollständige Live-Abnahme behauptet: physisches iPhone/PWA, erfolgreiches Spiel über mehrere reale Browser/HTTP-Clients und echte parallele HTTP-Rennprüfungen stehen noch aus. SQL-Rollenprüfung, Locks/Constraints, sequenzielle Wiederholungen und Client-Doppelklicktests ersetzen diese Prüfungen nicht. Issue 26 bleibt bis zu dieser Abnahme offen.

Ohne Login/Code ist die öffentliche Namenswahl bewusst vertrauensbasiert; wer absichtlich einen noch freien fremden Namen wählt, ist nicht als echte Person verifiziert. Statistiken über Spiele werden innerhalb des Dock-Eigentümers anhand getrimmter, groß-/kleinschreibungsunabhängiger Namen zusammengeführt. Gleiche Namen in verschiedenen Spielen werden als dieselbe Person behandelt.

Notizen/Belegung liegen nur im sessionStorage dieses Tabs; ohne verfügbaren Browserspeicher funktioniert die Runde im offenen Tab, nach Reload ist erneute Namenszuordnung gegebenenfalls nötig. Dock kann eine blockierte Belegung zurücksetzen. Große Spielerzahlen benötigen Scrollen innerhalb der Anzeige; die feste Fläche und Haltebedienung wurden noch nicht auf einem echten iPhone geprüft.
