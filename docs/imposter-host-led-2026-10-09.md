# Imposter: Dock-Verwaltung und Spielleiter am Link · v1.78

Die bestätigten Vorgaben vom 09.10.2026 ersetzen den bisherigen Ablauf, bei dem jede Runde in Dock Wort und Spielleitung erhielt und Namen neu ausgewählt wurden.

## Umsetzung

- Dock: Spiel erstellen, Namen anlegen, Personenanzahl inklusive Spielleitung und ein/zwei Imposter einstellen. Konfiguration speichern oder Spiel starten. Erst beim erfolgreichen Start entsteht der Gruppenlink; exakte Zahl angelegter Namen wird serverseitig geprüft.
- Server: zufällige Spielleitung und Rollen werden atomar erstellt. Die Spielleitung hat keine Spielerrolle. Bei jeder Folgerunde wird die letzte Spielleitung ausgeschlossen.
- Öffentlicher Link: Dropdown mit allen angelegten Namen einschließlich Spielleitung. Nach erster Auswahl bleibt die Identität für dieses Spiel auf dem Gerät gespeichert. Ein gamebezogenes zufälliges Credential und die Teilnehmer-ID liegen im localStorage; keine Wörter, Hinweise, Rollen oder Namen. Auf gesperrten Browser-Speicher ist kein Verlass; dann gilt die Auswahl nur für die geöffnete Seite. Dock kann falsche/verlorene Belegungen zurücksetzen.
- Spielleitung: Wort und optionalen Hinweis eingeben, „Wort freigeben“. Nur die aktuelle Spielleitung darf Vorbereitung, Ergebnis und nächste Runde serverseitig ausführen. Andere Spieler erhalten vor Freigabe nur einen Wartestatus, danach nur eigenes Wort oder Imposter-Hinweis.
- „Aktualisieren“ lädt aktuellen Status und eigene Ansicht. Rollen können verborgen und erneut angezeigt werden. Automatische Statusprüfung alle drei Sekunden; keine unnötige Neuzeichnung bei unveränderten Daten. Wort-/Hinweisentwurf, Fokus und Ergebnisbestätigung bleiben beim Polling erhalten. Im Hintergrund werden Rollen verborgen.
- Spielleitung bestätigt „Imposter gewonnen“ oder „Die anderen gewonnen“, anschließend „Neue Runde starten“. Die Namen bleiben belegt, Rollen und Spielleitung wechseln, Rundennummer zählt serverseitig weiter. Doppelte Ergebnis- und alte Rundennachrichten werden abgelehnt.
- Dock: Live-Überblick aktualisiert alle fünf Sekunden, zeigt Phase, aktuelle Spielleitung, belegte Namen, Wort/Hint und Ergebnisse. Auswertung mit Rundenhistorie (Spielleitung, Imposter, Gewinnergruppe), Siegen und gewerteten Runden pro Person. Die Spielleitung wird weder als Spieler noch als Gewinner gezählt; abgebrochene Runden ohne Ergebnis zählen nicht als Sieg oder gewertete Teilnahme.
- „Spiel beenden“ in Dock benötigt eine sichtbare Bestätigung. Link, Rollenabruf und Spielleiteraktionen sind danach dauerhaft gesperrt. Kein Neustart desselben Spiels. Die Übersicht zeigt das beendete Spiel grau; es bleibt für die Statistik anklickbar. Ein neues Spiel bekommt einen neuen Link.

Die Namensliste ist nach Start gesperrt, damit Besetzung und historische Statistiken konsistent bleiben. Belegungen bleiben in Dock zurücksetzbar. Die bestehenden getrennten Masken und Zurück/Home-Navigation bleiben erhalten.

## Daten und Migration

`database/imposter_lifecycle.sql` wurde erfolgreich angewandt. Bestehende private Tabellen und RPCs weiterverwendet; Zustände/Ergebnisfelder ergänzt, neue private `dock_game.sessions` mit RLS und verweigernden Client-Policies. Neue öffentliche Invoker-Funktion `imposter_host_action` ruft eine schmale private Funktion auf. Alle privileged Funktionen haben leeren search_path; interne Rundenerstellung hat keine anon-/authenticated-Ausführungsrechte.

Gemeinsame Spielzeilensperre und eindeutige Constraints verhindern doppelte Spielstarts, Namen und Rollen. Ergebnis/Start der nächsten Runde prüft Credential, Spielzustand und aktuelle Runde/Spielleitung. Spielende wird in sämtlichen öffentlichen Aufrufen berücksichtigt. Öffentlicher Status enthält keine Wörter, Hinweise, Credentials oder Rollenzuordnungen; Historie und Statistik bleiben nur für den Eigentümer in Dock verfügbar.

Bestehende Spiele/Teilnehmer/Runden wurden nicht gelöscht. Bereits gestartete Spiele werden als aktiv übernommen, ihre Wortdaten bleiben erhalten. Bestehende Runden ohne Gewinner erscheinen ohne Ergebnis und werden nicht als Sieg gewertet. Noch nicht gestartete Spiele werden Entwürfe; deren frühere vorzeitig erzeugte Links werden deaktiviert. Nach Start entsteht der neue Link. Alte rundengebundene Belegungen bleiben intern erhalten, gelten aber nicht als neue spielgebundene Identität; beim ersten Aufruf nach der Umstellung wird der Name einmal neu gewählt.

