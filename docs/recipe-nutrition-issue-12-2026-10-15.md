# Issue 12 – Rezeptnährwerte und persönliche Lebensmittel (v1.105)

## Bedienung und Umsetzung

Im bestehenden Rezeptmenü öffnet „Nährwerte ermitteln“ eine eigene Ansicht. Ausschließlich die bestehenden Zutatenzeilen werden aufgelöst. Für jede Zutat bestätigt der Benutzer Menge, Einheit und ein persönliches Lebensmittel. Alternativ lässt sich manuell Open Food Facts durchsuchen oder ein Lebensmittel mit eigenen Werten erstellen. Externe Treffer werden vor dem Speichern einschließlich der Bezugsgröße 100 g / 100 ml ausdrücklich geprüft. Aliasnamen ermöglichen spätere persönliche Zuordnungen. Bei mehreren passenden persönlichen Lebensmitteln ist eine Auswahl erforderlich.

Es gibt ausschließlich kcal, Eiweiß, KH und Fett. Leere Werte bleiben unbekannt; ein fehlender Zutatenwert macht den entsprechenden Gesamtwert unvollständig. Echte Nullen bleiben null Gramm. Gesamtes Rezept und Pro Portion erscheinen am Ende der normalen Rezeptansicht, mit deutschen Dezimalkommas. Portionen starten mit 1, sind positive ganze Zahlen und werden separat gespeichert. Änderungen teilen sofort die vorhandenen Summen, ohne die externe Quelle erneut abzufragen. Schnelle Änderungen werden nacheinander gespeichert; Fehler erlauben erneutes Speichern.

Unter „Lebensmittel“ lassen sich eigene Lebensmittel, Aliasnamen, Dichte und Stück-/Löffel-/Packungsumrechnungen pflegen. g/gr/kg/ml/l werden direkt unterstützt. Stück/EL/TL/Prise/Packung/Dose benötigen bestätigte Umrechnungen. Löffelvolumen (EL 15 ml / TL 5 ml) und einige ausdrücklich geschätzte Stückgewichte sind nur per bewusster Übernahme verfügbare, editierbare Vorschläge. Masse/Volumen benötigt eine bestätigte Dichte. Mehrdeutige Mengen (Bereiche oder z.B. „1.000“) werden nicht automatisch als sichere Menge übernommen. Der Benutzer muss sie klären.

Berechnungen speichern einen Snapshot der bestätigten Lebensmittel und Zutaten. Spätere Änderungen an einem persönlichen Lebensmittel ändern vorhandene Rezeptberechnungen nicht rückwirkend. „Neu berechnen“ verwendet die aktuellen Werte. Zutatenänderungen markieren vorhandene Berechnungen durch einen Datenbanktrigger als veraltet. Die Portionszahl bleibt bestehen. Der Rezepteditor schreibt weiterhin ausschließlich seine bisherigen Felder; Bring! exportiert weiterhin ausschließlich ausgewählte Zutaten.

## Datenbank und Sicherheit

- `database/recipe_nutrition.sql`: additive Rezeptspalten, `personal_foods`, vier eigene RLS-Policies, minimale spaltenbezogene Schreibrechte, ausschließlich eigene Lebensmittel.
- `save_recipe_nutrition`: SECURITY INVOKER, gesperrter Suchpfad, eigene Rezeptzeile unter Sperre, Abgleich des aktuellen Zutatenstands und jeder Zuordnung, erneute serverseitige Mengen-/Dichte-/Summenberechnung. Keine vertrauenswürdigen Summen aus dem Client.
- Die zuerst angewandte Version enthielt einen mehrdeutigen PL/pgSQL-Bezeichner. Der echte SQL-Test deckte ihn auf. `recipe_nutrition_calculation_fix.sql` behebt ihn; die Basismigration enthält ebenfalls die korrigierte Fassung. Beide Migrationen sind bereits im Projekt angewandt.
- `food-search`: POST, serverseitige Prüfung des Benutzer-Tokens über Supabase Auth vor externen Anfragen. `verify_jwt=false` am Gateway dient der Kompatibilität mit den aktuellen Schlüsseln; die eigene Auth-Prüfung bleibt verpflichtend. Keine geheimen Schlüssel im Frontend. Neue Secret Keys und bestehende Service-Role-Schlüssel werden serverseitig unterstützt.
- Nur der explizit eingegebene Lebensmittelsuchbegriff wird an Open Food Facts übertragen, keine Rezeptbeschreibung, Dokumente oder Benutzeridentität. Keine KI und keine kostenpflichtigen APIs. Keine Inhaltsprotokollierung.
- Serverseitiger privater Cache für 24 Stunden, gemeinsames Budget von maximal acht neuen Suchen je Minutenfenster, manuell ausgelöste Suchanfragen statt Suche bei jedem Tastendruck. Ein Suchlimit oder Ausfall blockiert die eigene Werteeingabe nicht.
- Private Cache-/Budgettabellen sind für anon/authenticated gesperrt. Die zwei Advisor-Informationen „RLS Enabled No Policy“ sind hier beabsichtigt: Zugriff ausschließlich über service_role. Bereits bekannte separate Warnung „Leaked Password Protection Disabled“ unverändert; keine neue Auth-Warnung.
- Frontend verwirft verspätete Ergebnisse nach Kontoänderung/Abmeldung. Nährwert- und Lebensmitteldaten werden beim Abmelden entfernt; Datenanfragen verwenden `cache: no-store`.

