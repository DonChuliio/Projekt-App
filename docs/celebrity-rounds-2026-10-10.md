# Promi-Raten: Namensübernahme und Runde beenden · v1.95

Nach Abschluss einer Runde behalten Teilnehmer ihren bestätigten Namen. Die nächste Runde öffnet direkt die Vergabe eines neuen Promis für den frisch zufällig zugeordneten Empfänger. Die Ergebnisse der vorherigen Runde bleiben darunter sichtbar und werden beim Neuladen serverseitig erneut geliefert. Promis und Notizen werden weiterhin pro Runde zurückgesetzt.

Dock bietet jetzt Runde beenden statt Runde zurücksetzen. Bereits gespeicherte Plätze bleiben unverändert; alle übrigen Teilnehmer erhalten keinen numerischen Platz und erscheinen als Unplatziert. Auch eine vorzeitig beendete Runde wird in Historie und Statistik gespeichert. Anschließend beginnt die nächste Rundennummer mit demselben Gruppenlink und denselben gültigen Namensbelegungen. Bei elf Teilnehmern und fünf Gewinnern werden genau fünf Plätze und sechs unplatzierte Ergebnisse gespeichert. Eine individuelle, durch Dock zurückgesetzte Belegung bleibt aufgehoben und wird nicht in die nächste Runde übernommen.

## Datenbank und Rechte

Angewandt: celebrity_preserve_identity_and_finish_round, Quelltext database/celebrity_round_finish.sql. Keine bestehenden Ergebnisse oder Spiele nachträglich verändert.

Namensbelegungen werden ausschließlich von der zuletzt abgeschlossenen Runde in die neue Runde übernommen. Derselbe zufällige Belegungs-Secret bleibt bestehen; seine Eindeutigkeit gilt jetzt innerhalb jeder Runde. Alle Teilnehmer-RPCs prüfen weiterhin Gruppenlink, Runde und Secret gemeinsam. RLS, direkte Tabellenverbote und Funktions-Grants unverändert. Kein öffentlicher Verwaltungsendpunkt hinzugefügt. Die Besitzerprüfung und das Spiel-Zeilenschloss bleiben erhalten. Der neue Dock-Aufruf übermittelt die aktuelle Runde-ID: verspätete oder doppelte Abschlüsse derselben Runde dürfen nicht die Folgerunde beenden. Der bisherige interne Reset-Aufruf führt für ältere Clients ebenfalls zum Abschließen und Weiterzählen, nicht mehr zum Verwerfen.

Vergangene Platzierungen enthalten nur Namen und Plätze, keine Promis. Alte Eingabe- und Aufdeckaktionen werden weiter abgewiesen. Ein verspätetes Gewonnen für einen unplatzierten Teilnehmer einer abgeschlossenen Runde fügt keinen Platz nachträglich hinzu.

## Nachweise

- Alle 24 lokalen Testsuiten erfolgreich. Erweiterte Controller-Tests: gleiche Identität in Folgerunde, kein erneuter Claim, Notizen gelöscht, Ergebnisse nach Reload erhalten, Belegungsreset weiterhin wirksam. DOM-Tests: direkte Promi-Vergabe ohne Namensdropdown, vorherige Platzierungen und Unplatziert; Dock-Abschluss und Fehlerfall. Layouttests für die feste Zweispaltenanzeige aus v1.94 bleiben erfolgreich.
- Reale Supabase-SQL-Prüfung mit elf Teilnehmern: vollständige Runde automatisch abgeschlossen; Namen übernommen; Eingaberunde vorzeitig ohne Plätze abgeschlossen; weitere Ratephase mit fünf Plätzen und sechs unplatzierten Teilnehmern abgeschlossen. Historie, Folgerundennummer, aufgehobene Einzelbelegung, vorherige Ergebnisse und gesperrte Altaktionen erfolgreich geprüft. Veraltete Runde-ID abgewiesen. Alle synthetischen Testdaten durch Rollback entfernt.
- Spielübergreifender Statistiktest in Supabase erfolgreich, vollständig zurückgerollt. Reale HTTP-Grenztests für ungültige/anonyme Zugriffe erfolgreich.
- Security Advisor: keine neue Warnung, bestehender Hinweis [Leaked Password Protection Disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) bleibt bestehen.

Geänderte Funktionen: js/games/celebrity-controller.js, celebrity-public.js, celebrity-admin.js; neue SQL-Datei; Tests celebrity-controller.test.cjs, celebrity-public.test.cjs, celebrity-admin.test.cjs, celebrity.sql. Cache-Version der bestehenden Einstiegspunkte und Spieleimporte v1.95. Keine Imposter-Funktionsänderung.

Offen bleiben die echte iPhone/PWA-Sichtprüfung und parallele HTTP-/Mehrgeräte-Abnahme. Die Namenswahl bleibt vertrauensbasiert; Speicherung im selben Browser-Tab wie zuvor. Issue 26 bleibt bis zur Live-Abnahme offen.
