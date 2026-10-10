# Rotes Sieb · Bedienung und Zugdauer · v1.97 · 2026-10-10

Ergänzung zum Bericht red-sieve-issue-27-2026-10-10.md: ersetzt dessen zweistufigen Start und feste Zugdauer.

- Eigene Namenszeile zeigt das eigene Team, sobald Teams gebildet wurden.
- Separate Joker-Restanzeige entfernt; Restzahl bleibt am Joker-Knopf.
- „Ich bin dran“ startet direkt mit einer einzigen serverseitigen Aktion. Kleiner Hinweis: „Der Timer startet sofort. Mach dich vor dem Klicken bereit.“
- Dock-Konfiguration: Zugdauer 10–300 ganze Sekunden, Standard 60. Nach Spielstart gesperrt wie die übrigen Einstellungen. Bestehende Spiele erhalten 60 Sekunden; laufende Deadlines bleiben unverändert.
- Server validiert Dauer und aktive Person. Wiederholungen, auch mit neuer Operations-ID, verlängern die Deadline nicht. Alter bestätigter Zustand bleibt kompatibel mit bereits geöffneten älteren Clients.
- Supabase-/Postgres-Vorgaben: bestehende Sperren, Besitzprüfung, private Tabellen, leere search_path und Ausführungsrechte bleiben erhalten. Keine neue öffentliche privilegierte Schnittstelle.

## Durchgeführte Prüfungen

- Alle 27 lokalen Testsuites erfolgreich: insbesondere Namens-/Teamzeile, fehlende separate Joker-Zeile, Ein-Klick-Start/Bestandsschutz, Hinweistexte, 90-Sekunden-Konfiguration, Timer/Privatsphäre sowie übrige Module.
- Beide bestehenden SQL-Integrationstests auf Supabase erfolgreich, nur synthetische Spiele in vollständig zurückgerollten Transaktionen. Ergänzt: direkte Starts ohne vorheriges Bestätigen, fremde Starts verweigert, Standard 60 Sekunden, konfigurierter 90-Sekunden-Timer, Grenzen 9/301 verweigert, wiederholte Starts ändern Deadline nicht. Bestehende Kategorien, Joker, Ergebnisarchiv und Zugrotation erfolgreich.
- Reale HTTP-Negativtests erfolgreich: ungültiger Status/Spieler, ungültige Wort-/Belegungs-/Aktionsanfragen und anonyme Verwaltung. Keine Testkonten oder Testdateien erzeugt.
- Supabase Security Advisor: keine neuen Warnungen. Bestehend offen: Leaked Password Protection Disabled. Anleitung: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Grenzen

DOM-/CSS-Tests ersetzen keinen physischen iPhone-Test. Positiver Liveablauf mit mehreren Browsern und tatsächlich gleichzeitigen HTTP-Aktionen bleibt wie im Issue-27-Bericht offen; Issue 27 wird nicht als vollständig live abgenommen bezeichnet.
