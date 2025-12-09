import { IFile, IFolder } from '../interfaces/IApp';
import { Vault } from './Vault';
import { Property } from '../properties/Property';
import { File } from './File';
import { Data } from './Data';

export class Classe {
    protected static Properties: { [key: string]: Property } = {};
    public static parentPropertyName?: string;
    public static parentPropertyNames?: string[]; // Support multiple parent properties with fallback
    public static parentFolderName?: string; // Optional subfolder in parent where to place this file
    public static autoRename?: string; // Template for automatic file renaming
    protected properties: Property[] = [];
    protected file?: File;
    public name: string = '';
    public icon: string = '';
    public template?: string;
    public data : Data | null = null;
    public displayConfig : any = {};
    
    constructor(protected vault: Vault, file ? : File, data ? : Data) {
        if (file) {
            this.setFile(file);
        }
        if (data) {
            this.data = data;
        }
    }

    getName(): string{ 
      return this.name
    }
    
    getVault(): Vault {
        return this.vault;
    }
    
    // Property management
    addProperty(property: Property): void {
        this.properties.push(property);
    }
    
    getProperty(name: string): Property | undefined {
        return this.properties.find(p => p.name === name);
    }
    
    getProperties(): Property[] {
        return [...this.properties];
    }
    
    getAllProperties(): { [key: string]: Property } {
        const allProps: { [key: string]: Property } = {};
        for (const prop of this.properties) {
            allProps[prop.name] = prop;
        }
        return allProps;
    }
    
    // File operations
    setFile(file: File): void {
        // Ensure file is always a File instance, not just an IFile object
        if (!(file instanceof File)) {
            this.file = new File(this.vault, file as any);
        } else {
            this.file = file;
        }
        

    }
    
    getFile(): File | undefined {
        return this.file;
    }

    getPath(): string | undefined {
        return this.file?.getPath();
    }
    
    async update(): Promise<void> {
        if (!this.file) return;
        
        // Update metadata
        await this.updateAllPropertiesMetadata();
    }
    
    async validate(): Promise<boolean> {
        // Validate all properties
        for (const property of this.properties) {
            const value = await this.getPropertyValue(property.name);
            if (!property.validate(value)) {
                return false;
            }
        }
        return true;
    }
    
    protected async generateTemplateContent(): Promise<string> {
        if (!this.template) return '';
        
        try {
            return await this.vault.app.getTemplateContent(this.template);
        } catch (error) {
            console.warn(`Template ${this.template} not found`);
            return '';
        }
    }
    
    // Metadata operations
    async getMetadata(): Promise<Record<string, any>> {
        if (!this.file) return {};
        return await this.vault.app.getMetadata(this.file);
    }
    
    async updateMetadata(metadata: Record<string, any>): Promise<void> {
        if (!this.file) return;
        
        // Get old metadata and parent property before update
        const oldMetadata = await this.getMetadata();
        const oldParentProperty = await this.getParentProperty();
        
        // Update metadata first
        await this.vault.app.updateMetadata(this.file, metadata);
        
        // Let updateParentFolder decide if it needs to do anything
        await this.updateParentFolder(oldMetadata, oldParentProperty);

        await this.handleAutoRename();
    }
    
    async updatePropertyValue(propertyName: string, value: any): Promise<void> {
        if (!this.file) return;
        
        // Get old metadata and parent property before update
        const oldMetadata = await this.getMetadata();
        const oldParentProperty = await this.getParentProperty();
        
        // Update metadata first
        await this.file.updateMetadata(propertyName, value);
        
        // Let updateParentFolder decide if it needs to do anything
        await this.updateParentFolder(oldMetadata, oldParentProperty);
        
        // Handle automatic renaming if configured
        await this.handleAutoRename();
    }
    
    async getPropertyValue(propertyName: string): Promise<any> {
        const metadata = await this.getMetadata();
        return metadata[propertyName];
    }
    
    async setPropertyValue(propertyName: string, value: any): Promise<void> {
        const metadata = await this.getMetadata();
        metadata[propertyName] = value;
        await this.updateMetadata(metadata);
    }
    
