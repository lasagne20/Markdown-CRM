// Use flatpickr from CDN (loaded in HTML as window.flatpickr)
const flatpickr = window.flatpickr || function(element, options = {}) {
    console.error('Flatpickr not loaded from CDN');
    return { destroy: () => {}, setDate: () => {}, config: options, element: element };
};
import { DateProperty } from './DateProperty.js';
export class RangeDateProperty extends DateProperty {
    constructor(name, vault, args = {}) {
        super(name, vault, [], args);
        this.type = "dateRange";
    }
    createFieldDate(value, update, link) {
        const input = document.createElement("input");
        input.type = "text";
        input.value = value || ""; // Formaté en "YYYY-MM-DD" pour le stockage
        input.classList.add("field-input");
        flatpickr(input, {
            dateFormat: "Y-m-d", // Stocker en "YYYY-MM-DD"
            defaultDate: value || "",
            locale: "fr", // Utilisation de la langue française pour l'affichage
            mode: "range", // Permet de sélectionner une plage de dates
            onChange: async (selectedDates) => {
                if (selectedDates.length === 2) {
                    const startDate = selectedDates[0];
                    const endDate = selectedDates[1];
                    if (startDate && endDate) {
                        // Met à jour la valeur de l'input avec le format "YYYY-MM-DD to YYYY-MM-DD"
                        if (startDate.getTime() === endDate.getTime()) {
                            input.value = this.formatDateForStorage(startDate);
                        }
                        else {
                            input.value = `${this.formatDateForStorage(startDate)} to ${this.formatDateForStorage(endDate)}`;
                        }
                        await this.updateField(update, input, link);
                    }
                }
            },
            onClose: async () => await this.updateField(update, input, link)
        });
        return input;
    }
    // Crée un lien qui affiche la plage de dates (au format "26 février 2025 au 28 février 2025")
    createFieldLink(value) {
        const link = document.createElement("div");
        link.textContent = value ? this.formatDateRangeForDisplay(value) : "Aucune date sélectionnée";
        link.classList.add("date-field-link");
        link.classList.add("field-link");
        link.style.cursor = "pointer";
        link.onclick = (event) => this.modifyField(event);
        return link;
    }
    // Formate la plage de dates pour l'affichage : "26 février 2025" ou "26 février 2025 au 28 février 2025"
    formatDateRangeForDisplay(dateRange) {
        const [startDate, endDate] = dateRange.split(" to ");
        const formattedStartDate = new Date(startDate).toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
        if (!endDate) {
            return `${formattedStartDate}`;
        }
        const formattedEndDate = new Date(endDate).toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
        return `${formattedStartDate} au ${formattedEndDate}`;
    }
    // Crée un conteneur pour afficher la plage de dates et la sélection rapide
    createFieldContainerContent(update, value) {
        const fieldContainer = document.createElement("div");
        fieldContainer.classList.add("field-container");
        fieldContainer.classList.add("metadata-field");
        const currentField = value;
        const link = this.createFieldLink(currentField);
        const input = this.createFieldDate(currentField, update, link);
        // Affichage initial : Si la plage de dates existe, afficher le lien
        if (currentField && this.validate(value)) {
            link.style.display = "block";
            input.style.display = "none";
        }
        else {
            input.style.display = "block";
            link.style.display = "none";
        }
        fieldContainer.appendChild(link);
        fieldContainer.appendChild(input);
        return fieldContainer;
    }
    // Met à jour la valeur de la plage de dates et bascule l'affichage entre le lien et l'input
    async updateField(update, input, link) {
        let value = this.validate(input.value);
        if (value) {
            await update(value); // Met à jour avec la plage de dates au format "YYYY-MM-DD to YYYY-MM-DD"
            input.style.display = "none";
            link.textContent = this.formatDateRangeForDisplay(value); // Affichage avec le mois en lettres
            link.style.display = "block";
        }
        else {
            await update(input.value);
        }
    }
    // Valide la plage de dates au format "YYYY-MM-DD to YYYY-MM-DD"
    validate(value) {
        const dateRangeRegex = /^\d{4}-\d{2}-\d{2}( to \d{4}-\d{2}-\d{2})?$/;
        return dateRangeRegex.test(value) ? value : "";
    }
    // Fonction pour extraire la première date d'une chaîne et la convertir en objet Date
    static extractFirstDate(dateStr) {
        // Regex pour trouver la première date (ex: "26 janvier 2025")
        const moisMap = {
            "janvier": 0, "fevrier": 1, "mars": 2, "avril": 3, "mai": 4, "juin": 5,
            "juillet": 6, "aout": 7, "septembre": 8, "octobre": 9, "novembre": 10, "décembre": 11
        };
        const regex = /(\d{1,2}) (\w+) (\d{4})/;
        const normalizedDateStr = dateStr.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove accents
        const match = normalizedDateStr.match(regex);
        if (match) {
            const [, day, month, year] = match;
            const moisIndex = moisMap[month.toLowerCase()];
            if (moisIndex !== undefined) {
                return new Date(parseInt(year), moisIndex, parseInt(day));
            }
        }
        return null;
    }
    ;
}
