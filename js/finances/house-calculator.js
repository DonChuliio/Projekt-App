function euro(value) {
    return new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR"
    }).format(value);
}

export function initHouseCalculator() {
    const totalInput = document.getElementById("house-total");
    const equityInput = document.getElementById("house-equity");
    const interestInput = document.getElementById("loan-interest");
    const yearsInput = document.getElementById("loan-years");
    const results = document.getElementById("loan-results");
    const error = document.getElementById("loan-error");

    if (!totalInput || !equityInput || !interestInput || !yearsInput || !results || !error) return;

    function calculate() {
        const total = Number(totalInput.value);
        const equity = Number(equityInput.value);
        const annualInterest = Number(interestInput.value);
        const years = Number(yearsInput.value);

        if (!totalInput.value || !equityInput.value || !interestInput.value || !yearsInput.value) {
            results.classList.add("hidden");
            error.classList.add("hidden");
            return;
        }

        const amount = total - equity;

        if (total <= 0 || equity < 0 || equity >= total || annualInterest < 0 || years <= 0) {
            results.classList.add("hidden");
            error.textContent = equity >= total
                ? "Das Eigenkapital muss kleiner als die Gesamtsumme sein."
                : "Bitte gültige Werte eingeben.";
            error.classList.remove("hidden");
            return;
        }

        const months = Math.round(years * 12);
        const monthlyInterest = annualInterest / 100 / 12;
        const payment = monthlyInterest === 0
            ? amount / months
            : amount * monthlyInterest * Math.pow(1 + monthlyInterest, months) /
              (Math.pow(1 + monthlyInterest, months) - 1);

        const firstInterest = amount * monthlyInterest;
        const firstPrincipal = payment - firstInterest;
        const totalPayment = payment * months;
        const totalInterest = totalPayment - amount;

        document.getElementById("loan-amount-result").textContent = euro(amount);
        document.getElementById("loan-payment").textContent = euro(payment);
        document.getElementById("loan-first-interest").textContent = euro(firstInterest);
        document.getElementById("loan-first-principal").textContent = euro(firstPrincipal);
        document.getElementById("loan-total-payment").textContent = euro(totalPayment);
        document.getElementById("loan-total-interest").textContent = euro(totalInterest);

        error.classList.add("hidden");
        results.classList.remove("hidden");
    }

    [totalInput, equityInput, interestInput, yearsInput].forEach(input => {
        input.addEventListener("input", calculate);
    });
}
