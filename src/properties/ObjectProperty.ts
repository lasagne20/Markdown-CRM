import { Property } from "./Property";
import { File } from "../vault/File";
import { FileProperty } from "./FileProperty";
import { TextProperty } from "./TextProperty";
import { MultiFileProperty } from "./MultiFileProperty";
import { Vault } from "../vault/Vault";
import { DisplayContainer } from "../Config/interfaces";
import { DisplayRenderer } from "../display/DisplayRenderer";
import { generateUUID } from "../utils/Utils";

export class ObjectProperty extends Property{
    // Used for property object

    public properties : {[key : string] : Property};
    public override type : string = "object";
    public override flexSpan = 2;
    public appendFirst : boolean = false;
    public allowMove : boolean = true;
    public display : string = "object"; // Organization mode: "object", "table", "tabs"
    public displayContainer? : DisplayContainer; // Custom layout for properties within each object

    constructor(name: string, vault: Vault, properties: { [key: string]: Property }, args: { allowMove?: boolean, appendFirst?: boolean, tooltip?: string, display?: string, displayContainer?: DisplayContainer, [key: string]: any} = {}) {
        super(name, vault, args);
        this.appendFirst = args?.appendFirst || false;
        this.properties = properties;
        this.allowMove = args?.allowMove ?? true;
        
        // Handle display configuration (organization mode)
        if (args?.display) {
            this.display = args.display;
        }
        
        // Handle displayContainer (custom layout within objects)
        if (args?.displayContainer) {
            this.displayContainer = args.displayContainer;
        }

        // Assign any additional arguments to the instance
        Object.assign(this, args);
    }

    /**
     * Validate file links within ObjectProperty arrays using centralized logic
     */
    override async validateFileLinks(currentValue: any): Promise<any> {
        if (!currentValue || !Array.isArray(currentValue)) {
            return null;
        }

        const updatedObjectArray = [];
        let hasChanges = false;

        for (const objectItem of currentValue) {
            if (!objectItem || typeof objectItem !== 'object') {
                updatedObjectArray.push(objectItem);
                continue;
            }

            const updatedObject = { ...objectItem };
            let objectChanged = false;

            // Validate file properties within this object using their own validateFileLinks methods
            for (const [subPropName, subProperty] of Object.entries(this.properties)) {
                const subProp = subProperty as any;
                if (subProp.type === 'file' || subProp.type === 'multiFile') {
                    const subCurrentValue = objectItem[subPropName];
                    if (!subCurrentValue) continue;

                    // Delegate to the sub-property's own validation method
                    const subValidatedValue = await subProp.validateFileLinks(subCurrentValue);
                    
                    if (subValidatedValue !== null && subValidatedValue !== undefined) {
                        // Update valid property
                        updatedObject[subPropName] = subValidatedValue;
                        objectChanged = true;
                        console.log(`📝 Updated object property '${this.name}.${subPropName}' from:`, subCurrentValue, 'to:', subValidatedValue);
                    }
                    // Note: Keep properties with broken links (when subValidatedValue === undefined)
                }
            }

            if (objectChanged) {
                hasChanges = true;
            }
            updatedObjectArray.push(updatedObject);
        }

        return hasChanges ? updatedObjectArray : null;
    }

    getClasses(): string[]{
        for (let prop of Object.values(this.properties)){
            if (prop instanceof FileProperty || prop instanceof ObjectProperty || prop.type == "multiFile"){
                return (prop as any).getClasses()
            }
        }
        throw new Error("No class found")
      }

    // Used by the ClasseProperty to get the parent file
    getParentValue(values : any) : File | undefined{
        if (values && values.length){
          for (let prop of Object.values(this.properties)){
            if (prop instanceof FileProperty || prop instanceof ObjectProperty || prop.type == "multiFile"){
              return (prop as any).getParentValue(values[0][prop.name])
            }
          }
        }
        return undefined;
    }

    async findValue(file: any, value: string, propertyName: string): Promise <any> {
        let values = await this.read(file);
        if (values && values.length){
            for (let i = 0; i < values.length; i++) {
                for (let prop of Object.values(this.properties)){
                    let propValue = values[i][prop.name];
                    if (propValue && (propValue == value || (typeof propValue === "string" && propValue.includes(value)))) {
                        return values[i][propertyName]
                    }
                }
            }
        }
        return null;
    }


