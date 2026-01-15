// Interface d'administration pour le système CRM avec Vault réel
class AdminInterface {
    constructor() {
        this.fakeEnvironment = null;
        this.selectedClass = null;
        this.selectedFile = null;
        this.filesData = new Map();
        this.classesWithData = new Map(); // Map pour stocker les données par classe
        
        this.init();
    }

    async init() {
        console.log('🚀 Initialisation de l\'interface d\'administration...');
        
        try {
            // Import dynamique du module main
            const { createFakeEnvironment } = await import('./main.js');
            this.fakeEnvironment = await createFakeEnvironment();
            
            console.log('✅ Environnement fake initialisé');
            await this.loadInterface();
            
            // Écouter les événements de déplacement de fichiers
            window.addEventListener('file-moved', (event) => {
                console.log('🔄 Fichier déplacé détecté, rafraîchissement de l\'arborescence...');
                this.handleFileMoved(event.detail);
            });
            
            // Vérifier s'il y a un paramètre de fichier dans l'URL
            await this.handleUrlParameters();
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation:', error);
            this.showError('Erreur lors de l\'initialisation de l\'environnement: ' + error.message);
        }
    }
    
    async handleFileMoved(detail) {
        try {
            const { oldPath, newPath } = detail;
            console.log(`📦 Traitement du déplacement: ${oldPath} → ${newPath}`);
            
            // Rafraîchir l'arborescence
            await this.buildFileTree();
            
            // Si le fichier déplacé est actuellement sélectionné, le rouvrir au nouveau chemin
            if (this.selectedFile && this.selectedFile.path === oldPath) {
                console.log('🔄 Réouverture du fichier déplacé...');
                
                // Attendre un court instant que l'arborescence soit reconstruite
                await new Promise(resolve => setTimeout(resolve, 200));
                
                // Chercher le fichier à son nouveau chemin
                const movedFile = this.fakeEnvironment.app.getAllFiles().find(f => f.path === newPath);
                if (movedFile) {
                    await this.loadFileContent(movedFile);
                    this.highlightFileInTree(newPath);
                }
            }
            
            this.showSuccess('Arborescence mise à jour');
        } catch (error) {
            console.error('❌ Erreur lors du traitement du déplacement:', error);
        }
    }
    
    async handleUrlParameters() {
        try {
            // Récupérer le hash de l'URL (par exemple: #file=%2FPierre%20Durand.md)
            const hash = window.location.hash;
            
            if (!hash) {
                console.log('ℹ️ Aucun paramètre d\'URL détecté');
                return;
            }
            
            // Parser les paramètres du hash
            const params = new URLSearchParams(hash.substring(1)); // Enlever le #
            const filePath = params.get('file');
            
            if (filePath) {
                console.log(`🔗 Ouverture du fichier depuis l'URL: ${filePath}`);
                
                // Décoder le chemin (remplace %2F par /, etc.)
                const decodedPath = decodeURIComponent(filePath);
                console.log(`📂 Chemin décodé: ${decodedPath}`);
                
                // Attendre un court instant pour s'assurer que l'arborescence est chargée
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Chercher le fichier dans le vault
                await this.openFileFromPath(decodedPath);
            }
        } catch (error) {
            console.error('❌ Erreur lors du traitement des paramètres d\'URL:', error);
            this.showError('Impossible d\'ouvrir le fichier spécifié: ' + error.message);
        }
    }
    
    async openFileFromPath(filePath) {
        try {
            // Normaliser le chemin (enlever le / initial si présent et ajouter .md si nécessaire)
            let normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
            if (!normalizedPath.endsWith('.md')) {
                normalizedPath += '.md';
            }
            
            console.log(`🔍 Recherche du fichier: ${normalizedPath}`);
            
            // Chercher le fichier dans tous les fichiers disponibles
            const allFiles = this.fakeEnvironment.app.getAllFiles();
            const targetFile = allFiles.find(file => {
                // Vérifier si le chemin correspond exactement ou si le nom correspond
                return file.path === normalizedPath || 
                       file.path === `/${normalizedPath}` ||
                       file.name === normalizedPath ||
                       file.path.endsWith(`/${normalizedPath}`);
            });
            
            if (targetFile) {
                console.log(`✅ Fichier trouvé: ${targetFile.path}`);
                
                // Mettre en évidence le fichier dans l'arborescence
                this.highlightFileInTree(targetFile.path);
                
                // Charger le contenu du fichier
                await this.loadFileContent(targetFile);
                
                this.showSuccess(`Fichier ouvert: ${targetFile.name}`);
            } else {
                console.warn(`⚠️ Fichier non trouvé: ${normalizedPath}`);
                this.showError(`Fichier non trouvé: ${filePath}`);
                
                // Afficher la liste des fichiers disponibles dans la console pour debug
                console.log('Fichiers disponibles:', allFiles.map(f => f.path));
            }
        } catch (error) {
            console.error('❌ Erreur lors de l\'ouverture du fichier:', error);
            this.showError('Erreur lors de l\'ouverture du fichier: ' + error.message);
        }
    }
    
