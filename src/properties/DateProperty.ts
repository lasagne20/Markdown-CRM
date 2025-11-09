import flatpickr from "flatpickr";
import { French } from "flatpickr/dist/l10n/fr";
import { Property } from "./Property";
import { Vault } from "../vault/Vault";

const iconMap : {[key: string] : string}= { 
    "yesterday" : "calendar-arrow-down",
    "today" : "calendar-check",
    "tomorrow" : "calendar-arrow-up",
    "next-week" : "calendar-clock"
}

export class DateProperty extends Property {

    private quickSelectIcons: string[];
    public override type : string = "date";

    constructor(name: string, vault: Vault, quickSelectIcons: string[], args = {}) {
        super(name, vault, args);
        this.quickSelectIcons = quickSelectIcons
        
    }


    // Crée l'affichage du champ date
    override fillDisplay(value : any, update: (value: string) => Promise<void>, args? : {}) {
        const fieldContainer = document.createElement("div");
        fieldContainer.classList.add("metadata-field");

        const iconContainer = this.createIconContainer(update);
        fieldContainer.appendChild(iconContainer);

        const field = document.createElement("div");
        field.classList.add("metadata-field");
        const dateContainer = this.createFieldContainerContent(update, value);
        field.appendChild(dateContainer);

        if (this.title) {
            const header = document.createElement("div");
            header.classList.add("metadata-header");
            header.textContent = this.name
            fieldContainer.appendChild(header);
        }
        
        fieldContainer.appendChild(field);

        return fieldContainer;
    }


    // Crée un champ d'input pour la date
    createFieldDate(value: string, update: (value: string) => Promise<void>, link: HTMLDivElement) {
        const input = document.createElement("input");
        input.type = "text";
        input.value = value || "";  // Formaté en "YYYY-MM-DD" pour le stockage
        input.classList.add("field-input");
    
        flatpickr(input, {
            dateFormat: "Y-m-d",  // Stocker en "YYYY-MM-DD"
            defaultDate: value || "",
            locale: French,
            onChange: async (selectedDates: Date[]) => {
                const selectedDate = selectedDates[0];
                if (selectedDate) {
                    // Met à jour la valeur de l'input avec le format "YYYY-MM-DD"
                    input.value = this.formatDateForStorage(selectedDate);
                    await this.updateField(update, input, link)
                }
            },
            onClose : async () => {
                input.value = ""
                await this.updateField(update, input, link)
            }
        });
        return input;
    }
    
    // Crée un lien qui affiche la date (au format "26 février 2025")
    override createFieldLink(value: string) {
        const link = document.createElement("div");
        link.textContent = value ? this.formatDateForDisplay(value) : "Aucune date sélectionnée";
        link.classList.add("date-field-link");
        link.classList.add("field-link");
        link.style.cursor = "pointer";
        link.onclick = (event) => this.modifyField(event);
        return link;
    }

    // Formate la date pour l'affichage : "26 février 2025"
    formatDateForDisplay(date: string): string {
        const parsedDate = new Date(date);
        return parsedDate.toLocaleDateString("fr-FR", { 
            day: "numeric", 
            month: "long", 
            year: "numeric" 
        });
    }

    // Formate la date pour le stockage : "YYYY-MM-DD"
    formatDateForStorage(date: Date): string {
        // Use toISOString to avoid timezone issues, then extract date part
        return date.toISOString().split('T')[0];
    }
    
    // Ajoute les options "Aujourd'hui", "Demain", "Semaine prochaine"
    createQuickSelect(value: string, update: (value: string) => Promise<void>, link: HTMLElement, input: HTMLInputElement) {
        const quickSelectContainer = document.createElement("div");
        quickSelectContainer.classList.add("quick-select-container");

        this.quickSelectIcons.forEach(option => {
            const button = document.createElement("button");
            this.vault.app.setIcon(button, iconMap[option]);
            
            button.addEventListener("click", async () => {
                const date = this.getDateForOption(option);  // Obtenir la date pour l'option choisie
                await update(this.formatDateForStorage(date));
                link.textContent = this.formatDateForDisplay(this.formatDateForStorage(date));
                link.style.display = "block";
                input.style.display = "none";
            }); 
    
            quickSelectContainer.appendChild(button);
        });

        return quickSelectContainer;
    }

    override getDefaultValue() {
        return this.formatDateForStorage(this.getDateForOption(this.default))
    }

    getDateForOption(option: string): Date {
        const today = new Date();
        switch(option) {
            case "yesterday": {
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                return yesterday;
            }
            case "today": return new Date(today);
            case "tomorrow": {
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);
                return tomorrow;
            }
            case "next-week": {
                const nextWeek = new Date(today);
                nextWeek.setDate(today.getDate() + 7);
                return nextWeek;
            }
            case "2-week": {
                const twoWeeks = new Date(today);
                twoWeeks.setDate(today.getDate() + 14);
                return twoWeeks;
            }
            default: return new Date(today);
        }
    }

    // Crée un conteneur pour afficher la date et la sélection rapide
    override createFieldContainerContent(update: (value: string) => Promise<void>, value: string): HTMLDivElement {
        const fieldContainer = document.createElement("div");
        fieldContainer.classList.add("field-container");
        fieldContainer.classList.add("metadata-field");

        const currentField = value;
        const link = this.createFieldLink(currentField);
        const input = this.createFieldDate(currentField, update, link);
        

        // Affichage initial : Si la date existe, afficher le lien
        if (currentField && this.validate(value)) {
            link.style.display = "block";
            input.style.display = "none";
        } else {
            input.style.display = "block";
            link.style.display = "none";
        }

        // Créer un conteneur avec les boutons de sélection rapide
        const quickSelectContainer = this.createQuickSelect(currentField, update, link, input);

        fieldContainer.appendChild(link);
        fieldContainer.appendChild(input);
        fieldContainer.appendChild(quickSelectContainer);
        

        return fieldContainer;
    }

    // Met à jour la valeur de la date et bascule l'affichage entre le lien et l'input
    override async updateField(update: (value: string) => Promise<void>, input: HTMLInputElement, link: HTMLElement) {
        let value = this.validate(input.value);
        if (value) {
            await update(value);  // Met à jour avec la date au format "YYYY-MM-DD"
            input.style.display = "none";
            link.textContent = this.formatDateForDisplay(value);  // Affichage avec le mois en lettres
            link.style.display = "block";
        } else {
            await update(input.value);
        }
    }


}