## Nachweise vom 15.10.2026

| Prüfung | Ergebnis |
|---|---|
| Alle 36 vorhandenen/neuen `*.test.cjs` / `*.test.mjs` | Bestanden. Einschließlich Rezepteditor/Bring!, Navigation, Dokumente, Push, Finanzen und Spiele. |
| `nutrition-model.test.cjs` | Einheiten, Brüche/Dezimalkommas, mehrdeutige Mengen, Dichte, explizite Umrechnungen, Aliasmehrdeutigkeit, vier Summen, fehlend gegenüber 0, Portionsdivision und Rundung bestanden. |
| `nutrition-data.test.cjs` | Authentifiziertes CRUD, nullable Werte, RPC-Zuordnungen, separater Portions-PATCH, Fehler und Kontowechsel bestanden. |
| `nutrition-ui.test.cjs` | DOM-Tests für Zutatenassistent, eigene Werte/Aliase und Wiederverwendung, externe Bestätigung, ungültig gewordene Zuordnungen, veraltete/fehlende Werte, sofortige Portionsteilung, schnelle Speicherfolge, Fehler/Wiederholen und Abmeldung bestanden. |
| `recipes-regression.test.cjs` | Bestehende Rezeptansicht, Editor, Zutatenzeilen, Erhalt der Nährwertfelder, Menü und ausgewählter Bring!-Export bestanden (DOM-Mocks). |
| `recipe-nutrition.sql` im echten Supabase-Projekt | Bestanden, vollständig zurückgerollt: synthetisches Rezept/Lebensmittel, 6.400 kcal, Dichte/Einheiten, 4 Portionen bleiben nach Neuberechnung/Zutatenänderung erhalten, fehlendes Eiweiß vs. Fett 0, veraltet, paralleler Zutatenstand, fremder/anonymer Zugriff und unerlaubte Eigentümeränderung. |
| `food-search-cache.sql` im echten Supabase-Projekt | Bestanden, vollständig zurückgerollt: service_role-Zugriff, acht Reservierungen, neunte abgelehnt, Cachetreffer trotz ausgeschöpftem Budget. |
| `food-search.test.cjs` | Mock-HTTP-Tests für fehlende/ungültige Anmeldung, Suchprüfung, Cache, Limit, Anbieterfehler, genau vier nullable Werte, Bezugsgrößenbestätigung und Quelle bestanden. Zusätzlich eine echte öffentliche OFF-Staging-Suchantwort erfolgreich durch denselben Produktparser geprüft. |
| Bereitgestellte Edge Function per HTTP | Ohne Token HTTP 401 „Bitte anmelden.“; ungültiger Token HTTP 401 „Bitte erneut anmelden.“. |
| Vollständige angemeldete Live-Suche über die Edge Function | Noch offen: kein Benutzer-Token für einen vollständigen positiven Live-Durchlauf verwendet. Provider-Staging, Funktionslogik, echte Datenbank-RPCs und negative Live-Zugriffe wurden getrennt geprüft. |
| Echter Browser / physisches iPhone | Noch offen. Playwright-Paket vorhanden, Browser nicht installiert. Downloadversuch liefert ungültiges/trunkiertes Archiv; daher kein erfolgreicher Browserlauf behauptet. Optionaler Test `nutrition-browser.cjs` ist vorbereitet; benötigt Playwright mit installiertem Chromium und einen lokalen HTTP-Server auf Port 8765. API-Daten darin sind synthetisch und abgefangen. |

## Quellen und Grenzen

Open Food Facts ist eine kostenlose, gemeinschaftlich gepflegte Quelle. Treffer können fehlen oder unvollständig sein; deshalb immer manuell bestätigen und bei Bedarf Etikettwerte eintragen. Quellenlink und „Open Food Facts · ODbL“ stehen bei externen Treffern und gespeicherten Berechnungen.

- API/Bedienungsregeln: https://openfoodfacts.github.io/openfoodfacts-server/api/
- API-Staging (für Integrationstests, nicht Produktionssuche): https://world.openfoodfacts.net/
- Löffelvolumen: https://www.oetker.de/inspiration/tipps-tricks/t/mengenangaben-beim-backen-umrechnen
- Beispieldaten Ei: https://fdc.nal.usda.gov/food-search/

Keine Freigabe einer vollständig auf iPhone getesteten End-to-End-Verbindung aus den getrennten Tests ableiten. Die verbleibenden zwei Bedienprüfungen sind oben ausdrücklich aufgeführt. Bestehende Rezeptdaten werden nicht migriert, überschrieben oder gelöscht; nur zusätzliche Spalten mit sicheren Standardwerten werden angelegt.
