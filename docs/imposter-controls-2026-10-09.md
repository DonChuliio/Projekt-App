# Imposter-Bedienung · v1.83

## Änderungen

- Imposter-Auswahl in Dock: nicht gewählte Schaltflächen grau, gewählte Schaltfläche Petrol; `aria-pressed` bleibt erhalten.
- Öffentlicher Hinweis „Bei falscher Belegung bitte in Dock zurücksetzen.“ entfernt.
- Spiele in Dock löschbar, einschließlich Spieler, Runden, Rollen, Belegungen und Statistiken. Bewusste Löschbestätigung bleibt erhalten. Nur der angemeldete Eigentümer darf löschen; öffentliche Gruppenlinks werden dadurch ungültig.
- Gewinnerknöpfe lösen ohne Bestätigung `finish_next` aus. Ergebnis und neue Runde entstehen atomar unter dem vorhandenen Spiel-Zeilenschloss. Die vorherige Rundenleitung wird bei der nächsten Auswahl ausgeschlossen. Alte `finish`-/`next`-Aufrufe bleiben kompatibel. Doppelte/stale Aufrufe für die alte Runde werden abgewiesen.
- Rolleninhalt auf feste 240px verkleinert, mit kompakteren Abständen. Rundenleitung, zwei Imposter, Wort und Hinweis benutzen denselben Bereich; lange Inhalte scrollen intern, ohne den Halteknopf zu verschieben. Der Bereich bleibt für die Rundenleitung bis zur Freigabe des Wortes verborgen. Halte-/Loslassverhalten unverändert.
- In Dock: zusätzlicher Gruppenlink-Hinweis und WhatsApp-Schaltfläche entfernt. Teilnehmer sind jetzt in einem aufklappbaren Bereich mit erhaltenen Möglichkeiten zum Zurücksetzen einer Belegung. Einrichtung vor Spielstart bleibt direkt sichtbar.
- „Spiel beenden“ löst in Dock direkt aus, ohne Bestätigung. Archiv und Statistiken bleiben dabei erhalten; der Link wird deaktiviert.

## Dateien

`js/games/admin.js`, `js/games/public.js`, `js/games/games.css`: Bedienung/Darstellung. `database/imposter_finish_delete.sql`: bestehende private Funktionen erweitert; keine neuen Endpunkte, Tabellen oder Grants. Migrationen `imposter_atomic_next_and_owner_delete` und `imposter_owner_delete_dependency_order` angewandt. Zweite Migration korrigiert die im Test erkannte Fremdschlüssel-Reihenfolge beim Löschen (Sessions, Runden einschließlich Rollen/Claims, dann Spiel einschließlich Spieler). `index.html`, `imposter.html`, `js/app.js`, `js/games/admin-data.js`: Cache-Version. Drei bestehende Imposter-Testdateien angepasst, `tests/imposter-finish-delete.sql` ergänzt.

## Nachweise und Grenzen

- 20 lokale Testsuiten bestanden; Syntax von Admin/Public geprüft. DOM-Tests: beide Gewinnerknöpfe ohne Bestätigung, Rundenleiter-Feld vor Wortfreigabe verborgen/nach Freigabe sichtbar, aufklappbare Spieler, kein WhatsApp/Hinweis, direktes Beenden, bestätigtes Löschen/Abbrechen. Controller-Test: Gewinner-Doppelklick während laufender Anfrage sendet nur einen Aufruf, neuer Rundenstatus kommt ohne zusätzlichen Knopfdruck, Name bleibt gespeichert und Rolle verborgen. CSS-Prüfungen für feste kleinere Höhe und Auswahlfarben.
- Neuer realer Supabase-SQL-Test in vollständig zurückgerollter Transaktion bestanden: gültiges Ergebnis und Runde 2 in einem Aufruf, neue Rundenleitung, Ergebnis in Historie, unzulässiger Gewinner und fremde Rundenleitung abgewiesen, alter/doppelter Aufruf abgewiesen, anonyme/fremde Löschaufrufe abgewiesen, Eigentümer kann aktives Spiel und Entwurf löschen, abhängige Datensätze entfernt, gelöschter Link nicht mehr aktiv. Ausschließlich synthetische Spieldaten; keine echten Spiele verändert.
- Bestehende SQL-Regressionstests für Lebenszyklus und gegenseitige Imposter-Anzeige weiterhin bestanden.
- Security Advisor: ausschließlich bereits bekannte Warnung „Leaked Password Protection Disabled“. Keine neuen Hinweise. [Supabase-Hinweis](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- DOM/CSS-Tests ersetzen keine tatsächliche iPhone-Geometrieprüfung. Tatsächliche iPhone-/Browser-/HTTP-/Paralleltests bleiben offen. Insbesondere extrem lange Wörter/Hinweise benötigen internes Scrollen.
