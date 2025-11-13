import { File } from "../vault/File";
import { Property } from "./Property";
import { Classe } from "../vault/Classe";
import { LinkProperty } from "./LinkProperty";
import { Vault } from "../vault/Vault";


export class FileProperty extends LinkProperty{

    public classes : string[];
    public override type : string = "file";
    // Used for property with a single file
    constructor(name : string, vault: Vault, classes: string[], args= {}){
      super(name, vault, args);
      this.classes = classes;
    }

    getClasses() : string[] {
      return this.classes
    }

    override getPretty(value: string) {
      return this.vault.readLinkFile(value)
    }

    async getClasse(classe: any): Promise<Classe | undefined>{
      let link = await this.read(classe);
      if (link) {
        let classeResult = await this.vault.getFromLink(link);
        if (classeResult) {
          return classeResult;
        }
      }
      return undefined;
    }

    override validate(value: string): string {
      // Expression régulière pour détecter les liens Obsidian au format [[...]]
      const regex = /\[\[([^\]]+)\]\]/;
      const match = value.match(regex);
      if (match && match[1]) {
          return `[[${match[1]}]]`;
      }
      return "";
   }

   /**
    * Extract the parent File from a FileProperty value
    * @param value The property value (should be a link like "[[filename]]")
    * @returns The File instance if found, undefined otherwise
    */
   async getParentFile(value: string): Promise<File | undefined> {
      if (!value) {
        return undefined;
      }
      
      const link = this.validate(value);
      if (link) {
        const classe = await this.vault.getFromLink(link);
        return classe?.getFile();
      }
      
      return undefined;
   }

   override getLink(value: string, vault? : any): string {
    if (vault) {
      this.vault = vault;
    }
    const filePath = this.vault.readLinkFile(value, true);

    // Use IApp.getUrl() to generate the proper URL
    if (filePath) {
      return this.vault.app.getUrl(filePath);
    }
    
    return "";
   }
  
   override createIconContainer(update: (value: string) => Promise<void>) {
    const iconContainer = document.createElement("div");
    iconContainer.classList.add("icon-container");

    const icon = document.createElement("div");
    this.vault.app.setIcon(icon, this.icon);
    iconContainer.appendChild(icon);

    if (!this.static) {
      icon.style.cursor = "pointer";
      iconContainer.addEventListener("click", async (event) => await this.handleIconClick(update, event));
    }
    
    return iconContainer;
    }

    // Fonction pour gérer le clic sur l'icône
    async handleIconClick(update: (value: string) => Promise<void>, event: Event) {
        let selectedFileObj = await this.vault.app.selectFile(this.vault, this.classes, {hint:"Choisissez un fichier " + this.getClasses().join(" ou ")});
        if (selectedFileObj){
          const selectedFile = selectedFileObj.getLink();
          await update(selectedFile);
          const link = (event.target as HTMLElement).closest('.metadata-field')?.querySelector('.field-link') as HTMLAnchorElement;
            if (link) {
              // Utiliser getPretty pour extraire le nom à afficher correctement
              link.textContent = this.getPretty(selectedFile);
              // Mettre à jour l'URL du lien
              link.href = this.getLink(selectedFile);
            }
        }
    }

    // Fonction pour gérer le clic sur l'icône
    override async modifyField(event: Event) {
      const link = (event.target as HTMLElement).closest('.metadata-field')?.querySelector('.field-link') as HTMLElement;
      let currentField = link.textContent
      if (!currentField){return}
      event.preventDefault();
     
      const classe = await this.vault.getFromLink(currentField);
      if (classe) {
        let path = classe.getPath()
        if (path){
           await this.vault.app.open(path);
         }
      } else {
        console.error(`Le fichier ${currentField}.md n'existe pas`) // TODO: Use Notice when available
      }
    }
    // Fonction pour créer le conteneur principal pour l'field
    override createFieldContainerContent(update: (value: string) => Promise<void>, value: string) {
        const fieldContainer = document.createElement("div");
        fieldContainer.classList.add("field-container");
        const currentField = this.getPretty(value);
        const link = document.createElement("a");
        link.href = this.getLink(value);
        link.textContent = currentField || "";
        link.classList.add("field-link");
        link.style.display = "block"
        fieldContainer.appendChild(link);

        return fieldContainer;
    }

}