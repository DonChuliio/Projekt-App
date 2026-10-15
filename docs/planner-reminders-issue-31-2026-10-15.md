# Issue 31 · Planner-Erinnerungen · v1.101 · 2026-10-15

## Implementierung

Eigene Planner-Kachel mit SVG-Glocke, nächster Erinnerung oder Lade-/Fehler-/Leerzustand. Eigenständige kommende Liste, Detail- und gemeinsame Neu-/Bearbeitungsmaske. Pflicht: Titel/Datum; optional: Uhrzeit/Beschreibung. Anzeigen, Bearbeiten, bestätigtes Löschen, Abbrechen, getrennte Zurück-/Home-Navigation. Keine Checkbox, kein Erledigt-Status, keine To-do-Daten oder To-do-Statistik. Vergangene Kalendertage werden ausgefiltert, nicht gelöscht; heutige Erinnerungen bleiben bis Tagesende sichtbar.

Morgenansicht bleibt einmal täglich vor 12 Uhr und verwendet das lokale Browserdatum. Heutige Erinnerungen und offene Priorität-A-To-dos werden unabhängig geladen, getrennt benannt/gezählt und direkt verlinkt. Zukunft/Vergangenheit erscheinen nicht als heute. Teilausfälle werden nicht als Nullbestand ausgegeben; Dashboard bleibt erreichbar.

## Standardzeit und Zeitzonen

Ohne Uhrzeit: 09:00 Uhr in der mit der Erinnerung gespeicherten IANA-Zeitzone, wie in der Maske und Detailseite angezeigt. Bei Neuanlage wird die Browser-Zeitzone vorgeschlagen. Nach Orts-/Zeitzonenwechsel bleibt eine bestehende Erinnerung absichtlich an ihrer gespeicherten Zone; sie kann im selben Formular geändert werden. Änderungen aktualisieren die UTC-Fälligkeit serverseitig. Bestehende To-do-/Finanz-Pushs bleiben um 09:00 Europe/Berlin.

Postgres AT TIME ZONE berücksichtigt Sommer-/Winterzeit: nicht existierende Uhrzeiten werden um die DST-Lücke verschoben (02:30 → 03:30), doppelte Uhrzeiten gelten einmal im Standardzeit-Offset. Die Maske erklärt dies. Ohne Wiederholungsfunktion.

## Supabase und bestehende Push-Infrastruktur

Migration database/planner_reminders.sql ist angewendet:
- Neue benutzerbezogene Tabelle planner_reminders; vier eigene RLS-Regeln. Keine fremden/anon Zugriffe. Owner kommt aus auth.uid(); Client darf Owner und berechnete Zeitfelder nicht schreiben.
- Indizes für Eigentümer/Datum und Fälligkeit; Trigger validiert Zeitzone und berechnet push_at.
- due_planner_reminders / claim_planner_reminder: SECURITY INVOKER, leere search_path, ausschließlich service_role ausführbar. Kein öffentlich privilegierter Testendpoint.
- Atomare Reservierung unter Zeilensperre in bestehendem push_deliveries-Bestand. Eindeutiger Reminder/Subscription-Schlüssel verhindert weitere Reservierungen, auch über Datum-/Titeländerungen und Zeitumstellung hinweg.
- Bestehender Cron-Job prüft minütlich, derselbe Vault-Token/Endpunkt bleibt erhalten. Keine zusätzliche Subscription-/Push-Berechtigungsstrecke.
- swift-processor v27 bereitgestellt, bestehende Cron-Authentifizierung und VAPID-Konfiguration beibehalten; verify_jwt=false wie zuvor, durch serverseitig verifizierten x-dock-cron-token geschützt.
- Bestehende Morgenlogik läuft nur um 09:00 Berliner Zeit, Minute 00. Bestehende Finanzregeln (2./Monatsletzter) und Routine-Zählung unverändert.
- Reminder-Push enthält Titel, optional kurze Beschreibung, gültige ID und Ziel. Bestehender Service Worker fokussiert vorhandenes Fenster; direkte Erinnerung über Auth/Reload hinweg, sonst Listen-Fallback. Ungültige Ziele/IDs werden ignoriert.

## Versandgrenzen

