// js/notes/notes.js
// v1.34 – Oberfläche für mehrere Allgemein-Notizen.
// Die Supabase-Speicherung ergänzen wir im nächsten Schritt.

const draftNotes = [];
let nextDraftId = 1;

function titleOf(content) {
    return content.split("\n")[0].trim() || "Neue Notiz";
}

function makeDraft() {
    const note = { id: `draft-${nextDraftId++}`, content: "", open: true };
    draftNotes.unshift(note);
    return note;
}

export function initNotes() {
    const list = document.getElementById("general-notes-list");
    const addButton = document.getElementById("general-note-add");
    const notesTile = document.querySelector('[data-tile="general-note"]');
    if (!list) return;

    const render = (focusId = null) => {
        list.innerHTML = "";
        if (!draftNotes.length) {
            const empty = document.createElement("p");
            empty.className = "general-notes-empty";
            empty.textContent = "Noch keine Notizen.";
            list.appendChild(empty);
        }

        for (const note of draftNotes) {
            const section = document.createElement("section");
            section.className = "general-note-card";

            const header = document.createElement("button");
            header.type = "button";
            header.className = "general-note-toggle";
            if (note.open) header.classList.add("open");

            const arrow = document.createElement("span");
            arrow.className = "general-note-arrow";
            arrow.textContent = note.open ? "v" : ">";

            const title = document.createElement("strong");
            title.textContent = titleOf(note.content);
            header.append(arrow, title);

            const body = document.createElement("div");
            body.className = "general-note-body";
            if (!note.open) body.classList.add("hidden");

            const textarea = document.createElement("textarea");
            textarea.className = "general-note-text";
            textarea.placeholder = "Notiz schreiben...";
            textarea.value = note.content;
            textarea.addEventListener("input", () => {
                note.content = textarea.value;
                title.textContent = titleOf(note.content);
            });
            body.appendChild(textarea);

            header.addEventListener("click", () => {
                note.open = !note.open;
                render(note.open ? note.id : null);
            });

            section.append(header, body);
            list.appendChild(section);

            if (focusId === note.id) {
                requestAnimationFrame(() => textarea.focus());
            }
        }
    };

    const addNote = () => {
        const note = makeDraft();
        render(note.id);
    };

    addButton?.addEventListener("click", addNote);
    document.addEventListener("dock:new-general-note", () => {
        sessionStorage.removeItem("dock-new-general-note");
        addNote();
    });
    notesTile?.addEventListener("click", () => render());

    if (sessionStorage.getItem("dock-new-general-note") === "1") {
        sessionStorage.removeItem("dock-new-general-note");
        addNote();
    } else {
        render();
    }
}
