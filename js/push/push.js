// js/push/push.js


export async function initPush() {

    /*
     Prüfen, ob der Browser
     Service Worker unterstützt.
    */
    if (!("serviceWorker" in navigator)) {

        console.error(
            "Service Worker werden nicht unterstützt."
        );

        return;
    }


    try {

        /*
         Service Worker registrieren.

         ../.. wäre hier NICHT nötig,
         weil diese URL relativ zur HTML-Seite
         aufgerufen wird.
        */
        const registration =
            await navigator.serviceWorker.register(
                "service-worker.js"
            );


        console.log(
            "Service Worker registriert:",
            registration
        );


    } catch (error) {

        console.error(
            "Service Worker konnte nicht registriert werden:",
            error
        );
    }
}
