import { Property } from './Property.js';
export class ClasseProperty extends Property {
    // Used for property hidden for the user
    constructor(name, vault, icon = "") {
        super(name, vault, { icon: icon });
        this.type = "class";
    }
    fillDisplay(value, update) {
        const field = document.createElement("div");
        field.classList.add("metadata-field");
        const label = document.createElement("label");
        label.textContent = value;
        if (this.icon) {
            const icon = document.createElement("div");
            icon.classList.add("icon-container");
            this.vault.app.setIcon(icon, this.icon);
            field.appendChild(icon);
        }
        field.appendChild(label);
        return field;
    }
}
