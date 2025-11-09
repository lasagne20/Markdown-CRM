import { FileProperty } from './FileProperty.js';
export class MediaProperty extends FileProperty {
    // Used for property with a single file
    constructor(name, vault, args = { icon: "media", create: "" }) {
        super(name, vault, [], args);
        this.type = "media";
        this.createOption = args.create || "";
        this.display = args.display;
    }
    async getDisplay(file, args = { staticMode: false, title: "", display: "name" }) {
        this.display = args.display || "name";
        if (!(await this.read(file)) && this.createOption) {
            // If the file is not set, we return a container with a button to create a new file
            const container = document.createElement("div");
            container.classList.add("create-freecad-container");
            const button = document.createElement("button");
            button.classList.add("mod-cta");
            if (args.createOptions && args.createOptions.createFunction) {
                button.textContent = args.createOptions.title || "Créer un fichier";
                button.addEventListener("click", async () => {
                    if (args.createOptions && typeof args.createOptions.createFunction === "function") {
                        let path = await args.createOptions.createFunction();
                        await file.updateMetadata(this.name, `[[${path}|${path.split("/").pop()}]]`);
                        setTimeout(() => {
                            // On attend 2 secondes pour que le fichier soit créé et déplacer dans le bon dossier avant de l'ouvrir
                            path = file.vault.getMediaFromLink(path)?.path || path;
                            const vaultPath = file.vault.app.vault.adapter.basePath || file.vault.adapter.getBasePath?.();
                            const absoluteMediaPath = vaultPath ? require('path').join(vaultPath, path) : path;
                            this.vault.app.open(absoluteMediaPath);
                        }, 1000);
                        await file.check();
                    }
                });
                container.appendChild(button);
                return container;
            }
            // Return the container even if no createOptions provided
            return container;
        }
        let value = await this.read(file);
        let container = this.fillDisplay(value, async (value) => await file.updateMetadata(this.name, value), file);
        if (args.updateOptions && args.updateOptions.updateFunction) {
            const refreshButton = document.createElement("button");
            refreshButton.classList.add("mod-cta");
            this.vault.app.setIcon(refreshButton, args.updateOptions.icon || "refresh-ccw");
            refreshButton.addEventListener("click", async () => {
                if (args.updateOptions && typeof args.updateOptions.updateFunction === "function") {
                    let path = await args.updateOptions.updateFunction();
                    await file.updateMetadata(this.name, `[[${path}|${path.split("/").pop()}]]`);
                }
            });
            container.appendChild(refreshButton);
        }
        return container;
    }
    getLink(value, vault) {
        if (!value) {
            return "";
        }
        return this.vault.readLinkFile(value) || "";
    }
    openFile(value) {
        // Get the absolute path to the file in the vault
        let mediaPath = this.vault.readLinkFile(value, true);
        const absoluteMediaPath = this.vault.getPath() ? require('path').join(this.vault.getPath(), mediaPath) : mediaPath;
        this.vault.app.open(absoluteMediaPath);
    }
    fillDisplay(value, update, file = null) {
        if (value && value.startsWith("[[") && value.endsWith("]]")) {
            if (this.display === "embed") {
                // If it is an image : 
                let mediaPath = this.vault.readLinkFile(value, true);
                let container = document.createElement("div");
                if (mediaPath) {
                    const ext = mediaPath.toLowerCase().split('.').pop();
                    if (ext && ["png", "jpg", "jpeg", "gif"].includes(ext)) {
                        container = this.createEmbedImageContainer(mediaPath, update);
                    }
                    else if (ext && ["glb", "gltf", "fcstd"].includes(ext)) {
                        // Pour les fichiers 3D, créer un message pour utiliser 3DModelProperty
                        container = document.createElement("div");
                        container.classList.add("embed-container");
                        const messageDiv = document.createElement("div");
                        messageDiv.textContent = "Fichier 3D détecté. Utilisez 3DModelProperty pour l'affichage 3D.";
                        messageDiv.style.textAlign = "center";
                        messageDiv.style.margin = "20px";
                        messageDiv.style.padding = "10px";
                        messageDiv.style.backgroundColor = "#f0f0f0";
                        messageDiv.style.border = "1px solid #ccc";
                        messageDiv.style.borderRadius = "5px";
                        container.appendChild(messageDiv);
                    }
                    container.style.position = "relative";
                    container.appendChild(this.createEmbedOpenContainer(update, value));
                    container.appendChild(this.createEmbedEditContainer(update, value));
                }
                return container;
            }
            else if (this.display === "icon") {
                const container = document.createElement("div");
                container.classList.add("metadata-field", "media-field");
                const iconDiv = document.createElement("div");
                iconDiv.classList.add("big-icon-div");
                this.vault.app.setIcon(iconDiv, this.getFileIcon(value));
                const fileName = document.createElement("div");
                fileName.classList.add("media-field-file-name");
                fileName.textContent = this.vault.readLinkFile(value, true) || "Fichier non trouvé";
                container.appendChild(iconDiv);
                container.appendChild(fileName);
                container.appendChild(iconDiv);
                container.appendChild(fileName);
                // 🔗 Ouvrir le fichier au clic (sur tout le conteneur)
                container.style.cursor = "pointer";
                container.addEventListener("click", () => {
                    this.openFile(value);
                });
                return container;
            }
            else if (this.display === "button") {
                const container = document.createElement("div");
                container.classList.add("create-freecad-container");
                const button = document.createElement("button");
                button.classList.add("mod-cta");
                button.textContent = this.title || "Ouvrir le fichier";
                button.addEventListener("click", () => {
                    this.openFile(value);
                });
                container.appendChild(button);
                return container;
            }
        }
        return super.fillDisplay(value, update);
    }
    getFileIcon(value) {
        if (value && value.startsWith("[[") && value.endsWith("]]")) {
            const mediaPath = this.vault.readLinkFile(value, true);
            if (mediaPath) {
                const ext = mediaPath.toLowerCase().split('.').pop();
                if (ext && ["png", "jpg", "jpeg", "gif"].includes(ext)) {
                    return "image";
                }
                else if (ext && ["glb", "gltf", "fcstd"].includes(ext)) {
                    return "cube3d";
                }
                else if (ext && ["pdf", "docx", "txt"].includes(ext)) {
                    return "file";
                }
                else if (ext && ["mp4", "webm", "ogg"].includes(ext)) {
                    return "video";
                }
                else if (ext && ["mp3", "wav"].includes(ext)) {
                    return "audio";
                }
                else if (ext && ["zip", "rar"].includes(ext)) {
                    return "archive";
                }
                else if (ext && ["sla"].includes(ext)) {
                    return "square-pen";
                }
                else if (ext && ["lbrn2"].includes(ext)) {
                    return "flame";
                }
            }
        }
        return this.icon || "media";
    }
    createEmbedEditContainer(update, value) {
        const container = document.createElement("div");
        container.classList.add("embed-edit-container");
        container.style.position = "absolute"; // Position the icon container absolutely
        container.style.top = "5px"; // Adjust the top position
        container.style.left = "5px"; // Adjust the right position
        container.style.cursor = "pointer"; // Change cursor to pointer
        const iconContainer = document.createElement("div");
        iconContainer.classList.add("icon-container");
        const icon = document.createElement("i");
        this.vault.app.setIcon(icon, "link");
        icon.addEventListener("click", async (event) => await this.handleIconClick(update, event));
        iconContainer.appendChild(icon);
        container.appendChild(iconContainer);
        return container;
    }
    createEmbedOpenContainer(update, value) {
        const container = document.createElement("div");
        container.classList.add("embed-open-container");
        container.style.position = "absolute"; // Position the icon container absolutely
        container.style.top = "5px"; // Adjust the top position
        container.style.right = "5px"; // Adjust the right position
        container.style.cursor = "pointer"; // Change cursor to pointer
        const iconContainer = document.createElement("div");
        iconContainer.classList.add("icon-container");
        const icon = document.createElement("i");
        this.vault.app.setIcon(icon, "external-link");
        icon.addEventListener("click", (event) => {
            event.preventDefault();
            if (value) {
                this.openFile(value);
            }
            else {
                this.vault.app.sendNotice("Unable to generate link for the media.");
            }
        });
        iconContainer.appendChild(icon);
        container.appendChild(iconContainer);
        return container;
    }
    createEmbedImageContainer(mediaPath, update) {
        const container = document.createElement("div");
        container.classList.add("metadata-field", "media-field", "embed-container");
        const embed = document.createElement("img");
        embed.src = this.vault.app.getAbsolutePath(mediaPath);
        embed.alt = "Media";
        embed.classList.add("embed-media");
        const iconContainer = document.createElement("div");
        iconContainer.classList.add("icon-container");
        const icon = document.createElement("i");
        icon.classList.add("icon", this.icon);
        icon.addEventListener("click", async (event) => await this.handleIconClick(update, event));
        iconContainer.appendChild(icon);
        container.appendChild(embed);
        container.appendChild(iconContainer);
        return container;
    }
    // Fonction pour gérer le clic sur l'icône
    async handleIconClick(update, event) {
        let selectedFile = await this.vault.app.selectMedia(this.vault, "Choisissez un document");
        if (selectedFile) {
            await update(`[[${selectedFile.path}|${selectedFile.name}]]`);
            const link = event.target.closest('.metadata-field')?.querySelector('.field-link');
            if (link) {
                link.textContent = selectedFile.name;
            }
        }
    }
    // Override the createFieldContainerContent function to truncate the link
    createFieldContainerContent(update, value) {
        const fieldContainer = document.createElement("div");
        fieldContainer.classList.add("field-container");
        const currentField = this.getLink(value);
        const link = document.createElement("a");
        link.href = "#";
        const truncatedField = currentField?.length > 12 ? currentField.slice(0, 12) + "..." : currentField;
        link.textContent = truncatedField || "";
        link.setAttribute("full-text", currentField || "");
        link.addEventListener("click", async (event) => await this.modifyField(event));
        link.classList.add("field-link");
        link.style.display = "block";
        fieldContainer.appendChild(link);
        return fieldContainer;
    }
    // Fonction pour gérer le clic sur l'icône
    async modifyField(event) {
        const link = event.target.closest('.metadata-field')?.querySelector('.field-link');
        let currentField = link.getAttribute("full-text");
        if (!currentField) {
            return;
        }
        event.preventDefault();
        const file = await this.vault.app.getFile(currentField);
        if (file) {
            await this.vault.app.open(file.path);
        }
        else {
            this.vault.app.sendNotice(`Le fichier ${currentField} n'existe pas`);
        }
    }
}
