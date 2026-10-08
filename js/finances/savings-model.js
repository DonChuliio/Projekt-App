export const PLANS = ["trade", "taures", "lissy", "reserve"];
// Existing monthly compounding and end-of-month contribution formula.
export function future(start, monthly, annual, years, extraMonths) {
    const months = Math.round(years * 12) + extraMonths, r = annual / 100 / 12;
    if (r === 0) return start + monthly * months;
    return start * Math.pow(1 + r, months) + monthly * ((Math.pow(1 + r, months) - 1) / r);
}
export function valid(v) {
    return Object.values(v).every(Number.isFinite) &&
        PLANS.every(key => v[`${key}Start`] >= 0 && v[`${key}Monthly`] >= 0) &&
        v.annualReturn >= 0 && v.years >= 0 && v.months >= 0 && v.months <= 11 &&
        (v.years > 0 || v.months > 0);
}
export function project(v) {
    const amounts = Object.fromEntries(PLANS.map(key => [key,
        future(v[`${key}Start`], v[`${key}Monthly`], key === "reserve" ? 0 : v.annualReturn, v.years, v.months)]));
    return { ...amounts, total: Object.values(amounts).reduce((sum, value) => sum + value, 0) };
}
