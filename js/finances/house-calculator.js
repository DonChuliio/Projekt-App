function euro(value) {
    return new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR"
    }).format(value);
}

export function initHouseCalculator() {
    const amountInput = document.getElementById("loan-amount");
    const interestInput = document.getElementById("loan-interest");
    const yearsInput = document.getElementById("loan-years");

    const results = document.getElementById("loan-results");
    const error = document.getElementById("loan-error");

    if (!amountInput || !interestInput || !yearsInput || !results || !error) {
        return;
    }

    function calculate() {
        const amount = Number(amountInput.value);
        const annualInterest = Number(interestInput.value);
        const years = Number(yearsInput.value);

        if (!amountInput.value || !interestInput.value || !yearsInput.value) {
            results.classList.add("hidden");
            error.classList.add("hidden");
            return;
        }

        if (amount <= 0 || annualInterest < 0 || years <= 0) {
            results.classList.add("hidden");
            error.textContent = "Bitte gültige Werte eingeben.";
            error.classList.remove("hidden");
            return;
        }

        const months = Math.round(years * 12);
        const monthlyInterest = annualInterest / 100 / 12;

        let payment;
        if (monthlyInterest === 0) {
            payment = amount / months;
        } else {
            payment =
                amount *
                monthlyInterest *
                Math.pow(1 + monthlyInterest, months) /
                (Math.pow(1 + monthlyInterest, months) - 1);
        }

        const firstInterest = amount * monthlyInterest;
        const firstPrincipal = payment - firstInterest;
        const totalPayment = payment * months;
        const totalInterest = totalPayment - amount;

        document.getElementById("loan-payment").textContent = euro(payment);
        document.getElementById("loan-first-interest").textContent = euro(firstInterest);
        document.getElementById("loan-first-principal").textContent = euro(firstPrincipal);
        document.getElementById("loan-total-payment").textContent = euro(totalPayment);
        document.getElementById("loan-total-interest").textContent = euro(totalInterest);

        error.classList.add("hidden");
        results.classList.remove("hidden");
    }

    amountInput.addEventListener("input", calculate);
    interestInput.addEventListener("input", calculate);
    yearsInput.addEventListener("input", calculate);
}
