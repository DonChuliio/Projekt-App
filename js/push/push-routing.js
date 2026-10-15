import { isLoggedIn } from "../auth/auth.js";
import { showView } from "../router.js";
const allowed = new Set(["todo", "expenses-overview", "dashboard", "reminders"]);
let pendingTarget = null;
let pendingReminder = null;
const validReminder = id => typeof id==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
const pendingKey = "dock-pending-push-target";
function rememberTarget(target, id = null) {
    pendingReminder = target==='reminders' && validReminder(id) ? id : null;
    try { if(pendingReminder)sessionStorage.setItem(pendingKey+'-reminder',pendingReminder);else sessionStorage.removeItem(pendingKey+'-reminder'); } catch {}
    pendingTarget = target;
    try { sessionStorage.setItem(pendingKey, target); } catch {}
}

function routePendingPush() {
    if (!pendingTarget || !isLoggedIn()) return;
    const target = pendingTarget;
    const reminder = pendingReminder; pendingReminder=null;
    try{sessionStorage.removeItem(pendingKey+"-reminder");}catch{}
    pendingTarget = null;
    try { sessionStorage.removeItem(pendingKey); } catch {}
    showView(target);
    if(target==="reminders" && reminder)document.dispatchEvent(new CustomEvent("dock:open-reminder",{detail:{id:reminder}}));
    if (target === "todo") {
        document.dispatchEvent(new CustomEvent("dock:todos-changed"));
        document.getElementById("todo-a-list")?.scrollIntoView({ block: "start" });
    } else if (target === "expenses-overview") {
        document.dispatchEvent(new CustomEvent("dock:push-expenses"));
    }
}

export function initPushRouting() {
    const url = new URL(window.location.href);
    const target = url.searchParams.get("push");
    if (allowed.has(target)) rememberTarget(target, url.searchParams.get("reminder"));
    else {
        try { const saved = sessionStorage.getItem(pendingKey); if (allowed.has(saved)) { pendingTarget = saved; const id=sessionStorage.getItem(pendingKey+"-reminder");pendingReminder=validReminder(id)?id:null; } } catch {}
    }
    if (url.searchParams.has("push")) {
        url.searchParams.delete("push");
        url.searchParams.delete("reminder");
        history.replaceState(null, "", url.href);
    }
    navigator.serviceWorker?.addEventListener("message", event => {
        if (event.data?.type !== "dock:push-navigate" || !allowed.has(event.data.target)) return;
        rememberTarget(event.data.target,event.data.reminderId);
        event.ports?.[0]?.postMessage({ handled: true });
        routePendingPush();
    });
    // Die Begrüßung reagiert ebenfalls auf Login: danach hat das Push-Ziel Vorrang.
    document.addEventListener("dock:auth-changed", () => queueMicrotask(routePendingPush));
    routePendingPush();
}

