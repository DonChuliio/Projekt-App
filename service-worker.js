// service-worker.js


/* =========================================================
   SERVICE WORKER INSTALLIEREN
   ========================================================= */

self.addEventListener("install", () => {

    /*
     Neue Version sofort aktivieren.
    */
    self.skipWaiting();
});


/* =========================================================
   SERVICE WORKER AKTIVIEREN
   ========================================================= */

self.addEventListener("activate", event => {

    /*
     Neue Version übernimmt sofort
     die vorhandene Web-App.
    */
    event.waitUntil(
        self.clients.claim()
    );
});


/* =========================================================
   PUSH EMPFANGEN
   ========================================================= */

self.addEventListener("push", event => {

    /*
     Standardwerte, falls der Push
     keine Daten enthalten sollte.
    */
    let data = {
        title: "Projekt App",
        body: "Neue Benachrichtigung"
    };


    /*
     Daten aus dem Push lesen.
    */
    if (event.data) {

        try {

            data = event.data.json();

        } catch (error) {

            console.error(
                "Push-Daten konnten nicht gelesen werden:",
                error
            );
        }
    }


    /*
     Benachrichtigung anzeigen.
    */
    event.waitUntil(

        self.registration.showNotification(
            data.title || "Projekt App",
            {
                body:
                    data.body ||
                    "Neue Benachrichtigung"
            }
        )
    );
});


/* =========================================================
   KLICK AUF BENACHRICHTIGUNG
   ========================================================= */

self.addEventListener(
    "notificationclick",
    event => {

        /*
         Benachrichtigung schließen.
        */
        event.notification.close();


        /*
         Projekt App öffnen.
        */
        event.waitUntil(

            clients.openWindow(
                "/Projekt-App/"
            )
        );
    }
);
