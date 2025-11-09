import { File } from "../vault/File";
import { IApp } from "../interfaces/IApp";
import { Vault } from "../vault/Vault";

/**
 * Base class for all properties in the dynamic field system.
 * Represents an editable property with a dynamic user interface.
 * 
 * This class provides the base behavior for:
 * - Displaying metadata fields
 * - Inline editing of values
 * - User input validation
 * - Vault interaction
 */
export class Property {
    public name: string;
    public icon: string;
    public vault: Vault;
    public static: boolean;
    public title: string = "";
    public flexSpan = 0;
    public default: any;

    public type : string = "text";

    /**
     * Property constructor.
     * Initializes a property with its name, vault, and configuration options.
     * 
     * @param name - Unique property name (used to identify the property in metadata)
     * @param vault - Vault instance for data operations
     * @param options - Optional property configuration
     * @param options.icon - Lucide icon to display next to the property (default: "align-left")
     * @param options.staticProperty - If true, the property is static and doesn't change (default: false)
     * @param options.flexSpan - Relative width of the property in the display (default: 1)
     * @param options.defaultValue - Default value of the property (default: "")
     */
    constructor(name: string, vault: Vault, options: { 
        icon?: string, 
        staticProperty?: boolean, 
        flexSpan?: number, 
        defaultValue?: any, 
        [key: string]: any 
    } = {}) {
        const { icon = "align-left", staticProperty = false, flexSpan = 1, defaultValue = "", ...additionalOptions } = options;
        this.flexSpan = flexSpan;
        this.name = name;
        this.vault = vault;
        this.icon = icon;
        this.default = defaultValue;
        this.static = staticProperty;

        // Assign additional options to the instance
        Object.assign(this, additionalOptions);
    }

    /**
     * Gets the default value of the property.
     * Handles special default values like "personalName" that require
     * dynamic resolution via the vault.
     * 
     * @returns The resolved default value of the property
     */
    getDefaultValue(){
        // TODO use a dictionary for special default values in vault
        if (this.default == "personalName"){
            return this.vault.getPersonalName();
        }
        return this.default;
    }

    /**
     * Reads the property value from the file's metadata.
     * Supports two file types: those with a getMetadataValue method
     * and those with a direct metadata object.
     * 
     * @param file - Obsidian file from which to read the property
     * @returns The property value or undefined if it doesn't exist
     */
    async read(file: File): Promise<any> {
        if (file && typeof file === 'object' && 'readProperty' in file) {
            return await file.getMetadataValue(this.name);
        }
        return await file.getMetadataValue(this.name);
    }

    /**
     * Validates and normalizes an input value for this property.
     * The base method returns the value unchanged, but can be 
     * overridden by derived classes to perform transformations.
     * 
     * @param value - Value to validate and normalize
     * @returns The validated and normalized value
     */
    validate(value: string) {
        return value;
    }

    /**
     * Generates a link for the property value.
     * Used to create clickable links in the user interface.
     * 
     * @param value - Value for which to generate a link
     * @returns The link representation of the value
     */
    getLink(value: string) {
        return value;
    }

    /**
     * Formats a value for "pretty" display in the interface.
     * Can be overridden for property type-specific formatting.
     * 
     * @param value - Value to format for display
     * @returns The formatted value for display
     */
    getPretty(value: string) {
        return value;  
    }

    /**
     * Generates the complete display of the property for a given file.
     * Configures the display mode (static or editable) and title,
     * then delegates DOM creation to fillDisplay.
     * 
     * @param file - File for which to generate the display
     * @param args - Display options
     * @param args.staticMode - If true, displays the property in read-only mode
     * @param args.title - Custom title for the property
     * @returns The DOM element representing the property
     */
    async getDisplay(file: any, args : {staticMode? : boolean, title?: string} = {staticMode : false, title:""}) {
        this.static = args.staticMode ? true : this.static;
        this.title = args.title ? args.title : "";
        let value = await this.read(file);
        return this.fillDisplay(value, async (value: any) => await file.updateMetadata(this.name, value), args);
    }

    /**
     * Fills and builds the complete DOM display of the property.
     * Creates the HTML structure with optional title, icon and editable content.
     * 
     * @param value - Current property value to display
     * @param update - Update function called during changes
     * @param args - Additional arguments for configuration
     * @returns The complete DOM element of the property
     */
    fillDisplay(value: any, update: (value: any) => Promise<void>, args? : {}) {
        const field = this.createFieldContainer();

        if (this.title) {
            const title = document.createElement("div");
            title.textContent = this.title;
            title.classList.add("metadata-title");
            field.appendChild(title);
        }

        const iconContainer = this.createIconContainer(update);
        const fieldContainer = this.createFieldContainerContent(update, value);

        field.appendChild(iconContainer);
        field.appendChild(fieldContainer);

        return field;
    }

    /**
     * Creates the main container for the property display.
     * Defines the basic HTML structure with appropriate CSS classes.
     * 
     * @returns The main container div element of the property
     */
    createFieldContainer() {
        const field = document.createElement("div");
        field.classList.add("metadata-field");
        return field;
    }

