// @ts-nocheck
// Component and MarkdownRenderer removed - not available in AppShim

import { NumberDisplayItem } from '../Config/interfaces';
import { Vault } from '../vault/Vault';
import { Classe } from '../vault/Classe';
import { PropertyNavigator } from '../utils/PropertyNavigator';

interface NumberDisplayOptions {
    value: number; // valeur à afficher (0-100)
    unit?: string; // unité à afficher (ex: %)
    label?: string; // label sous le rond
    size?: number; // taille du rond en px (défaut: 64)
    color?: string; // couleur de remplissage (défaut: var(--interactive-accent))
    max?: number; // valeur maximale pour le calcul du niveau de remplissage (value/max = fill level)
    display?: 'ring' | 'plain' | 'bar'; // variante visuelle: ring (défaut), plain (chiffre seul), bar (barre horizontale)
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

    /**
     * Create a NumberDisplay from a configuration item with automatic calculation
     */
    static async fromConfig(
        item: NumberDisplayItem,
        vault: Vault,
        context: Classe,
        getFilesForTable: (source: any, context?: Classe) => Promise<Classe[]>
    ): Promise<NumberDisplay> {
        // Get files based on source
        const files = await getFilesForTable(item.source, context);
        
        // Calculate or get max value first (needed for percent formula)
        let maxValue: number | undefined = undefined;
        if (item.max !== undefined) {
            if (typeof item.max === 'number') {
                // max is a fixed number
                maxValue = item.max;
            } else if (typeof item.max === 'string') {
                // max is a property name - get it from current context
                if (context && context.getPropertyValue) {
                    // Classe.getPropertyValue() now handles all complex properties automatically
                    maxValue = await context.getPropertyValue(item.max, context);
                    // Convert to number if needed
                    maxValue = typeof maxValue === 'number' ? maxValue : (maxValue != null ? parseFloat(maxValue) : undefined) || undefined;
                }
            } else {
                // max is a MaxCalculationConfig - calculate it
                const maxFiles = await getFilesForTable(item.max.source, context);
                maxValue = await NumberDisplay.calculateValue(maxFiles, item.max.formula, item.max.propertyName, undefined, context, vault);
            }
        }
        
        // Calculate value using formula (pass maxValue for percent formula)
        const value = await NumberDisplay.calculateValue(files, item.formula, item.propertyName, maxValue, context, vault);
        
        return new NumberDisplay({
            value: value,
            // Default unit for percent formula
            unit: item.unit ?? (item.formula === 'percent' ? '%' : undefined),
            label: item.label,
            size: item.size,
            color: item.color,
            // The ring fill: percent values are already 0-100, so the fill must
            // stay in percentage mode (max 100). Passing the raw maxValue here
            // (e.g. the partnership amount) would make the ring nearly empty.
            // For other formulas, pass the resolved max so the fill is value/max
            // instead of falling back to value/100.
            max: item.formula === 'percent' ? 100 : maxValue,
            display: item.display
        });
    }

