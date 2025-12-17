import { Classe } from '../vault/Classe';
import { Vault } from '../vault/Vault';
import { FileProperty } from '../properties/FileProperty';
import { MultiFileProperty } from '../properties/MultiFileProperty';
import { ObjectProperty } from '../properties/ObjectProperty';
import { Property } from '../properties/Property';
import { SubClassProperty } from '../properties/SubClassProperty';
import { ConfigLoader } from './ConfigLoader';
import { ClassConfig, DisplayContainer } from './interfaces';
import { DynamicTable } from '../display/DynamicTable';
import { ProcessManager } from './ProcessManager';
import { addFold } from '../utils/Utils';


export class ClassConfigManager {
    private configLoader: ConfigLoader;
    private loadedClasses: Map<string, typeof Classe> = new Map();

    constructor(configPath: string, vault: Vault) {
        this.configLoader = new ConfigLoader(configPath, vault);
    }

    /**
     * Create a dynamic Classe from configuration
     */
    async createDynamicClasse(className: string): Promise<typeof Classe> {
        if (this.loadedClasses.has(className)) {
            return this.loadedClasses.get(className)!;
        }

        const config = await this.configLoader.loadClassConfig(className);
        
        // Create a dynamic class with the proper name using Object.defineProperty
        const DynamicClasseBase = class extends Classe {
            public override name = config.className || className;
            public override icon = config.classIcon || '📄';
            
            public static parentProperty: FileProperty | MultiFileProperty | ObjectProperty;
            public static subClassesProperty: SubClassProperty;
            public static override Properties: { [key: string]: Property } = {};

            constructor(vault: any, file?: any, data?: any) {
                super(vault, file, data);
                
                // Initialize instance properties from static configuration
                this.properties = [];
                for (const [key, property] of Object.entries(DynamicClasseBase.Properties)) {
                    this.properties.push(property);
                }
            }

            static getConstructor(): typeof DynamicClasseBase {
                return DynamicClasseBase;
            }

            getConstructor(): typeof DynamicClasseBase {
                return DynamicClasseBase;
            }

            async populate(...args: any[]): Promise<void> {
                // Default implementation - can be overridden in config if needed
            }

            override async getDisplay(): Promise<any> {
                const container = document.createElement("div");
                
                if (config.display && config.display.items) {
                    await this.renderDisplayItems(container, config.display.items);
                } else {
                    // Default display: show all properties in columns
                    for (let property of this.getProperties()) {
                        container.appendChild(await property.getDisplay(this));
                    }
                }
                
                return container;
            }

            private async renderDisplayItems(container: HTMLElement, items: any[]): Promise<void> {
                for (const item of items) {
                    const element = await this.renderDisplayItem(item);
                    if (element) {
                        container.appendChild(element);
                    }
                }
            }

            private async renderDisplayItem(item: any): Promise<HTMLElement | null> {
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
                        return await this.renderTable(item);
                    
                    default:
                        console.warn(`Unknown display item type: ${item.type}`);
                        return null;
                }
            }

            private async renderProperty(item: any): Promise<HTMLElement | null> {
                const property = (this.constructor as typeof Classe).Properties[item.name];
                if (!property) {
                    console.warn(`Property not found: ${item.name}`);
                    return null;
                }
                
                const display = await property.getDisplay(this, {title: item.title, staticMode: item.static, displayMode: item.display});
                
                return display;
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
                
                button.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    await this.executeProcess(item.process);
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
                container.appendChild(foldContent);
                
                addFold(foldHeader, foldContent, this.vault.app);
                
                return container;
            }

            private async renderTable(item: any): Promise<HTMLElement> {
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
                
                if (item.source) {
                    // Get files based on source configuration
                    let files: Classe[] = [];
                    
                    switch (item.source.filter) {
                        case 'children':
                            // Get files where parent = current file
                            files = await (this as any).findChildren();
                            
                            // Filter by target class if specified
                            if (item.source.class) {
                                files = files.filter((child: Classe) => {
                                    const constructorName = child.constructor.name;
                                    const staticClassName = (child.constructor as any).className;
                                    return constructorName === item.source.class || 
                                           staticClassName === item.source.class;
                                });
                            }
                            break;
                        
                        case 'all':
                            // TODO: Get all instances of the class
                            console.warn('filter: all not yet implemented');
                            files = [];
                            break;
                        
                        default:
                            console.warn(`Unknown filter type: ${item.source.filter}`);
                            files = [];
                    }
                    
                    const tableConfig = {
                        source: item.source,
                        columns: item.columns,
                        totals: item.totals
                    };
                    const table = new DynamicTable(files, tableConfig, this.vault);
                    const tableElement = await table.getTable();
                    container.appendChild(tableElement);
                }
                
                return container;
            }

            private async executeProcess(processName: string): Promise<void> {
                if (!processName) {
                    console.warn('No process name specified for button');
                    return;
                }
                
                const processes = config.process || [];
                const process = processes.find(p => p.name === processName);
                
                if (!process) {
                    console.warn(`Process not found: ${processName}`);
                    return;
                }
                
                try {
                    const processManager = new ProcessManager(this.vault);
                    await processManager.execute(process, this);
                } catch (error) {
                    console.error(`Error executing process ${processName}:`, error);
                }
            }
            
            private getFormulaFunction(formula: string): (values: any[]) => any {
                switch (formula) {
                    case 'sum':
                        return (values) => values.reduce((a, b) => a + b, 0);
                    case 'average':
                    case 'avg':
                        return (values) => values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
                    case 'count':
                        return (values) => values.length;
                    case 'min':
                        return (values) => Math.min(...values);
                    case 'max':
                        return (values) => Math.max(...values);
                    default:
                        // For custom formulas, try to evaluate as JavaScript
                        try {
                            return new Function('values', `return ${formula}`) as (values: any[]) => any;
                        } catch (e) {
                            console.error(`Invalid formula: ${formula}`, e);
                            return (values) => 0;
                        }
                }
            }
        }

