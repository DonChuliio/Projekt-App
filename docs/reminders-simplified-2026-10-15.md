# Erinnerungen · reduzierte Oberfläche · v1.102 · 2026-10-15

Ersetzt die entsprechenden UI-/Zeitzonenentscheidungen aus planner-reminders-issue-31-2026-10-15.md.

- Planner-Kachel zeigt nur Glockenpiktogramm und „Erinnerungen“. Keine Titel-/Termin-Vorschau, Lade-, Leer- oder Fehlermeldung in der Kachel. Die kommende Liste wird erst in der geöffneten Erinnerungsansicht geladen.
- Keine Zeitzonenauswahl. Browserstandort/-Zeitzone beeinflusst die Versandzone nicht: fest Europe/Berlin in Datennormalisierung und Supabase-Trigger, auch für ältere Clients.
- Vorprüfung: alle bestehenden Erinnerungen bereits Berlin; keine bestehenden Termine oder Inhalte verändert.
- Genannte Push-/Standardzeit-/Zeitzonen-/Zeitumstellungshinweise vollständig aus Formular und Detailseite entfernt. Datums-/Zeitzeilen zeigen ebenfalls keine technische Zeitzone mehr.
- Ohne Uhrzeit bleibt intern 09:00 Berliner Zeit; Sommer-/Winterzeit, Zustellreservierung, Morgenansicht und übrige Push-Logik unverändert. Keine neue Edge-Version nötig.

Tests: alle 31 lokalen Testsuites erfolgreich. Erweiterte DOM-Tests prüfen fehlende Vorschau, kein Laden auf der Planner-Seite, keine Zeitzonenfelder/Hinweistexte, Anlegen/Bearbeiten mit Berlin sowie bisherige Fehler-/Lösch-/Abbruchabläufe. Echter rollback-basierter DB-Test planner-reminders-rls.sql erfolgreich: anlegen/lesen/bearbeiten, Sommer-/Winterzeit und fremde Identität; sogar bei angeforderter America/New_York-Zone bleibt Europe/Berlin mit korrekter UTC-Zeit gespeichert. Migration planner_reminders_always_berlin erfolgreich angewendet. Advisor ohne neue Warnungen.

Die offenen Versand-/iPhone-Abnahmen aus dem Bericht zu Issue 31 bleiben offen; diese kosmetische Änderung stellt keine vollständige Versandfreigabe dar. Bekannt und unverändert: Leaked Password Protection Disabled, Anleitung https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
