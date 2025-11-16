// Component and MarkdownRenderer removed - not available in AppShim

interface NumberDisplayOptions {
    value: number; // valeur à afficher (0-100)
    unit?: string; // unité à afficher (ex: %)
    label?: string; // label sous le rond
    size?: number; // taille du rond en px (défaut: 64)
    color?: string; // couleur de remplissage (défaut: var(--interactive-accent))
    fillLevel?: number; // niveau de remplissage (0-1), si défini, remplace value pour le remplissage
}

export class NumberDisplay {
    container: HTMLElement;
    options: NumberDisplayOptions;

    constructor(options: NumberDisplayOptions) {
        this.options = {
            size: 64,
            color: "var(--interactive-accent)",
            ...options,
        };
        this.container = document.createElement("div");
        this.container.className = "crm-number-display";
        this. getDisplay();
    }

    getDisplay() {
        const { value, unit, label, size, color } = this.options;
        this.container.empty();

        // Agrandir la taille par défaut si non spécifiée
        const displaySize = size ?? 96; // plus grand que 64
        const svgNS = "http://www.w3.org/2000/svg";
        const strokeWidth = 10; // plus épais
        const radius = (displaySize / 2) - (strokeWidth / 2) - 2;
        const circumference = 2 * Math.PI * radius;
        let fill = typeof this.options.fillLevel === "number"
            ? Math.max(0, Math.min(1, this.options.fillLevel))
            : Math.max(0, Math.min(100, value)) / 100;
        const offset = circumference * (1 - fill);

        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttr("width", displaySize);
        svg.setAttr("height", displaySize);
        svg.setAttr("viewBox", `0 0 ${displaySize} ${displaySize}`);

        // Fond du cercle
        const bgCircle = document.createElementNS(svgNS, "circle");
        bgCircle.setAttr("cx", displaySize / 2);
        bgCircle.setAttr("cy", displaySize / 2);
        bgCircle.setAttr("r", radius);
        bgCircle.setAttr("stroke", "var(--background-modifier-border)");
        bgCircle.setAttr("stroke-width", `${strokeWidth}`);
        bgCircle.setAttr("fill", "none");
        svg.appendChild(bgCircle);

        // Cercle de progression
        const fgCircle = document.createElementNS(svgNS, "circle");
        fgCircle.setAttr("cx", displaySize / 2);
        fgCircle.setAttr("cy", displaySize / 2);
        fgCircle.setAttr("r", radius);
        fgCircle.setAttr("stroke", color!);
        fgCircle.setAttr("stroke-width", `${strokeWidth}`);
        fgCircle.setAttr("fill", "none");
        fgCircle.setAttr("stroke-dasharray", `${circumference}`);
        fgCircle.setAttr("stroke-dashoffset", `${offset}`);
        fgCircle.setAttr("style", "transition: stroke-dashoffset 0.5s;");
        fgCircle.setAttr("stroke-linecap", "round");
        svg.appendChild(fgCircle);

        // Texte au centre, bien centré verticalement et horizontalement
        const text = document.createElementNS(svgNS, "text");
        text.setAttr("x", displaySize / 2);
        text.setAttr("y", displaySize / 2);
        text.setAttr("text-anchor", "middle");
        text.setAttr("dominant-baseline", "middle");
        text.setAttr("font-size", `${displaySize * 0.3}px`); // taille du texte adapté
        text.setAttr("fill", "var(--text-normal)");
        text.setAttr("font-weight", "bold"); // Met le texte en gras
        text.textContent = `${value}${unit ?? ""}`;
        svg.appendChild(text);

        this.container.appendChild(svg);

        // Label en dessous
        if (label) {
            const labelDiv = this.container.createDiv("crm-number-display-label");
            labelDiv.innerHTML = label;
            labelDiv.setAttr(
                "style",
                `text-align:center;font-size:${displaySize * 0.3}px;color:var(--text-muted);margin-top:0.5em;`
            );
        }
        return this.container;
    }
}