    async getDisplayProperties(file: File, propertyClasseName : string, propertyName : string, isStatic: boolean = true): Promise<{classe : any , display : any}[]> {
        let properties: {classe : any , display : any}[] = [];
        this.vault = file.vault;
        let values = await this.read(file);
        if (!(propertyName in this.properties)){
            throw new Error("Property " + propertyName + " not found in ObjectProperty " + this.name);
        }
        let property = this.properties[propertyName];

        if (values && values.length){
            for (let [index, row] of values.entries()) {
                property.static = isStatic;
                let display = property.fillDisplay(row[property.name],
                    async (value : any ) => await this.updateObject(values, async (value) => await file.updateMetadata(this.name, value), index, property, value));
                
                let classe = await this.vault.getFromLink(row[this.properties[propertyClasseName].name])
                properties.push({classe: classe, display : display});
            }
        }
        return properties;
    }

    formatParentValue(value : string){
        let newObject: any = {};
        Object.values(this.properties).forEach(prop => {
            if (value && prop instanceof FileProperty || prop instanceof ObjectProperty || prop.type == "multiFile"){
                newObject[prop.name] = value
                value = "" // Only one parent
            }
            else {
                newObject[prop.name] = ""
            }
        });
        return [newObject]
    }

    /**
     * Migrate property aliases for ObjectProperty (including nested properties).
     * ObjectProperty always stores values as arrays of objects.
     * 
     * @param metadata - Current metadata object
     * @param deleteAfterMigration - Whether to delete old alias properties after migration
     * @returns Object with hasChanges flag and updated metadata
     */
    override migrateAliases(metadata: Record<string, any>, deleteAfterMigration: boolean): { hasChanges: boolean; updates: Record<string, any> } {
        let updates = { ...metadata };
        let hasChanges = false;

        // Step 1: Handle top-level ObjectProperty alias migration (migrate entire array)
        let currentValue = updates[this.name];
        let foundInAlias: string | null = null;
        
        if (!currentValue && this.aliases) {
            for (const alias of this.aliases) {
                if (updates[alias]) {
                    currentValue = updates[alias];
                    foundInAlias = alias;
                    break;
                }
            }
        }

        // If found via top-level alias, migrate it
        if (foundInAlias) {
            updates[this.name] = currentValue;
            if (deleteAfterMigration) {
                delete updates[foundInAlias];
            }
            hasChanges = true;
        }
        
        // Step 2: Handle nested property aliases within each object in the array
        if (Array.isArray(currentValue) && currentValue.length > 0 && this.properties) {
            const updatedArray = currentValue.map(item => {
                // Skip non-objects
                if (typeof item !== 'object' || Array.isArray(item)) {
                    return item;
                }

                // Use Property.migrateAliases for each nested property
                let objectData = { ...item };
                let objectHasChanges = false;

                for (const nestedProp of Object.values(this.properties)) {
                    const result = nestedProp.migrateAliases(objectData, true);
                    if (result.hasChanges) {
                        objectData = result.updates;
                        objectHasChanges = true;
                    }
                }

                return objectHasChanges ? objectData : item;
            });

            // Check if any objects were modified
            const arrayHasChanges = updatedArray.some((item, index) => item !== currentValue[index]);
            
            if (arrayHasChanges) {
                updates[this.name] = updatedArray;
                hasChanges = true;
            }
        }

        return { hasChanges, updates };
    }

    /**
     * Extract the parent File from an ObjectProperty value
     * Looks for the first FileProperty or MultiFileProperty in the object's properties
     * @param value The property value (array of objects or single object)
     * @returns The File instance if found, undefined otherwise
     */
    async getParentFile(value: any): Promise<File | undefined> {
        if (!value) {
            return undefined;
        }

        // Parse JSON string if needed
        let values = value;
        if (typeof values === 'string') {
            try {
                values = JSON.parse(values);
            } catch (e) {
                values = [];
            }
        }

        // Normalize value to array format
        if (!Array.isArray(values)) {
            // If it's an object (not an array), wrap it in an array
            if (typeof values === 'object' && Object.keys(values).length > 0) {
                values = [values];
            } else {
                // Empty object {} or other invalid value
                return undefined;
            }
        }

        // Take the first object from the array
        if (values.length > 0) {
            const firstObj = values[0];
            
            // Look for first FileProperty or MultiFileProperty
            for (const prop of Object.values(this.properties)) {
                const typedProp = prop as Property;
                if (typedProp.type === 'file' || typedProp.type === 'multiFile') {
                    const linkValue = firstObj[typedProp.name];
                    if (linkValue) {
                        // Delegate to the property's getParentFile method
                        if ('getParentFile' in typedProp && typeof (typedProp as any).getParentFile === 'function') {
                            return await (typedProp as any).getParentFile(linkValue);
                        }
                    }
                    break; // Only use first FileProperty found
                }
            }
        }

        return undefined;
    }

