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


    const pocketMoneyButton = document.getElementById("open-pocket-money");
    if (pocketMoneyButton) pocketMoneyButton.addEventListener("click", () => showView("pocket-money"));

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
