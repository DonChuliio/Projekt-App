import { loadSavingsCalculation, saveSavingsCalculation } from "../data/savings-calculation-data.js?v=1.69";
import { PLANS, valid, project } from "./savings-model.js?v=1.69";
const euro = v => new Intl.NumberFormat("de-DE", { style:"currency", currency:"EUR" }).format(v);
export function initSavingsCalculator() {
    const ids = [...PLANS.flatMap(key => [`saving-${key}-start`, `saving-${key}-monthly`]), "saving-return", "saving-years", "saving-months"];
    const el = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
    const results = document.getElementById("saving-results"), error = document.getElementById("saving-error");
    if (ids.some(id => !el[id]) || !results || !error) return;
    let loading = true, timer = null;
    const values = () => ({ ...Object.fromEntries(PLANS.flatMap(key => [
        [`${key}Start`, Number(el[`saving-${key}-start`].value)],
        [`${key}Monthly`, Number(el[`saving-${key}-monthly`].value)]
    ])), annualReturn:Number(el["saving-return"].value), years:Number(el["saving-years"].value), months:Number(el["saving-months"].value) });
    const complete = () => ["saving-return", "saving-years", "saving-months"].every(id => el[id].value !== "");
    function calculate() {
        const v = values();
        PLANS.forEach(key => {
            const start = v[`${key}Start`], monthly = v[`${key}Monthly`];
            document.getElementById(`saving-${key}-summary`).textContent =
                Number.isFinite(start) && Number.isFinite(monthly) && start >= 0 && monthly >= 0
                    ? `Start: ${euro(start)} · Rate: ${euro(monthly)}/Monat` : "Bitte gültige Beträge eingeben.";
        });
        error.classList.add("hidden");
        if (!complete()) { results.classList.add("hidden"); return; }
        if (!valid(v)) {
            results.classList.add("hidden"); error.textContent = "Bitte gültige Werte eingeben.";
            error.classList.remove("hidden"); return;
        }
        const amounts = project(v);
        [...PLANS, "total"].forEach(key => document.getElementById(`saving-${key}-result`).textContent = euro(amounts[key]));
        results.classList.remove("hidden");
    }
    function save() {
        if (loading) return;
        clearTimeout(timer);
        timer = setTimeout(async () => {
            const v = values();
            if (!complete() || !valid(v)) return;
            try { await saveSavingsCalculation(v); }
            catch { error.textContent = "Sparrechnung konnte nicht gespeichert werden. Bitte erneut versuchen."; error.classList.remove("hidden"); }
        }, 700);
    }
    ids.forEach(id => el[id].addEventListener("input", () => { calculate(); save(); }));
    calculate();
    loadSavingsCalculation().then(v => {
        if (!v) return;
        PLANS.forEach(key => {
            el[`saving-${key}-start`].value = v[`${key}_start`] ?? 0;
            el[`saving-${key}-monthly`].value = v[`${key}_monthly`] ?? 0;
        });
        el["saving-return"].value = v.annual_return;
        el["saving-years"].value = v.years;
        el["saving-months"].value = v.months ?? 0;
        calculate();
    }).catch(() => { error.textContent = "Gespeicherte Sparrechnung konnte nicht geladen werden. Bitte neu laden."; error.classList.remove("hidden"); })
      .finally(() => loading = false);
}
