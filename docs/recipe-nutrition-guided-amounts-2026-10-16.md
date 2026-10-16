# v1.108 – Verständliche Mengen und automatische Richtwerte

## Ablauf

1. Dock erkennt bei bekannten Stück-Lebensmitteln „1 Paprika rot“ auch ohne ausdrücklich geschriebenes „Stück“.
2. Beim Bestätigen eines Lebensmittels steht ein passender Stück-Richtwert bereits im sichtbaren Feld „g pro Stück“. Vorhandene eigene Werte haben Vorrang. Ein unbekannter Wert bleibt leer und wird gezielt erfragt.
3. Unter „Für diese Zutat“ erscheinen sofort die umgerechnete Gesamtmenge und genau vier Nährwerte für die verwendete Menge. Änderungen am Gewicht oder an den Werten aktualisieren diese Vorschau unmittelbar.
4. Erst „Lebensmittel speichern“ übernimmt den vorgeschlagenen bzw. korrigierten Wert in die persönliche Lebensmitteldatenbank. Danach wird die Zutatenzuordnung wie bisher bestätigt und serverseitig gerechnet.

„Nährwerte je 100 g / 100 ml“ steht als Klartext über der Eingabe. Gespeicherte Bezugsgrößen werden erhalten; OFF-Verpackungseinheiten werden, sofern vorhanden, bei der Suche übernommen. Für konservativ erkannte frische Stück-Lebensmittel schlägt Dock g vor, für bekannte Flüssigkeiten ml. Die OFF-Spezifikation definiert die normalisierten `_100g`-Werte als pro 100 g bzw. für Flüssigkeiten pro 100 ml. Die Vorschläge bleiben als solche gekennzeichnet und können unter „Bezugsgröße ändern“ korrigiert werden. Bei unklarer Quelle und unbekanntem Lebensmittel bleibt die Auswahl erforderlich. `nutrition_data_per` allein wird ausdrücklich nicht zur Unterscheidung verwendet: Es beschreibt 100 g gegenüber Portion, nicht zuverlässig g gegenüber ml.

Bekannte Basiswerte sind aufklappbar; bei fehlenden Werten oder eigener Neueingabe werden die vier Eingabefelder geöffnet. Aliasnamen stehen nur unter „Weitere Einstellungen“, mit Erklärung. Der ursprüngliche Zutatenname wird beim Speichern als Alias ergänzt. Weitere Einheiten lassen sich dort weiterhin pflegen.

Bei g/ml-Umrechnungen bzw. Löffeln ohne eigene Gramm-Umrechnung ermittelt Dock für die unten genannten Flüssigkeiten einen Richtwert. Die technisch benannte Dichtefrage wurde durch „Gewicht von 100 ml (g)“ ersetzt und erscheint nur, wenn nötig. Eine bekannte eigene Löffelmenge in Gramm braucht keine Dichte. Beim Wechsel g ↔ ml werden bestehende Stück-/Packungswerte mit vorhandener Dichte korrekt umgerechnet oder andernfalls geleert; Zahlen werden nicht stillschweigend umgedeutet.

Externe Treffer mit Nährwerten stehen zuerst, vollständigere vor unvollständigen. Treffer ganz ohne die vier Werte sind separat aufklappbar. Fehlend bleibt unbekannt, tatsächliche Null bleibt Null.

## Herkunft und Grenzen der Vorschläge

- USDA, *Nutritive Value of Foods*, Haushaltstabelle der essbaren Anteile: Paprika 119 g (mittelgroß), Zwiebel 110 g, Tomate 123 g, Apfel 138 g, Banane 118 g; Ei 50 g. Das sind Referenzgrößen, keine Messung des konkreten Lebensmittels.
  https://www.ars.usda.gov/arsuserfiles/80400525/data/hg72/hg72_2002.pdf
- Landwirtschaftskammer NRW, Chinakohl: erntereife Köpfe 800–2.000 g. Dock verwendet daraus **1.400 g als groben Mittelpunkt**, ausdrücklich nicht als gemessenen statistischen Durchschnitt. Die Spanne und der Hinweis auf Strunk/Abschnitte sind sichtbar; bei Bedarf wiegen/korrigieren.
  https://www.landwirtschaftskammer.de/verbraucher/rezepte/kohlrezepte.pdf
- FAO/INFOODS Density Database v2: Wasser ungefähr 1, Milch 1,03, Olivenöl 0,918, Raps-/anderes übliches Pflanzenöl ungefähr 0,92 g/ml. Nur konservativ passende Bezeichnungen erhalten einen Vorschlag; Milchschokolade, Saucen, Pulver usw. nicht. Quelle ist im Formular verlinkt.
  https://www.fao.org/fileadmin/templates/food_composition/documents/density_DB_v2_0_01.pdf
- Löffelvolumen bleibt der bisherige Richtwert EL 15 ml / TL 5 ml. Keine Schätzung für Prisen oder pauschale Dosen-/Packungsgrößen.
- Normalisierte OFF-Nährwerte und Bezugsgrößen:
  https://openfoodfacts.github.io/documentation/docs/Product-Opener/schemas/schemas/product_nutrition/

Kein Richtwert wird auf verarbeitete Produkte wie Paprikachips oder Chinakohlsalat übertragen. Unbekannte Lebensmittel/Dichten werden nicht erfunden. Keine KI-Anfragen, zusätzlichen Dienste oder Gebühren. Eine vollständige allgemeine Lebensmitteldatenbank wird durch die kleine Richtwertliste nicht behauptet.

## Dateien und Prüfung

- Neues modulares `nutrition-food-form.js`; Mengenmodell, Zutatenansicht, Suchparser und Cache-Versionen angepasst. Keine Änderung an Datenbankschema, RLS, bestehenden Rezeptdaten, Bring!-Export oder Portionsspeicherung.
- Alle **38** automatisierten Testdateien erfolgreich. Neue Formularprüfung: Paprika-Vorschlag, Änderung 119 → 200 g mit Vorschau und Speicherpayload, halber Chinakohl, Vorrang eigener Gewichte, keine Gewichte für verarbeitete Produkte, versteckte Aliasnamen/unbenötigte Umrechnung, Öl und Milch, unbekannte Dichte, direkte Löffelgewichte und sichere Bezugsgrößenänderung.
- Zutatenassistent: „1 Paprika rot“ → Stück → Richtwert bestätigen → persisitierter persönlicher Wert → Rezeptzuordnung; nährwertlose Suchtreffer nachgeordnet. Bestehende Summen-/Portions-/Editor-/Bring!- und übrige Modultests unverändert erfolgreich.
- Erweiterte Suchfeldliste am echten offiziellen Suchdienst geprüft: HTTP 200, Antwort weiterhin kompatibel. Im geprüften Beispiel fehlte die Verpackungseinheit in allen acht Treffern; daher bleibt die konservative Vorschlags-/Nachfragelogik erforderlich. Parserprüfungen für explizite g- und ml-Metadaten bestanden.
- Physisches iPhone und visuelle Browserprüfung hier nicht durchgeführt. DOM-Tests und HTTP-/Parserprüfungen sind kein Ersatz dafür.
