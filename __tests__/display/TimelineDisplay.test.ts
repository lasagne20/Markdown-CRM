/**
 * @jest-environment jsdom
 *
 * Timeline display : fusion chronologique des entries d'une ObjectProperty
 * (journal manuel éditable) et d'instances dérivées (ex: actions réalisées,
 * lecture seule, jamais dupliquées dans la propriété).
 */

import { TimelineDisplay } from '../../src/display/TimelineDisplay';

const makeSubProperty = (name: string, title: string) => ({
    name,
    title,
    fillDisplay: jest.fn((value: any) => {
        const span = document.createElement('span');
        span.className = `mock-fill-${name}`;
        span.textContent = String(value ?? '');
        return span;
    })
});

// ObjectProperty simulée : mêmes membres publics utilisés par TimelineDisplay
const makeObjectProperty = () => ({
    name: 'suivie',
    properties: {
        date: makeSubProperty('date', 'Date'),
        interlocuteur: makeSubProperty('interlocuteur', 'Interlocuteur'),
        type: makeSubProperty('type', 'Type'),
        description: makeSubProperty('description', 'Description')
    },
    updateObject: jest.fn(async () => undefined),
    createAddButton: jest.fn(() => {
        const b = document.createElement('button');
        b.className = 'metadata-add-button';
        return b;
    }),
    createDeleteButton: jest.fn(() => {
        const b = document.createElement('button');
        b.className = 'metadata-delete-button';
        return b;
    })
});

const makeAction = (name: string, path: string, date: string | null) => ({
    name: 'Action',
    getName: () => name,
    getPath: () => path,
    getPropertyValue: async (prop: string) => (prop === 'date' ? date : undefined)
});

