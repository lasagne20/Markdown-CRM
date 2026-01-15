import { DisplayItem, NumberDisplayItem, MapDisplayItem } from '../Config/interfaces';
import { Property } from '../properties/Property';
import { Vault } from '../vault/Vault';
import { Classe } from '../vault/Classe';
import { addFold } from '../utils/Utils';
import { DynamicTable } from './DynamicTable';
import { NumberDisplay } from './NumberDisplay';
import { DynamicMap } from './DynamicMap';
import { PropertyNavigator } from '../utils/PropertyNavigator';

/**
 * Utility class for rendering display configurations
 * Used by both ClassConfigManager and ObjectProperty
 */
export class DisplayRenderer {
    private vault: Vault;
    private properties: { [key: string]: Property };
    private context: any; // The Classe instance or object data
    private updateCallback?: (propertyName: string, value: any) => Promise<void>;
    private propertyNavigator: PropertyNavigator;

    constructor(
        vault: Vault, 
        properties: { [key: string]: Property }, 
        context: any,
        updateCallback?: (propertyName: string, value: any) => Promise<void>
    ) {
        this.vault = vault;
        this.properties = properties;
        this.context = context;
        this.updateCallback = updateCallback;
        this.propertyNavigator = new PropertyNavigator(vault, context);
    }

    async renderDisplayItems(container: HTMLElement, items: DisplayItem[]): Promise<void> {
        for (const item of items) {
            const element = await this.renderDisplayItem(item);
            if (element) {
                container.appendChild(element);
            }
        }
    }

    private async renderDisplayItem(item: DisplayItem): Promise<HTMLElement | null> {
        switch (item.type) {
            case 'property':
                return await this.renderProperty(item);
            
            case 'button':
                return this.renderButton(item);
            
            case 'line':
            case 'column':
                return await this.renderContainer(item);
            
            case 'tabs':
                return await this.renderTabs(item);
            
            case 'fold':
                return await this.renderFold(item);
            
            case 'table':
                return await this.renderTable(item, this.context);
            
            case 'number':
                return await this.renderNumber(item);
            
            case 'map':
                return await this.renderMap(item);
            
            default:
                console.warn(`Unknown display item type: ${(item as any).type}`);
                return null;
        }
    }

    private async renderProperty(item: any): Promise<HTMLElement | null> {
        const property = this.properties[item.name];
        if (!property) {
            console.warn(`Property not found: ${item.name}`);
            return null;
        }
        
        // For ObjectProperty context (array of objects), get value from context
        let value: any;
        if (Array.isArray(this.context)) {
            // Context is object data from ObjectProperty
            value = this.context[0]?.[item.name];
        } else {
            // Context is a Classe instance
            value = this.context.getValue ? await this.context.getValue(property.name) : undefined;
        }

        // Create update callback for this specific property
        const updateFn = this.updateCallback 
            ? async (newValue: any) => await this.updateCallback!(property.name, newValue)
            : async (newValue: any) => {
                if (this.context.updateValue) {
                    await this.context.updateValue(property.name, newValue);
                }
            };

        // For Classe context, use getDisplay with configuration from item
        let result: HTMLElement | null;
        if (this.context.getProperties) {
            // Cast args to any to support ObjectProperty's extended parameters (display, displayContainer)
            const args: any = {
                title: item.title, 
                staticMode: item.static,
                display: item.display,
                displayContainer: item.displayContainer
            };
            result = await property.getDisplay(this.context, args);
        } else {
            // For ObjectProperty context, use fillDisplay directly
            // Apply display and displayContainer temporarily for fillDisplay
            const originalDisplay = (property as any).display;
            const originalDisplayContainer = (property as any).displayContainer;
            
            try {
                if (item.display !== undefined) {
                    (property as any).display = item.display;
                }
                if (item.displayContainer !== undefined) {
                    (property as any).displayContainer = item.displayContainer;
                }
                
                result = property.fillDisplay(value, updateFn);
            } finally {
                // Don't restore - keep modifications for async rendering
                // (property as any).display = originalDisplay;
                // (property as any).displayContainer = originalDisplayContainer;
            }
        }
        
        return result;
    }