    highlightFileInTree(filePath) {
        try {
            // Retirer toutes les sélections actives
            document.querySelectorAll('.file-tree-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Trouver l'élément correspondant au fichier
            const fileItems = document.querySelectorAll('.file-tree-item.file');
            for (const item of fileItems) {
                const label = item.querySelector('.file-tree-label');
                if (label) {
                    const fileName = label.textContent;
                    // Vérifier si c'est le bon fichier
                    if (filePath.includes(fileName) || filePath.endsWith(`/${fileName}.md`)) {
                        item.classList.add('active');
                        
                        // Dérouler tous les dossiers parents
                        let parent = item.parentElement;
                        while (parent) {
                            if (parent.classList && parent.classList.contains('file-tree-children')) {
                                parent.classList.remove('collapsed');
                                
                                // Trouver le toggle du dossier parent
                                const prevSibling = parent.previousElementSibling;
                                if (prevSibling && prevSibling.classList.contains('file-tree-item')) {
                                    const toggle = prevSibling.querySelector('.folder-toggle');
                                    if (toggle) {
                                        toggle.classList.add('expanded');
                                    }
                                }
                            }
                            parent = parent.parentElement;
                        }
                        
                        // Faire défiler jusqu'à l'élément
                        item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        break;
                    }
                }
            }
        } catch (error) {
            console.error('Erreur lors de la mise en évidence du fichier:', error);
        }
    }

    async loadInterface() {
        try {
            await this.buildFileTree(); // Nouvelle méthode pour l'arborescence
            await this.updateHeaderStats();
            console.log('✅ Interface chargée avec succès');
        } catch (error) {
            console.error('❌ Erreur lors du chargement de l\'interface:', error);
            this.showError('Erreur lors du chargement: ' + error.message);
        }
    }

    async loadClasses() {
        const classList = document.getElementById('classList');
        const newFileClassSelect = document.getElementById('newFileClass');
        
        try {
            const classes = await this.fakeEnvironment.getAvailableClasses();
            
            if (classes.length === 0) {
                classList.innerHTML = '<li class="error">Aucune classe disponible</li>';
                return;
            }

            // Clear existing content
            classList.innerHTML = '';
            newFileClassSelect.innerHTML = '<option value="">-- Sélectionner une classe --</option>';

            // Add classes to the list
            for (const className of classes) {
                // Get class config for icon
                const classIcon = this.getClassIcon(className);
                
                const listItem = document.createElement('li');
                listItem.className = 'class-item';
                listItem.innerHTML = `
                    <span class="class-icon">${classIcon}</span>
                    <span>${className}</span>
                `;
                listItem.onclick = () => this.selectClass(className);
                classList.appendChild(listItem);

                // Add to select options
                const option = document.createElement('option');
                option.value = className;
                option.textContent = `${classIcon} ${className}`;
                newFileClassSelect.appendChild(option);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des classes:', error);
            classList.innerHTML = '<li class="error">Erreur lors du chargement</li>';
        }
    }

    async selectClass(className) {
        console.log(`📋 Sélection de la classe: ${className}`);
        
        this.selectedClass = className;
        this.selectedFile = null;

        // Update UI
        document.querySelectorAll('.class-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Find and highlight selected class
        document.querySelectorAll('.class-item').forEach(item => {
            if (item.textContent.trim().includes(className)) {
                item.classList.add('active');
            }
        });

        document.getElementById('contentTitle').textContent = `Fichiers de classe: ${className}`;
        
        await this.loadFiles(className);
        this.clearDetails();
    }

    async loadFiles(className) {
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = '<div class="loading">Chargement des fichiers...</div>';

        try {
            const files = await this.fakeEnvironment.getFilesByClass(className);
            
            if (files.length === 0) {
                mainContent.innerHTML = `
                    <div class="empty-state">
                        <h3>Aucun fichier de classe ${className}</h3>
                        <p>Créez votre premier fichier en cliquant sur "Nouveau Fichier".</p>
                        <button class="btn" onclick="adminInterface.showCreateFileModal('${className}')">
                            ➕ Créer un fichier ${className}
                        </button>
                    </div>
                `;
                return;
            }

            // Create files grid
            const filesGrid = document.createElement('div');
            filesGrid.className = 'files-grid';

            for (const file of files) {
                try {
                    const metadata = await this.fakeEnvironment.app.getMetadata(file);
                    const fileCard = await this.createFileCard(file, metadata, className);
                    filesGrid.appendChild(fileCard);
                    
                    // Store file data for later use
                    this.filesData.set(file.path, { file, metadata, className });
                } catch (error) {
                    console.error(`Erreur lors du chargement du fichier ${file.path}:`, error);
                }
            }

            mainContent.innerHTML = '';
            mainContent.appendChild(filesGrid);

        } catch (error) {
            console.error('Erreur lors du chargement des fichiers:', error);
            mainContent.innerHTML = `<div class="error">Erreur lors du chargement des fichiers: ${error.message}</div>`;
        }
    }

    async createFileCard(file, metadata, className) {
        const card = document.createElement('div');
        card.className = 'file-card';
        card.onclick = () => this.selectFile(file.path);

        const classIcon = this.getClassIcon(className);
        const fileName = file.name.replace('.md', '');

        // Extract key properties for preview
        const keyProperties = this.getKeyProperties(metadata, className);
        const propertiesHtml = keyProperties.map(prop => `
            <div class="property-item">
                <span class="property-label">${prop.label}:</span>
                <span class="property-value">${prop.value}</span>
            </div>
        `).join('');

        card.innerHTML = `
            <div class="file-header">
                <span class="file-icon">${classIcon}</span>
                <span class="file-title">${fileName}</span>
            </div>
            <div class="file-meta">
                <strong>Classe:</strong> ${className} | 
                <strong>Fichier:</strong> ${file.name}
            </div>
            <div class="file-properties">
                ${propertiesHtml}
            </div>
        `;

        return card;
    }

    async selectFile(filePath) {
        console.log(`📄 Sélection du fichier: ${filePath}`);
        
        this.selectedFile = filePath;

        // Update UI
        document.querySelectorAll('.file-card').forEach(card => {
            card.classList.remove('selected');
        });

        // Highlight selected file
        event.currentTarget.classList.add('selected');

        await this.loadFileDetails(filePath);
    }

    async loadFileDetails(filePath) {
        const detailsContent = document.getElementById('detailsContent');
        const fileData = this.filesData.get(filePath);

        if (!fileData) {
            detailsContent.innerHTML = '<div class="error">Données du fichier non trouvées</div>';
            return;
        }

        const { file, metadata, className } = fileData;
        const fileName = file.name.replace('.md', '');

        try {
            // Create the class instance to get the real display
            const dynamicFactory = this.fakeEnvironment.vault.getDynamicClassFactory();
            let classDisplay = null;
            let classDisplays = null; // Configuration displays depuis le YAML
            
            if (dynamicFactory) {
                // Utiliser createClasse pour créer correctement l'instance avec File wrappé
                const classInstance = await this.fakeEnvironment.vault.createClasse(file);
                if (classInstance) {
                    console.log('🔧 Instance de classe créée via DynamicFactory');
                    
                    // Récupérer les displays de la configuration YAML
                    const configLoader = this.fakeEnvironment.factory.configManager?.configLoader;
                    if (configLoader) {
                        console.log('🔧 ConfigLoader disponible, chargement de la config pour:', className);
                        const config = await configLoader.loadClassConfig(className);
                        console.log('📋 Configuration chargée:', config);
                        if (config && config.displays) {
                            classDisplays = config.displays;
                            console.log('✅ Displays trouvés dans la configuration:', classDisplays);
                        } else {
                            console.log('⚠️ Aucun displays trouvé dans la config');
                        }
                    } else {
                        console.log('❌ ConfigLoader non disponible');
                    }
                    
                    classDisplay = await classInstance.getDisplay();
                    console.log('✅ Affichage réel généré via DynamicFactory');
                } else {
                    console.log('⚠️ Impossible de créer l\'instance de classe');
                }
            } else {
                // Fallback : créer un affichage simple à partir des métadonnées
                console.log('⚠️ DynamicFactory non disponible, utilisation du fallback');
                const displayDiv = document.createElement('div');
                displayDiv.className = 'simple-display';
                
                for (const [key, value] of Object.entries(metadata)) {
                    if (key !== 'Classe' && value !== undefined && value !== '') {
                        const propDiv = document.createElement('div');
                        propDiv.className = 'property-item';
                        propDiv.innerHTML = `<strong>${key}:</strong> ${value}`;
                        displayDiv.appendChild(propDiv);
                    }
                }
                
                classDisplay = displayDiv;
            }

                // Clear and rebuild the content using DOM manipulation to preserve event listeners
                detailsContent.innerHTML = '';
                
                const detailsHeaderDiv = document.createElement('div');
                detailsHeaderDiv.className = 'details-header';
                detailsHeaderDiv.innerHTML = `
                    <h3 class="details-title">${fileName}</h3>
                    <p class="details-subtitle">Classe: ${className}</p>
                `;
                detailsContent.appendChild(detailsHeaderDiv);
                
                const filePathGroup = document.createElement('div');
                filePathGroup.className = 'form-group';
                filePathGroup.innerHTML = `
                    <label class="form-label">Chemin du fichier:</label>
                    <input type="text" class="form-input" value="${file.path}" readonly>
                `;
                detailsContent.appendChild(filePathGroup);

                const propertiesSection = document.createElement('div');
                propertiesSection.className = 'properties-section';
                
                // Si des displays sont configurés dans le YAML, les utiliser en priorité
                if (classDisplays && classDisplays.length > 0) {
                    propertiesSection.innerHTML = '<h3>🎨 Affichages configurés (displays YAML)</h3>';
                    
                    const displaysContainer = document.createElement('div');
                    displaysContainer.className = 'displays-container';
                    
                    for (const displayConfig of classDisplays) {
                        await this.createDisplayWidget(displayConfig, displaysContainer);
                    }
                    
                    propertiesSection.appendChild(displaysContainer);
                } else {
                    // Fallback sur getDisplay() classique
                    propertiesSection.innerHTML = '<h3>🎨 Affichage des propriétés (getDisplay réel)</h3>';
                    
                    const propertiesDisplay = document.createElement('div');
                    propertiesDisplay.className = 'properties-display';
                    propertiesDisplay.id = 'realPropertiesDisplay';
                    
                    if (classDisplay) {
                        // Append the live DOM element to preserve event listeners
                        propertiesDisplay.appendChild(classDisplay);
                    } else {
                        propertiesDisplay.innerHTML = '<div class="empty-state"><p>Aucun affichage disponible</p></div>';
                    }
                    
                    propertiesSection.appendChild(propertiesDisplay);
                }
                detailsContent.appendChild(propertiesSection);

                const metadataGroup = document.createElement('div');
                metadataGroup.className = 'form-group';
                metadataGroup.innerHTML = `
                    <label class="form-label">Métadonnées brutes:</label>
                    <textarea class="form-textarea" rows="8" readonly>${JSON.stringify(metadata, null, 2)}</textarea>
                `;
                detailsContent.appendChild(metadataGroup);

                const actionsGroup = document.createElement('div');
                actionsGroup.className = 'form-group';
                actionsGroup.innerHTML = `
                    <button class="btn" onclick="adminInterface.editFile('${filePath}')">
                        ✏️ Modifier le fichier
                    </button>
                    <button class="btn warning" onclick="adminInterface.duplicateFile('${filePath}')">
                        📋 Dupliquer
                    </button>
                    <button class="btn danger" onclick="adminInterface.deleteFile('${filePath}')">
                        🗑️ Supprimer
                    </button>
                `;
                detailsContent.appendChild(actionsGroup);

                // Show the properties toggle button
                if (typeof showPropertiesToggle === 'function') {
                    showPropertiesToggle();
                }
        } catch (error) {
            console.error('Erreur lors du chargement des détails:', error);
            detailsContent.innerHTML = `
                <div class="error">
                    Erreur lors du chargement: ${error.message}
                </div>
            `;
        }
    }

    clearDetails() {
        document.getElementById('detailsContent').innerHTML = `
            <div class="empty-state">
                <h4>Aucun fichier sélectionné</h4>
                <p>Cliquez sur un fichier pour voir et modifier ses propriétés.</p>
            </div>
        `;

        // Hide the properties toggle button
        if (typeof hidePropertiesToggle === 'function') {
            hidePropertiesToggle();
        }
    }

    async updateHeaderStats() {
        try {
            const stats = await this.fakeEnvironment.getStats();
            const headerStats = document.getElementById('headerStats');

            const classesCount = stats.availableClasses.length;
            const totalFiles = stats.totalFiles;
            const filesByClassHtml = Object.entries(stats.filesByClass)
                .map(([className, count]) => `${this.getClassIcon(className)} ${count}`)
                .join(' | ');

            headerStats.innerHTML = `
                <div class="stat-item">📋 ${classesCount} Classes</div>
                <div class="stat-item">📄 ${totalFiles} Fichiers</div>
                <div class="stat-item">${filesByClassHtml || 'Aucun fichier'}</div>
            `;
        } catch (error) {
            console.error('Erreur lors de la mise à jour des stats:', error);
        }
    }

    getClassIcon(className) {
        const icons = {
            'Contact': '👤',
            'Projet': '📋',
            'Tache': '✅',
            'Client': '🏢',
            'Entreprise': '🏭',
            'Document': '📄'
        };
        return icons[className] || '📦';
    }

    getKeyProperties(metadata, className) {
        const keyPropsMap = {
            'Contact': ['nom', 'email', 'entreprise', 'telephone'],
            'Projet': ['nom', 'statut', 'responsable', 'dateDebut', 'dateFin'],
            'Tache': ['titre', 'statut', 'priorite', 'assignee', 'dateEcheance']
        };

        const keyProps = keyPropsMap[className] || Object.keys(metadata).slice(0, 4);
        
        return keyProps
            .filter(prop => metadata[prop] !== undefined && metadata[prop] !== '')
            .map(prop => ({
                label: prop.charAt(0).toUpperCase() + prop.slice(1),
                value: this.formatPropertyValue(metadata[prop])
            }));
    }

    formatPropertyValue(value) {
        if (value === null || value === undefined) return 'Non défini';
        if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
        if (Array.isArray(value)) return value.join(', ');
        if (typeof value === 'string' && value.length > 30) return value.substring(0, 30) + '...';
        return String(value);
    }

    // Modal management
    async showCreateFileModal(preSelectedClass = '') {
        const modal = document.getElementById('createFileModal');
        const classSelect = document.getElementById('newFileClass');
        const nameInput = document.getElementById('newFileName');

        if (preSelectedClass) {
            classSelect.value = preSelectedClass;
            // Charger les données si c'est une classe avec data
            await this.handleClassChangeForModal(preSelectedClass);
        }
        nameInput.value = '';

        modal.classList.add('active');
        nameInput.focus();
    }
    
    async handleClassChangeForModal(className) {
        const nameGroup = document.getElementById('newFileNameGroup');
        const dataSelectGroup = document.getElementById('newFileDataSelectGroup');
        const dataSelect = document.getElementById('newFileDataSelect');
        
        if (!className) {
            nameGroup.style.display = 'block';
            dataSelectGroup.style.display = 'none';
            return;
        }
        
        // Vérifier si la classe a des données configurées
        try {
            const configLoader = this.fakeEnvironment.factory.configManager?.configLoader;
            const config = await configLoader.loadClassConfig(className);
            
            if (config.data && config.data.length > 0) {
                // Charger les données pour cette classe
                const classData = await configLoader.loadClassData(className);
                
                if (classData && classData.length > 0) {
                    // Classe avec données : afficher le select
                    nameGroup.style.display = 'none';
                    dataSelectGroup.style.display = 'block';
                    
                    // Peupler le select avec les noms disponibles
                    dataSelect.innerHTML = '<option value="">-- Sélectionner depuis les données --</option>';
                    
                    // Obtenir les fichiers existants pour cette classe
                    const existingFiles = await this.getExistingFilesForClass(className);
                    const existingNames = new Set(existingFiles.map(f => f.nom || f.name));
                    
                    for (const item of classData) {
                        const itemName = item.nom || item.name;
                        if (itemName && !existingNames.has(itemName)) {
                            const option = document.createElement('option');
                            option.value = itemName;
                            option.textContent = `${itemName}${item.type ? ` (${item.type})` : ''}`;
                            dataSelect.appendChild(option);
                        }
                    }
                    
                    this.classesWithData.set(className, classData);
                    return;
                }
            }
        } catch (error) {
            console.log(`Pas de données configurées pour ${className}`);
        }
        
        // Pas de données : afficher l'input normal
        nameGroup.style.display = 'block';
        dataSelectGroup.style.display = 'none';
    }
    
    async getExistingFilesForClass(className) {
        try {
            const allInstances = await this.fakeEnvironment.factory.getAllInstancesForClass(className);
            return allInstances.map(instance => {
                const metadata = instance.getFile()?.getMetadata() || {};
                return {
                    nom: metadata.nom || metadata.name,
                    name: metadata.name || metadata.nom
                };
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des fichiers existants:', error);
            return [];
        }
    }

    hideCreateFileModal() {
        document.getElementById('createFileModal').classList.remove('active');
    }

    async createNewFile() {
        try {
            const classSelect = document.getElementById('newFileClass');
            const nameInput = document.getElementById('newFileName');
            const dataSelect = document.getElementById('newFileDataSelect');
            
            const className = classSelect.value;
            if (!className) {
                this.showError('Veuillez sélectionner une classe');
                return;
            }
            
            // Déterminer le nom du fichier
            let fileName = '';
            const dataSelectGroup = document.getElementById('newFileDataSelectGroup');
            if (dataSelectGroup.style.display !== 'none' && dataSelect.value) {
                // Créer depuis les données
                fileName = dataSelect.value;
                const classData = this.classesWithData.get(className);
                const selectedData = classData.find(item => (item.nom || item.name) === fileName);
                
                if (selectedData) {
                    // Utiliser DynamicClassFactory pour créer depuis les données
                    await this.fakeEnvironment.factory.createInstanceFromDataObject(className, selectedData, this.fakeEnvironment.vault, classData);
                    this.showSuccess(`Fichier "${fileName}" créé avec succès depuis les données !`);
                    this.hideCreateFileModal();
                    await this.refreshFileTree();
                    return;
                }
            } else {
                // Créer manuellement
                fileName = nameInput.value.trim();
                if (!fileName) {
                    this.showError('Veuillez entrer un nom de fichier');
                    return;
                }
            }
            
            // Obtenir la classe TypeScript
            const ClassConstructor = await this.fakeEnvironment.factory.getClass(className);
            
            // Créer le fichier via Vault.createFile (qui déclenche le populate)
            console.log(`🚀 Création du fichier "${fileName}" de classe "${className}"...`);
            const file = await this.fakeEnvironment.vault.createFile(ClassConstructor, fileName + '.md');
            
            if (file) {
                this.showSuccess(`Fichier "${fileName}" créé avec succès !`);
                this.hideCreateFileModal();
                await this.refreshFileTree();
                
                // Ouvrir le fichier créé
                setTimeout(async () => {
                    await this.loadFileContent(file);
                }, 500);
            } else {
                // L'utilisateur a probablement annulé le populate
                console.log('⚠️ Création de fichier annulée (probablement via populate)');
            }
            
        } catch (error) {
            console.error('❌ Erreur lors de la création du fichier:', error);
            this.showError('Erreur lors de la création du fichier: ' + error.message);
        }
    }

    showStatsModal() {
        const modal = document.getElementById('statsModal');
        modal.classList.add('active');
        this.loadStats();
    }

    hideStatsModal() {
        document.getElementById('statsModal').classList.remove('active');
    }

    async loadStats() {
        const statsContent = document.getElementById('statsContent');
        
        try {
            const stats = await this.fakeEnvironment.getStats();
            const environment = this.fakeEnvironment;

            statsContent.innerHTML = `
                <div class="form-group">
                    <label class="form-label">Informations générales:</label>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        <strong>Vault:</strong> ${environment.vault.getName()}<br>
                        <strong>Chemin:</strong> ${environment.vault.getPath()}<br>
                        <strong>Utilisateur:</strong> ${environment.vault.getPersonalName()}<br>
                        <strong>Dossier templates:</strong> ${environment.vault.settings.templateFolder}<br>
                        <strong>Dossier config:</strong> ${environment.vault.settings.configPath}
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Statistiques des fichiers:</label>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        <strong>Total des fichiers:</strong> ${stats.totalFiles}<br><br>
                        ${Object.entries(stats.filesByClass).map(([className, count]) => 
                            `<strong>${this.getClassIcon(className)} ${className}:</strong> ${count} fichier(s)`
                        ).join('<br>')}
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Classes disponibles:</label>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        ${stats.availableClasses.map(className => 
                            `${this.getClassIcon(className)} ${className}`
                        ).join('<br>')}
                    </div>
                </div>
            `;
        } catch (error) {
            statsContent.innerHTML = `<div class="error">Erreur lors du chargement: ${error.message}</div>`;
        }
    }

    // Actions
    async refreshData() {
        console.log('🔄 Actualisation des données...');
        await this.loadInterface();
        this.showSuccess('Données actualisées');
    }

    async refreshVault() {
        console.log('🔄 Refresh complet du vault...');
        try {
            // Réinitialiser complètement le vault
            await this.fakeEnvironment.initializeVault();
            await this.loadInterface();
            this.showSuccess('✅ Vault rechargé avec succès');
        } catch (error) {
            console.error('❌ Erreur lors du refresh du vault:', error);
            this.showError('Erreur lors du refresh du vault: ' + error.message);
        }
    }

    async exportData() {
        try {
            const stats = await this.fakeEnvironment.getStats();
            let allFiles = this.fakeEnvironment.app.getAllFiles();
            
            // S'assurer que allFiles est un tableau
            if (!Array.isArray(allFiles)) {
                console.warn('getAllFiles() n\'a pas retourné un tableau, récupération via listFiles()');
                allFiles = await this.fakeEnvironment.app.listFiles() || [];
            }
            
            const exportData = {
                timestamp: new Date().toISOString(),
                stats: stats,
                files: []
            };

            for (const file of allFiles) {
                try {
                    const content = await this.fakeEnvironment.app.readFile(file);
                    const metadata = await this.fakeEnvironment.app.getMetadata(file);
                    
                    exportData.files.push({
                        path: file.path,
                        name: file.name,
                        content: content,
                        metadata: metadata
                    });
                } catch (error) {
                    console.warn(`Impossible d'exporter ${file.path}:`, error);
                }
            }

            // Create download
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `crm-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showSuccess('Données exportées avec succès');
        } catch (error) {
            console.error('Erreur lors de l\'export:', error);
            this.showError('Erreur lors de l\'export: ' + error.message);
        }
    }

    async resetEnvironment() {
        if (!confirm('Êtes-vous sûr de vouloir réinitialiser l\'environnement ? Toutes les données seront perdues.')) {
            return;
        }

        try {
            // Re-create the environment
            const { createFakeEnvironment } = await import('./main.js');
            this.fakeEnvironment = await createFakeEnvironment();
            
            // Reset UI state
            this.selectedClass = null;
            this.selectedFile = null;
            this.filesData.clear();
            
            await this.loadInterface();
            this.showSuccess('Environnement réinitialisé avec succès');
        } catch (error) {
            console.error('Erreur lors de la réinitialisation:', error);
            this.showError('Erreur lors de la réinitialisation: ' + error.message);
        }
    }

    // File actions
    async editFile(filePath) {
        // For now, just show the file content in an alert
        // In a real implementation, this would open an editor
        try {
            const fileData = this.filesData.get(filePath);
            if (fileData) {
                const content = await this.fakeEnvironment.app.readFile(fileData.file);
                alert(`Contenu du fichier ${fileData.file.name}:\n\n${content}`);
            }
        } catch (error) {
            this.showError('Erreur lors de la lecture du fichier: ' + error.message);
        }
    }
    async deleteFile(filePath) {
        const fileData = this.filesData.get(filePath);
        if (!fileData) return;

        if (!confirm(`Êtes-vous sûr de vouloir supprimer "${fileData.file.name}" ?`)) {
            return;
        }

        try {
            await this.fakeEnvironment.app.delete(fileData.file);
            this.filesData.delete(filePath);
            
            this.showSuccess(`Fichier supprimé: ${fileData.file.name}`);
            
            if (this.selectedFile === filePath) {
                this.selectedFile = null;
                this.clearDetails();
            }
            
            if (this.selectedClass === fileData.className) {
                await this.loadFiles(fileData.className);
            }
            await this.updateHeaderStats();
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            this.showError('Erreur lors de la suppression: ' + error.message);
        }
    }

    // Utility methods
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;
        errorDiv.style.position = 'fixed';
        errorDiv.style.top = '20px';
        errorDiv.style.right = '20px';
        errorDiv.style.zIndex = '9999';
        errorDiv.style.maxWidth = '400px';
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success';
        successDiv.textContent = message;
        successDiv.style.position = 'fixed';
        successDiv.style.top = '20px';
        successDiv.style.right = '20px';
        successDiv.style.zIndex = '9999';
        successDiv.style.maxWidth = '400px';
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }

    // ===== NOUVELLES MÉTHODES POUR L'ARBORESCENCE =====
    
    async buildFileTree() {
        console.log('🌲 Construction de l\'arborescence des fichiers...');
        const fileTreeElement = document.getElementById('fileTree');
        
        try {
            // Récupérer tous les fichiers du vault via app
            const allFiles = this.fakeEnvironment.app.getAllFiles();
            
            // Construire la structure de l'arborescence
            const tree = this.createFileTreeStructure(allFiles);
            
            // Afficher l'arborescence
            fileTreeElement.innerHTML = '';
            this.renderFileTree(tree, fileTreeElement);
            
            console.log('✅ Arborescence construite avec succès');
        } catch (error) {
            console.error('❌ Erreur lors de la construction de l\'arborescence:', error);
            fileTreeElement.innerHTML = '<li class="error">Erreur lors du chargement</li>';
        }
    }

    createFileTreeStructure(files) {
        const root = { name: 'vault', type: 'folder', children: {}, path: '' };
        
        for (const file of files) {
            const parts = file.path.split('/');
            let current = root;
            
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const isFile = i === parts.length - 1;
                
                if (isFile) {
                    // C'est un fichier
                    if (!current.files) current.files = [];
                    current.files.push({
                        name: part,
                        type: 'file',
                        path: file.path,
                        file: file
                    });
                } else {
                    // C'est un dossier
                    if (!current.children[part]) {
                        current.children[part] = {
                            name: part,
                            type: 'folder',
                            children: {},
                            path: parts.slice(0, i + 1).join('/')
                        };
                    }
                    current = current.children[part];
                }
            }
        }
        
        return root;
    }

    renderFileTree(node, parentElement, level = 0) {
        // Afficher les dossiers
        for (const folderName in node.children) {
            const folder = node.children[folderName];
            const li = document.createElement('li');
            li.className = 'file-tree-item folder';
            
            const toggle = document.createElement('span');
            toggle.className = 'folder-toggle expanded';
            toggle.textContent = '▶';
            toggle.onclick = (e) => {
                e.stopPropagation();
                this.toggleFolder(toggle);
            };
            
            const icon = document.createElement('span');
            icon.className = 'file-tree-icon';
            icon.textContent = '📁';
            
            const label = document.createElement('span');
            label.className = 'file-tree-label';
            label.textContent = folder.name;
            
            li.appendChild(toggle);
            li.appendChild(icon);
            li.appendChild(label);
            
            // Créer la liste des enfants
            const childrenUl = document.createElement('ul');
            childrenUl.className = 'file-tree-children';
            this.renderFileTree(folder, childrenUl, level + 1);
            
            parentElement.appendChild(li);
            parentElement.appendChild(childrenUl);
        }
        
        // Afficher les fichiers
        if (node.files) {
            for (const file of node.files.sort((a, b) => a.name.localeCompare(b.name))) {
                const li = document.createElement('li');
                li.className = 'file-tree-item file';
                
                const icon = document.createElement('span');
                icon.className = 'file-tree-icon';
                icon.textContent = '📄';
                
                const label = document.createElement('span');
                label.className = 'file-tree-label';
                label.textContent = file.name.replace('.md', '');
                
                li.appendChild(icon);
                li.appendChild(label);
                li.onclick = () => this.selectFileFromTree(file);
                
                parentElement.appendChild(li);
            }
        }
    }

    toggleFolder(toggleElement) {
        toggleElement.classList.toggle('expanded');
        const childrenList = toggleElement.parentElement.nextElementSibling;
        if (childrenList && childrenList.classList.contains('file-tree-children')) {
            childrenList.classList.toggle('collapsed');
        }
    }

    async selectFileFromTree(fileNode) {
        console.log(`📄 Sélection du fichier depuis l'arborescence: ${fileNode.path}`);
        
        // Retirer la sélection active
        document.querySelectorAll('.file-tree-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Activer la sélection
        event.currentTarget.classList.add('active');
        
        this.selectedFile = fileNode.path;
        
        // Mettre à jour l'URL avec le chemin du fichier
        this.updateUrlWithFile(fileNode.path);
        
        // Charger et afficher les détails du fichier
        await this.loadFileContent(fileNode.file);
    }
    
    updateUrlWithFile(filePath) {
        try {
            // Encoder le chemin du fichier pour l'URL
            const encodedPath = encodeURIComponent(filePath);
            
            // Mettre à jour le hash de l'URL sans recharger la page
            const newUrl = `${window.location.pathname}#file=${encodedPath}`;
            window.history.pushState(null, '', newUrl);
            
            console.log(`🔗 URL mise à jour: ${newUrl}`);
        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'URL:', error);
        }
    }

    async loadFileContent(file) {
        const mainContent = document.getElementById('mainContent');
        const contentTitle = document.getElementById('contentTitle');
        
        try {
            contentTitle.textContent = `📄 ${file.name.replace('.md', '')}`;
            mainContent.innerHTML = '<div class="loading">Chargement du fichier...</div>';
            
            // Récupérer les métadonnées
            const metadata = await this.fakeEnvironment.app.getMetadata(file);
            
            // Déterminer la classe du fichier
            const className = metadata.classe || 'Unknown';
            
            // Récupérer le contenu brut
            // Si file est une instance File du vault, utiliser file.file pour obtenir IFile
            const iFile = file.file || file;
            const content = await this.fakeEnvironment.app.readFile(iFile);
            
            // Créer l'affichage
            mainContent.innerHTML = '';
            
            // Section Propriétés
            const propertiesSection = document.createElement('div');
            propertiesSection.className = 'properties-section';
            propertiesSection.innerHTML = '<h3>🎨 Propriétés Dynamiques</h3>';
            
            const propertiesDisplay = document.createElement('div');
            propertiesDisplay.className = 'properties-display';
            
            // Générer l'affichage réel via DynamicFactory
            const dynamicFactory = this.fakeEnvironment.vault.getDynamicClassFactory();
            if (dynamicFactory && className !== 'Unknown') {
                try {
                    // Utiliser createClasse pour créer correctement l'instance avec File wrappé
                    const classInstance = await this.fakeEnvironment.vault.createClasse(file);
                    if (classInstance) {
                        const classDisplay = await classInstance.getDisplay();
                        propertiesDisplay.appendChild(classDisplay);
                    } else {
                        propertiesDisplay.innerHTML = '<div class="error">Impossible de créer l\'instance de classe</div>';
                    }
                } catch (error) {
                    console.error('Erreur lors de la génération des propriétés:', error);
                    propertiesDisplay.innerHTML = `<div class="error">Erreur: ${error.message}</div>`;
                }
            } else {
                // Affichage simple des métadonnées
                for (const [key, value] of Object.entries(metadata)) {
                    if (value !== undefined && value !== '') {
                        const propDiv = document.createElement('div');
                        propDiv.className = 'metadata-field';
                        propDiv.innerHTML = `<strong>${key}:</strong> ${value}`;
                        propertiesDisplay.appendChild(propDiv);
                    }
                }
            }
            
            propertiesSection.appendChild(propertiesDisplay);
            mainContent.appendChild(propertiesSection);
            
            // Section Contenu Markdown
            const contentSection = document.createElement('div');
            contentSection.className = 'properties-section';
            contentSection.innerHTML = '<h3>📝 Contenu Markdown</h3>';
            
            // Créer un textarea éditable
            const contentEditor = document.createElement('textarea');
            contentEditor.id = 'markdownEditor';
            contentEditor.className = 'markdown-editor';
            contentEditor.value = content;
            contentEditor.style.width = '100%';
            contentEditor.style.minHeight = '400px';
            contentEditor.style.fontFamily = 'monospace';
            contentEditor.style.fontSize = '14px';
            contentEditor.style.padding = '15px';
            contentEditor.style.border = '2px solid #e1e5e9';
            contentEditor.style.borderRadius = '8px';
            contentEditor.style.resize = 'vertical';
            contentEditor.style.whiteSpace = 'pre';
            contentEditor.style.overflowWrap = 'normal';
            contentEditor.style.overflowX = 'auto';
            
            // Stocker le fichier actuel pour la sauvegarde
            contentEditor.dataset.filePath = file.path;
            
            // Ajouter l'indicateur de sauvegarde
            const saveIndicator = document.createElement('div');
            saveIndicator.id = 'saveIndicator';
            saveIndicator.style.textAlign = 'right';
            saveIndicator.style.fontSize = '12px';
            saveIndicator.style.color = '#666';
            saveIndicator.style.marginTop = '5px';
            saveIndicator.style.minHeight = '20px';
            contentSection.appendChild(saveIndicator);
            
            // Ajouter la sauvegarde automatique avec debounce
            let saveTimeout;
            contentEditor.addEventListener('input', () => {
                // Afficher "Modification en cours..."
                saveIndicator.textContent = '✏️ Modification en cours...';
                saveIndicator.style.color = '#ffc107';
                
                // Annuler le timeout précédent
                clearTimeout(saveTimeout);
                
                // Lancer un nouveau timeout de 1 seconde
                saveTimeout = setTimeout(async () => {
                    await this.autoSaveFileContent(file, contentEditor.value, saveIndicator);
                }, 1000);
            });
            
            contentSection.appendChild(contentEditor);
            mainContent.appendChild(contentSection);
            
            // Section Info
            const infoSection = document.createElement('div');
            infoSection.className = 'form-group';
            infoSection.innerHTML = `
                <label class="form-label">Informations:</label>
                <div style="display: grid; gap: 8px;">
                    <div><strong>Chemin:</strong> ${file.path}</div>
                    <div><strong>Classe:</strong> ${className}</div>
                    <div><strong>Nom:</strong> ${file.name}</div>
                </div>
            `;
            mainContent.appendChild(infoSection);
            
            // Bouton de suppression uniquement
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'form-group';
            actionsDiv.style.display = 'flex';
            actionsDiv.style.gap = '10px';
            actionsDiv.innerHTML = `
                <button class="btn danger" onclick="adminInterface.deleteFileFromTree('${file.path}')">
                    �️ Supprimer
                </button>
            `;
            mainContent.appendChild(actionsDiv);
            
            // Observer les changements dans les propriétés dynamiques pour auto-save
            this.setupPropertyObserver(propertiesDisplay, file);
            
        } catch (error) {
            console.error('Erreur lors du chargement du fichier:', error);
            mainContent.innerHTML = `<div class="error">Erreur: ${error.message}</div>`;
        }
    }

    async refreshFileTree() {
        await this.buildFileTree();
    }

    async autoSaveFileContent(file, newContent, saveIndicator) {
        try {
            // Afficher "Sauvegarde..."
            saveIndicator.textContent = '💾 Sauvegarde en cours...';
            saveIndicator.style.color = '#007bff';
            
            // Sauvegarder via writeFile qui écrit sur le disque
            await this.fakeEnvironment.app.writeFile(file, newContent);
            
            // Afficher "Sauvegardé"
            saveIndicator.textContent = '✅ Sauvegardé automatiquement';
            saveIndicator.style.color = '#28a745';
            
            // Masquer le message après 3 secondes
            setTimeout(() => {
                saveIndicator.textContent = '';
            }, 3000);
            
            console.log(`✅ Auto-sauvegarde: ${file.name}`);
            
        } catch (error) {
            console.error('Erreur lors de la sauvegarde automatique:', error);
            saveIndicator.textContent = '❌ Erreur de sauvegarde';
            saveIndicator.style.color = '#dc3545';
        }
    }
    
    setupPropertyObserver(propertiesDisplay, file) {
        // Ne pas utiliser MutationObserver car il crée une boucle infinie
        // Les propriétés appellent déjà updateMetadata qui sauvegarde automatiquement
        // On ajoute juste des écouteurs pour mettre à jour l'éditeur markdown après les changements
        
        // Utiliser la délégation d'événements pour capturer les clics sur tous les boutons
        // y compris ceux créés dynamiquement par ObjectProperty
        propertiesDisplay.addEventListener('click', async (event) => {
            const target = event.target;
            
            // Vérifier si c'est un bouton ou un élément interactif
            if (target.tagName === 'BUTTON' || target.classList.contains('star') || 
                target.closest('button') || target.closest('.metadata-add-button') || 
                target.closest('.metadata-delete-button')) {
                
                console.log('🔄 Clic sur élément détecté:', target.className);
                const saveIndicator = document.getElementById('saveIndicator');
                if (saveIndicator) {
                    saveIndicator.textContent = '💾 Sauvegarde en cours...';
                    saveIndicator.style.color = '#007bff';
                }
                
                // Attendre que updateMetadata soit terminé
                setTimeout(async () => {
                    const editor = document.getElementById('markdownEditor');
                    if (editor) {
                        await new Promise(resolve => setTimeout(resolve, 200));
                        const iFile = file.file || file;
                        const updatedContent = await this.fakeEnvironment.app.readFile(iFile);
                        console.log('📥 Contenu mis à jour récupéré, longueur:', updatedContent.length);
                        editor.value = updatedContent;
                        
                        if (saveIndicator) {
                            saveIndicator.textContent = '✅ Sauvegardé automatiquement';
                            saveIndicator.style.color = '#28a745';
                            setTimeout(() => {
                                saveIndicator.textContent = '';
                            }, 3000);
                        }
                    }
                }, 500);
            }
        });
        
        // Utiliser la délégation d'événements pour capturer les inputs/textarea
        let inputTimeout;
        propertiesDisplay.addEventListener('input', async (event) => {
            const target = event.target;
            
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
                console.log('✏️ Modification détectée:', target.tagName);
                const saveIndicator = document.getElementById('saveIndicator');
                if (saveIndicator) {
                    saveIndicator.textContent = '✏️ Modification en cours...';
                    saveIndicator.style.color = '#ffc107';
                }
                
                clearTimeout(inputTimeout);
                inputTimeout = setTimeout(async () => {
                    const editor = document.getElementById('markdownEditor');
                    if (editor) {
                        await new Promise(resolve => setTimeout(resolve, 300));
                        const updatedContent = await file.getContent();
                        console.log('📥 Contenu mis à jour récupéré, longueur:', updatedContent.length);
                        editor.value = updatedContent;
                        
                        if (saveIndicator) {
                            saveIndicator.textContent = '✅ Sauvegardé automatiquement';
                            saveIndicator.style.color = '#28a745';
                            setTimeout(() => {
                                saveIndicator.textContent = '';
                            }, 3000);
                        }
                    }
                }, 1000);
            }
        });
        
        // Ajouter des écouteurs sur les inputs, selects, etc. (pour compatibilité avec ancien code)
        setTimeout(() => {
            const inputs = propertiesDisplay.querySelectorAll('input, select, textarea, button');
            inputs.forEach(input => {
                // Pour les boutons "plus" de MultiFileProperty
                if (input.classList.contains('metadata-add-button-inline-small')) {
                    input.addEventListener('click', async () => {
                        console.log('➕ Clic sur bouton d\'ajout MultiFileProperty détecté');
                        const saveIndicator = document.getElementById('saveIndicator');
                        if (saveIndicator) {
                            saveIndicator.textContent = '💾 Sauvegarde en cours...';
                            saveIndicator.style.color = '#007bff';
                        }
                        
                        // Attendre que la sélection soit terminée et updateMetadata appelé
                        // Utiliser un délai plus long pour laisser le temps à selectMultipleFile
                        setTimeout(async () => {
                            const editor = document.getElementById('markdownEditor');
                            if (editor) {
                                // Attendre que l'écriture soit terminée
                                await new Promise(resolve => setTimeout(resolve, 500));
                                
                                // Récupérer le contenu mis à jour depuis le fichier
                                const updatedContent = await file.getContent();
                                console.log('📥 Contenu mis à jour récupéré après ajout, longueur:', updatedContent.length);
                                editor.value = updatedContent;
                                
                                if (saveIndicator) {
                                    saveIndicator.textContent = '✅ Sauvegardé automatiquement';
                                    saveIndicator.style.color = '#28a745';
                                    setTimeout(() => {
                                        saveIndicator.textContent = '';
                                    }, 3000);
                                }
                            }
                        }, 1500); // Délai plus long pour selectMultipleFile
                    });
                    return; // Skip other event listeners for this button
                }
                
                // Pour les boutons de suppression de MultiFileProperty
                if (input.classList.contains('metadata-delete-button-inline-small')) {
                    input.addEventListener('click', async () => {
                        console.log('🗑️ Clic sur bouton de suppression MultiFileProperty détecté');
                        const saveIndicator = document.getElementById('saveIndicator');
                        if (saveIndicator) {
                            saveIndicator.textContent = '💾 Sauvegarde en cours...';
                            saveIndicator.style.color = '#007bff';
                        }
                        
                        // Attendre que updateMetadata soit terminé
                        setTimeout(async () => {
                            const editor = document.getElementById('markdownEditor');
                            if (editor) {
                                // Attendre que l'écriture soit terminée
                                await new Promise(resolve => setTimeout(resolve, 200));
                                
                                // Récupérer le contenu mis à jour depuis le fichier
                                const updatedContent = await file.getContent();
                                console.log('📥 Contenu mis à jour récupéré après suppression, longueur:', updatedContent.length);
                                editor.value = updatedContent;
                                
                                if (saveIndicator) {
                                    saveIndicator.textContent = '✅ Sauvegardé automatiquement';
                                    saveIndicator.style.color = '#28a745';
                                    setTimeout(() => {
                                        saveIndicator.textContent = '';
                                    }, 3000);
                                }
                            }
                        }, 500);
                    });
                    return; // Skip other event listeners for this button
                }
                
                // Pour les boutons boolean, rating, etc.
                input.addEventListener('click', async () => {
                    console.log('🔄 Clic sur propriété détecté');
                    const saveIndicator = document.getElementById('saveIndicator');
                    if (saveIndicator) {
                        saveIndicator.textContent = '💾 Sauvegarde en cours...';
                        saveIndicator.style.color = '#007bff';
                    }
                    
                    // Attendre que updateMetadata soit terminé (la propriété fait la mise à jour)
                    // Augmenter le délai pour laisser le temps à l'écriture sur disque
                    setTimeout(async () => {
                        const editor = document.getElementById('markdownEditor');
                        if (editor) {
                            // Attendre un peu plus pour s'assurer que l'écriture est terminée
                            await new Promise(resolve => setTimeout(resolve, 200));
                            
                            // Récupérer le contenu mis à jour depuis le fichier (déjà sauvegardé par updateMetadata)
                            const updatedContent = await file.getContent();
                            console.log('📥 Contenu mis à jour récupéré, longueur:', updatedContent.length);
                            editor.value = updatedContent;
                            
                            if (saveIndicator) {
                                saveIndicator.textContent = '✅ Sauvegardé automatiquement';
                                saveIndicator.style.color = '#28a745';
                                setTimeout(() => {
                                    saveIndicator.textContent = '';
                                }, 3000);
                            }
                        }
                    }, 500);
                });
                
                // Pour les inputs text
                if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
                    let inputTimeout;
                    input.addEventListener('input', async () => {
                        const saveIndicator = document.getElementById('saveIndicator');
                        if (saveIndicator) {
                            saveIndicator.textContent = '✏️ Modification en cours...';
                            saveIndicator.style.color = '#ffc107';
                        }
                        
                        clearTimeout(inputTimeout);
                        inputTimeout = setTimeout(async () => {
                            console.log('🔄 Modification d\'input détectée');
                            const editor = document.getElementById('markdownEditor');
                            if (editor) {
                                // updateMetadata a déjà été appelé par la propriété via onblur
                                // On attend un peu plus pour s'assurer que l'écriture est terminée
                                await new Promise(resolve => setTimeout(resolve, 500));
                                const updatedContent = await file.getContent();
                                console.log('📥 Contenu mis à jour récupéré, longueur:', updatedContent.length);
                                editor.value = updatedContent;
                                
                                if (saveIndicator) {
                                    saveIndicator.textContent = '✅ Sauvegardé automatiquement';
                                    saveIndicator.style.color = '#28a745';
                                    setTimeout(() => {
                                        saveIndicator.textContent = '';
                                    }, 3000);
                                }
                            }
                        }, 1500);
                    });
                }
            });
            
            // Ajouter un écouteur spécial pour les étoiles de rating (ce sont des divs)
            const stars = propertiesDisplay.querySelectorAll('.star');
            stars.forEach(star => {
                star.addEventListener('click', async () => {
                    console.log('⭐ Clic sur étoile de rating détecté');
                    const saveIndicator = document.getElementById('saveIndicator');
                    if (saveIndicator) {
                        saveIndicator.textContent = '💾 Sauvegarde en cours...';
                        saveIndicator.style.color = '#007bff';
                    }
                    
                    // Attendre que updateMetadata soit terminé
                    setTimeout(async () => {
                        const editor = document.getElementById('markdownEditor');
                        if (editor) {
                            // Attendre un peu plus pour s'assurer que l'écriture est terminée
                            await new Promise(resolve => setTimeout(resolve, 200));
                            
                            // Récupérer le contenu mis à jour depuis le fichier
                            const updatedContent = await file.getContent();
                            console.log('📥 Contenu mis à jour récupéré, longueur:', updatedContent.length);
                            editor.value = updatedContent;
                            
                            if (saveIndicator) {
                                saveIndicator.textContent = '✅ Sauvegardé automatiquement';
                                saveIndicator.style.color = '#28a745';
                                setTimeout(() => {
                                    saveIndicator.textContent = '';
                                }, 3000);
                            }
                        }
                    }, 500);
                });
            });
            
            // Ajouter un MutationObserver pour détecter les changements dans le DOM
            // (quand MultiFileProperty recharge son interface)
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.addedNodes.length > 0) {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                // Chercher les boutons ajoutés
                                const buttons = node.querySelectorAll ? node.querySelectorAll('button') : [];
                                buttons.forEach(button => {
                                    // Vérifier si c'est un bouton qui n'a pas déjà d'écouteur
                                    if (!button.dataset.listenerAdded) {
                                        button.dataset.listenerAdded = 'true';
                                        button.addEventListener('click', async () => {
                                            console.log('🔄 Clic sur bouton détecté (MutationObserver)');
                                            const saveIndicator = document.getElementById('saveIndicator');
                                            if (saveIndicator) {
                                                saveIndicator.textContent = '💾 Sauvegarde en cours...';
                                                saveIndicator.style.color = '#007bff';
                                            }
                                            
                                            // Attendre la fin de l'opération
                                            setTimeout(async () => {
                                                const editor = document.getElementById('markdownEditor');
                                                if (editor) {
                                                    await new Promise(resolve => setTimeout(resolve, 500));
                                                    const updatedContent = await file.getContent();
                                                    console.log('📥 Contenu mis à jour récupéré (après mutation), longueur:', updatedContent.length);
                                                    editor.value = updatedContent;
                                                    
                                                    if (saveIndicator) {
                                                        saveIndicator.textContent = '✅ Sauvegardé automatiquement';
                                                        saveIndicator.style.color = '#28a745';
                                                        setTimeout(() => {
                                                            saveIndicator.textContent = '';
                                                        }, 3000);
                                                    }
                                                }
                                            }, 1000);
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            });
            
            // Observer les changements dans propertiesDisplay
            observer.observe(propertiesDisplay, {
                childList: true,
                subtree: true
            });
        }, 500);
    }

    async editFileFromTree(filePath) {
        // Cette méthode n'est plus nécessaire car l'éditeur est directement dans loadFileContent
        // On peut la garder pour compatibilité
        console.log(`Édition du fichier: ${filePath}`);
    }

    async deleteFileFromTree(filePath) {
        if (confirm(`Voulez-vous vraiment supprimer le fichier ${filePath} ?`)) {
            try {
                await this.fakeEnvironment.vault.deleteFile(filePath);
                this.showSuccess(`Fichier ${filePath} supprimé avec succès`);
                await this.refreshFileTree();
                document.getElementById('mainContent').innerHTML = `
                    <div class="empty-state">
                        <h3>📂 Explorateur de Fichiers CRM</h3>
                        <p>Sélectionnez un fichier dans l'arborescence de gauche.</p>
                    </div>
                `;
            } catch (error) {
                this.showError(`Erreur lors de la suppression: ${error.message}`);
            }
        }
    }
    
    // Méthode pour créer des widgets d'affichage depuis les configurations YAML
    async createDisplayWidget(displayConfig, containerElement) {
        console.log('🎨 Création du widget display:', displayConfig);
        
        try {
            const widgetContainer = document.createElement('div');
            widgetContainer.className = 'display-widget';
            widgetContainer.style.cssText = 'margin-bottom: 30px; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; background-color: #fff;';
            
            if (displayConfig.title) {
                const titleElement = document.createElement('h3');
                titleElement.textContent = displayConfig.title;
                titleElement.style.cssText = 'margin: 0 0 20px 0; color: #333; font-size: 1.4em; border-bottom: 2px solid #007bff; padding-bottom: 10px;';
                widgetContainer.appendChild(titleElement);
            }
            
            // Déléguer la création à FakeApp
            switch (displayConfig.type) {
                case 'tabs':
                    await this.fakeEnvironment.app.createTabsWidget(displayConfig, widgetContainer);
                    break;
                case 'map':
                    await this.fakeEnvironment.app.createMapWidget(displayConfig, widgetContainer);
                    break;
                case 'table':
                    await this.fakeEnvironment.app.createTableWidget(displayConfig, widgetContainer);
                    break;
                case 'property':
                    await this.fakeEnvironment.app.createPropertyWidget(displayConfig, widgetContainer);
                    break;
                default:
                    widgetContainer.innerHTML += `<p style="color: #666; font-style: italic;">Type de widget non supporté: ${displayConfig.type}</p>`;
            }
            
            containerElement.appendChild(widgetContainer);
            return widgetContainer;
        } catch (error) {
            console.error(`❌ Erreur lors de la création du widget ${displayConfig.type}:`, error);
            const errorDiv = document.createElement('div');
            errorDiv.innerHTML = `<p style="color: red;">Erreur lors de la création du widget: ${error.message}</p>`;
            containerElement.appendChild(errorDiv);
            return errorDiv;
        }
    }
}

// Global functions for HTML onclick handlers
function refreshData() {
    adminInterface.refreshData();
}

function showCreateFileModal(preSelectedClass = '') {
    adminInterface.showCreateFileModal(preSelectedClass);
}

function hideCreateFileModal() {
    adminInterface.hideCreateFileModal();
}

function showEnvironmentStats() {
    adminInterface.showStatsModal();
}

function hideStatsModal() {
    adminInterface.hideStatsModal();
}

function exportData() {
    adminInterface.exportData();
}

function resetEnvironment() {
    adminInterface.resetEnvironment();
}

// Initialize the interface when the page loads
let adminInterface;

document.addEventListener('DOMContentLoaded', function() {
    adminInterface = new AdminInterface();
});

// Gérer les changements d'historique (bouton retour/avant du navigateur)
window.addEventListener('popstate', async function(event) {
    if (adminInterface && adminInterface.fakeEnvironment) {
        console.log('🔙 Navigation dans l\'historique détectée');
        await adminInterface.handleUrlParameters();
    }
});

// Gérer les changements de hash
window.addEventListener('hashchange', async function(event) {
    if (adminInterface && adminInterface.fakeEnvironment) {
        console.log('🔗 Changement de hash détecté');
        await adminInterface.handleUrlParameters();
    }
});

// Handle modal clicks (close modal when clicking outside)
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
});

// Raccourci clavier Ctrl+L pour créer/rechercher un lieu
// Raccourci clavier Ctrl+P pour créer/rechercher une personne
document.addEventListener('keydown', function(event) {
    // Vérifier si Ctrl+L est pressé (ou Cmd+L sur Mac)
    if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
        event.preventDefault(); // Empêcher le comportement par défaut du navigateur
        
        console.log('⌨️ Raccourci Ctrl+L détecté - Ouverture du modal Lieu');
        
        if (adminInterface && adminInterface.fakeEnvironment) {
            showLieuModal();
        }
    }
    
    // Vérifier si Ctrl+P est pressé (ou Cmd+P sur Mac)
    if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
        event.preventDefault(); // Empêcher le comportement par défaut du navigateur (impression)
        
        console.log('⌨️ Raccourci Ctrl+P détecté - Ouverture du modal Personne');
        
        if (adminInterface && adminInterface.fakeEnvironment) {
            showPersonneModal();
        }
    }
});

// Fonction globale pour gérer le changement de classe dans le modal
async function handleClassChange() {
    const classSelect = document.getElementById('newFileClass');
    const className = classSelect.value;
    
    if (adminInterface) {
        await adminInterface.handleClassChangeForModal(className);
    }
}

// Fonctions globales pour les modals
function showCreateFileModal() {
    if (adminInterface) {
        adminInterface.showCreateFileModal();
    }
}

function showCreateLieuModal() {
    showLieuModal();
}

function hideCreateFileModal() {
    if (adminInterface) {
        adminInterface.hideCreateFileModal();
    }
}

function showStatsModal() {
    if (adminInterface) {
        adminInterface.showStatsModal();
    }
}

function hideStatsModal() {
    if (adminInterface) {
        adminInterface.hideStatsModal();
    }
}

// Fonctions globales pour le modal de Lieu
let allLieuxData = [];
let existingLieux = [];

async function showLieuModal() {
    const modal = document.getElementById('lieuModal');
    if (!modal || !adminInterface || !adminInterface.fakeEnvironment) return;
    
    modal.classList.add('active');
    
    // Charger les données
    await loadLieuxData();
    
    // Focus sur le champ de recherche
    setTimeout(() => {
        const searchInput = document.getElementById('lieuSearchInput');
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
            
            // Afficher message initial
            document.getElementById('lieuResultsContainer').innerHTML = `
                <div class="no-results">
                    <h4>🔍 Recherche de lieux</h4>
                    <p>Tapez le nom d'un lieu pour rechercher...</p>
                </div>
            `;
            
            // Ajouter l'écouteur de recherche
            searchInput.oninput = (e) => searchLieux(e.target.value);
            
            // Rechercher au clavier (Enter pour sélectionner le premier résultat)
            searchInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    const firstItem = document.querySelector('.lieu-item');
                    if (firstItem) {
                        firstItem.click();
                    }
                }
            };
        }
    }, 100);
}

