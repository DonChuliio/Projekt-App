// js/push/push.js


let serviceWorkerRegistration = null;


/* =========================================================
   PUSH INITIALISIEREN
   ========================================================= */
export async function initPush() {

    const status =
        document.getElementById("push-status");

    if (status) {
        status.textContent =
            "Push-Modul wurde gestartet.";
    }


    if (!("serviceWorker" in navigator)) {

        if (status) {
            status.textContent =
                "Service Worker nicht unterstützt.";
        }

        return;
    }


    if (!("Notification" in window)) {

        if (status) {
            status.textContent =
                "Benachrichtigungen nicht unterstützt.";
        }

        return;
    }


    if (status) {
        status.textContent =
            "Service Worker wird registriert...";
    }


    try {

        serviceWorkerRegistration =
            await navigator.serviceWorker.register(
                "service-worker.js"
            );


        if (status) {
            status.textContent =
                "Service Worker registriert.";
        }


        initPushButtons();

        updatePermissionStatus();


    } catch (error) {

        if (status) {
            status.textContent =
                "Fehler beim Service Worker.";
        }

        console.error(error);
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
     Benachrichtigungen aktivieren.
    */
    if (enableButton) {

        enableButton.addEventListener(
            "click",
            requestPermission
        );
    }


    /*
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

    alert("Push-Button funktioniert");

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
     Ohne Berechtigung keine Nachricht.
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
         Sicherstellen, dass der Service Worker
         wirklich bereit ist.
        */
        const registration =
            serviceWorkerRegistration ||
            await navigator.serviceWorker.ready;


        /*
         Lokale Test-Benachrichtigung anzeigen.
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
   STATUS
   ========================================================= */

function updatePermissionStatus() {

    if (!("Notification" in window)) {
        return;
    }


    if (
        Notification.permission ===
        "granted"
    ) {

        updatePushStatus(
            "Benachrichtigungen sind aktiviert."
        );

        return;
    }


    if (
        Notification.permission ===
        "denied"
    ) {

        updatePushStatus(
            "Benachrichtigungen sind blockiert."
        );

        return;
    }


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
