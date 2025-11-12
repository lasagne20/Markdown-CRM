// Main interface using compiled JS from js/ directory
import { FakeApp } from './FakeApp.js';

// Import compiled files from js directory
async function loadCompiledModules() {
    try {
        console.log('Chargement des modules compiles...');
        
        // Charger dans l'ordre pour éviter les dépendances circulaires
        console.log('Import File.js...');
        const fileModule = await import('./js/vault/File.js');
        console.log('File.js charge:', Object.keys(fileModule));
        
        // Attendre un peu pour éviter les problèmes de timing
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('Import Vault.js...');
        const vaultModule = await import('./js/vault/Vault.js');
        console.log('Vault.js charge:', Object.keys(vaultModule));
        
        // Vérifier que les exports sont disponibles
        if (!fileModule.File) {
            throw new Error('File class not exported from File.js');
        }
        if (!vaultModule.Vault) {
            throw new Error('Vault class not exported from Vault.js');
        }
        
        console.log('Tous les modules compiles charges avec succes');
        return { Vault: vaultModule.Vault, File: fileModule.File };
    } catch (error) {
        console.error('Erreur lors du chargement des modules compiles:', error);
        
        throw error;
    }
      
}

export class FakeEnvironment {
    constructor() {
        this.app = null;
        this.vault = null;
        this.Vault = null;
        this.File = null;
    }
    
    async initialize() {
        console.log('Initialisation de l\'environnement avec modules compiles...');
        
        try {
            console.log('Chargement sequentiel des modules pour eviter les imports circulaires...');
            
            // Charger dans l'ordre des dépendances pour éviter les cycles
            const modules = await loadCompiledModules();
            this.Vault = modules.Vault;
            this.File = modules.File;
            
            // Initialize the app with real vault path
            this.app = new FakeApp('./vault', 'CRM Vault');
            
            // Configure settings for the vault
            const settings = {
                templateFolder: '/templates',
                personalName: 'Utilisateur Test',
                configPath: './js/config' // Point to compiled configs
            };
            
            // Initialize the vault with the app and settings
            this.vault = new this.Vault(this.app, settings);
            
            console.log('Environnement initialise avec succes');
            console.log('Vault:', this.vault.getName());
            console.log('Config path:', settings.configPath);
            
            // Charger les fichiers réels depuis le dossier vault
            await this.loadRealVaultFiles();
            
        } catch (error) {
            console.error('Erreur lors de l\'initialisation:', error);
            throw error;
        }
    }
    
    async loadRealVaultFiles() {
        console.log('Chargement des fichiers reels depuis ./vault...');
        
        try {
            // Scanner récursivement le dossier vault
            const files = await this.scanVaultDirectory('./vault');
            
            console.log(files.length + ' fichiers a charger');
            
            // Charger chaque fichier dans le système de fichiers de FakeApp
            let successCount = 0;
            let failCount = 0;
            
            for (const fileInfo of files) {
                try {
                    console.log('Chargement:', fileInfo.url);
                    const response = await fetch(fileInfo.url);
                    
                    console.log('  Status:', response.status);
                    
                    if (response.ok) {
                        const content = await response.text();
                        console.log('  Taille:', content.length, 'caracteres');
                        
                        // Créer le fichier dans FakeApp
                        await this.app.createFile(fileInfo.path, content);
                        successCount++;
                    } else {
                        console.warn('Echec HTTP ' + response.status + ':', fileInfo.path);
                        failCount++;
                    }
                } catch (error) {
                    console.error('Erreur:', fileInfo.path, error);
                    failCount++;
                }
            }
            
            console.log('\nResultat:', successCount + '/' + files.length, 'fichiers charges\n');
            this.app.printFileSystem();
            
        } catch (error) {
            console.error('Erreur globale:', error);
        }
    }

    async scanVaultDirectory(basePath) {
        console.log('Scan du dossier:', basePath);
        const files = [];
        
        // Scanner récursivement tous les dossiers du vault
        await this.scanDirectory(basePath, '', files);
        
        console.log('  Trouve', files.length, 'fichiers');
        return files;
    }
    
    async scanDirectory(basePath, relativePath, files) {
        const fullPath = basePath + (relativePath ? '/' + relativePath : '');
        
        try {
            // Essayer de lire le contenu du dossier via l'API du serveur
            const response = await fetch(fullPath + '/__list__');
            
            if (response.ok) {
                const entries = await response.json();
                
                for (const entry of entries) {
                    const entryRelativePath = relativePath ? relativePath + '/' + entry.name : entry.name;
                    
                    if (entry.type === 'directory') {
                        // Scanner récursivement les sous-dossiers
                        await this.scanDirectory(basePath, entryRelativePath, files);
                    } else if (entry.type === 'file' && entry.name.endsWith('.md')) {
                        // Ajouter le fichier markdown à la liste
                        const encodedPath = entryRelativePath.split('/').map(encodeURIComponent).join('/');
                        files.push({
                            path: '/' + entryRelativePath,
                            url: basePath + '/' + encodedPath
                        });
                    }
                }
            }
        } catch (error) {
            console.warn('Impossible de scanner:', fullPath, error.message);
        }
    }
    

    async getFilesByClass(className) {
        let allFiles = this.app.getAllFiles();
        
        // S'assurer que allFiles est un tableau
        if (!Array.isArray(allFiles)) {
            allFiles = await this.app.listFiles() || [];
        }
        
        const classFiles = [];
        
        for (const file of allFiles) {
            try {
                const metadata = await this.app.getMetadata(file);
                if (metadata.Classe === className) {
                    const fileInstance = new this.File(this.vault, file);
                    classFiles.push(fileInstance);
                }
            } catch (error) {
                // Ignore files without metadata
            }
        }
        
        return classFiles;
    }
    
    async getAvailableClasses() {
        // For now, return static list. In real implementation,
        // this would use the DynamicClassFactory
        return ['Contact', 'Projet', 'Tache'];
    }
    
    
    async getStats() {
        let allFiles = this.app.getAllFiles();
        
        // S'assurer que allFiles est un tableau
        if (!Array.isArray(allFiles)) {
            allFiles = await this.app.listFiles() || [];
        }
        
        const filesByClass = {};
        
        for (const file of allFiles) {
            try {
                const metadata = await this.app.getMetadata(file);
                const className = metadata.Classe;
                if (className) {
                    filesByClass[className] = (filesByClass[className] || 0) + 1;
                }
            } catch (error) {
                // Ignore files without metadata
            }
        }
        
        const availableClasses = await this.getAvailableClasses();
        
        return {
            totalFiles: allFiles.length,
            filesByClass,
            availableClasses
        };
    }
    
    printState() {
        console.log('\n=== ETAT DU SYSTEME ===');
        console.log('Vault:', this.vault ? this.vault.getName() : 'Non initialise');
        console.log('Nombre de fichiers:', this.app ? this.app.getAllFiles().length : 0);
        
        if (this.app) {
            console.log('\nSysteme de fichiers:');
            this.app.printFileSystem();
        }
        
        console.log('=======================\n');
    }
}

// Export for direct usage - utilise maintenant le vrai vault
export async function createFakeEnvironment() {
    const env = new FakeEnvironment();
    await env.initialize();
    return env;
}

// Make available globally for the admin interface
window.createFakeEnvironment = createFakeEnvironment;
