import { FormulaProperty } from './FormulaProperty.js';
import { Property } from './Property.js';
export class NumberProperty extends Property {
    constructor(name, vault, unit = "", args = { icon: "", static: true }) {
        super(name, vault, args);
        this.unit = "";
        this.type = "number";
        this.formulaProperty = null;
        if (args.formula) {
            this.formulaProperty = new FormulaProperty(name, vault, args.formula, { icon: args.icon, static: args.static, write: true });
        }
        this.unit = unit;
    }
    validate(value) {
        // Handle null/undefined
        if (value == null) {
            return "";
        }
        // Convert to string if not already
        const stringValue = String(value);
        // Trim whitespace
        const trimmedValue = stringValue.trim();
        // Return empty string for empty or whitespace-only input
        if (!trimmedValue) {
            return "";
        }
        // Check if the entire string is a valid number (not just the beginning)
        const numberValue = parseFloat(trimmedValue);
        if (isNaN(numberValue)) {
            return "";
        }
        // Check if it's a valid number format (including scientific notation)
        if (!/^-?\d*\.?\d+(e[+-]?\d+)?$/i.test(trimmedValue) &&
            trimmedValue !== numberValue.toString()) {
            return "";
        }
        return numberValue.toString();
    }
    async getDisplay(file, args = { staticMode: false, title: "" }) {
        this.static = args.staticMode ? true : this.static;
        this.title = args.title ? args.title : "";
        let value = this.read(file);
        if (!value && this.formulaProperty) {
            value = this.formulaProperty.read(file);
        }
        return this.fillDisplay(value, async (value) => await file.updateMetadata(this.name, value));
    }
    fillDisplay(value, update) {
        const field = this.createFieldContainer();
        if (this.title) {
            const title = document.createElement("div");
            title.textContent = this.title;
            title.classList.add("metadata-title");
            field.appendChild(title);
        }
        const iconContainer = this.createIconContainer(update);
        const fieldContainer = this.createFieldContainerContent(update, value);
        field.appendChild(iconContainer);
        field.appendChild(fieldContainer);
        return field;
    }
    createFieldContainerContent(update, value) {
        const fieldContainer = document.createElement("div");
        fieldContainer.classList.add("field-container");
        const currentField = value;
        const input = this.createFieldInput(currentField);
        const link = this.createFieldLink(currentField);
        if (this.static) {
            link.style.display = "block";
            input.style.display = "none";
        }
        else {
            if (currentField && this.validate(value)) {
                link.style.display = "block";
                input.style.display = "none";
            }
            else {
                input.style.display = "block";
                link.style.display = "none";
            }
        }
        fieldContainer.appendChild(link);
        fieldContainer.appendChild(input);
        if (!this.static) {
            this.handleFieldInput(update, input, link);
        }
        return fieldContainer;
    }
    createFieldLink(value) {
        const link = document.createElement("div");
        link.textContent = value ? `${value} ${this.unit}` : "";
        link.classList.add("field-link");
        link.style.cursor = this.static ? "default" : "text";
        if (!this.static) {
            link.onclick = (event) => this.modifyField(event);
        }
        return link;
    }
    async updateField(update, input, link) {
        let value = input.value;
        if (value) {
            await update(value);
            input.style.display = "none";
            link.textContent = value ? `${value} ${this.unit}` : "";
            link.style.display = "block";
        }
        else {
            await update(input.value);
        }
    }
    createFieldInput(value) {
        const input = document.createElement("input");
        input.type = "number";
        input.value = value || "";
        input.classList.add("field-input");
        return input;
    }
}
