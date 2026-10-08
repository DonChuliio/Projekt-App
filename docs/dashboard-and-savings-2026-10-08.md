# Dashboard und Sparpläne – v1.69

## #15: Hauptdashboard-Piktogramme

| Kachel | Piktogramm | Einzelprüfung |
|---|---|---|
| Notizen | Blatt und Stift | SVG/Name/Reihenfolge/Button/Routing: PASS |
| Planer | Kalender | SVG/Name/Reihenfolge/Button/Routing: PASS |
| Packlisten | Checkliste | SVG/Name/Reihenfolge/Button/Routing: PASS |
| Finanzen | Geldbörse | SVG/Name/Reihenfolge/Button/Routing: PASS |
| Dokumente | Vorhandenes Dokument-SVG, unveränderte Pfade | SVG/Name/Reihenfolge/Button/Routing: PASS |
| Hobby | Kompass | SVG/Name/Reihenfolge/Button/Routing: PASS |

Dateien: `index.html`, `style.css`, `tests/dashboard-savings.test.cjs`. Gemeinsames Icon-Muster für künftige Dashboard-Kacheln: SVG mit Klasse `dashboard-icon` innerhalb eines Buttons mit bestehendem `data-tile`-Ziel. 30 × 30 px, identische Strichstärke, aktuelle Textfarbe und gleicher Abstand. Kein Emoji. Namen, Reihenfolge und Ziele unverändert; `js/dashboard.js` unverändert. Native Buttons ergänzen Tastaturbedienung. Responsives Raster bleibt erhalten. Navigationstest für 36 Ansichten mit Zurück/Home bestanden.

**Offen:** Sicht- und Bedienprüfung aller sechs Icons auf echtem iPhone/PWA und im echten Browser. Struktur-/CSS-/DOM-Tests sind keine Gerätetests. Kein erreichbares physisches iPhone und kein ausführbarer lokaler Browser verfügbar. #15 bleibt bis zur mobilen Abnahme offen.

## #11: Notgroschen und unabhängige Sparpläne

Trade Republic, Taures, Lissy und Notgroschen besitzen je ein unabhängiges natives `details`-Element ohne exklusive Accordion-Gruppe. Eingeklappt sind Name, Startkapital und monatliche Rate sichtbar. Zusammenfassung aktualisiert sich mit Eingaben und beim Laden. Nach Seitenneuladen sind alle Pläne zunächst eingeklappt; Beträge werden aus Supabase geladen. Aufklappzustände sind keine neuen Datenbankpräferenzen.

Notgroschen: Startkapital und Monatsrate; ausdrücklich **ohne Wertentwicklung** gerechnet: Startkapital + Monatsrate × Zeitraum, in Gesamtsumme einbezogen. Die bestehende Monatszinsformel der anderen drei Pläne bleibt exakt erhalten. Kein bestehender Betrag oder Zeitraum überschrieben/migriert.

Dateien: `index.html`, `style.css`, `js/app.js`, `js/finances/savings-calculator.js`, `js/finances/savings-model.js`, `js/data/savings-calculation-data.js`, `database/add_savings_reserve.sql`, `tests/dashboard-savings.test.cjs`, `tests/savings-reserve.sql`.

Supabase-Migration `add_savings_reserve` angewendet: zwei nicht negative Numeric-Felder, Standard 0 in vorhandener Tabelle `savings_calculations`. Auth/RLS und Unique-Key auf `user_id` bleiben unverändert. Keine neue Tabelle und keine doppelten Sparpläne. Authentifizierter Upsert über bisherigen Datenzugriff. Identischer Fingerprint vorhandener Felder vor/nach Migration und nach Tests; neue Felder nach Testbereinigung weiterhin 0.

Automatisierte Tests: alte Formel über mehrere Zinssätze und Zeiträume exakt gleich; Nullzins/Notgroschen mit zusätzlichen Monaten; Summe; negative/unendliche Werte und falsche Monatsanzahl; vier separate Details-Strukturen und Kurzüberblicke; Laden, Ändern, Speichern und Neuladen mit richtigen Werten; kein Speichern ungültiger Beträge; authentifizierte Load-/Upsert-Requests mit neuen Feldern: PASS.

Echte Supabase-SQL-Tests in vollständig zurückgerollter Transaktion: eigener Upsert/Lesen ohne Duplikat, alte Felder unverändert, negative Werte abgelehnt, fremdes Lesen/Ändern/Upsert abgewiesen, anonymer Zugriff auf Daten abgewiesen: PASS. Ausschließlich synthetische Notgroschen-Werte; keine dauerhafte Veränderung bestehender Datensätze. Datenbanktests, keine zusätzlichen Storage-API-Tests.

## Regression und Grenzen

13 lokale Testsuiten bestanden: Dashboard/Sparen, Dokument-UI, Ordnerregeln, Navigation, Layout/Kontrast, Dokument-Datenzugriff, Phasen 1/2, Auth, Push-Edge, Push-Routing, Routinen, Bring-Export. JavaScript-Syntaxprüfung bestanden. Dokumentenspeicher und laufende Storage-Sicherheitsprüfungen unverändert.

Security Advisors: keine neue Datenbank-/RLS-Warnung. Bereits bekannte Warnung zu ausgeschalteter Leaked-Password-Protection bleibt bestehen; Auth-Konfiguration unverändert. Hinweis: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

#11 implementiert und automatisiert geprüft; eigener Browser-/iPhone-Test für die neue Sparansicht nicht durchgeführt. #15 benötigt die oben genannte mobile Abnahme. Dokumenten-Issues #16/#17/#18/#20/#23 nach ausdrücklicher Benutzerabnahme geschlossen. #13 bleibt als nicht beauftragte KI-Idee offen.
