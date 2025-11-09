import { File } from "../vault/File";
import { Property } from "./Property";
import { Vault } from "../vault/Vault";

export class SelectProperty extends Property {
    public options: {name : string, color : string}[];
    public override type : string = "select";

    constructor(name: string, vault: Vault, options: {name : string, color : string}[], args = {}) {
        super(name, vault, args);
        this.options = options;
    }

    override fillDisplay(value : any, update: (value: string) => Promise<void>) {
        const field = this.createFieldContainer();
        console.log("Options :", this.options);
        const fieldContainer = document.createElement("div");
        fieldContainer.classList.add("field-container-column");

        const iconContainer = this.createIconContainer(update);
        fieldContainer.appendChild(iconContainer);
        
        if (this.title) {
            const header = document.createElement("div");
            header.classList.add("metadata-header");
            header.textContent = this.title;
            fieldContainer.appendChild(header);
        }

        const selectElement = this.createSelectWidget(value, update);
        fieldContainer.appendChild(selectElement);
        field.appendChild(fieldContainer);

        return field;
    }

    // Crée le widget de sélection avec une liste déroulante
    createSelectWidget(value: string, update: (value: string) => Promise<void>): HTMLSelectElement {
        const selectElement = document.createElement("select");
        selectElement.classList.add("select-dropdown");
        // Appliquer la couleur de l'option sélectionnée
        if (value) {
            const selectedOption = this.options.find(option => option.name === value);
            if (selectedOption) {
            selectElement.style.backgroundColor = selectedOption.color;
            }
        }
        else {
            if (this.options.length > 0) {
                selectElement.style.backgroundColor = this.options[0].color;
                // Met à jour avec la première valeur de la liste
                update(this.options[0].name);
            }
        }

        // Ajouter les options de la liste
        this.options.forEach(option => {
            const optionElement = document.createElement("option");
            optionElement.classList.add("select-dropdown-option")
            optionElement.value = option.name;
            optionElement.textContent = option.name;
            optionElement.style.backgroundColor = option.color;


            // Si la valeur est déjà sélectionnée, l'option sera sélectionnée
            if (option.name === value) {
                optionElement.selected = true;
            }

            selectElement.appendChild(optionElement);
        });


        // Gérer le changement de valeur
        selectElement.onchange = async (event) => {
            const selectedValue = (event.target as HTMLSelectElement).value;
            // Met à jour la couleur de l'option sélectionnée
            const selectedOption = this.options.find(option => option.name === selectedValue);
            if (selectedOption) {
                selectElement.style.backgroundColor = selectedOption.color;
            }
            await update(selectedValue);
        };

        // Bloquer l'affichage de la liste si this.static est faux
        if (this.static) {
            selectElement.disabled = true;
        }

        return selectElement;
    }
}