function hideLieuModal() {
    const modal = document.getElementById('lieuModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

async function loadLieuxData() {
    try {
        console.log('🔄 Chargement des données de lieux...');
        
        // Charger les lieux existants depuis le vault
        const vault = adminInterface.fakeEnvironment.vault;
        const allFiles = vault.app.getAllFiles();
        
        // Filtrer les fichiers Lieu
        const lieuFiles = [];
        for (const file of allFiles) {
            const metadata = await vault.app.getMetadata(file);
            if (metadata && metadata.classe === 'Lieu') {
                lieuFiles.push({
                    nom: metadata.nom || file.name.replace('.md', ''),
                    type: metadata.type || 'Inconnu',
                    parent: metadata.parent || null,
                    code_postal: metadata.code_postal || null,
                    code_insee: metadata.code_insee || null,
                    population: metadata.population || null,
                    path: file.path,
                    existing: true
                });
            }
        }
        
        existingLieux = lieuFiles;
        console.log(`✅ ${existingLieux.length} lieux existants chargés`);
        
        // Charger les données depuis geo.json directement avec fetch
        const dataPath = 'data/geo.json';
        
        console.log(`📥 Chargement depuis: ${dataPath}`);
        try {
            const response = await fetch(dataPath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allLieuxData = await response.json();
            console.log(`✅ ${allLieuxData.length} lieux chargés depuis geo.json`);
        } catch (fetchError) {
            console.error('❌ Erreur lors du chargement de geo.json:', fetchError);
            throw fetchError;
        }
        
        console.log(`✅ Total: ${existingLieux.length} lieux existants, ${allLieuxData.length} lieux dans geo.json`);
        
    } catch (error) {
        console.error('❌ Erreur lors du chargement des lieux:', error);
        const container = document.getElementById('lieuResultsContainer');
        if (container) {
            container.innerHTML = '<div class="error">Erreur lors du chargement des lieux: ' + error.message + '</div>';
        }
    }
}

function searchLieux(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    const container = document.getElementById('lieuResultsContainer');
    
    console.log(`🔍 Recherche de: "${term}"`);
    
    if (!term) {
        container.innerHTML = `
            <div class="no-results">
                <h4>🔍 Recherche de lieux</h4>
                <p>Tapez le nom d'un lieu pour rechercher...</p>
            </div>
        `;
        return;
    }
    
    // Rechercher dans les lieux existants
    const existingMatches = existingLieux.filter(lieu =>
        lieu.nom.toLowerCase().includes(term) ||
        (lieu.type && lieu.type.toLowerCase().includes(term)) ||
        (lieu.code_postal && String(lieu.code_postal).includes(term)) ||
        (lieu.code_insee && String(lieu.code_insee).includes(term))
    );
    
    console.log(`📂 ${existingMatches.length} lieux existants trouvés`);
    
    // Rechercher dans les données geo.json (seulement ceux qui n'existent pas encore)
    const existingNames = new Set(existingLieux.map(l => l.nom));
    const dataMatches = allLieuxData.filter(lieu =>
        !existingNames.has(lieu.nom) &&
        (lieu.nom.toLowerCase().includes(term) ||
         (lieu.type && lieu.type.toLowerCase().includes(term)) ||
         (lieu.code_postal && String(lieu.code_postal).includes(term)) ||
         (lieu.code_insee && String(lieu.code_insee).includes(term)))
    );
    
    console.log(`✨ ${dataMatches.length} nouveaux lieux disponibles (depuis geo.json)`);
    
    // Construire le HTML des résultats
    let html = '';
    
    // Lieux existants
    if (existingMatches.length > 0) {
        html += '<div class="results-section">';
        html += `<div class="results-header">📂 Lieux existants (${existingMatches.length})</div>`;
        html += existingMatches.slice(0, 10).map(lieu => `
            <div class="lieu-item" onclick="openExistingLieu('${lieu.path.replace(/'/g, "\\'")}')">
                <div class="lieu-icon">📍</div>
                <div class="lieu-info">
                    <div class="lieu-name">${escapeHtml(lieu.nom)}</div>
                    <div class="lieu-meta">
                        <span class="lieu-badge type-${lieu.type}">${lieu.type}</span>
                        ${lieu.code_postal ? `<span>📮 ${lieu.code_postal}</span>` : ''}
                        ${lieu.population ? `<span>👥 ${lieu.population.toLocaleString()}</span>` : ''}
                    </div>
                </div>
                <div class="lieu-action">Ouvrir →</div>
            </div>
        `).join('');
        html += '</div>';
    }
    
    // Nouveaux lieux depuis geo.json
    if (dataMatches.length > 0) {
        html += '<div class="results-section">';
        html += `<div class="results-header">✨ Créer un nouveau lieu (${dataMatches.length})</div>`;
        html += dataMatches.slice(0, 10).map(lieu => `
            <div class="lieu-item create-item" onclick='createNewLieu(${JSON.stringify(lieu).replace(/'/g, "&#39;")})'>
                <div class="lieu-icon">➕</div>
                <div class="lieu-info">
                    <div class="lieu-name">Créer : ${escapeHtml(lieu.nom)}</div>
                    <div class="lieu-meta">
                        <span class="lieu-badge type-${lieu.type}">${lieu.type}</span>
                        ${lieu.parent ? `<span>📂 Parent: ${escapeHtml(lieu.parent)}</span>` : ''}
                        ${lieu.code_postal ? `<span>📮 ${lieu.code_postal}</span>` : ''}
                        ${lieu.population ? `<span>👥 ${lieu.population.toLocaleString()}</span>` : ''}
                    </div>
                </div>
                <div class="lieu-action">Créer →</div>
            </div>
        `).join('');
        html += '</div>';
    }
    
    // Aucun résultat
    if (existingMatches.length === 0 && dataMatches.length === 0) {
        html = `
            <div class="no-results">
                <h4>❌ Aucun résultat</h4>
                <p>Aucun lieu trouvé pour "${escapeHtml(term)}".</p>
                <p style="font-size: 0.9rem; margin-top: 10px; color: #999;">
                    Seuls les lieux présents dans geo.json peuvent être créés.
                </p>
            </div>
        `;
    }
    
    container.innerHTML = html;
    console.log(`✅ Affichage de ${existingMatches.length + dataMatches.length} résultats`);
}

async function openExistingLieu(filePath) {
    console.log('📂 Ouverture du lieu existant:', filePath);
    hideLieuModal();
    
    if (adminInterface) {
        await adminInterface.openFileFromPath(filePath);
    }
}

async function createNewLieu(lieuData) {
    console.log('✨ Création du nouveau lieu:', lieuData);
    
    try {
        // Afficher un indicateur de chargement
        const container = document.getElementById('lieuResultsContainer');
        container.innerHTML = '<div class="loading">Création du lieu en cours...</div>';
        
        // Créer le fichier via DynamicClassFactory
        const vault = adminInterface.fakeEnvironment.vault;
        const factory = vault.getDynamicClassFactory();
        
        if (!factory) {
            throw new Error('DynamicClassFactory non disponible');
        }
        
        // Passer allLieuxData pour éviter de recharger geo.json à chaque création de parent
        await factory.createInstanceFromDataObject('Lieu', lieuData, vault, allLieuxData);
        
        console.log('✅ Lieu créé avec succès');
        
        // Fermer le modal
        hideLieuModal();
        
        // Rafraîchir l'arborescence
        await adminInterface.refreshFileTree();
        
        // Afficher un message de succès
        adminInterface.showSuccess(`Lieu "${lieuData.nom}" créé avec succès !`);
        
        // Ouvrir le fichier créé
        setTimeout(async () => {
            const createdFile = adminInterface.fakeEnvironment.app.getAllFiles()
                .find(f => f.path.includes(lieuData.nom + '.md'));
            
            if (createdFile) {
                await adminInterface.loadFileContent(createdFile);
            }
        }, 500);
        
    } catch (error) {
        console.error('❌ Erreur lors de la création du lieu:', error);
        adminInterface.showError('Erreur lors de la création du lieu: ' + error.message);
        hideLieuModal();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== MODAL PERSONNE ==========
let existingPersonnes = [];

async function showPersonneModal() {
    const modal = document.getElementById('personneModal');
    if (!modal || !adminInterface || !adminInterface.fakeEnvironment) return;
    
    modal.classList.add('active');
    
    // Charger les données
    await loadPersonnesData();
    
    // Focus sur le champ de recherche
    setTimeout(() => {
        const searchInput = document.getElementById('personneSearchInput');
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
            
            // Afficher message initial
            document.getElementById('personneResultsContainer').innerHTML = `
                <div class="no-results">
                    <h4>🔍 Recherche de personnes</h4>
                    <p>Tapez le nom d'une personne ou cliquez sur "Créer une nouvelle personne"</p>
                </div>
            `;
            
            // Ajouter l'écouteur de recherche
            searchInput.oninput = (e) => searchPersonnes(e.target.value);
            
            // Rechercher au clavier (Enter pour sélectionner le premier résultat)
            searchInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    const firstItem = document.querySelector('.personne-item');
                    if (firstItem) {
                        firstItem.click();
                    }
                }
            };
        }
    }, 100);
}

function hidePersonneModal() {
    const modal = document.getElementById('personneModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

async function loadPersonnesData() {
    try {
        console.log('🔄 Chargement des données de personnes...');
        
        // Charger les personnes existantes depuis le vault
        const vault = adminInterface.fakeEnvironment.vault;
        const allFiles = vault.app.getAllFiles();
        
        // Filtrer les fichiers Personne
        const personneFiles = [];
        for (const file of allFiles) {
            const metadata = await vault.app.getMetadata(file);
            if (metadata && metadata.classe === 'Personne') {
                personneFiles.push({
                    nom: metadata.nom || file.name.replace('.md', ''),
                    prenom: metadata.prenom || '',
                    institution: metadata.institution || null,
                    poste: metadata.poste || null,
                    email: metadata.email || null,
                    statut: metadata.statut || null,
                    path: file.path,
                    existing: true
                });
            }
        }
        
        existingPersonnes = personneFiles;
        console.log(`✅ ${existingPersonnes.length} personnes existantes chargées`);
        
    } catch (error) {
        console.error('❌ Erreur lors du chargement des personnes:', error);
        const container = document.getElementById('personneResultsContainer');
        if (container) {
            container.innerHTML = '<div class="error">Erreur lors du chargement des personnes: ' + error.message + '</div>';
        }
    }
}

function searchPersonnes(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    const container = document.getElementById('personneResultsContainer');
    
    console.log(`🔍 Recherche de: "${term}"`);
    
    if (!term) {
        // Afficher le bouton pour créer une nouvelle personne
        container.innerHTML = `
            <div class="no-results">
                <h4>🔍 Recherche de personnes</h4>
                <p>Tapez le nom d'une personne pour rechercher...</p>
            </div>
            <div class="results-section">
                <div class="personne-item create-item" onclick="createNewPersonneFromSearch('')">
                    <div class="personne-icon">➕</div>
                    <div class="personne-info">
                        <div class="personne-name">Créer une nouvelle personne</div>
                        <div class="personne-meta">
                            <span>Cliquez pour créer avec le formulaire</span>
                        </div>
                    </div>
                    <div class="personne-action">Créer →</div>
                </div>
            </div>
        `;
        return;
    }
    
    // Rechercher dans les personnes existantes
    const existingMatches = existingPersonnes.filter(personne => {
        const fullName = `${personne.prenom} ${personne.nom}`.toLowerCase();
        return fullName.includes(term) ||
               personne.nom.toLowerCase().includes(term) ||
               (personne.prenom && personne.prenom.toLowerCase().includes(term)) ||
               (personne.email && personne.email.toLowerCase().includes(term)) ||
               (personne.institution && personne.institution.toLowerCase().includes(term));
    });
    
    console.log(`📂 ${existingMatches.length} personnes existantes trouvées`);
    
    // Construire le HTML des résultats
    let html = '';
    
    // Personnes existantes
    if (existingMatches.length > 0) {
        html += '<div class="results-section">';
        html += `<div class="results-header">📂 Personnes existantes (${existingMatches.length})</div>`;
        html += existingMatches.slice(0, 10).map(personne => {
            const fullName = personne.prenom ? `${personne.prenom} ${personne.nom}` : personne.nom;
            return `
                <div class="personne-item" onclick="openExistingPersonne('${personne.path.replace(/'/g, "\\'")}')">
                    <div class="personne-icon">👤</div>
                    <div class="personne-info">
                        <div class="personne-name">${escapeHtml(fullName)}</div>
                        <div class="personne-meta">
                            ${personne.institution ? `<span>🏢 ${escapeHtml(personne.institution)}</span>` : ''}
                            ${personne.poste ? `<span>💼 ${escapeHtml(personne.poste)}</span>` : ''}
                            ${personne.statut ? `<span class="personne-badge statut-${personne.statut}">${personne.statut}</span>` : ''}
                        </div>
                    </div>
                    <div class="personne-action">Ouvrir →</div>
                </div>
            `;
        }).join('');
        html += '</div>';
    }
    
    // Bouton pour créer une nouvelle personne avec le terme de recherche
    html += '<div class="results-section">';
    html += `<div class="results-header">✨ Créer une nouvelle personne</div>`;
    html += `
        <div class="personne-item create-item" onclick='createNewPersonneFromSearch("${escapeHtml(term)}")'>
            <div class="personne-icon">➕</div>
            <div class="personne-info">
                <div class="personne-name">Créer : ${escapeHtml(term)}</div>
                <div class="personne-meta">
                    <span>Cliquez pour créer avec le formulaire</span>
                </div>
            </div>
            <div class="personne-action">Créer →</div>
        </div>
    `;
    html += '</div>';
    
    container.innerHTML = html;
    console.log(`✅ Affichage de ${existingMatches.length} résultats`);
}

async function openExistingPersonne(filePath) {
    console.log('📂 Ouverture de la personne existante:', filePath);
    hidePersonneModal();
    
    if (adminInterface) {
        await adminInterface.openFileFromPath(filePath);
    }
}

async function createNewPersonneFromSearch(searchTerm) {
    console.log('✨ Création d\'une nouvelle personne avec le nom:', searchTerm);
    
    hidePersonneModal();
    
    // Créer directement le fichier via Vault.createFile pour lancer le populate
    if (adminInterface && adminInterface.fakeEnvironment) {
        try {
            const vault = adminInterface.fakeEnvironment.vault;
            const factory = adminInterface.fakeEnvironment.factory;
            
            if (!factory) {
                throw new Error('DynamicClassFactory non disponible');
            }
            
            // Récupérer la classe Personne
            const PersonneClass = await factory.getClass('Personne');
            console.log('📦 Classe récupérée:', PersonneClass?.name || 'undefined');
            
            // Créer le fichier avec le nom fourni (le populate va se lancer automatiquement)
            console.log(`🚀 Création du fichier "${searchTerm}" de classe "Personne"...`);
            const file = await vault.createFile(PersonneClass, searchTerm + '.md');
            
            if (file) {
                adminInterface.showSuccess(`Personne "${searchTerm}" créée avec succès !`);
                await adminInterface.refreshFileTree();
                
                // Attendre que toutes les opérations de déplacement et mise à jour soient terminées
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Récupérer le fichier à son emplacement final
                const finalFile = await adminInterface.fakeEnvironment.app.getFile(file.path);
                
                // Ouvrir le fichier créé
                if (finalFile) {
                    await adminInterface.loadFileContent(finalFile);
                } else {
                    console.warn('⚠️ Impossible de charger le fichier créé');
                }
            } else {
                // L'utilisateur a annulé durant le populate
                console.log('⚠️ Création annulée par l\'utilisateur');
            }
        } catch (error) {
            console.error('❌ Erreur lors de la création de la personne:', error);
            adminInterface.showError(`Erreur lors de la création : ${error.message}`);
        }
    }
}

// ========== FIN MODAL PERSONNE ==========

function showStatsModal() {
    if (adminInterface) {
        adminInterface.showStatsModal();
    }
}

function hideStatsModal() {
    if (adminInterface) {
        adminInterface.hideStatsModal();
    }
}