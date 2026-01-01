import { File } from "../vault/File";
import { Property } from "./Property";
import { Vault } from "../vault/Vault";

export class SelectProperty extends Property {
    public options: {name : string, color : string, aliases?: string[]}[];
    public override type : string = "select";

    constructor(name: string, vault: Vault, options: {name : string, color : string, aliases?: string[]}[], args : {icon?: string, static?: boolean, aliases?: string[], tooltip?: string} = {}) {
        super(name, vault, args);
        this.options = options;
    }

    /**
     * Normalize a value from an alias to its canonical name
     * @param value The value to normalize (could be an alias)
     * @returns The canonical name if an alias matches, otherwise the original value
     */
    private normalizeValue(value: any): any {
        if (!value || typeof value !== 'string') {
            return value;
        }
        
        // Check if the value is already a canonical name
        const directMatch = this.options.find(opt => opt.name === value);
        if (directMatch) {
            return value;
        }
        
        // Check if the value is an alias
        for (const option of this.options) {
            if (option.aliases && option.aliases.includes(value)) {
                return option.name;
            }
        }
        
        // Return original value if no match found
        return value;
    }

    /**
     * Override read method to normalize aliases
     */
    override async read(classe: any): Promise<any> {
        const value = await super.read(classe);
        return this.normalizeValue(value);
    }

    /**
     * Determine if a color is light or dark
     * @param color The color in any CSS format (hex, rgb, named color)
     * @returns true if the color is light, false if dark
     */
    private isLightColor(color: string): boolean {
        // Create a temporary element to get the computed RGB value
        const temp = document.createElement('div');
        temp.style.color = color;
        document.body.appendChild(temp);
        const computedColor = window.getComputedStyle(temp).color;
        document.body.removeChild(temp);

        // Extract RGB values
        const rgb = computedColor.match(/\d+/g);
        if (!rgb || rgb.length < 3) {
            return true; // Default to light if we can't parse
        }

        const r = parseInt(rgb[0]);
        const g = parseInt(rgb[1]);
        const b = parseInt(rgb[2]);

        // Calculate relative luminance using the formula from WCAG
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        // Return true if luminance is greater than 0.5 (light color)
        return luminance > 0.5;
    }

    override fillDisplay(value : any, update: (value: string) => Promise<void>) {
        const field = this.createFieldContainer();

        if (this.title) {
            const title = document.createElement("div");
            title.textContent = this.title;
            title.classList.add("metadata-title");
            field.appendChild(title);
        }

        const contentRow = document.createElement("div");
        contentRow.style.display = "flex";
        contentRow.style.alignItems = "center";
        contentRow.style.gap = "4px";

        const iconContainer = this.createIconContainer(update);
        contentRow.appendChild(iconContainer);

        const selectElement = this.createSelectWidget(value, update);
        contentRow.appendChild(selectElement);

        field.appendChild(contentRow);

        return field;
    }

    // Crée le widget de sélection avec une liste déroulante
    createSelectWidget(value: string, update: (value: string) => Promise<void>): HTMLSelectElement {
        const selectElement = document.createElement("select");
        selectElement.classList.add("select-dropdown");
        // Appliquer la couleur de l'option sélectionnée
        if (value) {
            const selectedOption = this.options.find(option => option.name === value);
            if (selectedOption) {
                selectElement.style.backgroundColor = selectedOption.color;
                selectElement.style.color = this.isLightColor(selectedOption.color) ? '#000000' : '#ffffff';
            }
        }
        else {
            if (this.options.length > 0) {
                selectElement.style.backgroundColor = this.options[0].color;
                selectElement.style.color = this.isLightColor(this.options[0].color) ? '#000000' : '#ffffff';
                // Met à jour avec la première valeur de la liste
                update(this.options[0].name);
            }
        }

        // Ajouter les options de la liste
        this.options.forEach(option => {
            const optionElement = document.createElement("option");
            optionElement.classList.add("select-dropdown-option")
            optionElement.value = option.name;
            optionElement.textContent = option.name;
            optionElement.style.backgroundColor = option.color;
            optionElement.style.color = this.isLightColor(option.color) ? '#000000' : '#ffffff';


            // Si la valeur est déjà sélectionnée, l'option sera sélectionnée
            if (option.name === value) {
                optionElement.selected = true;
            }

            selectElement.appendChild(optionElement);
        });


        // Gérer le changement de valeur
        selectElement.onchange = async (event) => {
            const selectedValue = (event.target as HTMLSelectElement).value;
            // Met à jour la couleur de l'option sélectionnée
            const selectedOption = this.options.find(option => option.name === selectedValue);
            if (selectedOption) {
                selectElement.style.color = this.isLightColor(selectedOption.color) ? '#000000' : '#ffffff';
                selectElement.style.backgroundColor = selectedOption.color;
            }
            await update(selectedValue);
        };

        // Bloquer l'affichage de la liste si this.static est faux
        if (this.static) {
            selectElement.disabled = true;
        }

        return selectElement;
    }
}
