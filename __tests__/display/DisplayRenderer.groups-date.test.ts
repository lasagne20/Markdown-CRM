/**
 * @jest-environment jsdom
 *
 * Bug : la table "Prochaines actions" (Lieu.yaml) reste vide ou affiche tout
 * selon la syntaxe YAML des groups.
 *
 * 1. groups: [{ operator: AND, conditions: [date >= today] }] (liste)
 *    -> le filtre s'applique : seule une action dont la plage de dates
 *       commence aujourd'hui ou après doit passer.
 *
 * 2. groups: { conditions: [...] } (objet, YAML sans le "- operator: AND")
 *    -> source.groups.length est undefined -> le bloc de filtrage est
 *       IGNORÉ silencieusement -> toutes les actions s'affichent.
 *    La normalisation doit accepter les deux formats.
 */

import { DisplayRenderer } from '../../src/display/DisplayRenderer';
import { ConditionManager } from '../../src/Config/ConditionManager';
import { RangeDateProperty } from '../../src/properties/RangeDateProperty';
import { Vault } from '../../src/vault/Vault';
import { mockApp } from '../utils/mocks';

describe('DisplayRenderer.getFilesForTable - source.groups avec condition date (Lieu.yaml)', () => {
    let vault: any;
    let renderer: DisplayRenderer;
    let rangeDateProperty: RangeDateProperty;

    // Instances Action mockées : dateRange future / passée / sans date
    const makeAction = (dateValue: string | undefined) => ({
        name: 'Action',
        getProperty: jest.fn((propName: string) => propName === 'date' ? rangeDateProperty : undefined),
        getPropertyValue: jest.fn(async (propName: string) =>
            propName === 'date' ? dateValue : undefined
        )
    });

    let actionFuture: any;
    let actionPast: any;
    let actionNoDate: any;
    let currentInstance: any;

    beforeEach(() => {
        // Date système déterministe : 19 octobre 2026
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-10-19T12:00:00Z'));

        const app = mockApp();
        vault = {
            getDynamicClassFactory: jest.fn().mockReturnValue({
                getAllInstancesForClass: jest.fn().mockResolvedValue([])
            }),
            conditionManager: new ConditionManager()
        } as any;

        // Vraie RangeDateProperty pour que toNumericValueSmart détecte le type
        rangeDateProperty = new RangeDateProperty('date', vault as any, { icon: 'calendar' });

        actionFuture = makeAction('2026-11-05 to 2026-11-07');   // après aujourd'hui
        actionPast = makeAction('2026-03-10 to 2026-03-20');      // avant aujourd'hui
        actionNoDate = makeAction(undefined);                      // pas de date

        currentInstance = {
            // Le Lieu : ses enfants sont les actions
            findChildren: jest.fn().mockResolvedValue([actionFuture, actionPast, actionNoDate])
        } as any;

        renderer = new DisplayRenderer(vault as any, currentInstance);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('Syntaxe liste avec operator AND (config "Prochaines actions")', () => {
        test('une action future passe, une action passée est exclue', async () => {
            const source = {
                class: 'Action',
                smartFilter: 'children',
                groups: [
                    {
                        operator: 'AND',
                        conditions: [
                            { property: 'date', type: 'greaterThanOrEqual', value: 'today' }
                        ]
                    }
                ]
            };

            const result = await (renderer as any).getFilesForTable(source, currentInstance);

            expect(result).toContain(actionFuture);
            expect(result).not.toContain(actionPast);
            expect(result).not.toContain(actionNoDate);
        });

        test('une action commençant aujourd\'hui même est incluse (>= today)', async () => {
            const actionToday = makeAction('2026-10-19 to 2026-10-25');
            (currentInstance.findChildren as jest.Mock).mockResolvedValue([actionToday]);

            const source = {
                class: 'Action',
                smartFilter: 'children',
                groups: [
                    {
                        conditions: [
                            { property: 'date', type: 'greaterThanOrEqual', value: 'today' }
                        ]
                    }
                ]
            };

            const result = await (renderer as any).getFilesForTable(source, currentInstance);
            expect(result).toContain(actionToday);
        });
    });

    describe('PLANTE : syntaxe objet (groups sans liste) doit aussi filtrer', () => {
        test('groups en objet (sans "- operator: AND") applique quand même la condition', async () => {
            // YAML : groups:\n    conditions:\n    - ... -> groups = { conditions: [...] }
            const source = {
                class: 'Action',
                smartFilter: 'children',
                groups: {
                    conditions: [
                        { property: 'date', type: 'greaterThanOrEqual', value: 'today' }
                    ]
                }
            };

            const result = await (renderer as any).getFilesForTable(source, currentInstance);

            // Le filtre DOIT s'appliquer (AND par défaut) : l'action passée exclue
            expect(result).toContain(actionFuture);
            expect(result).not.toContain(actionPast);
        });
    });

    describe('Sans groups ni conditions : tout s\'affiche', () => {
        test('aucun filtre -> toutes les actions enfants', async () => {
            const source = {
                class: 'Action',
                smartFilter: 'children'
            };

            const result = await (renderer as any).getFilesForTable(source, currentInstance);

            expect(result).toHaveLength(3);
            expect(result).toContain(actionFuture);
            expect(result).toContain(actionPast);
            expect(result).toContain(actionNoDate);
        });
    });
});
