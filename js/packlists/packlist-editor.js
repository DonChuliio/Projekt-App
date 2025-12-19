import { showView } from "../router.js";

const STORAGE_KEY = "packlists";

function loadPacklists() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

function savePacklists(packlists) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(packlists));
}

function getActivePacklist() {
    const id = localStorage.getItem("active-packlist-id");
    return loadPacklists().find(p => p.id === id);
}

function saveActivePacklist(updated) {
    const packlists = loadPacklists().map(p =>
        p.id === updated.id ? updated : p
    );
    savePacklists(packlists);
}

export function initPacklistEditor() {
    const container = document.getElementById("packlist-edit-content");
    if (!container) return;

    container.innerHTML = "";

    const packlist = getActivePacklist();
    if (!packlist) return;

    packlist.buckets ||= [];

    /* 🔴 Löschen */
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑 Packliste löschen";
    deleteBtn.addEventListener("click", () => {
        if (!confirm("Packliste wirklich löschen?")) return;
        const remaining = loadPacklists().filter(p => p.id !== packlist.id);
        savePacklists(remaining);
        showView("packlists");
    });
    container.appendChild(deleteBtn);

    /* ➕ Bucket hinzufügen */
    if (packlist.buckets.length < 5) {
        const addBucket = document.createElement("button");
        addBucket.textContent = "➕ Bucket hinzufügen";
        addBucket.onclick = () => {
            packlist.buckets.push({
                id: Date.now().toString(),
                name: "Neuer Bucket",
                collapsed: false,
                items: []
            });
            saveActivePacklist(packlist);
            initPacklistEditor();
        };
        container.appendChild(addBucket);
    }

    /* Buckets rendern */
    packlist.buckets.forEach(bucket => {
        const section = document.createElement("section");

        const title = document.createElement("input");
        title.value = bucket.name;
        title.onchange = () => {
            bucket.name = title.value;
            saveActivePacklist(packlist);
        };

        const toggle = document.createElement("button");
        toggle.textContent = bucket.collapsed ? "▶" : "▼";
        toggle.onclick = () => {
            bucket.collapsed = !bucket.collapsed;
            saveActivePacklist(packlist);
            initPacklistEditor();
        };

        section.append(toggle, title);

        if (!bucket.collapsed) {
            bucket.items.forEach(item => {
                const row = document.createElement("div");
                row.textContent = item.text;

                const del = document.createElement("button");
                del.textContent = "✖";
                del.onclick = () => {
                    bucket.items = bucket.items.filter(i => i.id !== item.id);
                    saveActivePacklist(packlist);
                    initPacklistEditor();
                };

                row.appendChild(del);
                section.appendChild(row);
            });

            const addItem = document.createElement("button");
            addItem.textContent = "➕ Item";
            addItem.onclick = () => {
                const text = prompt("Item:");
                if (!text) return;
                bucket.items.push({ id: Date.now().toString(), text });
                saveActivePacklist(packlist);
                initPacklistEditor();
            };
            section.appendChild(addItem);
        }

        container.appendChild(section);
    });
}
