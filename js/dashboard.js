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


                    /*
                     Kurzes sichtbares Touch-Feedback:
                     Die Zielansicht wird erst nach 120 ms geöffnet,
                     damit die petrolfarbene Kachel wahrnehmbar bleibt.
                    */
                    tile.classList.add("tile-tapped");

                    window.setTimeout(
                        () => {
                            tile.classList.remove("tile-tapped");
                            showView(
                                targetView
                            );
                        },
                        120
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
        sessionStorage.setItem("dock-new-pocket-expense", "1");
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
