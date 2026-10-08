# Dock v1.66 – Dokumente: zehn Bedienungsverbesserungen

Stand: 08.10.2026. Alle zehn Anforderungen wurden implementiert. Die automatisierten Prüfungen und die unten genannten Live-Datenbanktests bestehen. Der Auftrag ist noch **nicht vollständig abgenommen**: Die tatsächliche Darstellung und Bedienung in einer iPhone-PWA sind nicht geprüft. DOM-Tests verwenden kontrollierte Daten- und Dateiverarbeitungs-Mocks; sie sind keine Browser-, Kamera- oder Gerätetests.

## Einzelnachweise

| Nr. / Anforderung | Status | Konkrete Änderung | Betroffene Dateien | Durchgeführter Test und Ergebnis |
|---|---|---|---|---|
| 1. Einheitliche Navigation | Erledigt | Ein oberer Zurück-Button für die jeweilige Dokumentenebene und ein getrennter Home-Button. Gemeinsame Initialisierung erhält deklarierte Elternziele und eigene Wassertest-/Dokumenthandler; keine doppelten Home-Buttons. Guten-Morgen-Ansicht erhält dasselbe Paar. | `index.html`, `js/app.js`, `js/navigation.js`, `js/documents/documents.js` | `tests/navigation.test.cjs`: alle 36 Ansichten außerhalb des Dashboards mit Home und Elternziel bzw. eigenem Handler, doppelte Initialisierung – PASS. `tests/documents-ui.test.cjs`: Dokument → Ablage → Unterordner → Ordner → Eingang sowie Scanformular zurück zum Scan – PASS. |
| 2. Lesbarkeit der Ordnernamen | Teilweise erledigt | Ordner-/Dokumentzeilen verwenden ausdrücklich die vorhandene Textfarbe statt schwarzer Button-Schrift. Lange Namen umbrechen, Bedienelemente mindestens 44 px, Eingaben 16 px. | `js/documents/documents.css` | `tests/documents-layout.test.cjs`: Haupttext 13,86:1, Zusatztext 6,31:1 auf dem vorhandenen dunklen Hintergrund; mobile Größen und Dialogbegrenzung – PASS. Die App besitzt keinen separaten hellen Modus. Visueller Test auf einem echten iPhone **offen**. |
| 3. Dokumente direkt in Ablagen hinzufügen | Teilweise erledigt | PDF, Kamera, Foto und Scan übernehmen die aktuelle Ablage bereits beim Anlegen des einzigen Metadatensatzes. Direkter Ordnerimport ebenfalls möglich. Posteingang bleibt unabhängig verfügbar. | `js/documents/documents.js`, `js/data/documents-data.js` | DOM-Test: PDF-, Kamera- und Scanpfad mit korrektem Ziel, Doppelabsenden erzeugt keinen zweiten Import – PASS. Daten-Test: eine Metadatenanlage und ein unveränderter Datei-Upload – PASS. Live-SQL: direkte Ablagezuordnung – PASS. Kamera/Scan im echten iPhone-PWA-Dateidialog **offen**. |
| 4. Veralteten Speicherhinweis entfernen | Erledigt | Der allgemeine Speicher-Prüfhinweis entfällt nach dem dokumentierten erfolgreichen echten Test. Dateityp-/Größenhinweise und Bedienhilfe zur PDF-Vorschau bleiben erhalten. | `js/documents/documents.js`, `docs/documents-implementation.md`, dieser Bericht | Bereits vollständig bestandener echter Zwei-Konten-Storage-API-Test vom 08.10.2026, siehe Nachweis unten. DOM-Test bestätigt die Entfernung. Live-Nachkontrolle: null temporäre Testkonten, null verwaiste Dokumentobjekte – PASS. |
| 5. Vorhandene Dokumente aus dem Posteingang übernehmen | Erledigt | „Aus Posteingang auswählen“ unter Dokument hinzufügen und direkt in der Ablage. Nur fertige, nicht gelöschte und noch unsortierte Dokumente erscheinen; Name, Datum und Größe werden angezeigt. | `js/documents/documents.js`, `js/data/documents-data.js` | DOM-Test schließt bereits abgelegte, unvollständige und gelöschte Dokumente aus; erfolgreicher Import vorhandener Einträge entfernt sie aus der Auswahl – PASS. Bedingtes PATCH verhindert das Überschreiben einer zwischenzeitlichen Zuordnung – Daten-Test und Live-SQL PASS. |
| 6. Mehrfachauswahl ermöglichen | Erledigt | Checkboxen, sichtbare Markierung, Anzahl und gemeinsame Bestätigung. Erfolgreiche Einträge werden entfernt, fehlgeschlagene bleiben ausgewählt; jede Fehlermeldung nennt das Dokument. | `js/documents/documents.js`, `js/documents/documents.css`, `js/data/documents-data.js` | DOM-Test: zwei Dokumente auswählen, ein synthetischer Fehler, erfolgreicher Eintrag entfernt, fehlgeschlagenen einzeln erneut zuordnen; kein weiterer Upload und keine Duplikate – PASS. |
| 7. Dokument-Kontextmenü vereinfachen | Erledigt | Nur „Dokument zuordnen“ öffnet die Zielauswahl. Das frühere Select mit sämtlichen Ordnern und Ablagen wurde vollständig entfernt. Umbenennen/Datum, Vorschau, Papierkorb, Wiederherstellung und Löschen bleiben erhalten. | `js/documents/documents.js` | DOM-Test: genau der neue Aktionspfad und kein Ziel-Select; sichere Textdarstellung, Papierkorb/Wiederherstellung/endgültige Löschung – PASS. |
| 8. Navigierbarer Zuordnungsdialog | Teilweise erledigt | Nativer modaler Dialog mit Wurzelordnern, jeweils direkten Unterordnern/Ablagen, Pfad, markiertem Ziel, Zurück/Home, „Hier hinzufügen“, Abbrechen und Escape. Navigation verändert noch keine Daten. | `js/documents/documents.js`, `js/documents/documents.css` | DOM-Test: drei Ordnerebenen, Ablage öffnen und zurück, Abbrechen/Escape ohne Schreibzugriff, Home beendet Dialog, Fehler bleibt im Dialog, Logout während Anfrage leert private Ansicht – PASS. Statische mobile CSS-Prüfung – PASS. Tatsächliche iPhone-Bedienung/Fokus/Scrollen **offen**. |
| 9. Dokumente direkt in normalen Ordnern ablegen | Erledigt | Jeder geöffnete Ordner ist selbst ein gültiges Ziel; ebenso Ablagen und der Posteingang an der Wurzel. Direkter Import übernimmt den geöffneten Ordner. | `js/documents/documents.js`, `js/data/documents-data.js` | DOM-Test: Sonstiges als Ziel, Ordnerimport nach Verlassen einer Ablage ohne veraltete Ablage-ID – PASS. Live-SQL: gültige Ordnerzuordnung; bestehender Phase-2-Test bestätigt Hierarchie, Zyklenschutz und Schutz gefüllter Strukturen – PASS. |
| 10. Vorhandene Dokumente korrekt verschieben | Erledigt | Ein benutzerautorisierter PATCH aktualisiert nur Ziel und Änderungsdatum. Datei-ID, Speicherpfad, Datei und übrige Metadaten bleiben erhalten. Listen werden aktualisiert; ein Ladefehler nach erfolgreichem Speichern wird ausdrücklich als solcher gemeldet. | `js/data/documents-data.js`, `js/documents/documents.js` | DOM-Test: Ablage → andere Ablage → Sonstiges → Posteingang, konstante IDs/Pfade/Anzahl, Schreibfehler ohne Ortswechsel und Ladefehler nach erfolgreichem Speichern – PASS. Daten-Test: ausschließlich ein PATCH, kein Storage-Aufruf, falsche Ziele/Anmeldung abgewiesen – PASS. `tests/documents-placement.sql` gegen echte Datenbank: Ortswechsel, konkurrierende Inbox-Zuordnung, Metadatenerhalt, fremde/anonyme Zugriffe – PASS, vollständig zurückgerollt. |