        // Initialize static properties from parent configuration
        // Support both single parent (legacy) and multiple parents (new)
        if (config.parents && Array.isArray(config.parents) && config.parents.length > 0) {
            // New format: multiple parents with fallback
            DynamicClasseBase.parentPropertyNames = config.parents.map((p: any) => p.property);
            // Use the folder from the first parent
            DynamicClasseBase.parentFolderName = config.parents[0].folder;
            console.log(`🔧 Propriétés parentes pour ${className}:`, DynamicClasseBase.parentPropertyNames);
        } else if (config.parent?.property) {
            // Legacy format: single parent
            DynamicClasseBase.parentPropertyName = config.parent.property;
            if (config.parent?.folder) {
                DynamicClasseBase.parentFolderName = config.parent.folder;
            }
            console.log(`🔧 Propriété parente pour ${className}:`, DynamicClasseBase.parentPropertyName);
        }
        
        console.log(`📁 Dossier parent pour ${className}:`, DynamicClasseBase.parentFolderName);
        
        console.log("Propriétés : ", config.properties);

        // Add default classe property if not already defined
        const classePropertyName = this.configLoader.vault?.app?.getSettings?.()?.classePropertyName || "Classe";
        if (!config.properties[classePropertyName]) {
            const classePropConfig: any = {
                type: "ClasseProperty",
                title: classePropertyName,
                defaultValue: className,
                icon: config.classIcon || '🏷️'
            };
            classePropConfig.propertyKey = classePropertyName;
            DynamicClasseBase.Properties[classePropertyName] = this.configLoader.createProperty(classePropConfig);
        }

        // Initialize all properties
        for (const [key, propConfig] of Object.entries(config.properties)) {
                // Pass the key as propertyKey so it becomes the property name
                (propConfig as any).propertyKey = key;
                DynamicClasseBase.Properties[key] = this.configLoader.createProperty(propConfig);
        }

        // Set the class name to match the configuration
        Object.defineProperty(DynamicClasseBase, 'name', { value: className });

        this.loadedClasses.set(className, DynamicClasseBase);
        return DynamicClasseBase;
    }

    /**
     * Get class configuration for display purposes
     */
    async getClassConfig(className: string): Promise<ClassConfig> {
        return await this.configLoader.loadClassConfig(className);
    }

    /**
     * Load data from JSON file for a class
     */
    async loadClassData(className: string): Promise<any[]> {
        return await this.configLoader.loadClassData(className);
    }

    /**
     * Get all available class names
     */
    async getAvailableClasses(): Promise<string[]> {
        return await this.configLoader.getAllClassNames();
    }

    /**
     * Get extended classes including inheritance
     */
    async getExtendedClasses(baseClasses: string[], availableClasses: string[]): Promise<string[]> {
        return await this.configLoader.getExtendedClasses(baseClasses, availableClasses);
    }

    /**
     * Clear the cache and reload configurations
     */
    clearCache(): void {
        this.loadedClasses.clear();
    }
}