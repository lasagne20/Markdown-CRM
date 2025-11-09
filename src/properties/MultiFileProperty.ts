
import { ObjectProperty } from "./ObjectProperty";
import { FileProperty } from "./FileProperty";
import { File } from "../vault/File";
import { Vault } from "../vault/Vault";

export class MultiFileProperty extends ObjectProperty {

    public override type : string = "multiFile";
    public classes: string[];
    public property : FileProperty;
    public override flexSpan = 2;


    constructor(name: string, vault: Vault, classes : string[], args = {}){
        super(name, vault, {}, args);
        this.classes = classes;
        this.property = new FileProperty(name, vault, classes, args);
    }

    override getClasses(): string[] {
        return this.classes;
    }

    override formatParentValue(value : string){
        return [value]
    }

    // Méthode principale pour obtenir l'affichage
    override fillDisplay(values: any, update: (value: any) => Promise<void>) {
        // Parser les valeurs si c'est une string JSON
        if (typeof values === 'string' && values.trim()) {
            try {
                console.log('📝 MultiFileProperty: Parsing de la string:', values);
                values = JSON.parse(values);
                console.log('✅ MultiFileProperty: Parsing réussi:', values);
            } catch (e) {
                console.error('❌ MultiFileProperty: Erreur de parsing:', e);
                // Si ce n'est pas du JSON, peut-être que c'est un tableau avec un seul élément
                if (values.startsWith('[[') && values.endsWith(']]')) {
                    // C'est probablement un lien unique, le transformer en tableau
                    values = [values];
                } else {
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
        container.classList.add("metadata-multiFiles-container-"+this.name.toLowerCase());
        container.classList.add("metadata-multiFiles-container");

        // Créer les lignes d'objet
        this.createObjects(values, update, container);

        const addButton = this.createAddButton(values, update, container);
        container.appendChild(addButton);

        return container;
    }

    override createObjects(values: any, update: (value: any) => Promise<void>, container: HTMLDivElement) {
        if (!values) return;
        
        console.log("MultiFileProperty - createObjects - values:", values, "type:", typeof values, "isArray:", Array.isArray(values));
        
        // S'assurer que values est un tableau
        if (!Array.isArray(values)) {
            console.warn('MultiFileProperty: values n\'est pas un tableau, type:', typeof values, 'valeur:', values);
            return;
        }
        
        values.forEach((objects: any, index: number) => {
            const row = this.createObjectRow(values, update, objects, index, container);
            container.appendChild(row);
        });
    }

    override createObjectRow(values: any, update: (value: any) => Promise<void>, value: any, index: number, container: HTMLDivElement): HTMLDivElement {
        const row = document.createElement("div");
        row.classList.add("metadata-multiFiles-row-inline");

        // Ajouter le bouton de suppression
        const deleteButton = this.createDeleteButton(values, update, index, container);
        row.appendChild(deleteButton);

        let propertyContainer = document.createElement("div");
        propertyContainer.classList.add("metadata-multiFiles-property-inline");
        // Correction: FileProperty.fillDisplay attend (value, update, args) et non (vault, value, update)
        propertyContainer.appendChild(this.property.fillDisplay(value, async (newValue : any) => await this.updateObject(values, update, index, this.property, newValue)));
        row.appendChild(propertyContainer);

        return row;
    }

    override createDeleteButton(values: any, update: (value: any) => Promise<void>, index: number, container: HTMLDivElement): HTMLButtonElement {
        const deleteButton = document.createElement("button");
        this.vault.app.setIcon(deleteButton, "x"); // Changer "minus" en "x"
        deleteButton.classList.add("metadata-delete-button-inline-small");
        deleteButton.onclick = async () => await this.removeProperty(values, update, index, container);
        return deleteButton;
    }

    override async addProperty(values: any, update: (value: any) => Promise<void>, container: HTMLDivElement) {
        console.log('📂 Début de sélection multiple, values actuelles:', values);
        const newFiles = await this.vault.app.selectMultipleFile(this.vault, this.classes, { hint: "Choisissez des fichiers " + this.getClasses().join(" ou ") });
        console.log('📂 Fichiers sélectionnés:', newFiles);
        
        if (newFiles && newFiles.length > 0) {
            // S'assurer que values est un tableau
            if (!Array.isArray(values)) {
                console.log('⚠️ values n\'est pas un tableau, initialisation à []');
                values = [];
            }
            
            newFiles.forEach((fileObj: any) => {
                const link = fileObj.getLink();
                console.log('📎 Ajout du lien:', link);
                values.push(link);
            });
            
            console.log('✅ Mise à jour avec:', values);
            await update(values);
            await this.reloadObjects(values, update);
        }
    }

    override createAddButton(values: any, update: (value: any) => Promise<void>, container: HTMLDivElement): HTMLButtonElement {
        const addButton = document.createElement("button");
        this.vault.app.setIcon(addButton, "plus");
        addButton.classList.add("metadata-add-button-inline-small");
        addButton.onclick = async () => await this.addProperty(values, update, container);
        return addButton;
    }

    override async reloadObjects(values: any, update: (value: any) => Promise<void>) {
        const container = document.querySelector(".metadata-multiFiles-container-" + this.name.toLowerCase()) as HTMLDivElement;
        if (container) {
            console.log('🔄 MultiFileProperty: Rechargement de l\'interface avec values:', values);
            container.innerHTML = "";
            
            // Recréer les lignes d'objets
            this.createObjects(values, update, container);
            
            // Recréer le bouton d'ajout
            const addButton = this.createAddButton(values, update, container);
            container.appendChild(addButton);
            
            console.log('✅ MultiFileProperty: Interface rechargée');
        } else {
            console.error('❌ MultiFileProperty: Container non trouvé pour reloadObjects');
        }
    }

    override enableDragAndDrop() {
        // Disable drag and drop
    }
}
