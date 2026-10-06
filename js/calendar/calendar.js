// js/calendar/calendar.js

import { showView } from "../router.js";
import {
    syncNotificationState
} from "../push/notification-state.js?v=0.94";
import {
    getISOWeek,
    getISOWeekYear,
    getISOWeeksInYear
} from "../utils/date.js";
import {
    loadCalendarTasks,
    addCalendarTask,
    deleteCalendarTask,
    setCalendarTaskDone
} from "../data/calendar-data.js?v=0.94";

const WEEK_TASKS = [
    { id: "plants", name: "Pflanzen gießen", shortName: "Pflanzen" },
    { id: "orchids", name: "Orchideen wässern", shortName: "Orchideen" },
    { id: "aquarium-small", name: "Aquarium kleiner Wasserwechsel", shortName: "Aqua klein" },
    { id: "aquarium-large", name: "Aquarium großer Wasserwechsel", shortName: "Aqua groß" },
    { id: "water-test", name: "Wassertest", shortName: "Wassertest" }
];

export function initCalendar() {
    const weekElement = document.getElementById("calendar-current-week");
    const tasksElement = document.getElementById("calendar-week-tasks");
    const editButton = document.getElementById("calendar-edit");
    const editBackButton = document.getElementById("calendar-edit-back");

    if (!weekElement || !tasksElement || !editButton || !editBackButton) {
        console.error("Kalender-Elemente nicht gefunden");
        return;
    }

    // Vor dem Login kann die erste Abfrage noch fehlschlagen.
    renderCurrentWeek();

    document
        .querySelector('[data-tile="calendar"]')
        ?.addEventListener("click", renderCurrentWeek);

    editButton.addEventListener("click", async () => {
        await renderWeekEditor();
        showView("calendar-edit");
    });

    editBackButton.addEventListener("click", async () => {
        await renderCurrentWeek();
        showView("calendar");
    });
}

async function renderCurrentWeek() {
    const weekElement = document.getElementById("calendar-current-week");
    const tasksElement = document.getElementById("calendar-week-tasks");

    if (!weekElement || !tasksElement) return;

    const today = new Date();
    const week = getISOWeek(today);
    const year = getISOWeekYear(today);

    weekElement.textContent = `KW ${week} · ${year}`;

    let rows;

    try {
        rows = await loadCalendarTasks(year, week);
    } catch (error) {
        console.log("Kalender noch nicht geladen:", error.message);
        return;
    }

    tasksElement.innerHTML = "";

    if (rows.length === 0) {
        const empty = document.createElement("p");
        empty.className = "calendar-no-tasks";
        empty.textContent = "Für diese Woche sind keine Aufgaben geplant.";
        tasksElement.appendChild(empty);
        return;
    }

    const list = document.createElement("ul");
    list.className = "calendar-task-list";

    WEEK_TASKS.forEach(task => {
        const row = rows.find(item => item.task_id === task.id);
        if (!row) return;

        const li = document.createElement("li");
        li.textContent = `${row.done ? "☑" : "☐"} ${task.name}`;
        li.classList.toggle("done", row.done);

        li.addEventListener("click", async () => {
            li.style.pointerEvents = "none";

            try {
                await setCalendarTaskDone(row.id, !row.done);
                await renderCurrentWeek();
                await syncNotificationState();
            } catch (error) {
                console.error("Kalender-Aufgabe konnte nicht geändert werden:", error);
                li.style.pointerEvents = "";
            }
        });

        list.appendChild(li);
    });

    tasksElement.appendChild(list);
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
                button.textContent = existingRow ? "✓" : "";
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

                    const today = new Date();
                    if (
                        year === getISOWeekYear(today) &&
                        week === getISOWeek(today)
                    ) {
                        await syncNotificationState();
                    }
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
