import { Property } from "./Property";
import { Vault } from "../vault/Vault";

export class MultiSelectProperty extends Property {
    public options: {name : string, color : string, aliases?: string[]}[];
    public override type : string = "multiSelect";

    constructor(name: string, vault : Vault, options: {name : string, color : string, aliases?: string[]}[], args: {icon?: string, aliases?: string[], tooltip?: string} = {}) {
        super(name, vault, args);
        this.options = options;
    }

    /**
     * Normalize a value from an alias to its canonical name
     * @param value The value to normalize (could be an alias)
     * @returns The canonical name if an alias matches, otherwise the original value
     */
    private normalizeValue(value: string): string {
        if (!value) {
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
     * Override read method to normalize aliases and deduplicate
     */
    override async read(classe: any): Promise<any> {
        const values = await super.read(classe);
        
        if (!Array.isArray(values)) {
            return values;
        }
        
        // Normalize all values and remove duplicates
        const normalized = values.map(v => this.normalizeValue(v));
        return [...new Set(normalized)];
    }

    override fillDisplay(value : any, update: (value: string[]) => Promise<void>, args? : {}) {
        const field = this.createFieldContainer();
        const fieldContainer = document.createElement("div");
        fieldContainer.classList.add("field-container-column");

        const header = document.createElement("div");
        header.classList.add("metadata-header");
        header.textContent = this.name
        fieldContainer.appendChild(header);

        const buttonContainer = this.createButtonGroup(value, update);
        fieldContainer.appendChild(buttonContainer);
        field.appendChild(fieldContainer);

        return field;
    }

    override getDefaultValue(){
        for (let index in this.default){
            if (this.default[index] == "personalName"){
                this.default[index] = this.vault.getPersonalName();
            }
        }
        
        return this.default;
    }

    // Crée le conteneur des boutons avec les options
    createButtonGroup(value: string[], update: (value: string[]) => Promise<void>): HTMLDivElement {
        const buttonContainer = document.createElement("div");
        buttonContainer.classList.add("multi-select-container");

        // S'assurer que value est un tableau
        const valueArray = Array.isArray(value) ? value : (value ? [value] : []);
        const selectedValues = new Set(valueArray); 

        this.options.forEach(option => {
            const button = document.createElement("button");
            button.classList.add("multi-select-button");
            button.textContent = option.name;

            if (selectedValues.has(option.name)) {
                button.classList.add("selected");
            }

            button.onclick = async () => {
                if (selectedValues.has(option.name)) {
                    selectedValues.delete(option.name);
                } else {
                    selectedValues.add(option.name);
                }

                await update([...selectedValues]);
                this.updateButtonState(buttonContainer, selectedValues);
            };

            buttonContainer.appendChild(button);
        });

        return buttonContainer;
    }

    // Met à jour l'affichage des boutons après sélection
    updateButtonState(container: HTMLElement, selectedValues: Set<string>) {
        const buttons = container.querySelectorAll(".multi-select-button");
        buttons.forEach(button => {
            if (selectedValues.has(button.textContent || "")) {
                button.classList.add("selected");
            } else {
                button.classList.remove("selected");
            }
        });
    }
}
