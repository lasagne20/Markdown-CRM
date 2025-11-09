import { Classe } from '../vault/Classe.js';
import { ConfigLoader } from './ConfigLoader.js';
export class ClassConfigManager {
    constructor(configPath, vault) {
        this.loadedClasses = new Map();
        this.configLoader = new ConfigLoader(configPath, vault);
    }
    /**
     * Create a dynamic Classe from configuration
     */
    async createDynamicClasse(className) {
        if (this.loadedClasses.has(className)) {
            return this.loadedClasses.get(className);
        }
        const config = await this.configLoader.loadClassConfig(className);
        console.log(`📋 Configuration chargée pour ${className}:`, JSON.stringify(config, null, 2));
        class DynamicClasse extends Classe {
            constructor(vault, file, data) {
                super(vault, file, data);
                this.name = config.className || className;
                this.icon = config.classIcon || '📄';
                // Initialize instance properties from static configuration
                this.properties = [];
                for (const [key, property] of Object.entries(DynamicClasse.Properties)) {
                    this.properties.push(property);
                }
            }
            static getConstructor() {
                return DynamicClasse;
            }
            getConstructor() {
                return DynamicClasse;
            }
            async populate(...args) {
                // Default implementation - can be overridden in config if needed
            }
            async getTopDisplayContent() {
                const container = document.createElement("div");
                if (config.display && config.display.containers) {
                    for (const containerConfig of config.display.containers) {
                        const displayContainer = await this.createDisplayContainer(containerConfig);
                        container.appendChild(displayContainer);
                    }
                }
                else {
                    // Default display: show all properties
                    const properties = document.createElement("div");
                    for (let property of this.getProperties()) {
                        properties.appendChild(await property.getDisplay(this));
                    }
                    container.appendChild(properties);
                }
                return container;
            }
            async createDisplayContainer(containerConfig) {
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
        DynamicClasse.Properties = {};
        // Initialize static properties
        if (config.parentProperty) {
            DynamicClasse.parentProperty = this.configLoader.createProperty(config.parentProperty);
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
    async getClassConfig(className) {
        return await this.configLoader.loadClassConfig(className);
    }
    /**
     * Get all available class names
     */
    async getAvailableClasses() {
        return await this.configLoader.getAllClassNames();
    }
    /**
     * Clear the cache and reload configurations
     */
    clearCache() {
        this.loadedClasses.clear();
    }
}