    private renderButton(item: any): HTMLElement {
        const button = document.createElement("button");
        button.classList.add("mod-cta", "crm-action-button");
        button.textContent = item.label || "Action";
        
        if (item.icon) {
            const icon = document.createElement("span");
            icon.classList.add("button-icon");
            this.vault.app.setIcon(icon, item.icon);
            button.insertBefore(icon, button.firstChild);
        }
        
        if (item.className) {
            button.classList.add(item.className);
        }
        
        button.addEventListener("click", async (e) => {
            e.stopPropagation();
            if (this.context.executeProcess) {
                await this.context.executeProcess(item.process);
            }
        });
        
        return button;
    }

    private async renderContainer(item: any): Promise<HTMLElement> {
        const wrapper = document.createElement("div");
        wrapper.classList.add("metadata-container-wrapper");
        
        if (item.className) {
            wrapper.classList.add(item.className);
        }
        
        if (item.title) {
            const title = document.createElement("h3");
            title.textContent = item.title;
            title.classList.add("container-section-title");
            wrapper.appendChild(title);
        }
        
        const container = document.createElement("div");
        
        if (item.type === 'line') {
            container.classList.add("metadata-line");
        } else if (item.type === 'column') {
            container.classList.add("metadata-column");
        }
        
        if (item.items) {
            await this.renderDisplayItems(container, item.items);
        }
        
        wrapper.appendChild(container);
        return wrapper;
    }

    private async renderTabs(item: any): Promise<HTMLElement> {
        const container = document.createElement("div");
        container.classList.add("metadata-tabs-container");
        
        if (item.className) {
            container.classList.add(item.className);
        }
        
        if (item.title) {
            const title = document.createElement("h3");
            title.textContent = item.title;
            title.classList.add("container-section-title");
            container.appendChild(title);
        }
        
        const tabHeaders = document.createElement("div");
        tabHeaders.classList.add("tab-headers");
        container.appendChild(tabHeaders);
        
        const tabContents = document.createElement("div");
        tabContents.classList.add("tab-contents");
        container.appendChild(tabContents);
        
        if (!item.tabs) return container;
        
        for (let i = 0; i < item.tabs.length; i++) {
            const tabConfig = item.tabs[i];
            
            const tabHeader = document.createElement("button");
            tabHeader.textContent = tabConfig.name;
            tabHeader.classList.add("tab-header");
            if (i === 0) tabHeader.classList.add("active");
            tabHeader.dataset.tabIndex = i.toString();
            tabHeaders.appendChild(tabHeader);
            
            const tabContent = document.createElement("div");
            tabContent.classList.add("tab-content");
            if (i === 0) tabContent.classList.add("active");
            tabContent.dataset.tabIndex = i.toString();
            
            if (tabConfig.items) {
                await this.renderDisplayItems(tabContent, tabConfig.items);
            }
            tabContents.appendChild(tabContent);
            
            tabHeader.addEventListener("click", () => {
                tabHeaders.querySelectorAll(".tab-header").forEach(h => h.classList.remove("active"));
                tabContents.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
                tabHeader.classList.add("active");
                tabContent.classList.add("active");
            });
        }
        
        return container;
    }

    private async renderFold(item: any): Promise<HTMLElement> {
        const container = document.createElement("div");
        container.classList.add("metadata-fold-container");
        
        if (item.className) {
            container.classList.add(item.className);
        }
        
        const foldHeader = document.createElement("div");
        foldHeader.classList.add("fold-header");
        foldHeader.textContent = item.title || "Details";
        container.appendChild(foldHeader);
        
        const foldContent = document.createElement("div");
        foldContent.classList.add("fold-content");
        
        if (item.items) {
            await this.renderDisplayItems(foldContent, item.items);
        }
        
        addFold(foldHeader, foldContent);
        container.appendChild(foldContent);
        
        return container;
    }

