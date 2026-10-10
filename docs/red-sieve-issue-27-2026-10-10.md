# Issue 27 · Rotes Sieb · v1.96

Eigenes Spiel unter Spiele → Rotes Sieb, eigene Teilnehmer und eigener stabiler Gruppenlink sieve.html?game=…. Keine Imposter-/Promi-Daten oder Spielregeln geändert. Link kopieren für die bestehende WhatsApp-Gruppe; keine zusätzliche WhatsApp-Schaltfläche. Icons/SVG und vorhandenes Dock-Design, keine Emojis, externen Dienste oder bezahlten Erweiterungen.

## Ablauf und Grenzen

- Dock: Spielname, Spieler mit Plus/Entfernen, 1–20 Wörter pro Person, erste 1–4 Kategorien in fester Reihenfolge Erklären → Ein Wort → Pantomime → Geräusche, 0–20 Joker je Team/Kategorie. Mindestens vier und höchstens 100 Spieler; nach Start Konfiguration gesperrt. Start/Abbrechen unten wie aktuelle Imposter-Verwaltung.
- Gemeinsamer Link: vertrauensbasierte Namenswahl. Eigene Tab-Belegung über Reload/Kategorien erhalten, durch Dock individuell zurücksetzbar. Keine echte Personenidentitätsprüfung behauptet. Privater Tab/gelöschter Tab-Speicher kann erneute Zuordnung durch Dock erforderlich machen.
- Genau die konfigurierte Anzahl eigener Begriffe eingeben und bestätigen. Fortschritt und vorbereitete Eingabefelder bleiben beim Polling erhalten. Erst nach vollständiger Abgabe aller Teilnehmer werden Teams zufällig und möglichst gleichmäßig gebildet. Teams/Mitglieder sind auf allen Spielseiten einsehbar.
- Alle ursprünglichen Worteinträge werden in jeder Kategorie wieder verwendet. Jeder aktuelle Begriff wird aus dem ungelösten Stapel zufällig gewählt. Gleichlautende Eingaben sind getrennte ursprüngliche Einträge; ein Joker wählt ausschließlich einen anderen Begriffstext. Fehlt ein solcher, wird nichts verbraucht und die Serveraktion meldet den Grund.
- Zufälliges Startteam der ersten Kategorie, danach alternierendes Startteam. Je Team zufällige Auswahl unter den Personen mit den wenigsten begonnenen Zügen: jedes Teammitglied einmal vor einer Wiederholung. Die Rotation bleibt über Kategorien erhalten.
- Nur die ausgewählte Person bestätigt Ich bin dran und danach Zug starten. Server setzt exakt eine Deadline 60 Sekunden nach Start; Wiederholung verlängert sie nicht. Öffentliches Polling alle 1,5 Sekunden; sichtbarer Countdown läuft über monotone Browserzeit, aus Serverzeit/Deadline und gemessener Status-Abfrage kalibriert. Die nachfolgende Identitätsabfrage wird nicht als zusätzliche Spielzeit angerechnet.
- Wort ausschließlich für die aktive Person und ausschließlich per gültigem Secret/Zug/aktueller Wortnummer vor Deadline abrufbar. Kein öffentliches Wortpool-/Wort-Payload. Der bestehende Hold-Handler verdeckt bei Loslassen, Pointer-Abbruch/-Verlassen, Fokusverlust, Hintergrund und Seitenwechsel; der Controller verwirft verspätete Antworten und blendet am Timerende aus. Kein Wort in sessionStorage, Logs oder externen Diensten.
- Wort Nummer X zählt je Zug ab 1; Geschafft und Joker erhöhen die Nummer, löschen die sichtbare Anzeige und erfordern erneutes Halten. Geschafft zählt 1 Wort; Joker legt den aktuellen Eintrag nicht als gelöst ab und verbraucht genau einen Team-Joker. Null Joker: grauer, deaktivierter Button und zusätzliche Serverprüfung. Beim letzten ungelösten Wort ist Joker deaktiviert; bei nur gleichen Begriffen verhindert der Server Verbrauch.
- Nach Ablauf reguläre Aktionen gesperrt. Letztes zählt noch oder Weitergeben entscheidet einmalig; danach anderes Team, neuer fair ausgewählter Spieler, eigener bewusster Start. Kein automatischer Timerstart.
- Alle Wörter gelöst: sofortiger Kategorieabschluss. Wörter und verbrauchte Joker pro Team sichtbar. Nur bei Wortgleichstand und weniger Jokern genau +1 Bonus; sonst 0. Nächste Kategorie wird bewusst über Nächste Kategorie geöffnet; voller Originalpool und frische Joker, Rotation erhalten. Nach letzter Kategorie Endergebnis, Summen und Sieger/Unentschieden auf allen Seiten. Fertiger Link zeigt Ergebnisse weiter; manuell beendeter/gelöschter Link ist nicht spielbar. Dock behält abgeschlossene Kategorieergebnisse beim manuellen Beenden.

