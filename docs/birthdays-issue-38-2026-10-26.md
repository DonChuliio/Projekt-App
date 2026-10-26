# Geburtstage – Issue 38 – v1.111

## Verhalten

Planer → Geburtstage bietet Hinzufügen, Anzeigen, Bearbeiten und Löschen mit Name und Geburtsdatum. Die Liste sortiert nach dem nächsten jährlichen Termin. Bearbeiten und Löschen verwenden die bestehende ID. Zurück führt eine Ebene zurück, Home zum Dashboard. Einträge und Formulare werden bei einem Kontowechsel geleert; verspätete Antworten werden verworfen.

Die Guten-Morgen-Ansicht zeigt „Anstehende Geburtstage“ nur bei mindestens einem Termin im Zeitraum heute bis einschließlich sechs Kalendertage später. Namen, Termin und „Heute“/verbleibende Tage werden chronologisch angezeigt. Ohne Treffer ist die gesamte Sektion einschließlich Überschrift verborgen. Bei Ladefehlern bleibt sie verborgen; ein separater Fehlertext verhindert eine irreführende Aussage, es gebe keine Geburtstage. Bestehende To-dos und Erinnerungen laden weiterhin unabhängig.

Die Wiederholung ignoriert das ursprüngliche Geburtsjahr. Kalenderberechnungen verwenden das lokale Datum und rechnen anhand von Kalendertagen, unabhängig von 23-/25-Stunden-Tagen. Jahreswechsel werden berücksichtigt. Der 29. Februar wird in Nichtschaltjahren am 28. Februar berücksichtigt. Es werden keine Pushs oder Kontaktimporte angelegt.

## Speicherung und Rechte

Die bestehende Datenbank enthielt keine Geburtstagstabelle. `database/planner_birthdays.sql` ergänzt `public.planner_birthdays`. Eigentümer ist standardmäßig `auth.uid()`. RLS beschränkt SELECT/INSERT/UPDATE/DELETE jeweils auf diesen Eigentümer. Benutzer dürfen nur Name und Geburtsdatum schreiben, niemals ID/Eigentümer/Erstellzeit ändern. Anonyme Benutzer erhalten keine Tabellenrechte. Der Eigentümer-Index unterstützt RLS und die paginierte Abfrage.

Der Client verwendet die bestehende Authentifizierung und einen öffentlichen Projektschlüssel. Antworten werden nicht im Browser-Storage abgelegt; Anfragen verwenden `cache: no-store`. Name und Datum werden validiert, Texte ausschließlich als Text gerendert. Auch während einer Anfrage wird ein Wechsel des angemeldeten Kontos geprüft. Alle Geburtstage werden in 200er-Seiten abgefragt, um die Standardlimitierung des Datenzugriffs nicht still zu übernehmen.

## Prüfungen und Ergebnisse

| Prüfung | Ergebnis |
| --- | --- |
| `birthdays-model-data.test.cjs` | Bestanden: Validierung, jährliche Reihenfolge, heute/6/7 Tage, Jahreswechsel, Schalttag, Zeitumstellung, Pagination, authentifizierte CRUD-Payloads, Fehler und Kontowechsel. Ausgeführt mit Europe/Berlin, America/New_York und Pacific/Auckland. |
| `birthdays-morning.test.cjs` | Bestanden: gesamte Sektion ein-/ausblenden, exaktes Fenster, Reihenfolge, Jahreswechsel, Navigation, Ladefehler unabhängig von To-dos/Erinnerungen, verspätete Antwort eines anderen Kontos. |
| `birthdays-ui.test.cjs` | Bestanden: Hinzufügen, Anzeigen, Bearbeiten bei gleicher ID, Neuladen, Abbrechen, Mehrfachklickschutz, Speicher-/Löschfehler, erneuter Ladeversuch und Kontowechsel. DOM-Mocks. |
| Bestehende Morgen-/Navigations- und übrige Regressionstests | Bestanden: insgesamt 43 Testdateien, ohne die beiden unfertigen lokalen Faktenhilfe-Tests aus Issue 33. |
| Produktive Datenbankmigration | Erfolgreich ausgeführt. Keine vorhandenen Tabellen oder Daten verändert. |
| Produktive Metadatenprüfung | Bestanden: RLS aktiv, vier Policies vorhanden, `anon` hat kein SELECT, `authenticated` darf Namen anlegen und `user_id` nicht ändern. |
| Anonyme echte REST-Anfrage | Bestanden: `GET /rest/v1/planner_birthdays?select=id` mit öffentlichem Projektschlüssel und ohne Anmeldung liefert HTTP 401. |
| Supabase Security Advisors | Keine neue Warnung zur Geburtstagstabelle. Die bereits bekannte Auth-Warnung zu deaktiviertem Schutz gegen kompromittierte Passwörter und INFO-Meldungen für zwei private Lebensmittelsuchtabellen bestehen unabhängig weiter. |
| `tests/birthdays.sql` | Vorbereitet, Ergebnis offen: Das Datenbankwerkzeug bricht Transaktionen zum angemeldeten CRUD-/RLS-Test mit `Invalid or expired requestState` ab. Auch eine verkürzte CRUD-Transaktion war betroffen. Keine bestandene echte Schreibprüfung behauptet. |
| iPhone/Safari und echte Anmeldung → CRUD → Neuladen | Offen: hier kein ausführbarer lokaler Browser verfügbar. Die DOM-Tests ersetzen keine physische iPhone-Prüfung. |

Nach den abgebrochenen Transaktionsprüfungen wurden null synthetische Testeinträge in der Tabelle bestätigt.

Die vorhandenen Dateien der unfertigen Faktenhilfe aus Issue 33 werden nicht mit veröffentlicht.
