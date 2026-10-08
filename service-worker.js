// Push-Ziele bleiben auf bekannte App-Ansichten beschränkt.
const PUSH_TARGETS = new Set(["todo", "expenses-overview", "dashboard"]);
const targetView = value => PUSH_TARGETS.has(value) ? value : "dashboard";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));

self.addEventListener("push", event => {
    let data = {};
    try { data = event.data?.json() || {}; } catch (error) { console.error(error); }
    event.waitUntil(self.registration.showNotification(data.title || "Dock", {
        body: data.body || "Neue Benachrichtigung",
        tag: data.tag,
        renotify: false,
        data: { target: targetView(data.target) }
    }));
});

self.addEventListener("notificationclick", event => {
    event.notification.close();
    const target = targetView(event.notification.data?.target);
    const url = new URL("/Projekt-App/", self.location.origin);
    url.searchParams.set("push", target);
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
            existing.postMessage({ type: "dock:push-navigate", target }, [channel.port2]);
        });
        if (!handled) await existing.navigate(url.href);
    })());
});
