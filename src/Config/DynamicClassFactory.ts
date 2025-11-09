import { Classe } from '../vault/Classe';
import { Vault } from '../vault/Vault';
import { ClassConfigManager } from './ClassConfigManager';

export class DynamicClassFactory {
    private configManager: ClassConfigManager;
    private classRegistry: Map<string, typeof Classe> = new Map();

    constructor(configPath: string, vault: Vault) {
        this.configManager = new ClassConfigManager(configPath, vault);
    }

    /**
     * Get or create a dynamic class by name
     */
    async getClass(className: string): Promise<typeof Classe> {
        if (this.classRegistry.has(className)) {
            return this.classRegistry.get(className)!;
        }

        const dynamicClass = await this.configManager.createDynamicClasse(className);
        this.classRegistry.set(className, dynamicClass);
        return dynamicClass;
    }

    /**
     * Create an instance of a class from a file
     */
    async createInstance(className: string, app: any, vault: Vault, file: any): Promise<Classe> {
        const ClassConstructor = await this.getClass(className);
        const instance = new ClassConstructor(vault, file);
        
        // Attacher la configuration d'affichage à l'instance
        try {
            const config = await this.configManager.getClassConfig(className);
            instance.displayConfig = config;
        } catch (error) {
            console.warn(`Could not load display config for ${className}:`, error);
        }
        
        return instance;
    }

    /**
     * Get all available class names
     */
    async getAvailableClasses(): Promise<string[]> {
        return await this.configManager.getAvailableClasses();
    }

    /**
     * Clear cache and reload configurations
     */
    clearCache(): void {
        this.configManager.clearCache();
        this.classRegistry.clear();
    }

}