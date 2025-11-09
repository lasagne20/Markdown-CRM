// FakeApp implementation in JavaScript for the admin interface
export class FakeApp {
    constructor(vaultPath, vaultName) {
        this.vaultPath = vaultPath;
        this.vaultName = vaultName;
        this.fileSystem = new Map();
        this.settings = new Map();
        console.log(`🏗️ FakeApp initialisée: ${vaultName} at ${vaultPath}`);
    }

    getName() {
        return this.vaultName;
    }

    getVaultPath() {
        return this.vaultPath;
    }

    async createFile(filePath, content) {
        const cleanPath = filePath.startsWith('/') ? filePath : '/' + filePath;
        
        // Parse frontmatter if present
        let metadata = {};
        let fileContent = content;
        
        if (content.startsWith('---')) {
            const parts = content.split('---');
            if (parts.length >= 3) {
                const frontmatterText = parts[1];
                fileContent = parts.slice(2).join('---');
                
                // Parse YAML frontmatter (support quotes, numbers, booleans)
                frontmatterText.split('\n').forEach(line => {
                    line = line.trim();
                    if (!line) return;
                    
                    const colonIndex = line.indexOf(':');
                    if (colonIndex === -1) return;
                    
                    const key = line.substring(0, colonIndex).trim();
                    let value = line.substring(colonIndex + 1).trim();
                    
                    // Remove quotes
                    if ((value.startsWith('"') && value.endsWith('"')) || 
                        (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.slice(1, -1);
                    }
                    
                    // Parse booleans
                    if (value === 'true') value = true;
                    else if (value === 'false') value = false;
                    // Parse numbers
                    else if (!isNaN(value) && value !== '') {
                        value = Number(value);
                    }
                    
                    metadata[key] = value;
                });
            }
        }

        const file = {
            path: cleanPath,
            name: cleanPath.split('/').pop(),
            content: content, // Store full content including frontmatter
            metadata: metadata
        };

        this.fileSystem.set(cleanPath, {
            content: content, // Store full content
            metadata: metadata,
            isFolder: false
        });

        console.log(`📄 Fichier créé: ${cleanPath}`, metadata);
        
        // Compléter les métadonnées avec les propriétés manquantes de la classe
        await this.ensureAllClassProperties(file);
        
        return file;
    }
    
    async ensureAllClassProperties(file) {
        // Récupérer la classe du fichier
        const metadata = this.fileSystem.get(file.path)?.metadata;
        if (!metadata || !metadata.Classe) {
            return;
        }
        
        const className = metadata.Classe;
        
        try {
            // Charger la configuration de la classe
            const response = await fetch(`/config/${className}.yaml`);
            if (!response.ok) {
                console.warn(`⚠️ Config non trouvée pour la classe: ${className}`);
                return;
            }
            
            const yamlContent = await response.text();
            
            // Parser le YAML (simple parsing pour récupérer les propriétés)
            const propertyRegex = /- name: (\w+)/g;
            const properties = [];
            let match;
            
            while ((match = propertyRegex.exec(yamlContent)) !== null) {
                properties.push(match[1]);
            }
            
            console.log(`🔍 Propriétés de la classe ${className}:`, properties);
            
            // Ajouter les propriétés manquantes avec des valeurs vides
            let updated = false;
            for (const propName of properties) {
                if (!(propName in metadata)) {
                    metadata[propName] = '';
                    updated = true;
                    console.log(`➕ Ajout de la propriété manquante: ${propName}`);
                }
            }
            
            // Si on a ajouté des propriétés, reconstruire le fichier
            if (updated) {
                const existing = this.fileSystem.get(file.path);
                
                // Extraire le corps du document
                let bodyContent = '';
                if (existing.content.startsWith('---')) {
                    const parts = existing.content.split('---');
                    if (parts.length >= 3) {
                        bodyContent = parts.slice(2).join('---');
                    }
                }
                
                // Reconstruire le frontmatter
                let yamlContent = '---\n';
                for (const [key, value] of Object.entries(metadata)) {
                    if (value === undefined || value === null) {
                        yamlContent += `${key}: \n`;
                    } else if (value === '') {
                        yamlContent += `${key}: \n`;
                    } else {
                        let formattedValue;
                        if (typeof value === 'string') {
                            if (value.includes(':') || value.includes('#') || value.includes('\n') || value.includes('"')) {
                                formattedValue = `"${value.replace(/"/g, '\\"')}"`;
                            } else {
                                formattedValue = value;
                            }
                        } else if (typeof value === 'boolean') {
                            formattedValue = value ? 'true' : 'false';
                        } else if (typeof value === 'number') {
                            formattedValue = value.toString();
                        } else if (Array.isArray(value)) {
                            formattedValue = value.length === 0 ? '[]' : JSON.stringify(value);
                        } else {
                            formattedValue = String(value);
                        }
                        yamlContent += `${key}: ${formattedValue}\n`;
                    }
                }
                yamlContent += '---';
                
                // Mettre à jour le contenu
                const newContent = yamlContent + bodyContent;
                existing.content = newContent;
                existing.metadata = metadata;
                
                // Écrire sur le disque pour synchroniser
                await this.writeFile(file, newContent);
                
                console.log(`✅ Fichier mis à jour avec toutes les propriétés de la classe`);
            }
            
        } catch (error) {
            console.error(`❌ Erreur lors de la complétion des propriétés:`, error);
        }
    }

    async updateMetadata(file, metadata) {
        if (this.fileSystem.has(file.path)) {
            const existing = this.fileSystem.get(file.path);
            existing.metadata = { ...existing.metadata, ...metadata };
            console.log(`📝 Métadonnées mises à jour en mémoire: ${file.path}`, metadata);
            console.log(`📝 Toutes les métadonnées:`, existing.metadata);
            
            // Reconstruire le contenu complet du fichier avec le frontmatter mis à jour
            const currentContent = existing.content;
            let bodyContent = '';
            
            // Extraire le corps du document (sans le frontmatter)
            if (currentContent.startsWith('---')) {
                const parts = currentContent.split('---');
                if (parts.length >= 3) {
                    // Le corps est tout après le deuxième '---'
                    bodyContent = parts.slice(2).join('---');
                }
            } else {
                bodyContent = currentContent;
            }
            
            // Construire le nouveau frontmatter YAML
            let yamlContent = '---\n';
            for (const [key, value] of Object.entries(existing.metadata)) {
                // Inclure toutes les propriétés, même celles avec des valeurs vides
                if (value === undefined || value === null) {
                    yamlContent += `${key}: \n`;
                } else {
                    // Formater la valeur selon son type
                    let formattedValue;
                    if (typeof value === 'string') {
                        // Valeur vide
                        if (value === '') {
                            formattedValue = '';
                        }
                        // Échapper les guillemets et ajouter des guillemets si nécessaire
                        else if (value.includes(':') || value.includes('#') || value.includes('\n') || value.includes('"')) {
                            formattedValue = `"${value.replace(/"/g, '\\"')}"`;
                        } else {
                            formattedValue = value;
                        }
                    } else if (typeof value === 'boolean') {
                        formattedValue = value ? 'true' : 'false';
                    } else if (typeof value === 'number') {
                        formattedValue = value.toString();
                    } else if (Array.isArray(value)) {
                        if (value.length === 0) {
                            formattedValue = '[]';
                        } else {
                            formattedValue = JSON.stringify(value);
                        }
                    } else {
                        formattedValue = String(value);
                    }
                    yamlContent += `${key}: ${formattedValue}\n`;
                }
            }
            yamlContent += '---';
            
            // Combiner frontmatter + corps
            const newContent = yamlContent + bodyContent;
            existing.content = newContent;
            
            // Écrire sur le disque
            await this.writeFile(file, newContent);
        }
    }

    async getMetadata(file) {
        if (this.fileSystem.has(file.path)) {
            return this.fileSystem.get(file.path).metadata;
        }
        return {};
    }

    async readFile(file) {
        // Check if it's a request for a config file
        const filePath = typeof file === 'string' ? file : file.path;
        
        if (filePath.includes('config/') || filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
            console.log(`📋 Tentative de lecture du fichier config: ${filePath}`);
            try {
                // Extract just the filename for the HTTP request
                const fileName = filePath.split('/').pop();
                const response = await fetch(`/config/${fileName}`);
                if (response.ok) {
                    const content = await response.text();
                    console.log(`✅ Fichier config lu avec succès: ${fileName}`);
                    return content;
                } else {
                    console.warn(`⚠️ Fichier config non trouvé: ${fileName} (${response.status})`);
                }
            } catch (error) {
                console.error(`❌ Erreur lors de la lecture du fichier config: ${filePath}`, error);
            }
            return '';
        }
        
        // Default behavior for regular files in the file system
        if (this.fileSystem.has(filePath)) {
            return this.fileSystem.get(filePath).content;
        }
        return '';
    }

    async writeFile(file, content) {
        const filePath = typeof file === 'string' ? file : file.path;
        
        // Mettre à jour le système de fichiers en mémoire
        if (this.fileSystem.has(filePath)) {
            const existing = this.fileSystem.get(filePath);
            existing.content = content;
            
            // Re-parse les métadonnées si le contenu contient du frontmatter
            if (content.startsWith('---')) {
                const parts = content.split('---');
                if (parts.length >= 3) {
                    const frontmatterText = parts[1];
                    const metadata = {};
                    
                    frontmatterText.split('\n').forEach(line => {
                        line = line.trim();
                        if (!line) return;
                        
                        const colonIndex = line.indexOf(':');
                        if (colonIndex === -1) return;
                        
                        const key = line.substring(0, colonIndex).trim();
                        let value = line.substring(colonIndex + 1).trim();
                        
                        // Remove quotes
                        if ((value.startsWith('"') && value.endsWith('"')) || 
                            (value.startsWith("'") && value.endsWith("'"))) {
                            value = value.slice(1, -1);
                        }
                        
                        // Parse booleans
                        if (value === 'true') value = true;
                        else if (value === 'false') value = false;
                        // Parse numbers
                        else if (!isNaN(value) && value !== '') {
                            value = Number(value);
                        }
                        
                        metadata[key] = value;
                    });
                    
                    existing.metadata = metadata;
                }
            }
        }
        
        // Écrire réellement dans le fichier sur le disque
        try {
            const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
            const fullPath = `${this.vaultPath}/${cleanPath}`;
            
            console.log(`💾 Écriture dans le fichier: ${fullPath}`);
            
            const response = await fetch('/write-file', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    path: fullPath,
                    content: content
                })
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const result = await response.json();
            console.log(`✅ Fichier écrit avec succès: ${result.message}`);
            
        } catch (error) {
            console.error(`❌ Erreur lors de l'écriture du fichier:`, error);
            throw error;
        }
    }

