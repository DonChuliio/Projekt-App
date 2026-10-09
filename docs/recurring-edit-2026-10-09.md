# Wiederkehrende Finanzposten bearbeiten – v1.72

Stift-SVG neben jedem monatlichen, quartalsweisen und jährlichen Eintrag öffnet das vorausgefüllte bestehende Formular. Betrag, Bezeichnung, Einnahme/Ausgabe und Fälligkeit bearbeitbar; Intervall bleibt der bisherigen Gruppe zugeordnet. Speichern aktualisiert die vorhandene ID per authentifiziertem PATCH. Keine Lösch-/Neuanlage, keine Duplikate. Bei reiner Betragsänderung bleibt das gespeicherte Datum exakt erhalten. Änderungsevent für die bestehende Finanzübersicht bleibt erhalten. Abbrechen speichert nichts, Fehler werden sichtbar angezeigt und Eingaben für einen erneuten Versuch behalten; ungültige Beträge/Datumswerte blockiert.

Dateien: `js/finances/recurring-transactions.js`, `js/data/recurring-transactions-data.js`, `style.css`, `js/app.js`, `index.html`, `tests/recurring-edit.test.cjs`, `tests/recurring-edit.sql`.

Vorhandene Supabase-SELECT-/UPDATE-Policies mit Eigentümerprüfung auf `user_id` geprüft, keine Schema-/Policyänderung nötig. PATCH sendet nur erlaubte Fachfelder, keine Besitzer-ID. Leere Update-Antwort wird nicht als Erfolg gewertet. Supabase-Sicherheitsvorgaben beeinflussten diese Umsetzung: bestehende Auth/RLS beibehalten, gefiltertes UPDATE statt Delete/Insert, Rechteprüfung mit synthetischem Testdatensatz.

Tests: 14 lokale Suiten und JavaScript-Syntaxprüfung bestanden. Neuer DOM-/Request-Test: Bearbeiten aller drei Intervalle, Vorausfüllung, Betragsspeicherung, ID/Datum erhalten, Abbrechen, keine Duplikate/Löschung, Fehler/Retry, Datum-/Betragsvalidierung, bestehendes Neuanlegen, Änderungsevent, authentifizierter PATCH/Whitelist und leere Antwort abgewiesen. Echte SQL-Prüfung: eigenen synthetischen Datensatz ändern/lesen erfolgreich, fremde und anonyme Änderung verhindert; gesamte Transaktion zurückgerollt. Keine echten Benutzerposten verändert.

Grenze: kein echter Browser-/iPhone-Test, DOM- und Request-Mocks getrennt von echten Datenbank-RLS-Tests. Kein tatsächlicher Storage-Test in diesem Auftrag; Dokumentenspeicher unverändert.
