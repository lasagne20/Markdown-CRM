import { DynamicClassFactory } from "../Config/DynamicClassFactory";
import { PopulateManager } from "../Config/PopulateManager";
import { IApp, IFile } from "../interfaces/IApp";
import { Classe } from "./Classe";
import { File } from "./File";
import * as yaml from 'js-yaml';

export interface Settings {
  templateFolder: string;
  personalName : string;
  configPath?: string; // Path to YAML configuration files
}

export class Vault {
    /*
    Global Vault, with all informations
    */
    public app: IApp;
    
    public settings: Settings;
    public files: { [key: string]: Classe } = {};

    public static classes: { [key: string]: typeof Classe } = {};
    private static dynamicClassFactory: DynamicClassFactory | null = null;

    constructor(app: IApp, settings: Settings) {
        this.app = app;
        this.settings = settings;
        // Initialize the dynamic class factory
        this.initializeDynamicClasses();
    }

    public getPath(): string {
        return this.app.getVaultPath();
    }

    public getName(): string {
        return this.app.getName();
    }


    private async initializeDynamicClasses() {
        try {
            const configPath = this.settings.configPath || './config';
            Vault.dynamicClassFactory = new DynamicClassFactory(configPath, this);
            
            // Load available classes and populate the static classes object
            const availableClasses = await Vault.dynamicClassFactory.getAvailableClasses();
            for (const className of availableClasses) {
                const dynamicClass = await Vault.dynamicClassFactory.getClass(className);
                Vault.classes[className] = dynamicClass;
            }
        } catch (error) {
            console.error('Failed to initialize dynamic classes:', error);
        }
    }

    getDynamicClassFactory(): DynamicClassFactory | null {
        return Vault.dynamicClassFactory;
    }

    getPersonalName(){
        return this.settings.personalName
    }

    getClasseFromName(name: string) : typeof Classe{
        return Vault.classes[name]
    }

    async getAvailableClasses(): Promise<string[]> {
        if (Vault.dynamicClassFactory) {
            return await Vault.dynamicClassFactory.getAvailableClasses();
        }
        return Object.keys(Vault.classes);
    }

    /**
     * Get extended classes including classes that inherit from the specified ones.
     * @param baseClasses Base class names to expand
     * @returns Array of class names including base classes and their children
     */
    async getExtendedClasses(baseClasses: string[]): Promise<string[]> {
        try {
            const configLoader = (this as any).configLoader;
            if (configLoader && typeof configLoader.getExtendedClasses === 'function') {
                const availableClasses = await this.getAvailableClasses();
                return await configLoader.getExtendedClasses(baseClasses, availableClasses);
            }
        } catch (error) {
            console.warn('Could not get extended classes:', error);
        }
        return baseClasses;
    }

    async listFiles(): Promise<IFile[]>{
        let files = await this.app.listFiles();
        const filtered: IFile[] = [];
        
        for (const file of files) {
            const fileInstance = new File(this, file);
            const classeValue = await fileInstance.getClassePropertyValue();
            if (classeValue) {
                filtered.push(file);
            }
        }
        
        return filtered;
    }

