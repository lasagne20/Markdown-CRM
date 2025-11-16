interface ChartBarDisplayOptions {
    labels: string[];
    values: number[];
    colors?: string[]; // couleurs personnalisées pour chaque segment
}

export class ChartBarDisplay {
    container: HTMLElement;
    options: ChartBarDisplayOptions;

    constructor(options: ChartBarDisplayOptions) {
        this.options = options;
        this.container = document.createElement("div");
        this.container.className = "crm-bar-segments";
        this.getDisplay();
    }

    getDisplay() {
        const { labels, values, colors } = this.options;
        this.container.innerHTML = "";

        const total = values.reduce((a, b) => a + b, 0);

        const bar = document.createElement("div");
        bar.style.display = "flex";
        bar.style.width = "100%";
        bar.style.height = "40px";
        bar.style.borderRadius = "8px";
        bar.style.overflow = "hidden";
        bar.style.boxShadow = "0 1px 4px rgba(0,0,0,0.08)";

        labels.forEach((label, i) => {
            const value = values[i];
            if (value === 0) return; // Ne pas afficher si la valeur est zéro
            const percent = total > 0 ? (value / total) * 100 : 0;
            const color = colors?.[i] ?? `hsl(${(i * 60) % 360}, 70%, 60%)`;

            const segment = document.createElement("div");
            segment.style.flex = `${value} 0 0`;
            segment.style.background = color;
            segment.style.display = "flex";
            segment.style.alignItems = "center";
            segment.style.justifyContent = "center";
            segment.style.position = "relative";
            segment.style.height = "100%";
            segment.style.fontSize = "13px";
            segment.style.color = "#fff";
            segment.style.whiteSpace = "nowrap";
            segment.style.padding = "0 8px";
            segment.title = `${label}: ${value} (${percent.toFixed(1)}%)`;

            segment.innerHTML = `<span style="text-shadow:0 1px 2px #0008">${label} (${value}, ${percent.toFixed(1)}%)</span>`;

            bar.appendChild(segment);
        });

        this.container.appendChild(bar);
        return this.container;
    }
}
