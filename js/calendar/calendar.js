
// Importiert Speicherfunktionen
import { save, load } from "../storage.js";

// Aktuell angezeigtes Datum (Monat/Jahr)
let currentDate = new Date();

/*
 Initialisiert den Kalender.
 Wird einmal beim App-Start aufgerufen.
*/
export function initCalendar() {

    // Navigationselemente holen
    document
        .getElementById("prevMonth")
        .addEventListener("click", () => changeMonth(-1));

    document
        .getElementById("nextMonth")
        .addEventListener("click", () => changeMonth(1));

    // Kalender initial rendern
    renderCalendar();
}

/*
 Wechselt den Monat.
 offset = -1 → zurück
 offset = +1 → vor
*/
function changeMonth(offset) {
    currentDate.setMonth(currentDate.getMonth() + offset);
    renderCalendar();
}

/*
 Baut den Kalender für den aktuellen Monat neu auf.
*/
function renderCalendar() {

    const calendar = document.getElementById("calendar");
    const monthYear = document.getElementById("monthYear");

    // Kalender leeren
    calendar.innerHTML = "";

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Monatsname + Jahr anzeigen
    monthYear.textContent = currentDate.toLocaleString("de-DE", {
        month: "long",
        year: "numeric"
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Leere Felder vor dem ersten Tag
    for (let i = 0; i < (firstDay + 6) % 7; i++) {
        calendar.appendChild(document.createElement("div"));
    }

    // Tage erzeugen
    for (let day = 1; day <= daysInMonth; day++) {

        const cell = document.createElement("div");
        cell.className = "day";
        cell.textContent = day;

        // Status aus Storage laden
        const key = `status-${year}-${month}-${day}`;
        const status = load(key, null);

        if (status) {
            cell.classList.add(`status-${status}`);
        }

        // Klick auf Tag → Status ändern
        cell.addEventListener("click", () => {
            setDayStatus(year, month, day);
        });

        calendar.appendChild(cell);
    }
}

/*
 Setzt oder entfernt den Status eines Tages
*/
function setDayStatus(year, month, day) {
    const key = `status-${year}-${month}-${day}`;

    const value = prompt(
        "Status wählen:\n0\n1-3\n4-7\n7+\nblackout\n(Leer = löschen)"
    );

    if (value === null) return;

    if (value.trim() === "") {
        localStorage.removeItem(key);
    } else {
        save(key, value);
    }

    renderCalendar();
}
