import { IFile } from '../interfaces/IApp';
import { Vault } from './Vault';
import { Property } from '../properties/Property';
import { File } from './File';
import { Data } from './Data';

export class Classe {
    protected static Properties: { [key: string]: Property } = {};
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
        this.file = file;
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
        await this.vault.app.updateMetadata(this.file, metadata);
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
        
        // Add properties
        for (const property of this.properties) {
            if (this.file) {
                const propertyDisplay = await property.getDisplay(this.file);
                container.appendChild(propertyDisplay);
            }
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
