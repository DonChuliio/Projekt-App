# Issue #25 – Spiele / Imposter

Stand: 09.10.2026, Dock v1.75. Implementierung vorhanden; vollständige Abnahme bleibt offen.

## Verhalten

Dashboard → Spiele → Imposter nutzt die vorhandene Navigation mit getrenntem Zurück und Home. Angemeldete Eigentümer erstellen Spiele mit dauerhaftem Gruppenlink, verwalten Teilnehmer und starten explizit Runden. Wort, optionaler Hinweis und ein oder zwei Imposter werden pro Runde konfiguriert. Die gewählte Spielleitung ist kein Spieler; Rollen entstehen zufällig auf dem Server. Teilnehmeränderungen schließen eine laufende Runde, statt ihre Rollenverteilung nachträglich zu verändern. Entfernte Teilnehmer bleiben intern in der Rundenhistorie erhalten.

Der Gruppenlink öffnet eine separate öffentliche Smartphone-Seite ohne Dock-Anmeldung. Sie lädt ausschließlich Namen, Belegungsstatus und Rundenmetadaten. Namensauswahl liefert nur die eigene Rolle. Die öffentliche Spielleitung erhält weder Wort noch Hinweis. Verbergen entfernt die Rolleninhalte aus dem DOM und dem Controllerzustand. Die Seite prüft alle drei Sekunden den Rundenstatus, erkennt zurückgesetzte Belegungen ohne erneuten Download des Wortes und pausiert im Hintergrund. Beim Verbindungsfehler wird die Rolle verborgen.

Nur ein zufälliges, rundengebundenes Zugriffstoken liegt im sessionStorage des aktuellen Tabs, damit erneutes Öffnen/Reload innerhalb derselben Runde funktioniert. Weder Name noch Wort noch Hinweis werden dort gespeichert. Bei neuer oder geschlossener Runde wird dieses Token gelöscht; der Name muss neu ausgewählt werden. Kein dauerhaftes Geräteprofil. Keine WhatsApp-API: Teilen ist ein vom Benutzer ausgelöster WhatsApp-Link.

## Sicherheit und Integrität

Privates Schema `dock_game`, RLS auf sämtlichen fünf Tabellen und keine direkten Tabellengrants für anon/authenticated. Öffentliche SECURITY-INVOKER-Wrapper rufen schmale private Funktionen mit SECURITY DEFINER und leerem search_path auf. Nur die Verwaltungsfunktion ist für authenticated ausführbar; sie prüft auth.uid() und Eigentümer bei jeder Aktion. Rollen und Claim-Secrets werden niemals gesammelt ausgeliefert. Normale Spieler erhalten ihr Wort; Imposter ausschließlich ihren Hinweis; Spielleitung ausschließlich den Status host.

Änderungen, neue Runden und Namensbelegung sperren denselben Spiel-Datensatz mit FOR UPDATE. Namensbelegungen sind zusätzlich pro Runde/Teilnehmer eindeutig, Rollenzeilen ebenfalls. Rundenerstellung einschließlich Zufallsverteilung und Umschaltung erfolgt in einer Transaktion. Alte Zugriffstoken funktionieren nach Rundenwechsel nicht mehr. Keine Secrets im Frontend, keine Wort-/Hinweis-URLs, keine Inhaltslogs, API-Anfragen mit no-store.

Bewusste Vertrauensgrenze: Wer den Gruppenlink kennt, kann einen fremden Namen auswählen. Es gibt keine Identitätsprüfung; die Sperre verhindert versehentliche Doppelbelegung, keinen absichtlichen Betrug. Belegungen können durch den Eigentümer zurückgesetzt werden. Ein bereits angesehenes Wort kann technisch nicht aus dem Gedächtnis eines Teilnehmers entfernt werden. Rundenwechsel wird bei sichtbarer, verbundener Seite innerhalb des Pollingintervalls erkannt.

## Dateien und Migrationen

- `index.html`, `js/app.js`: neue Kachel und zwei Dock-Ansichten, Initialisierung, v1.75.
- `imposter.html`: separate öffentliche Seite, CSP, no-referrer, kein Dock-Auth-Bootstrap.
- `js/games/admin.js`, `admin-data.js`: Verwaltung und authentifizierter Datenzugriff mit Prüfung von Sitzungswechseln.
- `js/games/api.js`: schmaler RPC-Client, öffentliche Aufrufe ohne Benutzer-Authorization.
- `js/games/public-controller.js`, `public.js`, `games.css`: Rollenabläufe, Polling, responsive Darstellung.
- `database/imposter_game.sql`: neues Schema, Tabellen, RLS, zufällige Rollen, Sperren und RPCs.
- `database/imposter_private_deny_policies.sql`: explizit verweigernde Policies für Rollen/Belegungen.
- `database/imposter_claim_valid.sql`: schmale Prüfung eines rundengebundenen Zugriffstokens.
- `database/imposter_manage_name_fix.sql`: Korrektur einer im ersten SQL-Test gefundenen mehrdeutigen Namensvariablen; auch im Basisskript korrigiert.

