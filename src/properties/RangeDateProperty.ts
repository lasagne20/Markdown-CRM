import flatpickr from "flatpickr";
import "flatpickr/dist/l10n/fr.js";
import { DateProperty } from "./DateProperty";
import { Vault } from "../vault/Vault";
import { PropertyNavigator } from "../utils/PropertyNavigator";


export class RangeDateProperty extends DateProperty {

    public override type : string = "dateRange";
    /**
     * Optional path this range is derived from (e.g. "animations.date").
     * When the path resolves to at least one valid date, the property value
     * becomes the "min to max" range of these dates and the display is
     * read-only. Otherwise the stored (manually entered) value is used.
     */
    public derivedFrom?: string;

    constructor(name: string, vault: Vault, args: {icon?: string, static?: boolean, aliases?: string[], tooltip?: string, derivedFrom?: string} = {}) {
        super(name, vault, [], args);
        this.derivedFrom = args.derivedFrom;
    }

    /**
     * Parse any date-ish value into [startTimestamp, endTimestamp].
     * Accepts Date objects (Obsidian metadata cache), timestamps (numbers),
     * "YYYY-MM-DD" strings and "YYYY-MM-DD to YYYY-MM-DD" range strings.
     * Returns null for anything unparsable.
     */
    static parseDateValue(value: any): [number, number] | null {
        if (value === null || value === undefined || value === '') {
            return null;
        }
        if (value instanceof Date) {
            return isNaN(value.getTime()) ? null : [value.getTime(), value.getTime()];
        }
        if (typeof value === 'number') {
            return [value, value];
        }
        if (typeof value === 'string') {
            if (value.includes(' to ')) {
                const [startStr, endStr] = value.split(' to ');
                const start = new Date(startStr);
                const end = new Date(endStr);
                if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                    return null;
                }
                return [start.getTime(), end.getTime()];
            }
            const date = new Date(value);
            return isNaN(date.getTime()) ? null : [date.getTime(), date.getTime()];
        }
        return null;
    }

    /**
     * Format a timestamp as "YYYY-MM-DD" (UTC, consistent with the storage format)
     */
    static formatTimestamp(timestamp: number): string {
        const d = new Date(timestamp);
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Resolve the derived range from the configured path.
     * Returns "YYYY-MM-DD", "YYYY-MM-DD to YYYY-MM-DD" or null when the
     * path resolves to no valid date (fallback to the stored value).
     */
    private async resolveDerivedRange(classe: any): Promise<string | null> {
        if (!this.derivedFrom || !classe) {
            return null;
        }
        try {
            const navigator = new PropertyNavigator(this.vault, classe);
            const values = await navigator.collectNestedProperty(classe, this.derivedFrom);
            const timestamps: number[] = [];
            for (const value of (values ?? [])) {
                const parsed = RangeDateProperty.parseDateValue(value);
                if (parsed) {
                    timestamps.push(parsed[0], parsed[1]);
                }
            }
            if (timestamps.length === 0) {
                return null;
            }
            const min = Math.min(...timestamps);
            const max = Math.max(...timestamps);
            if (min === max) {
                return RangeDateProperty.formatTimestamp(min);
            }
            return `${RangeDateProperty.formatTimestamp(min)} to ${RangeDateProperty.formatTimestamp(max)}`;
        } catch (error) {
            console.warn(`RangeDateProperty: error resolving derived range for "${this.name}" from "${this.derivedFrom}":`, error);
            return null;
        }
    }

    /**
     * Derived range when the path resolves, otherwise the stored value
     */
    override async read(classe: any): Promise<any> {
        const derived = await this.resolveDerivedRange(classe);
        if (derived !== null) {
            return derived;
        }
        return await super.read(classe);
    }

    /**
     * When the range is derived, render read-only (the value cannot be edited
     * while animations define it). Otherwise render the normal editable field.
     */
    override async getDisplay(classe: any, args : {staticMode? : boolean, title?: string, displayMode?: string} = {staticMode : false, title:""}) {
        if (this.derivedFrom) {
            const derived = await this.resolveDerivedRange(classe);
            if (derived) {
                const originalStatic = this.static;
                this.static = true;
                try {
                    return await super.getDisplay(classe, args);
                } finally {
                    this.static = originalStatic;
                }
            }
        }
        return await super.getDisplay(classe, args);
    }

    override createFieldDate(value: string, update: (value: string) => Promise<void>, link: HTMLDivElement) {
        const input = document.createElement("input");
        input.type = "text";
        input.value = value || "";  // Formaté en "YYYY-MM-DD" pour le stockage
        input.classList.add("field-input");
    
        flatpickr(input, {
            dateFormat: "Y-m-d",  // Stocker en "YYYY-MM-DD"
            defaultDate: value || "",
            locale: "fr",  // Utilisation de la langue française pour l'affichage
            mode: "range",  // Permet de sélectionner une plage de dates
            onChange: async (selectedDates: Date[]) => {
                if (selectedDates.length === 2) {
                    const startDate = selectedDates[0];
                    const endDate = selectedDates[1];
                    if (startDate && endDate) {
                        // Met à jour la valeur de l'input avec le format "YYYY-MM-DD to YYYY-MM-DD"
                        if (startDate.getTime() === endDate.getTime()) {
                            input.value = this.formatDateForStorage(startDate);
                        } else {
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
    override createFieldLink(value: string) {
        const link = document.createElement("div");
        link.textContent = value ? this.formatDateRangeForDisplay(value) : "Aucune date sélectionnée";
        link.classList.add("date-field-link");
        link.classList.add("field-link");
        // Capture l'état au RENDU : la plage dérivée met static = true
        // seulement pendant getDisplay (restauré ensuite), un garde au
        // moment du clic serait donc contourné.
        const isStatic = this.static;
        if (isStatic) {
            link.style.cursor = "default";
        } else {
            link.style.cursor = "pointer";
            link.onclick = (event) => this.modifyField(event);
        }
        return link;
    }

    // Formate la plage de dates pour l'affichage : "26 février 2025" ou "26 février 2025 au 28 février 2025"
    formatDateRangeForDisplay(dateRange: string): string {
        // Vérifier que dateRange est une chaîne
        if (!dateRange || typeof dateRange !== 'string') {
            return "Aucune date sélectionnée";
        }
        
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
    override createFieldContainerContent(update: (value: string) => Promise<void>, value: string): HTMLDivElement {
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
        } else {
            input.style.display = "block";
            link.style.display = "none";
        }

        fieldContainer.appendChild(link);
        fieldContainer.appendChild(input);

        return fieldContainer;
    }

    // Met à jour la valeur de la plage de dates et bascule l'affichage entre le lien et l'input
    override async updateField(update: (value: string) => Promise<void>, input: HTMLInputElement, link: HTMLElement) {
        let value = this.validate(input.value);
        if (value) {
            await update(value);  // Met à jour avec la plage de dates au format "YYYY-MM-DD to YYYY-MM-DD"
            input.style.display = "none";
            link.textContent = this.formatDateRangeForDisplay(value);  // Affichage avec le mois en lettres
            link.style.display = "block";
        } else {
            await update(input.value);
        }
    }

    // Valide la plage de dates au format "YYYY-MM-DD to YYYY-MM-DD" ou "YYYY-MM-DD/YYYY-MM-DD"
    override validate(value: string): string {
        const dateRangeRegex = /^\d{4}-\d{2}-\d{2}(( to |\/)\d{4}-\d{2}-\d{2})?$/;
        return dateRangeRegex.test(value) ? value : "";
    }

    /**
     * Extract the start date from a daterange value
     * Supports both "YYYY-MM-DD/YYYY-MM-DD" and "YYYY-MM-DD to YYYY-MM-DD" formats
     * Returns only the first date if it's a range, otherwise returns the value as is
     */
    public static extractStartDateFromRange(value: string): string {
        if (!value || typeof value !== 'string') {
            return value;
        }

        // Check for "/" separator (YYYY-MM-DD/YYYY-MM-DD)
        if (value.includes('/') && /^\d{4}-\d{2}-\d{2}\/\d{4}-\d{2}-\d{2}$/.test(value)) {
            return value.split('/')[0];
        }

        // Check for " to " separator (YYYY-MM-DD to YYYY-MM-DD)
        if (value.includes(' to ') && /^\d{4}-\d{2}-\d{2} to \d{4}-\d{2}-\d{2}$/.test(value)) {
            return value.split(' to ')[0];
        }

        return value;
    }

    // Fonction pour extraire la première date d'une chaîne et la convertir en objet Date
    public static extractFirstDate (dateStr: string): Date | null {
    // Regex pour trouver la première date (ex: "26 janvier 2025")
    const moisMap: { [key: string]: number } = {
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
    };
}