    private async renderTable(item: any, currentInstance?: Classe): Promise<HTMLElement> {
        const container = document.createElement("div");
        container.classList.add("metadata-table-container");
        
        if (item.className) {
            container.classList.add(item.className);
        }
        
        if (item.title) {
            const title = document.createElement("h3");
            title.textContent = item.title;
            title.classList.add("container-section-title");
            container.appendChild(title);
        }
        
        if (!item.source) {
            console.warn("Table display item missing source configuration");
            return container;
        }
        
        // Get files based on source filter type
        let files = await this.getFilesForTable(item.source, currentInstance);
        
        const tableConfig = {
            source: item.source,
            columns: item.columns || [],
            totals: item.totals || []
        };
        
        const dynamicTable = new DynamicTable(files, tableConfig, this.vault, currentInstance);
        const tableElement = await dynamicTable.getTable();
        container.appendChild(tableElement);
        
        return container;
    }

    /**
     * Get files for a table based on source configuration
     */
    private async getFilesForTable(source: any, currentInstance?: Classe): Promise<Classe[]> {
        let instances: Classe[] = [];
        
        // Check if source.class contains a dot (ClassName.propertyName notation)
        if (source.class.includes('.')) {
            return await this.getObjectPropertyItems(source, currentInstance);
        }
        
        // Get instances based on filter type (original logic for regular classes)
        const factory = this.vault.getDynamicClassFactory();
        if (!factory) {
            console.warn("DynamicClassFactory not available");
            return [];
        }

        const smartFilter = source.smartFilter || 'all';
        
        switch (smartFilter) {
            case 'all':
                instances = await factory.getAllInstancesForClass(source.class, this.vault);
                break;
            
            case 'children':
                if (currentInstance) {
                    instances = await (currentInstance as any).findChildren?.() || [];
                }
                break;
            
            case 'parent':
                if (currentInstance) {
                    const parentFile = await (currentInstance as any).getParentFile?.();
                    if (parentFile) {
                        const parent = await this.vault.getFromFile(parentFile);
                        if (parent) {
                            instances = [parent];
                        }
                    }
                }
                break;
            
            case 'siblings':
                if (currentInstance) {
                    const parentFile = await (currentInstance as any).getParentFile?.();
                    if (parentFile) {
                        const parent = await this.vault.getFromFile(parentFile);
                        if (parent) {
                            const siblings = await (parent as any).findChildren?.() || [];
                            // Exclude current instance
                            const currentPath = currentInstance.getPath();
                            instances = siblings.filter((s: Classe) => s.getPath() !== currentPath);
                        }
                    }
                }
                break;
            
            case 'roots':
                // Get all instances and filter those without parent
                const allInstances = await factory.getAllInstancesForClass(source.class, this.vault);
                instances = [];
                for (const instance of allInstances) {
                    const parentFile = await (instance as any).getParentFile?.();
                    if (!parentFile) {
                        instances.push(instance);
                    }
                }
                break;
            
            default:
                console.warn(`Unknown smartFilter type: ${smartFilter}`);
        }

        // Filter by class name for smartFilter cases that don't inherently filter by class
        if (smartFilter !== 'all' && smartFilter !== 'roots' && !source.class.includes('.')) {
            instances = instances.filter((instance: Classe) => {
                const instanceClassName = (instance as any).name;
                const matches = instanceClassName === source.class;
                console.log(`  - ${instance.getName()} (${instanceClassName}) matches ${source.class}:`, matches);
                return matches;
            });
        }

        // Apply conditions if specified
        if (source.conditions && source.conditions.length > 0) {
            const validationFn = this.vault.conditionManager.createValidationFunction(source.conditions, currentInstance);
            
            const filtered: Classe[] = [];
            for (const instance of instances) {
                const isValid = await validationFn(instance);
                if (isValid) {
                    filtered.push(instance);
                }
            }
            instances = filtered;
        }

        // Apply hierarchical groups if specified
        if (source.groups && source.groups.length > 0) {

            // Create a ConditionConfig with the groups
            const conditionConfig = {
                operator: source.operator || 'AND',
                groups: source.groups,
                conditions: source.conditions || []
            };
            
            const validationFn = this.vault.conditionManager.createHierarchicalValidationFunction(conditionConfig, currentInstance);
            
            const filtered: Classe[] = [];
            for (const instance of instances) {
                const isValid = await validationFn(instance);
                if (isValid) {
                    filtered.push(instance);
                }
            }
            instances = filtered;
        }

        return instances;
    }

