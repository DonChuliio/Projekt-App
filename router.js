// Sammelt alle HTML-Elemente, die ein data-view-Attribut haben
// z. B. <div data-view="dashboard">
const views = document.querySelectorAll("[data-view]");

/*
 Zeigt genau eine View an und versteckt alle anderen.
 name = Wert von data-view, z. B. "calendar"
*/
export function showView(name) {

    // Über alle Views iterieren
    views.forEach(view => {

        // Prüfen, ob diese View die gewünschte ist
        const isActive = view.dataset.view === name;

        // Wenn nicht aktiv → verstecken
        // Wenn aktiv → anzeigen
        view.classList.toggle("hidden", !isActive);
    });
}
