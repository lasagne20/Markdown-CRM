import * as yaml from 'js-yaml';
import { Classe } from '../vault/Classe';
import { IApp, IFile } from 'interfaces';
import { AdressProperty } from '../properties/AdressProperty';
import { BooleanProperty } from '../properties/BooleanProperty';
import { ClasseProperty } from '../properties/ClasseProperty';
import { DateProperty } from '../properties/DateProperty';
import { EmailProperty } from '../properties/EmailProperty';
import { FileProperty } from '../properties/FileProperty';
import { FormulaProperty } from '../properties/FormulaProperty';
import { LinkProperty } from '../properties/LinkProperty';
import { MediaProperty } from '../properties/MediaProperty';
import { MultiFileProperty } from '../properties/MultiFileProperty';
import { MultiSelectProperty } from '../properties/MultiSelectProperty';
import { NumberProperty } from '../properties/NumberProperty';
import { ObjectProperty } from '../properties/ObjectProperty';
import { PhoneProperty } from '../properties/PhoneProperty';
import { Property } from '../properties/Property';
import { RangeDateProperty } from '../properties/RangeDateProperty';
import { RatingProperty } from '../properties/RatingProperty';
import { SelectProperty } from '../properties/SelectProperty';
import { TextProperty } from '../properties/TextProperty';
import { Vault } from '../vault/Vault';
import { ClassConfig, PropertyConfig, PropertyTableRow } from './interfaces';


export class ConfigLoader {
    private configPath: string;
    private loadedConfigs: Map<string, ClassConfig> = new Map();
    private vault: Vault;

    constructor(configPath: string, vault: Vault) {
        this.configPath = configPath;
        this.vault = vault;
    }

    /**
     * Load a class configuration from YAML file
     */
    async loadClassConfig(className: string): Promise<ClassConfig> {
        if (this.loadedConfigs.has(className)) {
            return this.loadedConfigs.get(className)!;
        }

        try {
            const configFilePath = `${this.configPath}/${className}.yaml`;
            let fileContent: string;
            let file = await this.vault.app.getFile(configFilePath);
            if (file) {
                // Try to read using vault adapter for plugin files
                try {
                    fileContent = await this.vault.app.readFile(file);
                } catch (error) {
                    // Fallback to vault API for files in the vault
                    const file = await this.vault.app.getFile(configFilePath);
                    if (!file || !('extension' in file)) {
                        throw new Error(`Configuration file not found: ${configFilePath}`);
                    }
                    fileContent = await this.vault.app.readFile(file);
                }
            } else {
                console.log("Configuration file not found in vault, trying plugin folder:", configFilePath);
                // If not found, create a default config file
                fileContent = yaml.dump({
                    name: className,
                    properties: []
                });
            }
            
            console.log("YAML content loaded:", fileContent);
            const config = yaml.load(fileContent) as ClassConfig;


            this.loadedConfigs.set(className, config);
            return config;
        } catch (error) {
            console.error(`Failed to load config for class ${className}:`, error);
            throw new Error(`Configuration not found for class: ${className}`);
        }
    }

    /**
     * Create a Property instance from configuration
     */
    createProperty(config: PropertyConfig): Property {
        const options = config.icon ? { icon: config.icon} : {};
        
        switch (config.type) {
            case 'Property':
                return new Property(config.name, this.vault, options);
            
            case 'FileProperty':
                return new FileProperty(config.name, this.vault, config.classes || [], options);
            
            case 'MultiFileProperty':
                return new MultiFileProperty(config.name, this.vault, config.classes || [], options);
            
            case 'SelectProperty':
                const selectOptions = (config.options || []).map(opt => 
                    typeof opt === 'string' 
                        ? { name: opt, color: '' }
                        : { name: opt.name, color: opt.color || '' }
                );
                return new SelectProperty(config.name, this.vault, selectOptions, options);
            
            case 'MultiSelectProperty':
                const multiSelectOptions = (config.options || []).map(opt => ({
                    name: opt.name,
                    color: opt.color || ''
                }));
                return new MultiSelectProperty(config.name, this.vault, multiSelectOptions, options);
            
            case 'EmailProperty':
                return new EmailProperty(config.name, this.vault, options);
            
            case 'PhoneProperty':
                return new PhoneProperty(config.name, this.vault, options);
            
            case 'LinkProperty':
                return new LinkProperty(config.name, this.vault, options);
            
            case 'ObjectProperty':
                const objProperties: { [key: string]: Property } = {};
                if (config.properties) {
                    // Vérifier si c'est un format tableau ou objet
                    if (Array.isArray(config.properties)) {
                        // Format tableau
                        for (const row of config.properties) {
                            const propConfig = this.parseTableRowToPropertyConfig(row);
                            objProperties[row.name] = this.createProperty(propConfig);
                        }
                    } else {
                        // Format objet classique
                        for (const [key, propConfig] of Object.entries(config.properties)) {
                            objProperties[key] = this.createProperty(propConfig);
                        }
                    }
                }
                // Ajouter le mode d'affichage si spécifié
                const objOptions: any = { ...options };
                if (config.display) {
                    objOptions.display = config.display;
                }
                return new ObjectProperty(config.name, this.vault, objProperties, objOptions);
            
            case 'RatingProperty':
                return new RatingProperty(config.name, this.vault, options);
            
            case 'DateProperty':
                const defaultValues = config.defaultValue ? [config.defaultValue] : [];
                return new DateProperty(config.name,  this.vault, defaultValues, options);
            
            case 'RangeDateProperty':
                return new RangeDateProperty(config.name, this.vault, options);
            
            case 'AdressProperty':
                return new AdressProperty(config.name, this.vault, options);
            
            case 'ClasseProperty':
                return new ClasseProperty(config.name, this.vault, config.icon || 'box');
            
            case 'TextProperty':
                return new TextProperty(config.name, this.vault, options);
            
            case 'BooleanProperty':
                return new BooleanProperty(config.name, this.vault, options);
            
            case 'NumberProperty':
                return new NumberProperty(config.name, this.vault, '', { icon: config.icon || '', static: true });
            
            case 'SubClassProperty':
                // This will be handled separately in createSubClassProperty
                return new Property(config.name, this.vault, options); // Placeholder


            case 'MediaProperty':
                return new MediaProperty(config.name, this.vault, options);

            case 'FormulaProperty':
                const formula = config.formula || config.defaultValue || '';
                const formulaOptions = config.icon ? { icon: config.icon, static: true, write: true } : { icon: '', static: true, write: true };
                return new FormulaProperty(config.name, this.vault, formula, formulaOptions);
            
            default:
                console.warn(`Unknown property type: ${config.type}, falling back to Property`);
                return new Property(config.name, this.vault, options);
        }
    }

