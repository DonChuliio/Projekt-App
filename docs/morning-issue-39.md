# Issue 39 – v1.114

Die Morgenansicht blendet To-do-, Erinnerungs- und Geburtstagssektionen zunächst vollständig aus und zeigt jede erst bei Treffern. To-dos bleiben offene Priorität-A-Aufgaben inklusive Routine-To-dos. Erinnerungen und Geburtstage umfassen heute, morgen und übermorgen nach lokalem Kalenderdatum. Erinnerungen sind nach Datum/Uhrzeit sortiert; Geburtstage nach nächstem Termin. Jahreswechsel und Zeitumstellungen werden über Kalenderdaten berücksichtigt.

Die bestehende authentifizierte Erinnerungsabfrage unterstützt zusätzlich einen begrenzten, paginierten Datumsbereich. Ihr bisheriger Aufruf ohne Enddatum bleibt unverändert. Bereits heute archivierte Erinnerungen bleiben entsprechend der bisherigen Morgenansicht enthalten. Push, Archivierung, Datenbank und Speichervorgänge wurden nicht verändert. Ladefehler werden außerhalb der verborgenen Sektionen gemeldet; der Dashboard-Wechsel bleibt erreichbar.

Geprüft mit Morgenansichts-, Geburtstags-, Erinnerungsdaten-, Navigations- und Fenster-Tests. Neues Fenstertest deckt Tag 0–2, Ausschluss von Tag 3, Sortierung, Jahreswechsel und beide Zeitumstellungen ab. DOM-Tests prüfen die Sichtbarkeit und vorhandene Navigation; kein physischer iPhone-Test.
