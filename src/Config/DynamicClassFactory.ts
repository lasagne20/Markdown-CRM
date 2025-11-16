import { Classe } from '../vault/Classe';
import { Vault } from '../vault/Vault';
import { ClassConfigManager } from './ClassConfigManager';
import { File } from '../vault/File';
import { IFile, IFolder } from '../interfaces/IApp';

export class DynamicClassFactory {
    private configManager: ClassConfigManager;
    private classRegistry: Map<string, typeof Classe> = new Map();
    private dataWatchers: Map<string, NodeJS.Timeout> = new Map();
    private dataFileHashes: Map<string, string> = new Map();

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
     * Get class configuration by name
     */
    async getClassConfig(className: string) {
        return await this.configManager.getClassConfig(className);
    }

    /**
     * Public method to create a single instance from data
     * This is a convenience wrapper for the private createInstanceFromData method
     */
    async createInstanceFromDataObject(className: string, data: any, vault: Vault, allData?: any[]): Promise<Classe | null> {
        const ClassConstructor = await this.getClass(className);
        const config = await this.configManager.getClassConfig(className);
        
        // Handle parent creation if needed
        let parentInstance: Classe | null = null;
        if (data.parent && config.parent?.property) {
            // First, try to find parent in vault
            try {
                const parentLink = `[[${data.parent}]]`;
                const foundParent = await vault.getFromLink(parentLink);
                if (foundParent) {
                    parentInstance = foundParent;
                    console.log(`✅ Parent trouvé dans le vault: ${data.parent}`);
                }
            } catch (error) {
                console.log(`❌ Parent ${data.parent} non trouvé dans le vault`);
            }
            
            // If not found, we need to create the parent hierarchy
            if (!parentInstance) {
                console.log(`🔍 Recherche de ${data.parent} dans les données pour création...`);
                
                // Use provided data or load from config
                const classData = allData || await this.configManager.loadClassData(className);
                const parentData = classData.find((d: any) => (d.nom || d.name) === data.parent);
                
                if (parentData) {
                    console.log(`📦 Création du parent: ${data.parent}`);
                    // Recursively create the parent (which will create its parent, etc.)
                    // Pass allData to avoid reloading
                    parentInstance = await this.createInstanceFromDataObject(className, parentData, vault, classData);
                } else {
                    console.warn(`⚠️ Parent ${data.parent} non trouvé dans les données`);
                }
            }
        }
        
        return await this.createInstanceFromData(
            className,
            ClassConstructor,
            vault,
            config,
            data,
            parentInstance
        );
    }

    /**
     * Load data from JSON and create/update instances
     * This method will create files if they don't exist, or update properties if they do
     */
    async loadDataForClass(className: string, vault: Vault): Promise<Classe[]> {
        const data = await this.configManager.loadClassData(className);
        if (data.length === 0) {
            console.log(`No data to load for ${className}`);
            return [];
        }

        const ClassConstructor = await this.getClass(className);
        const config = await this.configManager.getClassConfig(className);
        const instances: Classe[] = [];
        
        // Create a map of parent instances by name for relationship resolution
        const instancesByName = new Map<string, Classe>();
        
        // First pass: Create all instances without parent relationships
        for (const item of data) {
            try {
                const instance = await this.createInstanceFromData(
                    className,
                    ClassConstructor,
                    vault,
                    config,
                    item,
                    null // No parent yet
                );
                
                if (instance) {
                    instances.push(instance);
                    instancesByName.set(item.nom || item.name, instance);
                }
            } catch (error) {
                console.error(`Failed to create instance for ${item.nom || item.name}:`, error);
            }
        }
        
        // Second pass: Establish parent relationships by updating metadata
        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            if (item.parent && config.parent?.property) {
                const instance = instances[i];
                
                // Look for parent instance in created instances first
                let parentInstance: Classe | null | undefined = instancesByName.get(item.parent);
                
                // If not found in created instances, search in vault
                if (!parentInstance) {
                    try {
                        const parentLink = `[[${item.parent}]]`;
                        const foundParent = await vault.getFromLink(parentLink);
                        parentInstance = foundParent || null;
                    } catch (error) {
                        console.log(`Parent ${item.parent} not found in vault, checking data...`);
                    }
                }
                
                // If still not found, check if parent exists in data and create it
                if (!parentInstance) {
                    const parentData = data.find((d: any) => (d.nom || d.name) === item.parent);
                    if (parentData) {
                        console.log(`Creating missing parent: ${item.parent}`);
                        
                        // Recursively create parent's parent if needed
                        let grandParentInstance: Classe | null = null;
                        if (parentData.parent) {
                            const grandParentData = data.find((d: any) => (d.nom || d.name) === parentData.parent);
                            if (grandParentData) {
                                grandParentInstance = await this.createInstanceFromData(
                                    className,
                                    ClassConstructor,
                                    vault,
                                    config,
                                    grandParentData,
                                    null
                                );
                                if (grandParentInstance) {
                                    instancesByName.set(parentData.parent, grandParentInstance);
                                }
                            }
                        }
                        
                        const createdParent = await this.createInstanceFromData(
                            className,
                            ClassConstructor,
                            vault,
                            config,
                            parentData,
                            grandParentInstance
                        );
                        if (createdParent) {
                            parentInstance = createdParent;
                            instancesByName.set(item.parent, createdParent);
                            
                            // Set the parent link for the newly created parent
                            if (grandParentInstance && config.parent?.property) {
                                const parentFile = createdParent.getFile();
                                const grandParentFile = grandParentInstance.getFile();
                                if (parentFile && grandParentFile && 'extension' in parentFile.file) {
                                    const metadata = await vault.app.getMetadata(parentFile.file as IFile);
                                    metadata[config.parent.property] = `[[${grandParentFile.getPath()}]]`;
                                    await vault.app.updateMetadata(parentFile.file as IFile, metadata);
                                }
                            }
                        }
                    }
                }
                
                if (parentInstance && instance && instance.getFile()) {
                    try {
                        // Update the metadata directly
                        const file = instance.getFile()!;
                        if (!('extension' in file.file)) {
                            continue; // Skip folders
                        }
                        
                        const parentFile = parentInstance.getFile();
                        
                        if (parentFile) {
                            // Store the parent file path as a wikilink
                            const parentLink = `[[${parentFile.getPath()}]]`;
                            const metadata = await vault.app.getMetadata(file.file as IFile);
                            metadata[config.parent.property] = parentLink;
                            await vault.app.updateMetadata(file.file as IFile, metadata);
                        }
                    } catch (error) {
                        console.error(`Failed to set parent for ${item.nom || item.name}:`, error);
                    }
                }
            }
        }
        
