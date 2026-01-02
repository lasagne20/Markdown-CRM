// @ts-nocheck
// Component and MarkdownRenderer removed - not available in AppShim

interface NumberDisplayOptions {
    value: number; // valeur à afficher (0-100)
    unit?: string; // unité à afficher (ex: %)
    label?: string; // label sous le rond
    size?: number; // taille du rond en px (défaut: 64)
    color?: string; // couleur de remplissage (défaut: var(--interactive-accent))
    max?: number; // valeur maximale pour le calcul du niveau de remplissage (value/max = fill level)
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
        this.getDisplay();
    }

    getDisplay() {
        const { value, unit, label, size, max } = this.options;
        const color = this.options.color || "var(--interactive-accent)";
        this.container.innerHTML = '';

        // Agrandir la taille par défaut si non spécifiée
        const displaySize = size ?? 96; // plus grand que 64
        const svgNS = "http://www.w3.org/2000/svg";
        const strokeWidth = 10; // plus épais
        const radius = (displaySize / 2) - (strokeWidth / 2) - 2;
        const circumference = 2 * Math.PI * radius;
        
        // Calculer le niveau de remplissage en fonction de max si défini
        let fill: number;
        if (typeof max === "number" && max > 0) {
            fill = Math.max(0, Math.min(1, value / max));
        } else {
            // Sinon, traiter value comme un pourcentage (0-100)
            fill = Math.max(0, Math.min(100, value)) / 100;
        }
        
        const offset = circumference * (1 - fill);

        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", displaySize.toString());
        svg.setAttribute("height", displaySize.toString());
        svg.setAttribute("viewBox", `0 0 ${displaySize} ${displaySize}`);

        // Fond du cercle
        const bgCircle = document.createElementNS(svgNS, "circle");
        bgCircle.setAttribute("cx", (displaySize / 2).toString());
        bgCircle.setAttribute("cy", (displaySize / 2).toString());
        bgCircle.setAttribute("r", radius.toString());
        bgCircle.setAttribute("stroke", "var(--background-modifier-border)");
        bgCircle.setAttribute("stroke-width", `${strokeWidth}`);
        bgCircle.setAttribute("fill", "none");
        svg.appendChild(bgCircle);

        // Cercle de progression
        const fgCircle = document.createElementNS(svgNS, "circle");
        fgCircle.setAttribute("cx", (displaySize / 2).toString());
        fgCircle.setAttribute("cy", (displaySize / 2).toString());
        fgCircle.setAttribute("r", radius.toString());
        fgCircle.setAttribute("stroke", color!);
        fgCircle.setAttribute("stroke-width", `${strokeWidth}`);
        fgCircle.setAttribute("fill", "none");
        fgCircle.setAttribute("stroke-dasharray", `${circumference}`);
        fgCircle.setAttribute("stroke-dashoffset", `${offset}`);
        fgCircle.setAttribute("style", "transition: stroke-dashoffset 0.5s; transform: rotate(-90deg); transform-origin: center;");
        fgCircle.setAttribute("stroke-linecap", "round");
        svg.appendChild(fgCircle);

        // Texte au centre, bien centré verticalement et horizontalement
        const text = document.createElementNS(svgNS, "text");
        text.setAttribute("x", (displaySize / 2).toString());
        text.setAttribute("y", (displaySize / 2).toString());
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "middle");
        text.setAttribute("font-size", `${displaySize * 0.3}px`); // taille du texte adapté
        text.setAttribute("fill", "var(--text-normal)");
        text.setAttribute("font-weight", "bold"); // Met le texte en gras
        text.textContent = `${value}${unit ?? ""}`;
        svg.appendChild(text);

        this.container.appendChild(svg);

        // Label en dessous
        if (label) {
            const labelDiv = document.createElement('div');
            labelDiv.className = 'crm-number-display-label';
            this.container.appendChild(labelDiv);
            labelDiv.innerHTML = label;
            labelDiv.setAttribute(
                "style",
                `text-align:center;font-size:${displaySize * 0.3}px;color:var(--text-muted);margin-top:0.5em;`
            );
        }
        return this.container;
    }
}
