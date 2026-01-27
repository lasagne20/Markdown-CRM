import { File } from "../vault/File";
import { Property } from "./Property";
import { Classe } from "../vault/Classe";
import { LinkProperty } from "./LinkProperty";
import { Vault } from "../vault/Vault";
import { Condition } from "../Config/ConditionManager";


export class FileProperty extends LinkProperty{

    public classes : string[];
    public conditions?: Condition[];
    public override type : string = "file";
    // Used for property with a single file
    constructor(name : string, vault: Vault, classes: string[], args: {icon?: string, aliases?: string[], tooltip?: string, conditions?: Condition[]} = {}){
      super(name, vault, args);
      this.classes = classes;
      this.conditions = args.conditions;
    }

    getClasses() : string[] {
      return this.classes
    }

    /**
     * Validate a single file link using vault's functionality
     * @param vault The vault instance to use for validation
     * @param fileLink The file link to validate
     * @returns Updated link if valid, null if unchanged, undefined if broken link
     */
    static async validateSingleFileLink(vault: Vault, fileLink: any): Promise<any> {
        if (!fileLink || typeof fileLink !== 'string') {
            return undefined; // Invalid input should be kept as-is
        }

        try {
            // Use vault's existing getFromLink method
            const foundClasse = await vault.getFromLink(fileLink, false);
            if (foundClasse && foundClasse.getFile()) {
                const foundPath = foundClasse.getFile()?.getPath();
                if (foundPath) {
                    const foundBaseName = foundPath.split('/').pop()?.replace('.md', '') || fileLink;
                    const updatedValue = `[[${foundBaseName}]]`;
                    
                    // Only return if value actually changed
                    return fileLink !== updatedValue ? updatedValue : null;
                }
            }

            // File not found - return undefined to indicate broken link
            console.warn(`⚠️ File not found for link: ${fileLink}`);
            return undefined; // Special value to indicate "broken link, keep as-is"
        } catch (error) {
            console.error(`Error validating file link ${fileLink}:`, error);
            return undefined;
        }
    }

    /**
     * Validate file link for this FileProperty
     */
    override async validateFileLinks(currentValue: any): Promise<any> {
        // Handle single file value
        return FileProperty.validateSingleFileLink(this.vault, currentValue);
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
      if (typeof value !== "string") {
        return "";
      }
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
  
   override fillDisplay(value: any, update: (value: any) => Promise<void>, args? : { classe?: any }) {
        const field = super.fillDisplay(value, update, args);

        // Charger l'icône de la classe de manière asynchrone si aucune icône n'est configurée
        if (!this.icon || this.icon === 'align-left') {
            const iconContainer = field.querySelector('.icon-container') as HTMLDivElement;
            if (iconContainer) {
                this.loadClassIcon(value, iconContainer);
            }
        }

        return field;
    }

    async loadClassIcon(value: string, iconContainer: HTMLDivElement) {
        const linkedClasse = await this.vault.getFromLink(value);
        if (linkedClasse && linkedClasse.icon) {
            const icon = iconContainer.querySelector('div');
            if (icon) {
                // Vider l'icône actuelle et mettre celle de la classe
                icon.innerHTML = '';
                this.vault.app.setIcon(icon, linkedClasse.icon);
            }
        }
    }
   
   override createIconContainer(update: (value: string) => Promise<void>, classe?: any) {
    const iconContainer = document.createElement("div");
    iconContainer.classList.add("icon-container");

    const icon = document.createElement("div");
    this.vault.app.setIcon(icon, this.icon);
    iconContainer.appendChild(icon);

    if (this.tooltip) {
      const settings = this.vault.app.getSettings();
      const tooltipType = settings.tooltipType || 'title'; // Default to 'title'
      
      if (tooltipType === 'title' || tooltipType === 'both') {
        icon.setAttribute("title", this.tooltip);
      }
      if (tooltipType === 'aria-label' || tooltipType === 'both') {
        icon.setAttribute("aria-label", this.tooltip);
      }
    }

    if (!this.static) {
      icon.style.cursor = "pointer";
      iconContainer.addEventListener("click", async (event) => await this.handleIconClick(update, event, classe));
    }
    
    return iconContainer;
    }

    // Fonction pour gérer le clic sur l'icône
    async handleIconClick(update: (value: string) => Promise<void>, event: Event, currentDocument?: Classe) {
        // Get extended classes (includes classes that inherit from the specified ones)
        const classesToSelect = await this.vault.getExtendedClasses(this.classes);

        // Create validation function from conditions if they exist
        const validationFunction = this.conditions && this.conditions.length > 0
            ? this.vault.conditionManager.createValidationFunction(this.conditions, currentDocument)
            : undefined;

        let selectedFileObj = await this.vault.app.selectFile(this.vault, classesToSelect, {
            hint: "Choisissez un fichier " + this.getClasses().join(" ou "),
            validationFunction: validationFunction
        });
        if (selectedFileObj){
          const selectedFile = selectedFileObj.getLink();
          await update(selectedFile);
          if (event.target) {
            const link = (event.target as HTMLElement).closest('.metadata-field')?.querySelector('.field-link') as HTMLAnchorElement;
              if (link) {
                // Utiliser getPretty pour extraire le nom à afficher correctement
                link.textContent = this.getPretty(selectedFile);
                // Mettre à jour l'URL du lien
                link.href = this.getLink(selectedFile);
              }
          }
          }
    }

    // Fonction pour gérer le clic sur l'icône
    override async modifyField(event: Event) {
      const mouseEvent = event as MouseEvent;
      const link = (event.target as HTMLElement).closest('.metadata-field')?.querySelector('.field-link') as HTMLElement;
      let currentField = link.textContent
      if (!currentField){return}
      
      // Déterminer si on doit ouvrir dans un nouvel onglet (clic molette ou Ctrl/Cmd+clic)
      const newTab = mouseEvent.button === 1 || mouseEvent.ctrlKey || mouseEvent.metaKey;
      
      event.preventDefault();
     
      const classe = await this.vault.getFromLink(currentField);
      if (classe) {
        let path = classe.getPath()
        if (path){
           await this.vault.app.open(path, newTab);
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