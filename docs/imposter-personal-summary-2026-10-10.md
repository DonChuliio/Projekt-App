# Imposter: persönliche Abschlussbilanz · v1.92

Die Abschlussmeldung auf dem öffentlichen Gruppenlink bleibt erhalten. Bereits zugeordnete Spieler sehen darunter beispielsweise: „Du warst als Alex 3 Mal Imposter und hast davon 1 Runde gewonnen.“ Singular/Plural für Siege berücksichtigt. Vorhandene Spielerzuordnung reicht auch nach Neuladen. Kein neues Auswählen von Namen nach Spielende, keine neue Runde und keine Rollen-/Wortanzeige.

Imposter-Runden zählen ab Wortfreigabe. Zugewiesene Rollen einer noch nicht gestarteten Runde zählen nicht. Bereits laufende, ohne Ergebnis beendete Runden zählen als Imposter-Einsatz, aber nicht als Sieg. Siegerzählung berücksichtigt ausschließlich eigene Imposter-Rollen mit Gewinner imposter, nicht normale Spieler- oder Rundenleitungs-Siege.

## Sicherheit und Architektur

Neue schmale Lese-RPC `imposter_personal_summary` mit Invoker-Wrapper und privater Definer-Funktion im bestehenden internen Schema. Zugriff ausschließlich bei beendetem Spiel und passender Kombination aus Gruppenlink und bereits ausgestelltem opaque Spieler-Secret. Rückgabe nur eigener Name und zwei Zähler. Keine Player-ID als frei wählbarer Eingabeparameter, kein Zugriff allein über Link/Namen, keine Rollenlisten/Wörter/Hinweise. Explizite Funktions-Grants, leerer search_path, keine Tabellenfreigaben oder RLS-Abschwächungen. Bestehende Supabase-Daten und gespeicherte Spielercredential werden wiederverwendet; Statistiken selbst nicht in localStorage gespeichert. Gescheiterter Abruf behält Credential für erneuten Versuch, gelöschtes Spiel oder ungültige Belegung entfernt sie. Gruppenlink bleibt für alle Spielaktionen deaktiviert.

Skill Supabase genutzt für Prüfung von Funktionen/Berechtigungen und Advisor-Nachprüfung; offizielle Funktionsdokumentation berücksichtigt. Migration `imposter_credential_scoped_final_summary` erfolgreich angewandt. Keine Datenbestände dupliziert.

## Dateien und Tests

`database/imposter_personal_summary.sql`, `js/games/public-controller.js`, `js/games/public.js`; Cache-Version v1.92 in App-/Spielseite und Imports. `tests/imposter-summary.sql`, `tests/imposter-summary.test.cjs`; zwei bestehende öffentliche Controller-/UI-Tests angepasst.

Alle 21 lokalen Testsuiten und Syntaxprüfungen erfolgreich. Neue Controller-Prüfung: Abschluss bei offenem Link, Credential bleibt für Neuladen, keine Statistiken im lokalen Speicher, Fehler/Retry, keine Rollen-/Start-/Claim-Aktionen nach Spielende, gelöschtes Spiel entfernt Bilanz und Credential, Link ohne Credential fordert keine persönlichen Daten an. UI-Test: Abschlussmeldung plus persönliche Bilanz und korrekte Singular-/Plural-Ausgabe.

Realer Supabase-SQL-Test vollständig zurückgerollt: sechs synthetische Spieler, vier gespielte Runden mit Imposter-/Spielersiegen und weitere unvorbereitete Runde; eigener Name und exakte Zähler für alle sechs Spieler über anon-RPC geprüft, aktive Spiele/fehlende oder falsche Secrets/falsche Tokens liefern keine Bilanz, keine zusätzlichen Felder, Status bleibt unavailable, Spiel löschen verhindert weitere Statistikabfrage. Keine echten Spiele geändert. Testskriptfehler beim temporären Parameternamen korrigiert; danach erfolgreich.

Security Advisor: nur bereits bekannte Warnung Leaked Password Protection Disabled, keine neue Warnung. [Supabase-Hinweis](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Tatsächliche iPhone-/Browser-/HTTP-/Paralleltests weiterhin offen. Ohne erhaltene Spielerzuordnung (z. B. gelöschter Browserspeicher oder zurückgesetzte Belegung) erscheint nur die allgemeine Abschlussmeldung. Das bestehende Namenswahlsystem ist keine verifizierte Personenidentität.
