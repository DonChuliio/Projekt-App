import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";


Deno.serve(async (req) => {

    try {

        /* =================================================
           MANUELLER TEST
           ================================================= */

        let force = false;

        try {
            const body = await req.json();
            force = body?.force === true;
        } catch {
            // Kein Body ist bei Cron-Aufrufen normal.
        }


        /* =================================================
           DEUTSCHE UHRZEIT
           ================================================= */

        const now = new Date();

        const berlinFormatter =
            new Intl.DateTimeFormat(
                "de-DE",
                {
                    timeZone: "Europe/Berlin",
                    hour: "2-digit",
                    hourCycle: "h23"
                }
            );

        const berlinParts =
            berlinFormatter.formatToParts(now);

        const berlinHour =
            berlinParts.find(
                part => part.type === "hour"
            )?.value;


        /*
         Der Cron darf nur um 09 Uhr deutscher Zeit
         tatsächlich Pushs versenden.

         force=true umgeht diese Prüfung für Tests.
        */
        if (
            !force &&
            berlinHour !== "10"
        ) {

            return Response.json({
                success: true,
                sent: 0,
                reason:
                    `Außerhalb der 09-Uhr-Prüfung. Berlin-Stunde: ${berlinHour}`
            });
        }


        /* =================================================
           AKTUELLE DEUTSCHE KALENDERWOCHE
           ================================================= */

        /*
         Wir erzeugen aus dem aktuellen Zeitpunkt
         ein Datum für Europe/Berlin.

         Wichtig rund um Mitternacht und Jahreswechsel.
        */
        const berlinDateText =
            new Intl.DateTimeFormat(
                "en-CA",
                {
                    timeZone: "Europe/Berlin",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit"
                }
            ).format(now);

        const [
            berlinYear,
            berlinMonth,
            berlinDay
        ] =
            berlinDateText
                .split("-")
                .map(Number);


        /*
         ISO-Kalenderwoche berechnen.
        */
        function getISOWeekInfo(
            year: number,
            month: number,
            day: number
        ) {

            const date =
                new Date(
                    Date.UTC(
                        year,
                        month - 1,
                        day
                    )
                );

            const dayNumber =
                date.getUTCDay() || 7;

            date.setUTCDate(
                date.getUTCDate() +
                4 -
                dayNumber
            );

            const isoYear =
                date.getUTCFullYear();

            const yearStart =
                new Date(
                    Date.UTC(
                        isoYear,
                        0,
                        1
                    )
                );

            const week =
                Math.ceil(
                    (
                        (
                            date.getTime() -
                            yearStart.getTime()
                        ) /
                        86400000 +
                        1
                    ) /
                    7
                );

            return {
                year: isoYear,
                week
            };
        }


        const currentWeek =
            getISOWeekInfo(
                berlinYear,
                berlinMonth,
                berlinDay
            );


        /* =================================================
           VAPID
           ================================================= */

        const vapidPublicKey =
            Deno.env.get(
                "VAPID_PUBLIC_KEY"
            );

        const vapidPrivateKey =
            Deno.env.get(
                "VAPID_PRIVATE_KEY"
            );


        if (
            !vapidPublicKey ||
            !vapidPrivateKey
        ) {

            throw new Error(
                "VAPID-Schlüssel fehlen."
            );
        }


        webpush.setVapidDetails(
            "mailto:projekt-app@example.com",
            vapidPublicKey,
            vapidPrivateKey
        );


        /* =================================================
           SUPABASE
           ================================================= */

        const supabaseUrl =
            Deno.env.get(
                "SUPABASE_URL"
            );

        const secretKeysRaw =
            Deno.env.get(
                "SUPABASE_SECRET_KEYS"
            );
/*
 Monats-Erinnerungen laden.
 Die Schalter werden pro Benutzer aus calendar_settings gelesen.
*/

        if (
            !supabaseUrl ||
            !secretKeysRaw
        ) {

            throw new Error(
                "Supabase Server-Konfiguration fehlt."
            );
        }


        /*
         Diese Secret-Konfiguration behalten wir genauso,
         weil sie in deinem Projekt bereits funktioniert.
        */
        const secretKeys =
            JSON.parse(
                secretKeysRaw
            );

        const supabaseSecretKey =
            secretKeys["default"];


        if (!supabaseSecretKey) {

            throw new Error(
                "Supabase Secret Key fehlt."
            );
        }


        const supabase =
            createClient(
                supabaseUrl,
                supabaseSecretKey
            );

const {
    data: reminderSettings,
    error: reminderError
} =
    await supabase
        .from("calendar_settings")
        .select(
            "user_id, month_end_savings_reminder, month_start_balance_reminder"
        );

if (reminderError) {
    throw reminderError;
}

/*
 Letzten Kalendertag des aktuellen Monats bestimmen.
*/
const lastDayOfMonth =
    new Date(
        Date.UTC(
            berlinYear,
            berlinMonth,
            0
        )
    ).getUTCDate();

const reminderByUser =
    new Map(
        (reminderSettings || []).map(
            row => [row.user_id, row]
        )
    );

        /* =================================================
           PUSH-SUBSCRIPTIONS LADEN
           ================================================= */

        const {
            data: subscriptions,
            error: subscriptionError
        } =
            await supabase
                .from(
                    "push_subscriptions"
                )
                .select(
                    "id, user_id, endpoint, p256dh, auth"
                )
                .not(
                    "user_id",
                    "is",
                    null
                );


        if (subscriptionError) {
            throw subscriptionError;
        }


        if (
            !subscriptions ||
            subscriptions.length === 0
        ) {

            return Response.json({
                success: true,
                sent: 0,
                reason:
                    "Keine Benutzer mit Push-Subscription vorhanden."
            });
        }


        /* =================================================
           PUSH PRO BENUTZER
           ================================================= */

        let sent = 0;


        /*
         Derselbe Benutzer kann später mehrere Geräte haben.

         Deshalb ermitteln wir zuerst alle Benutzer,
         die mindestens eine Subscription besitzen.
        */
        const userIds =
            [
                ...new Set(
                    subscriptions.map(
                        row => row.user_id
                    )
                )
            ];


        for (const userId of userIds) {

            /* ---------------------------------------------
               A-TO-DOS ZÄHLEN
               --------------------------------------------- */
const reminderSetting =
    reminderByUser.get(userId);

const reminderMessages: string[] = [];


/*
 Am 02. des Monats:
 Monatsabgleich ausführen.

 Nur wenn der Benutzer den Schalter aktiviert hat.
*/
if (
    reminderSetting?.month_start_balance_reminder === true &&
    berlinDay === 2
) {
    reminderMessages.push(
        "Monatsabgleich ausführen"
    );
}


/*
 Am letzten Tag des Monats:
 Sparkonto-Überschuss erinnern.

 Ebenfalls nur bei aktiviertem Schalter.
*/
if (
    reminderSetting?.month_end_savings_reminder === true &&
    berlinDay === lastDayOfMonth
) {
    reminderMessages.push(
        "Sparkonto Überschuss überweisen"
    );
}
            const {
                count: openA,
                error: todoError
            } =
                await supabase
                    .from("todos")
                    .select(
                        "id",
                        {
                            count: "exact",
                            head: true
                        }
                    )
                    .eq(
                        "user_id",
                        userId
                    )
                    .eq(
                        "priority",
                        "a"
                    )
                    .is("completed_at", null);


            if (todoError) {
                throw todoError;
            }


            /* ---------------------------------------------
               OFFENE AUFGABEN DER AKTUELLEN KW
               --------------------------------------------- */

            // Bereits übernommene Routinen nicht noch einmal als KW-Aufgaben zählen.
            const { data: planned, error: calendarError } = await supabase
                .from("calendar_tasks").select("year,week,task_id,done")
                .eq("user_id", userId).lte("year", currentWeek.year).eq("done", false);
            if (calendarError) throw calendarError;
            const { data: occurrences, error: occurrenceError } = await supabase
                .from("todos").select("routine_year,routine_week,routine_task_id")
                .eq("user_id", userId).not("routine_task_id", "is", null);
            if (occurrenceError) throw occurrenceError;
            const generated = new Set((occurrences || []).map(row =>
                row.routine_year + ":" + row.routine_week + ":" + row.routine_task_id));
            const openWeek = (planned || []).filter(row =>
                (row.year < currentWeek.year || row.week <= currentWeek.week) &&
                !generated.has(row.year + ":" + row.week + ":" + row.task_id)).length;

            const todoCount =
                openA || 0;

            const weekCount =
                openWeek || 0;


            console.log(
                "Offene Aufgaben:",
                {
                    userId,
                    openA: todoCount,
                    openWeek: weekCount
                }
            );


            /*
             Für diesen Benutzer ist nichts offen.
             Dann bekommt er keinen Push.
            */
if (
    todoCount === 0 &&
    weekCount === 0 &&
    reminderMessages.length === 0
) {
    continue;
}


            /* ---------------------------------------------
               PUSH-TEXT
               --------------------------------------------- */

            const messageParts = [];


            if (todoCount > 0) {

                messageParts.push(
                    todoCount === 1
                        ? "1 wichtiges To-Do"
                        : `${todoCount} wichtige To-Dos`
                );
            }


            if (weekCount > 0) {

                messageParts.push(
                    weekCount === 1
                        ? "1 offene KW-Aufgabe"
                        : `${weekCount} offene KW-Aufgaben`
                );
            }

const bodyParts: string[] = [
    ...reminderMessages
];

if (messageParts.length > 0) {
    bodyParts.push(
        `Offen: ${messageParts.join(" und ")}.`
    );
}

const payload =
    JSON.stringify({
        title: "Dock",
        body: bodyParts.join(" · ")
    });


            /* ---------------------------------------------
               GERÄTE DIESES BENUTZERS
               --------------------------------------------- */

            const userSubscriptions =
                subscriptions.filter(
                    row =>
                        row.user_id ===
                        userId
                );


            for (
                const row
                of userSubscriptions
            ) {

                const subscription = {

                    endpoint:
                        row.endpoint,

                    keys: {
                        p256dh:
                            row.p256dh,

                        auth:
                            row.auth
                    }
                };


                try {

                    await webpush
                        .sendNotification(
                            subscription,
                            payload
                        );

                    sent++;


                } catch (pushError) {

                    console.error(
                        "Push fehlgeschlagen:",
                        pushError
                    );


                    /*
                     404 / 410 bedeutet normalerweise:
                     Die Subscription existiert auf dem
                     Gerät/Push-Dienst nicht mehr.

                     Solche Einträge entfernen wir direkt.
                    */
                    const statusCode =
                        pushError?.statusCode;


                    if (
                        statusCode === 404 ||
                        statusCode === 410
                    ) {

                        const {
                            error: deleteError
                        } =
                            await supabase
                                .from(
                                    "push_subscriptions"
                                )
                                .delete()
                                .eq(
                                    "id",
                                    row.id
                                );


                        if (deleteError) {

                            console.error(
                                "Alte Push-Subscription konnte nicht gelöscht werden:",
                                deleteError
                            );
                        }
                    }
                }
            }
        }


        /* =================================================
           ERGEBNIS
           ================================================= */

        return Response.json({
            success: true,
            sent,
            year:
                currentWeek.year,
            week:
                currentWeek.week
        });


    } catch (error) {

        console.error(error);


        return Response.json(
            {
                success: false,

                error:
                    error instanceof Error
                        ? error.message
                        : String(error)
            },
            {
                status: 500
            }
        );
    }
});