        return instances;
    }

    /**
     * Create a single instance from data object
     */
    private async createInstanceFromData(
        className: string,
        ClassConstructor: typeof Classe,
        vault: Vault,
        config: any,
        data: any,
        parentInstance: Classe | null
    ): Promise<Classe | null> {
        const name = data.nom || data.name;
        if (!name) {
            console.warn('Data item has no name property:', data);
            return null;
        }

        // Determine file path based on parent and folder configuration
        let folderPath = config.parent?.folder || className + 's';
        
        if (parentInstance && parentInstance.getFile()) {
            const parentFile = parentInstance.getFile();
            const parentPath = parentFile!.getPath(); // Ex: Lieux/France/France.md
            const parentFolder = parentPath.substring(0, parentPath.lastIndexOf('/')); // Ex: Lieux/France
            folderPath = `${parentFolder}/${name}`;
        } else {
            folderPath = `${folderPath}/${name}`;
        }

        const filePath = `${folderPath}/${name}.md`;
        
        // Check if file already exists
        let file = await vault.app.getFile(filePath);
        
        if (!file) {
            // Create minimal file WITHOUT frontmatter (saveFrontmatter will add it)
            const content = `# ${name}\n\n`;
            file = await vault.app.createFile(filePath, content);
            
            // Apply metadata using File's saveFrontmatter
            const fileInstance = new File(vault, file as IFile);
            
            // Extract frontmatter data (exclude parent and filter by defined properties)
            const frontmatter: Record<string, any> = {
                Classe: className // Always add the class name
            };
            const definedProperties = Object.keys(config.properties || {});
            
            for (const [key, value] of Object.entries(data)) {
                if (key === 'parent') continue;
                // Only include properties that are defined in the class configuration
                if (definedProperties.includes(key) || key === 'nom' || key === 'name') {
                    frontmatter[key] = value;
                }
            }
            
            // Add parent link if parent instance exists (BEFORE first save)
            if (parentInstance && config.parent?.property) {
                const parentFile = parentInstance.getFile();
                if (parentFile) {
                    const parentLink = `[[${parentFile.getPath()}]]`;
                    frontmatter[config.parent.property] = parentLink;
                }
            }
            
            // Save frontmatter only ONCE
            await fileInstance.saveFrontmatter(frontmatter);
        } else {
            // Update existing file metadata
            if ('extension' in file) {
                const metadata = await vault.app.getMetadata(file as IFile);
                let updated = false;
                const definedProperties = Object.keys(config.properties || {});
                
                // Update metadata fields from data
                for (const [key, value] of Object.entries(data)) {
                    if (key === 'parent' || key === 'nom' || key === 'name') continue;
                    
                    // Only update properties that are defined in the class configuration
                    if (!definedProperties.includes(key)) continue;
                    
                    // Only update if value has changed
                    if (metadata[key] !== value) {
                        metadata[key] = value;
                        updated = true;
                    }
                }
                
                if (updated) {
                    await vault.app.updateMetadata(file as IFile, metadata);
                }
            }
        }
        
        // Create instance - check if it's a file (not a folder)
        if (!('extension' in file)) {
            console.warn(`Path ${filePath} is not a file`);
            return null;
        }
        
        const instance = new ClassConstructor(vault, new File(vault, file as IFile));
        
        return instance;
    }

    /**
     * Setup automatic data reloading when JSON file changes
     */
    async setupDynamicDataReload(className: string, vault: Vault, onReload?: (instances: Classe[]) => void): Promise<void> {
        const config = await this.configManager.getClassConfig(className);
        
        if (!config.data || config.data.length === 0) {
            return;
        }

        for (const dataSource of config.data) {
            if (!dataSource.dynamic) {
                continue; // Skip non-dynamic data sources
            }

            const dataFilePath = `${this.configManager['configLoader']['configPath']}/${dataSource.file}`;
            const watchKey = `${className}:${dataSource.file}`;
            
            // Clear existing watcher if any
            if (this.dataWatchers.has(watchKey)) {
                clearInterval(this.dataWatchers.get(watchKey)!);
            }

            // Read initial hash
            try {
                const file = await vault.app.getFile(dataFilePath);
                if (file && 'extension' in file) {
                    const content = await vault.app.readFile(file as IFile);
                    this.dataFileHashes.set(watchKey, this.hashString(content));
                }
            } catch (error) {
                console.error(`Failed to read data file for watching: ${dataFilePath}`, error);
            }

            // Setup periodic check (every 2 seconds)
            const watcher = setInterval(async () => {
                try {
                    const file = await vault.app.getFile(dataFilePath);
                    if (file && 'extension' in file) {
                        const content = await vault.app.readFile(file as IFile);
                        const newHash = this.hashString(content);
                        const oldHash = this.dataFileHashes.get(watchKey);

                        if (oldHash && newHash !== oldHash) {
                            console.log(`🔄 Data file changed: ${dataSource.file}, reloading ${className}...`);
                            this.dataFileHashes.set(watchKey, newHash);
                            
                            // Reload data
                            const instances = await this.loadDataForClass(className, vault);
                            
                            if (onReload) {
                                onReload(instances);
                            }
                            
                            vault.app.sendNotice(`Rechargement des données pour ${className}: ${instances.length} instances`, 3000);
                        }
                    }
                } catch (error) {
                    console.error(`Error checking data file: ${dataFilePath}`, error);
                }
            }, 2000);

            this.dataWatchers.set(watchKey, watcher);
            console.log(`📡 Watching data file: ${dataSource.file} for ${className}`);
        }
    }

    /**
     * Stop watching data files for a class
     */
    stopDynamicDataReload(className: string): void {
        for (const [key, watcher] of this.dataWatchers.entries()) {
            if (key.startsWith(`${className}:`)) {
                clearInterval(watcher);
                this.dataWatchers.delete(key);
                this.dataFileHashes.delete(key);
                console.log(`📡 Stopped watching data for: ${className}`);
            }
        }
    }

    /**
     * Simple string hash function
     */
    private hashString(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(36);
    }

    /**
     * Get all available class names
     */
    async getAvailableClasses(): Promise<string[]> {
        return await this.configManager.getAvailableClasses();
    }
    
    /**
     * Get all instances of a specific class from the vault
     */
    async getAllInstancesForClass(className: string, vault: Vault): Promise<Classe[]> {
        try {
            const ClassConstructor = await this.getClass(className);
            const config = await this.configManager.getClassConfig(className);
            const instances: Classe[] = [];
            
            // Get the folder where files of this class are stored
            const folderPath = config.parent?.folder || className + 's';
            
            // Get all files in the vault
            const allFiles = await vault.app.listFiles();
            
            for (const file of allFiles) {
                if ('extension' in file && file.extension === 'md') {
                    // Check if file is of this class
                    const metadata = await vault.app.getMetadata(file as IFile);
                    if (metadata.Classe === className || metadata.classe === className) {
                        const fileInstance = new File(vault, file as IFile);
                        const instance = new ClassConstructor(vault, fileInstance);
                        instances.push(instance);
                    }
                }
            }
            console.log(`Found ${instances.length} instances of class ${className}`);
            return instances;
        } catch (error) {
            console.error(`Error getting instances for class ${className}:`, error);
            return [];
        }
    }

    /**
     * Clear cache and reload configurations
     */
    clearCache(): void {
        this.configManager.clearCache();
        this.classRegistry.clear();
    }

}