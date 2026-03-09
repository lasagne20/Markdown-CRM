import { Classe } from '../vault/Classe';
import { Vault } from '../vault/Vault';
import { ConditionManager, Condition } from './ConditionManager';
import { ClassConfig } from './interfaces';
import { Data } from '../vault/Data';
import { IFile } from '../interfaces/IApp';
import { TemplateEngine } from './TemplateEngine';

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
        this.conditionManager = new ConditionManager(vault);
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
     * Execute a process manually (e.g., from a button)
     */
    async execute(processConfig: ProcessConfig, instance: Classe): Promise<void> {
        console.log(`🔘 Manually executing process: ${processConfig.name}`);
        
        // Evaluate conditions (pass instance as currentDocument for context)
        const conditionsMet = await this.conditionManager.evaluateConditions(
            processConfig.conditions,
            instance,
            instance
        );

        if (!conditionsMet) {
            console.log(`⏭️  Process ${processConfig.name} conditions not met`);
            return;
        }

        console.log(`✅ Executing actions for process ${processConfig.name}...`);

        // Execute all actions in order
        for (const action of processConfig.actions) {
            await this.executeAction(action, instance, undefined);
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

        // Evaluate conditions (pass instance as currentDocument for context)
        const conditionsMet = await this.conditionManager.evaluateConditions(
            processConfig.conditions,
            instance,
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
            // Update the Classe property via the instance so updateParentFolder() runs
            const settings = this.vault.app.getSettings();
            const classePropertyName = settings.classePropertyName || 'Classe';
            
            await instance.updatePropertyValue(classePropertyName, newClass);
            
            console.log(`✅ Class updated successfully to ${newClass}`);
            
            // Update the Vault cache with a new instance of the correct class
            const filePath = file.getPath();
            const factory = this.vault.getDynamicClassFactory();
            
            if (factory && filePath) {
                try {
                    // Get the new class constructor
                    const newClassConstructor = await factory.getClass(newClass);
                    
                    // Update file metadata from data (if available)
                    await this.vault.updateFileFromData(file as IFile, newClass);
                    
                    // Create new instance with the correct class type
                    // Data will be loaded by the class constructor if needed
                    const newInstance = new newClassConstructor(this.vault, file);
                    
                    // Update the Vault cache
                    (this.vault as any).files[filePath] = newInstance;
                    
                    console.log(`✅ Vault cache updated with new ${newClass} instance`);
                } catch (error) {
                    console.warn(`⚠️  Could not update Vault cache:`, error);
                }
            }
            
            // Trigger display refresh only if this is the current file
            const currentFile = this.vault.app.getCurrentFile();
            if (currentFile && currentFile.path === filePath) {
                this.vault.app.needDisplayRefresh();
            }
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
            // Get the class constructor from dynamic factory
            const factory = this.vault.getDynamicClassFactory();
            if (!factory) {
                throw new Error('DynamicClassFactory not found');
            }
            
            const classConstructor = await factory.getClass(action.className);
            if (!classConstructor) {
                throw new Error(`Class ${action.className} not found`);
            }

            const file = instance.getFile();
            const currentName = file ? file.basename : '';

            // Process file name with placeholders
            let fileName = action.name || `New ${action.className}`;
            if (fileName.includes('{')) {
                const processedName = await TemplateEngine.processTemplateFromInstance(
                    fileName,
                    instance,
                    currentName
                );
                if (processedName) {
                    fileName = processedName;
                }
            }

            // Process all property values with placeholders
            const processedProperties: { [key: string]: any } = {};
            if (action.properties) {
                for (const [propName, propValue] of Object.entries(action.properties)) {
                    // Treat property values as template expressions
                    if (typeof propValue === 'string') {
                        processedProperties[propName] = await TemplateEngine.processTemplateFromInstance(
                            propValue,
                            instance,
                            currentName
                        );
                    } else {
                        processedProperties[propName] = propValue;
                    }
                }
            }

            // Prepare args with properties - Vault will handle populate and property updates
            const args: any = {};
            if (Object.keys(processedProperties).length > 0) {
                args.properties = processedProperties;
            }

            // Create the file - Vault will handle populate and property injection
            const newFile = await this.vault.createFile(classConstructor, fileName, args);
            
            if (!newFile) {
                throw new Error('File creation returned null');
            }

            // Open the newly created file
            await this.vault.app.open(newFile.path);

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
     * Uses TemplateEngine to replace placeholders with property values
     */
    private async generateFileName(template: string, instance: Classe): Promise<string | null> {
        const file = instance.getFile();
        if (!file) return null;

        // Process template using TemplateEngine
        const fileName = await TemplateEngine.processTemplateFromInstance(
            template,
            instance,
            file.basename // Current filename for {current} placeholder
        );

        if (!fileName) {
            return null;
        }

        // Sanitize the final filename
        const sanitized = this.sanitizeFileName(fileName);
        return sanitized;
    }

    /**
     * Sanitize filename by removing invalid characters
     */
    private sanitizeFileName(name: string): string {
        return name.replace(/[<>:"/\\|?*]/g, '-').trim();
    }
}
