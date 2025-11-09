import { LinkProperty } from './LinkProperty.js';
export class FileProperty extends LinkProperty {
    // Used for property with a single file
    constructor(name, vault, classes, args = {}) {
        super(name, vault, args);
        this.type = "file";
        this.classes = classes;
    }
    getClasses() {
        return this.classes;
    }
    getPretty(value) {
        return this.vault.readLinkFile(value);
    }
    async getClasse(file) {
        let link = await this.read(file);
        if (link) {
            let classe = await this.vault.getFromLink(link);
            if (classe) {
                return classe;
            }
        }
        return undefined;
    }
    validate(value) {
        // Expression régulière pour détecter les liens Obsidian au format [[...]]
        const regex = /\[\[([^\]]+)\]\]/;
        const match = value.match(regex);
        if (match && match[1]) {
            return `[[${match[1]}]]`;
        }
        return "";
    }
    getLink(value, vault) {
        if (vault) {
            this.vault = vault;
        }
        const vaultName = this.vault.getName();
        const filePath = this.vault.readLinkFile(value, true);
        // If readLinkFile returned a path and the file exists in the vault, use it.
        if (filePath) {
            return `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(filePath)}`;
        }
        // Fallback: extract the name only from the link
        const nameOnly = this.vault.readLinkFile(value);
        return `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(nameOnly)}`;
    }
    createIconContainer(update) {
        const iconContainer = document.createElement("div");
        iconContainer.classList.add("icon-container");
        const icon = document.createElement("div");
        this.vault.app.setIcon(icon, this.icon);
        iconContainer.appendChild(icon);
        if (!this.static) {
            icon.style.cursor = "pointer";
            iconContainer.addEventListener("click", async (event) => await this.handleIconClick(update, event));
        }
        return iconContainer;
    }
    // Fonction pour gérer le clic sur l'icône
    async handleIconClick(update, event) {
        let selectedFileObj = await this.vault.app.selectFile(this.vault, this.classes, { hint: "Choisissez un fichier " + this.getClasses().join(" ou ") });
        if (selectedFileObj) {
            const selectedFile = selectedFileObj.getLink();
            await update(selectedFile);
            const link = event.target.closest('.metadata-field')?.querySelector('.field-link');
            if (link) {
                link.textContent = selectedFile.slice(2, -2);
            }
        }
    }
    // Fonction pour gérer le clic sur l'icône
    async modifyField(event) {
        const link = event.target.closest('.metadata-field')?.querySelector('.field-link');
        let currentField = link.textContent;
        if (!currentField) {
            return;
        }
        event.preventDefault();
        const classe = await this.vault.getFromLink(currentField);
        if (classe) {
            let path = classe.getPath();
            if (path) {
                await this.vault.app.open(path);
            }
        }
        else {
            console.error(`Le fichier ${currentField}.md n'existe pas`); // TODO: Use Notice when available
        }
    }
    // Fonction pour créer le conteneur principal pour l'field
    createFieldContainerContent(update, value) {
        const fieldContainer = document.createElement("div");
        fieldContainer.classList.add("field-container");
        const currentField = this.getPretty(value);
        const link = document.createElement("a");
        link.href = this.getLink(value);
        link.textContent = currentField || "";
        link.classList.add("field-link");
        link.style.display = "block";
        fieldContainer.appendChild(link);
        return fieldContainer;
    }
}
