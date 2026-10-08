# Dock Dokumente: Umsetzung und Prüfung

## Phase 1 (v1.62)

Privater Dokumenteneingang mit Dashboard-Kachel, Kamerafoto, vorhandenen Bildern, unverändertem PDF-Upload und lokal erzeugten mehrseitigen PDFs. Scanseiten können gedreht, umgeordnet und entfernt werden. Große Fotos werden bei Bedarf als JPEG reduziert. Der Posteingang unterstützt Vorschau, Name/Datum, Papierkorb, Wiederherstellung und ausdrücklich bestätigtes endgültiges Löschen. Dateilöschung läuft über die Storage-API vor dem Entfernen des Metadatensatzes. Unvollständige Imports bleiben bei gescheiterter Bereinigung sichtbar.

Der bestehende private Bucket und seine Policies werden wiederverwendet. Metadaten liegen benutzerbezogen in documents; keine öffentlichen Datei-URLs, Service-Schlüssel oder externen KI-/Scan-Dienste. Byte-Inhalte bleiben nur während Import/Vorschau im Arbeitsspeicher. Blob-URLs und Modulzustand werden beim Verlassen/Abmelden entfernt; der Service Worker speichert keine Dokumente. Downloads gehen ausschließlich über den authentifizierten Storage-Endpunkt mit cache:no-store. Original-PDFs werden nicht neu geschrieben.

### Erfolgreiche Prüfungen

- Live-Datenbanktest tests/documents-phase1.sql, vollständig zurückgerollt: eigene Metadaten CRUD, Fremdzugriffe gesperrt, anonyme Metadatenzugriffe gesperrt, Eigentümer-/Pfadwechsel und HTML verweigert, Löschung aktiver Metadaten ohne Papierkorb verhindert.
- tests/documents-phase1.test.mjs: Dateitypen/Größen, Suche, lokales Datum, PDF-Objekte und Byte-Offsets. Ein synthetischer Scan wurde von Poppler als PDF 1.4 mit zwei A4-Seiten ohne JavaScript gelesen und beide Seiten erfolgreich gerendert.
- tests/documents-data.test.cjs: Benutzer-JWT, cache:no-store, unveränderte PDF-Bytes, kein stilles Überschreiben/öffentlicher Link, fremde Pfade und bestätigte Storage-first-Löschung.

### Noch nicht geprüfte echte Storage-API

Die verfügbaren Connector-Werkzeuge bieten keinen Auth-Admin-/Storage-Client und keinen sicheren lokalen Admin-Zugang. Es wurde kein privilegierter Testendpunkt erstellt und es wurden keine Testkonten angelegt. Deshalb sind echte Upload-/Download-/Überschreib-/Löschtests mit zwei Konten weiterhin **nicht ausgeführt**. Die RLS- und Mock-Tests ersetzen diese Prüfung ausdrücklich nicht. Das Modul zeigt bis zum Abschluss einen entsprechenden Hinweis und ist nicht als für vertrauliche Dokumente freigegeben zu betrachten.

tests/documents-storage-api.mjs ist ein lokaler, nicht zu deployender Testlauf. Er benötigt sicher gesetzte Umgebungsvariablen SUPABASE_URL (exakte Projekt-URL), SUPABASE_PUBLISHABLE_KEY und SUPABASE_TEST_ADMIN_KEY. Er erstellt zwei zufällige temporäre verifizierte Konten ohne E-Mail-Versand, verwendet synthetische PDFs, prüft jeweils eigenen/fremden/anonymen Zugriff sowie Dateityp-/Größenlimits und bereinigt Objekte und Konten im finally-Block. Zugangsdaten nie in das Repository schreiben. Ausführung: node tests/documents-storage-api.mjs. Bei Bereinigungsfehlern müssen ausschließlich die vom Lauf angelegten Testobjekte/-konten kontrolliert werden.

### Grenzen

Kameraauswahl hängt von iOS/Safari/PWA ab; capture ist ein Browserhinweis. Der Scan kombiniert Fotos, bietet aber keine automatische Kantenerkennung, Perspektivkorrektur oder OCR. HEIC-Verarbeitung hängt vom Browser ab; nicht dekodierbare große Bilder erfordern JPEG/PNG. PDF-Vorschau hängt vom mobilen Browser ab; alternativ authentifiziert geladene Datei öffnen/speichern. Dateien sind serverseitig privat, aber nicht Ende-zu-Ende verschlüsselt. MIME/Endungen ersetzen keine Viren-/Inhaltsprüfung. Die im Sicherheitsbericht genannten Session-/Passwortschutz-Grenzen bleiben bestehen. Das Speichern auf dem Gerät über einen ausdrücklich angeklickten Download liegt außerhalb der App-Bereinigung.

