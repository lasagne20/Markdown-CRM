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
import { DisplayRenderer } from '../display/DisplayRenderer';


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
                    // Utiliser DisplayRenderer pour rendre l'affichage
                    const renderer = new DisplayRenderer(
                        this.vault,
                        DynamicClasseBase.Properties,
                        this
                    );
                    await renderer.renderDisplayItems(container, config.display.items);
                } else {
                    // Default display: show all properties in columns
                    for (let property of this.getProperties()) {
                        container.appendChild(await property.getDisplay(this));
                    }
                }
                
                return container;
            }

            async executeProcess(processName: string): Promise<void> {
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