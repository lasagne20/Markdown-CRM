/**
 * @jest-environment jsdom
 *
 * CircleDisplay : graphique circulaire (donut SVG) multi-segments pour les
 * chiffres clés (onglet Chiffres d'un Lieu : animations / personnes touchées).
 * - Segments proportionnels à leur valeur (astuce stroke-dasharray 0-100)
 * - Total au centre, libellé configurable
 * - Légende (label, valeur, pourcentage) + libellés au survol (<title>)
 * - Segments nuls exclus, couleurs explicites sinon palette
 * - Côté renderer : fichiers groupés par valeur de propriété (groupBy) puis
 *   valeur par groupe via la mécanique des number items (count / sum)
 */

import { CircleDisplay } from '../../src/display/CircleDisplay';
import { DisplayRenderer } from '../../src/display/DisplayRenderer';

describe('CircleDisplay - donut SVG', () => {
    test('PLANTE : arcs proportionnels aux valeurs (stroke-dasharray sur 100)', () => {
        const display = new CircleDisplay({
            segments: [
                { label: 'Terminé', value: 25, color: 'var(--color-green)' },
                { label: 'En cours', value: 75, color: 'var(--color-blue)' }
            ]
        });

        const circles = display.container.querySelectorAll('svg circle.crm-circle-segment');
        expect(circles).toHaveLength(2);
        // 25% de l'anneau : dasharray "25 75", second segment décalé de 25
        const first = circles[0] as SVGCircleElement;
        expect(first.getAttribute('stroke-dasharray')).toBe('25 75');
        expect(first.getAttribute('stroke-dashoffset')).toBe('25');
        const second = circles[1] as SVGCircleElement;
        expect(second.getAttribute('stroke-dasharray')).toBe('75 25');
        expect(second.getAttribute('stroke-dashoffset')).toBe('0');
    });

    test('PLANTE : total au centre avec libellé', () => {
        const display = new CircleDisplay({
            segments: [
                { label: 'A', value: 10 },
                { label: 'B', value: 20 },
                { label: 'C', value: 70 }
            ],
            centerLabel: 'animations'
        });

        const center = display.container.querySelector('.crm-circle-center-value');
        expect(center?.textContent).toBe('100');
        const label = display.container.querySelector('.crm-circle-center-label');
        expect(label?.textContent).toBe('animations');
    });

    test('PLANTE : légende label / valeur / pourcentage, segments nuls exclus', () => {
        const display = new CircleDisplay({
            segments: [
                { label: 'Nul', value: 0, color: 'red' },
                { label: 'B', value: 30, color: 'blue' },
                { label: 'C', value: 70, color: 'green' }
            ]
        });

        // Le segment nul ne crée ni arc ni légende
        const circles = display.container.querySelectorAll('svg circle.crm-circle-segment');
        expect(circles).toHaveLength(2);
        const legendItems = display.container.querySelectorAll('.crm-circle-legend-item');
        expect(legendItems).toHaveLength(2);
        expect(legendItems[0].textContent).toContain('B');
        expect(legendItems[0].textContent).toContain('30');
        expect(legendItems[0].textContent).toContain('30,0%');
        expect(legendItems[1].textContent).toContain('70,0%');
    });

    test('PLANTE : couleur explicite appliquée, palette pour les segments sans couleur', () => {
        const display = new CircleDisplay({
            segments: [
                { label: 'A', value: 50, color: '#123456' },
                { label: 'B', value: 50 }
            ]
        });
        const circles = display.container.querySelectorAll('svg circle.crm-circle-segment');
        expect((circles[0] as SVGCircleElement).getAttribute('stroke')).toBe('#123456');
        // Palette par défaut déterministe pour le second segment
        expect((circles[1] as SVGCircleElement).getAttribute('stroke')).toMatch(/hsl\(/);
    });

    test("PLANTE : libellés au survol (SVG <title>) pour le détail quand l'espace manque", () => {
        const display = new CircleDisplay({
            segments: [{ label: 'Terminé', value: 40, color: 'green' }]
        });
        const titles = display.container.querySelectorAll('svg circle.crm-circle-segment title');
        expect(titles).toHaveLength(1);
        expect(titles[0].textContent).toContain('Terminé');
    });

    test('PLANTE : titre du composant rendu au-dessus du donut', () => {
        const display = new CircleDisplay({
            title: 'Actions par état',
            segments: [{ label: 'A', value: 30 }, { label: 'B', value: 70 }]
        });
        const title = display.container.querySelector('.crm-circle-title');
        expect(title?.textContent).toBe('Actions par état');
    });
});

describe('DisplayRenderer - item circle (groupement + calcul)', () => {
    let vault: any;
    let context: any;
    let renderer: DisplayRenderer;

    // Fichiers façon Action : etat + propriétés numériques navigables
    const makeFile = (name: string, etat: string, nombre: number) => ({
        name: 'Action',
        getName: () => name,
        getPath: () => `Actions/${name}.md`,
        getPropertyValue: async (prop: string) => {
            if (prop === 'etat') { return etat; }
            if (prop === 'clients') { return [{ nombre }]; }
            return undefined;
        },
        getProperty: (prop: string) => (prop === 'etat'
            ? { options: [{ name: 'Terminé', color: 'var(--color-green)' }, { name: 'En cours', color: 'var(--color-blue)' }] }
            : undefined)
    });

    beforeEach(() => {
        vault = {
            conditionManager: { createValidationFunction: () => async () => true },
            getDynamicClassFactory: () => ({ getAllInstancesForClass: async () => [] })
        } as any;
        context = {
            getName: () => 'Saint-Clair-de-la-Tour',
            getPath: () => 'France/Saint-Clair.md',
            getPropertyValue: async () => undefined
        } as any;
        renderer = new DisplayRenderer(vault, {}, context);
    });

    test('PLANTE : fichiers groupés par valeur de groupBy, count par groupe + couleurs des options', async () => {
        const files = [
            makeFile('a', 'Terminé', 10),
            makeFile('b', 'Terminé', 20),
            makeFile('c', 'En cours', 5)
        ];
        vault.getDynamicClassFactory = () => ({ getAllInstancesForClass: async () => files });

        const item = {
            type: 'circle' as const,
            title: 'Actions par état',
            source: { class: 'Action' },
            groupBy: 'etat',
            value: { formula: 'count' as const }
        };
        const el = await (renderer as any).renderCircle(item);
        document.body.appendChild(el);

        // Deux groupes : Terminé = 2, En cours = 1
        const circles = el.querySelectorAll('svg circle.crm-circle-segment');
        expect(circles).toHaveLength(2);
        const legendItems = [...el.querySelectorAll('.crm-circle-legend-item')];
        const finished = legendItems.find(l => l.textContent?.includes('Terminé'));
        const ongoing = legendItems.find(l => l.textContent?.includes('En cours'));
        expect(finished?.textContent).toContain('2');
        expect(ongoing?.textContent).toContain('1');

        // Couleurs reprises des options du SelectProperty groupé
        const strokes = [...circles].map(c => (c as SVGCircleElement).getAttribute('stroke'));
        expect(strokes).toContain('var(--color-green)');
        expect(strokes).toContain('var(--color-blue)');

        // Total au centre = nombre de fichiers
        expect(el.querySelector('.crm-circle-center-value')?.textContent).toBe('3');
    });

    test('PLANTE : sum avec propertyName collecté par groupe, valeur sans groupe (vide) isolée', async () => {
        const files = [
            makeFile('a', 'Terminé', 10),
            makeFile('b', 'Terminé', 5),
            makeFile('d', '', 100)
        ];
        vault.getDynamicClassFactory = () => ({ getAllInstancesForClass: async () => files });

        const item = {
            type: 'circle' as const,
            source: { class: 'Action' },
            groupBy: 'etat',
            value: { formula: 'sum' as const, propertyName: 'clients.nombre' }
        };
        const el = await (renderer as any).renderCircle(item);
        document.body.appendChild(el);

        const legendItems = [...el.querySelectorAll('.crm-circle-legend-item')];
        const finished = legendItems.find(l => l.textContent?.includes('Terminé'));
        // Terminé : 10 + 5 = 15
        expect(finished?.textContent).toContain('15');
        // Le fichier sans etat est regroupé sous une clé isolée, pas fusionné
        const unassigned = legendItems.find(l => !l.textContent?.includes('Terminé'));
        expect(unassigned?.textContent).toContain('100');
        // Total : 15 + 100 = 115
        expect(el.querySelector('.crm-circle-center-value')?.textContent).toBe('115');
    });
});
