// service-worker.js

/*
 =========================================================
 SERVICE WORKER
 =========================================================

 Grundlage für spätere Push-Benachrichtigungen.

 Push selbst bauen wir erst ein,
 wenn die Registrierung funktioniert.
*/


self.addEventListener("install", event => {

    console.log(
        "Service Worker installiert"
    );

});


self.addEventListener("activate", event => {

    console.log(
        "Service Worker aktiviert"
    );

});
