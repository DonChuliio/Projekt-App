// js/router.js

/*
 Zeigt eine bestimmte View an.
 Alle anderen Views werden versteckt.
*/
export function showView(name) {
    const views = document.querySelectorAll("[data-view]");

    views.forEach(view => {
        const isActive = view.dataset.view === name;
        view.classList.toggle("hidden", !isActive);
    });
}

/*
 Einheitliche Zurück-Navigation.
 Aktuell immer zurück zum Dashboard.
*/
export function goToDashboard() {
    showView("dashboard");
}