    /**
     * Create SubClass instances from configuration
     */
    /*
    createSubClasses(config: ClassConfig, parentClass: typeof Classe): SubClass[] {
        if (!config.subClassesProperty) {
            return [];
        }

        const subClasses: SubClass[] = [];
        const configLoader = this; // Reference to the current ConfigLoader instance
        
        for (const subClassConfig of config.subClassesProperty.subClasses) {
            // Create a dynamic SubClass
            class DynamicSubClass extends SubClass {
                public subClassName = subClassConfig.name;
                public subClassIcon = subClassConfig.icon || 'box';
                
                static Properties: { [key: string]: Property } = {};
                
                constructor(classe: typeof Classe, data: any = null) {
                    super(classe, data);
                    
                    // Initialize properties if defined
                    if (subClassConfig.properties && !Object.keys(DynamicSubClass.Properties).length) {
                        for (const [key, propConfig] of Object.entries(subClassConfig.properties)) {
                            DynamicSubClass.Properties[key] = configLoader.createProperty(propConfig);
                        }
                    }
                }

                getConstructor(): typeof DynamicSubClass {
                    return DynamicSubClass;
                }
            }
            
            subClasses.push(new DynamicSubClass(parentClass));
        }
        
        return subClasses;
    }*/

    /**
     * Create SubClassProperty from configuration
     *//*
    createSubClassProperty(config: ClassConfig, parentClass: typeof Classe): SubClassProperty | undefined {
        if (!config.subClassesProperty) {
            return undefined;
        }

        const subClasses = this.createSubClasses(config, parentClass);
        return new SubClassProperty(config.subClassesProperty.name, subClasses);
    }*/

    /**
     * Get all available class configurations
     */
    async getAllClassNames(): Promise<string[]> {
        // This would scan the config directory for .yaml files
        // For now, return a hardcoded list based on existing classes
        const configFiles = (await this.vault.app.listFiles())
            .filter((file : IFile) => file.path.startsWith(this.configPath) && file.extension === 'yaml')
            .map(file => file.basename.replace('.yaml', ''));
        return configFiles;
    }

    /**
     * Parse une ligne de tableau de propriétés en PropertyConfig
     */
    private parseTableRowToPropertyConfig(row: PropertyTableRow): PropertyConfig {
        const config: PropertyConfig = {
            type: row.type,
            name: row.name,
            icon: row.icon,
            defaultValue: row.default
        };

        // Parser les classes (string séparé par virgules)
        if (row.classes) {
            config.classes = row.classes.split(',').map(c => c.trim());
        }

        // Parser les options (format "name1:color1,name2:color2")
        if (row.options) {
            config.options = row.options.split(',').map(opt => {
                const [name, color = ''] = opt.split(':').map(s => s.trim());
                return { name, color };
            });
        }

        // Autres attributs
        if (row.formula) {
            config.formula = row.formula;
        }
        
        if (row.display) {
            config.display = row.display;
        }

        return config;
    }

    /**
     * Set the config path (useful when we need to update it)
     */
    setConfigPath(configPath: string): void {
        this.configPath = configPath;
    }
}