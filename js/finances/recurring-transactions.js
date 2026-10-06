import {
    loadRecurringTransactions,
    addRecurringTransaction,
    deleteRecurringTransaction
} from "../data/recurring-transactions-data.js?v=1.25";

const GROUPS = [
    { frequency: "monthly", title: "Monatlich" },
    { frequency: "quarterly", title: "Quartalsweise" },
    { frequency: "yearly", title: "Jährlich" }
];

const euro = value => new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR"
}).format(Number(value));

const dateText = (value, frequency) => { const date = new Date(`${value}T12:00:00`); if (frequency === "monthly") return `${String(date.getDate()).padStart(2, "0")}.`; return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "long" }).format(date); };

export function initRecurringTransactions() {
    const root = document.getElementById("recurring-transactions-content");
    if (!root) return;

    let entries = [];

    function render() {
        root.innerHTML = "";

        GROUPS.forEach(group => {
            const section = document.createElement("section");
            section.className = "recurring-section";

            const header = document.createElement("div");
            header.className = "recurring-header";
            const title = document.createElement("h3");
            title.textContent = group.title;
            const addButton = document.createElement("button");
            addButton.type = "button";
            addButton.textContent = "+";
            addButton.setAttribute("aria-label", `${group.title} hinzufügen`);
            header.append(title, addButton);
            section.appendChild(header);

            const list = document.createElement("div");
            list.className = "recurring-list";
            const groupEntries = entries.filter(entry => entry.frequency === group.frequency);

            if (!groupEntries.length) {
                const empty = document.createElement("p");
                empty.className = "calendar-no-tasks";
                empty.textContent = "Noch keine Einträge.";
                list.appendChild(empty);
            } else {
                groupEntries.forEach(entry => {
                    const row = document.createElement("div");
                    row.className = "recurring-row";
                    const info = document.createElement("div");
                    const name = document.createElement("strong");
                    name.textContent = entry.name;
                    const details = document.createElement("span");
                    details.textContent = `${entry.transaction_type === "income" ? "Einnahme" : "Ausgabe"} · ${euro(entry.amount)} · ${dateText(entry.start_date, entry.frequency)}`;
                    info.append(name, details);
                    const remove = document.createElement("button");
                    remove.type = "button";
                    remove.className = "recurring-delete";
                    remove.textContent = "X";
                    remove.setAttribute("aria-label", `${entry.name} löschen`);
                    remove.addEventListener("click", async () => {
                        if (!confirm(`"${entry.name}" wirklich löschen?`)) return;
                        try {
                            await deleteRecurringTransaction(entry.id);
                            entries = entries.filter(item => item.id !== entry.id);
                            render();
                        } catch (error) {
                            console.error(error);
                        }
                    });
                    row.append(info, remove);
                    list.appendChild(row);
                });
            }

            addButton.addEventListener("click", () => showForm(section, group.frequency));
            section.appendChild(list);
            root.appendChild(section);
        });
    }

    function showForm(section, frequency) {
        if (section.querySelector(".recurring-form")) return;
        const form = document.createElement("form");
        form.className = "recurring-form";
        form.innerHTML = `
            <input name="name" type="text" placeholder="Bezeichnung" required>
            <div class="loan-input-unit"><input name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="Betrag" required><span>€</span></div>
            <select name="transaction_type" required>
                <option value="expense">Ausgabe</option>
                <option value="income">Einnahme</option>
            </select>
            <label>Tag<input name="day" type="number" min="1" max="31" step="1" inputmode="numeric" placeholder="01" required></label>
            ${frequency === "monthly" ? "" : `<label>Monat<select name="month" required>
                <option value="1">Januar</option><option value="2">Februar</option><option value="3">März</option><option value="4">April</option>
                <option value="5">Mai</option><option value="6">Juni</option><option value="7">Juli</option><option value="8">August</option>
                <option value="9">September</option><option value="10">Oktober</option><option value="11">November</option><option value="12">Dezember</option>
            </select></label>`}
            <div class="recurring-form-actions">
                <button type="submit">Speichern</button>
                <button type="button" class="recurring-cancel">Abbrechen</button>
            </div>`;

        form.querySelector(".recurring-cancel").addEventListener("click", () => form.remove());
        form.addEventListener("submit", async event => {
            event.preventDefault();
            const values = new FormData(form);
            const entry = {
                name: values.get("name").trim(),
                amount: Number(values.get("amount")),
                transaction_type: values.get("transaction_type"),
                frequency,
                start_date: (() => { const day = Number(values.get("day")); const month = frequency === "monthly" ? 1 : Number(values.get("month")); return `2000-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`; })()
            };
            const day = Number(values.get("day"));
            const month = frequency === "monthly" ? 1 : Number(values.get("month"));
            const validDate = new Date(2000, month - 1, day);
            if (!entry.name || !Number.isFinite(entry.amount) || entry.amount <= 0 || day < 1 || day > 31 || validDate.getMonth() !== month - 1 || validDate.getDate() !== day) return;
            const submit = form.querySelector('button[type="submit"]');
            submit.disabled = true;
            try {
                entries.push(await addRecurringTransaction(entry));
                render();
            } catch (error) {
                console.error(error);
                submit.disabled = false;
            }
        });
        section.querySelector(".recurring-header").insertAdjacentElement("afterend", form);
    }

    loadRecurringTransactions()
        .then(data => {
            entries = data || [];
            render();
        })
        .catch(error => {
            console.error("Wiederkehrende Buchungen konnten nicht geladen werden:", error);
            render();
        });
}
