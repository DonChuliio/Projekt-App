// js/push/push.js


let serviceWorkerRegistration = null;


/* =========================================================
   PUSH INITIALISIEREN
   ========================================================= */

export async function initPush() {

    /*
     TEST:
     Damit prüfen wir, ob wirklich diese aktuelle
     push.js ausgeführt wird.
    */



    /*
     Status-Element aus der App holen.
    */
    const status =
        document.getElementById(
            "push-status"
        );


    /*
     Wenn dieses Element gefunden wurde,
     ändern wir sofort den Text.

     Dadurch sehen wir direkt,
     ob initPush() wirklich läuft.
    */
    if (status) {

        status.textContent =
            "Push-Modul wurde gestartet.";
    }


    /*
     Prüfen, ob Service Worker
     unterstützt werden.
    */
    if (!("serviceWorker" in navigator)) {

        console.error(
            "Service Worker werden nicht unterstützt."
        );

        updatePushStatus(
            "Service Worker werden nicht unterstützt."
        );

        return;
    }


    /*
     Prüfen, ob Benachrichtigungen
     unterstützt werden.
    */
    if (!("Notification" in window)) {

        console.error(
            "Benachrichtigungen werden nicht unterstützt."
        );

        updatePushStatus(
            "Benachrichtigungen werden nicht unterstützt."
        );

        return;
    }


    /*
     Anzeigen, dass wir jetzt versuchen,
     den Service Worker zu registrieren.
    */
    updatePushStatus(
        "Service Worker wird registriert..."
    );


    try {

        /*
         Service Worker registrieren.
        */
        serviceWorkerRegistration =
            await navigator.serviceWorker.register(
                "service-worker.js"
            );


        console.log(
            "Service Worker registriert:",
            serviceWorkerRegistration
        );


        /*
         Buttons verbinden.
        */
        initPushButtons();


        /*
         Aktuellen Berechtigungsstatus anzeigen.
        */
        updatePermissionStatus();


    } catch (error) {

        console.error(
            "Service Worker konnte nicht registriert werden:",
            error
        );


        updatePushStatus(
            "Fehler beim Service Worker."
        );
    }
}


/* =========================================================
   BUTTONS
   ========================================================= */

function initPushButtons() {

    const enableButton =
        document.getElementById(
            "push-enable"
        );


    const testButton =
        document.getElementById(
            "push-test"
        );


    /*
     Button:
     Benachrichtigungen aktivieren.
    */
    if (enableButton) {

        enableButton.addEventListener(
            "click",
            requestPermission
        );
    }


    /*
     Button:
     Test-Benachrichtigung senden.
    */
    if (testButton) {

        testButton.addEventListener(
            "click",
            showTestNotification
        );
    }
}


/* =========================================================
   BERECHTIGUNG ANFORDERN
   ========================================================= */

async function requestPermission() {

    /*
     TEST:
     Wenn dieser Alert später erscheint,
     wissen wir sicher, dass auch der
     Button korrekt verbunden ist.
    */


    try {

        const permission =
            await Notification.requestPermission();


        console.log(
            "Benachrichtigungs-Berechtigung:",
            permission
        );


        updatePermissionStatus();


    } catch (error) {

        console.error(
            "Berechtigung konnte nicht angefordert werden:",
            error
        );


        updatePushStatus(
            "Berechtigung konnte nicht angefordert werden."
        );
    }
}


/* =========================================================
   TEST-BENACHRICHTIGUNG
   ========================================================= */

async function showTestNotification() {

    /*
     Ohne Berechtigung kann keine
     Benachrichtigung angezeigt werden.
    */
    if (
        Notification.permission !==
        "granted"
    ) {

        updatePushStatus(
            "Benachrichtigungen sind noch nicht erlaubt."
        );

        return;
    }


    try {

        /*
         Sicherstellen, dass der
         Service Worker bereit ist.
        */
        const registration =
            serviceWorkerRegistration ||
            await navigator.serviceWorker.ready;


        /*
         Test-Benachrichtigung anzeigen.
        */
        await registration.showNotification(
            "Projekt App",
            {
                body:
                    "Test-Benachrichtigung erfolgreich."
            }
        );


        updatePushStatus(
            "Test-Benachrichtigung wurde gesendet."
        );


    } catch (error) {

        console.error(
            "Test-Benachrichtigung fehlgeschlagen:",
            error
        );


        updatePushStatus(
            "Test-Benachrichtigung konnte nicht gesendet werden."
        );
    }
}


/* =========================================================
   BERECHTIGUNGSSTATUS
   ========================================================= */

function updatePermissionStatus() {

    if (!("Notification" in window)) {

        return;
    }


    /*
     Berechtigung wurde erteilt.
    */
    if (
        Notification.permission ===
        "granted"
    ) {

        updatePushStatus(
            "Benachrichtigungen sind aktiviert."
        );

        return;
    }


    /*
     Berechtigung wurde abgelehnt.
    */
    if (
        Notification.permission ===
        "denied"
    ) {

        updatePushStatus(
            "Benachrichtigungen sind blockiert."
        );

        return;
    }


    /*
     Noch keine Entscheidung.
    */
    updatePushStatus(
        "Benachrichtigungen sind noch nicht aktiviert."
    );
}


/* =========================================================
   STATUS IN DER APP ANZEIGEN
   ========================================================= */

function updatePushStatus(text) {

    const status =
        document.getElementById(
            "push-status"
        );


    if (status) {

        status.textContent = text;
    }
}