    /**
     * Calculate number value from files using formula
     */
    private static async calculateValue(
        files: Classe[],
        formula: string,
        propertyName?: string,
        maxValue?: number,
        context?: Classe,
        vault?: Vault
    ): Promise<number> {
        // If count without propertyName, just count files
        if (formula === 'count' && !propertyName) {
            return files.length;
        }
        
        // Special case for percent: requires both propertyName and maxValue
        if (formula === 'percent') {
            if (!propertyName || maxValue === undefined) {
                console.warn('percent formula requires both propertyName and max value');
                return 0;
            }
        } else if (!propertyName) {
            return 0; // Can't calculate without property for non-count formulas
        }
        
        // Support multiple properties separated by commas (e.g., "financeurs.financeur.parent,clients.client.parent")
        const propertyNames = propertyName.split(',').map(p => p.trim());
        
        // Get all property values
        const values: any[] = [];
        
        for (const singlePropertyName of propertyNames) {
            for (const file of files) {
                try {
                    let value: any;
                    if (formula === 'count' || formula === 'countDistinct') {
                        // Collect mode: gather ALL values along the path (flattened
                        // arrays, 'parent' keyword, multi-element arrays) instead of
                        // the standard single-value navigation which discards
                        // multi-element arrays. Filter expressions already return
                        // arrays of values - keep the standard path for them.
                        const fileVault = vault || (file as any).getVault?.();
                        if (fileVault && !singlePropertyName.includes('.filter(')) {
                            const navigator = new PropertyNavigator(fileVault, context);
                            value = await navigator.collectNestedProperty(file, singlePropertyName);
                        } else {
                            value = await file.getPropertyValue(singlePropertyName, context);
                        }
                    } else {
                        // Classe.getPropertyValue() handles all property navigation including filters
                        // Pass context for $current support in filter expressions
                        value = await file.getPropertyValue(singlePropertyName, context);
                    }

                    // FormulaProperty (and similar) compute their value on read() and
                    // are not persisted to the frontmatter unless write=true. When the
                    // metadata has nothing for a simple property, fall back to reading
                    // the property itself so formulas contribute to the calculation.
                    if ((value === null || value === undefined || (Array.isArray(value) && value.length === 0))
                        && !singlePropertyName.includes('.')
                        && !singlePropertyName.includes('[')
                        && typeof (file as any).getProperty === 'function') {
                        const prop = (file as any).getProperty(singlePropertyName);
                        if (prop && typeof prop.read === 'function') {
                            try {
                                value = await prop.read(file);
                            } catch (error) {
                                console.warn(`Error reading property ${singlePropertyName} from file:`, error);
                            }
                        }
                    }

                    // Handle arrays (from filter expressions like "partenariats.filter().montant")
                    if (Array.isArray(value)) {
                        for (const item of value) {
                            // For count/countDistinct, keep all types; for numeric formulas, convert to numbers
                            if (formula === 'count' || formula === 'countDistinct') {
                                if (item !== null && item !== undefined) {
                                    values.push(item);
                                }
                            } else {
                                const numValue = typeof item === 'number' ? item : parseFloat(item) || 0;
                                if (!isNaN(numValue)) {
                                    values.push(numValue);
                                }
                            }
                        }
                    } else {
                        // For count/countDistinct, keep all types; for numeric formulas, convert to numbers
                        if (formula === 'count' || formula === 'countDistinct') {
                            if (value !== null && value !== undefined) {
                                values.push(value);
                            }
                        } else {
                            const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
                            if (!isNaN(numValue)) {
                                values.push(numValue);
                            }
                        }
                    }
                } catch (error) {
                    console.warn(`Error getting property ${singlePropertyName} from file:`, error);
                }
            }
        }
        
        // Apply formula
        switch (formula) {
            case 'count':
                return values.length; // Count the number of values, not files
            case 'countDistinct':
                // Count unique values only
                const uniqueValues = new Set(values);
                return uniqueValues.size;
            case 'sum':
                return values.reduce((sum, val) => sum + val, 0);
            case 'average':
            case 'avg':
                return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
            case 'min':
                return values.length > 0 ? Math.min(...values) : 0;
            case 'max':
                return values.length > 0 ? Math.max(...values) : 0;
            case 'percent':
                // Calculate percentage: (sum / max) * 100
                if (maxValue === undefined || maxValue === 0) {
                    return 0;
                }
                const sum = values.reduce((sum, val) => sum + val, 0);
                return Math.round((sum / maxValue) * 100);
            default:
                console.warn(`Unknown formula: ${formula}`);
                return 0;
        }
    }

    /**
     * Calculate the fill level (0-1) from value and max
     */
    private getFill(): number {
        const { value, max } = this.options;
        if (typeof max === "number" && max > 0) {
            return Math.max(0, Math.min(1, value / max));
        }
        // Sinon, traiter value comme un pourcentage (0-100)
        return Math.max(0, Math.min(100, value)) / 100;
    }

    /**
     * Append the label below the display (shared by all variants)
     */
    private appendLabel(displaySize: number): void {
        const { label } = this.options;
        if (label) {
            const labelDiv = document.createElement('div');
            labelDiv.className = 'crm-number-display-label';
            this.container.appendChild(labelDiv);
            labelDiv.innerHTML = label;
            labelDiv.setAttribute(
                "style",
                `text-align:center;font-size:${Math.min(displaySize * 0.2, 16)}px;color:var(--text-muted);margin-top:0.5em;`
            );
        }
    }

    getDisplay() {
        const { value, unit, label, size, max } = this.options;
        const color = this.options.color || "var(--interactive-accent)";
        this.container.innerHTML = '';

        const variant = this.options.display ?? 'ring';

        // ---------- plain : big number, no circle ----------
        if (variant === 'plain') {
            this.container.classList.add('crm-number-display-plain');

            const valueEl = document.createElement('div');
            valueEl.className = 'crm-number-display-value';
            valueEl.textContent = `${value}${unit ?? ""}`;
            this.container.appendChild(valueEl);

            this.appendLabel(size ?? 96);
            return this.container;
        }

        // ---------- bar : horizontal progress bar ----------
        if (variant === 'bar') {
            this.container.classList.add('crm-number-display-bar');

            const fill = this.getFill();

            const valueEl = document.createElement('div');
            valueEl.className = 'crm-number-display-value';
            valueEl.textContent = `${value}${unit ?? ""}`;
            this.container.appendChild(valueEl);

            const track = document.createElement('div');
            track.className = 'crm-number-display-bar-track';
            const fillBar = document.createElement('div');
            fillBar.className = 'crm-number-display-bar-fill';
            fillBar.style.width = `${fill * 100}%`;
            track.appendChild(fillBar);
            this.container.appendChild(track);

            this.appendLabel(size ?? 96);
            return this.container;
        }

        // ---------- ring (default) ----------
        // Agrandir la taille par défaut si non spécifiée
        const displaySize = size ?? 96; // plus grand que 64
        const svgNS = "http://www.w3.org/2000/svg";
        const strokeWidth = 10; // plus épais
        const radius = (displaySize / 2) - (strokeWidth / 2) - 2;
        const circumference = 2 * Math.PI * radius;

        const fill = this.getFill();
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
        this.appendLabel(displaySize);
        return this.container;
    }
}
