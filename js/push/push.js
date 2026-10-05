// js/push/push.js


/* =========================================================
   EINSTELLUNGEN
   ========================================================= */

// Öffentlicher VAPID-Key.
// Dieser Schlüssel DARF im Browser sichtbar sein.
const VAPID_PUBLIC_KEY =
    "BGK06tFp_McKbIERoqB3Vm-rYyF83BFnKSCqwICBswnZslLXpspVFZYdsWoVZJib4YoAGZ_eFwsODALJ7p_xU44";


// Supabase-Projekt.
const SUPABASE_URL =
    "https://osmmjfuzuxhwtfcttdxp.supabase.co";


// Öffentlicher Supabase Publishable Key.
// Dieser Schlüssel ist für Browser-Anwendungen gedacht.
const SUPABASE_KEY =
    "sb_publishable_Yymu98h5pEe8S1Rsxl8u6A_ZKisJcdy";


let serviceWorkerRegistration = null;


/* =========================================================
   PUSH INITIALISIEREN
   ========================================================= */

export async function initPush() {

    /*
     Prüfen, ob Service Worker unterstützt werden.
    */
    if (!("serviceWorker" in navigator)) {

        updatePushStatus(
            "Service Worker werden nicht unterstützt."
        );

        return;
    }


    /*
     Prüfen, ob Benachrichtigungen unterstützt werden.
    */
    if (!("Notification" in window)) {

        updatePushStatus(
            "Benachrichtigungen werden nicht unterstützt."
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


        /*
         Buttons verbinden.
        */
        initPushButtons();


        /*
         Aktuellen Status anzeigen.
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


    if (enableButton) {

        enableButton.addEventListener(
            "click",
            enablePushNotifications
        );
    }


    if (testButton) {

        testButton.addEventListener(
            "click",
            showTestNotification
        );
    }
}


/* =========================================================
   PUSH AKTIVIEREN
   ========================================================= */

async function enablePushNotifications() {

    try {

        /*
         1. Berechtigung anfordern.
        */
        const permission =
            await Notification.requestPermission();


        if (permission !== "granted") {

            updatePermissionStatus();

            return;
        }


        updatePushStatus(
            "Push wird eingerichtet..."
        );


        /*
         2. Warten, bis der Service Worker bereit ist.
        */
        const registration =
            serviceWorkerRegistration ||
            await navigator.serviceWorker.ready;


        /*
         3. Prüfen, ob bereits eine Subscription existiert.
        */
        let subscription =
            await registration.pushManager
                .getSubscription();


        /*
         4. Falls nicht:
            neue Push-Subscription erzeugen.
        */
        if (!subscription) {

            subscription =
                await registration.pushManager.subscribe({
                    userVisibleOnly: true,

                    applicationServerKey:
                        urlBase64ToUint8Array(
                            VAPID_PUBLIC_KEY
                        )
                });
        }


        console.log(
            "Push Subscription:",
            subscription
        );


        /*
         5. Subscription für Supabase vorbereiten.
        */
        const subscriptionData =
            subscription.toJSON();


        const endpoint =
            subscriptionData.endpoint;


        const p256dh =
            subscriptionData.keys?.p256dh;


        const auth =
            subscriptionData.keys?.auth;


        /*
         Sicherheitscheck:
         Alle drei Werte müssen vorhanden sein.
        */
        if (
            !endpoint ||
            !p256dh ||
            !auth
        ) {

            throw new Error(
                "Push-Subscription ist unvollständig."
            );
        }


        /*
         6. Subscription in Supabase speichern.
        */
        await saveSubscriptionToSupabase({
            endpoint,
            p256dh,
            auth
        });


        updatePushStatus(
            "Push-Benachrichtigungen sind aktiviert."
        );


    } catch (error) {

        console.error(
            "Push konnte nicht aktiviert werden:",
            error
        );


        updatePushStatus(
            "Push konnte nicht aktiviert werden."
        );
    }
}


/* =========================================================
   SUBSCRIPTION IN SUPABASE SPEICHERN
   ========================================================= */

async function saveSubscriptionToSupabase(
    subscription
) {

    const response =
        await fetch(
            `${SUPABASE_URL}/rest/v1/push_subscriptions`,
            {
                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "apikey":
                        SUPABASE_KEY
                },

                body:
                    JSON.stringify(
                        subscription
                    )
            }
        );


    /*
     Supabase meldet einen Fehler.
    */
    if (!response.ok) {

        const errorText =
            await response.text();


        console.error(
            "Supabase Fehler:",
            response.status,
            errorText
        );


        throw new Error(
            "Subscription konnte nicht gespeichert werden."
        );
    }


    console.log(
        "Push-Subscription wurde in Supabase gespeichert."
    );
}


/* =========================================================
   LOKALE TEST-BENACHRICHTIGUNG
   ========================================================= */

async function showTestNotification() {

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

        const registration =
            serviceWorkerRegistration ||
            await navigator.serviceWorker.ready;


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

    if (
        Notification.permission ===
        "granted"
    ) {

        updatePushStatus(
            "Benachrichtigungen sind erlaubt. Push kann aktiviert werden."
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
   VAPID KEY UMWANDELN
   ========================================================= */

/*
 Der VAPID Public Key liegt als Base64-URL-String vor.

 pushManager.subscribe() benötigt ihn aber als
 Uint8Array.

 Diese Funktion wandelt ihn entsprechend um.
*/
function urlBase64ToUint8Array(
    base64String
) {

    const padding =
        "=".repeat(
            (4 - base64String.length % 4) % 4
        );


    const base64 =
        (base64String + padding)
            .replace(/-/g, "+")
            .replace(/_/g, "/");


    const rawData =
        window.atob(base64);


    const outputArray =
        new Uint8Array(
            rawData.length
        );


    for (
        let i = 0;
        i < rawData.length;
        ++i
    ) {

        outputArray[i] =
            rawData.charCodeAt(i);
    }


    return outputArray;
}


/* =========================================================
   STATUS ANZEIGEN
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
