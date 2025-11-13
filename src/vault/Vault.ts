import { DynamicClassFactory } from "../Config/DynamicClassFactory";
import { IApp, IFile } from "../interfaces/IApp";
import { Classe } from "./Classe";
import { File } from "./File";

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
        let directfile = (await this.app.listFiles()).find((f : IFile) => {
            return f.path.trim() === path.trim()
        });
        if (directfile) {
            if (directfile.path in Object.keys(this.files)) {
                return this.files[directfile.path];
            }
            return await this.createClasse(directfile);
        }


        let fileName = path.split("/").pop() || "";
        const files = (await this.app.listFiles()).filter((f : IFile) => f.name === fileName);
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

        let existingClass = this.files[file.path];
        if (existingClass) { return existingClass; }
        
        let classe: Classe | undefined;
        
        classe = await this.createClasse(file);

        return classe;

    }

    async createFile(classeType: null | typeof Classe = null, name: string = "", args: {parent? : Classe} = {}): Promise<File | undefined> {
        // Create the new file from the className template
        if (!classeType) {
            const dynamicClasses = Object.keys(Vault.classes);
            classeType = await this.app.selectClasse(this, dynamicClasses, "Quelle classe pour ce fichier ?");
            if (!classeType) { return; }
        }
        console.log("Args ; ",args)
        if (!name) {
            let classe = await this.app.selectFile(this, [classeType.name], {hint:"Entrer un nom pour ce fichier", classeArgs: args});
            // Select File call createFile if the file doesn't exist
            // No need to continue
            return classe?.file;
        }
        let templatePath = this.settings.templateFolder + "/" + classeType.name + ".md";
        const templateFile = await this.app.getFile(templatePath);
        const newFilePath = name.includes(".md") ? name : `${name}.md`;
        let templateContent = "---\nClasse: " + classeType.name + "\n---\n";

        if (templateFile && (await this.app.isFile(templateFile))) {
            templateContent = await this.app.readFile(templateFile);
        } else {
            console.warn("Le fichier template n'existe pas :" + templatePath + ". Un fichier vide sera créé.");
        }
        let file: File | null = null;
        try {
            file = new File(this, await this.app.createFile(newFilePath, templateContent));
            console.log("Nouveau fichier créé : " + newFilePath);
        } catch (error) {
            // Modifier le fichier s'il existe déjà
            const file = await this.app.getFile(newFilePath);
            if (!file) {
                throw Error("Le fichier n'a pas pu être créé ou modifié : " + newFilePath);
            }
            if (file && this.app.isFile(file)) {
                await this.app.writeFile(file, templateContent);
                console.log("Fichier modifié : " + newFilePath);
            } else {
                throw Error("Le fichier n'a pas pu être créé ou modifié : " + newFilePath);
            }
        }

        if (!file) {
            throw Error("Le fichier n'existe pas : " + newFilePath);
        }
        
        await this.app.waitForFileMetaDataUpdate(file.path, "Classe", async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
            if (!file) { return; }
            let classe = await this.getFromFile(file);
            if (!classe) {
                console.error("Classe non trouvée pour le fichier : " + file.path);
                return;
            }
            await classe.onCreate();
            await classe.onUpdate();
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

    async createClasse(file: IFile) {
        let fileInstance: File;
        if (!(file instanceof File)){
            fileInstance = new File(this, file);
        } else {
            fileInstance = file;
        }
        
        const metadata = await this.app.getMetadata(fileInstance);
        if (!metadata) {
            console.error("Pas de metadata pour le fichier:", fileInstance.getPath());
            return;
        }
        
        const className = metadata["Classe"];
        if (!className) {
            console.error("Pas de classe définie dans les métadonnées pour:", fileInstance.getPath());
            console.error("Métadonnées disponibles:", Object.keys(metadata));
            return undefined;
        }

        try {
            // Use the dynamic class factory to get the constructor
            if (Vault.dynamicClassFactory) {
                const constructor = await Vault.dynamicClassFactory.getClass(className);
                if (constructor) {
                    return new constructor(this, fileInstance);
                }
            }
            
            // Fallback to static classes if dynamic factory is not available
            let constructor = Vault.classes[className];
            if (constructor) {
                return new constructor(this, fileInstance);
            }
            
            console.error("Type non connue : " + className);
            return undefined;
        } catch (error) {
            console.error("Erreur lors de la création de la classe : " + className, error);
            return undefined;
        }
    }
}