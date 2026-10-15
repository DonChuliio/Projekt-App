# v1.106 – Lebensmittelsuche: „Load failed“ auf dem iPhone

## Ursache und Korrektur

Die Bildschirmmeldung trat beim externen Suchaufruf auf. Der gemeinsame Client für REST und Edge Functions setzte auch für `/functions/v1/food-search` den PostgREST-Header `Prefer: return=representation`. Die CORS-Allowlist der Funktion enthielt diesen Header nicht. Die echte OPTIONS-Abfrage mit `Access-Control-Request-Headers: apikey,authorization,content-type,prefer` ergab HTTP 204, erlaubte jedoch ausschließlich `authorization,apikey,content-type,x-client-info`. Damit blockiert der Browser den folgenden POST; Safari meldet „Load failed“. Reine curl-POST-Tests ohne Browser-Vorabfrage hatten diesen Fehler zuvor nicht erfasst.

- Client: `Prefer` ausschließlich an REST-Endpunkte senden; Edge-Aufrufe verwenden nur die benötigten Header.
- Server: `prefer` zusätzlich erlauben, damit auch bereits geöffnete App-Versionen weiterarbeiten können.
- Netzwerkfehler verständlich auf Deutsch erklären. Eigene Werteeingabe bleibt erreichbar.
- Authentifizierungsprüfung, RLS, Suchlimit und Datenbank unverändert.

## Prüfung

- Vorheriger Fehler durch echte OPTIONS-Anfrage an die bereitgestellte Funktion nachgewiesen.
- Nach Deployment derselben Anfrage: HTTP 204, alle vier Header ausdrücklich erlaubt, einschließlich `prefer`; Origin erlaubt. Die vorherige Browser-Sperre ist damit behoben.
- Regressionstests: Edge-Aufrufe ohne `Prefer`, REST-Schreibzugriffe weiterhin mit `Prefer`, komplette CORS-Header-Allowlist, deutsche Meldung bei simuliertem Safari-Netzwerkfehler.
- Alle 36 automatisierten Testdateien bestanden.
- Anonymer echter POST weiterhin HTTP 401, mit CORS-Antwort; keine Aufweichung der Anmeldung.
- Vollständige angemeldete Suche und physische iPhone-Nutzung weiterhin nicht hier nachgewiesen; keine entsprechende End-to-End-Freigabe behauptet.

Quelle: https://supabase.com/docs/guides/functions/cors
