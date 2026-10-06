import {
    loadRecurringTransactions,
    addRecurringTransaction,
    deleteRecurringTransaction
} from "../data/recurring-transactions-data.js?v=1.23";

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
            <label>Datum<input name="start_date" type="date" required></label>
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
                start_date: values.get("start_date")
            };
            if (!entry.name || !Number.isFinite(entry.amount) || entry.amount <= 0 || !entry.start_date) return;
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
