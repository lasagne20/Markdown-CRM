import { Property } from "./Property";
import { Vault } from "../vault/Vault";

/**
 * IdProperty - A property that automatically generates and stores a unique UUID.
 * 
 * The UUID is generated only if the property doesn't already have a value.
 * This property is typically static (read-only) once generated.
 * 
 * Example usage:
 * ```typescript
 * const idProp = new IdProperty('id', vault, { staticProperty: true });
 * ```
 */
export class IdProperty extends Property {
    override type: string = "id";

    constructor(name: string, vault: Vault, args: { 
        staticProperty?: boolean,
        tooltip?: string,
        [key: string]: any 
    } = {}) {
        // By default, ID properties are static (read-only)
        const { staticProperty = true, ...otherArgs } = args;
        super(name, vault, { 
            icon: "hash", 
            staticProperty,
            ...otherArgs 
        });
    }

    /**
     * Generate a UUID v4
     * @returns A unique UUID string
     */
    private generateUUID(): string {
        // Try using crypto.randomUUID if available (Node.js 14.17+ or modern browsers)
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        
        // Fallback to manual UUID generation (RFC4122 compliant)
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Read the ID value from metadata, generating one if it doesn't exist
     * @param classe - The classe instance to read from
     * @returns The UUID value (existing or newly generated)
     */
    override async read(classe: any): Promise<string> {
        let value = await classe.getPropertyValue(this.name);
        
        // If no value exists, generate a new UUID and save it
        if (!value || value === '') {
            value = this.generateUUID();
            await classe.updatePropertyValue(this.name, value);
        }
        
        return value;
    }

    /**
     * Validate that the value is a valid UUID format
     * @param value - The value to validate
     * @returns The validated UUID
     */
    override validate(value: string): string {
        if (!value || value === '') {
            return this.generateUUID();
        }
        
        // Check if it's a valid UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(value)) {
            console.warn(`Invalid UUID format: ${value}. Generating a new one.`);
            return this.generateUUID();
        }
        
        return value;
    }

    /**
     * Create a read-only field displaying the UUID
     * @param value - The UUID value to display
     * @returns An input element (disabled if static)
     */
    override createFieldInput(value: string): HTMLInputElement {
        const input = document.createElement("input");
        input.type = "text";
        input.value = value || this.generateUUID();
        input.classList.add("field-input", "id-field");
        
        // Make it read-only if static
        if (this.static) {
            input.disabled = true;
            input.style.cursor = "default";
            input.style.backgroundColor = "#f5f5f5";
        }
        
        return input;
    }

    /**
     * Create a clickable link display for the UUID
     * @param value - The UUID value to display
     * @returns A div element showing the UUID
     */
    override createFieldLink(value: string): HTMLDivElement {
        const link = document.createElement("div");
        link.textContent = value || this.generateUUID();
        link.classList.add("field-textlink", "id-field-link");
        link.style.fontFamily = "monospace";
        link.style.fontSize = "0.9em";
        link.style.cursor = this.static ? "default" : "text";
        
        if (!this.static) {
            link.onclick = (event) => this.modifyField(event);
        }
        
        return link;
    }

    /**
     * Create the container for the ID field
     * @returns A div container element
     */
    override createFieldContainer(): HTMLDivElement {
        const field = document.createElement("div");
        field.classList.add("metadata-textfield", "id-field-container");
        return field;
    }

    /**
     * Get the default value (generates a new UUID)
     * @returns A new UUID
     */
    override getDefaultValue(): string {
        return this.generateUUID();
    }
}
