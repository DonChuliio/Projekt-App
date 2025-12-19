// js/packlists/packlist-run.js

const STORAGE_KEY = "packlists";
const PROGRESS_PREFIX = "packlist-progress-";

/* ---------- Storage ---------- */

function loadPacklists() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

function savePacklists(packlists) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(packlists));
}

function loadProgress(packlistId) {
    return JSON.parse(localStorage.getItem(PROGRESS_PREFIX + packlistId)) || [];
}

function saveProgress(packlistId, checkedIds) {
    localStorage.setItem(PROGRESS_PREFIX + packlistId, JSON.stringify(checkedIds));
}

function clearProgress(packlistId) {
    localStorage.removeItem(PROGRESS_PREFIX + packlistId);
}

/* ---------- Helper ---------- */

function getActivePacklistId() {
    return localStorage.getItem("active-packlist-id");
}

function getRunMode() {
    return localStorage.getItem("packlist-run-mode"); // "continue" | "new"
}

/*
 Rendert den Packen-View inkl.:
 - Buckets einklappbar
 - Items anklickbar (durchgestrichen)
 - Fortschritt speichern
 - Neu-Modus setzt Fortschritt zurück
*/
export function initPacklistRun() {
    const container = document.getElementById("packlist-run-content");
    if (!container) return;

    container.innerHTML = "";

    const packlistId = getActivePacklistId();
    if (!packlistId) {
        container.textContent = "❌ Keine aktive Packliste gewählt.";
        return;
    }

    const mode = getRunMode();
    if (mode === "new") {
        clearProgress(packlistId);
    }

    const packlists = loadPacklists();
    const packlist = packlists.find(p => p.id === packlistId);

    if (!packlist) {
        container.textContent = "❌ Packliste nicht gefunden.";
        return;
    }

    // Sicherheit: falls noch keine buckets existieren
    packlist.buckets ||= [];

    // Fortschritt laden
    let checked = loadProgress(packlistId);

    // Oben kleine Fortschrittsanzeige
    const allItemIds = packlist.buckets.flatMap(b => (b.items || []).map(i => i.id));
    const doneCount = checked.filter(id => allItemIds.includes(id)).length;

    const progressEl = document.createElement("p");
    progressEl.className = "packlist-progress";
    progressEl.textContent = `Fortschritt: ${doneCount} / ${allItemIds.length}`;
    container.appendChild(progressEl);

    // Buckets rendern
    packlist.buckets.forEach(bucket => {
        bucket.items ||= [];

        const section = document.createElement("section");
        section.className = "bucket";

        // Bucket-Header: Name + Toggle
        const header = document.createElement("div");
        header.className = "bucket-header";

        const toggleBtn = document.createElement("button");
        toggleBtn.className = "bucket-toggle";
        toggleBtn.type = "button";
        toggleBtn.textContent = bucket.collapsed ? "▶" : "▼";

        const title = document.createElement("h3");
        title.className = "bucket-title";
        title.textContent = bucket.name || "Bucket";

        header.appendChild(toggleBtn);
        header.appendChild(title);
        section.appendChild(header);

        // Bucket-Inhalt
        const content = document.createElement("div");
        content.className = "bucket-content";
        if (bucket.collapsed) content.classList.add("hidden");

        // Items
        bucket.items.forEach(item => {
            const row = document.createElement("div");
            row.className = "pack-item clickable";
            row.textContent = item.text;

            if (checked.includes(item.id)) {
                row.classList.add("packed");
            }

            row.addEventListener("click", () => {
                if (checked.includes(item.id)) {
                    checked = checked.filter(x => x !== item.id);
                } else {
                    checked.push(item.id);
                }
                saveProgress(packlistId, checked);

                // UI schnell aktualisieren (ohne komplettes Re-Render wäre möglich, aber so ist es stabil)
                initPacklistRun();
            });

            content.appendChild(row);
        });

        section.appendChild(content);

        // Toggle Klick
        toggleBtn.addEventListener("click", (e) => {
            e.stopPropagation();

            bucket.collapsed = !bucket.collapsed;

            // collapsed Zustand in der Packliste speichern
            savePacklists(packlists);

            // UI neu rendern
            initPacklistRun();
        });

        container.appendChild(section);
    });
}
