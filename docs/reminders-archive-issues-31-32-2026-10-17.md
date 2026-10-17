# v1.109 – Issues 31 und 32: Erinnerungen und dauerhaftes Archiv

## Issue 31 – geprüft, bereits umgesetzt

Issue 31 war bei Auftragsbeginn bereits geschlossen. Seine vorhandene Implementierung bleibt erhalten: eigenständige Erinnerungen, vier Eingabefelder, keine Checkboxen/To-do-Vermischung, Morgenmaske, bestehender minütlicher Scheduler und echte Web-Push-Infrastruktur.

Die später ausdrücklich vereinbarten Bedienungsänderungen haben Vorrang vor dem älteren Issue-Text: schlichte Planner-Kachel ohne Vorschau/Piktogramm, Berlin ohne Zeitzonenwahl, 09:00 als Startwert, keine Löschrückfrage, neutrale Bearbeiten-/Löschen-Piktogramme, Push-Titel ist der Erinnerungstitel und der Body die kurze Beschreibung. Keine erneute Einführung der entfernten Erklärungstexte.

Die Prüfung umfasste erneut den vollständigen rollback-basierten Datenbanktest `tests/planner-reminders.sql`: Anlegen/Ändern, Sommer/Winter, übersprungene und doppelte Uhrzeit, Berlin-Zwang, Pflichtfelder, RLS, Dienstberechtigungen, Gerätezugehörigkeit, Reservierungs-Deduplizierung, keine nachträgliche Push und Löschen. Er wurde erfolgreich im echten Projekt ausgeführt. Es wurden keine echten Benachrichtigungen ausgelöst.

## Issue 32 – Umsetzung

- „Erinnerungen“ bietet einen gut erreichbaren Archiv-Ordner mit bestehendem SVG-Stil und eigener App-Ansicht. Home bleibt direkt zum Dashboard; Zurück führt eine Ebene zurück, auch aus einer Archiv-Detailansicht.
- Kommende Erinnerungen und Archiv sind getrennte Abfragen. Archivierte erscheinen nicht mehr als kommend. Das Archiv zeigt Titel, Datum, ggf. Uhrzeit und auf der Detailseite die Beschreibung, neueste Termine zuerst. Archivdaten werden in Seiten zu 200 geladen, damit nicht stillschweigend nur die ersten 1.000 sichtbar sind.
- Die erfolgreiche, serverseitig registrierte **Annahme durch mindestens einen Push-Dienst** setzt `archived_at`. Das ist ausdrücklich keine Empfangs-/Anzeige-/Lesebestätigung am Gerät. Die Oberfläche sagt dies ebenfalls.
- Archivierte und anderweitig bereits verarbeitete Einträge sind schreibgeschützte Historie; Löschen bleibt wie zuletzt vereinbart direkt ohne Rückfrage möglich. Ausstehende Erinnerungen können unverändert bearbeitet werden. Für einen neuen Push ist eine neue Erinnerung nötig; alte IDs werden nicht erneut aktiviert.
- Der bisherige automatische Löschjob `dock-reminders-cleanup` wurde entfernt. Auch das historische Setup-SQL stellt keine automatische Löschung mehr her. Archivierte **und fehlgeschlagene/verpasste** Erinnerungen bleiben dauerhaft erhalten, sofern der Benutzer sie nicht selbst löscht.
- Einträge ohne bestätigten Versand stehen separat unter „Ohne bestätigten Versand“. Es werden keine falschen Zustellzusagen gemacht.
- Die Morgenmaske lädt separat alle heutigen Erinnerungen, auch solche mit bereits archivierter Push. Damit verschwindet der heutige Hinweis nicht nur deshalb aus der Morgenübersicht, weil der Push bereits verarbeitet wurde. To-dos bleiben getrennt gezählt und unverändert.

## Versandzustände und Fehler

| Zustand | Verhalten |
|---|---|
| pending | Ausstehend, bearbeitbar; bisherige Datum-/09:00-/Berlin-Regeln. |
| processing | Gerät(e) reserviert; noch kein bestätigter Erfolg. Keine erneute Reservierung desselben Geräts. |
| sent + archived_at | Mindestens ein Push-Dienst hat angenommen; dauerhaft im Archiv. |
| failed | Versandversuche fehlgeschlagen; bleibt sichtbar gespeichert, kein automatischer Neuversand. |
| no_subscription | Keine nutzbare Push-Anmeldung vorhanden; bleibt sichtbar gespeichert. |
| missed | Termin verpasst oder nachträglich angelegt; kein verspäteter Push, Eintrag bleibt erhalten. |
| uncertain | Reservierter Versand wurde nicht abschließend bestätigt; möglicherweise versendet, deshalb kein automatischer erneuter Transport. |

Vor dem ersten Transport werden alle aktuell geeigneten Geräte eines Eintrags reserviert. So verhindert die Archivierung nach dem ersten Erfolg nicht die Zustellung an die übrigen bereits reservierten Geräte. Neue Geräte erhalten keine archivierten Pushs nachträglich. Der bestehende eindeutige Geräte-/Erinnerungsindex bleibt aktiv.

`finish_planner_reminder` speichert den Geräte-Versandnachweis und die Archivierung in einer Transaktion. Eine wiederholte Bestätigung verändert Zähler nicht doppelt. Fehlerhafte/abgelaufene Subscriptions werden erst danach entfernt; die Erinnerung behält ihre serverseitigen Ergebniszähler auch dann, wenn der Geräte-Ledger per FK kaskadiert. Bei Teilerfolg wird archiviert und auf Fehler weiterer Geräte hingewiesen. Bei Datenbankfehler nach Transportannahme wird kein erneuter Transport riskiert; ohne bestätigten Nachweis wird zunächst nicht archiviert, später als unbestätigt gekennzeichnet.

