# Imposter: Kachel und Rundenleitungsformular · v1.86

- Imposter-Kachel im Spielebereich nutzt das vorhandene Dashboard-Kachelmuster: SVG-Piktogramm, Titel im span, helle Textfarbe, geerbte Schrift und dieselben Abstände. Ursache der dunklen Schrift war die globale Button-Textfarbe; die Dashboard-Ausnahme galt bisher nicht für den Spielebereich. Nur dieser zusätzliche Bereich wurde angeglichen.
- Wartehinweis auf „Der Rundenleiter legt das Wort fest.“ gekürzt, ohne Hinweis-Teil.
- Bei aktueller Rundenleitung bleibt der Anzeigerahmen während der Wortwahl verborgen und erscheint erst im Live-Zustand nach erfolgreicher Wortfreigabe. Mitspieler sehen weiterhin den kurzen Wartehinweis im Rahmen. Vor Namenswahl und nach Spielende kein Rahmen.
- „Gedrückt halten zum Anzeigen“ gezielt auf .9rem verkleinert. Imposter-Namen, Wort und Hinweis bleiben in der gemeinsamen Größe 1.2rem.
- Hinweis-Eingabefeld im Rundenleitungsformular auf 44px Höhe, wie das Wort-Eingabefeld, begrenzt; bei langen Texten weiterhin scrollbar/manuell vergrößerbar. Bestehendes Limit und optionale Eingabe bleiben erhalten.

Dateien: `index.html`, `style.css`, `js/games/public.js`, `js/games/games.css`; Cache-Versionen v1.86 in App und Spielseite. `tests/imposter-public-ui.test.cjs` erweitert.

Drei Testsuiten erfolgreich: öffentliche Ansicht, Haltebedienung, Dashboard-/Sparplan-Regression. Explizite DOM-/CSS-Nachweise für Host-Rahmen verborgen vor Freigabe/sichtbar danach, Mitspieler-Wartefeld, gekürzten Text, kleine Bedienungsschrift, kompakte Textarea sowie Imposter-Kachel mit SVG/Titel und heller Farbe. Syntaxprüfung erfolgreich. Keine Datenbank-/Auth-/Rundenänderungen. Tatsächliche iPhone-Geometrieprüfung weiterhin offen.
