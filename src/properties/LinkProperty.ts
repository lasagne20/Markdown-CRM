import { Property } from "./Property";
import { Vault } from "../vault/Vault";



export class LinkProperty extends Property{

  override type : string = "link";

  constructor(name: string, vault: Vault, args: { icon?: string, aliases?: string[], tooltip?: string} = { icon: "square-arrow-out-up-right" }) {
    super(name, vault, args);
  }

  override createIconContainer(update: (value: string) => Promise<void>) {
    const iconContainer = super.createIconContainer(update);
    iconContainer.style.cursor = "pointer";

    if (!this.static) {
      iconContainer.addEventListener("click", (event) => this.modifyField(event));
    }

    return iconContainer;
  }


    override validate(url: string) {
      // Guard against null/undefined (e.g. empty YAML field like "portable:")
      if (url == null || typeof url !== 'string') return '';

      let fixedUrl = url.trim();
      if (!fixedUrl) return '';

      // Add http:// prefix if no protocol present
      if (!/^https?:\/\//i.test(fixedUrl)) {
          fixedUrl = 'http://' + fixedUrl;
      }

      // Use the native URL parser — handles accents, ports, query strings,
      // fragments, percent-encoded characters, international paths, etc.
      try {
          const parsed = new URL(fixedUrl);
          // Hostname must have at least one non-empty label on each side of a dot,
          // e.g. reject '.com' (['', 'com']) or 'test.' (['test', ''])
          const isLocalhost = parsed.hostname === 'localhost';
          const labels = parsed.hostname.split('.');
          if (!isLocalhost && (labels.length < 2 || labels.some(l => l.length === 0))) {
              return '';
          }
          return fixedUrl;
      } catch {
          return '';
      }
    }


    override getPretty(value: string) {
      if (!value || typeof value !== 'string') return value;
      try {
        const urlObj = new URL(value);
        // Garde le domaine, puis les premiers segments du chemin si trop long
        let pretty = urlObj.hostname;
        if (urlObj.pathname && urlObj.pathname !== "/") {
          const segments = urlObj.pathname.split("/").filter(Boolean);
          if (segments.length > 2) {
            pretty += "/" + segments.slice(0, 2).join("/") + "/...";
          } else {
            pretty += urlObj.pathname;
          }
        }
        return pretty;
      } catch {
        // Si ce n'est pas une URL valide, retourne la valeur d'origine sans protocole
        return value.replace(/^https?:\/\//, "");
      }
    }

    // Fonction pour créer le lien de l'field
    override createFieldLink(value: string) : any {
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