    async listFiles() {
        const files = [];
        for (const [path, data] of this.fileSystem.entries()) {
            if (!data.isFolder) {
                files.push({
                    path: path,
                    name: path.split('/').pop()
                });
            }
        }
        return files;
    }

    async listFolders() {
        const folders = [];
        for (const [path, data] of this.fileSystem.entries()) {
            if (data.isFolder) {
                folders.push({
                    path: path,
                    name: path.split('/').pop(),
                    children: []
                });
            }
        }
        return folders;
    }

    getAllFiles() {
        // Retour synchrone d'un tableau pour éviter les erreurs d'itération
        const files = [];
        for (const [path, data] of this.fileSystem.entries()) {
            if (!data.isFolder) {
                const fileName = path.split('/').pop();
                const baseName = fileName.replace(/\.[^/.]+$/, '');
                const extension = fileName.includes('.') ? fileName.split('.').pop() : '';
                
                // Créer un objet file complet avec toutes les méthodes nécessaires
                const fileObj = this.createFileObject(path, fileName, baseName, extension);
                files.push(fileObj);
            }
        }
        return files;
    }

    // Méthode helper pour créer un objet file complet avec toutes les méthodes
    createFileObject(path, fileName, baseName, extension) {
        const app = this;
        return {
            path: path,
            name: fileName,
            basename: baseName,
            extension: extension,
            
            // Méthode getContent pour compatibilité avec File
            getContent: async function() {
                return await app.readFile({ path: path });
            },
            
            // Méthodes de métadonnées
            getMetadata: async function() {
                return await app.getMetadata({ path: path });
            },
            
            getMetadataValue: async function(key) {
                const metadata = await app.getMetadata({ path: path });
                return metadata ? metadata[key] : undefined;
            },
            
            updateMetadata: async function(key, value) {
                const currentMetadata = await app.getMetadata({ path: path });
                const newMetadata = { ...currentMetadata, [key]: value };
                await app.updateMetadata({ path: path }, newMetadata);
            },
            
            removeMetadata: async function(key) {
                const currentMetadata = await app.getMetadata({ path: path });
                if (currentMetadata && currentMetadata[key]) {
                    delete currentMetadata[key];
                    await app.updateMetadata({ path: path }, currentMetadata);
                }
            },
            
            getAllProperties: function() {
                const metadata = app.fileSystem.get(path)?.metadata || {};
                const properties = {};
                for (const key in metadata) {
                    properties[key] = { name: key };
                }
                return properties;
            },
            
            // Méthodes utilitaires
            getName: function(md = true) {
                return md ? fileName : baseName;
            },
            
            getPath: function() {
                return path;
            },
            
            getLink: function() {
                return `[[${path}|${baseName}]]`;
            },
            
            getFolderPath: function() {
                return path.substring(0, path.lastIndexOf("/"));
            }
        };
    }

