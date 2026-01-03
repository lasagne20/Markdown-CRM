// @ts-nocheck
// Component and MarkdownRenderer removed - not available in AppShim

import { NumberDisplayItem } from '../Config/interfaces';
import { Vault } from '../vault/Vault';
import { Classe } from '../vault/Classe';

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
                maxValue = await NumberDisplay.calculateValue(maxFiles, item.max.formula, item.max.propertyName, undefined, context);
            }
        }
        
        // Calculate value using formula (pass maxValue for percent formula)
        const value = await NumberDisplay.calculateValue(files, item.formula, item.propertyName, maxValue, context);
        
        return new NumberDisplay({
            value: value,
            unit: item.unit,
            label: item.label,
            size: item.size,
            color: item.color,
            max: maxValue
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
        context?: Classe
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
        
        // Get all property values
        const values: any[] = [];
        for (const file of files) {
            try {
                // Classe.getPropertyValue() handles all property navigation including filters
                // Pass context for $current support in filter expressions
                const value = await file.getPropertyValue(propertyName, context);
                
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
                console.warn(`Error getting property ${propertyName} from file:`, error);
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
