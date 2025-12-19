// Referenzen auf die Hauptbereiche holen
const dashboard = document.getElementById("dashboard");
const notesView = document.getElementById("notesView");
const calendarView = document.getElementById("calendarView");

// Öffnet die Notiz-Ansicht
function openNotes() {
    dashboard.classList.add("hidden");
    // Dashboard verstecken

    notesView.classList.remove("hidden");
    // Notizen anzeigen
}

// Öffnet die Kalender-Ansicht
function openCalendar() {
    dashboard.classList.add("hidden");
    calendarView.classList.remove("hidden");
}

// Zurück zum Dashboard
function goHome() {
    notesView.classList.add("hidden");
    calendarView.classList.add("hidden");
    dashboard.classList.remove("hidden");
}



// Textfeld holen
const noteField = document.getElementById("note");

// Speicher-Button holen
const saveBtn = document.getElementById("saveBtn");

// Beim Laden gespeicherte Notiz anzeigen
noteField.value = localStorage.getItem("note") || "";
// Falls nichts gespeichert ist → leerer String

// Klick-Event für Speichern
saveBtn.addEventListener("click", () => {
    localStorage.setItem("note", noteField.value);
    // Text im Browser speichern

    alert("Notiz gespeichert");
});



// Aktuelles Datum speichern
let currentDate = new Date();

function renderCalendar() {
    const calendar = document.getElementById("calendar");
    const monthYear = document.getElementById("monthYear");

    calendar.innerHTML = "";
    // Alten Kalender löschen

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    monthYear.textContent = currentDate.toLocaleString("de-DE", {
        month: "long",
        year: "numeric"
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Leere Platzhalter vor dem 1. Tag
    for (let i = 0; i < (firstDay + 6) % 7; i++) {
        calendar.appendChild(document.createElement("div"));
    }

    // Tage erzeugen
    for (let day = 1; day <= daysInMonth; day++) {
        const div = document.createElement("div");
        div.className = "day";

        div.textContent = day;

        // Schlüssel für diesen Tag
        const key = `status-${year}-${month}-${day}`;

        // Gespeicherten Status laden
        const status = localStorage.getItem(key);

        // Passende Farbe setzen
        const statusClass = statusToClass(status);
        if (statusClass) {
            div.classList.add(statusClass);
        }

        // Klick-Event
        div.onclick = () => editDayStatus(year, month, day);

        calendar.appendChild(div);
    }
}

function editDayStatus(year, month, day) {
    // Eindeutiger Speicher-Schlüssel
    const key = `status-${year}-${month}-${day}`;

    // Aktuellen Status laden
    const current = localStorage.getItem(key) || "";

    // Auswahl anzeigen
    const choice = prompt(
        `Status für ${day}.${month + 1}.${year}\n\n` +
        `Leer lassen = kein Eintrag\n` +
        `0\n1-3\n4-7\n7+\nblackout`,
        current
    );

    // Abbruch → nichts tun
    if (choice === null) return;

    // Leerer Eintrag → löschen
    if (choice.trim() === "") {
        localStorage.removeItem(key);
    } else {
        // Status speichern
        localStorage.setItem(key, choice);
    }

    // Kalender neu zeichnen (damit Farbe aktualisiert wird)
    renderCalendar();
}


// Einen Monat zurück
function prevMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
}

// Einen Monat vor
function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
}

// Initial anzeigen
renderCalendar();



function editDayNote(year, month, day) {
    // Eindeutiger Schlüssel pro Datum
    const key = `note-${year}-${month}-${day}`;

    // Gespeicherte Notiz laden
    const existing = localStorage.getItem(key) || "";

    // Eingabedialog anzeigen
    const text = prompt(
        `Notiz für ${day}.${month + 1}.${year}`,
        existing
    );

    // Wenn nicht abgebrochen
    if (text !== null) {
        localStorage.setItem(key, text);
    }
}


// Wandelt einen Status-Wert in eine CSS-Klasse um
function statusToClass(status) {
    if (!status) return "";                 // leer → weiß
    if (status === "0") return "status-0";
    if (status === "1-3") return "status-1-3";
    if (status === "4-7") return "status-4-7";
    if (status === "7+") return "status-7plus";
    if (status === "blackout") return "status-blackout";
}


