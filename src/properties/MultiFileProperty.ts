
import { ObjectProperty } from "./ObjectProperty";
import { FileProperty } from "./FileProperty";
import { File } from "../vault/File";
import { Vault } from "../vault/Vault";
import { Classe } from "../vault/Classe";
import { Condition } from "../Config/ConditionManager";

export class MultiFileProperty extends ObjectProperty {

    public override type : string = "multiFile";
    public classes: string[];
    public property : FileProperty;
    public override flexSpan = 2;
    public conditions?: Condition[];


    constructor(name: string, vault: Vault, classes : string[], args: {icon?: string, aliases?: string[], tooltip?: string, conditions?: Condition[]} = {}){
        super(name, vault, {}, args);
        this.classes = classes;
        this.conditions = args.conditions;
        // Créer le FileProperty sans titre pour éviter la duplication
        const filePropertyArgs = {...args};
        delete filePropertyArgs.icon; // Pas besoin de l'icône dans FileProperty
        this.property = new FileProperty(name, vault, classes, filePropertyArgs);
        this.property.title = ""; // Pas de titre pour les éléments individuels
    }

    /**
     * Validate file links for this MultiFileProperty using FileProperty's logic
     */
    override async validateFileLinks(currentValue: any): Promise<any> {
        if (!currentValue) return null;

        let valuesToProcess = [];
        let formatChanged = false;
        
        // Handle both arrays and single values
        if (Array.isArray(currentValue)) {
            valuesToProcess = currentValue;
        } else {
            valuesToProcess = [currentValue];
            formatChanged = true; // Single value converted to array
        }

        const validatedFiles = [];
        let hasChanges = formatChanged; // Start with format change status

        for (const fileLink of valuesToProcess) {
            // Use FileProperty's centralized validation logic
            const result = await FileProperty.validateSingleFileLink(this.vault, fileLink);
            
            if (!result) {
                validatedFiles.push(fileLink);
            } else {
                // File exists but link was updated
                validatedFiles.push(result);
                hasChanges = true;
            }
        }

        // Return updated value only if there were changes
        return hasChanges ? validatedFiles : null;
    }

    override getClasses(): string[] {
        return this.classes;
    }

    override formatParentValue(value : string){
        return [value]
    }

    /**
     * Extract the parent File from a MultiFileProperty value
     * Takes the first element from the array
     * @param value The property value (can be array or JSON string)
     * @returns The File instance if found, undefined otherwise
     */
    override async getParentFile(value: any): Promise<File | undefined> {
        if (!value) {
            return undefined;
        }

        // Parse JSON string if needed
        let values = value;
        if (typeof values === 'string') {
            try {
                values = JSON.parse(values);
            } catch (e) {
                values = [values];
            }
        }

        // Take the first link from the array
        if (Array.isArray(values) && values.length > 0) {
            const firstLink = values[0];
            return await this.property.getParentFile(firstLink);
        }

        return undefined;
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
        container.classList.add("metadata-multiFiles-container");
        container.classList.add("metadata-multiFiles-container-" + this.name.toLowerCase().replace(/\s+/g, '-'));

        // Créer les lignes d'objet
        this.createObjects(values, update, container);

        // Ajouter le bouton d'ajout à la fin
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

    override async addProperty(values: any, update: (value: any) => Promise<void>, container: HTMLDivElement, currentDocument?: Classe) {
        console.log('📂 Début de sélection multiple, values actuelles:', values);
        // Get extended classes (includes classes that inherit from the specified ones)
        const classesToSelect = await this.vault.getExtendedClasses(this.classes);
        
        // Create validation function from conditions if they exist
        const validationFunction = this.conditions && this.conditions.length > 0
            ? this.vault.conditionManager.createValidationFunction(this.conditions, currentDocument)
            : undefined;
        
        const newFiles = await this.vault.app.selectMultipleFile(this.vault, classesToSelect, { 
            hint: "Choisissez des fichiers " + this.getClasses().join(" ou "),
            validationFunction: validationFunction
        });
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
            
            // FIX: Appeler update ET attendre qu'il se termine avant de reloadObjects
            // Cela garantit que les valeurs sont persistées avant le refresh
            await update(values);
            
            // FIX: S'assurer que le container passé est bien celui que nous voulons rafraîchir
            // En passant explicitement le container, on évite le problème de querySelector
            // qui pourrait trouver le mauvais container s'il y en a plusieurs avec la même classe
            await this.reloadObjects(values, update, container);
        }
    }

    override createAddButton(values: any, update: (value: any) => Promise<void>, container: HTMLDivElement): HTMLButtonElement {
        const addButton = document.createElement("button");
        this.vault.app.setIcon(addButton, "plus");
        addButton.classList.add("metadata-add-button-inline-small");
        addButton.onclick = async () => await this.addProperty(values, update, container);
        return addButton;
    }

    override async reloadObjects(values: any, update: (value: any) => Promise<void>, specificContainer?: HTMLDivElement) {
        // Si un container spécifique est fourni (cas d'utilisation dans ObjectProperty), l'utiliser
        // Sinon, chercher le container via querySelector (comportement legacy)
        const container = specificContainer || 
            document.querySelector(".metadata-multiFiles-container-" + this.name.toLowerCase()) as HTMLDivElement;
            
        if (container) {
            console.log('🔄 MultiFileProperty: Rechargement de l\'interface avec values:', values);
            console.log('🔄 Container utilisé:', specificContainer ? 'specificContainer (passed)' : 'querySelector');
            
            // Garder l'en-tête, supprimer uniquement les lignes d'objets
            const objectRows = container.querySelectorAll('.metadata-multiFiles-row-inline');
            console.log('🔄 Nombre de lignes à supprimer:', objectRows.length);
            objectRows.forEach(row => row.remove());
            
            // FIX: S'assurer que values est un tableau avant de créer les objets
            // Cela évite les erreurs si values est undefined, null, ou une string
            const arrayValues = Array.isArray(values) ? values : (values ? [values] : []);
            
            // Recréer les lignes d'objets avec les valeurs mises à jour
            this.createObjects(arrayValues, update, container);
            
            console.log('✅ MultiFileProperty: Interface rechargée avec', arrayValues.length, 'éléments');
        } else {
            console.error('❌ MultiFileProperty: Container non trouvé pour reloadObjects');
            console.error('   Property name:', this.name);
            console.error('   specificContainer:', specificContainer);
            console.error('   querySelector result:', document.querySelector(".metadata-multiFiles-container-" + this.name.toLowerCase()));
        }
    }

    override enableDragAndDrop() {
        // Disable drag and drop
    }
}