## Nachweis der 13 Akzeptanzkriterien

| Nr. | Kriterium | Status / konkrete Prüfung |
|---|---|---|
| 1 | Dock-Konfiguration | Erledigt: DOM prüft Plus/Entfernen, vier Spieler, Zahlen, Kategorie-Reihenfolge, null Joker, Start/Link; echtes SQL prüft Mindestanzahl, Grenzen und Sperre nach Start. |
| 2 | Eingaben und Teambildung | Erledigt: SQL fordert genaue Anzahl/Typ/Länge/nicht leer; 4 und 5 Spieler, Teams 2:2 bzw. 2:3, Bildung erst bei letzter vollständiger Abgabe. DOM prüft Fortschritt/Bestätigen/Warten. |
| 3 | Originalpool je Kategorie | Erledigt: reales SQL spielt vier Kategorien, jeweils acht Einträge; 32 Stapelzeilen mit genau acht ursprünglichen Wort-IDs, keine neuen Eingaben. |
| 4 | Server-Timer / Wortrechte | Implementiert, Live-Abnahme offen: SQL prüft 60-Sekunden-Deadline, unveränderte Deadline bei Retry und Abruf nur durch aktive Person; Controller prüft monotone Ablaufanzeige und getrennte Status-/Identitätslatenz. Mehrere echte Geräte und realer 60-Sekunden-Lauf noch offen. |
| 5 | Gedrückthalten und Verbergen | Implementiert, iPhone offen: gemeinsamer Hold-Handler mit bestehenden Pointer-/Touch-/Keyboard-/Abbruch-Tests; neuer Controller/DOM prüfen Release, verspätete Antwort, Seiten-/Hintergrundhandler, Ablauf und erneutes verdecktes Wort. Kein physischer iPhone-Test. |
| 6 | Wort Nummer X | Erledigt: SQL/DOM prüfen Start bei 1, Zähler nach Geschafft/Joker, Rücksetzen bei neuem Zug und Sichtbarkeit beim verdeckten Wort. |
| 7 | Joker erschöpft/erneuert | Erledigt: grauer deaktivierter DOM-Button bei 0, SQL lehnt Verbrauch ab; nächste Kategorien starten mit 0 Verbrauch und erlauben neuen Joker. Kein alternativer Begriff verbraucht keinen Joker. |
| 8 | Atomare Stapel-/Punktaktionen | Implementiert, echte Parallelprüfung offen: Spiel-Zeilenschloss, Aktionsbelege und Zug-/Wortnummer-Vergleich; SQL prüft identische Wiederholung, unterschiedliche Aktion unter gleicher Kennung, veraltete Wortnummer, Ablaufsperre, einmalige Ablaufentscheidung und letztes Wort. Controller prüft unsichere Netzwerkantwort/Retry mit gleicher Kennung. Keine parallele HTTP-Rennprüfung behauptet. |
| 9 | Teamwechsel / faire Rotation | Erledigt: echtes SQL prüft 12 aufeinanderfolgende Wechsel und maximale Differenz 1 bei begonnenen Zügen innerhalb jedes Teams; zufällige Auswahl unter Mindestanzahl. |
| 10 | Kategorie-Startwechsel / bewusster Start | Erledigt: SQL prüft alternierende Startteams in allen vier Kategorien, pending-Zug ohne Deadline, Confirm/Start erforderlich; DOM bietet getrennte Knöpfe. |
| 11 | Wörter/Joker/Bonus | Erledigt: SQL 4:4 mit unterschiedlichen Jokern, Unterschied 1:4 trotzdem genau +1, gleiche Joker kein Bonus, ungleiche Wörter kein Bonus. DOM zeigt Wörter, Joker in Klammern und Bonus/Summen. |
| 12 | Finale / Link / Reload | Implementiert, Mehrgeräte-Abnahme offen: SQL finale Summen, unveränderter Link, finale idempotente Aktion, ein und vier Kategorien, beendeter/gelöschter Link gesperrt. Controller Belegung/Reload/Retry; DOM Sieger und Ergebnisbildschirm. Erfolgreicher Ablauf mit mehreren echten HTTP-/Browserclients noch offen. |
| 13 | UI-Vergleich / Dateien / Rechte / Grenzen | Erledigt: Vergleich, Migrationen, Rechte, reproduzierbare Tests und verbleibende Grenzen in diesem Bericht dokumentiert. |

