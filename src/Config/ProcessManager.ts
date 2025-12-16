import { Classe } from '../vault/Classe';
import { Vault } from '../vault/Vault';
import { ConditionManager, Condition } from './ConditionManager';
import { ClassConfig } from './interfaces';
import { Data } from '../vault/Data';
import { IFile } from '../interfaces/IApp';

/**
 * Process trigger types
 */
export type ProcessTrigger = 'onCreate' | 'onUpdate' | 'onDelete' | 'onPropertyChange';

/**
 * Base action interface
 */
interface BaseAction {
    type: string;
}

/**
 * Update class action - changes the class of an instance
 */
export interface UpdateClassAction extends BaseAction {
    type: 'UpdateClassAction';
    newClass: string;
}

/**
 * Create file action - creates a new file
 */
export interface CreateFileAction extends BaseAction {
    type: 'CreateFileAction';
    className: string;
    name?: string;
    properties?: { [key: string]: any };
    parent?: string; // Property name to use as parent
}

/**
 * Rename file action - renames the file based on a template
 */
export interface RenameFileAction extends BaseAction {
    type: 'RenameFileAction';
    template: string; // Template like "{current} - {property}"
}

/**
 * Union type for all actions
 */
export type ProcessAction = UpdateClassAction | CreateFileAction | RenameFileAction;

/**
 * Process configuration
 */
export interface ProcessConfig {
    name: string;
    description?: string;
    triggers?: ProcessTrigger[];
    conditions: Condition[];
    actions: ProcessAction[];
}

/**
 * ProcessManager handles execution of configured processes
 */
export class ProcessManager {
    private conditionManager: ConditionManager;
    private vault: Vault;
    private configCache: Map<string, ClassConfig> = new Map();

    constructor(vault: Vault) {
        this.vault = vault;
        this.conditionManager = new ConditionManager();
    }

    /**
     * Load and cache class configuration
     * @param className Name of the class
     * @returns Class configuration or null if not found
     */
    private async getClassConfig(className: string): Promise<ClassConfig | null> {
        // Check cache first
        if (this.configCache.has(className)) {
            return this.configCache.get(className)!;
        }

        // Load from factory
        const factory = this.vault.getDynamicClassFactory();
        if (!factory) {
            return null;
        }

        const config = await factory.getClassConfig(className);
        if (config) {
            this.configCache.set(className, config);
        }

        return config;
    }

    /**
     * Clear cached configuration for a class (useful when config changes)
     * @param className Name of the class to clear, or undefined to clear all
     */
    public clearCache(className?: string): void {
        if (className) {
            this.configCache.delete(className);
        } else {
            this.configCache.clear();
        }
    }

    /**
     * Run all processes for a class instance
     * @param className Name of the class
     * @param instance Instance to run processes on
     * @param trigger Trigger type (onCreate, onUpdate, onPropertyChange, etc.)
     * @param changedProperty Optional property name that changed (for onPropertyChange)
     */
    async runProcesses(
        className: string,
        instance: Classe,
        trigger: ProcessTrigger = 'onUpdate',
        changedProperty?: string
    ): Promise<void> {
        // Load class configuration
        const classConfig = await this.getClassConfig(className);
        if (!classConfig || !classConfig.process || classConfig.process.length === 0) {
            return; // No processes configured
        }

        console.log(`🔄 Running processes for trigger: ${trigger}`, changedProperty ? `(property: ${changedProperty})` : '');

        // Execute each process in order
        for (const processConfig of classConfig.process) {
            try {
                await this.runProcess(processConfig, instance, trigger, changedProperty);
            } catch (error) {
                console.error(`❌ Error executing process ${processConfig.name}:`, error);
                // Continue with next process even if one fails
            }
        }
    }

    /**
     * Run a single process
     */
    private async runProcess(
        processConfig: ProcessConfig,
        instance: Classe,
        trigger: ProcessTrigger,
        changedProperty?: string
    ): Promise<void> {
        // Check if this process should run for this trigger
        const triggers = processConfig.triggers || ['onUpdate'];
        if (!triggers.includes(trigger)) {
            console.log(`⏭️  Skipping process ${processConfig.name} (trigger ${trigger} not in ${triggers.join(', ')})`);
            return;
        }

        // Evaluate conditions
        const conditionsMet = await this.conditionManager.evaluateConditions(
            processConfig.conditions,
            instance
        );

        if (!conditionsMet) {
            console.log(`⏭️  Skipping process ${processConfig.name} (conditions not met)`);
            return;
        }

        console.log(`✅ Process ${processConfig.name} conditions met, executing actions...`);

        // Execute all actions in order
        for (const action of processConfig.actions) {
            await this.executeAction(action, instance, changedProperty);
        }
    }