Versand wird im geplanten Minutenfenster geprüft, nicht nachgeholt. Nachträglich für einen bereits vergangenen Zeitpunkt erstellte/aktualisierte Erinnerungen werden nicht verspätet gesendet. Beschreibung/Titel werden bei Reservierung frisch gelesen. Löschen/Ändern verhindert noch nicht reservierten Versand; ein bereits an den Push-Dienst übergebener Versand lässt sich nicht zurückholen.

Wie bisher gilt At-most-once-Versuch pro Gerät: nach unklarem Netzwerkfehler kein automatischer Neuversuch, um Doppelmeldungen zu vermeiden. Ein Prozessabbruch nach Reservierung, ausgefallener Minuten-Cron oder blockiertes/offlines Gerät kann eine Zustellung verhindern. Kein technisch unmögliches Exactly-once-Empfangsversprechen. TTL 60 Sekunden begrenzt veraltete Offline-Zustellung. Bereits versandte Reminder werden bei Bearbeitung nicht erneut gesendet; für einen neuen Hinweis neue Erinnerung anlegen.

Nutzung bestehender Dienste/Quoten; kein kostenpflichtiger Dienst neu eingerichtet. Ein minütlicher Cron benötigt mehr bestehende Edge-/DB-Aufrufe.

## Prüfungen und Nachweise

| Prüfung | Ergebnis |
| --- | --- |
| Alle 31 lokalen Testsuites | Erfolgreich; bestehende Funktionen und vier neue Reminder-Suites |
| Formular/Detail/Listenansicht/CRUD | DOM-/API-Mocks erfolgreich, Fehler/Retry/Doppelklick, bestätigtes Löschen/Abbruch, gleiche ID statt Duplikat, Logout-Race |
| Morgenansicht | Mehrere heutige Erinnerungen, keine To-dos/leer, Einzahl/Mehrzahl, keine Zukunft/Vergangenheit, Teilfehler, einmal täglich/vor 12, Direktnavigation erfolgreich |
| Push-Logik | Mock-Transport: mehrere Erinnerungen, deaktiviert/keine Subscription, fremdes Gerät, unsichere Endpunkte, Reservierung/Recheck, 410, kein Doppelversand nach unklarer Antwort |
| To-do-/Finanz-Push | Bestehende Regressionen erfolgreich; Sommer-/Winter-09:00, DST-Tage, Routinezähler, Monatsregeln, keine zusätzlichen Morgen-Pushs um 09:30 |
| Navigation | 43 Modulansichten mit getrenntem Home/Back; Push-ID über Login/Reload und vorhandenes/neues Fenster geprüft |
| Echte reduzierte DB-Integration | tests/planner-reminders-rls.sql erfolgreich: authentifiziertes Anlegen/Lesen/Bearbeiten, Default 09:00 Sommer/Winter, Zone ändern, fremde RLS-Identität kann synthetischen Eintrag nicht lesen; vollständig zurückgerollt |
| Reale Zeitkonvertierung | Sommer, Winter, DST-Lücke, DST-Doppelstunde per SELECT alle true |
| Echte anonyme HTTP-Prüfung | Zugriff auf Reminder und Sender-RPC verweigert; Edge ohne Cron-Token 401 / GET 405. Keine Pushs ausgelöst |
| Produktiv-Cron | Aktiv, * * * * *; fünf zuletzt geprüfte HTTP-Antworten 200 |
| Supabase Advisor | Keine neuen Warnungen; bekannter Hinweis Leaked Password Protection Disabled bleibt bestehen |
| Aufräumen | Null synthetische Reminder nach Rollback bestätigt |

## Offene Abnahme / technische Blockade

Der vollständige SQL-Gesamttest tests/planner-reminders.sql mit temporärer Push-Subscription, echter Zustellreservierung und Lösch-/Fremdschreib-Prüfung wurde zweimal vom Tool mit Invalid or expired requestState abgebrochen. Nicht als bestanden gewertet und nicht weiter wiederholt. Stattdessen nur der wesentlich kleinere rollback-basierte Test ohne Subscription-/Delivery-Schreibzugriffe erfolgreich ausgeführt. Der vollständige Test bleibt zur Nachprüfung im Repository.

Kein echter Empfangstest auf physischem iPhone mit geschlossener PWA, kein positiver Zwei-Konten-HTTP-Test und kein tatsächlich gleichzeitiger HTTP-Reservierungstest durchgeführt. Diese Abnahmen bleiben offen; Issue 31 wird daher nicht geschlossen oder als vollständig abgenommen bezeichnet.

Bekannte, unveränderte Auth-Warnung: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