## Echter Storage-API-Nachweis zu Punkt 4

Der Benutzer führte `tests/documents-storage-api.mjs` aus Commit `01dff4a63f32d051de7aaa180251b6b309cd7c33` am 08.10.2026 um 13:46 Uhr Europe/Berlin unter Windows/Node 24 aus und übermittelte den vollständigen erfolgreichen Abschluss:

```text
Bereinigung abgeschlossen: ausschließlich synthetische Testobjekte und temporäre Testkonten entfernt.
PASS: Benutzer 1: Upload/Download/Überschreiben/Löschen, Fremd-/Anonym-/Public-Zugriffe und Typ-/Größenlimits
PASS: Benutzer 2: Upload/Download/Überschreiben/Löschen, Fremd-/Anonym-/Public-Zugriffe und Typ-/Größenlimits
```

Geprüft wurden getrennte angemeldete Konten, eigene PDF-/PNG-Uploads, bytegleiche Downloads und Überschreibungen, eigene Löschung, fremde/anonyme Downloads, Uploads, Überschreibungen, Löschversuche und Listen sowie öffentliche URLs und unzulässige Typen/Größen. Ausschließlich synthetische Dateien; keine privilegierten öffentlichen Endpunkte. Nachkontrolle in diesem Durchgang: null temporäre Storage-Testkonten, null synthetische Dokument-/Ordner-/Ablage-Testdatensätze und null Dokumentobjekte ohne Eigentümerkonto. Der zusätzliche Testschlüssel wurde laut Benutzer nach dem damaligen Lauf entfernt.