    /**
     * Execute a single action
     */
    private async executeAction(
        action: ProcessAction,
        instance: Classe,
        changedProperty?: string
    ): Promise<void> {
        console.log(`🎬 Executing action: ${action.type}`);

        switch (action.type) {
            case 'UpdateClassAction':
                await this.executeUpdateClassAction(action, instance);
                break;

            case 'CreateFileAction':
                await this.executeCreateFileAction(action, instance);
                break;

            case 'RenameFileAction':
                await this.executeRenameFileAction(action, instance);
                break;

            default:
                console.warn(`⚠️  Unknown action type: ${(action as any).type}`);
        }
    }

    /**
     * Execute UpdateClassAction - changes the class of an instance
     */
    private async executeUpdateClassAction(
        action: UpdateClassAction,
        instance: Classe
    ): Promise<void> {
        const file = instance.getFile();
        if (!file) {
            throw new Error('Instance has no file');
        }

        const currentClass = await file.getClassePropertyValue();
        const newClass = action.newClass;

        if (currentClass === newClass) {
            console.log(`ℹ️  Instance already has class ${newClass}, skipping`);
            return;
        }

        console.log(`🔄 Updating class from ${currentClass} to ${newClass}`);

        try {
            // Update the Classe property in the file metadata
            const settings = this.vault.app.getSettings();
            const classePropertyName = settings.classePropertyName || 'Classe';
            
            await file.updateMetadata(classePropertyName, newClass);
            
            console.log(`✅ Class updated successfully to ${newClass}`);
            
            // Update the Vault cache with a new instance of the correct class
            const filePath = file.getPath();
            const factory = this.vault.getDynamicClassFactory();
            
            if (factory && filePath) {
                try {
                    // Get the new class constructor
                    const newClassConstructor = await factory.getClass(newClass);
                    
                    if (newClassConstructor) {
                        // Load class data to check if this instance should have data populated
                        const configManager = factory.getConfigManager();
                        let dataObject: Data | null = null;
                        
                        if (configManager) {
                            try {
                                const classData = await configManager.loadClassData(newClass);
                                if (classData && classData.length > 0) {
                                    // Get the instance name from the file metadata
                                    const metadata = await this.vault.app.getMetadata(file as IFile);
                                    const instanceName = metadata?.nom || file.basename;
                                    
                                    // Find matching data entry by name
                                    const matchingData = classData.find((d: any) => d.nom === instanceName || d.name === instanceName);
                                    
                                    if (matchingData) {
                                        // Create a Data object with the matching data
                                        dataObject = new Data(instanceName);
                                        Object.assign(dataObject, matchingData);
                                        console.log(`📊 Loaded data for ${instanceName} from ${newClass} data file`);
                                        
                                        // Write data properties to file metadata
                                        const metadataUpdate: Record<string, any> = {};
                                        
                                        // Get class config to know which properties are defined
                                        const newClassConfig = await factory.getClassConfig(newClass);
                                        const definedProperties = newClassConfig?.properties ? Object.keys(newClassConfig.properties) : [];
                                        
                                        // Only write properties that are defined in the class config (exclude 'nom', 'name', 'type')
                                        for (const [key, value] of Object.entries(matchingData)) {
                                            if (key !== 'nom' && key !== 'name' && key !== 'type' && definedProperties.includes(key)) {
                                                metadataUpdate[key] = value;
                                            }
                                        }
                                        
                                        // Update file metadata with data properties
                                        if (Object.keys(metadataUpdate).length > 0) {
                                            await this.vault.app.updateMetadata(file as IFile, metadataUpdate);
                                            console.log(`📝 Updated file metadata with data properties:`, Object.keys(metadataUpdate));
                                        }
                                    }
                                }
                            } catch (error) {
                                // No data configured for this class, that's ok
                                console.log(`ℹ️  No data file configured for ${newClass}`, error);
                            }
                        }
                        
                        // Create new instance with the correct class type and data
                        const newInstance = new newClassConstructor(this.vault, file, dataObject || undefined);
                        
                        // Update the Vault cache
                        (this.vault as any).files[filePath] = newInstance;
                        
                        console.log(`✅ Vault cache updated with new ${newClass} instance`);
                    }
                } catch (error) {
                    console.warn(`⚠️  Could not update Vault cache:`, error);
                }
            }
            
            // Trigger display refresh since the class has changed
            this.vault.app.needDisplayRefresh();
        } catch (error) {
            console.error(`❌ Error updating class:`, error);
            throw error;
        }
    }

