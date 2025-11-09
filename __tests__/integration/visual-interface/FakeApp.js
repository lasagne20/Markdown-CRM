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

    parseYamlFrontmatter(frontmatterText) {
        const metadata = {};
        const lines = frontmatterText.split('\n');
        let currentKey = null;
        let currentArray = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            if (!trimmedLine) continue;
            
            // Check if this is an array item (starts with -)
            if (trimmedLine.startsWith('-')) {
                if (currentArray !== null) {
                    // Extract the value after the dash
                    let arrayValue = trimmedLine.substring(1).trim();
                    
                    // Remove quotes if present
                    if ((arrayValue.startsWith('"') && arrayValue.endsWith('"')) || 
                        (arrayValue.startsWith("'") && arrayValue.endsWith("'"))) {
                        arrayValue = arrayValue.slice(1, -1);
                    }
                    
                    currentArray.push(arrayValue);
                }
                continue;
            }
            
            // Check if this is a key:value pair
            const colonIndex = trimmedLine.indexOf(':');
            if (colonIndex === -1) continue;
            
            const key = trimmedLine.substring(0, colonIndex).trim();
            let value = trimmedLine.substring(colonIndex + 1).trim();
            
            // If value is empty, this might be the start of an array
            if (value === '' || value === '[]') {
                currentKey = key;
                currentArray = [];
                metadata[key] = currentArray;
                continue;
            }
            
            // Reset array context when we encounter a new key:value
            currentKey = null;
            currentArray = null;
            
            // Remove quotes
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            
            // Parse special values
            if (value === 'true') value = true;
            else if (value === 'false') value = false;
            else if (value === '[]') value = [];
            else if (!isNaN(value) && value !== '') {
                value = Number(value);
            }
            
            metadata[key] = value;
        }
        
        return metadata;
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
                
                // Parse YAML frontmatter
                metadata = this.parseYamlFrontmatter(frontmatterText);
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
                    } else if (Array.isArray(value)) {
                        if (value.length === 0) {
                            yamlContent += `${key}: []\n`;
                        } else {
                            // Format multi-line array
                            yamlContent += `${key}:\n`;
                            for (const item of value) {
                                const formattedItem = this.formatYamlValue(item);
                                // Quote the item if it's not already quoted
                                if (typeof item === 'string' && (item.includes('[[') || item.includes(']]') || item.includes(':'))) {
                                    yamlContent += `  - "${item}"\n`;
                                } else if (formattedItem.startsWith('"')) {
                                    yamlContent += `  - ${formattedItem}\n`;
                                } else {
                                    yamlContent += `  - ${formattedItem}\n`;
                                }
                            }
                        }
                    } else {
                        const formattedValue = this.formatYamlValue(value, key);
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

    formatYamlValue(value, key = '') {
        // Formater une valeur selon son type pour YAML
        if (value === undefined || value === null) {
            return '';
        }
        
        if (typeof value === 'string') {
            if (value === '') {
                return '';
            }
            // Échapper les guillemets et ajouter des guillemets si nécessaire
            if (value.includes(':') || value.includes('#') || value.includes('\n') || value.includes('"')) {
                return `"${value.replace(/"/g, '\\"')}"`;
            }
            return value;
        }
        
        if (typeof value === 'boolean') {
            return value ? 'true' : 'false';
        }
        
        if (typeof value === 'number') {
            return value.toString();
        }
        
        if (Array.isArray(value)) {
            if (value.length === 0) {
                return '[]';
            }
            // Format as YAML array with proper indentation
            return null; // Signal to use multi-line format
        }
        
        return String(value);
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
                } else if (Array.isArray(value)) {
                    if (value.length === 0) {
                        yamlContent += `${key}: []\n`;
                    } else {
                        // Format multi-line array
                        yamlContent += `${key}:\n`;
                        for (const item of value) {
                            const formattedItem = this.formatYamlValue(item);
                            // Quote the item if it's not already quoted
                            if (typeof item === 'string' && (item.includes('[[') || item.includes(']]') || item.includes(':'))) {
                                yamlContent += `  - "${item}"\n`;
                            } else if (formattedItem.startsWith('"')) {
                                yamlContent += `  - ${formattedItem}\n`;
                            } else {
                                yamlContent += `  - ${formattedItem}\n`;
                            }
                        }
                    }
                } else {
                    const formattedValue = this.formatYamlValue(value, key);
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
                    existing.metadata = this.parseYamlFrontmatter(frontmatterText);
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
        return new Promise((resolve) => {
            console.log(`📂 Sélection de fichier demandée pour les classes: ${classNames?.join(', ')}`);
            
            // Créer un modal pour sélectionner un fichier
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.style.zIndex = '10000';
            
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            modalContent.style.maxWidth = '600px';
            
            const modalHeader = document.createElement('div');
            modalHeader.className = 'modal-header';
            modalHeader.innerHTML = '<h3 class="modal-title">📂 Sélectionner un fichier</h3>';
            
            const fileList = document.createElement('div');
            fileList.style.maxHeight = '400px';
            fileList.style.overflowY = 'auto';
            fileList.style.marginTop = '20px';
            
            // Filtrer les fichiers par classe si spécifié
            const allFiles = this.getAllFiles();
            const filteredFiles = classNames && classNames.length > 0 ? 
                allFiles.filter(file => {
                    const metadata = this.fileSystem.get(file.path)?.metadata;
                    return metadata && classNames.includes(metadata.Classe);
                }) : allFiles;
            
            if (filteredFiles.length === 0) {
                fileList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Aucun fichier disponible</p>';
            } else {
                filteredFiles.forEach(file => {
                    const fileItem = document.createElement('div');
                    fileItem.style.padding = '12px';
                    fileItem.style.margin = '5px 0';
                    fileItem.style.border = '2px solid #e1e5e9';
                    fileItem.style.borderRadius = '8px';
                    fileItem.style.cursor = 'pointer';
                    fileItem.style.transition = 'all 0.2s ease';
                    
                    const metadata = this.fileSystem.get(file.path)?.metadata || {};
                    const className = metadata.Classe || 'Sans classe';
                    const displayName = file.basename || file.name.replace('.md', '');
                    
                    fileItem.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 20px;">📄</span>
                            <div style="flex: 1;">
                                <div style="font-weight: 600; color: #333;">${displayName}</div>
                                <div style="font-size: 0.85rem; color: #666;">Classe: ${className}</div>
                            </div>
                        </div>
                    `;
                    
                    fileItem.onmouseover = () => {
                        fileItem.style.borderColor = '#667eea';
                        fileItem.style.backgroundColor = 'rgba(102, 126, 234, 0.05)';
                    };
                    
                    fileItem.onmouseout = () => {
                        fileItem.style.borderColor = '#e1e5e9';
                        fileItem.style.backgroundColor = 'transparent';
                    };
                    
                    fileItem.onclick = async () => {
                        console.log(`✅ Fichier sélectionné: ${file.path}`);
                        document.body.removeChild(modal);
                        
                        // Créer un objet File pour avoir toutes les méthodes nécessaires
                        const fileWrapper = {
                            ...file,
                            file: file, // Référence au fichier IFile
                            getLink: () => file.getLink(),
                            getPath: () => file.getPath(),
                            getName: (md = true) => file.getName(md),
                            getFile: () => file
                        };
                        
                        // Charger la classe dynamique si disponible
                        try {
                            const dynamicFactory = vault.getDynamicClassFactory();
                            if (dynamicFactory && metadata.Classe) {
                                const ClassConstructor = await dynamicFactory.getClass(metadata.Classe);
                                const classInstance = new ClassConstructor(vault, file);
                                
                                // Ajouter les méthodes manquantes pour la compatibilité avec FileProperty
                                if (!classInstance.getLink) {
                                    classInstance.getLink = () => file.getLink();
                                }
                                if (!classInstance.getPath) {
                                    classInstance.getPath = () => file.getPath();
                                }
                                if (!classInstance.getName) {
                                    classInstance.getName = (md = true) => file.getName(md);
                                }
                                if (!classInstance.file) {
                                    classInstance.file = file;
                                }
                                
                                resolve(classInstance);
                            } else {
                                // Fallback: retourner un objet avec toutes les méthodes nécessaires
                                resolve(fileWrapper);
                            }
                        } catch (error) {
                            console.error('Erreur lors du chargement de la classe:', error);
                            resolve(fileWrapper);
                        }
                    };
                    
                    fileList.appendChild(fileItem);
                });
            }
            
            const modalActions = document.createElement('div');
            modalActions.className = 'modal-actions';
            modalActions.style.marginTop = '20px';
            
            const cancelButton = document.createElement('button');
            cancelButton.className = 'btn-secondary';
            cancelButton.textContent = 'Annuler';
            cancelButton.onclick = () => {
                console.log('❌ Sélection de fichier annulée');
                document.body.removeChild(modal);
                resolve(null);
            };
            
            modalActions.appendChild(cancelButton);
            
            modalContent.appendChild(modalHeader);
            
            if (options?.hint) {
                const hint = document.createElement('p');
                hint.style.color = '#666';
                hint.style.marginTop = '10px';
                hint.textContent = options.hint;
                modalContent.appendChild(hint);
            }
            
            modalContent.appendChild(fileList);
            modalContent.appendChild(modalActions);
            
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            
            // Fermer le modal en cliquant à l'extérieur
            modal.onclick = (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                    resolve(null);
                }
            };
        });
    }

    async selectMultipleFile(vault, classNames, options) {
        return new Promise((resolve) => {
            console.log(`📂 Sélection multiple de fichiers demandée pour les classes: ${classNames?.join(', ')}`);
            
            // Créer un modal pour sélectionner plusieurs fichiers
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.style.zIndex = '10000';
            
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            modalContent.style.maxWidth = '600px';
            
            const modalHeader = document.createElement('div');
            modalHeader.className = 'modal-header';
            modalHeader.innerHTML = '<h3 class="modal-title">📂 Sélectionner des fichiers (plusieurs)</h3>';
            
            const fileList = document.createElement('div');
            fileList.style.maxHeight = '400px';
            fileList.style.overflowY = 'auto';
            fileList.style.marginTop = '20px';
            
            const selectedFiles = new Set();
            
            // Filtrer les fichiers par classe si spécifié
            const allFiles = this.getAllFiles();
            const filteredFiles = classNames && classNames.length > 0 ? 
                allFiles.filter(file => {
                    const metadata = this.fileSystem.get(file.path)?.metadata;
                    return metadata && classNames.includes(metadata.Classe);
                }) : allFiles;
            
            if (filteredFiles.length === 0) {
                fileList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Aucun fichier disponible</p>';
            } else {
                filteredFiles.forEach(file => {
                    const fileItem = document.createElement('div');
                    fileItem.style.padding = '12px';
                    fileItem.style.margin = '5px 0';
                    fileItem.style.border = '2px solid #e1e5e9';
                    fileItem.style.borderRadius = '8px';
                    fileItem.style.cursor = 'pointer';
                    fileItem.style.transition = 'all 0.2s ease';
                    fileItem.style.display = 'flex';
                    fileItem.style.alignItems = 'center';
                    fileItem.style.gap = '10px';
                    
                    const metadata = this.fileSystem.get(file.path)?.metadata || {};
                    const className = metadata.Classe || 'Sans classe';
                    const displayName = file.basename || file.name.replace('.md', '');
                    
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.style.width = '20px';
                    checkbox.style.height = '20px';
                    checkbox.style.cursor = 'pointer';
                    
                    const fileInfo = document.createElement('div');
                    fileInfo.style.flex = '1';
                    fileInfo.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 20px;">📄</span>
                            <div style="flex: 1;">
                                <div style="font-weight: 600; color: #333;">${displayName}</div>
                                <div style="font-size: 0.85rem; color: #666;">Classe: ${className}</div>
                            </div>
                        </div>
                    `;
                    
                    fileItem.appendChild(checkbox);
                    fileItem.appendChild(fileInfo);
                    
                    const toggleSelection = () => {
                        if (selectedFiles.has(file.path)) {
                            selectedFiles.delete(file.path);
                            checkbox.checked = false;
                            fileItem.style.borderColor = '#e1e5e9';
                            fileItem.style.backgroundColor = 'transparent';
                        } else {
                            selectedFiles.add(file.path);
                            checkbox.checked = true;
                            fileItem.style.borderColor = '#667eea';
                            fileItem.style.backgroundColor = 'rgba(102, 126, 234, 0.1)';
                        }
                        
                        // Mettre à jour le compteur
                        updateCounter();
                    };
                    
                    fileItem.onmouseover = () => {
                        if (!selectedFiles.has(file.path)) {
                            fileItem.style.borderColor = '#667eea';
                            fileItem.style.backgroundColor = 'rgba(102, 126, 234, 0.05)';
                        }
                    };
                    
                    fileItem.onmouseout = () => {
                        if (!selectedFiles.has(file.path)) {
                            fileItem.style.borderColor = '#e1e5e9';
                            fileItem.style.backgroundColor = 'transparent';
                        }
                    };
                    
                    fileItem.onclick = toggleSelection;
                    checkbox.onclick = (e) => {
                        e.stopPropagation();
                        toggleSelection();
                    };
                    
                    fileList.appendChild(fileItem);
                });
            }
            
            const counter = document.createElement('div');
            counter.style.textAlign = 'center';
            counter.style.marginTop = '10px';
            counter.style.fontWeight = '600';
            counter.style.color = '#667eea';
            
            const updateCounter = () => {
                counter.textContent = `${selectedFiles.size} fichier(s) sélectionné(s)`;
            };
            updateCounter();
            
            const modalActions = document.createElement('div');
            modalActions.className = 'modal-actions';
            modalActions.style.marginTop = '20px';
            
            const cancelButton = document.createElement('button');
            cancelButton.className = 'btn-secondary';
            cancelButton.textContent = 'Annuler';
            cancelButton.onclick = () => {
                console.log('❌ Sélection multiple annulée');
                document.body.removeChild(modal);
                resolve([]);
            };
            
            const confirmButton = document.createElement('button');
            confirmButton.className = 'btn';
            confirmButton.textContent = 'Valider';
            confirmButton.onclick = async () => {
                console.log(`✅ ${selectedFiles.size} fichier(s) sélectionné(s)`);
                document.body.removeChild(modal);
                
                // Charger les classes dynamiques pour chaque fichier sélectionné
                const selectedInstances = [];
                const dynamicFactory = vault.getDynamicClassFactory();
                
                for (const filePath of selectedFiles) {
                    const file = allFiles.find(f => f.path === filePath);
                    if (!file) continue;
                    
                    const metadata = this.fileSystem.get(file.path)?.metadata || {};
                    const displayName = file.basename || file.name.replace('.md', '');
                    
                    // Créer un objet File wrapper pour avoir toutes les méthodes nécessaires
                    const fileWrapper = {
                        ...file,
                        file: file,
                        getLink: () => file.getLink(),
                        getPath: () => file.getPath(),
                        getName: (md = true) => file.getName(md),
                        getFile: () => file
                    };
                    
                    try {
                        if (dynamicFactory && metadata.Classe) {
                            const ClassConstructor = await dynamicFactory.getClass(metadata.Classe);
                            const classInstance = new ClassConstructor(vault, file);
                            
                            // Ajouter les méthodes manquantes pour la compatibilité
                            if (!classInstance.getLink) {
                                classInstance.getLink = () => file.getLink();
                            }
                            if (!classInstance.getPath) {
                                classInstance.getPath = () => file.getPath();
                            }
                            if (!classInstance.getName) {
                                classInstance.getName = (md = true) => file.getName(md);
                            }
                            if (!classInstance.file) {
                                classInstance.file = file;
                            }
                            
                            selectedInstances.push(classInstance);
                        } else {
                            // Fallback: retourner l'objet wrapper
                            selectedInstances.push(fileWrapper);
                        }
                    } catch (error) {
                        console.error(`Erreur lors du chargement de la classe pour ${filePath}:`, error);
                        selectedInstances.push(fileWrapper);
                    }
                }
                
                resolve(selectedInstances);
            };
            
            modalActions.appendChild(cancelButton);
            modalActions.appendChild(confirmButton);
            
            modalContent.appendChild(modalHeader);
            
            if (options?.hint) {
                const hint = document.createElement('p');
                hint.style.color = '#666';
                hint.style.marginTop = '10px';
                hint.textContent = options.hint;
                modalContent.appendChild(hint);
            }
            
            modalContent.appendChild(fileList);
            modalContent.appendChild(counter);
            modalContent.appendChild(modalActions);
            
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            
            // Fermer le modal en cliquant à l'extérieur
            modal.onclick = (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                    resolve([]);
                }
            };
        });
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

    getUrl(filePath) {
        // Générer une URL pour afficher le fichier dans l'interface d'administration
        const cleanPath = filePath.startsWith('/') ? filePath : '/' + filePath;
        const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/admin.html');
        const url = `${baseUrl}#file=${encodeURIComponent(cleanPath)}`;

        return url;
    }
}