Zuordnung zu Ablagen wird mit Phase 2 ergänzt. Phase 1 wurde anhand der oben genannten Ergebnisse geprüft, bevor Phase 2 begonnen wurde; die fehlenden echten API-Tests bleiben als offene Sicherheitsprüfung bestehen.

## Phase 2 (v1.63)

Die sieben Grundordner werden pro angemeldetem Benutzer beim ersten Modulaufruf konfliktfrei angelegt: Wohnen, Altersvorsorge, Kommunikation & Abos, Arbeit & Steuern, Versicherungen, Anschaffungen & Garantien und Sonstiges. Unterordner lassen sich erstellen, umbenennen und verschieben. Eine Datenbankprüfung verhindert Zyklen, auch bei konkurrierenden Änderungen. Posteingang und Papierkorb bleiben separate Bereiche.

Eigenständige Ablagen können ohne Dokument in beliebigen Ordnern oder zunächst ohne Ordner angelegt werden. Die Detailseite zeigt die optionalen Stammdaten und darunter die zugehörigen Dokumente. Vorlagen: Allgemein, Vertrag, Versicherung, Anschaffung, Altersvorsorge, Arbeit & Steuern sowie Wohnen & Versorgung mit separater Kunden- und Zählernummer. Leere Bezeichnung erhält technisch den Namen „Neue Ablage“. Alle Stammdatenfelder sind optional. Bis zu 50 eigene Felder können ergänzt, geändert und entfernt werden. Ein Vorlagenwechsel erhält bereits eingetragene Werte; zusätzliche ältere Werte bleiben sichtbar.

Nach Import gibt es die Auswahl Posteingang behalten, bestehender Ablage zuordnen oder neue Ablage erstellen. Dokumente können später anderen Ablagen bzw. direkt einem Ordner wie Sonstiges zugeordnet werden. Der Speicherpfad und die Dateibytes ändern sich beim Umbenennen oder Verschieben nicht. Globale Suche findet Ablagen und Dokumentnamen. Gefüllte Ordner und Ablagen werden durch Fremdschlüssel vor Löschung geschützt, einschließlich Dokumenten im Papierkorb; keine rekursive Löschung.

### Erfolgreiche Prüfungen

- Live-Transaktion tests/documents-phase2.sql, vollständig zurückgerollt: sieben Grundordner ohne Duplikate, eigene Unterordner/Ablagen, Zyklenschutz, Dokumentzuordnung, Ausschluss mehrerer gleichzeitiger Ablageorte, Schutz gefüllter Strukturen und Sperre für fremde JWT-Subjekte/anonyme Zugriffe.
- tests/documents-phase2.test.mjs: alle sieben optionalen Vorlagen, Zählernummer, eigene Felder, Unterordner und sichere Pfaddarstellung.
- tests/documents-ui.test.cjs: DOM-Bedienabläufe für Unterordner und Ablage ohne Dokument, Vorlagen und eigene Felder, PDF-Import, Zuordnung, sicher gerenderte Namen, Papierkorb/Wiederherstellung/endgültige Löschung, globale Suche und Bereinigung beim Logout. Dies ist ein DOM-Test mit gemockten Daten, kein vollständiger Browser- oder iPhone-Test.
- Bestehende Auth-, Push-, Push-Routing-, Routinen- und Bring-Export-Tests erfolgreich erneut ausgeführt.
- Security Advisors nach den neuen Tabellen/Funktionen: unverändert ausschließlich die bekannte Warnung zu deaktiviertem Leaked Password Protection.
- Nach SQL-Tests: null Dokument-, Ordner-, Ablage- und Storage-Testobjekte; vorhandenes Auth-Konto unverändert. Es wurde kein Testkonto angelegt.

### Einschränkungen

Echte Storage-API-Tests und iPhone-PWA-Gerätetest bleiben offen. Ein lokaler vollständiger Browsertest konnte mangels installiertem Browser nicht durchgeführt werden. Kameraauswahl, HEIC-Verarbeitung und PDF-Vorschau müssen auf dem Zielgerät geprüft werden. Keine automatische Erfassung von Stammdaten, keine OCR, keine Vertrags-/Finanzintegration und keine KI-Auswertung. Ordnerhierarchie ist auf maximal 64 Vorfahren begrenzt; pro Ablage maximal 50 eigene Felder und jeweils 64 KiB für Standard-/Zusatzdaten. Es gibt keine feste fachliche Grenze für die Anzahl Dokumente pro Ablage; Listen werden über paginierte Datenabfragen geladen.

Die Sicherheitsgrenzen aus Phase 1 gelten unverändert für Phase 2. Keine Freigabe für vertrauliche Dokumente, bevor die echten API-Tests abgeschlossen und die verbleibenden Risiken bewertet sind.

## Reproduzierbare lokale Prüfungen

