import { Vault } from '../vault/Vault';
import { ClassConfig, PropertyConfig, PopulateConfig } from './interfaces';
import { IApp } from '../interfaces/IApp';

/**
 * PopulateManager handles prompting users for property values during file creation.
 * It supports FileProperty (selectFile), SelectProperty (selectFromList), 
 * MultiSelectProperty (selectFromList with multiple), BooleanProperty (Oui/Non),
 * and ObjectProperty (uses first FileProperty or SelectProperty found).
 */
export class PopulateManager {
    private vault: Vault;
    private app: IApp;

    constructor(vault: Vault) {
        this.vault = vault;
        this.app = vault.app;
    }

    /**
     * Process all populate configurations for a class and return the populated values.
     * @param classConfig The class configuration containing populate settings
     * @returns Object with property names as keys and populated values, or null if cancelled
     */
    async populateProperties(classConfig: ClassConfig): Promise<{ [key: string]: any } | null> {
        if (!classConfig.populate || classConfig.populate.length === 0) {
            return {};
        }

        const populatedValues: { [key: string]: any } = {};

        for (const populateConfig of classConfig.populate) {
            const value = await this.populateProperty(classConfig, populateConfig);

            // Handle required fields
            if (value === null && populateConfig.required) {
                this.app.sendNotice('Création annulée : champ requis non rempli');
                return null; // Cancel entire creation
            }

            // Store value if not null
            if (value !== null) {
                populatedValues[populateConfig.property] = value;
            }
        }

        return populatedValues;
    }

    /**
     * Populate a single property by prompting the user.
     * @param classConfig The class configuration
     * @param populateConfig The populate configuration for this property
     * @returns The populated value, or null if cancelled
     */
    private async populateProperty(
        classConfig: ClassConfig,
        populateConfig: PopulateConfig
    ): Promise<any> {
        // Find the property configuration
        const propertyConfig = classConfig.properties[populateConfig.property];
        if (!propertyConfig) {
            console.error(`Property "${populateConfig.property}" not found in class config`);
            return null;
        }

        const title = populateConfig.required 
            ? `${populateConfig.title} (requis)` 
            : populateConfig.title;

        // Route to appropriate handler based on property type
        switch (propertyConfig.type) {
            case 'FileProperty':
                return this.populateFileProperty(propertyConfig, title);

            case 'SelectProperty':
                return this.populateSelectProperty(propertyConfig, title);

            case 'MultiSelectProperty':
                return this.populateMultiSelectProperty(propertyConfig, title);

            case 'BooleanProperty':
                return this.populateBooleanProperty(propertyConfig, title);

            case 'ObjectProperty':
                return this.populateObjectProperty(propertyConfig, title);

            default:
                console.warn(`Populate not supported for property type: ${propertyConfig.type}`);
                return null;
        }
    }

    /**
     * Populate a FileProperty using IApp.selectFile
     */
    private async populateFileProperty(
        propertyConfig: PropertyConfig,
        title: string
    ): Promise<string | null> {
        if (!propertyConfig.classes || propertyConfig.classes.length === 0) {
            console.error('FileProperty must have classes defined');
            return null;
        }

        try {
            const selectedFile = await this.app.selectFile(this.vault, propertyConfig.classes, {
                hint: title
            });

            if (!selectedFile) {
                return null; // User cancelled
            }

            // Return the link format [[FileName]]
            return selectedFile.getLink();
        } catch (error) {
            console.error('Error in populateFileProperty:', error);
            this.app.sendNotice('Erreur lors de la sélection du fichier');
            return null;
        }
    }

    /**
     * Populate a SelectProperty using IApp.selectFromList
     */
    private async populateSelectProperty(
        propertyConfig: PropertyConfig,
        title: string
    ): Promise<string | null> {
        if (!propertyConfig.options || propertyConfig.options.length === 0) {
            console.error('SelectProperty must have options defined');
            return null;
        }

        try {
            // Convert SelectOption[] to string[] if needed
            const options = propertyConfig.options.map(opt => 
                typeof opt === 'string' ? opt : opt.name
            );

            const selectedValue = await this.app.selectFromList(options, { 
                multiple: false,
                title 
            });

            // selectFromList returns string when multiple: false
            return (selectedValue as string) || null;
        } catch (error) {
            console.error('Error in populateSelectProperty:', error);
            this.app.sendNotice('Erreur lors de la sélection');
            return null;
        }
    }

