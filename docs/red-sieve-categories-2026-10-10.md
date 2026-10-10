# Rotes Sieb · Wortfenster und Kategorien · v1.98 · 2026-10-10

## Änderungen
- Wortbereich von 190 auf 90 Pixel verkleinert; Höhe bleibt beim Aufdecken gleich. Lange Begriffe können innerhalb des Felds gescrollt werden; keine Änderung an Promi oder Imposter.
- Dock: Anzahl 1–4 wie bisher, jede Kategorie frei benennbar (1–60 Zeichen), Reihenfolge per zugänglichen SVG-Pfeilknöpfen nach oben/unten. Vorschau zeigt die gewählte Reihenfolge. Neue Namen und Reihenfolge werden gemeinsam mit der Anzahl vor Spielstart gespeichert.
- Spielüberschrift, Rundenauswertung und dauerhaftes Ergebnisarchiv verwenden dieselben gespeicherten Namen und Reihenfolge.
- Additive Supabase-Änderung category_names: bestehende Spiele erhalten ihre bisherigen Namen entsprechend der bisherigen Anzahl. Keine Spiele, Wörter oder Ergebnisse gelöscht; nach Spielstart bleibt Konfiguration gesperrt.
- Ältere Clients können configure ohne category_names weiter verwenden. Bestehende private Tabellen/RLS, Besitzerprüfung, Rollenrechte und serverseitige Spielelogik bleiben erhalten.

## Tests
- Alle 27 lokalen Testsuites erfolgreich. Ergänzte DOM-Prüfungen: Namen bearbeiten, Kategorienzahl ändern, Reihenfolge mit Pfeilen tauschen, gemeinsame Speicherung, eigene Namen auf Spielseite und Auswertung, konstantes kleineres Wortfeld.
- Drei SQL-Integrationstests auf Supabase erfolgreich; ausschließlich synthetische Spiele innerhalb vollständig zurückgerollter Transaktionen. Neue Prüfung mit drei eigenen Kategorien: Name/Reihenfolge speichern, trimmen, Übergänge und Abschluss zur richtigen Anzahl, Archive nach Beenden. Ungültige Anzahlen, Typen, leere/lange Namen, unpassende Listen sowie Änderungen nach Start werden abgelehnt.
- Bestandsprüfung: keine Abweichung zwischen Kategorienzahl und gespeicherter Namensliste.
- Reale HTTP-Negativtests erfolgreich: ungültiger Spielstatus, Spieler, Wortzugriff, Belegung, Aktionen und anonyme Verwaltung. Keine persistenten Testobjekte erzeugt.
- Supabase Security Advisor: keine neuen Warnungen. Bereits bekannt: Leaked Password Protection Disabled. https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Einschränkungen
- Zunächst wurde eine Erweiterung auf zwölf Kategorien vorbereitet. Zwei Versuche zur Erweiterung der Datenbank-Constraints scheiterten mit Invalid or expired requestState; Prüfung bestätigte, dass nichts angewendet wurde. Die anschließend vereinfachte additive Migration war erfolgreich. Die veröffentlichte Version bleibt bei der bestehenden Grenze von vier Kategorien; Namen und Reihenfolge sind frei konfigurierbar.
- DOM/CSS-Tests sind kein physischer iPhone-Test. Positiver Mehrbrowser-Test und echte gleichzeitige HTTP-Aktionen bleiben wie im Issue-27-Bericht offen.
