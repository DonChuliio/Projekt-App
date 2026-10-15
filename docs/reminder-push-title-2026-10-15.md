# Erinnerungs-Push: Titel und Kommentar · v1.103 · 2026-10-15

- Erinnerungstitel ersetzt „Dock · Erinnerung“ als Notification-Titel.
- Darunter ausschließlich der optionale Kommentar. Kein doppelter Titel im Body, kein Standardtext bei fehlendem Kommentar.
- Lange Kommentare werden auf 240 Unicode-Codepoints plus Ellipse gekürzt, statt wie zuvor ganz zu entfallen.
- Service Worker erhält den bewusst leeren Body; Fallback nur bei tatsächlich fehlendem/nicht-textuellem Body. Ziele, IDs, Authentifizierung, Zeitsteuerung und Reservierungen unverändert.
- swift-processor v28 aktiv, bestehende Cron-Authentifizierung beibehalten.

„from Dock“ kommt nicht aus Payload oder Service Worker, sondern ist die Plattform-Herkunftszeile für die installierte Web-App. Diese Änderung entfernt sie nicht; kein Manifest-/App-Name-Hack und kein native-App-Neubau. Quellen: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/ und https://intercom.help/progressier/en/articles/13421891-can-i-remove-the-from-app-name-line-from-pwa-push-notifications

Alle 31 lokalen Testsuites erfolgreich. Ergänzt: Titel/Kommentar getrennt, ohne Kommentar leerer Body, langer Kommentar gekürzt, Service Worker übernimmt Titel und Body ohne Fülltext. Keine zusätzliche Test-Push an reale Geräte ausgelöst. Visuelle Abnahme auf physischem iPhone bleibt offen, ebenso die älteren Versandabnahmen aus Issue 31.