    async getFile(filePath) {
        console.log("Getting file at path: ", filePath);
        
        // Check if the file exists in the local file system first
        if (this.fileSystem.has(filePath)) {
            const fileName = filePath.split('/').pop();
            const baseName = fileName.replace(/\.[^/.]+$/, '');
            const extension = fileName.includes('.') ? fileName.split('.').pop() : '';
            
            return this.createFileObject(filePath, fileName, baseName, extension);
        }
        
        // If not found locally, try to read from file system or fetch from interface
        const fileName = filePath.split('/').pop();
        
        // For config files, try to read from the local file system first
        if (filePath.includes('config/') || filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
            try {
                // Construct path to config file in the project
                const configPath = `./config/${fileName}`;
                console.log(`📁 Tentative de lecture du fichier local: ${configPath}`);
                
                const response = await fetch(configPath);
                if (response.ok) {
                    const content = await response.text();
                    console.log(`✅ Fichier config lu depuis le système local: ${fileName}`);
                    
                    const baseName = fileName.replace(/\.[^/.]+$/, '');
                    const extension = fileName.includes('.') ? fileName.split('.').pop() : '';
                    
                    // Store the file in the local file system for future access
                    this.fileSystem.set(filePath, {
                        content: content,
                        metadata: {},
                        isFolder: false
                    });
                    
                    return this.createFileObject(filePath, fileName, baseName, extension);
                }
            } catch (error) {
                console.warn(`⚠️ Impossible de lire le fichier local ${fileName}:`, error.message);
            }
        }
        
        // Fallback: try to fetch from the interface API
        try {
            let fetchUrl;
            if (filePath.includes('config/') || filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
                fetchUrl = `/config/${fileName}`;
            } else {
                fetchUrl = `/files/${fileName}`;
            }
            
            console.log(`🔍 Tentative de fetch API: ${fetchUrl}`);
            const response = await fetch(fetchUrl);
            
            if (response.ok) {
                const content = await response.text();
                console.log(`✅ Fichier récupéré depuis l'interface: ${fileName}`);
                
                const baseName = fileName.replace(/\.[^/.]+$/, '');
                const extension = fileName.includes('.') ? fileName.split('.').pop() : '';
                
                // Store the file in the local file system for future access
                this.fileSystem.set(filePath, {
                    content: content,
                    metadata: {},
                    isFolder: false
                });
                
                return this.createFileObject(filePath, fileName, baseName, extension);
            } else {
                console.warn(`⚠️ Fichier non trouvé avec l'URL: ${fetchUrl} (${response.status})`);
                
                // Try alternative: direct path access
                try {
                    console.log(`🔄 Tentative d'accès direct: ${filePath}`);
                    const directResponse = await fetch(filePath);
                    if (directResponse.ok) {
                        const content = await directResponse.text();
                        console.log(`✅ Fichier récupéré via accès direct: ${filePath}`);
                        
                        const baseName = fileName.replace(/\.[^/.]+$/, '');
                        const extension = fileName.includes('.') ? fileName.split('.').pop() : '';
                        
                        // Store the file in the local file system for future access
                        this.fileSystem.set(filePath, {
                            content: content,
                            metadata: {},
                            isFolder: false
                        });
                        
                        return this.createFileObject(filePath, fileName, baseName, extension);
                    } else {
                        console.warn(`⚠️ Accès direct également échoué: ${filePath} (${directResponse.status})`);
                    }
                } catch (directError) {
                    console.error(`❌ Erreur lors de l'accès direct: ${filePath}`, directError);
                }
            }
        } catch (error) {
            console.error(`❌ Erreur lors de la récupération du fichier depuis l'interface: ${filePath}`, error);
        }
        
        return null;
    }