    override async getDisplay(classe: any, args?: { staticMode?: boolean; title?: string; display?: string; displayContainer?: DisplayContainer}): Promise<HTMLDivElement> {
        if (args?.display) {
            this.display = args.display;
        }
        if (args?.displayContainer) {
            this.displayContainer = args.displayContainer;
        }
        return super.getDisplay(classe, args);
    }

     // Méthode principale pour obtenir l'affichage - synchrone pour les modes standards
     override fillDisplay(values: any, update: (value: any) => Promise<void>) {
        console.log("Fill display ObjectProperty ", this.name)
        
        // Parse JSON string if needed
        if (typeof values === 'string') {
            try {
                values = JSON.parse(values);
            } catch (e) {
                values = [];
            }
        }
        
        const container = document.createElement("div");
        
        // Generate unique ID for this container instance
        const uuid = generateUUID();
        const containerClass = "metadata-object-container-" + this.name.toLowerCase().replace(/\s+/g, '-') + "-" + uuid;
        
        // Store the container class in a data attribute so reloadObjects can find it
        container.setAttribute('data-object-property-id', containerClass);
        
        container.classList.add("metadata-object-container");
        container.classList.add(containerClass);

        // Créer l'en-tête
        this.createHeader(values, update, container);
        
        // Choose organization mode based on display property
        if (this.display == "table") {
            this.createTable(values, update, container);
        }
        else if (this.display == "tabs") {
            this.createTabs(values, update, container);
        }
        else {
            // Affichage par défaut (objet)
            this.createObjects(values, update, container);
        }

        
        return container;
      }

    /**
     * Get the currently active tab index from the container
     */
    private getCurrentActiveTabIndex(container: HTMLDivElement): number {
        if (!container) return -1;
        
        const activeTab = container.querySelector('.metadata-object-tab.active') as HTMLElement;
        if (activeTab && activeTab.dataset && activeTab.dataset.tabIndex) {
            return parseInt(activeTab.dataset.tabIndex, 10);
        }
        
        return -1; // No active tab found
    }