    /**
     * Creates the icon container for the property.
     * Adds a click handler to toggle to edit mode if the property is not static.
     * 
     * @param update - Update function to persist changes
     * @returns The icon container element with its events
     */
    createIconContainer(update: (value: string) => Promise<void>) {
        const iconContainer = document.createElement("div");
        iconContainer.classList.add("icon-container");
        if (this.icon) {
            const icon = document.createElement("div");
            this.vault.app.setIcon(icon, this.icon);
            iconContainer.appendChild(icon);
            if (!this.static) {
                icon.addEventListener("click", (event) => {
                    this.modifyField(event)});
            }
        }
        return iconContainer;
    }

    /**
     * Handles switching to edit mode when the user clicks on the icon.
     * Hides the read-only display and shows the input field with focus.
     * 
     * @param event - Click event on the icon
     */
    modifyField(event: Event) {
        const link = (event.target as HTMLElement).closest('.metadata-field')?.querySelector('.field-link') as HTMLElement;
        const input = (event.target as HTMLElement).closest('.metadata-field')?.querySelector('.field-input') as HTMLInputElement;
        if (link && input) {
            link.style.display = "none";
            input.style.display = "block";
            input.focus(); 
        }
    }

    /**
     * Creates the field container content with input and link elements.
     * Manages the visibility of edit and display modes based on property state.
     * 
     * @param update - Update function to persist changes
     * @param value - Current value to display
     * @returns The field container div with input and link elements
     */
    createFieldContainerContent(update: (value: string) => Promise<void>, value: string): HTMLDivElement {
        const fieldContainer = document.createElement("div");
        fieldContainer.classList.add("field-container");

        const currentField = value;
        const input = this.createFieldInput(currentField);
        const link = this.createFieldLink(currentField);

        if (this.static) {
            link.style.display = "block";
            input.style.display = "none";
        } else {
            if (currentField) {
                link.style.display = "block";
                input.style.display = "none";
            } else {
                input.style.display = "block";
                link.style.display = "none";
            }
        }

        fieldContainer.appendChild(link);
        fieldContainer.appendChild(input);

        if (!this.static) {
            this.handleFieldInput(update, input, link);
        }

        return fieldContainer;
    }

    /**
     * Creates a clickable link element for displaying the property value.
     * Configures cursor style and click behavior based on static property.
     * 
     * @param value - Value to display in the link
     * @returns The configured link div element
     */
    createFieldLink(value: string) {
        const link = document.createElement("div");
        link.textContent = this.getPretty(value) || "";
        link.classList.add("field-link");
        link.style.cursor = this.static ? "default" : "text";
        if (!this.static) {
            link.addEventListener("click", (event) => this.modifyField(event));
        }
        return link;
    }

    /**
     * Handles input field events for editing functionality.
     * Sets up blur and keyboard event listeners to save changes.
     * 
     * @param update - Update function to persist changes
     * @param input - Input element to handle
     * @param link - Link element to show after editing
     */
    handleFieldInput(update: (value: string) => Promise<void>, input: HTMLInputElement | HTMLTextAreaElement, link: HTMLElement) {
        input.addEventListener("blur", async () => {
            await this.updateField(update, input, link);
        });

        input.addEventListener("keydown", async (event) => {
            if ((event as KeyboardEvent).key === "Enter" || (event as KeyboardEvent).key === "Escape") {
                    event.preventDefault();
                    await this.updateField(update, input, link);
            }
        });
    }

    /**
     * Creates an input field for editing the property value.
     * Base implementation creates a text input, can be overridden for specific input types.
     * 
     * @param value - Initial value for the input field
     * @returns The configured input element (input or textarea)
     */
    createFieldInput(value: string) : HTMLInputElement | HTMLTextAreaElement {
        const input = document.createElement("input");
        input.type = "text";
        input.value = value || "";
        input.classList.add("field-input");
        return input;
    }

    /**
     * Updates the field value and switches back to display mode.
     * Validates the input, updates the backend, and refreshes the UI.
     * 
     * @param update - Update function to persist the changes
     * @param input - Input element containing the new value
     * @param link - Link element to update and show
     */
    async updateField(update: (value: string) => Promise<void>, input: HTMLInputElement | HTMLTextAreaElement, link: HTMLElement) {
        let value = this.validate(input.value);
        if (value) {
            await update(value);
            input.style.display = "none";
            link.textContent = value;
            if ((link as HTMLAnchorElement).href){
                (link as HTMLAnchorElement).href = this.getLink(value);
            }
            link.style.display = "block";
        } else {
            await update(input.value);
        }
    }

    /**
     * Reloads the dynamic content of the property field from the file.
     * Updates both the display link and input field with the current file value.
     * 
     * @param file - File from which to reload the property value
     */
    async reloadDynamicContent(file: File) {
        const field = document.querySelector('.metadata-field');
        if (field) {
            const newValue = await this.read(file);
            const link = field.querySelector('.field-link') as HTMLElement;
            const input = field.querySelector('.field-input') as HTMLInputElement;
            if (link && input) {
                link.textContent = newValue;
                input.value = newValue;
            }
        }
    }
}

