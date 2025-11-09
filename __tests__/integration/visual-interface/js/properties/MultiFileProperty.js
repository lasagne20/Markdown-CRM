import { ObjectProperty } from './ObjectProperty.js';
import { FileProperty } from './FileProperty.js';
export class MultiFileProperty extends ObjectProperty {
    constructor(name, vault, classes, args = {}) {
        super(name, vault, {}, args);
        this.type = "multiFile";
        this.flexSpan = 2;
        this.classes = classes;
        this.property = new FileProperty(name, vault, classes, args);
    }
    getClasses() {
        return this.classes;
    }
    formatParentValue(value) {
        return [value];
    }
    // Méthode principale pour obtenir l'affichage
    fillDisplay(values, update) {
        const container = document.createElement("div");
        container.classList.add("metadata-multiFiles-container-" + this.name.toLowerCase());
        container.classList.add("metadata-multiFiles-container");
        // Créer les lignes d'objet
        this.createObjects(values, update, container);
        const addButton = this.createAddButton(values, update, container);
        container.appendChild(addButton);
        return container;
    }
    createObjects(values, update, container) {
        if (!values)
            return;
        values.forEach((objects, index) => {
            const row = this.createObjectRow(values, update, objects, index, container);
            container.appendChild(row);
        });
    }
    createObjectRow(values, update, value, index, container) {
        const row = document.createElement("div");
        row.classList.add("metadata-multiFiles-row-inline");
        // Ajouter le bouton de suppression
        const deleteButton = this.createDeleteButton(values, update, index, container);
        row.appendChild(deleteButton);
        let propertyContainer = document.createElement("div");
        propertyContainer.classList.add("metadata-multiFiles-property-inline");
        propertyContainer.appendChild(this.property.fillDisplay(this.vault, value, async (value) => await this.updateObject(values, update, index, this.property, value)));
        row.appendChild(propertyContainer);
        return row;
    }
    createDeleteButton(values, update, index, container) {
        const deleteButton = document.createElement("button");
        this.vault.app.setIcon(deleteButton, "minus");
        deleteButton.classList.add("metadata-delete-button-inline-small");
        deleteButton.onclick = async () => await this.removeProperty(values, update, index, container);
        return deleteButton;
    }
    async addProperty(values, update, container) {
        const newFiles = await this.vault.app.selectMultipleFile(this.vault, this.classes, { hint: "Choisissez des fichiers " + this.getClasses().join(" ou ") });
        if (newFiles && newFiles.length > 0) {
            if (!values) {
                values = [];
            }
            newFiles.forEach((file) => {
                values.push(file.getLink());
            });
            await update(values);
            await this.reloadObjects(values, update);
        }
    }
    createAddButton(values, update, container) {
        const addButton = document.createElement("button");
        this.vault.app.setIcon(addButton, "plus");
        addButton.classList.add("metadata-add-button-inline-small");
        addButton.onclick = async () => await this.addProperty(values, update, container);
        return addButton;
    }
    enableDragAndDrop() {
        // Disable drag and drop
    }
}
