import { File } from "../vault/File";
import { Property } from "./Property";
import { Classe } from "../vault/Classe";
import { Vault } from "../vault/Vault";


export class ClasseProperty extends Property{

     public override type : string = "class";

    // Used for property hidden for the user
    constructor(name : string, vault: Vault, icon: string = "", args: {tooltip?: string} = {}) {
      super(name, vault, {icon: icon, ...args});
    }

    override fillDisplay(value: any, update: (value: any) => Promise<void>)  {
        const field = document.createElement("div");
        field.classList.add("metadata-field");

        // First line: title (if present)
        if (this.title) {
            const title = document.createElement("div");
            title.textContent = this.title;
            title.classList.add("metadata-title");
            field.appendChild(title);
        }

        // Second line: icon and content container (centered)
        const contentLine = document.createElement("div");
        contentLine.classList.add("metadata-content-line");
        
        if (this.icon) {
            const iconContainer = document.createElement("div");
            iconContainer.classList.add("icon-container");
            const icon = document.createElement("div");
            this.vault.app.setIcon(icon, this.icon);
            iconContainer.appendChild(icon);
            contentLine.appendChild(iconContainer);
        }

        const label = document.createElement("label");
        label.textContent = value;
        contentLine.appendChild(label);

        field.appendChild(contentLine);
        return field;
    }

}