Alle vier Migrationen wurden in `osmmjfuzuxhwtfcttdxp` angewandt. Keine bestehenden App-Tabellen oder Benutzerdaten verändert.

## Nachweise je Akzeptanzkriterium

| Nr. | Ergebnis | Prüfung |
| --- | --- | --- |
| 1 | Bestanden auf Datenbank-/DOM-Ebene | `tests/imposter.sql`: 11 Teilnehmer, 20 Runden, wechselnde Spielleitung, genau zehn aktive Rollen. `tests/imposter-admin.test.cjs`: Teilnehmerverwaltung und Hostwechsel. |
| 2 | Bestanden auf Datenbank-/DOM-Ebene | Derselbe Share-Token über 20 Runden; derselbe erzeugte Gruppenlink über zwei Verwaltungsrunden. Tatsächliche WhatsApp-/iPhone-Nutzung noch offen. |
| 3 | Bestanden auf Datenbank-Ebene | Jede der 20 Runden hat exakt die konfigurierte Imposter-Anzahl; Spielleitung hat nie eine Rolle. Verteilung serverseitig per `gen_random_uuid()`. Kein statistischer Zufallstest behauptet. |
| 4 | Bestanden auf Datenbank-/Controller-Ebene | Eigentümer sieht Wort/Hinweis; öffentliche Spielleiterantwort ist ausschließlich `{"role":"host"}`; keine Inhaltsfelder. |
| 5 | Bestanden im Controller-Test | Neue Runde löscht Auswahl/Token/Rolle, erneutes Öffnen und Reload derselben Runde funktionieren, alte asynchrone Claim-Antworten verworfen; Hintergrund, Schließen, Zurücksetzen und Verbindungsfehler getestet. Polling-Integration mit echtem mobilen Browser noch offen. |
| 6 | Teilweise geprüft | Wiederholte Belegung abgelehnt, alte Token ungültig, Fremdverwaltung/Reset und anonyme Verwaltung sowie direkte private Tabellenabfragen verweigert, öffentliche Daten minimiert. Echter Paralleltest und HTTP/JWT-End-to-End-Test noch offen. |
| 7 | Bestanden | Dateien, Migrationen, Tests und Einschränkungen hier dokumentiert. |

`tests/imposter.sql` lief erfolgreich gegen die echte Datenbank mit SQL-Rollen authenticated/anon; sämtliche synthetischen Spiel-, Teilnehmer-, Runden- und Claim-Daten innerhalb einer vollständig zurückgerollten Transaktion. Es wurden keine Testkonten angelegt. Die rollenbasierten SQL-Tests ersetzen keinen echten HTTP/JWT-Test mit zwei Browserclients.

`tests/imposter-controller.test.cjs`: Wartestatus, eigene Rolle/Spielleitung, Verbergen/Öffnen, Reload, Rundenwechsel, verspätete Antworten, doppelte Klicks, Reset, Verbindungsfehler/Wiederherstellung, Hintergrundschutz, Rundenschließen, kurzlebiger Tab-Speicher und öffentliche/authentifizierte RPC-Trennung bestanden.

`tests/imposter-admin.test.cjs`: DOM-Bedienung Spiel erstellen, elf Namen hinzufügen, zwei Runden starten, Hostwechsel, ein/zwei Imposter, konstanter Link, Belegung zurücksetzen, schließen, umbenennen, Entfernen abbrechen und bestätigen bestanden. RPC-Backend in diesem DOM-Test gemockt.

Alle **17 lokalen Testsuiten** bestanden, einschließlich bestehender Dokumenten-, Finanz-, Auth-, Push- und Routinentests. Navigationstest prüft getrennte Home/Zurück-Schaltflächen für **38 Modulansichten**. Kein realer iPhone-Test und keine visuelle Browserabnahme behauptet.

Security Advisors nach Migration: keine neuen RLS-Warnungen; vorhandene Warnung „Leaked Password Protection Disabled“ weiterhin offen. Kontrollabfrage nach SQL-Tests: **0 synthetische Spiele übrig**.

## Blockierte Prüfung / offene Abnahme

Die automatische Freigabeprüfung hat die Vorbereitung eines echten Paralleltests abgelehnt: Dafür hätte ein kurzzeitig persistentes synthetisches Spiel im Live-Projekt unter einem bestehenden Benutzer angelegt werden müssen. Der öffentlich erreichbare Testdatensatz wurde als nicht freigegeben bewertet. Die abgelehnte Aktion wurde nicht ausgeführt oder über einen anderen Weg umgangen. Es existiert keine Testfixture. Lokaler PostgreSQL-Server ist in dieser Umgebung nicht verfügbar.

Offen: ausdrückliche Freigabe für ein kurzlebiges synthetisches Live-Testspiel mit anschließender vollständig gezielter Bereinigung, echter Test zweier paralleler Belegungen/Rundenstarts, HTTP/JWT-End-to-End-Prüfung sowie Bedienungsprüfung auf dem iPhone. Issue #25 deshalb nicht geschlossen und keine vollständige Abnahme behauptet.
