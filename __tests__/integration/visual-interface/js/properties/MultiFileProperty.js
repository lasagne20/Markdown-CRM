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
        // Parser les valeurs si c'est une string JSON
        if (typeof values === 'string' && values.trim()) {
            try {
                console.log('📝 MultiFileProperty: Parsing de la string:', values);
                values = JSON.parse(values);
                console.log('✅ MultiFileProperty: Parsing réussi:', values);
            }
            catch (e) {
                console.error('❌ MultiFileProperty: Erreur de parsing:', e);
                // Si ce n'est pas du JSON, peut-être que c'est un tableau avec un seul élément
                if (values.startsWith('[[') && values.endsWith(']]')) {
                    // C'est probablement un lien unique, le transformer en tableau
                    values = [values];
                }
                else {
                    values = [];
                }
            }
        }
        // S'assurer que values est un tableau
        if (!Array.isArray(values)) {
            console.warn('⚠️ MultiFileProperty: values n\'est pas un tableau après parsing:', values);
            values = values ? [values] : [];
        }
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
        console.log("MultiFileProperty - createObjects - values:", values, "type:", typeof values, "isArray:", Array.isArray(values));
        // S'assurer que values est un tableau
        if (!Array.isArray(values)) {
            console.warn('MultiFileProperty: values n\'est pas un tableau, type:', typeof values, 'valeur:', values);
            return;
        }
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
        // Correction: FileProperty.fillDisplay attend (value, update, args) et non (vault, value, update)
        propertyContainer.appendChild(this.property.fillDisplay(value, async (newValue) => await this.updateObject(values, update, index, this.property, newValue)));
        row.appendChild(propertyContainer);
        return row;
    }
    createDeleteButton(values, update, index, container) {
        const deleteButton = document.createElement("button");
        this.vault.app.setIcon(deleteButton, "x"); // Changer "minus" en "x"
        deleteButton.classList.add("metadata-delete-button-inline-small");
        deleteButton.onclick = async () => await this.removeProperty(values, update, index, container);
        return deleteButton;
    }
    async addProperty(values, update, container) {
        console.log('📂 Début de sélection multiple, values actuelles:', values);
        const newFiles = await this.vault.app.selectMultipleFile(this.vault, this.classes, { hint: "Choisissez des fichiers " + this.getClasses().join(" ou ") });
        console.log('📂 Fichiers sélectionnés:', newFiles);
        if (newFiles && newFiles.length > 0) {
            // S'assurer que values est un tableau
            if (!Array.isArray(values)) {
                console.log('⚠️ values n\'est pas un tableau, initialisation à []');
                values = [];
            }
            newFiles.forEach((fileObj) => {
                const link = fileObj.getLink();
                console.log('📎 Ajout du lien:', link);
                values.push(link);
            });
            console.log('✅ Mise à jour avec:', values);
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
    async reloadObjects(values, update) {
        const container = document.querySelector(".metadata-multiFiles-container-" + this.name.toLowerCase());
        if (container) {
            console.log('🔄 MultiFileProperty: Rechargement de l\'interface avec values:', values);
            container.innerHTML = "";
            // Recréer les lignes d'objets
            this.createObjects(values, update, container);
            // Recréer le bouton d'ajout
            const addButton = this.createAddButton(values, update, container);
            container.appendChild(addButton);
            console.log('✅ MultiFileProperty: Interface rechargée');
        }
        else {
            console.error('❌ MultiFileProperty: Container non trouvé pour reloadObjects');
        }
    }
    enableDragAndDrop() {
        // Disable drag and drop
    }
}
