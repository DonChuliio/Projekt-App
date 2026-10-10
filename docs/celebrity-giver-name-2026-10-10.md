# Promiraten · Begriffgeber anzeigen · v1.100 · 2026-10-10

Nach Namenswahl und erfolgreicher Prüfung der Belegung erscheint bei der Begriffseingabe und beim Raten „Deinen Begriff erhältst du von: [Name]“. Jede neue Runde verwendet ihre eigene gespeicherte Zuordnung.

Die bestehende, mit Teilnehmer-Geheimnis geschützte celebrity_player-Abfrage erhält nur giver_name aus der eingehenden Zuordnung derselben Runde. Kein eigener Begriff, keine neue Tabelle, kein neuer Endpoint oder zusätzliche Rechte. Vorige Platzierungen und laufende Spiele bleiben unverändert. Abgeschlossene Runden liefern giver_name=null. Namen werden per textContent ausgegeben.

Tests: Alle 27 lokalen Testsuites erfolgreich. DOM-Test: Begriffgeber während Eingabe/Raten, Aktualisierung zur nächsten Runde. Reale Supabase-Integrationstests celebrity.sql und celebrity-stats.sql erfolgreich, ausschließlich synthetische Spiele innerhalb vollständiger Rollbacks. Geprüft: eingehender statt ausgehender Zuordnungspartner, nicht eigener Name, keine eigenen Begriffsinhalte, ungültige Geheimnisse verweigert, neue Runde und bisherige Archiv-/Platzierungsabläufe. Security Advisor: keine neuen Warnungen; bekannt bleibt Leaked Password Protection Disabled (https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Kein physischer iPhone-/Mehrbrowser-Test in dieser Änderung durchgeführt. Keine Benutzerdateien oder bestehenden Spiele gelöscht.
