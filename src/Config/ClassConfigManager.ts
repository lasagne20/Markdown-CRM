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
        
        class DynamicClasse extends Classe {
            public override name = config.className || className;
            public override icon = config.classIcon || '📄';
            
            public static parentProperty: FileProperty | MultiFileProperty | ObjectProperty;
            public static subClassesProperty: SubClassProperty;
            public static override Properties: { [key: string]: Property } = {};

            constructor(vault: any, file?: any, data?: any) {
                super(vault, file, data);
                
                // Initialize instance properties from static configuration
                this.properties = [];
                for (const [key, property] of Object.entries(DynamicClasse.Properties)) {
                    this.properties.push(property);
                }
            }

            static getConstructor(): typeof DynamicClasse {
                return DynamicClasse;
            }

            getConstructor(): typeof DynamicClasse {
                return DynamicClasse;
            }

            async populate(...args: any[]): Promise<void> {
                // Default implementation - can be overridden in config if needed
            }

            override async getDisplay(): Promise<any> {
                const container = document.createElement("div");
                
                if (config.display && config.display.containers) {
                    for (const containerConfig of config.display.containers) {
                        const displayContainer = await this.createDisplayContainer(containerConfig);
                        container.appendChild(displayContainer);
                    }
                } else {
                    // Default display: show all properties
                    const properties = document.createElement("div");
                    for (let property of this.getProperties()) {
                        properties.appendChild(await property.getDisplay(this));
                    }
                    container.appendChild(properties);
                }
                
                return container;
            }

            private async createDisplayContainer(containerConfig: DisplayContainer): Promise<HTMLElement> {
                const wrapper = document.createElement("div");
                wrapper.classList.add("display-container-wrapper");
                
                // Add title above the container
                if (containerConfig.title) {
                    const title = document.createElement("h3");
                    title.textContent = containerConfig.title;
                    title.classList.add("container-section-title");
                    wrapper.appendChild(title);
                }
                
                const container = document.createElement("div");
                
                if (containerConfig.className) {
                    container.classList.add(containerConfig.className);
                }
                
                // Handle different container types
                switch (containerConfig.type) {
                    case 'line':
                        container.classList.add("metadata-line");
                        await this.addPropertiesToContainer(container, containerConfig.properties);
                        break;
                        
                    case 'column':
                        container.classList.add("metadata-column");
                        await this.addPropertiesToContainer(container, containerConfig.properties);
                        break;
                        
                    case 'tabs':
                        await this.createTabsContainer(container, containerConfig);
                        break;
                        
                    case 'fold':
                        await this.createFoldContainer(container, containerConfig);
                        break;
                    
                    case 'table':
                        await this.createTableContainer(container, containerConfig, this);
                        break;
                        
                    default:
                        await this.addPropertiesToContainer(container, containerConfig.properties);
                        break;
                }
                
                wrapper.appendChild(container);
                return wrapper;
            }
            
            private async addPropertiesToContainer(container: HTMLElement, propertyNames?: string[]): Promise<void> {
                if (propertyNames) {
                    for (const propName of propertyNames) {
                        const property = this.getProperty(propName);
                        if (property) {
                            container.appendChild(await property.getDisplay(this));
                        }
                    }
                }
            }
            
            private async createTabsContainer(container: HTMLElement, containerConfig: DisplayContainer): Promise<void> {
                if (!containerConfig.tabs || containerConfig.tabs.length === 0) return;
                
                container.classList.add("metadata-tabs-container");
                
                // Create tab headers
                const tabHeaders = document.createElement("div");
                tabHeaders.classList.add("tab-headers");
                container.appendChild(tabHeaders);
                
                // Create tab contents
                const tabContents = document.createElement("div");
                tabContents.classList.add("tab-contents");
                container.appendChild(tabContents);
                
                // Create each tab
                for (let i = 0; i < containerConfig.tabs.length; i++) {
                    const tabConfig = containerConfig.tabs[i];
                    
                    // Create tab header
                    const tabHeader = document.createElement("button");
                    tabHeader.textContent = tabConfig.name;
                    tabHeader.classList.add("tab-header");
                    if (i === 0) tabHeader.classList.add("active");
                    tabHeader.dataset.tabIndex = i.toString();
                    tabHeaders.appendChild(tabHeader);
                    
                    // Create tab content
                    const tabContent = document.createElement("div");
                    tabContent.classList.add("tab-content");
                    if (i === 0) tabContent.classList.add("active");
                    tabContent.dataset.tabIndex = i.toString();
                    
                    // Add properties to tab
                    await this.addPropertiesToContainer(tabContent, tabConfig.properties);
                    tabContents.appendChild(tabContent);
                    
                    // Add click handler
                    tabHeader.addEventListener("click", () => {
                        // Remove active from all tabs
                        tabHeaders.querySelectorAll(".tab-header").forEach(h => h.classList.remove("active"));
                        tabContents.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
                        
                        // Add active to clicked tab
                        tabHeader.classList.add("active");
                        tabContent.classList.add("active");
                    });
                }
            }
            
            private async createFoldContainer(container: HTMLElement, containerConfig: DisplayContainer): Promise<void> {
                container.classList.add("metadata-fold-container");
                
                // Create fold header (clickable)
                const foldHeader = document.createElement("button");
                foldHeader.textContent = containerConfig.foldTitle || "Afficher plus";
                foldHeader.classList.add("fold-header");
                container.appendChild(foldHeader);
                
                // Create fold content (collapsible)
                const foldContent = document.createElement("div");
                foldContent.classList.add("fold-content");
                foldContent.classList.add("collapsed"); // Start collapsed
                
                // Add properties to fold
                await this.addPropertiesToContainer(foldContent, containerConfig.properties);
                container.appendChild(foldContent);
                
                // Add click handler to toggle
                foldHeader.addEventListener("click", () => {
                    foldContent.classList.toggle("collapsed");
                    foldHeader.classList.toggle("expanded");
                });
            }
            
            private async createTableContainer(container: HTMLElement, containerConfig: DisplayContainer, instance: Classe): Promise<void> {
                if (!containerConfig.source) {
                    console.error('Table container requires a source configuration');
                    return;
                }
                
                container.classList.add("metadata-table-container");
                
                // Get files based on filter
                const files = await this.getFilesForTable(containerConfig.source, instance);
                
                // Create table container
                const tableContainer = document.createElement('div');
                tableContainer.className = 'data-table-container';
                
                if (files.length === 0) {
                    const emptyState = document.createElement('div');
                    emptyState.className = 'data-table-empty';
                    emptyState.textContent = `Aucun(e) ${containerConfig.source.class} trouvé(e)`;
                    tableContainer.appendChild(emptyState);
                    container.appendChild(tableContainer);
                    return;
                }
                
                // Use DynamicTable class to create and configure the table
                const dynamicTable = new DynamicTable(files, containerConfig, this.vault);
                const table = dynamicTable.getTable();
                
                tableContainer.appendChild(table);
                container.appendChild(tableContainer);
            }
            
            private async getFilesForTable(source: any, instance: Classe): Promise<Classe[]> {
                // Get the target class from the vault's dynamicClassFactory
                let targetClassConstructor: typeof Classe;
                try {
                    targetClassConstructor = await this.vault.getClasseFromName(source.class) as typeof Classe;
                } catch (error) {
                    console.error(`Class ${source.class} not found:`, error);
                    return [];
                }
                
                switch (source.filter) {
                    case 'all':
                        // Get all instances of the class
                        console.warn('filter: all not yet implemented');
                        return [];
                    
                    case 'children':
                        // Get files where parent = current file
                        const children = await (instance as any).findChildren();
                        
                        // Filter by target class if specified
                        if (source.class) {
                            const filtered = children.filter((child: Classe) => {
                                const constructorName = child.constructor.name;
                                const staticClassName = (child.constructor as any).className;
                                const instanceClassName = (child as any).className;
                                const childName = child.getName();
                                
                                // Try multiple ways to match the class
                                return constructorName === source.class || 
                                       staticClassName === source.class ||
                                       instanceClassName === source.class ||
                                       childName === source.class ||
                                       (child as any).name === source.class;
                            });
                            return filtered;
                        }
                        
                        return children;
                    
                    case 'parent':
                        // Get the parent file
                        const parentFile = await (instance as any).getParentFile();
                        return parentFile ? [parentFile as any] : [];
                    
                    case 'siblings':
                        // Get files with the same parent
                        const parent = await (instance as any).getParentFile();
                        if (!parent) return [];
                        console.warn('filter: siblings not yet fully implemented');
                        return [];
                    
                    case 'roots':
                        // Get files without a parent
                        console.warn('filter: roots not yet implemented');
                        return [];
                    
                    default:
                        return [];
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
        if (config.parent?.property) {
            DynamicClasse.parentPropertyName = config.parent.property;
        }
        
        if (config.parent?.folder) {
            DynamicClasse.parentFolderName = config.parent.folder;
        }

        console.log(`🔧 Propriété parente pour ${className}:`, DynamicClasse.parentPropertyName);
        console.log(`📁 Dossier parent pour ${className}:`, DynamicClasse.parentFolderName);
        console.log("Propriétés : ", config.properties);

        // Initialize all properties
        for (const [key, propConfig] of Object.entries(config.properties)) {
                DynamicClasse.Properties[key] = this.configLoader.createProperty(propConfig);
        }

        this.loadedClasses.set(className, DynamicClasse);
        return DynamicClasse;
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
     * Clear the cache and reload configurations
     */
    clearCache(): void {
        this.loadedClasses.clear();
    }
}