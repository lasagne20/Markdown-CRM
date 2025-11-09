import flatpickr from "flatpickr";
import { French } from "flatpickr/dist/l10n/fr.js";
import { Property } from "./Property";
import { Vault } from "../vault/Vault";

export class TimeProperty extends Property {
    override type: string = "time";
    private format: string;

    constructor(name: string, vault: Vault, args : {format?: string, icon? : string}= {format : "HH:mm"}) {
        super(name, vault, args);
        this.format = args.format || "HH:mm";

    }

    // Affiche le champ temps
    override fillDisplay(value: any, update: (value: any) => Promise<void>) {
        const container = document.createElement("div");
        container.classList.add("field-container");

        const link = this.createFieldLink(value);
        const input = this.createFieldTime(value, update, link);

        // Affichage initial
        if (value && this.validate(value)) {
            link.style.display = "block";
            input.style.display = "none";
        } else {
            input.style.display = "block";
            link.style.display = "none";
        }

        container.appendChild(link);
        container.appendChild(input);

        return container;
    }

    // Crée un input pour l'heure (hh:mm) avec flatpickr
    createFieldTime(value: string, update: (value: string) => Promise<void>, link: HTMLElement) {
        const input = document.createElement("input");
        input.type = "text";
        input.value = value || "";
        input.classList.add("field-input");

        flatpickr(input, {
            enableTime: true,
            noCalendar: true,
            dateFormat: "H:i",
            time_24hr: true,
            defaultDate: value || "",
            locale: French,
            onChange: async (selectedDates: Date[]) => {
                const selected = selectedDates[0];
                if (selected) {
                    input.value = this.formatTimeForStorage(selected);
                    await this.updateField(update, input, link);
                }
            },
            onClose: async () => {
                if (!this.validate(input.value)) input.value = "";
                await this.updateField(update, input, link);
            }
        });

        return input;
    }

    // Affiche l'heure ou un texte par défaut
    override createFieldLink(value: string) {
        const link = document.createElement("div");
        link.textContent = value ? this.formatTimeForDisplay(value) : "Aucune heure sélectionnée";
        link.classList.add("time-field-link", "field-link");
        link.style.cursor = "pointer";
        link.addEventListener("click", (event) => this.modifyField(event));
        return link;
    }

    // Formate l'heure pour l'affichage : "14:30"
    formatTimeForDisplay(time: string): string {
        if (this.format === "HH:mm") {
            return time || "Aucune heure sélectionnée";
        }
        if (!time) return "";
        const parts = time.split(":").map(Number);
        if (parts.length < 2) return time;
        const [h, m, s] = [parts[0], parts[1], parts[2] || 0];
        const result = [];
        if (h) result.push(`${h}h`);
        if (m) result.push(`${m} min`);
        if (s) result.push(`${s}s`);
        return result.length ? result.join(" ") : "0 min";
    }

    // Formate l'heure pour le stockage : "HH:mm"
    formatTimeForStorage(date: Date): string {
        return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false });
    }

    // Validation simple du format "HH:mm"
    override validate(value: string): string {
        if( /^\d{2}:\d{2}$/.test(value)){
            return value;
        }
        return "";
    }

    // Bascule entre input et affichage
    override async updateField(update: (value: string) => Promise<void>, input: HTMLInputElement, link: HTMLElement) {
        let value = this.validate(input.value) ? input.value : "";
        await update(value);
        if (value) {
            input.style.display = "none";
            link.textContent = this.formatTimeForDisplay(value);
            link.style.display = "block";
        } else {
            link.textContent = "Aucune heure sélectionnée";
        }
    }

    // Pour afficher l'input à la place du lien
    override modifyField(event: Event) {
        const link = event.currentTarget as HTMLElement;
        const container = link.parentElement;
        if (!container) return;
        const input = container.querySelector("input");
        if (input) {
            link.style.display = "none";
            input.style.display = "block";
            input.focus();
        }
    }
}
