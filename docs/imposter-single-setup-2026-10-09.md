# Imposter: eine Konfigurationsseite · v1.81

Nach Erstellen/Öffnen eines Entwurfs stehen Spieler hinzufügen/bearbeiten/entfernen, ein oder zwei Imposter und „Imposter sehen sich gegenseitig“ auf derselben Seite. Ein/zwei Imposter sind Schaltflächen mit `aria-pressed`, kein Dropdown. Die Personenanzahl wird aus den gespeicherten Namen abgeleitet. Mindestanzahl weiterhin drei Personen für einen bzw. vier für zwei Imposter, einschließlich Rundenleitung.

„Spieler bestätigen“, separate Konfigurationsmaske, manuelle Personenanzahl und „Einstellungen speichern“ entfallen. Auswahländerungen werden mit den bestehenden Eigentümer-RPCs gespeichert. Am Ende steht einmal „Spiel starten“; erst nach erfolgreichem Start erscheint der vorhandene Gruppenlink. Namenverwaltung nach Start bleibt wie bisher separat und schreibgeschützt, Belegungen sind zurücksetzbar.

Die normalen Aktualisieren-Knöpfe sind in Dock und öffentlicher Spielseite entfernt. Automatisches Statusladen bleibt bei drei Sekunden öffentlich und fünf Sekunden in der Dock-Live-Ansicht. Ein fehlgeschlagener Datenaufruf bietet „Erneut versuchen“; dieser lädt den Zustand erneut, statt eine möglicherweise bereits ausgeführte Mutation blind zu wiederholen. Nach erfolgreicher Wiederherstellung verschwindet der Knopf. Hinweise fordern nicht mehr zur manuellen Aktualisierung auf. Browser-Reload bleibt möglich; die gespeicherte öffentliche Namenswahl bleibt unverändert.

## Dateien / Prüfung

- `js/games/admin.js`: gemeinsame Entwurfseinrichtung, Buttons, abgeleitete Personenanzahl, einmaliger Start, Fehler-Retry und kein normales Refresh.
- `js/games/public.js`: Fehler-Retry statt normalem Refresh, automatische Wartehinweise.
- `js/games/games.css`: nebeneinander liegende, sichtbar ausgewählte Imposter-Buttons.
- `index.html`, `imposter.html`, `js/app.js`, `js/games/admin-data.js`: Cache-Version v1.81.
- `tests/imposter-admin.test.cjs`, `tests/imposter-public-ui.test.cjs`: Spieler/Settings auf derselben Seite, kein Konfigurations-Dropdown/Bestätigungs-Zwischenschritt, persistente Auswahl, Mindestanzahl, Startfehler/Wiederholung, Link erst nach Start, kein Refresh im Normalzustand und Retry nur im Fehlerzustand.

Alle **20 lokalen Testsuiten** und Syntaxprüfungen bestanden. Keine Datenbankmigration oder Änderung an Auth/RLS erforderlich; vorhandene Daten, Haltebedienung, Statistik, Zufalls-Rundenleitung und deaktivierte Archivlinks unverändert. DOM-/RPC-Tests gemockt; reale iPhone-/HTTP-/Parallel-Abnahmen weiterhin offen.
