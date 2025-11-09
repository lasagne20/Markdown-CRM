
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
        propertyContainer.appendChild(this.property.fillDisplay(this.vault, value, async (value : any) => await this.updateObject(values, update, index, this.property, value)));
        row.appendChild(propertyContainer);

        return row;
    }

    override createDeleteButton(values: any, update: (value: any) => Promise<void>, index: number, container: HTMLDivElement): HTMLButtonElement {
        const deleteButton = document.createElement("button");
        this.vault.app.setIcon(deleteButton, "minus");
        deleteButton.classList.add("metadata-delete-button-inline-small");
        deleteButton.onclick = async () => await this.removeProperty(values, update, index, container);
        return deleteButton;
    }

    override async addProperty(values: any, update: (value: any) => Promise<void>, container: HTMLDivElement) {
        const newFiles = await this.vault.app.selectMultipleFile(this.vault, this.classes, { hint: "Choisissez des fichiers " + this.getClasses().join(" ou ") });
        if (newFiles && newFiles.length > 0) {
            if (!values) { values = []; }
            newFiles.forEach((file: File) => {
                values.push(file.getLink());
            });
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

    override enableDragAndDrop() {
        // Disable drag and drop
    }
}
