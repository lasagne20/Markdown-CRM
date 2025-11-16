import { IApp, IFile, IFolder } from "../interfaces/IApp";
import { Vault } from "./Vault";
import { waitForFileMetaDataUpdate, waitForMetaDataCacheUpdate } from "./Utils";
import { dump, load as parseYaml } from 'js-yaml';

export class Folder {

}

export class File implements IFile {
    /*
    Allow to quickly use files methods
    */
    public vault : Vault;
    public file: any;
    private lock : boolean;
    public linkRegex = /^"?\[\[(.*?)\]\]"?$/;

    public name : string;
    public path : string;
    public basename : string;
    public extension : string;
    public parent?: IFolder;
    public children?: (IFile | IFolder)[];

    constructor(vault : Vault, file: IFile) {
      this.vault = vault;
      this.file = file;
      this.lock = false

      this.name = file.name;
      this.path = file.path;
      this.basename = file.basename;
      this.extension = file.extension;
      this.parent = file.parent;
      this.children = file.children;

    }

    getFolderPath(){
      return this.file.path.substring(0, this.file.path.lastIndexOf("/"))
    }

    getFile(){
      return this.file
    }

    isFolderFile(){
      // Return true if the file is also a folder
      return this.file.path.substring(0, this.file.path.lastIndexOf("/")).endsWith(this.getName().replace(".md", ""))
    }

    getFolderFilePath(){
      // Return the folderFile path
      let path = this.getFolderPath()
      if (this.isFolderFile()){
        return path
      }
      return path + "/" + this.getName(false)
    }

    getParentFolderPath(){
      let path = this.getFolderPath()
      if (this.isFolderFile()){
        path = path.substring(0, path.lastIndexOf("/"))
      }
      return path
    }

    getName(md=true){
      if (md){
        return this.file.name
      }
      return this.file.name.replace(".md","")
    }

    async getID(): Promise<string> {
      let id = (await this.getMetadata())?.Id
      if (!id){
        id = require("uuid").v4()
        this.updateMetadata("Id", id)
      }
      return id
    }

    getPath(){
      // Return the file path
      return this.file.path
    }

    getLink(){
      return `[[${this.getPath()}|${this.getName(false)}]]`
    }

    async move(targetFolderPath: string, targetFileName?: string) {
      if (this.lock) {
        while (this.lock) {
          await new Promise(resolve => setTimeout(resolve, 100));
          console.log("Waiting for lock")
        }
      };
      this.lock = true;
      if (!targetFileName){
        targetFileName = this.getName();
      }
      try {
        // Ne pas créer de sous-dossier automatiquement - déplacer directement
        // Always move only the .md file, never the folder
        // The parent-child recursion system will handle moving children
        let newFilePath = `${targetFolderPath}/${targetFileName}`;

        // Vérification si le fichier cible existe déjà
        const existingFile = await this.vault.app.getFile(newFilePath);
        if (existingFile) {
            console.log('Le fichier existe déjà, impossible de déplacer.');
            this.lock = false;
            return;
        }
    
        try {
            // Déplacer uniquement le fichier .md
            await this.vault.app.move(this.file, newFilePath);
            console.log(`Fichier déplacé vers ${newFilePath}`);
            
            // Update internal file object with new path
            this.file.path = newFilePath;
            this.path = newFilePath;
            if (targetFileName) {
                this.file.name = targetFileName;
                this.file.basename = targetFileName.replace('.md', '');
            }
        } catch (error) {
            console.error('Erreur lors du déplacement du fichier :', error);
        }
      }
      finally {
          this.lock = false;
      }
  }
  getFromLink(name:  string) : any{
    return this.vault.getFromLink(name)
  }

    async getMetadata() : Promise <Record<string, any>>{
      let metadata = await this.vault.app.getMetadata(this.file);
      return metadata
    }

    async getMetadataValue(key: string){
      let metadata = await this.getMetadata();
      return metadata ? metadata[key] : undefined;
    }

