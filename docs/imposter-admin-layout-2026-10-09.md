# Imposter: Einrichtung und Spielübersicht · v1.88

## Einrichtung

Spieler werden direkt in einem gerahmten Formular über ein Namensfeld mit nachfolgendem SVG-Plus hinzugefügt. Die bestehende Spielerliste mit Bearbeiten/Entfernen befindet sich im selben Rahmen. Teilnehmer-Zähler und beide erklärenden Texte entfallen. Der separate Imposter-Rahmen bleibt erhalten. Dort stehen unten Spiel starten und Abbrechen nebeneinander. Keine Löschen-Schaltfläche in der Einrichtung. Abbrechen kehrt zur Liste zurück und behält den bereits gespeicherten Entwurf; keine Daten werden stillschweigend gelöscht.

## Spielansicht und Archiv

Gruppenlink/Kopieren bleibt für aktive Spiele erhalten. Nur Spieler ist aufklappbar; bestätigte Belegungen tragen einen kleinen Petrol-Haken mit zugänglicher Bezeichnung Im Spiel. Belegungen lassen sich weiterhin gezielt zurücksetzen. Liveüberblick, Rundenhistorie und zusätzlicher Belegungszähler sind aus der Oberfläche entfernt. Bestehende Rundendaten bleiben gespeichert und dienen unverändert der Imposter-Siegstatistik, die darunter direkt als Tabelle sichtbar ist.

Ganz unten stehen Spiel beenden und Spiel löschen nebeneinander. Beenden bleibt direkt auslösend, Löschen mit konkreter Bestätigung. Nach Spielende beziehungsweise erneuter Archivöffnung dieselbe reduzierte Ansicht; Beenden deaktiviert, Löschen weiterhin möglich. Authentifizierung und Eigentümer-RPCs unverändert.

## Dateien und Nachweise

`js/games/admin.js`, `js/games/games.css`, Cache-Versionen v1.88 in `index.html`, `imposter.html`, `js/app.js`, `js/games/admin-data.js`, `js/games/public.js`. `tests/imposter-admin.test.cjs` erweitert.

Lokale Testsuiten für Admin, Statistik, öffentliche Ansicht und Navigation erfolgreich. Admin-DOM-Test: Plus-Eingabe und eigener Rahmen, keine Löschen-Schaltfläche oder entfernten Hinweise in Einrichtung, Startvalidierung/Fehler/Retry, Speichern von Namen und Konfiguration, Abbrechen bewahrt Entwurf, genau ein Spieler-Accordion, Haken bei Belegung und Entfernung nach Reset, Accordion bleibt beim Polling offen, keine Live-/Historie-Ansicht, ausschließlich Imposter-Siege, Aktionen ganz unten, direktes Beenden, deaktiviertes Beenden im Archiv, erneut geöffnetes Archiv, Löschen abbrechen/bestätigen. Syntaxprüfung erfolgreich. Keine Datenbank- oder Datenbestandsänderungen. Tatsächliche iPhone-/Pixelprüfung weiterhin offen.