    readLinkFile(link: string, path = false): string {
        if (!link || typeof link !== "string") return "";
        // Match [[file|alias]] or [[file]]
        const match = link.match(/^\[\[([^\|\]]+?)(?:)?(?:\|([^\]]+))?\]\]$/);
        if (match) {
            const fileName = match[1]?.trim();
            const alias = match[2]?.trim();
            if (path) {
                return /\.[^\/\\]+$/.test(fileName) ? fileName : `${fileName}.md`;
            } else {
                return alias ? alias : fileName.split("/").pop()?.replace(".md","") || "";
            }
        }
        // If not a wikilink, just return the trimmed link
        return link.trim();
    }

    async getFromLink(name: string, log=true) {
        if (!name) { return null; }

        // Search with the path
        let path = this.readLinkFile(name, true);
        let directfile = (await this.listFiles()).find((f : IFile) => {
            return f.path.trim() === path.trim()
        });
        if (directfile) {
            if (directfile.path in Object.keys(this.files)) {
                return this.files[directfile.path];
            }
            return await this.createClasse(directfile);
        }


        let fileName = path.split("/").pop() || "";
        const files = (await this.listFiles()).filter((f : IFile) => f.name === fileName);
        if (files.length > 0) {
            let file = files[0];
            if (files.length > 1) {
                let path = this.readLinkFile(name, true);
                if (path) {
                    // Try to find the best match by walking up the path segments
                    let segments = path.split("/");
                    while (segments.length > 0) {
                        const candidatePath = segments.join("/");
                        const bestMatch = files.find((f : IFile) => f.path.endsWith("/" + candidatePath) || f.path === candidatePath);
                        if (bestMatch) {
                            file = bestMatch;
                            break;
                        }
                        segments.shift(); // Remove the first segment and try again
                    }
                }
                else {
                    console.error("Plusieurs fichiers trouvés pour le lien sans chemin : " + name, files);
                }
            }

            if (file.path in Object.keys(this.files)) {
                return this.files[file.path];
            }
            return await this.createClasse(file);
        }
        if (log) {
            console.error("Fichier non trouvé : " + name);
        }
        return null;
    }

    async getMediaFromLink(link: string) {
        let path = this.readLinkFile(link, true);
        const file = (await this.app.listFiles()).find((f : IFile) => {
            return f.path === path});
        if (file) {
            return file;
        }

        // try with the file name
        let fileName = this.readLinkFile(link);
        const files = (await this.app.listFiles()).filter((f : IFile) => f.name === fileName);
        if (files.length > 0) {
            let file = files[0];
            if (files.length > 1) {
                console.error("Plusieurs fichiers trouvés pour le lien sans chemin : " + link, files);
            }
            return file;
        }

        console.error("Media non trouvé : " + link);
        return null;
    }

    /*
    getFromFolder(folder: Folder) {
        let name = folder.path.split("/")[folder.path.split("/").length - 1];
        for (let file of folder.children || []) {
            if (this.app.isTFile(file) && file.name.includes(name)) {
                return this.getFromFile(file);
            }
        }
        console.error("Le dossier n'a pas de fichier classe : " + folder.path);
    }*/

    async getFromFile(file: IFile): Promise<Classe | undefined> {
        if (this.app.isFolder(file)) {
            let filePath = file.path + "/" + file.name;
            let iFile = await this.app.getFile(filePath)
            if (!iFile) {
                console.error("Le dossier n'a pas de fichier classe : " + file.path);
                return undefined;
            }
        }
        return await this.createClasse(file);
    }

    async createFile(classeType: null | typeof Classe = null, name: string = "", args: {parent? : Classe} = {}): Promise<File | undefined> {
        // Create the new file from the className template
        if (!classeType) {
            const dynamicClasses = Object.keys(Vault.classes);
            classeType = await this.app.selectClasse(this, dynamicClasses, "Quelle classe pour ce fichier ?");
            if (!classeType) { return; }
        }
        console.log("Args ; ",args)
        
        // Get class configuration for populate feature
        let classConfig = null;
        let populatedValues: { [key: string]: any } = {};
        
        if (Vault.dynamicClassFactory) {
            try {
                classConfig = await Vault.dynamicClassFactory.getClassConfig(classeType.name);
                
                // If populate is configured, prompt user for values before creating file
                if (classConfig && classConfig.populate && classConfig.populate.length > 0) {
                    const populateManager = new PopulateManager(this);
                    const values = await populateManager.populateProperties(classConfig);
                    
                    if (values === null) {
                        // User cancelled - abort file creation
                        return undefined;
                    }
                    
                    // Merge populated values with default values
                    populatedValues = populateManager.mergeWithDefaults(classConfig, values);
                } else if (classConfig) {
                    // No populate configured, but we still need to apply default values
                    const populateManager = new PopulateManager(this);
                    populatedValues = populateManager.mergeWithDefaults(classConfig, {});
                }
            } catch (error) {
                console.warn(`Could not load populate config for ${classeType.name}:`, error);
            }
        }
        
        if (!name) {
            let classe = await this.app.selectFile(this, [classeType.name], {hint:"Entrer un nom pour ce fichier", classeArgs: args});
            // Select File call createFile if the file doesn't exist
            // No need to continue
            return classe?.file;
        }
        let templatePath = this.settings.templateFolder + "/" + classeType.name + ".md";
        const templateFile = await this.app.getFile(templatePath);
        const newFilePath = name.includes(".md") ? name : `${name}.md`;
        const classePropertyName = this.app.getSettings().classePropertyName || "Classe";
        let templateContent = `---\n${classePropertyName}: ` + classeType.name + "\n---\n";

        if (templateFile && 'extension' in templateFile && (await this.app.isFile(templateFile as IFile))) {
            templateContent = await this.app.readFile(templateFile as IFile);
        } else {
            console.warn("Le fichier template n'existe pas :" + templatePath + ". Un fichier vide sera créé.");
        }
        
        // Apply populated values to template content before creating file
        if (Object.keys(populatedValues).length > 0) {
            console.log("📝 Injection des valeurs populate dans le template...");
            
            // Parse frontmatter and inject values
            const frontmatterMatch = templateContent.match(/^---\n([\s\S]*?)\n---/);
            if (frontmatterMatch) {
                // Parse existing frontmatter as YAML
                let frontmatterObj: any;
                try {
                    frontmatterObj = yaml.load(frontmatterMatch[1]) || {};
                } catch (error) {
                    console.error("Error parsing frontmatter YAML:", error);
                    frontmatterObj = {};
                }
                
                // Merge populated values into frontmatter object
                for (const [propName, value] of Object.entries(populatedValues)) {
                    frontmatterObj[propName] = value;
                    console.log(`  ✓ ${propName}:`, value);
                }
                
                // Serialize back to YAML
                const newFrontmatter = yaml.dump(frontmatterObj, {
                    flowLevel: -1,     // Force le format multi-ligne pour les tableaux
                    lineWidth: -1,     // Pas de limite de largeur de ligne (empêche le folding)
                    noRefs: true,      // Pas de références YAML
                    sortKeys: false,   // Garder l'ordre des clés
                    forceQuotes: true, // Forcer les guillemets pour éviter les problèmes avec les crochets
                    quotingType: '"',  // Utiliser des guillemets doubles
                    noCompatMode: true // Mode moderne (pas de wrap automatique)
                });
                
                // Reconstruct template with updated frontmatter
                templateContent = `---\n${newFrontmatter}---` + templateContent.substring(frontmatterMatch[0].length);
            }
        }
        
        let file: File | null = null;
        try {
            file = new File(this, await this.app.createFile(newFilePath, templateContent));
            console.log("Nouveau fichier créé : " + newFilePath);
        } catch (error) {
            // Modifier le fichier s'il existe déjà
            const existingFile = await this.app.getFile(newFilePath);
            if (!existingFile) {
                throw Error("Le fichier n'a pas pu être créé ou modifié : " + newFilePath);
            }
            if (existingFile && 'extension' in existingFile && this.app.isFile(existingFile as IFile)) {
                await this.app.writeFile(existingFile as IFile, templateContent);
                console.log("Fichier modifié : " + newFilePath);
                // Récupérer le fichier après modification
                file = new File(this, existingFile as IFile);
            } else {
                throw Error("Le fichier n'a pas pu être créé ou modifié : " + newFilePath);
            }
        }

        if (!file) {
            throw Error("Le fichier n'existe pas : " + newFilePath);
        }
        
        await this.app.waitForFileMetaDataUpdate(file.path, this.app.getSettings().classePropertyName || "Classe", async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
            if (!file) { return; }
            let classe = await this.getFromFile(file);
            if (!classe) {
                console.error("Classe non trouvée pour le fichier : " + file.path);
                return;
            }
            
            // Note: populated values have already been injected into the template
            // before file creation, so we don't need to update them here
            
            await classe.onCreate();
            console.log("Classe créée : " + classe.name);
        });
        return file;
    }

    async refreshAll() {
        // Move all files 
        let watchedFiles: string[] = [];
        for (let file of await this.app.listFiles()) {
            if (watchedFiles.includes(file.name) || file.path.startsWith("Outils")) {
                continue;
            }
            console.log("Refresh : " + file.path);
            const classe = await this.getFromFile(file);
            if (classe) {
                classe.onUpdate();
            }

            // Remove the duplicates
            /*
            for (let file2 of this.app.vault.getFiles()) {
                // Compare the name
                if (file.name === file2.name && file.path != file2.path && this.getFromFile(file)?.getClasse() === this.getFromFile(file2)?.getClasse()) {
                    console.error("Doublon de \n" + file.path + "\n" + file2.path);
                    // Keep the first by default
                    await this.app.vault.delete(file2);
                }
            }*/
            watchedFiles.push(file.name);
        }

        // Remove empty folders 
        for (let folder of await this.app.listFolders()) {
            if (folder.children && folder.children.length === 0) {
                await this.app.delete(folder);
            }
        }

        this.app.sendNotice("Vault refresh");
    }

    async createClasse(file: IFile, onCreate = true): Promise<Classe | undefined> {
        let fileInstance: File;
        let classe: Classe | undefined = undefined;
        if (!(file instanceof File)){
            fileInstance = new File(this, file);
        } else {
            fileInstance = file;
        }
        let existingClass = this.files[file.path];
        if (existingClass) { return existingClass; }
        
        // Use getClassePropertyValue to handle aliases and migration
        const className = await fileInstance.getClassePropertyValue();
        if (!className) {
            console.error("Pas de classe définie dans les métadonnées pour:", fileInstance.getPath());
            const metadata = await this.app.getMetadata(fileInstance);
            console.error("Métadonnées disponibles:", Object.keys(metadata));
            return undefined;
        }

        try {
            // Use the dynamic class factory to get the constructor
            if (Vault.dynamicClassFactory) {
                const constructor = await Vault.dynamicClassFactory.getClass(className);
                if (constructor) {
                    classe =  new constructor(this, fileInstance);
                }
            }
            
            // Fallback to static classes if dynamic factory is not available
            let constructor = Vault.classes[className];
            if (constructor) {
                classe = new constructor(this, fileInstance);
            }
            if (!classe) {
                console.error("Type non connue : " + className);
            }
        } catch (error) {
            console.error("Erreur lors de la création de la classe : " + className, error);
        }
        this.files[fileInstance.path] = classe!;
        if (onCreate){
            await classe?.onCreate();
        }
        return classe;
    }
}