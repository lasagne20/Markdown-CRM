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
        if (existingFile && existingFile.path === newFilePath) {
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

    /**
     * Get the classe property name from metadata, checking aliases if configured
     * @returns The classe name or undefined
     */
    async getClassePropertyValue(): Promise<string | undefined> {
      const metadata = await this.getMetadata();
      const settings = this.vault.app.getSettings();
      const classePropertyName = settings.classePropertyName || 'Classe';
      const aliases = settings.classePropertyAliases || [];
      
      // Check main property first
      if (metadata[classePropertyName] !== undefined) {
        return metadata[classePropertyName];
      }
      
      // Check aliases
      for (const alias of aliases) {
        if (metadata[alias] !== undefined) {
          const value = metadata[alias];
          
          // Migrate: copy value to main property and optionally delete alias
          await this.updateMetadata(classePropertyName, value);
          
          // Delete old alias if setting is true (default)
          if (settings.deleteAliasesAfterMigration !== false) {
            await this.removeMetadata(alias);
          }
          
          return value;
        }
      }
      
      return undefined;
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
        const metadata = await this.vault.app.getMetadata(this.file);
        
        if (!metadata) {
            this.lock = false; 
            return;
        }
        
        // Check if value actually changed BEFORE assignment
        const oldValue = metadata[key];
        if (JSON.stringify(oldValue) === JSON.stringify(value)) {
            this.lock = false;
            return; // No change, skip update
        }
        
        // Update metadata using app.updateMetadata
        metadata[key] = value;
        await this.vault.app.updateMetadata(this.file, metadata);
      }
      finally {
          this.lock = false;
      }
    }

    async removeMetadata(key: string) {
      console.log("Remove metadata " + key)
      const metadata = await this.vault.app.getMetadata(this.file);
      if (!metadata) return;
      delete metadata[key];
      await this.vault.app.updateMetadata(this.file, metadata);
    }
}