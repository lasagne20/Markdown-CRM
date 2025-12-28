import { DisplayItem } from '../Config/interfaces';
import { Property } from '../properties/Property';
import { Vault } from '../vault/Vault';
import { Classe } from '../vault/Classe';
import { addFold } from '../utils/Utils';
import { DynamicTable } from './DynamicTable';

/**
 * Utility class for rendering display configurations
 * Used by both ClassConfigManager and ObjectProperty
 */
export class DisplayRenderer {
    private vault: Vault;
    private properties: { [key: string]: Property };
    private context: any; // The Classe instance or object data
    private updateCallback?: (propertyName: string, value: any) => Promise<void>;

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

        // Apply conditions if specified
        if (source.conditions && source.conditions.length > 0) {
            const validationFn = this.vault.conditionManager.createValidationFunction(source.conditions, currentInstance);
            
            const filtered: Classe[] = [];
            for (const instance of instances) {
                if (await validationFn(instance)) {
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
                    instances = instances.filter(i => i.name === className);
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
        // Create a pseudo-instance that implements the necessary Classe interface
        const pseudoInstance: any = {
            _isObjectPropertyItem: true,
            _parentInstance: parentInstance,
            _propertyName: propertyName,
            _index: index,
            _objectData: obj,
            _className: `${parentClassName}.${propertyName}`,
            
            getName: () => `${parentInstance.getName()}.${propertyName}[${index}]`,
            getPath: () => `${parentInstance.getPath()}#${propertyName}[${index}]`,
            getClassName: () => `${parentClassName}.${propertyName}`,
            
            // Simulate property access for the object data
            getProperty: (propName: string) => {
                // Handle special properties
                if (propName === '_fileName') {
                    return {
                        read: async () => `${parentInstance.getName()}.${propertyName}[${index}]`,
                        type: 'text',
                        name: '_fileName'
                    };
                }
                if (propName === '_parentFile') {
                    return {
                        read: async () => parentInstance.getName(),
                        type: 'text',
                        name: '_parentFile'
                    };
                }
                
                // Return a mock property that reads from the object data
                return {
                    read: async () => obj[propName],
                    type: 'text', // Default type
                    name: propName
                };
            },
            
            // For special properties like _fileName
            getFileName: () => `${parentInstance.getName()}.${propertyName}[${index}]`,
            
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
            
            // Provide direct access to object properties
            ...obj
        };
        
        return pseudoInstance as Classe;
    }
}
