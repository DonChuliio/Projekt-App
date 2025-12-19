

const STORAGE_PREFIX = "packlist-progress-";
const STORAGE_KEY = "packlists";

function loadPacklists() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

export function initPacklistRun() {
    const container = document.getElementById("packlist-run-content");
    if (!container) return;

    container.innerHTML = "";

    const id = localStorage.getItem("active-packlist-id");
    const mode = localStorage.getItem("packlist-run-mode");

    const packlist = loadPacklists().find(p => p.id === id);
    if (!packlist) return;

    const progressKey = STORAGE_PREFIX + id;

    let checked = [];
    if (mode === "continue") {
        checked = JSON.parse(localStorage.getItem(progressKey)) || [];
    } else {
        localStorage.removeItem(progressKey);
    }

    packlist.buckets.forEach(bucket => {
        const section = document.createElement("section");

        const header = document.createElement("h3");
        header.textContent = bucket.name;
        section.appendChild(header);

        bucket.items.forEach(item => {
            const row = document.createElement("div");
            row.textContent = item.text;

            if (checked.includes(item.id)) {
                row.style.textDecoration = "line-through";
            }

            row.onclick = () => {
                if (checked.includes(item.id)) {
                    checked = checked.filter(i => i !== item.id);
                } else {
                    checked.push(item.id);
                }
                localStorage.setItem(progressKey, JSON.stringify(checked));
                initPacklistRun();
            };

            section.appendChild(row);
        });

        container.appendChild(section);
    });
}
