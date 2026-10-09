import {
    loadRecurringTransactions,
    addRecurringTransaction,
    deleteRecurringTransaction,
    updateRecurringTransaction
} from "../data/recurring-transactions-data.js?v=1.72";

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

    let entries = [], mutating = false;

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
                    const edit = document.createElement("button");
                    edit.type = "button";
                    edit.className = "recurring-edit";
                    edit.setAttribute("aria-label", `${entry.name} bearbeiten`);
                    edit.title = "Bearbeiten";
                    edit.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6zM13 6l5 5"/></svg>';
                    edit.addEventListener("click", () => showForm(section, group.frequency, entry));
                    const actions = document.createElement("div");
                    actions.className = "recurring-row-actions";
                    actions.append(edit);
                    row.append(info, actions);
                    list.appendChild(row);
                });
            }

            addButton.addEventListener("click", () => showForm(section, group.frequency));
            section.appendChild(list);
            root.appendChild(section);
        });
    }

    function showForm(section, frequency, original = null) {
        if (mutating) return;
        root.querySelectorAll(".recurring-form").forEach(form => form.remove());
        const form = document.createElement("form");
        form.className = "recurring-form";
        form.innerHTML = `
            <input name="name" type="text" placeholder="Bezeichnung" required>
            <div class="loan-input-unit"><input name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="Betrag" required><span>€</span></div>
            <select name="transaction_type" required>
                <option value="expense">Ausgabe</option>
                <option value="income">Einnahme</option>
            </select>
            <label>Intervall<select name="frequency" required><option value="monthly">Monatlich</option><option value="quarterly">Quartalsweise</option><option value="yearly">Jährlich</option></select></label>
            <label>Tag<input name="day" type="number" min="1" max="31" step="1" inputmode="numeric" placeholder="01" required></label>
            <label class="recurring-month-field">Monat<select name="month" required>
                <option value="1">Januar</option><option value="2">Februar</option><option value="3">März</option><option value="4">April</option>
                <option value="5">Mai</option><option value="6">Juni</option><option value="7">Juli</option><option value="8">August</option>
                <option value="9">September</option><option value="10">Oktober</option><option value="11">November</option><option value="12">Dezember</option>
            </select></label>
            <div class="recurring-form-actions">
                <button type="submit">Speichern</button>
                <button type="button" class="recurring-cancel">Abbrechen</button>
            </div>`;

        const input = name => form.querySelector(`[name="${name}"]`);
        input("name").setAttribute("aria-label", "Bezeichnung");
        input("amount").setAttribute("aria-label", "Betrag");
        input("transaction_type").setAttribute("aria-label", "Einnahme oder Ausgabe");
        const title = document.createElement("h4");
        title.textContent = original ? "Eintrag bearbeiten" : "Neuer Eintrag";
        form.prepend(title);
        input("frequency").value = frequency;
        input("frequency").setAttribute("aria-label", "Intervall");
        const updateMonth = () => { input("month").disabled = input("frequency").value === "monthly"; form.querySelector(".recurring-month-field").hidden = input("month").disabled; };
        input("frequency").addEventListener("change", updateMonth);
        updateMonth();
        if (original) {
            input("name").value = original.name;
            input("amount").value = original.amount;
            input("transaction_type").value = original.transaction_type;
            input("day").value = Number(original.start_date.slice(8, 10));
            input("month").value = Number(original.start_date.slice(5, 7));
        }
        const error = document.createElement("p");
        error.setAttribute("role", "status");
        error.className = "loan-error";
        form.append(error);

        if (original) {
            const remove = document.createElement("button");
            remove.type = "button";remove.className = "recurring-remove-entry";remove.textContent = "Eintrag löschen";
            remove.addEventListener("click", () => {
                if (form.querySelector(".recurring-delete-confirmation")) return;
                const confirmation = document.createElement("div");confirmation.className = "recurring-delete-confirmation";
                const warning = document.createElement("p");warning.textContent = `„${original.name}“ wirklich löschen?`;
                const yes = document.createElement("button");yes.type = "button";yes.textContent = "Löschen bestätigen";
                const no = document.createElement("button");no.type = "button";no.textContent = "Löschen abbrechen";no.addEventListener("click", () => confirmation.remove());
                yes.addEventListener("click", async () => {
                    if (mutating) return;
                    mutating = true;
                    const controls = [...form.querySelectorAll("button,input,select")].map(n => [n,n.disabled]);
                    controls.forEach(([n]) => n.disabled = true);
                    try { await deleteRecurringTransaction(original.id);entries = entries.filter(e => e.id !== original.id);render();document.dispatchEvent(new CustomEvent("dock:recurring-changed")); }
                    catch { error.textContent = "Löschen fehlgeschlagen. Der Eintrag bleibt erhalten. Bitte erneut versuchen."; }
                    finally { mutating = false;controls.forEach(([n,disabled]) => n.disabled = disabled); }
                });
                confirmation.append(warning,yes,no);form.append(confirmation);
            });
            form.append(remove);
        }
        form.querySelector(".recurring-cancel").addEventListener("click", () => form.remove());
        form.addEventListener("submit", async event => {
            event.preventDefault();
            const submit = form.querySelector('button[type="submit"]');
            if (submit.disabled || mutating) return;
            const values = new FormData(form);
            const selectedFrequency = values.get("frequency");
            const entry = {
                name: values.get("name").trim(),
                amount: Number(values.get("amount")),
                transaction_type: values.get("transaction_type"),
                frequency: selectedFrequency,
                start_date: (() => { const day = Number(values.get("day")); const month = selectedFrequency === "monthly" ? 1 : Number(values.get("month")); return `2000-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`; })()
            };
            const day = Number(values.get("day"));
            const month = selectedFrequency === "monthly" ? 1 : Number(values.get("month"));
            const validDate = new Date(2000, month - 1, day);
            if (!GROUPS.some(g => g.frequency === selectedFrequency) || !["income","expense"].includes(entry.transaction_type) || !entry.name || !Number.isFinite(entry.amount) || entry.amount <= 0 || !Number.isInteger(day) || day < 1 || day > 31 || !Number.isInteger(month) || validDate.getMonth() !== month - 1 || validDate.getDate() !== day) { error.textContent = "Bitte eine Bezeichnung, einen positiven Betrag und ein gültiges Datum eingeben."; return; }
            if (original && day === Number(original.start_date.slice(8, 10)) && (selectedFrequency === "monthly" || month === Number(original.start_date.slice(5, 7)))) entry.start_date = original.start_date;
            error.textContent = "";
            mutating = true;
            const controls = [...form.querySelectorAll("button,input,select")].map(n => [n,n.disabled]);
            controls.forEach(([n]) => n.disabled = true);
            try {
                if (original) {
                    const updated = await updateRecurringTransaction(original.id, entry);
                    entries = entries.map(item => item.id === original.id ? updated : item);
                } else entries.push(await addRecurringTransaction(entry));
                render();
                document.dispatchEvent(new CustomEvent("dock:recurring-changed"));
            } catch (error) {
                form.querySelector('[role="status"]').textContent = "Speichern fehlgeschlagen. Deine Eingaben bleiben erhalten. Bitte erneut versuchen.";
            } finally {
                mutating = false;
                controls.forEach(([n,disabled]) => n.disabled = disabled);
            }
        });
        section.querySelector(".recurring-header").insertAdjacentElement("afterend", form);
        input("amount").focus();
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