    async isFile(file) {
        return this.fileSystem.has(file.path) && !this.fileSystem.get(file.path).isFolder;
    }

    isFolder(file) {
        return this.fileSystem.has(file.path) && this.fileSystem.get(file.path).isFolder;
    }

    async delete(file) {
        if (this.fileSystem.has(file.path)) {
            this.fileSystem.delete(file.path);
            console.log(`🗑️ Fichier supprimé: ${file.path}`);
        }
    }

    async waitForFileMetaDataUpdate(filePath, key, callback) {
        // Simulate waiting for metadata update
        setTimeout(async () => {
            if (callback) {
                await callback();
            }
        }, 100);
    }

    sendNotice(message) {
        console.log(`📢 Notice: ${message}`);
    }

    // UI methods for compatibility
    async selectClasse(vault, classes, prompt) {
        // Return the first available class for demo
        if (classes && classes.length > 0) {
            const className = classes[0];
            console.log(`🎯 Classe sélectionnée: ${className}`);
            // Return a mock class constructor
            return class {
                static name = className;
            };
        }
        return null;
    }

    async selectFile(vault, classNames, options) {
        // Create a new file with the provided name from hint
        const fileName = options?.hint || 'Nouveau fichier';
        const className = classNames?.[0] || 'Classe';
        
        const file = await this.createFile(`${fileName}.md`, `---\nClasse: ${className}\n---\n\n# ${fileName}`);
        
        // Return a mock classe object
        return {
            file: file,
            name: fileName,
            getDisplay: () => []
        };
    }

