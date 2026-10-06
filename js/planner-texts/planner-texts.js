import { loadPlannerText, savePlannerText } from "../data/planner-text-data.js?v=1.09";

export function initPlannerTexts() {
    for (const field of document.querySelectorAll(".simple-note-field")) {
        const key = field.dataset.textKey;

        loadPlannerText(key)
            .then(row => {
                field.value = row?.content || "";
            })
            .catch(error => console.log("Planner-Text noch nicht geladen:", error.message));

        field.onchange = async () => {
            try {
                await savePlannerText(key, field.value);
            } catch (error) {
                console.error("Planner-Text konnte nicht gespeichert werden:", error);
            }
        };
    }
}
