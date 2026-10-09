# Imposter: bestätigte fünf Änderungen · v1.80

1. „Spielleitung/Spielleiter“ in allen aktuellen Bedienungsansichten zu „Rundenleitung/Rundenleiter“ geändert. Alte Serverfehlermeldungen werden im RPC-Client entsprechend umbenannt; technische host-IDs bleiben unverändert.
2. Checkbox „Imposter sehen sich gegenseitig“ auf der Spielerstellungsmaske. Standard aus; vor Start gespeichert, nach Start fest. Die Einrichtung zeigt die Auswahl auch in der Zusammenfassung. Bei aktivierter Option liefert der Server ausschließlich einem Imposter die Namen anderer Imposter derselben aktuellen Runde. Normale Spieler, Rundenleitung, öffentlicher Status und deaktivierte Option erhalten diese Liste nicht. Bei einem einzigen Imposter ist die Liste leer.
3. Öffentliche Seiten zeigen zuerst „Dein Name“, anschließend „Rundenleitung“, mit derselben CSS-Klasse und Schriftgröße. Noch nicht gewählter Name wird als solcher bezeichnet.
4. Rollen-/Wortfeld ist eine dauerhaft vorhandene eigenständige Sektion, im verborgenen Zustand mit durchgestrichenem Auge als SVG-Piktogramm. Name bestätigen und Aktualisieren öffnen keine Rolle automatisch.
5. „Rolle anzeigen“ ist eine Haltebedienung für Maus, Touch, Stift und Tastatur (Space/Enter). Loslassen, Abbruch, Wegziehen aus dem Knopf, verlorene Pointer-Capture, Fokus-/Fensterverlust, Hintergrund und Seitenwechsel verbergen die Inhalte sofort. Späte Rollenantworten nach Loslassen werden verworfen. Knopf bleibt während der Anfrage und regelmäßiger Aktualisierung im DOM, damit Berührungen nicht durch eine Neuzeichnung verloren gehen. Touch-Auswahl/Long-Press-Kontextmenü auf dem Knopf unterdrückt. Kein dauerhaftes Umschalten mehr.

Die Rundenleitung gibt ihr Wort weiterhin im Eingabeformular ein; das bereits freigegebene Wort im Rollenfeld erscheint ebenfalls nur beim Halten. Gewinner- und Folgerundenknöpfe bleiben erhalten. Imposter-Mitspieler erscheinen ausschließlich innerhalb der gehaltenen Rollenansicht und werden beim Loslassen mit verborgen.

## Dateien / Migration

- `database/imposter_teammates.sql`: neue boolesche Einstellung, Eigentümer-Konfiguration, schmaler Role-RPC. Migration `imposter_optional_teammates` erfolgreich angewandt. Keine vorhandenen Spiele/Ergebnisse gelöscht; neue Option für bestehende Spiele aus.
- `js/games/admin.js`: Checkbox, Zusammenfassung, Begriffe.
- `js/games/public.js`, `public-controller.js`: Namen-Reihenfolge, permanentes Feld, keine automatische Anzeige, Antwortschutz.
- `js/games/hold.js`: isolierte Halte-/Abbruchlogik.
- `js/games/api.js`: einheitliche Begriffe bei alten Fehlermeldungen.
- `js/games/games.css`, `imposter.html`: stabile Sektion, Augen-Piktogramm, gleiche Namen-Schriftgröße und Touch-Layout.
- `index.html`, `js/app.js`, `js/games/admin-data.js`: Cache-Version v1.80.

## Tests und Grenzen

Alle **20 lokalen Testsuiten** und Syntaxprüfungen bestanden. Bestehender Datenbanktest mit 11 Personen/20 Runden sowie ein-Imposter-Fall erneut bestanden. `tests/imposter-teammates.sql`: Option aus/an, zwei/ein Imposter, richtige Namen ohne eigenen Namen, keine Ausgabe an normale Spieler/Rundenleitung/Status, keine nachträgliche Änderung im aktiven Spiel. Sämtliche synthetischen Spiele innerhalb vollständig zurückgerollter Transaktionen.

`tests/imposter-hold.test.cjs`: Pointer-Up/Cancel/Leave/Outside/Lost-Capture, Element-/Fensterblur, Pagehide/Hintergrund, Space/Enter, Wiederholung und deaktivierte Knöpfe bestanden. Controller-Test: Auswahl und Aktualisieren bleiben verborgen; verspätete Antwort nach Loslassen bleibt verborgen. DOM-Tests: Checkbox speichern, Namensreihenfolge und gleiche Klasse, SVG im dauerhaften Feld, Imposter-Mitspieler und verschwundene Inhalte beim Verbergen. RPCs/DOM in den JavaScript-Tests gemockt; keine tatsächliche iPhone-Berührung oder Browser-End-to-End-Abnahme behauptet.

Keine neuen Security-Advisor-Warnungen; vorhandene [Leaked Password Protection Disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) bleibt unverändert. Die zuvor offenen echten HTTP-/Backend-Parallel-/iPhone-Prüfungen bleiben offen. Öffentlicher Freundeskreis-Link prüft weiterhin keine Identität; Credential/RLS-Grenzen unverändert. Worte, Hinweise und Rollen werden nicht in localStorage gespeichert.