    private async updateAllPropertiesMetadata(): Promise<void> {
        const metadata = await this.getMetadata();
        let hasChanges = false;
        
        for (const property of this.properties) {
            const currentValue = metadata[property.name];
            const validatedValue = property.validate(currentValue);
            
            if (validatedValue !== currentValue) {
                metadata[property.name] = validatedValue;
                hasChanges = true;
            }
        }
        
        if (hasChanges) {
            await this.updateMetadata(metadata);
        }
    }
    
    // Default Display methods
    async getDisplay(): Promise<HTMLElement> {
        const container = this.vault.app.createDiv('classe-display');
        console.log('Displaying class: ' + this.getName());
        
        // Add class header
        const header = this.vault.app.createDiv('classe-header');
        header.textContent = this.getName();
        if (this.icon) {
            this.vault.app.setIcon(header, this.icon);
        }
        container.appendChild(header);

        console.log('Adding properties to display for class: ' + this.getName());
        console.log('Number of properties: ' + this.properties.length);
        
        // Add properties - pass 'this' (the classe) instead of the file
        for (const property of this.properties) {
            const propertyDisplay = await property.getDisplay(this);
            container.appendChild(propertyDisplay);
        }
        
        return container;
    }
    
    // Factory method for creating instances
    static create(vault: Vault): Classe {
        throw new Error('Must implement create method in subclass');
    }
    