    /**
     * Execute CreateFileAction - creates a new file
     */
    private async executeCreateFileAction(
        action: CreateFileAction,
        instance: Classe
    ): Promise<void> {
        console.log(`📄 Creating new file of class ${action.className}`);

        try {
            // Get the class constructor
            const classConstructor = this.vault.getClasseFromName(action.className);
            if (!classConstructor) {
                throw new Error(`Class ${action.className} not found`);
            }

            // Determine file name
            let fileName = action.name;
            if (!fileName) {
                // Generate default name
                fileName = `New ${action.className}`;
            }

            // Prepare args
            const args: any = {};

            // Set parent if specified
            if (action.parent) {
                const parentProperty = instance.getProperty(action.parent);
                if (parentProperty) {
                    const parentValue = await parentProperty.read(instance);
                    if (parentValue) {
                        args.parent = await this.vault.getFromLink(parentValue);
                    }
                }
            }

            // Create the file
            const newFile = await this.vault.createFile(classConstructor, fileName, args);
            
            if (!newFile) {
                throw new Error('File creation returned null');
            }

            // Set properties if specified
            if (action.properties) {
                const newInstance = await this.vault.getFromFile(newFile);
                if (newInstance) {
                    for (const [propName, propValue] of Object.entries(action.properties)) {
                        await newInstance.updatePropertyValue(propName, propValue);
                    }
                }
            }

            console.log(`✅ File created successfully: ${newFile.path}`);
        } catch (error) {
            console.error(`❌ Error creating file:`, error);
            throw error;
        }
    }

    /**
     * Execute RenameFileAction - renames the file based on a template
     */
    private async executeRenameFileAction(
        action: RenameFileAction,
        instance: Classe
    ): Promise<void> {
        console.log(`📝 Renaming file with template: ${action.template}`);

        try {
            const file = instance.getFile();
            if (!file) {
                throw new Error('Instance has no file');
            }

            // Generate new filename from template
            const newFileName = await this.generateFileName(action.template, instance);
            if (!newFileName) {
                console.log(`⚠️ Cannot rename - filename generation failed`);
                return;
            }

            const currentPath = file.getPath();
            const currentFileName = file.basename;
            console.log(`📂 Current: "${currentFileName}" → New: "${newFileName}"`);

            // Don't rename if the name is already correct
            if (currentFileName === newFileName) {
                console.log(`✅ Filename already correct, skipping rename`);
                return;
            }

            // Build new path
            const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
            const newPath = `${parentPath}/${newFileName}.md`;
            console.log(`🎯 Target path: ${newPath}`);

            // Check if target file already exists (and it's not the same file)
            const targetExists = await this.vault.app.getFile(newPath);
            if (targetExists && targetExists.path !== currentPath) {
                console.warn(`❌ Cannot rename: file already exists at ${newPath}`);
                return;
            }

            // Rename the file
            console.log(`🔄 Moving file: ${currentPath} → ${newPath}`);
            await this.vault.app.move(file.getFile(), newPath);
            console.log(`✅ File moved successfully`);

            // Update internal file reference
            const newFile = await this.vault.app.getFile(newPath);
            if (newFile && !this.vault.app.isFolder(newFile as any)) {
                const fileInstance = new (await import('../vault/File')).File(this.vault, newFile as any);
                instance.setFile(fileInstance);
                console.log(`✅ File reference updated`);
            }
        } catch (error) {
            console.error(`❌ Error renaming file:`, error);
            throw error;
        }
    }