    /**
     * Get ObjectProperty items from ClassName.propertyName notation
     */
    private async getObjectPropertyItems(source: any, currentInstance?: Classe): Promise<Classe[]> {
        const [className, propertyName] = source.class.split('.');
        
        const factory = this.vault.getDynamicClassFactory();
        if (!factory) {
            console.warn("DynamicClassFactory not available");
            return [];
        }

        // Get all instances of the specified class
        let instances: Classe[] = [];
        const smartFilter = source.smartFilter || 'all';
        
        switch (smartFilter) {
            case 'all':
                instances = await factory.getAllInstancesForClass(className, this.vault);
                break;
            
            case 'children':
                if (currentInstance) {
                    instances = await (currentInstance as any).findChildren?.() || [];
                }
                break;
                
            case 'parent':
                if (currentInstance) {
                    const parentFile = await (currentInstance as any).getParentFile?.();
                    if (parentFile) {
                        const parent = await this.vault.getFromFile(parentFile);
                        if (parent && parent.name === className) {
                            instances = [parent];
                        }
                    }
                }
                break;
                
            default:
                instances = await factory.getAllInstancesForClass(className, this.vault);
        }

        // Extract ObjectProperty items from each instance
        const objectPropertyItems: Classe[] = [];
        
        for (const instance of instances) {
            try {
                const property = instance.getProperty(propertyName);
                if (property && property.type === 'object') {
                    const propertyValue = await property.read(instance);
                    
                    if (Array.isArray(propertyValue)) {
                        // Create pseudo-instances for each object in the array
                        propertyValue.forEach((obj: any, index: number) => {
                            if (obj && typeof obj === 'object') {
                                const pseudoInstance = this.createPseudoInstance(
                                    obj, 
                                    instance, 
                                    propertyName, 
                                    index,
                                    className
                                );
                                objectPropertyItems.push(pseudoInstance);
                            }
                        });
                    }
                }
            } catch (error) {
                console.warn(`Error reading property ${propertyName} from ${instance.getName()}:`, error);
            }
        }

        // Apply conditions if specified
        if (source.conditions && source.conditions.length > 0) {
            const validationFn = this.vault.conditionManager.createValidationFunction(source.conditions, currentInstance);
            
            const filtered: Classe[] = [];
            for (const item of objectPropertyItems) {
                if (await validationFn(item)) {
                    filtered.push(item);
                }
            }
            return filtered;
        }

        return objectPropertyItems;
    }