    // Utility methods
    protected sanitizeFileName(name: string): string {
        return name.replace(/[<>:"/\\|?*]/g, '-').trim();
    }
    
    /**
     * Handle automatic file renaming based on autoRename template
     */
    protected async handleAutoRename(): Promise<void> {
        const autoRenameTemplate = (this.constructor as typeof Classe).autoRename;
        console.log(`🔄 handleAutoRename called for ${this.file?.getPath()}`);
        console.log(`📋 autoRename template:`, autoRenameTemplate);
        
        if (!autoRenameTemplate || !this.file) {
            console.log(`⏭️ Skipping rename - template: ${!!autoRenameTemplate}, file: ${!!this.file}`);
            return;
        }
        
        console.log('🔍 Handling autoRename for file:', this.file.getPath());
        const newFileName = await this.generateAutoRenameFileName(autoRenameTemplate);
        console.log('📝 Generated new file name:', newFileName);
        
        if (!newFileName) {
            console.log(`⚠️ Cannot rename - new filename generation failed`);
            return;
        }
        
        const currentPath = this.file.getPath();
        const currentFileName = this.file.basename;
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
        try {
            console.log(`🔄 Moving file: ${currentPath} → ${newPath}`);
            await this.vault.app.move(this.file, newPath);
            console.log(`✅ File moved successfully`);
            
            // Update internal file reference
            const newFile = await this.vault.app.getFile(newPath);
            if (newFile && !this.vault.app.isFolder(newFile as IFile)) {
                this.setFile(new File(this.vault, newFile as IFile));
                console.log(`✅ File reference updated`);
            }
        } catch (error) {
            console.error('❌ Error renaming file:', error);
        }
    }
    
    /**
     * Generate the new filename based on the autoRename template
     * Replaces {propertyName} placeholders with property values
     * Supports {current} for current filename and {property.nested} for nested properties
     */
    protected async generateAutoRenameFileName(template: string): Promise<string | null> {
        if (!this.file) return null;
        
        console.log(`🎨 Generating filename from template: "${template}"`);
        const metadata = await this.getMetadata();
        console.log(`📊 Metadata:`, metadata);
        let fileName = template;
        
        // Find all placeholders in the template
        const placeholderRegex = /\{([^}]+)\}/g;
     
        // Second pass: replace placeholders
        for (const match of Array.from(template.matchAll(placeholderRegex))) {
            const placeholder = match[1];
            let value: any;
            
            if (placeholder === 'current') {
                // Use current filename, but clean it from previous template applications
                value = this.file.basename;
                
                // Remove parts of the template that were already applied
                // For example, if template is "{dateEntree} - {current}" and current is "2025-01-10 - Marie Dupont"
                // we want to extract just "Marie Dupont" by removing the prefix that matches the template pattern
                let cleanedCurrent = value;
                
                // Try to extract the clean part by removing the template pattern from the beginning
                // Build a regex pattern from the template part BEFORE {current}
                const currentIndex = template.indexOf('{current}');
                if (currentIndex > 0) {
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
     * e.g., "postes.poste" → metadata.postes.poste
     */
    protected getNestedPropertyValue(metadata: Record<string, any>, path: string): any {
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
    
    protected async ensureFolder(folderPath: string): Promise<void> {
        try {
            await this.vault.app.createFolder(folderPath);
        } catch (error) {
            // Folder might already exist, which is fine
        }
    }
    
    // Parent-child relationship management
    /**
     * Get the parent property if configured for this class
     * Returns the first parent property that has a non-empty value
     */
    protected async getParentProperty(): Promise<Property | undefined> {
        const className = (this.constructor as typeof Classe).name;
        const parentPropNames = (this.constructor as typeof Classe).parentPropertyNames;
        const parentPropName = (this.constructor as typeof Classe).parentPropertyName;
        
        // Try multiple parent properties if configured
        if (parentPropNames && parentPropNames.length > 0) {
            for (const propName of parentPropNames) {
                const prop = this.getProperty(propName);
                if (prop) {
                    // Check if the property has a non-empty value by trying to get parent file
                    // This delegates the "emptiness" check to the property itself
                    const value = await this.getPropertyValue(propName);
                    if (value && 'getParentFile' in prop && typeof (prop as any).getParentFile === 'function') {
                        const parentFile = await (prop as any).getParentFile(value);
                        if (parentFile) {
                            return prop; // This property has a valid parent file
                        }
                    } else if (value) {
                        // For non-parent properties, just check if value exists
                        return prop;
                    }
                }
            }
            return undefined;
        }
        
        // Fallback to single parent property
        if (!parentPropName) {
            return undefined;
        }
        
        return this.getProperty(parentPropName);
    }
    
    /**
     * Get the parent file from the parent property value
     * Tries multiple parent properties with fallback if configured
     */
    protected async getParentFile(): Promise<File | undefined> {
        const parentProperty = await this.getParentProperty();
        if (!parentProperty || !this.file) {
            return undefined;
        }
        
        const parentValue = await this.getPropertyValue(parentProperty.name);
        if (!parentValue) {
            return undefined;
        }
        
        // Delegate to the property's getParentFile method if available
        if ('getParentFile' in parentProperty && typeof (parentProperty as any).getParentFile === 'function') {
            return await (parentProperty as any).getParentFile(parentValue);
        }
        
        return undefined;
    }
    
 /**
     * Find all children of this file recursively
     * Supports two modes:
     * 1. If file has children property populated: use it directly (new approach)
     * 2. Otherwise: scan filesystem for files in dedicated folder (fallback for compatibility)
     */
    protected async findChildren(folder?: IFile | IFolder): Promise<Classe[]> {
        if (!this.file) {
            return [];
        }

        const children: Classe[] = [];
        
        // Mode 1: Use file.children if available (folder-file structure)
        const childrenToProcess = folder?.children || this.file.children;
        
        if (childrenToProcess && childrenToProcess.length > 0) {
            console.log(`🔍 Mode 1: Processing ${childrenToProcess.length} items`);
            await this.processChildrenRecursive(childrenToProcess, children);
            console.log(`✅ Mode 1: Found ${children.length} children`);
            return children;
        }
        
        // Mode 2: Fallback - scan filesystem (for backward compatibility with existing code)
        console.log(`🔍 Mode 2: Fallback filesystem scan`);
        const allFiles = await this.vault.app.listFiles();
        const thisFileBaseName = this.file.getName(false);
        const thisFilePath = this.file.getPath();
        
        // Determine if this file has a dedicated folder
        const thisFileFolder = this.file.getFolderPath();
        const thisFileFolderName = thisFileFolder.substring(thisFileFolder.lastIndexOf("/") + 1);
        const hasOwnFolder = thisFileFolderName === thisFileBaseName;
        const dedicatedFolderPath = hasOwnFolder ? thisFileFolder : `${thisFileFolder}/${thisFileBaseName}`;
        
        for (const file of allFiles) {
            // Skip the current file
            if (file.path === thisFilePath) {
                continue;
            }

            // Skip non-markdown files (config files, etc.)
            if (!file.path.endsWith('.md')) {
                continue;
            }

            const fileFolder = file.path.substring(0, file.path.lastIndexOf('/'));
            
            // Check if file is in our dedicated folder (or subdirectories)
            const isInDedicatedFolder = fileFolder === dedicatedFolderPath || fileFolder.startsWith(dedicatedFolderPath + '/');
            
            let isChild = false;
            
            if (isInDedicatedFolder) {
                // File is in dedicated folder - it's a child
                isChild = true;
            } else {
                // Check if file has a parent property pointing to this file
                try {
                    const childClasse = await this.vault.createClasse(file);
                    if (childClasse) {
                        const metadata = await this.vault.app.getMetadata(file);
                        const childProperties = childClasse.getProperties();
                        
                        for (const property of childProperties) {
                            if (property.type !== 'file') continue;
                            
                            const propValue = metadata?.[property.name];
                            if (!propValue || typeof propValue !== 'string') continue;
                            
                            const linkMatch = propValue.match(/\[\[([^\]|]+)/);
                            if (linkMatch?.[1]) {
                                const parentLink = linkMatch[1].trim().replace('.md', '');
                                const parentBaseName = parentLink.includes('/') 
                                    ? parentLink.split('/').pop()?.replace('.md', '') || ''
                                    : parentLink;
                                
                                if (parentBaseName === thisFileBaseName) {
                                    isChild = true;
                                    break;
                                }
                            }
                        }
                    }
                } catch (e) {
                    // Can't create classe, skip this file
                }
            }
            
            if (isChild) {
                try {
                    const childClasse = await this.vault.createClasse(file);
                    if (childClasse) {
                        children.push(childClasse);
                    }
                } catch (e) {
                    // Skip files that can't be loaded as classes
                }
            }
        }
        
        return children;
    }


        
    /**
     * Helper method to recursively process children array without infinite loops
     */
    private async processChildrenRecursive(items: (IFile | IFolder)[], result: Classe[]): Promise<void> {
        for (const item of items) {
            // Check if it's a file (has basename and extension)
            if ('basename' in item && 'extension' in item) {
                // Skip non-markdown files
                const file = item as IFile;
                if (!file.path.endsWith('.md')) {
                    continue;
                }
                
                // It's a file - try to create a Classe from it
                try {
                    const classe = await this.vault.getFromFile(file);
                    if (classe) {
                        result.push(classe);
                    }
                } catch (e) {
                    // Skip files that can't be loaded as classes
                }
            } else {
                // It's a folder - process its children if available
                const folder = item as IFolder;
                if (folder.children && folder.children.length > 0) {
                    await this.processChildrenRecursive(folder.children, result);
                }
            }
        }
    }

    /**
     * Move children files to the target folder recursively
     * If a child has its own children, create a dedicated subfolder for it
     */
    protected async moveChildrenToFolder(targetFolderPath: string): Promise<void> {
        const children = await this.findChildren();
        
        for (const child of children) {
            const childFile = child.getFile();
            if (!childFile) {
                continue;
            }

            const childBaseName = childFile.getName(false);
            
            // Check if this child has its own children
            const grandchildren = await child.findChildren();
            const hasGrandchildren = grandchildren.length > 0;
            
            let childTargetFolder: string;
            
            if (hasGrandchildren) {
                // Child has children, needs its own dedicated folder
                childTargetFolder = `${targetFolderPath}/${childBaseName}`;
                
                // Ensure the dedicated folder exists
                const dedicatedFolder = await this.vault.app.getFile(childTargetFolder);
                if (!dedicatedFolder) {
                    await this.ensureFolder(childTargetFolder);
                }
            } else {
                // Child has no children, put it directly in target folder
                childTargetFolder = targetFolderPath;
            }
            
            const currentChildFolder = childFile.getFolderPath();
            
            // Only move if not already in correct folder
            if (currentChildFolder !== childTargetFolder) {
                await childFile.move(childTargetFolder, childFile.getName());
                
                // Reload the child's file object
                const newFilePath = `${childTargetFolder}/${childFile.getName()}`;
                const reloadedFile = await this.vault.app.getFile(newFilePath);
                if (reloadedFile && 'extension' in reloadedFile) {
                    child.setFile(new File(this.vault, reloadedFile as IFile));
                }

                // Recursively move this child's children to its folder
                await child.moveChildrenToFolder(childTargetFolder);
            } else {
                // Even if already in folder, check its children
                await child.moveChildrenToFolder(childTargetFolder);
            }
        }
    }
    
    /**
     * Update the parent folder structure for this file
     * - If parent doesn't have a folder, create one with parent's name
     * - Move parent file into its folder
     * - Move this (child) file into parent's folder
     * - Recursively move all children of this file to the parent's folder
     */
    protected async updateParentFolder(oldMetadata?: Record<string, any>, oldParentProperty?: Property): Promise<void> {
        if (!this.file) {
            return;
        }
        // If called with old values, check if we actually need to update
        if (oldMetadata && oldParentProperty !== undefined) {
            const currentParentProperty = await this.getParentProperty();
            
            // Case 1: Parent property changed (e.g., from postes to institution)
            if (oldParentProperty?.name !== currentParentProperty?.name) {
                console.log(`🔄 Parent property changed from "${oldParentProperty?.name}" to "${currentParentProperty?.name}"`);
                // Continue with folder update
            }
            // Case 2: Same parent property, check if value changed
            else if (currentParentProperty) {
                const currentMetadata = await this.getMetadata();
                const oldValue = oldMetadata[currentParentProperty.name];
                const newValue = currentMetadata[currentParentProperty.name];
                
                if (oldValue === newValue) {
                    // No change, skip update
                    console.log(`⏭️ Parent property "${currentParentProperty.name}" unchanged, skipping folder update`);
                    return;
                }
                
                // Value changed, verify it's actually valid before moving
                if ('getParentFile' in currentParentProperty && typeof (currentParentProperty as any).getParentFile === 'function') {
                    const parentFile = await (currentParentProperty as any).getParentFile(newValue);
                    if (!parentFile) {
                        console.log(`⚠️ New parent value is empty/invalid, skipping folder update`);
                        return;
                    }
                    console.log(`✅ Parent property "${currentParentProperty.name}" value changed and is valid`);
                }
            } else {
                // No parent property, nothing to do
                return;
            }
        }
        
        const parentFile = await this.getParentFile();
        if (!parentFile) {
            // No parent configured or found
            return;
        }
        
        const parentFolderPath = parentFile.getFolderPath();
        const parentBaseName = parentFile.getName(false);
        
        // Check if parent is already in a folder with its name
        const currentParentFolderName = parentFolderPath.substring(parentFolderPath.lastIndexOf("/") + 1);
        const parentIsInDedicatedFolder = currentParentFolderName === parentBaseName;
        
        let parentDedicatedFolderPath: string;
        
        if (parentIsInDedicatedFolder) {
            // Parent is already in its dedicated folder
            parentDedicatedFolderPath = parentFolderPath;
        } else {
            // Parent needs to be moved to a new dedicated folder
            parentDedicatedFolderPath = `${parentFolderPath}/${parentBaseName}`;
            
            const parentDedicatedFolder = await this.vault.app.getFile(parentDedicatedFolderPath);
            if (!parentDedicatedFolder) {
                await this.ensureFolder(parentDedicatedFolderPath);
            }
            
            // Move parent file into its own folder
            await parentFile.move(parentDedicatedFolderPath, parentFile.getName());
        }
        
        // Now determine where to move this child file
        // If this file has children, it needs its own dedicated folder
        // Otherwise, it can go directly in the parent's folder (or in a specified subfolder)
        const currentChildFolder = this.file.getFolderPath();
        const childBaseName = this.file.getName(false);
        
        // Find children BEFORE moving this file to know if we need a dedicated folder
        const children = await this.findChildren();
        const hasChildren = children.length > 0;
        
        // Check if a specific subfolder is configured for this class
        const parentFolderName = (this.constructor as typeof Classe).parentFolderName;
        
        let targetFolderPath: string;
        
        if (hasChildren) {
            // Child has children, so it needs its own dedicated folder inside parent's folder
            // If parentFolderName is specified, create the folder inside that subfolder
            if (parentFolderName) {
                const subfolderPath = `${parentDedicatedFolderPath}/${parentFolderName}`;
                await this.ensureFolder(subfolderPath);
                targetFolderPath = `${subfolderPath}/${childBaseName}`;
            } else {
                targetFolderPath = `${parentDedicatedFolderPath}/${childBaseName}`;
            }
            
            // Ensure the dedicated folder exists
            const dedicatedFolder = await this.vault.app.getFile(targetFolderPath);
            if (!dedicatedFolder) {
                await this.ensureFolder(targetFolderPath);
            }
        } else {
            // Child has no children
            if (parentFolderName) {
                // Put it in the specified subfolder
                targetFolderPath = `${parentDedicatedFolderPath}/${parentFolderName}`;
                await this.ensureFolder(targetFolderPath);
            } else {
                // Put it directly in parent's folder
                targetFolderPath = parentDedicatedFolderPath;
            }
        }
        
        if (currentChildFolder !== targetFolderPath) {
            // Check if this file has a dedicated folder (folder with same name as file)
            const currentFolderName = currentChildFolder.substring(currentChildFolder.lastIndexOf("/") + 1);
            const fileHasDedicatedFolder = currentFolderName === childBaseName;
            
            if (fileHasDedicatedFolder && hasChildren) {
                // Move the entire folder (file + children) instead of just the file
                const sourceFolderPath = currentChildFolder;
                const newFolderPath = `${targetFolderPath}`;
                
                // Rename/move the folder using the vault's folder operations
                const folder = await this.vault.app.getFile(sourceFolderPath);
                if (folder && 'children' in folder) {
                    // Use the adapter's move method to move the entire folder
                    await this.vault.app.move(folder, newFolderPath);
                    
                    // Update this.file reference to point to new location
                    const newFilePath = `${newFolderPath}/${this.file.getName()}`;
                    const reloadedFile = await this.vault.app.getFile(newFilePath);
                    if (reloadedFile && 'extension' in reloadedFile) {
                        this.file = new File(this.vault, reloadedFile as IFile);
                    }
                }
            } else {
                // Move just this file (no children or no dedicated folder)
                await this.file.move(targetFolderPath, this.file.getName());
                
                // Reload the file object from the new path to ensure all references are updated
                const newFilePath = `${targetFolderPath}/${this.file.getName()}`;
                const reloadedFile = await this.vault.app.getFile(newFilePath);
                if (reloadedFile && 'extension' in reloadedFile) {
                    this.file = new File(this.vault, reloadedFile as IFile);
                }
                
                // Move all children recursively to their proper folders
                // This handles creating dedicated folders for children with grandchildren
                await this.moveChildrenToFolder(targetFolderPath);
            }
        }
    }
    
    // Lifecycle hooks
    async onCreate(): Promise<void> {
        // Check if parent folder should be set up on creation
        const parentProperty = await this.getParentProperty();
        if (parentProperty) {
            const parentValue = await this.getPropertyValue(parentProperty.name);
            if (parentValue) {
                // Parent property has a value, set up folder structure
                await this.updateParentFolder();
            }
        }
        await this.handleAutoRename();
        await this.migratePropertyAliases();
    }
    
    async onUpdate(): Promise<void> {
        // Let updateParentFolder decide if it needs to do anything
        console.log(`🔄 onUpdate called for ${this.file?.getPath()}`);
        await this.updateParentFolder();
        
        // Handle automatic renaming if configured
        await this.handleAutoRename();
    }
    
    async onDelete(): Promise<void> {
        // Override in subclasses for pre-deletion logic
    }

    /**
     * Migrate old property names to new ones based on aliases configuration.
     * This method runs only on onCreate to avoid repeated migrations.
     * Supports nested properties in ObjectProperty.
     */
    protected async migratePropertyAliases(): Promise<void> {
        if (!this.file) return;

        const metadata = await this.file.getMetadata();
        const settings = this.vault.app.getSettings();
        const deleteAfterMigration = settings.deleteAliasesAfterMigration !== false; // Default: true

        let hasChanges = false;
        const updates: Record<string, any> = { ...metadata };

        for (const property of this.properties) {
            // Check if this is an ObjectProperty with nested properties
            if (property.type === 'object' && 'properties' in property) {
                const objectProperty = property as any;
                
                // Get current value - check both the new property name and its aliases
                let currentValue = updates[property.name];
                let foundInAlias: string | null = null;
                
                // If property doesn't exist yet, check aliases
                if (!currentValue && property.aliases) {
                    for (const alias of property.aliases) {
                        if (updates[alias]) {
                            currentValue = updates[alias];
                            foundInAlias = alias;
                            break;
                        }
                    }
                }
                
                // Only process if the object property has a value
                if (currentValue && typeof currentValue === 'object' && !Array.isArray(currentValue)) {
                    const objectUpdates = { ...currentValue };
                    let objectHasChanges = false;

                    // Process nested properties
                    if (objectProperty.properties) {
                        for (const [nestedPropName, nestedProp] of Object.entries(objectProperty.properties as Record<string, any>)) {
                            if (!nestedProp.aliases || nestedProp.aliases.length === 0) continue;

                            // Check if nested property needs migration
                            const needsMigration = !(nestedPropName in objectUpdates) 
                                || objectUpdates[nestedPropName] === undefined 
                                || objectUpdates[nestedPropName] === '';
                            let migrated = false;

                            for (const oldName of nestedProp.aliases) {
                                if (oldName in objectUpdates) {
                                    // Migrate value from first found alias only
                                    if (needsMigration && !migrated) {
                                        objectUpdates[nestedPropName] = objectUpdates[oldName];
                                        objectHasChanges = true;
                                        migrated = true;
                                    }

                                    // Delete the old property if setting is enabled
                                    if (deleteAfterMigration) {
                                        delete objectUpdates[oldName];
                                        objectHasChanges = true;
                                    }
                                }
                            }
                        }
                    }

                    // If we have changes OR the property itself was found via an alias
                    if (objectHasChanges || foundInAlias) {
                        updates[property.name] = objectUpdates;
                        hasChanges = true;
                        
                        // If found via alias, delete the old top-level property
                        if (foundInAlias && deleteAfterMigration) {
                            delete updates[foundInAlias];
                        }
                    }
                }
                
                // Skip top-level alias processing for ObjectProperty - already handled above
                continue;
            }
            
            // Process top-level property aliases
            if (!property.aliases || property.aliases.length === 0) continue;

            // Check if new property needs migration (doesn't exist or is empty)
            const needsMigration = !(property.name in metadata) || metadata[property.name] === undefined || metadata[property.name] === '';
            let migrated = false;

            for (const oldName of property.aliases) {
                // Check if the old property name exists in metadata
                if (oldName in metadata) {
                    // Migrate value from first found alias only
                    if (needsMigration && !migrated) {
                        updates[property.name] = metadata[oldName];
                        hasChanges = true;
                        migrated = true;
                    }

                    // Delete the old property if setting is enabled
                    if (deleteAfterMigration) {
                        delete updates[oldName];
                        hasChanges = true;
                    }
                }
            }
        }

        // Apply all changes at once using the app's updateMetadata
        if (hasChanges) {
            await this.vault.app.updateMetadata(this.file.getFile(), updates);
        }
    }
}
