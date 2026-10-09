# Dokumentenmenü – v1.71

- Zahnrad in Ablage und Dokument: explizites Click-Toggle mit unterdrücktem nativen Default verhindert abweichendes Summary-/SVG-Verhalten. Erneuter Tap schließt; Escape, Außenklick und Aktionsauswahl bleiben erhalten. Die genaue Ursache des gemeldeten iPhone-Verhaltens konnte ohne Gerät nicht reproduziert werden.
- In Ablagen steht „Neues Dokument“ zuerst.
- Menübuttons und Datei-Links einheitlich grauer Hintergrund/Rand, helle Schrift, auch bei Hover/Active. Warnfarbe nur außerhalb des Kontextmenüs auf Löschbestätigungsseiten; Bestätigungen unverändert.

Dateien: `js/documents/documents.js`, `js/documents/documents.css`, `js/app.js`, `index.html`, `tests/documents-ui.test.cjs`.

Tests: DOM-Test ergänzt um zweimaligen SVG-/Summary-Tap in Ablage, Dokument und Papierkorb; korrekte Menü-Reihenfolge; neutrale CSS-Regeln für Buttons und Links. Gesamte 13 lokale Testsuiten und Syntaxprüfung bestanden. Keine Änderungen an Auth, RLS, Storage oder Datenzugriff. Kein echter iPhone-/Browser-Test; mobile Sichtprüfung weiterhin separat erforderlich.
