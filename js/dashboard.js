// js/dashboard.js

import { showView } from "./router.js";


/* =========================================================
   DASHBOARD / KACHEL-NAVIGATION
   ========================================================= */

export function initDashboard() {

    /*
     Alle Kacheln der App suchen.

     Der Wert von data-tile entspricht dabei
     direkt der Ansicht, die geöffnet werden soll.

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


    /* =====================================================
       BACKUP
       ===================================================== */

    const backupButton =
        document.getElementById(
            "open-backup"
        );


    if (backupButton) {

        backupButton.addEventListener(
            "click",
            () => {

                showView(
                    "backup"
                );
            }
        );
    }
}
