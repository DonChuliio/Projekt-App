// Push-Ziele bleiben auf bekannte App-Ansichten beschränkt.
const PUSH_TARGETS = new Set(["todo", "expenses-overview", "dashboard", "reminders"]);
const validReminder = id => typeof id==="string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
const targetView = value => PUSH_TARGETS.has(value) ? value : "dashboard";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));

self.addEventListener("push", event => {
    let data = {};
    try { data = event.data?.json() || {}; } catch (error) { console.error(error); }
    event.waitUntil(self.registration.showNotification(data.title || "Dock", {
        body: typeof data.body === "string" ? data.body : "Neue Benachrichtigung",
        tag: data.tag,
        renotify: false,
        data: { target: targetView(data.target), ...(validReminder(data.reminderId)?{reminderId:data.reminderId}:{}) }
    }));
});

self.addEventListener("notificationclick", event => {
    event.notification.close();
    const target = targetView(event.notification.data?.target);
    const reminderId = target==="reminders" && validReminder(event.notification.data?.reminderId) ? event.notification.data.reminderId : null;
    const url = new URL("/Projekt-App/", self.location.origin);
    url.searchParams.set("push", target);
    if(reminderId)url.searchParams.set("reminder",reminderId);
    event.waitUntil((async () => {
        const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        const existing = windows.find(client => {
            const candidate = new URL(client.url);
            return candidate.origin === url.origin && candidate.pathname.startsWith("/Projekt-App/");
        });
        if (!existing) return self.clients.openWindow(url.href);
        await existing.focus();
        // Neue App-Versionen navigieren ohne Neuladen; ältere erhalten die Ziel-URL.
        const handled = await new Promise(resolve => {
            const channel = new MessageChannel();
            const timer = setTimeout(() => { channel.port1.close(); resolve(false); }, 800);
            channel.port1.onmessage = () => {
                clearTimeout(timer); channel.port1.close(); resolve(true);
            };
            existing.postMessage({ type: "dock:push-navigate", target, ...(reminderId?{reminderId}:{}) }, [channel.port2]);
        });
        if (!handled) await existing.navigate(url.href);
    })());
});

