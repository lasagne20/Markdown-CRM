import { Classe } from '../vault/Classe';
import { Vault } from '../vault/Vault';
import { FileProperty } from '../properties/FileProperty';
import { MultiFileProperty } from '../properties/MultiFileProperty';
import { ObjectProperty } from '../properties/ObjectProperty';
import { Property } from '../properties/Property';
import { SubClassProperty } from '../properties/SubClassProperty';
import { ConfigLoader } from './ConfigLoader';
import { ClassConfig, DisplayContainer } from './interfaces';

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
        console.log(`📋 Configuration chargée pour ${className}:`, JSON.stringify(config, null, 2));
        
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

            async getTopDisplayContent(): Promise<any> {
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
                const container = document.createElement("div");
                
                if (containerConfig.className) {
                    container.classList.add(containerConfig.className);
                }
                
                // Add CSS class based on container type
                switch (containerConfig.type) {
                    case 'line':
                        container.classList.add("metadata-line");
                        break;
                    case 'column':
                        container.classList.add("metadata-column");
                        break;
                }
                
                if (containerConfig.title) {
                    const title = document.createElement("div");
                    title.textContent = containerConfig.title;
                    title.classList.add("metadata-title");
                    container.appendChild(title);
                }
                
                // Add properties to container
                if (containerConfig.properties) {
                    for (const propName of containerConfig.properties) {
                        const property = this.getProperty(propName);
                        if (property) {
                            container.appendChild(await property.getDisplay(this));
                        }
                    }
                }
                
                return container;
            }
        }

        // Initialize static properties
        if (config.parentProperty) {
            DynamicClasse.parentProperty = this.configLoader.createProperty(config.parentProperty) as FileProperty | MultiFileProperty | ObjectProperty;
        }

        console.log(`🔧 Propriété parente pour ${className}:`, DynamicClasse.parentProperty);
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