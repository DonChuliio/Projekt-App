// js/calendar/calendar.js

import { showView } from "../router.js";
import {
    getISOWeek,
    getISOWeekYear,
    getISOWeeksInYear
} from "../utils/date.js";
import {
    loadCalendarTasks,
    addCalendarTask,
    deleteCalendarTask
} from "../data/calendar-data.js?v=0.94";
import { loadCalendarSettings, saveMonthEndSavingsReminder, saveMonthStartBalanceReminder } from "../data/calendar-settings-data.js?v=1.30";

export const WEEK_TASKS = [
    { id: "plants", name: "Pflanzen gießen", shortName: "Pflanzen" },
    { id: "orchids", name: "Orchideen wässern", shortName: "Orchideen" },
    { id: "aquarium-small", name: "Aquarium kleiner Wasserwechsel", shortName: "Aqua klein" },
    { id: "aquarium-large", name: "Aquarium großer Wasserwechsel", shortName: "Aqua groß" },
    { id: "water-test", name: "Wassertest", shortName: "Wassertest" }
];

export function initCalendar() {
    document.querySelector('[data-tile="calendar-edit"]')?.addEventListener("click", renderWeekEditor);
    document.addEventListener("dock:auth-changed", renderWeekEditor);
}

async function renderWeekEditor() {
    const editView = document.querySelector("[data-view='calendar-edit']");
    if (!editView) return;

    document.getElementById("week-plan-editor")?.remove();

    const year = getISOWeekYear(new Date());
    let rows;

    try {
        rows = await loadCalendarTasks(year);
    } catch (error) {
        console.error("Wochenplan konnte nicht geladen werden:", error);
        return;
    }

    const numberOfWeeks = getISOWeeksInYear(year);
    const editor = document.createElement("div");
    editor.id = "week-plan-editor";

    const reminderTitle = document.createElement("p");
    reminderTitle.className = "week-plan-year";
    reminderTitle.textContent = "Monatliche Erinnerung";
    editor.appendChild(reminderTitle);

    const reminderLabel = document.createElement("label");
    reminderLabel.className = "month-end-reminder";
    const reminderCheckbox = document.createElement("input");
    reminderCheckbox.type = "checkbox";
    const reminderText = document.createElement("span");
    reminderText.textContent = "Sparkonto Überschuss überweisen – am letzten Tag des Monats um 09:00 Uhr";
    reminderLabel.append(reminderCheckbox, reminderText);
    editor.appendChild(reminderLabel);

    try {
        const settings = await loadCalendarSettings();
        reminderCheckbox.checked = settings?.month_end_savings_reminder === true;
    } catch (error) {
        console.log("Kalender-Einstellung noch nicht geladen:", error.message);
    }

    reminderCheckbox.addEventListener("change", async () => {
        reminderCheckbox.disabled = true;
        try {
            await saveMonthEndSavingsReminder(reminderCheckbox.checked);
        } catch (error) {
            console.error("Monatsende-Erinnerung konnte nicht gespeichert werden:", error);
            reminderCheckbox.checked = !reminderCheckbox.checked;
        } finally {
            reminderCheckbox.disabled = false;
        }
    });

    const balanceReminderLabel = document.createElement("label");
    balanceReminderLabel.className = "month-end-reminder";
    const balanceReminderCheckbox = document.createElement("input");
    balanceReminderCheckbox.type = "checkbox";
    const balanceReminderText = document.createElement("span");
    balanceReminderText.textContent = "Monatsabgleich ausführen – am 02. des Monats um 09:00 Uhr";
    balanceReminderLabel.append(balanceReminderCheckbox, balanceReminderText);
    editor.appendChild(balanceReminderLabel);

    try {
        const settings = await loadCalendarSettings();
        balanceReminderCheckbox.checked = settings?.month_start_balance_reminder === true;
    } catch (error) {
        console.log("Monatsabgleich-Einstellung noch nicht geladen:", error.message);
    }

    balanceReminderCheckbox.addEventListener("change", async () => {
        balanceReminderCheckbox.disabled = true;
        try {
            await saveMonthStartBalanceReminder(balanceReminderCheckbox.checked);
        } catch (error) {
            console.error("Monatsabgleich-Erinnerung konnte nicht gespeichert werden:", error);
            balanceReminderCheckbox.checked = !balanceReminderCheckbox.checked;
        } finally {
            balanceReminderCheckbox.disabled = false;
        }
    });

    const yearTitle = document.createElement("p");
    yearTitle.className = "week-plan-year";
    yearTitle.textContent = `Wochenplan ${year}`;
    editor.appendChild(yearTitle);

    const scrollContainer = document.createElement("div");
    scrollContainer.className = "week-plan-scroll";

    const table = document.createElement("table");
    table.className = "week-plan-table";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const taskHeader = document.createElement("th");
    taskHeader.textContent = "Aufgabe";
    headerRow.appendChild(taskHeader);

    for (let week = 1; week <= numberOfWeeks; week++) {
        const th = document.createElement("th");
        th.textContent = `KW ${week}`;
        headerRow.appendChild(th);
    }

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    WEEK_TASKS.forEach(task => {
        const rowElement = document.createElement("tr");
        const taskCell = document.createElement("th");
        taskCell.textContent = task.shortName;
        taskCell.title = task.name;
        rowElement.appendChild(taskCell);

        for (let week = 1; week <= numberOfWeeks; week++) {
            const cell = document.createElement("td");
            const button = document.createElement("button");
            button.type = "button";
            button.className = "week-task-toggle";

            let existingRow = rows.find(
                item => item.week === week && item.task_id === task.id
            );

            function updateButton() {
                button.classList.toggle("active", Boolean(existingRow));
                button.textContent = "";
                button.setAttribute("aria-label", `${task.name}, KW ${week}: ${existingRow ? "geplant" : "nicht geplant"}`);
                button.setAttribute("aria-pressed", String(Boolean(existingRow)));
            }

            updateButton();

            button.addEventListener("click", async () => {
                button.disabled = true;

                try {
                    if (existingRow) {
                        await deleteCalendarTask(year, week, task.id);
                        rows = rows.filter(item => item.id !== existingRow.id);
                        existingRow = null;
                    } else {
                        existingRow = await addCalendarTask(year, week, task.id);
                        if (existingRow) rows.push(existingRow);
                    }

                    updateButton();
                    document.dispatchEvent(new CustomEvent("dock:routines-changed"));
                } catch (error) {
                    console.error("Wochenplan konnte nicht geändert werden:", error);
                } finally {
                    button.disabled = false;
                    button.blur();
                }
            });

            cell.appendChild(button);
            rowElement.appendChild(cell);
        }

        tbody.appendChild(rowElement);
    });

    table.appendChild(tbody);
    scrollContainer.appendChild(table);
    editor.appendChild(scrollContainer);
    editView.appendChild(editor);
}
