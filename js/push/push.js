// js/push/push.js

const VAPID_PUBLIC_KEY =
    "BGK06tFp_McKbIERoqB3Vm-rYyF83BFnKSCqwICBswnZslLXpspVFZYdsWoVZJib4YoAGZ_eFwsODALJ7p_xU44";

const SUPABASE_URL =
    "https://osmmjfuzuxhwtfcttdxp.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_Yymu98h5pEe8S1Rsxl8u6A_ZKisJcdy";

let serviceWorkerRegistration = null;


/* =========================================================
   PUSH STARTEN
   ========================================================= */

export async function initPush() {

    console.log("push.js gestartet");

    if (!("serviceWorker" in navigator)) {
        updatePushStatus(
            "Service Worker werden nicht unterstützt."
        );
        return;
    }

    if (!("Notification" in window)) {
        updatePushStatus(
            "Benachrichtigungen werden nicht unterstützt."
        );
        return;
    }

    try {

        serviceWorkerRegistration =
            await navigator.serviceWorker.register(
                "/Projekt-App/service-worker.js"
            );

        initPushButtons();

        updatePermissionStatus();

    } catch (error) {

        console.error(
            "Push Initialisierung fehlgeschlagen:",
            error
        );

        updatePushStatus(
            "Push konnte nicht initialisiert werden."
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

        const permission =
            await Notification.requestPermission();


        if (permission !== "granted") {

            updatePermissionStatus();

            return;
        }


        updatePushStatus(
            "Push wird eingerichtet..."
        );


        const registration =
            serviceWorkerRegistration ||
            await navigator.serviceWorker.ready;


        let subscription =
            await registration.pushManager
                .getSubscription();


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


        const data =
            subscription.toJSON();


        if (
            !data.endpoint ||
            !data.keys?.p256dh ||
            !data.keys?.auth
        ) {

            throw new Error(
                "Push Subscription unvollständig."
            );
        }


        await saveSubscriptionToSupabase({
            endpoint:
                data.endpoint,

            p256dh:
                data.keys.p256dh,

            auth:
                data.keys.auth
        });


        updatePushStatus(
            "Push-Benachrichtigungen sind aktiviert."
        );


    } catch (error) {

        console.error(
            "Push-Aktivierung fehlgeschlagen:",
            error
        );

        updatePushStatus(
            "Push konnte nicht aktiviert werden."
        );
    }
}


/* =========================================================
   SUBSCRIPTION SPEICHERN
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
                    "apikey":
                        SUPABASE_KEY,

                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(
                        subscription
                    )
            }
        );


    if (!response.ok) {

        const text =
            await response.text();

        throw new Error(
            `Supabase Fehler ${response.status}: ${text}`
        );
    }
}


/* =========================================================
   TEST-BENACHRICHTIGUNG
   ========================================================= */

async function showTestNotification() {

    if (
        Notification.permission !==
        "granted"
    ) {

        updatePushStatus(
            "Benachrichtigungen sind nicht erlaubt."
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
            "Test-Push fehlgeschlagen:",
            error
        );

        updatePushStatus(
            "Test-Benachrichtigung fehlgeschlagen."
        );
    }
}


/* =========================================================
   STATUS
   ========================================================= */

function updatePermissionStatus() {

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


function updatePushStatus(text) {

    const status =
        document.getElementById(
            "push-status"
        );


    if (status) {
        status.textContent = text;
    }
}


/* =========================================================
   VAPID KEY UMWANDELN
   ========================================================= */

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
        i++
    ) {

        outputArray[i] =
            rawData.charCodeAt(i);
    }


    return outputArray;
}