describe('TimelineDisplay - fusion chronologique', () => {
    let objectProperty: any;
    let vault: any;
    let context: any;
    let resolveSource: jest.Mock;

    beforeEach(() => {
        objectProperty = makeObjectProperty();
        vault = { app: { open: jest.fn(async () => undefined) } };
        context = {
            name: 'Institution',
            getName: () => 'Ecole de Saint-Clair de la Tour',
            getPath: () => 'Institution/Ecole.md'
        };
        resolveSource = jest.fn(async () => [] as any[]);
    });

    const getRows = (element: HTMLElement): HTMLTableRowElement[] =>
        [...element.querySelectorAll('table tr')].slice(1) as HTMLTableRowElement[];
    const noop = async () => undefined;

    test('PLANTE : entrées manuelles + actions fusionnées, tri desc par défaut (recent en premier)', async () => {
        const values = [
            { id: 'a', date: '2026-02-01', type: 'Email' },
            { id: 'b', date: '2026-01-05', type: 'Appel' }
        ];
        const actions = [
            makeAction('Atelier énergie', 'Actions/Atelier.md', '2026-01-20'),
            makeAction('Atelier milieu aquatique', 'Actions/Aquatique.md', '2025-11-15')
        ];

        const display = new TimelineDisplay(objectProperty, vault, context, resolveSource);
        const element = await display.render(
            { type: 'timeline', property: 'suivie', actions: { source: { class: 'Action', smartFilter: 'children' } } },
            values,
            noop,
            actions
        );

        const rows = getRows(element);
        expect(rows).toHaveLength(4);
        // Ordre chronologique desc : 2026-02-01, 2026-01-20 (Action), 2026-01-05, 2025-11-15
        expect(rows[0].cells[0].textContent).toContain('2026-02-01');
        expect(rows[1].cells[0].textContent).toContain('2026-01-20');
        expect(rows[1].classList.contains('timeline-action-row')).toBe(true);
        expect(rows[2].cells[0].textContent).toContain('2026-01-05');
        expect(rows[3].cells[0].textContent).toContain('2025-11-15');
        expect(rows[3].classList.contains('timeline-action-row')).toBe(true);
    });

    test('PLANTE : ligne action en lecture seule - colonnes type/description (lien cliquable), pas de bouton', async () => {
        const display = new TimelineDisplay(objectProperty, vault, context, resolveSource);
        const element = await display.render(
            { type: 'timeline', property: 'suivie' } as any,
            [{ id: 'a', date: '2026-01-05', type: 'Appel' }],
            noop,
            [makeAction('Atelier énergie', 'Actions/Atelier.md', '2026-01-20')]
        );

        const rows = getRows(element);
        const actionRow = rows[0];
        expect(actionRow.classList.contains('timeline-action-row')).toBe(true);
        // L'ordre des colonnes suit les sous-propriétés : date/interlocuteur/type/description
        expect(actionRow.cells[0].textContent).toBe('2026-01-20');
        expect(actionRow.cells[2].textContent).toBe('Action');
        // Description : lien cliquable vers la fiche
        const link = actionRow.cells[3].querySelector('a.file-link') as HTMLAnchorElement;
        expect(link).not.toBeNull();
        expect(link.textContent).toBe('Atelier énergie');
        link.click();
        expect(vault.app.open).toHaveBeenCalledWith('Actions/Atelier.md');
        // Pas de bouton de suppression sur une ligne dérivée
        expect(actionRow.cells[4].querySelector('.metadata-delete-button')).toBeNull();
    });

    test("PLANTE : entrées manuelles restent éditables (fillDisplay + delete), bouton d'ajout présent", async () => {
        const display = new TimelineDisplay(objectProperty, vault, context, resolveSource);
        const element = await display.render(
            { type: 'timeline', property: 'suivie' } as any,
            [{ id: 'a', date: '2026-01-05', type: 'Appel', description: 'Premier appel' }],
            noop,
            []
        );

        // Bouton d'ajout (celui de l'ObjectProperty)
        expect(element.querySelector('.metadata-add-button')).not.toBeNull();
        expect(objectProperty.createAddButton).toHaveBeenCalled();

        // Chaque cellule manuelle passe par fillDisplay de la sous-propriété
        expect(objectProperty.properties.date.fillDisplay).toHaveBeenCalled();
        expect(objectProperty.properties.description.fillDisplay).toHaveBeenCalled();

        // Bouton de suppression sur les lignes manuelles uniquement
        const rows = getRows(element);
        expect(rows).toHaveLength(1);
        expect(rows[0].cells[4].querySelector('.metadata-delete-button')).not.toBeNull();
        expect(objectProperty.createDeleteButton).toHaveBeenCalledWith(
            [{ id: 'a', date: '2026-01-05', type: 'Appel', description: 'Premier appel' }],
            expect.any(Function),
            0,
            element
        );
    });

    test('PLANTE : dates nulles en fin de timeline, tri asc configurable, colonne typelabel', async () => {
        const display = new TimelineDisplay(objectProperty, vault, context, resolveSource);
        const element = await display.render(
            {
                type: 'timeline',
                property: 'suivie',
                sort: 'asc',
                actions: { source: { class: 'Action', smartFilter: 'children' }, date: 'date', typeLabel: 'Animation' }
            },
            [{ id: 'a', date: null, type: 'Email' }, { id: 'b', date: '2026-01-05', type: 'Appel' }],
            noop,
            [makeAction('Atelier', 'Actions/A.md', '2025-11-15')]
        );

        const rows = getRows(element);
        expect(rows).toHaveLength(3);
        // Tri asc : 2025-11-15 (Action) puis 2026-01-05, date nulle TOUJOURS en fin
        expect(rows[0].cells[0].textContent).toBe('2025-11-15');
        expect(rows[1].cells[0].textContent).toContain('2026-01-05');
        expect(rows[2].classList.contains('timeline-action-row')).toBe(false);
        // typeLabel configurable
        expect(rows[0].cells[2].textContent).toBe('Animation');
    });

    test('PLANTE : sans actions, la timeline rend uniquement les entrées manuelles triées', async () => {
        const display = new TimelineDisplay(objectProperty, vault, context, resolveSource);
        const element = await display.render(
            { type: 'timeline', property: 'suivie' } as any,
            [{ id: 'b', date: '2026-02-01' }, { id: 'a', date: '2025-12-31' }],
            noop,
            []
        );

        const rows = getRows(element);
        expect(rows).toHaveLength(2);
        expect(rows[0].classList.contains('timeline-action-row')).toBe(false);
        expect(rows[0].cells[0].textContent).toContain('2026-02-01');
        expect(rows[1].cells[0].textContent).toContain('2025-12-31');
    });

    test('PLANTE : source des actions résolue par le résolveur injecté (getFilesForTable)', async () => {
        const source = { class: 'Action', smartFilter: 'children', conditions: [{ property: 'etat', type: 'equalsAny', values: ['Réalisé'] }] };
        resolveSource = jest.fn(async () => [
            makeAction('Atelier', 'Actions/A.md', '2026-01-20')
        ]);
        const display = new TimelineDisplay(objectProperty, vault, context, resolveSource);

        // L'élément rendu résout lui-même la source quand les instances ne
        // sont pas passées directement - ici on lui donne le travail complet
        const element = await display.render({ type: 'timeline', property: 'suivie', actions: { source } } as any, [] as any, noop, null);

        expect(resolveSource).toHaveBeenCalledWith(source, context);
        const rows = getRows(element);
        expect(rows).toHaveLength(1);
        expect(rows[0].textContent).toContain('Atelier');
    });
});
