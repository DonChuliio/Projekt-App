// js/notes/notes.js
// v1.39 – mehrere Allgemein-Notizen mit Supabase-Autosave.

import { loadNotes, createNote, updateNote } from "../data/notes-data.js?v=1.39";

let notes = [];
let loadPromise = null;
const saveTimers = new Map();

function titleOf(content) {
    return content.split("\n")[0].trim() || "Neue Notiz";
}

export function initNotes() {
    const list = document.getElementById("general-notes-list");
    const addButton = document.getElementById("general-note-add");
    const notesTile = document.querySelector('[data-tile="general-note"]');
    if (!list) return;

    const showMessage = text => {
        list.innerHTML = "";
        const p = document.createElement("p");
        p.className = "general-notes-empty";
        p.textContent = text;
        list.appendChild(p);
    };

    const render = (focusId = null) => {
        list.innerHTML = "";
        if (!notes.length) {
            showMessage("Noch keine Notizen.");
            return;
        }

        for (const note of notes) {
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

                clearTimeout(saveTimers.get(note.id));
                saveTimers.set(note.id, setTimeout(async () => {
                    try {
                        await updateNote(note.id, note.content);
                    } catch (error) {
                        console.error("Notiz konnte nicht gespeichert werden:", error);
                    }
                }, 500));
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

    const ensureLoaded = async () => {
        if (!loadPromise) {
            showMessage("Notizen werden geladen...");
            loadPromise = loadNotes()
                .then(rows => {
                    notes = rows.map(row => ({ ...row, open: false }));
                    render();
                })
                .catch(error => {
                    console.error("Notizen konnten nicht geladen werden:", error);
                    showMessage("Notizen konnten nicht geladen werden.");
                    loadPromise = null;
                    throw error;
                });
        }
        return loadPromise;
    };

    const addNote = async () => {
        try {
            await ensureLoaded();
            const row = await createNote("");
            const note = { ...row, open: true };
            notes.unshift(note);
            render(note.id);
        } catch (error) {
            console.error("Neue Notiz konnte nicht angelegt werden:", error);
        }
    };

    addButton?.addEventListener("click", addNote);
    notesTile?.addEventListener("click", ensureLoaded);

    document.addEventListener("dock:new-general-note", () => {
        sessionStorage.removeItem("dock-new-general-note");
        addNote();
    });

    ensureLoaded().then(() => {
        if (sessionStorage.getItem("dock-new-general-note") === "1") {
            sessionStorage.removeItem("dock-new-general-note");
            addNote();
        }
    }).catch(() => {});
}
