// js/calendar/calendar.js

import { initRoutineEditor } from "./routine-editor.js?v=1.73";
import { loadCalendarSettings, saveMonthEndSavingsReminder, saveMonthStartBalanceReminder } from "../data/calendar-settings-data.js?v=1.30";

export function initCalendar() {
    document.querySelector('[data-tile="calendar-edit"]')?.addEventListener("click", renderWeekEditor);
    document.addEventListener("dock:auth-changed", renderWeekEditor);
}

async function renderWeekEditor() {
    const editView = document.querySelector("[data-view='calendar-edit']");
    if (!editView) return;

    document.getElementById("week-plan-editor")?.remove();

    const editor = document.createElement("div");
    editor.id = "week-plan-editor";
    editView.appendChild(editor);
    await initRoutineEditor(editor);

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

}
