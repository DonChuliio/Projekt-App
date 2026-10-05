// js/push/push.js


let serviceWorkerRegistration = null;


/* =========================================================
   PUSH INITIALISIEREN
   ========================================================= */

export async function initPush() {

    /*
     Prüfen, ob Service Worker unterstützt werden.
    */
    if (!("serviceWorker" in navigator)) {

        console.error(
            "Service Worker werden nicht unterstützt."
        );

        updatePushStatus(
            "Benachrichtigungen werden auf diesem Gerät nicht unterstützt."
        );

        return;
    }


    /*
     Prüfen, ob Benachrichtigungen unterstützt werden.
    */
    if (!("Notification" in window)) {

        console.error(
            "Benachrichtigungen werden nicht unterstützt."
        );

        updatePushStatus(
            "Benachrichtigungen werden auf diesem Gerät nicht unterstützt."
        );

        return;
    }


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
            "Service Worker konnte nicht gestartet werden."
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
