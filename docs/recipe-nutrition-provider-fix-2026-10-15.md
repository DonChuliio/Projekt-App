# v1.107 – Open Food Facts: Suchdienst umgestellt

## Nachweis der Ursache

Der bisherige Produktionsendpunkt `https://world.openfoodfacts.org/cgi/search.pl` beantwortete eine echte Paprika-Suche mit HTTP 503 und der HTML-Seite „Page temporarily unavailable - Open Food Facts“. Die in der App ausgegebene Meldung kam damit von der expliziten Fehlerbehandlung einer nicht erfolgreichen Anbieterantwort, nicht mehr vom zuvor behobenen CORS-Problem.

Der offiziell dokumentierte eigenständige Suchdienst `https://search.openfoodfacts.org/search` lieferte dagegen HTTP 200 und echte Treffer. Auch der tatsächlich verwendete POST mit `q: paprika`, `langs: [de]`, `page_size: 8` und den Feldern `code, product_name, brands, nutriments` wurde erfolgreich gegen den Produktionsdienst geprüft. Die Antwort enthielt beispielsweise einen Paprika-Treffer mit 24 kcal, 0,8 g Eiweiß, 4 g KH und 0,1 g Fett je 100 g; die Bezugsgröße und der passende Treffer bleiben im UI ausdrücklich zu bestätigen.

## Änderung

- `food-search` verwendet jetzt ausschließlich den offiziellen Search-a-licious-Produktionsdienst. Kein Ausweichen auf Staging, Proxy, andere IPs oder Rate-Limit-Umgehungen; keine automatischen Wiederholungsschleifen.
- Suchbegriffe werden als POST-Inhalt übermittelt, die Suche bleibt manuell und auf acht Treffer begrenzt. Deutsche Suche; keine zusätzlichen Anfragen pro Produkt.
- Parser unterstützt dessen `hits` und Marken-Arrays. Rückwärtskompatible Verarbeitung alter `products`-Antworten bleibt erhalten. Ausschließlich kcal, Eiweiß, KH, Fett gelangen ins UI; fehlende Werte bleiben unbekannt.
- HTTP 429 des Anbieters wird als Suchbegrenzung erklärt; Ausfälle bleiben Fehler und werden nicht als leere erfolgreiche Suche gecacht.
- Beim Wiederholen werden alte Statusfehler entfernt. Die Eingaben bleiben erhalten.
- Anmeldung, RLS, CORS-Korrektur, Cache, globales Suchbudget und manuelle eigene Werte unverändert. Keine zusätzlichen Dienste oder Kosten.

## Tests und Grenzen

- Echter alter Produktionsendpunkt: HTTP 503 nachgewiesen.
- Neuer Produktionsendpunkt: HTTP 200 für GET sowie POST; abschließend dieselbe deutsche POST-Struktur wie im Code erfolgreich geprüft.
- Echte deutsche Produktionsantwort durch den produktiven Parser verarbeitet; Treffer mit Nährwerten vorhanden.
- `nutrition-provider-contract.test.cjs`: Zieladresse/POST/Sprach- und Feldparameter, `hits`, Marken-Arrays, acht Treffer, fehlend gegenüber 0, unbekannte Bezugsgröße, HTTP 429/503, kein Fehler-Caching bestanden. Optional mit `OFF_SEARCH_JSON` gegen eine gespeicherte echte öffentliche Suchantwort ausführbar.
- UI-Regressionsprüfung: Nach einem simulierten Ausfall entfernt eine erfolgreiche erneute Suche die alte Fehlermeldung.
- Alle 37 automatisierten Testdateien bestanden.
- Die vollständige angemeldete Verbindung vom physischen iPhone über die bereitgestellte Funktion zum neuen Anbieter ist weiterhin vom Benutzer zu bestätigen. Die echte Anbieterprüfung und die Handler-/UI-Tests sind kein Ersatz für diesen vollständigen Durchlauf.

Dokumentation des offiziellen Dienstes: https://openfoodfacts.github.io/search-a-licious/users/ref-openapi/
