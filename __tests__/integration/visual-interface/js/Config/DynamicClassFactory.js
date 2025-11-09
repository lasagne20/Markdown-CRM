import { ClassConfigManager } from './ClassConfigManager.js';
export class DynamicClassFactory {
    constructor(configPath, vault) {
        this.classRegistry = new Map();
        this.configManager = new ClassConfigManager(configPath, vault);
    }
    /**
     * Get or create a dynamic class by name
     */
    async getClass(className) {
        if (this.classRegistry.has(className)) {
            return this.classRegistry.get(className);
        }
        const dynamicClass = await this.configManager.createDynamicClasse(className);
        this.classRegistry.set(className, dynamicClass);
        return dynamicClass;
    }
    /**
     * Create an instance of a class from a file
     */
    async createInstance(className, app, vault, file) {
        const ClassConstructor = await this.getClass(className);
        const instance = new ClassConstructor(vault, file);
        // Attacher la configuration d'affichage à l'instance
        try {
            const config = await this.configManager.getClassConfig(className);
            instance.displayConfig = config;
        }
        catch (error) {
            console.warn(`Could not load display config for ${className}:`, error);
        }
        return instance;
    }
    /**
     * Get all available class names
     */
    async getAvailableClasses() {
        return await this.configManager.getAvailableClasses();
    }
    /**
     * Clear cache and reload configurations
     */
    clearCache() {
        this.configManager.clearCache();
        this.classRegistry.clear();
    }
}
