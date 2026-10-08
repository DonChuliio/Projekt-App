# Dokumenten-Aktionsmenüs – v1.70

In der Ablage- und Dokumentdetailansicht steht rechts neben dem Titel ein Zahnrad-SVG. Aktionen sind zunächst verborgen und werden über eine native, tastaturbedienbare Details-/Summary-Schaltfläche mit Beschriftung „Aktionen“ geöffnet. 44-px-Touchfläche, responsive Menübreite, Escape mit Fokus auf den Auslöser; außerhalb antippen und Aktionsauswahl schließen das Menü. Zurück/Home bleiben separat und unverändert.

Ablage: Stammdaten/Ablage bearbeiten, Neues Dokument, Aus Posteingang auswählen. Dokument: Umbenennen/Datum, Dokument zuordnen, Papierkorb; im Papierkorb Wiederherstellen und Endgültig löschen. Authentifiziert geladene Datei-Links für Öffnen/Speichern und Herunterladen stehen ebenfalls im Menü. Vorschau bleibt sichtbar. Keine öffentlichen URLs, keine neuen Datenzugriffe, keine Änderung an Supabase/Auth/RLS/Storage. Sicherheits- und Löschbestätigungen bleiben unverändert.

Dateien: `js/documents/documents.js`, `js/documents/documents.css`, `js/app.js`, `index.html`, `tests/documents-ui.test.cjs`.

Tests: 13 Testsuiten PASS. Erweiterter Dokument-UI-Test prüft Menüs in Ablage/Dokument/Papierkorb, initial geschlossen, SVG/Beschriftung, Öffnen, Escape/Fokus, außerhalb schließen und nach Auswahl schließen; alle ursprünglichen Aktionswege und private Datei-Links erhalten, keine doppelten Links. Navigation, direktes PDF/Kamera/Scan-Hinzufügen, Posteingangsübernahme, Zuordnung, Wiederherstellen/Löschen und Abmelden weiterhin PASS. CSS-Strukturtest für Touchgröße, geschlossenen Zustand und begrenzte mobile Breite PASS; JavaScript-Syntax PASS.

Grenze: DOM-Harness und statische CSS-Tests, kein echter Browser-/iPhone-Test. Die native Summary-Interaktion wird im Harness simuliert. Bestehende echte Storage-API-Prüfungen unverändert; keine neue Storage-Sicherheitsfreigabe aufgrund dieser UI-Tests.
