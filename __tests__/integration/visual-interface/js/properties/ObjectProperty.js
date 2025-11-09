import { Property } from './Property.js';
import { FileProperty } from './FileProperty.js';
export class ObjectProperty extends Property {
    constructor(name, vault, properties, args = {}) {
        super(name, vault, args);
        this.type = "object";
        this.flexSpan = 2;
        this.appendFirst = false;
        this.allowMove = true;
        this.display = "object"; // Can be "object", "table" or "list"
        this.appendFirst = args?.appendFirst || false;
        this.properties = properties;
        this.allowMove = args?.allowMove || true;
        // Assign any additional arguments to the instance
        Object.assign(this, args);
    }
    getClasses() {
        for (let prop of Object.values(this.properties)) {
            if (prop instanceof FileProperty || prop instanceof ObjectProperty || prop.type == "multiFile") {
                return prop.getClasses();
            }
        }
        throw new Error("No class found");
    }
    // Used by the ClasseProperty to get the parent file
    getParentValue(values) {
        if (values && values.length) {
            for (let prop of Object.values(this.properties)) {
                if (prop instanceof FileProperty || prop instanceof ObjectProperty || prop.type == "multiFile") {
                    return prop.getParentValue(values[0][prop.name]);
                }
            }
        }
        return undefined;
    }
    async findValue(file, value, propertyName) {
        let values = await this.read(file);
        if (values && values.length) {
            for (let i = 0; i < values.length; i++) {
                for (let prop of Object.values(this.properties)) {
                    let propValue = values[i][prop.name];
                    if (propValue && (propValue == value || (typeof propValue === "string" && propValue.includes(value)))) {
                        return values[i][propertyName];
                    }
                }
            }
        }
        return null;
    }
    async getDisplayProperties(file, propertyClasseName, propertyName, isStatic = true) {
        let properties = [];
        this.vault = file.vault;
        let values = await this.read(file);
        if (!(propertyName in this.properties)) {
            throw new Error("Property " + propertyName + " not found in ObjectProperty " + this.name);
        }
        let property = this.properties[propertyName];
        if (values && values.length) {
            for (let [index, row] of values.entries()) {
                property.static = isStatic;
                let display = property.fillDisplay(row[property.name], async (value) => await this.updateObject(values, async (value) => await file.updateMetadata(this.name, value), index, property, value));
                let classe = this.vault.getFromLink(row[this.properties[propertyClasseName].name]);
                properties.push({ classe: classe, display: display });
            }
        }
        return properties;
    }
    formatParentValue(value) {
        let newObject = {};
        Object.values(this.properties).forEach(prop => {
            if (value && prop instanceof FileProperty || prop instanceof ObjectProperty || prop.type == "multiFile") {
                newObject[prop.name] = value;
                value = ""; // Only one parent
            }
            else {
                newObject[prop.name] = "";
            }
        });
        return [newObject];
    }
    async getDisplay(file, args) {
        this.display = args?.display || this.display;
        return super.getDisplay(file, args);
    }
    // Méthode principale pour obtenir l'affichage
    fillDisplay(values, update) {
        const container = document.createElement("div");
        container.classList.add("metadata-object-container-" + this.name.toLowerCase());
        // Créer l'en-tête
        this.createHeader(values, update, container);
        if (this.display == "table") {
            this.createTable(values, update, container);
        }
        else {
            // Affichage par défaut (objet)
            this.createObjects(values, update, container);
        }
        // Créer les lignes d'objet
        return container;
    }
    createTable(values, update, container) {
        // Créer un tableau pour les objets
        const tableWrapper = document.createElement("div");
        tableWrapper.style.position = "relative";
        container.appendChild(tableWrapper);
        let addButton = this.createAddButton(values, update, container);
        addButton.style.position = "absolute";
        addButton.style.top = "0";
        addButton.style.right = "0";
        tableWrapper.appendChild(addButton);
        const table = document.createElement("table");
        table.classList.add("metadata-object-table");
        tableWrapper.appendChild(table);
        // Créer l'en-tête du tableau
        const headerRow = document.createElement("tr");
        Object.values(this.properties).forEach(property => {
            const th = document.createElement("th");
            th.textContent = property.name;
            headerRow.appendChild(th);
        });
        // Ajouter une colonne pour le bouton de suppression
        const thDelete = document.createElement("th");
        headerRow.appendChild(thDelete);
        table.appendChild(headerRow);
        if (values && values.length) {
            // Créer les lignes d'objet
            values.forEach((objects, index) => {
                const row = document.createElement("tr");
                Object.values(this.properties).forEach(property => {
                    const td = document.createElement("td");
                    td.appendChild(property.fillDisplay(objects[property.name], async (value) => await this.updateObject(values, update, index, property, value)));
                    row.appendChild(td);
                });
                // Cellule pour le bouton de suppression
                const tdDelete = document.createElement("td");
                tdDelete.classList.add("metadata-object-delete-cell");
                const deleteButton = this.createDeleteButton(values, update, index, container);
                deleteButton.classList.add("metadata-object-delete-button");
                tdDelete.appendChild(deleteButton);
                row.appendChild(tdDelete);
                table.appendChild(row);
            });
        }
    }
    // Crée l'en-tête avec les propriétés
    createHeader(values, update, container) {
        const headerRow = document.createElement("div");
        headerRow.classList.add("metadata-object-header-row");
        let title = document.createElement("div");
        title.textContent = this.title ? this.title : this.name + " : ";
        title.classList.add("metadata-header");
        headerRow.appendChild(title);
        // Ajouter le bouton d'ajout
        const addButton = this.createAddButton(values, update, container);
        headerRow.appendChild(addButton);
        container.appendChild(headerRow);
    }
    // Crée le bouton d'ajout d'un nouvel objet
    createAddButton(values, update, container) {
        const addButton = document.createElement("button");
        this.vault.app.setIcon(addButton, "circle-plus");
        addButton.classList.add("metadata-add-button");
        addButton.onclick = async () => await this.addProperty(values, update, container);
        return addButton;
    }
    // Crée les objets et les lignes à afficher
    createObjects(values, update, container) {
        if (!values) {
            return;
        }
        values.forEach((objects, index) => {
            const row = this.createObjectRow(values, update, objects, index, container);
            container.appendChild(row);
        });
        if (this.allowMove) {
            this.enableDragAndDrop(values, update, container);
        }
    }
    // Crée une ligne d'objet avec ses propriétés
    createObjectRow(values, update, objects, index, container) {
        const row = document.createElement("div");
        row.classList.add("metadata-object-row");
        if (this.allowMove) {
            row.draggable = true;
            row.dataset.index = index.toString();
            row.style.cursor = "grab";
        }
        // Ajouter le bouton de suppression
        const deleteButton = this.createDeleteButton(values, update, index, container);
        deleteButton.style.position = "absolute";
        deleteButton.style.top = "0";
        deleteButton.style.right = "0";
        row.style.position = "relative";
        row.appendChild(deleteButton);
        Object.values(this.properties).forEach(property => {
            let value = objects[property.name];
            let propertyContainer = document.createElement("div");
            propertyContainer.classList.add("metadata-object-property");
            if (property.flexSpan) {
                propertyContainer.style.gridColumn = "span " + property.flexSpan;
            }
            const title = document.createElement("div");
            title.textContent = property.name;
            title.classList.add("metadata-title");
            propertyContainer.appendChild(title);
            propertyContainer.appendChild(property.fillDisplay(value, async (value) => await this.updateObject(values, update, index, property, value)));
            row.appendChild(propertyContainer);
        });
        return row;
    }
    // Crée un bouton de suppression pour une ligne d'objet
    createDeleteButton(values, update, index, container) {
        const deleteButton = document.createElement("button");
        this.vault.app.setIcon(deleteButton, "circle-minus");
        deleteButton.classList.add("metadata-delete-button");
        deleteButton.onclick = async () => await this.removeProperty(values, update, index, container);
        return deleteButton;
    }
    // Gère le glisser-déposer pour réordonner les objets
    enableDragAndDrop(values, update, container) {
        let draggedElement = null;
        let isEditing = false;
        // Lorsque l'utilisateur clique dans un champ d'édition (input), on active l'édition
        document.addEventListener("focus", (event) => {
            const input = event.target;
            if (input?.classList.contains('field-input')) {
                isEditing = true; // Le champ est en mode édition
            }
        }, true);
        // Lorsque l'utilisateur quitte un champ d'édition (blur), on désactive l'édition
        document.addEventListener("blur", (event) => {
            const input = event.target;
            if (input?.classList.contains('field-input')) {
                isEditing = false; // Le champ n'est plus en mode édition
            }
        }, true);
        container.addEventListener("dragstart", (event) => {
            if (isEditing) {
                event.preventDefault();
                return;
            }
            draggedElement = event.target;
            draggedElement.classList.add("dragging");
        });
        container.addEventListener("dragover", (event) => {
            event.preventDefault();
            const afterElement = this.getDragAfterElement(container, event.clientY);
            if (afterElement == null) {
                container.appendChild(draggedElement);
            }
            else {
                container.insertBefore(draggedElement, afterElement);
            }
        });
        container.addEventListener("dragend", async () => {
            if (!draggedElement)
                return;
            draggedElement.classList.remove("dragging");
            // Récupérer le nouvel ordre des éléments
            await this.updateOrder(values, update, container);
        });
    }
    // Trouver l'élément après lequel insérer (pour le Drag & Drop)
    getDragAfterElement(container, y) {
        const draggableElements = Array.from(container.querySelectorAll(".metadata-object-row:not(.dragging)"));
        const result = draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            return offset < 0 && offset > closest.offset ? { offset, element: child } : closest;
        }, { offset: Number.NEGATIVE_INFINITY, element: null });
        return result.element;
    }
    // Met à jour l'ordre des éléments après un glisser-déposer
    async updateOrder(values, update, container) {
        console.log("Update order");
        let newOrder = [];
        Array.from(container.querySelectorAll(".metadata-object-row")).forEach((row) => {
            // Assurer qu'on travaille avec un HTMLElement pour accéder à dataset
            if (row instanceof HTMLElement && row.dataset.index) {
                let index = parseInt(row.dataset.index);
                newOrder.push(values[index]);
            }
        });
        // Mettre à jour les métadonnées
        await update(newOrder);
        await this.reloadObjects(newOrder, update);
    }
    // Fonction pour supprimer un objet
    async removeProperty(values, update, index, container) {
        console.log("Remove index : ", index);
        values.splice(index, 1);
        await update(values);
        await this.reloadObjects(values, update);
    }
    // Fonction pour ajouter un objet
    async addProperty(values, update, container) {
        console.log("Add new");
        let newObject = {};
        for (let prop of Object.values(this.properties)) {
            let defaultValue = prop.getDefaultValue();
            console.log("Default value : ", defaultValue);
            if (Object.values(this.properties)[0] == prop && (prop instanceof FileProperty)) {
                prop.vault = this.vault; // Assurez-vous que vault est défini pour le premier FileProperty
                const fileProp = prop; // Cast pour accéder à handleIconClick
                defaultValue = await new Promise(async (resolve) => {
                    await fileProp.handleIconClick(async (value) => {
                        resolve(value);
                        console.log("Default value after click : ", value);
                    }, new MouseEvent("click"));
                });
            }
            console.log("Default value after click : ", defaultValue);
            if (defaultValue == "like-precedent") {
                if (values && values.length) {
                    if (this.appendFirst) {
                        defaultValue = values[0][prop.name];
                    }
                    else {
                        defaultValue = values[values.length - 1][prop.name];
                    }
                }
                else {
                    defaultValue = "";
                }
            }
            newObject[prop.name] = defaultValue;
        }
        ;
        // Valeurs par défaut
        if (!values) {
            values = [];
        }
        if (this.appendFirst) {
            values.unshift(newObject);
        }
        else {
            values.push(newObject);
        }
        await update(values);
        await this.reloadObjects(values, update);
    }
    // Mise à jour des métadonnées
    async updateObject(values, update, index, property, value) {
        console.log("Update index : ", index);
        if (values) {
            values[index][property.name] = value;
        }
        else {
            values = [{ [property.name]: value }];
        }
        console.log("Updated Values : ", values);
        await update(values);
        await this.reloadObjects(values, update);
    }
    // Recharge dynamiquement les objets
    async reloadObjects(values, update) {
        const container = document.querySelector(".metadata-object-container-" + this.name.toLowerCase());
        if (container) {
            container.innerHTML = "";
            // Recréer l'en-tête et les objets
            console.log("Values : ", values);
            this.createHeader(values, update, container);
            if (this.display == "table") {
                this.createTable(values, update, container);
            }
            else {
                // Affichage par défaut (objet)
                this.createObjects(values, update, container);
            }
        }
    }
}
