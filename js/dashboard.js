// js/dashboard.js

import { showView } from "./router.js";


/* =========================================================
   DASHBOARD / KACHEL-NAVIGATION
   ========================================================= */

export function initDashboard() {

    /*
     Alle Kacheln der App suchen.

     Der Wert von data-tile entspricht direkt
     der Ansicht, die geöffnet werden soll.

     Beispiel:

     data-tile="planner"
             ↓
     data-view="planner"
    */
    const tiles =
        document.querySelectorAll(
            "[data-tile]"
        );


    /*
     Jede gefundene Kachel bekommt
     automatisch ihre Navigation.
    */
    tiles.forEach(
        tile => {

            tile.addEventListener(
                "click",
                () => {

                    const targetView =
                        tile.dataset.tile;


                    if (!targetView) {
                        return;
                    }


                    showView(
                        targetView
                    );
                }
            );
        }
    );


    const quickNoteButton = document.getElementById("open-quick-note");
    if (quickNoteButton) quickNoteButton.addEventListener("click", () => {
        sessionStorage.setItem("dock-new-general-note", "1");
        showView("general-note");
        document.dispatchEvent(new CustomEvent("dock:new-general-note"));
    });

    const pocketMoneyButton = document.getElementById("open-pocket-money");
    if (pocketMoneyButton) pocketMoneyButton.addEventListener("click", () => {
        showView("pocket-money");
        document.dispatchEvent(new CustomEvent("dock:new-pocket-expense"));
    });

    /* =====================================================
       EINSTELLUNGEN
       ===================================================== */

    const settingsButton =
        document.getElementById(
            "open-settings"
        );


    if (settingsButton) {

        settingsButton.addEventListener(
            "click",
            () => {

                showView(
                    "settings"
                );
            }
        );
    }
}
