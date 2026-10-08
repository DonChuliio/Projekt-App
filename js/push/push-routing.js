import { isLoggedIn } from "../auth/auth.js";
import { showView } from "../router.js";
const allowed = new Set(["todo", "expenses-overview", "dashboard"]);
let pendingTarget = null;
const pendingKey = "dock-pending-push-target";
function rememberTarget(target) {
    pendingTarget = target;
    try { sessionStorage.setItem(pendingKey, target); } catch {}
}

function routePendingPush() {
    if (!pendingTarget || !isLoggedIn()) return;
    const target = pendingTarget;
    pendingTarget = null;
    try { sessionStorage.removeItem(pendingKey); } catch {}
    showView(target);
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
    if (allowed.has(target)) rememberTarget(target);
    else {
        try { const saved = sessionStorage.getItem(pendingKey); if (allowed.has(saved)) pendingTarget = saved; } catch {}
    }
    if (url.searchParams.has("push")) {
        url.searchParams.delete("push");
        history.replaceState(null, "", url.href);
    }
    navigator.serviceWorker?.addEventListener("message", event => {
        if (event.data?.type !== "dock:push-navigate" || !allowed.has(event.data.target)) return;
        rememberTarget(event.data.target);
        event.ports?.[0]?.postMessage({ handled: true });
        routePendingPush();
    });
    // Die Begrüßung reagiert ebenfalls auf Login: danach hat das Push-Ziel Vorrang.
    document.addEventListener("dock:auth-changed", () => queueMicrotask(routePendingPush));
    routePendingPush();
}
