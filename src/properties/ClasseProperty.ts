import { File } from "../vault/File";
import { Property } from "./Property";
import { Classe } from "../vault/Classe";
import { Vault } from "../vault/Vault";


export class ClasseProperty extends Property{

     public override type : string = "class";

    // Used for property hidden for the user
    constructor(name : string, vault: Vault, icon: string = "") {
      super(name, vault, {icon: icon});
    }

    override fillDisplay(value: any, update: (value: any) => Promise<void>)  {
          const field = document.createElement("div");
          field.classList.add("metadata-field");
      
          const label = document.createElement("label");
          label.textContent = value;

          if (this.icon){
            const icon = document.createElement("div"); 
            icon.classList.add("icon-container");
            this.vault.app.setIcon(icon, this.icon);
            field.appendChild(icon);
          }
          
          field.appendChild(label);
          return field;
      }

}