    getAllProperties(){
      let metadata = this.getMetadata();
      if (!metadata) return {};
      // Return property objects that match the expected format
      const properties: Record<string, any> = {};
      for (const key in metadata) {
        properties[key] = { name: key };
      }
      return properties;
    }

  
    async updateMetadata(key: string, value: any) {
      if (this.lock) {
        while (this.lock) {
          await new Promise(resolve => setTimeout(resolve, 100));
          console.log("Waiting for lock")
        }
      };
      this.lock = true;
      
      try {
        const fileContent = await this.vault.app.readFile(this.file);
        const { body } = this.extractFrontmatter(fileContent);
        const { existingFrontmatter } = this.extractFrontmatter(fileContent);

        if (!existingFrontmatter) {
            this.lock = false; 
            return;
        }

        try {
            let frontmatter = parseYaml(existingFrontmatter) as any;

            if (!frontmatter) {
                this.lock = false; 
                return;
            }
            
            // Check if value actually changed BEFORE assignment
            const oldValue = frontmatter[key];
            if (JSON.stringify(oldValue) === JSON.stringify(value)) {
                this.lock = false;
                return; // No change, skip write and wait
            }
            
            frontmatter[key] = value;
            
            // Options pour dump : utiliser le format YAML multi-ligne pour les tableaux
            let newFrontmatter = dump(frontmatter, {
                flowLevel: -1,     // Force le format multi-ligne pour les tableaux
                lineWidth: -1,     // Pas de limite de largeur de ligne (empêche le folding)
                noRefs: true,      // Pas de références YAML
                sortKeys: false,   // Garder l'ordre des clés
                forceQuotes: true, // Forcer les guillemets pour éviter les problèmes avec les crochets
                quotingType: '"',  // Utiliser des guillemets doubles
                noCompatMode: true // Mode moderne (pas de wrap automatique)
            });

            const newContent = `---\n${newFrontmatter}\n---\n${body}`;
            
            await this.vault.app.writeFile(this.file, newContent);
            
            await this.vault.app.waitForFileMetaDataUpdate(this.getPath(), key, async () => { return; });

        } catch (error) {
            console.error("❌ Erreur lors du parsing du frontmatter:", error);
        }
      }
      finally {
          this.lock = false;
      }
    }

    async removeMetadata(key: string) {
      console.log("Remove metadata " + key)
      const frontmatter = await this.getMetadata();
      if (!frontmatter) return;
      delete frontmatter[key]
      await this.saveFrontmatter(frontmatter);
    }
    
    async reorderMetadata(propertiesOrder: string[]) {
        const frontmatter = this.getMetadata();
        if (!frontmatter) return;

        propertiesOrder.push("Id")

        if (JSON.stringify(propertiesOrder) === JSON.stringify(Object.keys(frontmatter))) return;

        console.log("Re-order metadata");
        // Sort properties and extract extra ones
        const { sortedFrontmatter, extraProperties } = this.sortFrontmatter(frontmatter, propertiesOrder);
        await this.saveFrontmatter(sortedFrontmatter, extraProperties);
    }
    
    async saveFrontmatter(frontmatter: Record<string, any>, extraProperties: string[] = []) {
        const fileContent = await this.vault.app.readFile(this.file);
        const { body } = this.extractFrontmatter(fileContent);
    
        // Reformater le frontmatter avec format YAML multi-ligne
        const newFrontmatter = dump(frontmatter, {
            flowLevel: -1,
            lineWidth: -1,
            noRefs: true,
            sortKeys: false,
            forceQuotes: true,
            quotingType: '"',
            noCompatMode: true
        });
        const filteredExtraProperties = extraProperties.filter(prop => prop && prop.trim() !== "");
        //const extraText = filteredExtraProperties.length > 0 ? `\n${filteredExtraProperties.join("\n")}` : "";

        
        // Sauvegarde du fichier
        const newContent = `---\n${newFrontmatter}\n---\n${body}`; //${extraText}
        await this.vault.app.writeFile(this.file, newContent);
        console.log("Updated file")
    }

    
    // Extraire le frontmatter et le reste du contenu
    extractFrontmatter(content: string) {
        // Support both \n (Unix) and \r\n (Windows) line endings
        const frontmatterRegex = /^---\r?\n([\s\S]+?)\r?\n---\r?\n/;
        const match = content.match(frontmatterRegex);
        return {
            existingFrontmatter: match ? match[1] : "",
            body: match ? content.replace(match[0], "") : content,
        };
    }
    
    // Trier les propriétés et identifier celles en surplus
    // Méthode simple pour les tests
    formatFrontmatter(frontmatter: Record<string, any>): string {
        return dump(frontmatter, {
            flowLevel: -1,
            lineWidth: -1,
            noRefs: true,
            sortKeys: false,
            forceQuotes: true,
            quotingType: '"',
            noCompatMode: true
        });
    }

    sortFrontmatter(frontmatter: Record<string, any>, propertiesOrder: string[]) {
        let sortedFrontmatter: Record<string, any> = {};
        let extraProperties: string[] = [];
        
        propertiesOrder.forEach(prop => {
            if (prop in frontmatter) {
                sortedFrontmatter[prop] = frontmatter[prop];
            } else {
                sortedFrontmatter[prop] = null;
            }
        });
        
        Object.keys(frontmatter).forEach(prop => {
            if (!propertiesOrder.includes(prop)) {
                extraProperties.push(`${prop}: ${JSON.stringify(frontmatter[prop])}`);
            }
        });
        
        return { sortedFrontmatter, extraProperties };
    }
}