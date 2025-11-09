import { Property } from './Property.js';
export class MultiSelectProperty extends Property {
    constructor(name, vault, options, args = {}) {
        super(name, vault, args);
        this.type = "multiSelect";
        this.options = options;
    }
    fillDisplay(value, update, args) {
        const field = this.createFieldContainer();
        const fieldContainer = document.createElement("div");
        fieldContainer.classList.add("field-container-column");
        const header = document.createElement("div");
        header.classList.add("metadata-header");
        header.textContent = this.name;
        fieldContainer.appendChild(header);
        const buttonContainer = this.createButtonGroup(value, update);
        fieldContainer.appendChild(buttonContainer);
        field.appendChild(fieldContainer);
        return field;
    }
    getDefaultValue() {
        for (let index in this.default) {
            if (this.default[index] == "personalName") {
                this.default[index] = this.vault.getPersonalName();
            }
        }
        return this.default;
    }
    // Crée le conteneur des boutons avec les options
    createButtonGroup(value, update) {
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
                }
                else {
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
    updateButtonState(container, selectedValues) {
        const buttons = container.querySelectorAll(".multi-select-button");
        buttons.forEach(button => {
            if (selectedValues.has(button.textContent || "")) {
                button.classList.add("selected");
            }
            else {
                button.classList.remove("selected");
            }
        });
    }
}