Ein ausschließlich interner Abgleich erkennt ältere bestätigte Ledger-Einträge und offene/verpasste Zustände. Er läuft auch dann, wenn insgesamt keine Push-Subscriptions existieren. Bestätigte Alt-Nachweise werden nachgezogen; allein reservierte oder fehlgeschlagene Nachweise werden niemals als erfolgreich gewertet.

Eine bereits an den Push-Dienst übergebene/in Übertragung befindliche Nachricht kann durch anschließendes Löschen nicht zurückgerufen werden. Keine zusätzliche Benachrichtigung, kein zweites Push-System und keine neuen kostenpflichtigen Dienste.

## Daten und Zugriffsschutz

Migration `planner_reminders_permanent_archive` ist im Projekt angewandt. Sie ergänzt nur Status-, Zeit- und Zählerspalten in der bestehenden benutzerbezogenen Tabelle, einen Archivindex und einen Index für Versandnachweise. Keine Erinnerungen wurden durch die Migration gelöscht.

Bestehende eigene SELECT/INSERT/UPDATE/DELETE-RLS bleibt erhalten. Neue Archiv-/Statusspalten sind für Clients nur lesbar. Die internen Funktionen sind SECURITY INVOKER mit leerem Suchpfad und ausschließlich service_role zur Ausführung freigegeben. Die Edge Function behält ihre vorhandene Cron-Token-Prüfung; keine geheimen Schlüssel im Frontend, keine privilegierten Testendpunkte.

`swift-processor` Version 29 mit angepasstem Erinnerungshelfer bereitgestellt. Der vorhandene Scheduler läuft unverändert jede Minute; die bestehenden Morgen-/To-do-/Finanz-Pushs sind nach wie vor auf die bisherige Berliner Zeit und bestehenden Regeln begrenzt. Nachprüfung: 0 Löschjobs, Push-Cron aktiv, RLS aktiv, kein Client-UPDATE von archived_at und kein Client-EXECUTE der Versandbestätigung.

## Testnachweise

- **39 automatisierte Testdateien bestanden**, einschließlich aller bestehenden Rezept-, Dokumenten-, Spiele-, Finanz-, Auth- und Push-Regressionen.
- `tests/reminder-archive.sql` im echten Supabase-Projekt vollständig erfolgreich, anschließend Rollback: sechs synthetische Erinnerungen, zwei synthetische Geräte, Erfolg/Teilerfolg/Fehler/fehlende Anmeldung/Ungewissheit, Wiederholung und Wiederabgleich, Archivzugriff, Client-Rechteverweigerung, fremde JWT-Identität, anonyme Zugriffe, Archivlöschung und entfernter Löschjob. Kein Transport aufgerufen und keine Testobjekte dauerhaft hinterlassen.
- `tests/planner-reminders.sql` erneut im echten Projekt bestanden, vollständig zurückgerollt; insbesondere Berlin/Sommer-/Winterzeit, Zugriffsschutz und keine verspätete Zustellung.
- Versand-Mocks: Reservierung aller Geräte vor erster Archivierung, Teilerfolg, kompletter Fehler, abgelaufene Anmeldung, fehlende/unsichere Anmeldung, Bestätigung vor Löschkaskade, Fehler beim Nachweis und keine doppelten Transporte.
- UI-DOM-Tests: Archiv öffnen, Reihenfolge, Detail, Beschreibung/Status, Zurück zum Archiv, Ladefehler/Wiederholen, Löschen ohne Rückfrage, Leerzustand, fehlende Anmeldung sichtbar und bisherige Neuanlage/Bearbeitung/Abmeldung.
- Daten-/Modelltests: getrennte Abfragen für kommend/Archiv/nicht bestätigt/heute, Archiv-Paginierung mit 201 Einträgen, Statusmeldungen, Schutz beim Kontowechsel.
- Morgenmaske: heute bereits archivierte Einträge bleiben sichtbar und getrennt von To-dos; Zukunft/Vergangenheit weiterhin ausgeschlossen.
- Navigation: **46 Ansichten** mit getrennten Home-/Zurück-Schaltflächen bestanden.
- Bereitgestellter Prozessor verweigert echten unautorisierten POST mit HTTP 401. Es wurde kein echter Scheduler-/Push-Versand zu Testzwecken ausgelöst.
- Security Advisors: keine neue Warnung. Die bekannte separate Warnung zu deaktiviertem Leaked Password Protection sowie die beabsichtigten INFOs der privaten Lebensmittelsuch-Cachetabellen bleiben unverändert.

## Offene Abnahmen und Grenzen

Physischer iPhone-PWA-Test und echter Push → automatische Archivansicht nach Aktualisierung sind noch zu bestätigen. Mock-Transporte und SQL-Tests beweisen keine tatsächliche Geräteanzeige. Die App aktualisiert offene Listen beim Wiederöffnen, Sichtbarwerden und im Minutenintervall.

Einträge, die der frühere automatische Löschjob bereits endgültig entfernt hat, können aus dem reinen Versand-Ledger ohne Titel/Beschreibung nicht zuverlässig rekonstruiert werden. Das neue Archiv bewahrt noch vorhandene und zukünftige Einträge. Es wurden keine vermeintlichen Originaldaten erfunden.