Für v1.66 wurde dieser echte Lauf nicht wiederholt: Bucket, Storage-Policies, Storage-Endpunkte, Authentifizierung, Dateiübertragung und Limits bleiben unverändert. Die erfolgreiche Durchführung wird aus dem vorhandenen Prüfstand übernommen, nicht durch RLS-/Mock-Tests ersetzt. Daraus wird keine allgemeine oder uneingeschränkte Sicherheitsfreigabe abgeleitet; die Grenzen des ursprünglichen Sicherheitsberichts bleiben bestehen.

## Weitere Prüfungen und Änderungen

- Erfolgreich: `node tests/navigation.test.cjs`, `node tests/documents-layout.test.cjs`, `node tests/documents-ui.test.cjs`, `node tests/documents-data.test.cjs`, `node tests/documents-phase1.test.mjs`, `node tests/documents-phase2.test.mjs`.
- Erfolgreiche bestehende Regressionen: Auth-Sicherheit, Push Edge Function, Push-Routing, Routinen-Synchronisierung und Bring-Export-Sicherheit.
- Gegen die echte Supabase-Datenbank erneut erfolgreich: `tests/documents-phase1.sql`, `tests/documents-phase2.sql` und neu `tests/documents-placement.sql`. Alle Transaktionen zurückgerollt. Ein vorübergehender Connector-Fehler beim ersten Phase-1-Aufruf wurde durch erfolgreichen Wiederholungsaufruf aufgelöst.
- JavaScript-Syntaxprüfungen erfolgreich. Neue Navigation wird als eigenes versioniertes Modul geladen, ohne den gemeinsamen Router oder dessen Regeln auszutauschen.
- Keine Datenbankmigration, keine RLS-/Bucket-Änderung, keine neuen Dienste, Secrets, KI-Übertragungen oder Datei-Caches. Vorhandene Daten und Dateien wurden nicht verändert.

## Offene Abnahme

**Punkte 2, 3 und 8 sind teilweise erledigt und haben offene Gerätetests.** Ein physisches iPhone und dessen angemeldete Dock-PWA stehen in dieser Ausführungsumgebung nicht zur Verfügung. Die automatisierten DOM-/Daten-Tests sind kein Ersatz für Safari/PWA-Verhalten.

Mit ausschließlich einem synthetischen Testdokument auf dem iPhone prüfen:

1. Dock vollständig neu öffnen; obere Zurück-/Home-Buttons und lesbare Ordnernamen prüfen, auch mit langen Namen.
2. In einer Ablage ein Test-PDF, ein Kamerafoto und einen mehrseitigen Scan speichern; die Dokumente müssen sofort dort erscheinen.
3. Zuordnungsdialog in tiefen Ordnern bedienen: Pfad/Ziel erkennen, zurück, abbrechen/Escape soweit verfügbar, scrollen und „Hier hinzufügen“ bestätigen.
4. Anschließend Testdokumente über den bestehenden Papierkorb ausdrücklich löschen.

Bis diese Prüfungen erfolgreich dokumentiert sind, ist der Gesamtauftrag nicht vollständig abgeschlossen.
