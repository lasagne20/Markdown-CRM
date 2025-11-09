export class Classe {
    constructor(vault, file, data) {
        this.vault = vault;
        this.properties = [];
        this.name = '';
        this.icon = '';
        this.data = null;
        this.displayConfig = {};
        if (file) {
            this.setFile(file);
        }
        if (data) {
            this.data = data;
        }
    }
    getName() {
        return this.name;
    }
    // Property management
    addProperty(property) {
        this.properties.push(property);
    }
    getProperty(name) {
        return this.properties.find(p => p.name === name);
    }
    getProperties() {
        return [...this.properties];
    }
    // File operations
    setFile(file) {
        this.file = file;
    }
    getFile() {
        return this.file;
    }
    getPath() {
        return this.file?.getPath();
    }
    async update() {
        if (!this.file)
            return;
        // Update metadata
        await this.updateAllPropertiesMetadata();
    }
    async validate() {
        // Validate all properties
        for (const property of this.properties) {
            const value = await this.getPropertyValue(property.name);
            if (!property.validate(value)) {
                return false;
            }
        }
        return true;
    }
    // Content generation helpers
    async generateFrontMatter() {
        const metadata = await this.getMetadata();
        const lines = ['---'];
        // Add class-specific metadata
        if (this.name)
            metadata.type = this.name;
        if (this.icon)
            metadata.icon = this.icon;
        // Add property values
        for (const property of this.properties) {
            const value = await this.getPropertyValue(property.name);
            if (value !== undefined && value !== '') {
                metadata[property.name] = value;
            }
        }
        // Convert to YAML
        for (const [key, value] of Object.entries(metadata)) {
            if (Array.isArray(value)) {
                lines.push(`${key}:`);
                value.forEach(item => lines.push(`  - ${item}`));
            }
            else if (typeof value === 'object' && value !== null) {
                lines.push(`${key}:`);
                for (const [subKey, subValue] of Object.entries(value)) {
                    lines.push(`  ${subKey}: ${subValue}`);
                }
            }
            else {
                lines.push(`${key}: ${value}`);
            }
        }
        lines.push('---\n');
        return lines.join('\n');
    }
    async generateTemplateContent() {
        if (!this.template)
            return '';
        try {
            return await this.vault.app.getTemplateContent(this.template);
        }
        catch (error) {
            console.warn(`Template ${this.template} not found`);
            return '';
        }
    }
    // Metadata operations
    async getMetadata() {
        if (!this.file)
            return {};
        return await this.vault.app.getMetadata(this.file);
    }
    async updateMetadata(metadata) {
        if (!this.file)
            return;
        await this.vault.app.updateMetadata(this.file, metadata);
    }
    async getPropertyValue(propertyName) {
        const metadata = await this.getMetadata();
        return metadata[propertyName];
    }
    async setPropertyValue(propertyName, value) {
        const metadata = await this.getMetadata();
        metadata[propertyName] = value;
        await this.updateMetadata(metadata);
    }
    async updateAllPropertiesMetadata() {
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
    // Display methods
    async getDisplay() {
        const container = this.vault.app.createDiv('classe-display');
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
    static create(vault) {
        throw new Error('Must implement create method in subclass');
    }
    // Utility methods
    sanitizeFileName(name) {
        return name.replace(/[<>:"/\\|?*]/g, '-').trim();
    }
    async ensureFolder(folderPath) {
        try {
            await this.vault.app.createFolder(folderPath);
        }
        catch (error) {
            // Folder might already exist, which is fine
        }
    }
    // Lifecycle hooks
    async onCreate() {
        // Override in subclasses for post-creation logic
    }
    async onUpdate() {
        // Override in subclasses for post-update logic
    }
    async onDelete() {
        // Override in subclasses for pre-deletion logic
    }
}
Classe.Properties = {};