    printFileSystem() {
        console.log('📁 Système de fichiers simulé:');
        for (const [path, data] of this.fileSystem.entries()) {
            const type = data.isFolder ? '📁' : '📄';
            const metadata = Object.keys(data.metadata || {}).length > 0 ? 
                ` (${Object.keys(data.metadata).join(', ')})` : '';
            console.log(`  ${type} ${path}${metadata}`);
        }
    }

    // DOM manipulation methods for compatibility with Obsidian API
    createDiv(className = '') {
        const div = document.createElement('div');
        if (className) {
            div.className = className;
        }
        return div;
    }

    setIcon(element, iconName) {
        // Create a simple text-based icon
        const iconSpan = document.createElement('span');
        iconSpan.className = 'icon';
        iconSpan.textContent = /\p{Emoji}/u.test(iconName) ? iconName : this.getIconText(iconName);
        iconSpan.style.marginRight = '8px';
        element.prepend(iconSpan);
    }

    getIconText(iconName) {
        // Map common icon names to emoji/text
        const iconMap = {
            'folder': '📁',
            'file': '📄',
            'user': '👤',
            'mail': '📧',
            'phone': '📞',
            'calendar': '📅',
            'link': '🔗',
            'image': '🖼️',
            'video': '🎥',
            'audio': '🎵',
            'text': '📝',
            'number': '🔢',
            'boolean': '☑️',
            'select': '📋',
            'multiselect': '📄',
            'rating': '⭐',
            'range': '📊',
            'formula': '🧮',
            'header': '📋',
            'classe': '🏷️',
            'subclasse': '🔖',
            'object': '📦',
            'time': '⏰',
            'address': '📍',
            'default': '📌'
        };
        return iconMap[iconName] || iconMap['default'];
    }