## Vergleich mit aktueller finaler Imposter-Ansicht

| Element | Wiederverwendet / Abweichung |
|---|---|
| Navigation und Kachel | Gleiche helle Kachelbeschriftung, SVG, eigene View, getrennte Zurück/Home; Zurück Spiel → eigene Übersicht → Spiele. Navigationstest umfasst jetzt 40 Modulansichten. |
| Dock-Einrichtung | Plus im Namensfeld, gerahmte Liste, kleine Entfernen-Piktogramme, Start/Abbrechen unten; zusätzliche numerische Kategorien-/Wort-/Joker-Konfiguration. |
| Belegung | Dropdown und Vertrauens-/Tab-Hinweis, kleiner Haken/Refresh in Dock. Keine zusätzliche Bestätigungsabfrage bei Belegungsreset. |
| Geheimanzeige | Gleicher stabiler Hold-Button, durchgestrichenes Auge, 190px hohe Fläche, 90px Steuerungsbereich und 1,2rem Wortschrift. Rotes Sieb zeigt darüber Wort Nummer X; nur aktive Person hat dieses Feld. |
| Aktionsflächen | Zwei nebeneinander stehende Aktionsknöpfe, mobile Umbrüche; erschöpfter Joker grau und deaktiviert. Statt Rollen/Zielgewinnern Team/Zug/Timer und Stapelaktionen. |
| Warte-/Fehlerseite | Automatische Aktualisierung, Wartezustand, eigene Platzhalter; nur bei Fehlern Retry/Aktuellen Stand laden. Keine dauerhaften Aktualisieren-Knöpfe. |
| Ergebnisse | Aufklappbare Kategorieergebnisse, Wörter/Joker/Bonus, Gesamtsumme; graue fertige/beendete Spiele in Dock und Ergebnisarchiv. |

## Supabase und Berechtigungen

Eigener interner Namensraum dock_sieve mit games, players, claims, words, categories, deck, turns, receipts. RLS auf allen acht Tabellen, explizite Deny-Policies und keine direkten Tabellen-Grants für anon/authenticated. Fremde Spiele in Dock werden über auth.uid()/owner_id abgewiesen. Kein Service-Role-/Secret-Key im Frontend und keine privilegierten Test-Endpunkte.

Interne Definer-Funktionen haben leeren search_path; öffentliche Schnittstellen sind Invoker-Wrapper. manage nur authenticated; begrenzte Teilnehmerfunktionen status/claim/player/word/action mit Token/Secret-Prüfung für anon/authenticated. Interne Kategorie-/Zugsteuerung nicht direkt ausführbar. FK-Verknüpfungen binden Spieler, Wörter, Kategorien und Aktionen an dasselbe Spiel; unterstützende Indizes vorhanden.

