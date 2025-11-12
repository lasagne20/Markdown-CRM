import { IFile } from '../interfaces/IApp';
import { Vault } from './Vault';
import { Property } from '../properties/Property';
import { File } from './File';
import { Data } from './Data';

export class Classe {
    protected static Properties: { [key: string]: Property } = {};
    public static parentPropertyName?: string;
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
        
        // Get old metadata to detect property changes
        const oldMetadata = await this.getMetadata();
        const parentProperty = this.getParentProperty();
        
        // Update metadata first
        await this.vault.app.updateMetadata(this.file, metadata);
        
        // If parent property changed, update folder structure
        if (parentProperty) {
            const oldParentValue = oldMetadata[parentProperty.name];
            const newParentValue = metadata[parentProperty.name];
            
            if (oldParentValue !== newParentValue) {
                await this.updateParentFolder();
            }
        }
    }
    
    async updatePropertyValue(propertyName: string, value: any): Promise<void> {
        if (!this.file) return;
        
        // Check if this is a parent property change
        const parentProperty = this.getParentProperty();
        const isParentPropertyChange = parentProperty && propertyName === parentProperty.name;
        
        // Update metadata first
        await this.file.updateMetadata(propertyName, value);
        
        // If parent property changed, update folder structure
        if (isParentPropertyChange) {
            await this.updateParentFolder();
        }
    }
    
    async getPropertyValue(propertyName: string): Promise<any> {
        const metadata = await this.getMetadata();
        return metadata[propertyName];
    }
    
    async setPropertyValue(propertyName: string, value: any): Promise<void> {
        const metadata = await this.getMetadata();
        metadata[propertyName] = value;
        await this.updateMetadata(metadata);
        
        // If the parent property changed, update folder structure
        const parentProperty = this.getParentProperty();
        if (parentProperty && propertyName === parentProperty.name) {
            await this.updateParentFolder();
        }
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
     */
    protected getParentProperty(): Property | undefined {
        const className = (this.constructor as typeof Classe).name;
        const parentPropName = (this.constructor as typeof Classe).parentPropertyName;
        
        if (!parentPropName) {
            return undefined;
        }
        
        return this.getProperty(parentPropName);
    }
    
    /**
     * Get the parent file from the parent property value
     */
    protected async getParentFile(): Promise<File | undefined> {
        const parentProperty = this.getParentProperty();
        if (!parentProperty || !this.file) {
            return undefined;
        }
        
        const parentValue = await this.getPropertyValue(parentProperty.name);
        if (!parentValue) {
            return undefined;
        }
        
        // Handle different property types
        if (parentProperty.type === 'file') {
            // FileProperty - single file link
            const link = parentProperty.validate(parentValue);
            if (link) {
                const classe = await this.vault.getFromLink(link);
                return classe?.getFile();
            }
        } else if (parentProperty.type === 'multiFile') {
            // MultiFileProperty - array of links, take first one
            let values = parentValue;
            if (typeof values === 'string') {
                try {
                    values = JSON.parse(values);
                } catch (e) {
                    values = [values];
                }
            }
            if (Array.isArray(values) && values.length > 0) {
                const firstLink = values[0];
                const classe = await this.vault.getFromLink(firstLink);
                return classe?.getFile();
            }
        } else if (parentProperty.type === 'object') {
            // ObjectProperty - look for first FileProperty in the object
            const objProperty = parentProperty as any;
            if (objProperty.properties) {
                for (const prop of Object.values(objProperty.properties)) {
                    const typedProp = prop as Property;
                    if (typedProp.type === 'file' || typedProp.type === 'multiFile') {
                        // Get value from the object array
                        let values = parentValue;
                        if (typeof values === 'string') {
                            try {
                                values = JSON.parse(values);
                            } catch (e) {
                                values = [];
                            }
                        }
                        if (Array.isArray(values) && values.length > 0) {
                            const firstObj = values[0];
                            const linkValue = firstObj[typedProp.name];
                            if (linkValue) {
                                const classe = await this.vault.getFromLink(linkValue);
                                return classe?.getFile();
                            }
                        }
                        break; // Only use first FileProperty found
                    }
                }
            }
        }
        
        return undefined;
    }
    
    /**
     * Find all children of this file
     * A child is a file that either:
     * 1. Is located in this file's dedicated folder (most reliable)
     * 2. Has a FileProperty pointing to this file (for files not yet moved)
     */
    protected async findChildren(): Promise<Classe[]> {
        if (!this.file) {
            return [];
        }

        const children: Classe[] = [];
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

            const fileFolder = file.path.substring(0, file.path.lastIndexOf('/'));
            
            // Check if file is in our dedicated folder
            const isInDedicatedFolder = fileFolder === dedicatedFolderPath || fileFolder.startsWith(dedicatedFolderPath + '/');
            
            let isChild = false;
            
            if (isInDedicatedFolder) {
                // File is in dedicated folder - verify it's a FileProperty relationship (not just a random file)
                try {
                    const childClasse = await this.vault.createClasse(file);
                    if (childClasse) {
                        // Check if it has a FileProperty pointing to us
                        const metadata = await this.vault.app.getMetadata(file);
                        const childProperties = childClasse.getProperties();
                        
                        for (const property of childProperties) {
                            if (property.constructor.name !== 'FileProperty') continue;
                            
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
                        
                        // If no FileProperty found but file is in folder, might be a file without classe definition
                        if (!isChild) {
                            isChild = true; // Trust folder structure
                        }
                    }
                } catch (e) {
                    // Classe creation failed - trust folder structure for files without classe definitions
                    isChild = true;
                }
            } else {
                // File is NOT in dedicated folder - check if it should be (via FileProperty)
                try {
                    const childClasse = await this.vault.createClasse(file);
                    if (childClasse) {
                        const metadata = await this.vault.app.getMetadata(file);
                        const childProperties = childClasse.getProperties();
                        
                        for (const property of childProperties) {
                            if (property.constructor.name !== 'FileProperty') continue;
                            
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
                if (reloadedFile) {
                    child.setFile(new File(this.vault, reloadedFile));
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
    protected async updateParentFolder(): Promise<void> {
        if (!this.file) {
            return;
        }
        
        const parentFile = await this.getParentFile();
        if (!parentFile) {
            // No parent configured or found
            return;
        }
        
        const parentFolderPath = parentFile.getFolderPath();
        const parentBaseName = parentFile.getName(false);
        
        // Check if parent is already in a folder with its name
        const parentFolderName = parentFolderPath.substring(parentFolderPath.lastIndexOf("/") + 1);
        const parentIsInDedicatedFolder = parentFolderName === parentBaseName;
        
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
        // Otherwise, it can go directly in the parent's folder
        const currentChildFolder = this.file.getFolderPath();
        const childBaseName = this.file.getName(false);
        
        // Find children BEFORE moving this file to know if we need a dedicated folder
        const children = await this.findChildren();
        const hasChildren = children.length > 0;
        
        let targetFolderPath: string;
        
        if (hasChildren) {
            // Child has children, so it needs its own dedicated folder inside parent's folder
            targetFolderPath = `${parentDedicatedFolderPath}/${childBaseName}`;
            
            // Ensure the dedicated folder exists
            const dedicatedFolder = await this.vault.app.getFile(targetFolderPath);
            if (!dedicatedFolder) {
                await this.ensureFolder(targetFolderPath);
            }
        } else {
            // Child has no children, put it directly in parent's folder
            targetFolderPath = parentDedicatedFolderPath;
        }
        
        if (currentChildFolder !== targetFolderPath) {
            // Move this file to target folder
            await this.file.move(targetFolderPath, this.file.getName());
            
            // Reload the file object from the new path to ensure all references are updated
            const newFilePath = `${targetFolderPath}/${this.file.getName()}`;
            const reloadedFile = await this.vault.app.getFile(newFilePath);
            if (reloadedFile) {
                this.file = new File(this.vault, reloadedFile);
            }
        }
        
        // Move all children recursively to their proper folders
        // This handles creating dedicated folders for children with grandchildren
        await this.moveChildrenToFolder(targetFolderPath);
    }
    
    // Lifecycle hooks
    async onCreate(): Promise<void> {
        // Override in subclasses for post-creation logic
    }
    
    async onUpdate(): Promise<void> {
        // Override in subclasses for post-update logic
    }
    
    async onDelete(): Promise<void> {
        // Override in subclasses for pre-deletion logic
    }
}
