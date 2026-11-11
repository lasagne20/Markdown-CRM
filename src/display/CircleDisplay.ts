/**
 * CircleDisplay : graphique circulaire (donut SVG) multi-segments pour les
 * chiffres clés d'une page.
 *
 * - Segments proportionnels à leur valeur (astuce stroke-dasharray sur une
 *   circonférence de 100 : dasharray "p 100-p", dashoffset cumulé)
 * - Total au centre + libellé configurable
 * - Légende sous le donut (label, valeur, pourcentage) ET libellé natif au
 *   survol de chaque segment (SVG <title>) quand la légende ne tient pas
 * - Segments nuls exclus ; couleur explicite par segment sinon palette
 */

export interface CircleSegment {
    label: string;
    value: number;
    color?: string;
}

export interface CircleDisplayOptions {
    title?: string;
    /** Libellé sous le total au centre (ex: "animations") */
    centerLabel?: string;
    /** Total affiché au centre - défaut : somme des segments */
    centerValue?: number | string;
    segments: CircleSegment[];
    /** Diamètre du donut en px (défaut : 120) */
    size?: number;
    /** Légende sous le donut (défaut : true) */
    legend?: boolean;
    /** Unité ajoutée aux valeurs du centre et de la légende (ex: "€") */
    unit?: string;
    /** Séparateur de milliers (ex: " ") */
    thousandsSeparator?: string;
}

const DEFAULT_PALETTE = [
    'hsl(210, 70%, 60%)',
    'hsl(120, 55%, 55%)',
    'hsl(45, 90%, 55%)',
    'hsl(15, 85%, 60%)',
    'hsl(275, 60%, 65%)',
    'hsl(180, 60%, 50%)',
    'hsl(0, 75%, 65%)'
];

export class CircleDisplay {
    container: HTMLElement;
    options: CircleDisplayOptions;

    constructor(options: CircleDisplayOptions) {
        this.options = options;
        this.container = document.createElement('div');
        this.container.className = 'crm-circle-display';
        this.getDisplay();
    }

    private formatValue(value: number): string {
        const { thousandsSeparator } = this.options;
        let text = String(Math.round(value * 100) / 100);
        if (thousandsSeparator) {
            text = text.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
        }
        return text;
    }

    private formatSegmentValue(value: number): string {
        return this.formatValue(value) + (this.options.unit ?? '');
    }

    getDisplay(): HTMLElement {
        const { segments, size = 120, legend = true } = this.options;
        this.container.innerHTML = '';

        if (this.options.title) {
            const title = document.createElement('div');
            title.className = 'crm-circle-title';
            title.textContent = this.options.title;
            this.container.appendChild(title);
        }

        const visibleSegments = segments.filter((s) => s.value > 0);
        const total = typeof this.options.centerValue === 'number'
            ? this.options.centerValue
            : visibleSegments.reduce((sum, s) => sum + s.value, 0);

        const wrapper = document.createElement('div');
        wrapper.className = 'crm-circle-wrapper';

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('crm-circle-svg');
        svg.setAttribute('viewBox', '0 0 42 42');
        svg.setAttribute('width', String(size));
        svg.setAttribute('height', String(size));

        // Anneau de fond (pour que le donut reste visible même à total nul)
        const track = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        track.setAttribute('cx', '21');
        track.setAttribute('cy', '21');
        track.setAttribute('r', '15.91549430918954'); // circonférence = 100
        track.classList.add('crm-circle-track');
        svg.appendChild(track);

        let offset = 0;
        visibleSegments.forEach((segment, index) => {
            const pct = total > 0 ? (segment.value / total) * 100 : 0;
            const color = segment.color ?? DEFAULT_PALETTE[index % DEFAULT_PALETTE.length];

            const arc = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            arc.classList.add('crm-circle-segment');
            arc.setAttribute('cx', '21');
            arc.setAttribute('cy', '21');
            arc.setAttribute('r', '15.91549430918954');
            arc.setAttribute('fill', 'none');
            arc.setAttribute('stroke', color);
            arc.setAttribute('stroke-width', '6');
            arc.setAttribute('stroke-dasharray', `${pct} ${100 - pct}`);
            // Segments posés à partir de midi, sens de l'anneau :
            // dashoffset = 25 - (décalage cumulé) mod 100
            arc.setAttribute('stroke-dashoffset', String((((25 - (offset % 100)) % 100) + 100) % 100));

            // Libellé au survol : détail complet quand la place manque
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = `${segment.label} : ${this.formatSegmentValue(segment.value)} (${pct.toFixed(1).replace('.', ',')}%)`;
            arc.appendChild(title);

            svg.appendChild(arc);
            offset += pct;
        });

        wrapper.appendChild(svg);

        // Total au centre
        const center = document.createElement('div');
        center.className = 'crm-circle-center';
        const centerValue = document.createElement('div');
        centerValue.className = 'crm-circle-center-value';
        centerValue.textContent = typeof this.options.centerValue === 'string'
            ? this.options.centerValue
            : this.formatSegmentValue(total);
        center.appendChild(centerValue);
        if (this.options.centerLabel) {
            const centerLabel = document.createElement('div');
            centerLabel.className = 'crm-circle-center-label';
            centerLabel.textContent = this.options.centerLabel;
            center.appendChild(centerLabel);
        }
        wrapper.appendChild(center);

        this.container.appendChild(wrapper);

        if (legend) {
            const legendEl = document.createElement('div');
            legendEl.className = 'crm-circle-legend';
            visibleSegments.forEach((segment) => {
                const pct = total > 0 ? (segment.value / total) * 100 : 0;
                const item = document.createElement('div');
                item.className = 'crm-circle-legend-item';

                const dot = document.createElement('span');
                dot.className = 'crm-circle-legend-dot';
                dot.style.backgroundColor = segment.color
                    ?? DEFAULT_PALETTE[visibleSegments.indexOf(segment) % DEFAULT_PALETTE.length];
                item.appendChild(dot);

                const label = document.createElement('span');
                label.className = 'crm-circle-legend-label';
                label.textContent = segment.label;
                item.appendChild(label);

                const value = document.createElement('span');
                value.className = 'crm-circle-legend-value';
                value.textContent = `${this.formatSegmentValue(segment.value)} (${pct.toFixed(1).replace('.', ',')}%)`;
                item.appendChild(value);

                legendEl.appendChild(item);
            });
            this.container.appendChild(legendEl);
        }

        return this.container;
    }
}
