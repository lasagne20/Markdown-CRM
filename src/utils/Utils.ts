export function addFold(parentContainer: HTMLElement, childContainer: HTMLElement, app?: any) {
    let isFolded = false;
    const arrow = document.createElement("span");
    arrow.style.cursor = "pointer";
    arrow.style.marginRight = "5px";
    parentContainer.insertBefore(arrow, parentContainer.firstChild);

    const updateArrow = () => {
        arrow.innerHTML = '';
        const iconName = isFolded ? 'chevron-right' : 'chevron-down';
        if (app?.setIcon) {
            app.setIcon(arrow, iconName);
        }
    };

    updateArrow();

    parentContainer.addEventListener("click", () => {
        isFolded = !isFolded;
        childContainer.style.display = isFolded ? "none" : "block";
        updateArrow();
    });
}

export function addButton(buttonText: string, callback: () => void) {
    const button = document.createElement("button");
    button.classList.add("mod-cta");
    button.textContent = buttonText;
    button.addEventListener("click", (e) => {
        e.stopPropagation();
        callback();
    });
    return button;
}

/**
 * Generates a UUID v4 identifier
 * Compatible with both browser and Node.js environments
 * @returns A unique identifier in the format xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
/**
 * Comparaison canonique de valeurs de propriétés.
 *
 * Les widgets ré-envoient parfois des formes différentes du "vide" :
 * undefined, null, "" ou clé absente. Sémantiquement identiques, ces
 * formes DIFFERENT en JSON brut - deux chaînes d'update qui alternent
 * undefined et "" passent alors toutes les gardes no-op et s'écrivent
 * l'une l'autre en boucle infinie. La forme canonique neutralise les
 * clés vides : absent ≡ null ≡ "".
 */
export function canonicalizeValue(value: any): any {
    if (value === undefined || value === null || value === '') {
        return null;
    }
    if (Array.isArray(value)) {
        return value.map(canonicalizeValue);
    }
    if (typeof value === 'object') {
        const out: Record<string, any> = {};
        for (const key of Object.keys(value)) {
            const canonical = canonicalizeValue(value[key]);
            if (canonical !== null) {
                out[key] = canonical;
            }
        }
        return out;
    }
    return value;
}

export function jsonValuesEqual(a: any, b: any): boolean {
    return JSON.stringify(canonicalizeValue(a)) === JSON.stringify(canonicalizeValue(b));
}

/**
 * Dictionnaire des valeurs par défaut nommées, résolues depuis les réglages
 * du vault. Étend le motif historique "personalName".
 *
 *   personalName      -> nom brut (ex: "Léo")
 *   defaultCommercial -> wikilink du commercial par défaut (ex: "[[Léo]]")
 *   defaultAnimateur  -> wikilink de l'animateur par défaut
 *
 * Toute autre valeur est retournée inchangée (valeur littérale).
 * Un réglage absent donne undefined (jamais le nom du réglage en littéral).
 */
export function resolveNamedDefaultValue(vault: any, value: any): any {
    if (typeof value !== 'string') {
        return value;
    }
    if (value === 'personalName') {
        return vault?.getPersonalName?.() ?? vault?.settings?.personalName;
    }
    if (value === 'defaultCommercial') {
        const name = vault?.settings?.defaultCommercial;
        return name ? `[[${name}]]` : undefined;
    }
    if (value === 'defaultAnimateur') {
        const name = vault?.settings?.defaultAnimateur;
        return name ? `[[${name}]]` : undefined;
    }
    return value;
}
