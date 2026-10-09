# Imposter: Spieler-Piktogramme und Archiv · v1.89

- Einrichtung: nur ein Löschen-Piktogramm rechts vom Namen; Bearbeiten-Aktion samt ungenutztem Formular entfernt. Einzelnen Spieler entfernen bleibt gezielt bestätigt und nutzt unveränderten RPC.
- Aktive Spielerübersicht: kleines Refresh-Piktogramm direkt neben dem Belegungs-Haken. Zugängliche Beschriftung enthält den Namen; Bestätigung und bestehende Zurücksetzen-Funktion bleiben erhalten.
- Zeilen umbrechen als Text innerhalb der Namensspalte, nicht zwischen Namen und Aktionen. Icons 18px, berührbare Fläche weiterhin 44px.
- Öffentlicher Wartehinweis: Rundenleiter/in legt das Wort fest.
- Beendete Spiele und erneut geöffnete Archivspiele zeigen keine Spieler-Liveübersicht. Siegstatistik und bestehende Abschluss-/Löschaktionen bleiben verfügbar.

Dateien: `js/games/admin.js`, `js/games/public.js`, `js/games/games.css`, Cache-Versionen v1.89 in App/Spielseite, zwei bestehende Imposter-DOM-Tests.

Drei Testsuiten erfolgreich: Admin, öffentliche Ansicht und Siegstatistik. Explizit geprüft: reine SVG-Aktionen statt Bearbeiten/Entfernen-Text, Entfernung eines einzelnen temporären Spielers und Abbrechen einer Entfernung, Refresh direkt nach Haken und gezielter Reset, korrigierter Wartehinweis, kein Spieler-Accordion/keine Spielerliste nach Beenden und erneutem Archivöffnen, erhaltene Statistik, feste Inline-Zeilen und Icon-/Touchgrößen (CSS). Syntaxprüfung erfolgreich. Keine DB-/Auth-/RLS-Änderungen. Tatsächliche iPhone-/Pixelprüfung weiterhin offen.