    /**
     * Create a pseudo-instance that behaves like a Classe for ObjectProperty objects
     */
    private createPseudoInstance(obj: any, parentInstance: Classe, propertyName: string, index: number, parentClassName: string): Classe {
        // Capture reference to DisplayRenderer instance
        const displayRenderer = this;
        
        // Create a pseudo-instance that implements the necessary Classe interface
        const pseudoInstance: any = {
            _isObjectPropertyItem: true,
            _parentInstance: parentInstance,
            _propertyName: propertyName,
            _index: index,
            _objectData: obj,
            _className: `${parentClassName}.${propertyName}`,
            
            getName: () => parentInstance.getName(), // Nom du fichier parent
            getPath: () => `${parentInstance.getPath()}#${propertyName}[${index}]`,
            getClassName: () => parentClassName, // Nom de la classe parent (Entreprise, Formation, etc.)
            
            // Add missing methods for full Classe compatibility
            getPropertyValue: async (propName: string) => {
                // Handle special properties
                if (propName === '_fileName' || propName === '_filename') {
                    return `${parentInstance.getName()}.${propertyName}[${index}]`;
                }
                if (propName === '_parentFile') {
                    return parentInstance.getName();
                }
                
                // Handle complex property expressions (like "animateurs.filter(animateur=$current).tarif")
                if (propName.includes('.') || propName.includes('filter') || propName.includes('$current')) {
                    try {
                        return displayRenderer.propertyNavigator.evaluateComplexProperty(propName, obj, parentInstance);
                    } catch (error) {
                        console.warn(`Error processing complex property ${propName}:`, error);
                        return undefined;
                    }
                }
                
                // Simple property access
                return obj[propName];
            },
            
            // Simulate property access for the object data
            getProperty: (propName: string) => {
                // Handle special properties
                if (propName === '_fileName' || propName === '_filename') {
                    return {
                        read: async () => `${parentInstance.getName()}.${propertyName}[${index}]`,
                        type: 'text',
                        name: '_fileName',
                        getDisplay: async (instance: any) => {
                            const div = document.createElement('div');
                            div.classList.add('property-display', 'filename-property');
                            div.textContent = `${parentInstance.getName()}.${propertyName}[${index}]`;
                            return div;
                        }
                    };
                }
                if (propName === '_parentFile') {
                    return {
                        read: async () => parentInstance.getName(),
                        type: 'text',
                        name: '_parentFile',
                        getDisplay: async (instance: any) => {
                            const div = document.createElement('div');
                            div.classList.add('property-display', 'parent-file-property');
                            div.textContent = parentInstance.getName();
                            return div;
                        }
                    };
                }
                
                // Get the real ObjectProperty and its configured properties
                const objectProperty = parentInstance.getProperty(propertyName);
                if (objectProperty && (objectProperty as any).properties) {
                    const realProperty = (objectProperty as any).properties[propName];
                    if (realProperty) {
                        // Clone the real property and adapt it for our object data
                        return {
                            ...realProperty,
                            read: async () => obj[propName],
                            getDisplay: async (instance: any) => {
                                // Use the real property's fillDisplay method with our data
                                const value = obj[propName];
                                const updateFn = async (newValue: any) => {
                                    obj[propName] = newValue;
                                    // Could trigger parent update here if needed
                                };
                                return realProperty.fillDisplay(value, updateFn);
                            }
                        };
                    }
                }
                
                // Fallback to mock property if no real property found
                return {
                    read: async () => obj[propName],
                    type: 'text', // Default type
                    name: propName,
                    getDisplay: async (instance: any) => {
                        // Create a simple display for the property value
                        const div = document.createElement('div');
                        div.classList.add('property-display');
                        
                        const value = obj[propName];
                        if (value !== undefined && value !== null) {
                            div.textContent = String(value);
                        } else {
                            div.textContent = '-';
                            div.classList.add('empty-value');
                        }
                        
                        return div;
                    }
                };
            },
            
            // For special properties like _fileName
            getFileName: () => parentInstance.getName(), // Nom du fichier parent
            
            // Add getDisplay method for rendering
            getDisplay: async () => {
                const container = document.createElement('div');
                container.classList.add('object-property-item-display');
                
                // Add item header
                const header = document.createElement('div');
                header.classList.add('object-property-header');
                header.textContent = `${parentInstance.getName()}.${propertyName}[${index}]`;
                container.appendChild(header);
                
                // Add object properties
                const content = document.createElement('div');
                content.classList.add('object-property-content');
                
                Object.keys(obj).forEach(key => {
                    const row = document.createElement('div');
                    row.classList.add('property-row');
                    
                    const label = document.createElement('label');
                    label.textContent = key;
                    label.classList.add('property-label');
                    
                    const value = document.createElement('span');
                    value.textContent = String(obj[key] || '');
                    value.classList.add('property-value');
                    
                    row.appendChild(label);
                    row.appendChild(value);
                    content.appendChild(row);
                });
                
                container.appendChild(content);
                return container;
            },
            
            // Add other common Classe methods
            getFile: () => {
                // Return the parent file (since getName() returns parent name)
                const parentFile = parentInstance.getFile?.();
                if (parentFile) {
                    return parentFile;
                }
                // Fallback to mock file with parent name
                return {
                    getName: (withExtension?: boolean) => {
                        const name = parentInstance.getName();
                        return withExtension ? `${name}.md` : name;
                    },
                    getPath: () => parentInstance.getPath(),
                    name: `${parentInstance.getName()}.md`,
                    basename: parentInstance.getName()
                };
            },
            getVault: () => parentInstance.getVault?.() || displayRenderer.vault,
            updatePropertyValue: async (propName: string, value: any) => {
                // Update the local object for immediate UI feedback
                obj[propName] = value;
                
                // Get the current array value from the parent file
                const currentArrayValue = await parentInstance.getPropertyValue(propertyName);
                
                if (Array.isArray(currentArrayValue) && index >= 0 && index < currentArrayValue.length) {
                    // Update the specific item in the array
                    currentArrayValue[index][propName] = value;
                    
                    // Save the entire updated array back to the parent file
                    await parentInstance.updatePropertyValue(propertyName, currentArrayValue);
                } else {
                    console.error(`❌ Index ${index} invalide pour le tableau ${propertyName} de longueur ${currentArrayValue?.length}`);
                }
            },
            
            // Provide direct access to object properties
            ...obj
        };
        
        return pseudoInstance as Classe;
    }