## Dateien

- `database/imposter_lifecycle.sql`: Lebenszyklus, Spieler-Credentials, Zufallsspielleitung, Rollen, host-only-Aktionen, Statistik, Linkdeaktivierung.
- `js/games/admin.js`: Dock-Einrichtung/Live-Ansicht/Statistik/Archiv, automatisches Statusladen.
- `js/games/public-controller.js`: spielbezogene Identität, Refresh/Rollen, Hostaktionen, Schutz vor verspäteten Antworten.
- `js/games/public.js`: Namenswahl, Wort-/Hinweiseingabe, Gewinnerbestätigung, nächste Runde und ungültiger Link.
- `js/games/games.css`: ausgegraute beendete Spiele, Statistik und mobile Texteingaben.
- `index.html`, `imposter.html`, `js/app.js`, `js/games/admin-data.js`: Cache-Version v1.78.
- `tests/imposter.sql`, `tests/imposter-admin.test.cjs`, `tests/imposter-controller.test.cjs`, `tests/imposter-public-ui.test.cjs`: neue Abläufe ersetzen überholte Prüfungen.

## Durchgeführte Prüfungen

| Prüfung | Ergebnis |
| --- | --- |
| Reale Datenbank, SQL-Rollen authenticated/anon, synthetisches Spiel mit 11 Namen / 20 Runden / 2 Impostern | Bestanden: Hostwechsel ohne unmittelbare Wiederholung, gespeicherte Identität, jeweils zehn Rollen und zwei Imposter, Host ausgeschlossen, korrekt freigegebene Inhaltsausgabe |
| Drei Namen / ein Imposter | Bestanden: zwei aktive Rollen, davon exakt ein Imposter |
| Berechtigungen | Bestanden: andere Spieler können keine Wörter/Ergebnisse/Folgerunden setzen, kein anonymes Enden, kein direkter Credential-Zugriff, Fremdeigentümer dürfen nicht lesen/beenden |
| Ablauf und Duplikate | Bestanden: falsche Personenanzahl, erneuter Spielstart, Änderung aktiver Namen, frühe/doppelte Ergebnisse, alte/doppelte Folgerunden abgelehnt |
| Statistik | Bestanden: 20 Ergebnisse, insgesamt 200 gewertete Spieler-Teilnahmen und 100 Siege bei zehn Imposter-/zehn Spieler-Siegen, keine Host-Siege |
| Belegung / Spielende | Bestanden: Reset invalidiert Credential, kein Neustart beendeter Spiele, alter Link liefert nur unavailable, Rollen und Folgerunden gesperrt, Historie bleibt erhalten |
| Controller / DOM | Bestanden: Konfiguration, Startfehler/Wiederholen, gespeicherte Auswahl/Reload, Hostaktionen, neue Rollen, Refresh, Verbergen, Verbindungsfehler, veraltete Poll-Antworten, doppelte Klicks, Eingabeentwurf/Bestätigung beim Polling, graues Archiv mit Statistik |
| Regression | Alle 18 lokalen Testsuiten und Syntaxprüfungen bestanden |

Datenbanktests ausschließlich innerhalb vollständig zurückgerollter Transaktionen. Kontrollabfrage: **0 synthetische Spiele verbleiben**. DOM-/Controller-Tests nutzen gemockte RPCs. Kein echter HTTP/JWT-End-to-End-Test oder tatsächlicher iPhone-Test behauptet. Kein echter gleichzeitiger Backend-Paralleltest: die zuvor automatisch abgelehnte persistente Live-Testfixture wurde nicht angelegt oder umgangen. Sperren und doppelte Aufrufe wurden sequenziell geprüft; vollständige Parallel-Abnahme bleibt offen.

Security Advisors: keine neuen Warnungen für die Spieltabellen; bereits vorhandene Warnung [Leaked Password Protection Disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) bleibt unverändert.

## Grenzen

Der Link ist für einen vertrauten Freundeskreis, kein Identitätsnachweis. Eine Person kann absichtlich fremde Namen auswählen; die Belegung schützt vor versehentlicher Doppelwahl. Öffentliches Host-Credential berechtigt nur zu Spielleitung dieses Spiels/der aktuellen Runde, niemals Dock-Verwaltung oder fremden Spielen. Wer bereits ein Wort gesehen hat, kann es nicht technisch vergessen; serverseitig sind beendete/alte Runden gesperrt, im verbundenen Browser werden Ansichten beim nächsten Statuscheck entfernt.

Das Gerät-Credential wird beim nächsten Aufruf eines beendeten Links gelöscht. Geräte, die nie wieder verbinden, können nicht aus der Ferne aus localStorage bereinigt werden; der Server lehnt diese Credentials trotzdem ab. Ein verlorenes Credential erfordert Dock-Reset. Ein von der Spielleitung gemeldetes Ergebnis ist eine manuelle Entscheidung, keine automatische Spielprüfung.