    /**
     * Generate filename from template
     * Replaces {propertyName} placeholders with property values
     * Supports {current} for current filename and {property.nested} for nested properties
     */
    private async generateFileName(template: string, instance: Classe): Promise<string | null> {
        const file = instance.getFile();
        if (!file) return null;

        console.log(`🎨 Generating filename from template: "${template}"`);
        const metadata = await instance.getMetadata();
        console.log(`📊 Metadata:`, metadata);
        let fileName = template;

        // Find all placeholders in the template
        const placeholderRegex = /\{([^}]+)\}/g;

        // Replace placeholders
        for (const match of Array.from(template.matchAll(placeholderRegex))) {
            const placeholder = match[1];
            let value: any;

            if (placeholder === 'current') {
                // Use current filename, but clean it from previous template applications
                value = file.basename;

                // Remove parts of the template that were already applied
                let cleanedCurrent = value;

                // Find position of {current} in template
                const currentIndex = template.indexOf('{current}');

                if (currentIndex > 0) {
                    // {current} has content BEFORE it - remove prefix
                    const prefixTemplate = template.substring(0, currentIndex);

                    // Convert template placeholders to regex patterns that match any value
                    let regexPattern = prefixTemplate
                        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
                        .replace(/\\\{[^}]+\\\}/g, '.+?'); // Replace {prop} with .+? (non-greedy any)

                    const match = value.match(new RegExp('^' + regexPattern + '(.*)$'));
                    if (match && match[1]) {
                        cleanedCurrent = match[1].trim();
                        console.log(`  🧹 Cleaned {current}: pattern "${prefixTemplate}" matched`);
                        console.log(`    "${value}" → "${cleanedCurrent}"`);
                    }
                } else if (currentIndex === 0) {
                    // {current} is at the START - remove suffix
                    const suffixIndex = template.indexOf('}', currentIndex) + 1;
                    if (suffixIndex < template.length) {
                        const suffixTemplate = template.substring(suffixIndex);

                        // Convert template placeholders to regex patterns
                        let regexPattern = suffixTemplate
                            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
                            .replace(/\\\{[^}]+\\\}/g, '.+?'); // Replace {prop} with .+? (non-greedy any)

                        const match = value.match(new RegExp('^(.*?)' + regexPattern + '$'));
                        if (match && match[1]) {
                            cleanedCurrent = match[1].trim();
                            console.log(`  🧹 Cleaned {current} at start: pattern "${suffixTemplate}" matched`);
                            console.log(`    "${value}" → "${cleanedCurrent}"`);
                        }
                    }
                }

                value = cleanedCurrent;
                console.log(`  🔄 {${placeholder}} = "${value}" (current filename)`);
            } else if (placeholder.includes('.')) {
                // Handle nested properties (e.g., "postes.poste")
                value = this.getNestedPropertyValue(metadata, placeholder);
                console.log(`  📦 {${placeholder}} = "${value}" (nested property)`);
            } else {
                // Simple property
                value = metadata[placeholder];
                console.log(`  📝 {${placeholder}} = "${value}" (simple property)`);
            }

            // If any required value is missing or empty, abort renaming
            if (value === undefined || value === null || value === '') {
                console.log(`  ❌ Missing or empty value for {${placeholder}}, aborting`);
                return null;
            }

            // Convert value to string and sanitize
            let stringValue: string;
            if (value instanceof Date) {
                stringValue = value.toISOString().split('T')[0]; // YYYY-MM-DD
            } else {
                stringValue = String(value);
            }
            fileName = fileName.replace(`{${placeholder}}`, stringValue);
            console.log(`  ✅ Replaced {${placeholder}} with "${stringValue}"`);
        }

        console.log(`🎯 Filename before sanitization: "${fileName}"`);
        // Sanitize the final filename
        const sanitized = this.sanitizeFileName(fileName);
        console.log(`✨ Final sanitized filename: "${sanitized}"`);
        return sanitized;
    }

    /**
     * Get nested property value using dot notation
     */
    private getNestedPropertyValue(metadata: Record<string, any>, path: string): any {
        const parts = path.split('.');
        let value: any = metadata;

        for (const part of parts) {
            if (value && typeof value === 'object' && part in value) {
                value = value[part];
            } else {
                return undefined;
            }
        }

        return value;
    }

    /**
     * Sanitize filename by removing invalid characters
     */
    private sanitizeFileName(name: string): string {
        return name.replace(/[<>:"/\\|?*]/g, '-').trim();
    }
}