```sh
node tests/documents-phase1.test.mjs
node tests/documents-data.test.cjs
node tests/documents-phase2.test.mjs
node tests/documents-ui.test.cjs
node tests/auth-security.test.cjs
node tests/push-edge.test.cjs
node tests/push-routing.test.cjs
node tests/routine-sync.test.cjs
node tests/export-security.test.cjs
```

SQL-Dateien nur als überprüfte Tests mit Transaktions-Rollback im richtigen Projekt ausführen. Die Schema-Dateien unter database/ dokumentieren bereits angewendete einmalige Migrationen.

## Nachtrag: erster echter Storage-Test am 08.10.2026

Der Benutzer führte den lokalen Test unter Windows/Node 24 mit einem getrennten Testschlüssel aus. Zwei temporäre Testkonten wurden erstellt; der erste eigene PDF-Upload scheiterte an RLS (Logmeldung: new row violates row-level security policy). Das Skript lief durch die Bereinigung; die anschließende Live-Abfrage bestätigte null Testkonten und null Dokumentobjekte. Dies war kein erfolgreicher Sicherheits-Testlauf.

Ursache: Die bisherigen INSERT/UPDATE-Policies verlangten metadata.size. Supabase prüft Upload-Rechte vor Abschluss des Uploads, wobei die vorläufigen Metadaten diese endgültige Größenangabe nicht besitzen. Die SQL-Metadatentests hatten diesen echten API-Ablauf nicht nachgebildet.

Die Migration database/fix_document_storage_upload_preflight.sql korrigiert beide WITH CHECK-Regeln auf eigenen Benutzerpfad, gültige UUID/Endung und den privaten Bucket. SELECT-/DELETE- und UPDATE-USING-Eigentümerregeln bleiben bestehen. Die serverseitigen Bucket-Limits (10 MiB; PDF/JPEG/PNG/WebP/HEIC/HEIF) bleiben unverändert und werden vor der Migration zusätzlich geprüft. Dateityp/Größe sind API-/Bucket-Prüfungen und dürfen nicht als reine RLS-Metadatengarantien bezeichnet werden. Der korrigierte SQL-Regressionstest prüft zusätzlich Upload-Vorprüfungen ohne finale Metadaten und weiterhin die Sperre fremder/anonymer Benutzer und ungültiger Pfade. Größe/MIME müssen im echten API-Test bestätigt werden.

Der lokale Test zeigt jetzt Fortschritt, meldet beim eigenen Upload den HTTP-Status und begrenzt einzelne Requests auf 30 Sekunden. Die erneute echte API-Prüfung steht noch aus; die Freigabe für vertrauliche Dokumente bleibt ausstehend. Kein privilegierter öffentlicher Testendpunkt wurde erstellt.

Quellen: https://github.com/supabase/storage/blob/master/src/storage/uploader.ts und https://supabase.com/docs/guides/storage/buckets/creating-buckets

## Nachtrag: zweiter echter Storage-Test (v1.64)

Der lokale Lauf erreichte eigene PDF-Uploads/Downloads, eigene bzw. fremde/anonyme List-Abfragen und einen eigenen PNG-Upload/Download. Die Overwrite-API antwortete erfolgreich, aber der unmittelbar folgende Download enthielt noch die ursprünglichen Bytes. Der Lauf ist daher weiterhin nicht bestanden. Ein verzögerter Storage-/CDN-Cache ist die naheliegende Ursache; das wird durch einen frischen Origin-Download geprüft und nicht durch Abschwächen des Bytevergleichs übergangen.

Authentifizierte Dokument-Downloads in App und Test verwenden jetzt einen zufälligen cacheNonce-Queryparameter zusätzlich zu cache:no-store. Raw-Uploads setzen einen gültigen Cache-Control-Wert no-store anstelle der ungültigen Zeichenfolge 0. Der Test prüft weiterhin exakt dieselben erwarteten Bytes und verweigerten Zugriffe. Fehlgeschlagene Bytevergleiche geben keine Dateiinhalte mehr aus. Die lokalen Daten- und DOM-Tests bestehen nach der Anpassung. Supabase empfiehlt für einen Origin-Abruf einen neuen cacheNonce; häufige Änderungen sollten generell neue Speicherpfade bekommen. Dock vergibt ohnehin bei jedem Import eine neue UUID und überschreibt vorhandene Dokumente nicht automatisch.

Bereinigung des zweiten Laufs: keine temporären Testkonten und keine Dokumentobjekte ohne bestehendes Eigentümerkonto gefunden. Ein reguläres JPEG des vorhandenen App-Benutzers bleibt erhalten. Die Freigabe bleibt bis zum vollständig erfolgreichen erneuten API-Test offen.

Quelle: https://supabase.com/docs/guides/storage/cdn/smart-cdn