    /**
     * Populate a MultiSelectProperty using IApp.selectFromList with multiple option
     */
    private async populateMultiSelectProperty(
        propertyConfig: PropertyConfig,
        title: string
    ): Promise<string[] | null> {
        if (!propertyConfig.options || propertyConfig.options.length === 0) {
            console.error('MultiSelectProperty must have options defined');
            return null;
        }

        try {
            // Convert SelectOption[] to string[] if needed
            const options = propertyConfig.options.map(opt => 
                typeof opt === 'string' ? opt : opt.name
            );

            const selectedValues = await this.app.selectFromList(options, {
                multiple: true,
                title
            });

            // selectFromList returns string[] when multiple: true
            return (selectedValues as string[]) || null;
        } catch (error) {
            console.error('Error in populateMultiSelectProperty:', error);
            this.app.sendNotice('Erreur lors de la sélection multiple');
            return null;
        }
    }

    /**
     * Populate a BooleanProperty using IApp.selectFromList
     */
    private async populateBooleanProperty(
        propertyConfig: PropertyConfig,
        title: string
    ): Promise<boolean | null> {
        try {
            const options = ['Oui', 'Non'];
            const selectedValue = await this.app.selectFromList(options, {
                multiple: false,
                title
            });

            if (!selectedValue) {
                return null; // User cancelled
            }

            return selectedValue === 'Oui';
        } catch (error) {
            console.error('Error in populateBooleanProperty:', error);
            this.app.sendNotice('Erreur lors de la sélection');
            return null;
        }
    }

    /**
     * Populate an ObjectProperty by using the first FileProperty or SelectProperty found
     * in its properties structure.
     */
    private async populateObjectProperty(
        propertyConfig: PropertyConfig,
        title: string
    ): Promise<any[] | null> {
        if (!propertyConfig.properties || Object.keys(propertyConfig.properties).length === 0) {
            console.error('ObjectProperty must have properties defined');
            return null;
        }

        // Find the first FileProperty or SelectProperty
        for (const [propName, subPropConfig] of Object.entries(propertyConfig.properties)) {
            if (subPropConfig.type === 'FileProperty') {
                const fileValue = await this.populateFileProperty(subPropConfig, title);
                if (fileValue === null) {
                    return null; // User cancelled
                }
                
                // Return an array with one object containing the property
                const obj: any = {};
                // Initialize all properties with empty values
                for (const [key, config] of Object.entries(propertyConfig.properties)) {
                    obj[key] = config.defaultValue || '';
                }
                // Set the populated value
                obj[propName] = fileValue;
                return [obj];
            } else if (subPropConfig.type === 'SelectProperty') {
                const selectValue = await this.populateSelectProperty(subPropConfig, title);
                if (selectValue === null) {
                    return null; // User cancelled
                }
                
                // Return an array with one object containing the property
                const obj: any = {};
                // Initialize all properties with empty values
                for (const [key, config] of Object.entries(propertyConfig.properties)) {
                    obj[key] = config.defaultValue || '';
                }
                // Set the populated value
                obj[propName] = selectValue;
                return [obj];
            }
        }

        console.warn('ObjectProperty must contain at least one FileProperty or SelectProperty for populate');
        return null;
    }

    /**
     * Merge populated values with default values from class config.
     * Populated values take precedence over defaults.
     */
    mergeWithDefaults(
        classConfig: ClassConfig,
        populatedValues: { [key: string]: any }
    ): { [key: string]: any } {
        const finalValues: { [key: string]: any } = {};

        // First, apply default values
        for (const [propName, propConfig] of Object.entries(classConfig.properties)) {
            if (propConfig.defaultValue !== undefined) {
                finalValues[propName] = propConfig.defaultValue;
            }
        }

        // Then, override with populated values
        for (const [propName, value] of Object.entries(populatedValues)) {
            if (value !== null && value !== undefined) {
                finalValues[propName] = value;
            }
        }

        return finalValues;
    }
}
