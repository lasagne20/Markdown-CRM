import { Property } from './Property.js';
export class LinkProperty extends Property {
    constructor(name, vault, args = { icon: "square-arrow-out-up-right" }) {
        super(name, vault, args);
        this.type = "link";
    }
    createIconContainer(update) {
        const iconContainer = super.createIconContainer(update);
        iconContainer.style.cursor = "pointer";
        if (!this.static) {
            console.log("Adding click event to iconContainer for property:", this.name);
            iconContainer.addEventListener("click", (event) => this.modifyField(event));
        }
        return iconContainer;
    }
    validate(url) {
        // Ajoute le préfixe "http://" si l'URL ne commence pas par http:// ou https://
        let fixedUrl = url.trim();
        // Si le lien ne commence pas par http:// ou https://, ajoute "http://"
        if (!/^https?:\/\//i.test(fixedUrl)) {
            fixedUrl = "http://" + fixedUrl;
        }
        const urlRegex = /^(https?:\/\/)?([a-zA-Z0-9_-]+\.)+[a-zA-Z]{2,6}(\/[a-zA-Z0-9_-]+)*\/?$/;
        if (!urlRegex.test(fixedUrl)) {
            return "";
        }
        return fixedUrl;
    }
    getPretty(value) {
        if (!value)
            return value;
        try {
            const urlObj = new URL(value);
            // Garde le domaine, puis les premiers segments du chemin si trop long
            let pretty = urlObj.hostname;
            if (urlObj.pathname && urlObj.pathname !== "/") {
                const segments = urlObj.pathname.split("/").filter(Boolean);
                if (segments.length > 2) {
                    pretty += "/" + segments.slice(0, 2).join("/") + "/...";
                }
                else {
                    pretty += urlObj.pathname;
                }
            }
            return pretty;
        }
        catch {
            // Si ce n'est pas une URL valide, retourne la valeur d'origine sans protocole
            return value.replace(/^https?:\/\//, "");
        }
    }
    // Fonction pour créer le lien de l'field
    createFieldLink(value) {
        const link = document.createElement("a");
        link.href = this.getLink(value);
        link.textContent = this.getPretty(value) || "";
        link.classList.add("field-link");
        link.oncontextmenu = (event) => {
            event.preventDefault();
            const value = link.textContent;
            if (value) {
                navigator.clipboard.writeText(value).then(() => {
                    this.vault.app.sendNotice("Lien copié dans le presse-papiers");
                });
            }
        };
        return link;
    }
}
