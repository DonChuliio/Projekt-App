# Dock Dokumente: Umsetzung und Prüfung

## Phase 1 (v1.62)

Privater Dokumenteneingang mit Dashboard-Kachel, Kamerafoto, vorhandenen Bildern, unverändertem PDF-Upload und lokal erzeugten mehrseitigen PDFs. Scanseiten können gedreht, umgeordnet und entfernt werden. Große Fotos werden bei Bedarf als JPEG reduziert. Der Posteingang unterstützt Vorschau, Name/Datum, Papierkorb, Wiederherstellung und ausdrücklich bestätigtes endgültiges Löschen. Dateilöschung läuft über die Storage-API vor dem Entfernen des Metadatensatzes. Unvollständige Imports bleiben bei gescheiterter Bereinigung sichtbar.

Der bestehende private Bucket und seine Policies werden wiederverwendet. Metadaten liegen benutzerbezogen in documents; keine öffentlichen Datei-URLs, Service-Schlüssel oder externen KI-/Scan-Dienste. Byte-Inhalte bleiben nur während Import/Vorschau im Arbeitsspeicher. Blob-URLs und Modulzustand werden beim Verlassen/Abmelden entfernt; der Service Worker speichert keine Dokumente. Downloads gehen ausschließlich über den authentifizierten Storage-Endpunkt mit cache:no-store. Original-PDFs werden nicht neu geschrieben.

### Erfolgreiche Prüfungen

- Live-Datenbanktest tests/documents-phase1.sql, vollständig zurückgerollt: eigene Metadaten CRUD, Fremdzugriffe gesperrt, anonyme Metadatenzugriffe gesperrt, Eigentümer-/Pfadwechsel und HTML verweigert, Löschung aktiver Metadaten ohne Papierkorb verhindert.
- tests/documents-phase1.test.mjs: Dateitypen/Größen, Suche, lokales Datum, PDF-Objekte und Byte-Offsets. Ein synthetischer Scan wurde von Poppler als PDF 1.4 mit zwei A4-Seiten ohne JavaScript gelesen.
- tests/documents-data.test.cjs: Benutzer-JWT, cache:no-store, unveränderte PDF-Bytes, kein stilles Überschreiben/öffentlicher Link, fremde Pfade und bestätigte Storage-first-Löschung.

### Noch nicht geprüfte echte Storage-API

Die verfügbaren Connector-Werkzeuge bieten keinen Auth-Admin-/Storage-Client und keinen sicheren lokalen Admin-Zugang. Es wurde kein privilegierter Testendpunkt erstellt und es wurden keine Testkonten angelegt. Deshalb sind echte Upload-/Download-/Überschreib-/Löschtests mit zwei Konten weiterhin **nicht ausgeführt**. Die RLS- und Mock-Tests ersetzen diese Prüfung ausdrücklich nicht. Das Modul zeigt bis zum Abschluss einen entsprechenden Hinweis und ist nicht als für vertrauliche Dokumente freigegeben zu betrachten.

tests/documents-storage-api.mjs ist ein lokaler, nicht zu deployender Testlauf. Er benötigt sicher gesetzte Umgebungsvariablen SUPABASE_URL (exakte Projekt-URL), SUPABASE_PUBLISHABLE_KEY und SUPABASE_TEST_ADMIN_KEY. Er erstellt zwei zufällige temporäre verifizierte Konten ohne E-Mail-Versand, verwendet synthetische PDFs, prüft jeweils eigenen/fremden/anonymen Zugriff sowie Dateityp-/Größenlimits und bereinigt Objekte und Konten im finally-Block. Zugangsdaten nie in das Repository schreiben. Ausführung: node tests/documents-storage-api.mjs. Bei Bereinigungsfehlern müssen ausschließlich die vom Lauf angelegten Testobjekte/-konten kontrolliert werden.

### Grenzen

Kameraauswahl hängt von iOS/Safari/PWA ab; capture ist ein Browserhinweis. Der Scan kombiniert Fotos, bietet aber keine automatische Kantenerkennung, Perspektivkorrektur oder OCR. HEIC-Verarbeitung hängt vom Browser ab; nicht dekodierbare große Bilder erfordern JPEG/PNG. PDF-Vorschau hängt vom mobilen Browser ab; alternativ authentifiziert geladene Datei öffnen/speichern. Dateien sind serverseitig privat, aber nicht Ende-zu-Ende verschlüsselt. MIME/Endungen ersetzen keine Viren-/Inhaltsprüfung. Die im Sicherheitsbericht genannten Session-/Passwortschutz-Grenzen bleiben bestehen. Das Speichern auf dem Gerät über einen ausdrücklich angeklickten Download liegt außerhalb der App-Bereinigung.

Zuordnung zu Ablagen wird mit Phase 2 ergänzt. Phase 1 wurde anhand der oben genannten Ergebnisse geprüft, bevor Phase 2 begonnen wurde; die fehlenden echten API-Tests bleiben als offene Sicherheitsprüfung bestehen.