    createTable(values: any, update: (value: any) => Promise<void>, container: HTMLDivElement) {
        // Créer un tableau pour les objets
        const tableWrapper = document.createElement("div");
        tableWrapper.style.position = "relative";
        container.appendChild(tableWrapper);

        let addButton = this.createAddButton(values, update, container)
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
            th.textContent = property.title || property.name;
            headerRow.appendChild(th);
        });
        // Ajouter une colonne pour le bouton de suppression
        const thDelete = document.createElement("th");
        headerRow.appendChild(thDelete);

        table.appendChild(headerRow);

        if (values && values.length) {
            // Afficher les éléments dans l'ordre du tableau
            // Avec appendFirst: true, les nouveaux éléments sont déjà au début
            values.forEach((objects: any, index: number) => {
                const row = document.createElement("tr");
                Object.values(this.properties).forEach(property => {
                    const td = document.createElement("td");
                    td.appendChild(property.fillDisplay(objects[property.name],
                        async (value : any) => await this.updateObject(values, update, index, property, value)));
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

    createTabs(values: any, update: (value: any) => Promise<void>, container: HTMLDivElement, activeTabIndex?: number) {
        // Parser les valeurs
        let parsedValues = values;
        if (typeof values === 'string') {
            try {
                parsedValues = JSON.parse(values);
            } catch (e) {
                parsedValues = [];
            }
        }
        
        if (!Array.isArray(parsedValues)) {
            parsedValues = [];
        }

        // Créer le conteneur des onglets
        const tabsContainer = document.createElement("div");
        tabsContainer.classList.add("metadata-object-tabs-container");
        
        // Créer la barre d'onglets
        const tabBar = document.createElement("div");
        tabBar.classList.add("metadata-object-tab-bar");
        
        // Créer le conteneur du contenu des onglets
        const tabContent = document.createElement("div");
        tabContent.classList.add("metadata-object-tab-content");
        
        // Fonction pour afficher un onglet spécifique
        const showTab = (index: number) => {
            // Masquer tous les contenus
            const allContents = tabContent.querySelectorAll('.metadata-object-tab-pane');
            allContents.forEach(content => {
                (content as HTMLElement).style.display = 'none';
            });
            
            // Désactiver tous les onglets
            const allTabs = tabBar.querySelectorAll('.metadata-object-tab');
            allTabs.forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Activer l'onglet et le contenu sélectionnés
            const selectedTab = tabBar.querySelector(`[data-tab-index="${index}"]`);
            const selectedContent = tabContent.querySelector(`[data-content-index="${index}"]`);
            
            if (selectedTab) selectedTab.classList.add('active');
            if (selectedContent) (selectedContent as HTMLElement).style.display = 'block';
        };
        
        // Sélectionner l'onglet spécifié ou le dernier onglet par défaut
        let defaultTabIndex: number;
        if (activeTabIndex !== undefined && activeTabIndex >= 0 && activeTabIndex < parsedValues.length) {
            // Utiliser l'onglet spécifié s'il est valide
            defaultTabIndex = activeTabIndex;
        } else {
            // Fallback: sélectionner le dernier onglet (comportement original)
            defaultTabIndex = parsedValues.length > 0 ? parsedValues.length - 1 : 0;
        }
        
        // Créer les onglets pour chaque objet
        parsedValues.forEach((objects: any, index: number) => {
            // Créer l'onglet
            const tab = document.createElement("div");
            tab.classList.add("metadata-object-tab");
            tab.dataset.tabIndex = index.toString();
            if (index === defaultTabIndex) tab.classList.add('active');
            
            // Texte de l'onglet (numéro ou titre)
            const tabLabel = document.createElement("span");
            tabLabel.classList.add("metadata-tab-label");
            
            // Essayer de trouver un label significatif
            let labelText = `Item ${index + 1}`;
            const firstProp = Object.values(this.properties)[0];
            if (firstProp && objects[firstProp.name]) {
                const value = objects[firstProp.name];
                const prettyValue = firstProp.getPretty(value);
                if (prettyValue && prettyValue.length > 0) {
                    labelText = prettyValue.length > 20 ? prettyValue.substring(0, 20) + '...' : prettyValue;
                }
            }
            tabLabel.textContent = labelText;
            tab.appendChild(tabLabel);
            
            // Événement de clic pour changer d'onglet
            tab.onclick = () => showTab(index);
            
            tabBar.appendChild(tab);
            
            // Créer le contenu de l'onglet
            const pane = document.createElement("div");
            pane.classList.add("metadata-object-tab-pane");
            pane.dataset.contentIndex = index.toString();
            pane.style.display = index === defaultTabIndex ? 'block' : 'none';
            pane.style.position = 'relative';
            
            // Vérifier que l'objet est valide
            if (typeof objects !== 'object' || objects === null) {
                console.warn(`Invalid object at index ${index}:`, objects);
                parsedValues[index] = {};
                objects = parsedValues[index];
            }
            
            // Bouton de suppression dans le contenu (en haut à droite)
            const deleteButton = document.createElement("button");
            this.vault.app.setIcon(deleteButton, "x");
            deleteButton.classList.add("metadata-tab-delete-button");
            deleteButton.style.position = 'absolute';
            deleteButton.style.top = '0';
            deleteButton.style.right = '0';
            deleteButton.onclick = async (e) => {
                e.stopPropagation();
                await this.removeProperty(values, update, index, container);
            };
            pane.appendChild(deleteButton);
            
            // Créer le contenu des propriétés
            if (this.displayContainer) {
                // Utiliser le displayContainer personnalisé pour le layout
                const updateObjectCallback = async (propertyName: string, newValue: any) => {
                    await this.updateObject(values, update, index, this.properties[propertyName], newValue, container);
                };

                const renderer = new DisplayRenderer(
                    this.vault,
                    this.properties,
                    [objects], // Contexte limité à l'objet courant
                    updateObjectCallback
                );

                const contentContainer = document.createElement("div");
                contentContainer.classList.add("metadata-object-custom-content");
                if (this.displayContainer.items && this.displayContainer.items.length > 0) {
                    // Render async dans un placeholder
                    const placeholder = document.createElement("div");
                    placeholder.textContent = "Loading...";
                    contentContainer.appendChild(placeholder);
                    
                    renderer.renderDisplayItems(contentContainer, this.displayContainer.items).then(() => {
                        placeholder.remove();
                    });
                }
                pane.appendChild(contentContainer);
            } else {
                // Grille de propriétés par défaut
                const propertiesGrid = document.createElement("div");
                propertiesGrid.classList.add("metadata-object-properties-grid");
            
            Object.values(this.properties).forEach(property => {
                let value = objects[property.name];
                let propertyContainer = document.createElement("div");
                propertyContainer.classList.add("metadata-object-property");

                if (property.flexSpan) {
                    propertyContainer.style.gridColumn = "span " + property.flexSpan;
                }

                // For ObjectProperty, we need special handling to pass its own container
                if (property instanceof ObjectProperty) {
                    let elementRef: HTMLDivElement | null = null;
                    
                    const propertyElement = property.fillDisplay(value,
                        async (value: any) => {
                            const targetContainer = elementRef || container;
                            await this.updateObject(values, update, index, property, value, targetContainer);
                        });
                    
                    elementRef = propertyElement;
                    propertyContainer.appendChild(propertyElement);
                } else {
                    const propertyElement = property.fillDisplay(value,
                        async (value: any) => await this.updateObject(values, update, index, property, value, container));
                    propertyContainer.appendChild(propertyElement);
                }
                
                propertiesGrid.appendChild(propertyContainer);
            });
            
            pane.appendChild(propertiesGrid);
            }
            
            tabContent.appendChild(pane);
        });
        
        // Ajouter l'onglet "+" pour créer un nouvel objet
        const addTab = document.createElement("div");
        addTab.classList.add("metadata-object-tab");
        addTab.classList.add("metadata-object-tab-add");
        this.vault.app.setIcon(addTab, "plus");
        addTab.onclick = async () => {
            await this.addProperty(values, update, container);
        };
        tabBar.appendChild(addTab);
        
        tabsContainer.appendChild(tabBar);
        tabsContainer.appendChild(tabContent);
        container.appendChild(tabsContainer);
    }
  
      // Crée l'en-tête avec les propriétés
      createHeader(values : any, update : (value: any) => Promise<void>, container: HTMLDivElement) {
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
      createAddButton(values : any, update : (value: any) => Promise<void>, container: HTMLDivElement): HTMLButtonElement {
          const addButton = document.createElement("button");
          this.vault.app.setIcon(addButton, "circle-plus")
          addButton.classList.add("metadata-add-button");
          addButton.onclick = async () => await this.addProperty(values, update, container);
          return addButton;
      }
  
      // Crée les objets et les lignes à afficher
      createObjects(values: any, update : (value: any) => Promise<void>,  container: HTMLDivElement) {
          if (!values){return}
          
          // Afficher les éléments dans l'ordre du tableau
          // Avec appendFirst: true, les nouveaux éléments sont déjà au début
          values.forEach((objects: any, index: number) => {
              // Vérifier que l'objet est valide (pas une string "[object Object]")
              if (typeof objects !== 'object' || objects === null) {
                  console.warn(`Invalid object at index ${index}:`, objects);
                  values[index] = {}; // Remplacer par un objet vide
                  objects = values[index];
              }
              const row = this.createObjectRow(values, update, objects, index, container);
              container.appendChild(row);
          });
          if (this.allowMove){
              this.enableDragAndDrop(values, update, container);
          }
         
      }
  
      // Crée une ligne d'objet avec ses propriétés
    createObjectRow(values : any, update : (value: any) => Promise<void>, objects: any, index: number, container: HTMLDivElement): HTMLDivElement {
        const row = document.createElement("div");
        row.classList.add("metadata-object-row");
        
        if (this.displayContainer) {
            // Custom display mode
            row.classList.add("metadata-object-custom-row");
        } else {
            // Default grid display mode
            row.classList.add("table-mode");
        }

        if (this.allowMove){
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

        if (this.displayContainer) {
            // Utiliser le displayContainer personnalisé pour le layout
            const updateObjectCallback = async (propertyName: string, newValue: any) => {
                await this.updateObject(values, update, index, this.properties[propertyName], newValue, container);
            };

            const renderer = new DisplayRenderer(
                this.vault,
                this.properties,
                [objects], // Contexte limité à l'objet courant
                updateObjectCallback
            );

            const contentContainer = document.createElement("div");
            contentContainer.classList.add("metadata-object-custom-content");
            if (this.displayContainer.items && this.displayContainer.items.length > 0) {
                // Need to handle async rendering
                renderer.renderDisplayItems(contentContainer, this.displayContainer.items);
            }
            row.appendChild(contentContainer);
        } else {
            // Grille de propriétés par défaut
            Object.values(this.properties).forEach(property => {
            let value = objects[property.name]
            let propertyContainer = document.createElement("div");
            propertyContainer.classList.add("metadata-object-property");

            if (property.flexSpan){
                propertyContainer.style.gridColumn = "span "+property.flexSpan;
            }

            // For ObjectProperty, we need special handling to pass its own container
            if (property instanceof ObjectProperty) {
                // Create a wrapper that will hold the element reference
                let elementRef: HTMLDivElement | null = null;
                
                const propertyElement = property.fillDisplay(value,
                    async (value: any) => {
                        // Use the element's own container for updates
                        const targetContainer = elementRef || container;
                        await this.updateObject(values, update, index, property, value, targetContainer);
                    });
                
                // Store the reference after creation
                elementRef = propertyElement;
                propertyContainer.appendChild(propertyElement);
            } else {
                // For non-ObjectProperty, use the parent container
                const propertyElement = property.fillDisplay(value,
                    async (value: any) => await this.updateObject(values, update, index, property, value, container));
                propertyContainer.appendChild(propertyElement);
            }
            
            row.appendChild(propertyContainer);

        });
        }

        return row;
      }
  
      // Crée un bouton de suppression pour une ligne d'objet
      createDeleteButton(values : any, update : (value: any) => Promise<void>, index: number, container: HTMLDivElement): HTMLButtonElement {
          const deleteButton = document.createElement("button");
          this.vault.app.setIcon(deleteButton, "circle-minus");
          deleteButton.classList.add("metadata-delete-button");
          deleteButton.onclick = async () => await this.removeProperty(values, update, index, container);
          return deleteButton;
      }
  
    // Gère le glisser-déposer pour réordonner les objets
    enableDragAndDrop(values : any, update : (value: any) => Promise<void>, container: HTMLDivElement) {
        let draggedElement: HTMLElement | null = null;

        let isEditing = false;

        // Lorsque l'utilisateur clique dans un champ d'édition (input), on active l'édition
        document.addEventListener("focus", (event) => {
            const input = event.target as HTMLElement;
            if (input?.classList?.contains('field-input')) {
                isEditing = true;  // Le champ est en mode édition
            }
        }, true);

        // Lorsque l'utilisateur quitte un champ d'édition (blur), on désactive l'édition
        document.addEventListener("blur", (event) => {
            const input = event.target as HTMLElement;
            if (input?.classList?.contains('field-input')) {
                isEditing = false;  // Le champ n'est plus en mode édition
            }
          }, true);

          container.addEventListener("dragstart", (event) => {
            if (isEditing) {
              event.preventDefault();
              return;
            }
            draggedElement = event.target as HTMLElement;
            draggedElement.classList.add("dragging");
          });
  
          container.addEventListener("dragover", (event) => {
              event.preventDefault();
              const afterElement = this.getDragAfterElement(container, event.clientY);
              if (afterElement == null) {
                  container.appendChild(draggedElement!);
              } else {
                container.insertBefore(draggedElement!, afterElement);
              }
          });
  
          container.addEventListener("dragend", async () => {
              if (!draggedElement) return;
              draggedElement.classList.remove("dragging");
  
              // Récupérer le nouvel ordre des éléments
              await this.updateOrder(values, update, container);
          });
      }
  
      // Trouver l'élément après lequel insérer (pour le Drag & Drop)
      getDragAfterElement(container: HTMLDivElement, y: number): Element | null {
          const draggableElements = Array.from(container.querySelectorAll(".metadata-object-row:not(.dragging)"));
  
          const result = draggableElements.reduce((closest: { offset: number; element: Element | null }, child) => {
              const box = child.getBoundingClientRect();
              const offset = y - box.top - box.height / 2;
              return offset < 0 && offset > closest.offset ? { offset, element: child } : closest;
          }, { offset: Number.NEGATIVE_INFINITY, element: null as Element | null });
          
          return result.element;
      }
  
      // Met à jour l'ordre des éléments après un glisser-déposer
      async updateOrder(values : any, update : (value: any) => Promise<void>, container: HTMLDivElement) {
        console.log("Update order")
          let newOrder: any[] = [];
          Array.from(container.querySelectorAll(".metadata-object-row")).forEach((row) => {
              // Assurer qu'on travaille avec un HTMLElement pour accéder à dataset
              if (row instanceof HTMLElement && row.dataset.index) {
                  let index = parseInt(row.dataset.index);
                  newOrder.push(values[index]);
              }
          });
          // Mettre à jour les métadonnées
          await update(newOrder);
          await this.reloadObjects(newOrder, update, container)
      }
  
      // Fonction pour supprimer un objet
      async removeProperty(values : any, update : (value: any) => Promise<void>, index: number, container: HTMLDivElement) {
          console.log("Remove index : ", index)
          values.splice(index, 1);
          await update(values);
          await this.reloadObjects(values, update, container)
      }
  
      // Fonction pour ajouter un objet
      async addProperty(values : any, update : (value: any) => Promise<void>, container: HTMLDivElement) {
          let newObject: any = {};
          for (let prop of Object.values(this.properties)) {
            let defaultValue = prop.getDefaultValue()
            if (Object.values(this.properties)[0] == prop && (prop instanceof FileProperty)) {
                prop.vault = this.vault; // Assurez-vous que vault est défini pour le premier FileProperty
                const fileProp = prop as any; // Cast pour accéder à handleIconClick
                defaultValue = await new Promise(async (resolve) => {
                    await fileProp.handleIconClick(async (value: any) => {
                        resolve(value);
                    }, new MouseEvent("click"));
                });
            }

            if (defaultValue == "like-precedent"){
                if (values && values.length){
                    if (this.appendFirst){
                        defaultValue = values[0][prop.name]
                    }
                    else {
                        defaultValue = values[values.length-1][prop.name]
                    }
                }
                else {defaultValue = ""}
            }
            newObject[prop.name] = defaultValue
        
        }; 
        // Valeurs par défaut
        if (!values){values = []}
        if (this.appendFirst) {
            values.unshift(newObject);
        } else {
            values.push(newObject);
        }
        console.log("New Values : ", values)
          await update(values);
          await this.reloadObjects(values, update, container)
      }
  
      // Mise à jour des métadonnées
      async updateObject(values : any, update : (value: any) => Promise<void>, index: number, property: Property, value: string, parentContainer?: HTMLDivElement) {
        console.log("Update index : ", index)
          if (values){
            // S'assurer que values[index] est un objet
            if (typeof values[index] !== 'object' || values[index] === null) {
                console.warn(`values[${index}] is not an object:`, values[index]);
                values[index] = {};
            }
            values[index][property.name] = value;
          }
          else {
            values = [{[property.name] : value}]
          }
          console.log("Updated Values : ", values)
          await update(values);
          
          // Only reload if the updated property is not an ObjectProperty
          // If it's an ObjectProperty, it will handle its own reload
          if (!(property instanceof ObjectProperty)) {
              await this.reloadObjects(values, update, parentContainer);
          }
      }

    // Recharge dynamiquement les objets
    async reloadObjects(values : any, update : (value: any) => Promise<void>, specificContainer?: HTMLDivElement) {
        if (!specificContainer) {
            console.warn(`reloadObjects called without container for ${this.name}`);
            return;
        }
        
        const container = specificContainer;
        
        // Store the currently active tab index before clearing the container
        const activeTabIndex = this.display === "tabs" ? this.getCurrentActiveTabIndex(container) : -1;
        
        container.innerHTML = "";
        // Recréer l'en-tête et les objets
        console.log("Values : ", values)
        
        this.createHeader(values, update, container);
        
        if (this.display == "table") {
            this.createTable(values, update, container);
        }
        else if (this.display == "tabs") {
            this.createTabs(values, update, container, activeTabIndex);
        }
        else {
            // Affichage par défaut (objet)
            this.createObjects(values, update, container);
        }
    }
  }
  