import { showView } from "../router.js";
import { loadPacklist, updatePacklist, deletePacklist } from "../data/packlist-data.js?v=0.97";
import { renderPacklists } from "./packlists.js?v=0.97";

function id() {
    return sessionStorage.getItem("active-packlist-id");
}

export async function initPacklistEditor() {
    const content = document.getElementById("packlist-edit-content");
    if (!content) return;

    content.innerHTML = "";

    let packlist;

    try {
        packlist = await loadPacklist(id());
    } catch (error) {
        console.error(error);
        return;
    }

    if (!packlist) return;

    packlist.buckets ||= [];
    document.getElementById("packlist-edit-title").textContent = packlist.name;

    if (packlist.buckets.length < 5) {
        const addBucketButton = document.createElement("button");
        addBucketButton.type = "button";
        addBucketButton.className = "packlist-add-bucket";
        addBucketButton.textContent = "+ Bucket";
        addBucketButton.setAttribute("aria-label", "Bucket hinzufügen");
        addBucketButton.title = "Bucket hinzufügen";

        addBucketButton.onclick = async () => {
            packlist.buckets.push({
                id: crypto.randomUUID(),
                name: "",
                collapsed: false,
                items: []
            });

            await updatePacklist(packlist.id, {
                buckets: packlist.buckets
            });

            await initPacklistEditor();

            const bucketInputs = content.querySelectorAll(".packlist-bucket-name");
            bucketInputs[bucketInputs.length - 1]?.focus();
        };

        content.appendChild(addBucketButton);
    }

    for (const bucket of packlist.buckets) {
        bucket.items ||= [];

        const section = document.createElement("section");
        section.className = "packlist-bucket-editor";

        const header = document.createElement("div");
        header.className = "packlist-bucket-header";

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "packlist-bucket-toggle";
        toggle.textContent = bucket.collapsed ? ">" : "v";
        toggle.setAttribute(
            "aria-label",
            bucket.collapsed ? "Bucket aufklappen" : "Bucket zuklappen"
        );

        toggle.onclick = async () => {
            bucket.collapsed = !bucket.collapsed;

            await updatePacklist(packlist.id, {
                buckets: packlist.buckets
            });

            await initPacklistEditor();
        };

        const title = document.createElement("input");
        title.className = "packlist-bucket-name";
        title.value = bucket.name;
        title.placeholder = "Bucketname";

        title.onchange = async () => {
            bucket.name = title.value.trim();

            await updatePacklist(packlist.id, {
                buckets: packlist.buckets
            });
        };

        const deleteBucket = document.createElement("button");
        deleteBucket.type = "button";
        deleteBucket.className = "packlist-bucket-delete";
        deleteBucket.textContent = "×";
        deleteBucket.setAttribute("aria-label", "Bucket löschen");
        deleteBucket.title = "Bucket löschen";

        deleteBucket.onclick = async () => {
            if (!confirm("Bucket wirklich löschen?")) return;

            const itemIds = new Set(bucket.items.map(item => item.id));
            packlist.buckets = packlist.buckets.filter(
                currentBucket => currentBucket.id !== bucket.id
            );
            packlist.progress = (packlist.progress || []).filter(
                itemId => !itemIds.has(itemId)
            );

            await updatePacklist(packlist.id, {
                buckets: packlist.buckets,
                progress: packlist.progress
            });

            await initPacklistEditor();
        };

        header.append(toggle, title, deleteBucket);
        section.appendChild(header);

        if (!bucket.collapsed) {
            const items = document.createElement("div");
            items.className = "packlist-editor-items";

            for (const item of bucket.items) {
                const row = document.createElement("div");
                row.className = "packlist-editor-item";

                const text = document.createElement("span");
                text.textContent = item.text;

                const remove = document.createElement("button");
                remove.type = "button";
                remove.className = "packlist-item-delete";
                remove.textContent = "×";
                remove.setAttribute("aria-label", "Item löschen");

                remove.onclick = async () => {
                    bucket.items = bucket.items.filter(
                        currentItem => currentItem.id !== item.id
                    );

                    packlist.progress = (packlist.progress || []).filter(
                        itemId => itemId !== item.id
                    );

                    await updatePacklist(packlist.id, {
                        buckets: packlist.buckets,
                        progress: packlist.progress
                    });

                    await initPacklistEditor();
                };

                row.append(text, remove);
                items.appendChild(row);
            }

            const addRow = document.createElement("div");
            addRow.className = "packlist-add-item-row";

            const addItemButton = document.createElement("button");
            addItemButton.type = "button";
            addItemButton.className = "packlist-icon-button";
            addItemButton.textContent = "+";
            addItemButton.setAttribute("aria-label", "Item hinzufügen");

            const itemInput = document.createElement("input");
            itemInput.type = "text";
            itemInput.placeholder = "Neues Item";
            itemInput.className = "packlist-new-item";

            async function addItem() {
                const text = itemInput.value.trim();
                if (!text) {
                    itemInput.focus();
                    return;
                }

                bucket.items.push({
                    id: crypto.randomUUID(),
                    text
                });

                await updatePacklist(packlist.id, {
                    buckets: packlist.buckets
                });

                await initPacklistEditor();
            }

            addItemButton.onclick = addItem;
            itemInput.addEventListener("keydown", event => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    addItem();
                }
            });

            addRow.append(addItemButton, itemInput);
            items.appendChild(addRow);
            section.appendChild(items);
        }

        content.appendChild(section);
    }
}
