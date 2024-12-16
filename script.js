document.addEventListener('DOMContentLoaded', function() {
    const calculator = {
        // Taux SCHL selon la mise de fonds
        SCHL_RATES: {
            5: 4.00,    // 5% à 9.99%
            10: 3.10,   // 10% à 14.99%
            15: 2.80,   // 15% à 19.99%
            20: 0       // 20% et plus
        },

        calculateSCHLRate(downPaymentPercentage) {
            if (downPaymentPercentage >= 20) return 0;
            if (downPaymentPercentage >= 15) return 2.80;
            if (downPaymentPercentage >= 10) return 3.10;
            if (downPaymentPercentage >= 5) return 4.00;
            return 0;
        },

        WELCOME_TAX_RATES: {
            montreal: [
                { limit: 61500, rate: 0.005 },
                { limit: 307800, rate: 0.01 },
                { limit: 552300, rate: 0.015 },
                { limit: 1104700, rate: 0.02 },
                { limit: 2136500, rate: 0.025 },
                { limit: 3113000, rate: 0.035 },
                { limit: Infinity, rate: 0.04 }
            ],
            longueuil: [
                { limit: 58900, rate: 0.005 },
                { limit: 294600, rate: 0.01 },
                { limit: 508699, rate: 0.015 },
                { limit: Infinity, rate: 0.03 }
            ],
            brossard: [
                { limit: 58900, rate: 0.005 },
                { limit: 294600, rate: 0.01 },
                { limit: 500000, rate: 0.015 },
                { limit: Infinity, rate: 0.03 }
            ]
        },

        calculateWelcomeTax(price, city) {
            if (!city) return 0;
            
            const rates = this.WELCOME_TAX_RATES[city];
            let tax = 0;
            let remainingPrice = price;
            let previousLimit = 0;

            for (const bracket of rates) {
                const bracketAmount = Math.min(Math.max(remainingPrice, 0), bracket.limit - previousLimit);
                tax += bracketAmount * bracket.rate;
                remainingPrice -= bracketAmount;
                previousLimit = bracket.limit;
                if (remainingPrice <= 0) break;
            }

            return tax;
        },

        calculateMonthlyPayment(principal, annualRate, years) {
            if (annualRate === 0) {
                // Si le taux est 0, simple division du principal par le nombre de mois
                return principal / (years * 12);
            }
            const monthlyRate = annualRate / 100 / 12;
            const numberOfPayments = years * 12;
            return principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments) 
                   / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
        },

        formatMoney(amount) {
            return new Intl.NumberFormat('fr-CA', {
                style: 'currency',
                currency: 'CAD'
            }).format(amount);
        },

        getWelcomeTaxExplanation(city) {
            const explanations = {
                montreal: `Calcul basé sur les taux de Montréal (2025):
    • 0,5% jusqu'à 61 500$
    • 1% de 61 500,01$ à 307 800$
    • 1,5% de 307 800,01$ à 552 300$
    • 2% de 552 300,01$ à 1 104 700$
    • 2,5% de 1 104 700,01$ à 2 136 500$
    • 3,5% de 2 136 500,01$ à 3 113 000$
    • 4% au-delà de 3 113 000$`,
                longueuil: `Calcul basé sur les taux de Longueuil:
    • 0,5% jusqu'à 58 900$
    • 1% de 58 900,01$ à 294 600$
    • 1,5% de 294 600,01$ à 508 699$
    • 3% au-delà de 508 699,01$`,
                brossard: `Calcul basé sur les taux de Brossard (2024):
    • 0,5% jusqu'à 58 900$
    • 1% de 58 900,01$ à 294 600$
    • 1,5% de 294 600,01$ à 500 000$
    • 3% au-delà de 500 000,01$`
            };
            return explanations[city] || 'Veuillez sélectionner une ville pour voir le détail des taux.';
        }
    };

    document.getElementById('calculate').addEventListener('click', function() {
        const price = parseFloat(document.getElementById('price').value) || 0;
        const downPayment = parseFloat(document.getElementById('downPayment').value) || 0;
        const interestRateInput = document.getElementById('interestRate').value;
        
        // Validation du format du taux d'intérêt
        if (interestRateInput.includes(',')) {
            alert('Veuillez utiliser un point (.) comme séparateur décimal pour le taux d\'intérêt');
            return;
        }
        
        const interestRate = parseFloat(interestRateInput) || 0;
        const amortization = parseInt(document.getElementById('amortization').value) || 25;
        const city = document.getElementById('city').value;

        // Validation des entrées
        if (price <= 0) {
            alert('Veuillez entrer un prix valide');
            return;
        }
        if (downPayment < 0 || downPayment >= price) {
            alert('La mise de fonds doit être entre 0$ et le prix de la propriété');
            return;
        }

        // Calculs de base
        const downPaymentPercentage = (downPayment / price) * 100;
        if (downPaymentPercentage < 5) {
            alert('La mise de fonds minimale doit être d\'au moins 5% du prix d\'achat');
            return;
        }

        const loanAmount = price - downPayment;
        const loanToValue = (loanAmount / price) * 100;
        
        // Prime SCHL
        const schlRate = calculator.calculateSCHLRate(downPaymentPercentage);
        const schlInsurance = schlRate ? (loanAmount * schlRate / 100) : 0;
        
        // Montant total du prêt (incluant la prime SCHL)
        const totalLoanAmount = loanAmount + schlInsurance;
        
        // Calcul des différents types de paiements
        const monthlyPayment = calculator.calculateMonthlyPayment(
            totalLoanAmount,
            interestRate,
            amortization
        );
        
        // Paiement aux deux semaines = paiement mensuel * 12 / 26
        const biweeklyPayment = (monthlyPayment * 12) / 26;

        // Taxe de bienvenue
        const welcomeTax = calculator.calculateWelcomeTax(price, city);

        // Calcul des frais de clôture
        const totalClosingCosts = downPayment + welcomeTax;

        // Affichage des résultats
        document.getElementById('loanAmount').textContent = calculator.formatMoney(loanAmount);
        document.getElementById('loanToValue').textContent = `${loanToValue.toFixed(1)}%`;
        document.getElementById('schlRate').textContent = `${schlRate}%`;
        document.getElementById('schlInsurance').textContent = calculator.formatMoney(schlInsurance);
        document.getElementById('monthlyPayment').textContent = calculator.formatMoney(monthlyPayment);
        document.getElementById('biweeklyPayment').textContent = calculator.formatMoney(biweeklyPayment);
        document.getElementById('welcomeTax').textContent = calculator.formatMoney(welcomeTax);
        document.getElementById('downPaymentPercentage').textContent = 
            `(${downPaymentPercentage.toFixed(2)}%)`;
        document.getElementById('totalLoanAmount').textContent = calculator.formatMoney(totalLoanAmount);
        document.getElementById('loanExplanation').textContent = 
            `Prix de la propriété (${calculator.formatMoney(price)}) - Mise de fonds (${calculator.formatMoney(downPayment)}) + Prime SCHL (${calculator.formatMoney(schlInsurance)})`;

        // Explications
        let schlExplanation = '';
        if (schlRate === 0) {
            schlExplanation = 'Aucune assurance SCHL requise car la mise de fonds est de 20% ou plus.';
        } else {
            schlExplanation = `Avec une mise de fonds de ${downPaymentPercentage.toFixed(1)}%, 
                le taux de la prime SCHL est de ${schlRate}% du montant du prêt.`;
        }
        document.getElementById('schlExplanation').textContent = schlExplanation;

        // Explication de la taxe de bienvenue
        document.getElementById('welcomeTaxExplanation').textContent = 
            calculator.getWelcomeTaxExplanation(city);

        // Affichage des sorties de fonds
        document.getElementById('closingDownPayment').textContent = calculator.formatMoney(downPayment);
        document.getElementById('closingWelcomeTax').textContent = calculator.formatMoney(welcomeTax);
        document.getElementById('totalClosingCosts').textContent = calculator.formatMoney(totalClosingCosts);

        // Affichage des faits et hypothèses
        document.getElementById('summaryPrice').textContent = calculator.formatMoney(price);
        document.getElementById('summaryDownPayment').textContent = 
            `${calculator.formatMoney(downPayment)} (${downPaymentPercentage.toFixed(1)}%)`;
        document.getElementById('summaryInterestRate').textContent = `${interestRate.toFixed(2)}%`;
        document.getElementById('summaryAmortization').textContent = `${amortization} ans`;
        document.getElementById('summaryCity').textContent = city.charAt(0).toUpperCase() + city.slice(1);
    });
}); 