    /**
     * Render a number display item
     */
    private async renderNumber(item: NumberDisplayItem): Promise<HTMLElement | null> {
        try {
            // Use NumberDisplay.fromConfig to handle all calculation logic
            const numberDisplay = await NumberDisplay.fromConfig(
                item,
                this.vault,
                this.context,
                this.getFilesForTable.bind(this)
            );
            
            const container = document.createElement('div');
            if (item.className) {
                container.className = item.className;
            }
            
            if (item.title) {
                const title = document.createElement('h3');
                title.textContent = item.title;
                title.style.marginBottom = '10px';
                container.appendChild(title);
            }
            
            container.appendChild(numberDisplay.container);
            
            return container;
        } catch (error) {
            console.error('Error rendering number display:', error);
            
            // Return error placeholder
            const errorDiv = document.createElement('div');
            errorDiv.className = 'crm-number-display-error';
            errorDiv.textContent = 'Error loading number display';
            errorDiv.style.cssText = 'color: var(--text-error); padding: 10px; border: 1px solid var(--text-error); border-radius: 4px;';
            return errorDiv;
        }
    }

    /**
     * Render a map display item
     */
    private async renderMap(item: MapDisplayItem): Promise<HTMLElement | null> {
        try {
            const container = document.createElement('div');
            container.classList.add('crm-map-display');
            
            if (item.className) {
                container.classList.add(item.className);
            }
            
            if (item.title) {
                const title = document.createElement('h3');
                title.textContent = item.title;
                title.classList.add('container-section-title');
                container.appendChild(title);
            }
            
            if (!item.source) {
                console.warn("Map display item missing source configuration");
                return container;
            }
            
            // Create loading placeholder
            const placeholder = document.createElement('div');
            placeholder.className = 'map-loading-placeholder';
            placeholder.style.cssText = `
                height: ${item.height || '500px'};
                display: flex;
                align-items: center;
                justify-content: center;
                background: #f5f5f5;
                border: 1px solid #ddd;
                border-radius: 4px;
                color: #666;
                font-size: 14px;
            `;
            placeholder.innerHTML = '🗺️ Chargement de la carte...';
            container.appendChild(placeholder);
            
            // Load map asynchronously
            setTimeout(async () => {
                try {
                    // Get files based on source filter type  
                    const files = await this.getFilesForTable(item.source, this.context);
                    
                    // Replace placeholder
                    placeholder.remove();
                    
                    // Create map using DynamicMap.fromConfig
                    await DynamicMap.fromConfig(item, this.vault, container, files, this.context);
                    
                } catch (error) {
                    console.error('Error loading map:', error);
                    placeholder.innerHTML = '❌ Erreur lors du chargement de la carte';
                    placeholder.style.color = 'var(--text-error)';
                }
            }, 100);
            
            return container;
            
        } catch (error) {
            console.error('Error rendering map display:', error);
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'crm-map-display-error';
            errorDiv.textContent = 'Error loading map display';
            errorDiv.style.cssText = 'color: var(--text-error); padding: 10px; border: 1px solid var(--text-error); border-radius: 4px;';
            return errorDiv;
        }
    }

}
