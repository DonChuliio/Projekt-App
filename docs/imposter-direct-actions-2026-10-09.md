# Imposter: direkte Reset-/Löschaktionen · v1.90

Belegungs-Refresh und Spiel löschen lösen nun unmittelbar den bestehenden RPC aus, ohne Bestätigungsabfrage. Beim Spiel-Löschen werden Spiel, Spieler, Runden und Statistiken endgültig entfernt; Eigentümerprüfung und Datenbank-Löschreihenfolge bleiben unverändert. Die Oberfläche wechselt erst nach erfolgreicher Löschung zur Liste. Bei Fehler bleibt das Spiel geöffnet, die Belegung beziehungsweise Daten bleiben erhalten und ein Fehler wird angezeigt. Vorhandene Busy-Sperre verhindert doppelte Aufrufe durch Mehrfachklick. Die Bestätigung für das Entfernen einzelner Spieler in der Einrichtung ist nicht betroffen.

Dateien: `js/games/admin.js`, Cache-Versionen v1.90 in App/Spielseite; `tests/imposter-admin.test.cjs`. Keine DB-/Auth-/RLS-Änderungen.

Admin-DOM-Test erfolgreich: kein Bestätigungsdialog bei Reset oder Spiel-Löschung, gezielter Reset mit verschwundenem Belegungs-Haken, Rückkehr zur Liste nach Löschung, API-Fehler bei beiden Aktionen lässt Daten bestehen, erneuter Klick funktioniert, Doppelklick löst jeweils nur einen weiteren RPC aus. Syntaxprüfung erfolgreich. Tatsächliche iPhone-Prüfung weiterhin offen.
