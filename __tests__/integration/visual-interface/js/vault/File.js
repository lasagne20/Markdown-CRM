// Use js-yaml from CDN (loaded in HTML as window.jsyaml)
const dump = (obj) => {
    if (window.jsyaml && window.jsyaml.dump) {
        return window.jsyaml.dump(obj);
    } else {
        return JSON.stringify(obj, null, 2);
    }
};
const parseYaml = (str) => {
    if (window.jsyaml && window.jsyaml.load) {
        return window.jsyaml.load(str);
    } else {
        try {
            return JSON.parse(str);
        } catch {
            return {};
        }
    }
};
export class Folder {
}
export class File {
    constructor(vault, file) {
        this.linkRegex = /^"?\[\[(.*?)\]\]"?$/;
        this.vault = vault;
        this.file = file;
        this.lock = false;
        this.name = file.name;
        this.path = file.path;
        this.basename = file.basename;
        this.extension = file.extension;
    }
    getFolderPath() {
        return this.file.path.substring(0, this.file.path.lastIndexOf("/"));
    }
    getFile() {
        return this.file;
    }
    isFolderFile() {
        // Return true if the file is also a folder
        return this.file.path.substring(0, this.file.path.lastIndexOf("/")).endsWith(this.getName().replace(".md", ""));
    }
    getFolderFilePath() {
        // Return the folderFile path
        let path = this.getFolderPath();
        if (this.isFolderFile()) {
            return path;
        }
        return path + "/" + this.getName(false);
    }
    getParentFolderPath() {
        let path = this.getFolderPath();
        if (this.isFolderFile()) {
            path = path.substring(0, path.lastIndexOf("/"));
        }
        return path;
    }
    getName(md = true) {
        if (md) {
            return this.file.name;
        }
        return this.file.name.replace(".md", "");
    }
    async getID() {
        let id = (await this.getMetadata())?.Id;
        if (!id) {
            id = require("uuid").v4();
            this.updateMetadata("Id", id);
        }
        return id;
    }
    getPath() {
        // Return the file path
        return this.file.path;
    }
    getLink() {
        return `[[${this.getPath()}|${this.getName(false)}]]`;
    }
    async move(targetFolderPath, targetFileName) {
        if (this.lock) {
            while (this.lock) {
                await new Promise(resolve => setTimeout(resolve, 100));
                console.log("Waiting for lock");
            }
        }
        ;
        this.lock = true;
        if (!targetFileName) {
            targetFileName = this.getName();
        }
        try {
            // Check if the folder of the target pathname exist
            let subtargetPath = targetFolderPath + "/" + targetFileName;
            const folder = await this.vault.app.getFile(subtargetPath);
            if (folder) {
                targetFolderPath = subtargetPath;
            }
            // Check if we need to move the file or the folder
            let moveFile = this.file;
            let newFilePath = `${targetFolderPath}/${targetFileName}`;
            if (this.isFolderFile()) {
                let folder = await this.vault.app.getFile(this.getFolderPath());
                if (folder) {
                    moveFile = folder;
                    newFilePath = newFilePath.replace(".md", "");
                }
            }
            // Vérification si le fichier cible existe déjà
            const existingFile = await this.vault.app.getFile(newFilePath);
            if (existingFile) {
                console.log('Le fichier existe déjà, impossible de déplacer.');
                this.lock = false;
                return;
            }
            try {
                // Essayer de déplacer le fichier
                if (moveFile) {
                    await this.vault.app.renameFile(moveFile, newFilePath);
                    console.log(`Fichier déplacé vers ${newFilePath}`);
                }
            }
            catch (error) {
                console.error('Erreur lors du déplacement du fichier :', error);
            }
        }
        finally {
            this.lock = false;
        }
    }
    getFromLink(name) {
        return this.vault.getFromLink(name);
    }
    async getMetadata() {
        let metadata = await this.vault.app.getMetadata(this.file);
        return metadata;
    }
    async getMetadataValue(key) {
        let metadata = await this.getMetadata();
        return metadata ? metadata[key] : undefined;
    }
    getAllProperties() {
        let metadata = this.getMetadata();
        if (!metadata)
            return {};
        // Return property objects that match the expected format
        const properties = {};
        for (const key in metadata) {
            properties[key] = { name: key };
        }
        return properties;
    }
    async updateMetadata(key, value) {
        if (this.lock) {
            while (this.lock) {
                await new Promise(resolve => setTimeout(resolve, 100));
                console.log("Waiting for lock");
            }
        }
        ;
        this.lock = true;
        try {
            console.log("Update metadata on " + this.getName() + " : " + key + " --> " + value);
            const fileContent = await this.vault.app.readFile(this.file);
            const { body } = this.extractFrontmatter(fileContent);
            const { existingFrontmatter } = this.extractFrontmatter(fileContent);
            if (!existingFrontmatter) {
                this.lock = false;
                return;
            }
            try {
                let frontmatter = parseYaml(existingFrontmatter);
                if (!frontmatter) {
                    this.lock = false;
                    return;
                }
                ;
                frontmatter[key] = value;
                // Options pour dump : utiliser le format YAML multi-ligne pour les tableaux
                const newFrontmatter = dump(frontmatter, {
                    flowLevel: -1, // Force le format multi-ligne pour les tableaux
                    lineWidth: -1, // Pas de limite de largeur de ligne
                    noRefs: true, // Pas de références YAML
                    sortKeys: false // Garder l'ordre des clés
                });
                const newContent = `---\n${newFrontmatter}\n---\n${body}`; //${extraText}
                await this.vault.app.writeFile(this.file, newContent);
                await this.vault.app.waitForFileMetaDataUpdate(this.getPath(), key, async () => { return; });
                console.log("Metdata updated");
            }
            catch (error) {
                console.error("❌ Erreur lors du parsing du frontmatter:", error);
            }
        }
        finally {
            this.lock = false;
        }
    }
    async removeMetadata(key) {
        console.log("Remove metadata " + key);
        const frontmatter = await this.getMetadata();
        if (!frontmatter)
            return;
        delete frontmatter[key];
        await this.saveFrontmatter(frontmatter);
    }
    async reorderMetadata(propertiesOrder) {
        const frontmatter = this.getMetadata();
        if (!frontmatter)
            return;
        propertiesOrder.push("Id");
        if (JSON.stringify(propertiesOrder) === JSON.stringify(Object.keys(frontmatter)))
            return;
        console.log("Re-order metadata");
        // Sort properties and extract extra ones
        const { sortedFrontmatter, extraProperties } = this.sortFrontmatter(frontmatter, propertiesOrder);
        await this.saveFrontmatter(sortedFrontmatter, extraProperties);
    }
    async saveFrontmatter(frontmatter, extraProperties = []) {
        const fileContent = await this.vault.app.readFile(this.file);
        const { body } = this.extractFrontmatter(fileContent);
        // Reformater le frontmatter avec format YAML multi-ligne
        const newFrontmatter = dump(frontmatter, {
            flowLevel: -1,
            lineWidth: -1,
            noRefs: true,
            sortKeys: false
        });
        const filteredExtraProperties = extraProperties.filter(prop => prop && prop.trim() !== "");
        //const extraText = filteredExtraProperties.length > 0 ? `\n${filteredExtraProperties.join("\n")}` : "";
        // Sauvegarde du fichier
        const newContent = `---\n${newFrontmatter}\n---\n${body}`; //${extraText}
        await this.vault.app.writeFile(this.file, newContent);
        console.log("Updated file");
    }
    // Extraire le frontmatter et le reste du contenu
    extractFrontmatter(content) {
        const frontmatterRegex = /^---\n([\s\S]+?)\n---\n/;
        const match = content.match(frontmatterRegex);
        return {
            existingFrontmatter: match ? match[1] : "",
            body: match ? content.replace(match[0], "") : content,
        };
    }
    // Trier les propriétés et identifier celles en surplus
    // Méthode simple pour les tests
    formatFrontmatter(frontmatter) {
        return dump(frontmatter, {
            flowLevel: -1,
            lineWidth: -1,
            noRefs: true,
            sortKeys: false
        });
    }
    sortFrontmatter(frontmatter, propertiesOrder) {
        let sortedFrontmatter = {};
        let extraProperties = [];
        propertiesOrder.forEach(prop => {
            if (prop in frontmatter) {
                sortedFrontmatter[prop] = frontmatter[prop];
            }
            else {
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