Alle verändernden Aktionen sperren dieselbe Spielzeile. Aktionsbelege sind eindeutig pro Spiel/UUID und an Spieler/Anfragesignatur gebunden. Wiederholung liefert die ursprüngliche Antwort. Zug-/Wortnummern und Kategorie verhindern das Weiterschalten durch verspätete neue Anfragen. Die Belege enthalten eine Signatur und ein ok-Ergebnis, keine Klartext-Wörter. Nur die Worteingabetabelle speichert Begriffe. Reset der Namensbelegung widerruft den bisherigen Secret, ohne Worteingaben, Team oder Punkte zu löschen.

Angewandte Migrationen in Reihenfolge:

1. red_sieve_private_game_engine — database/red_sieve.sql
2. red_sieve_submit_retry_column_scope — database/red_sieve_action_fix.sql
3. red_sieve_preserve_completed_owner_results — database/red_sieve_admin_archive.sql
4. red_sieve_joker_distinct_term — database/red_sieve_distinct_joker.sql

Die erste Quelldatei enthält bereits die abschließenden Definitionen; ergänzende Dateien dokumentieren die angewandten Korrekturen. Keine bestehenden Spiele/Dokumente/Todos/Finanzdaten migriert oder verändert.

## Dateien und Testergebnisse

- Neue Seite sieve.html und Module js/games/sieve-admin.js, sieve-data.js, sieve-public.js, sieve-controller.js, sieve-results.js.
- Integration index.html, js/app.js, js/navigation.js, js/games/games.css. Cache-Version v1.96 in den bestehenden Spiele-Einstiegspunkten/Importen; keine Imposter-/Promi-Verhaltensänderung.
- Neue SQL-Dateien oben; neue Tests tests/red-sieve.sql, red-sieve-config.sql, sieve-admin.test.cjs, sieve-controller.test.cjs, sieve-public.test.cjs, sieve-api-smoke.py. Bestehender Navigationstest um neue eigene Zurück-Behandlung ergänzt.
- Alle 27 lokalen Testsuiten erfolgreich; neue JS-Syntaxprüfungen erfolgreich. Bestehende Dokumenten-, Auth-, Push-, Finanz-, Routinen-, Imposter- und Promi-Tests bleiben grün.
- Zwei echte Supabase-SQL-Testläufe erfolgreich, einschließlich anonymer/angemeldeter Rollen, fremder Besitzer, privater Hilfsfunktionen, Claim-Kollision/Widerruf, Word-Privacy, kompletten Spielen und allen obigen Sonderfällen. Ausschließlich synthetische Spiele innerhalb vollständiger Rollback-Transaktionen; keine echte Spielrunde geändert. Zeitabläufe wurden durch Verschieben ausschließlich synthetischer Deadlines simuliert; kein tatsächliches 60-Sekunden-Warten als Nachweis behauptet.
- Echte HTTP-Aufrufe mit vorhandenem öffentlichen Frontend-Key: ungültiges status nicht verfügbar, player null, word/claim/action abgewiesen, anonyme Verwaltung abgewiesen. Keine persistenten HTTP-Testfixtures angelegt.
- Supabase Security Advisor: keine neue Warnung. Vorhanden bleibt [Leaked Password Protection Disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Noch offen

Physischer iPhone/PWA-Test mit echter Touch-Bedienung/Unterbrechungen, ein kompletter realer Mehrgeräte-Ablauf mit gemeinsamem 60-Sekunden-Countdown und echte gleichzeitige HTTP-Rennprüfungen. SQL-Rollen-/Lock-/Wiederholungsprüfungen und DOM-/Uhr-Mocks ersetzen diese Live-Abnahme nicht. Issue 27 bleibt deshalb zur Abnahme offen; keine pauschale vollständige Live-Freigabe.