    // Additional IApp interface methods
    async renameFile(file, newPath) {
        if (this.fileSystem.has(file.path)) {
            const data = this.fileSystem.get(file.path);
            this.fileSystem.delete(file.path);
            this.fileSystem.set(newPath, data);
            console.log(`✏️ Fichier renommé: ${file.path} → ${newPath}`);
        }
    }

    async createFolder(path) {
        const cleanPath = path.startsWith('/') ? path : '/' + path;
        this.fileSystem.set(cleanPath, {
            content: '',
            metadata: {},
            isFolder: true
        });
        console.log(`📁 Dossier créé: ${cleanPath}`);
        return {
            path: cleanPath,
            name: cleanPath.split('/').pop(),
            children: []
        };
    }

    getAbsolutePath(relativePath) {
        return `${this.vaultPath}/${relativePath}`;
    }

    createButton(text, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.onclick = onClick;
        button.className = 'btn';
        return button;
    }

    createInput(type, value = '') {
        const input = document.createElement('input');
        input.type = type;
        input.value = value;
        input.className = 'form-input';
        return input;
    }

    async getTemplateContent(templateName) {
        const templatePath = `/templates/${templateName}.md`;
        if (this.fileSystem.has(templatePath)) {
            return this.fileSystem.get(templatePath).content;
        }
        return '';
    }

    getSetting(key) {
        return this.settings.get(key);
    }

    async setSetting(key, value) {
        this.settings.set(key, value);
        console.log(`⚙️ Paramètre défini: ${key} = ${value}`);
    }

    open(absoluteMediaPath) {
        console.log(`🔗 Ouverture: ${absoluteMediaPath}`);
        window.open(absoluteMediaPath, '_blank');
    }

    async waitForMetaDataCacheUpdate(callback) {
        // Simulate waiting for metadata cache update
        setTimeout(async () => {
            if (callback) {
                await callback();
            }
        }, 50);
    }

    async selectMedia(vault, message) {
        // Mock implementation - return a sample media file
        const mediaFile = await this.createFile('/media/sample.jpg', '');
        console.log(`🎨 Média sélectionné: ${message}`);
        return mediaFile;
    }

    async selectMultipleFile(vault, classes, options) {
        // Mock implementation - return multiple files
        const files = [];
        for (let i = 0; i < 2; i++) {
            const file = await this.createFile(`/${classes[0]}_${i}.md`, `---\nClasse: ${classes[0]}\n---\n\n# Document ${i}`);
            files.push(file);
        }
        console.log(`📄 Fichiers multiples sélectionnés: ${files.length}`);
        return files;
    }
}