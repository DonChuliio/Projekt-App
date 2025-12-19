export function showView(name) {
  const views = document.querySelectorAll("[data-view]");

  if (!views.length) {
    console.error("Router: Keine data-view Elemente gefunden. Prüfe HTML.");
    return;
  }

  views.forEach((view) => {
    const isActive = view.dataset.view === name;
    view.classList.toggle("hidden", !isActive);
  });

  console.log("View gewechselt zu:", name);
}
