/**
 * @jest-environment jsdom
 *
 * Feature : RangeDateProperty derivedFrom
 *
 * Configuration (Action.yaml) :
 *   date:
 *     type: "RangeDateProperty"
 *     derivedFrom: "animations.date"
 *
 * Comportement attendu :
 * - Si les animations ont des dates -> la propriété date vaut le range
 *   "min to max" des dates des animations (couvre les jours espacés), et
 *   l'affichage est READONLY (dérivé, pas modifiable).
 * - Sinon -> la valeur stockée dans le frontmatter (saisie manuelle),
 *   affichage normal modifiable.
 *
 * Le read dérivé doit fonctionner partout :
 * - property.read() (affichage, conditions/filtres via ConditionManager)
 * - DynamicTable.getNestedPropertyValue (tri des tables) via fallback
 *   property.read quand la métadonnée est vide
 */

import { RangeDateProperty } from '../../src/properties/RangeDateProperty';
import { Vault } from '../../src/vault/Vault';
import { ConditionManager, Condition } from '../../src/Config/ConditionManager';
import { DynamicTable } from '../../src/display/DynamicTable';
import { mockApp } from '../utils/mocks';

describe('RangeDateProperty - derivedFrom: "animations.date"', () => {
    let vault: Vault;
    let dateProperty: RangeDateProperty;

    beforeEach(() => {
        const app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);
        dateProperty = new RangeDateProperty('date', vault, { derivedFrom: 'animations.date' });
    });

    // Instance Action mockée : animations (array) + valeurs stockées (metadata)
    const makeAction = (metadata: Record<string, any>, animations: any[]) => ({
        getVault: () => vault,
        getPropertyValue: async (p: string) => p === 'animations' ? animations : metadata[p],
        getProperty: (p: string) => p === 'date' ? dateProperty : undefined,
        getAllProperties: () => ({ date: dateProperty }),
        getPath: () => 'Test.md',
        getName: () => 'Test'
    });

    describe('read() : range dérivé des animations', () => {
        test('PLANTE : deux animations consécutives -> range min to max', async () => {
            const action = makeAction(
                { date: undefined },
                [{ date: '2026-03-26' }, { date: '2026-03-27' }]
            );

            const value = await dateProperty.read(action as any);
            expect(value).toBe('2026-03-26 to 2026-03-27');
        });

        test('PLANTE : dates espacées de plusieurs jours -> range qui les couvre', async () => {
            const action = makeAction(
                { date: undefined },
                [{ date: '2026-03-03' }, { date: '2026-03-07' }]
            );

            const value = await dateProperty.read(action as any);
            expect(value).toBe('2026-03-03 to 2026-03-07');
        });

        test('PLANTE : une seule animation -> date simple sans range', async () => {
            const action = makeAction(
                { date: undefined },
                [{ date: '2026-03-26' }]
            );

            const value = await dateProperty.read(action as any);
            expect(value).toBe('2026-03-26');
        });

        test('PLANTE : les Date objects (cache Obsidian) sont parsées', async () => {
            const action = makeAction(
                { date: undefined },
                [
                    { date: new Date('2026-03-26T00:00:00Z') },
                    { date: new Date('2026-03-28T00:00:00Z') }
                ]
            );

            const value = await dateProperty.read(action as any);
            expect(value).toBe('2026-03-26 to 2026-03-28');
        });

        test('PLANTE : mélange strings et Date objects', async () => {
            const action = makeAction(
                { date: undefined },
                [
                    { date: new Date('2026-03-29T00:00:00Z') },
                    { date: '2026-03-26' }
                ]
            );

            const value = await dateProperty.read(action as any);
            expect(value).toBe('2026-03-26 to 2026-03-29');
        });

        test('PLANTE : dates invalides ignorées, valides conservées', async () => {
            const action = makeAction(
                { date: undefined },
                [
                    { date: 'nimporte quoi' },
                    { date: '2026-04-02' },
                    { etat: 'Confirmée' }  // pas de date
                ]
            );

            const value = await dateProperty.read(action as any);
            expect(value).toBe('2026-04-02');
        });

        test('plusieurs animations, une avec un range -> couvre tout', async () => {
            const action = makeAction(
                { date: undefined },
                [
                    { date: '2026-05-01 to 2026-05-03' },
                    { date: '2026-05-10' }
                ]
            );

            const value = await dateProperty.read(action as any);
            expect(value).toBe('2026-05-01 to 2026-05-10');
        });
    });

    describe('read() : fallback sur la valeur stockée (saisie manuelle)', () => {
        test('PLANTE : pas d\'animations -> valeur stockée utilisée', async () => {
            const action = makeAction(
                { date: '2026-05-01 to 2026-05-02' },
                []
            );

            const value = await dateProperty.read(action as any);
            expect(value).toBe('2026-05-01 to 2026-05-02');
        });

        test('PLANTE : pas d\'animations avec dates -> valeur stockée', async () => {
            const action = makeAction(
                { date: '2026-05-01' },
                [{ etat: 'Confirmée' }]   // animation sans date
            );

            const value = await dateProperty.read(action as any);
            expect(value).toBe('2026-05-01');
        });

        test('PLANTE : ni animations ni date stockée -> undefined', async () => {
            const action = makeAction({}, []);

            const value = await dateProperty.read(action as any);
            expect(value).toBeUndefined();
        });
    });

    describe('Sans derivedFrom : comportement inchangé', () => {
        test('une RangeDateProperty classique lit la valeur stockée', async () => {
            const plainDate = new RangeDateProperty('date', vault, {});
            const action = {
                getPropertyValue: async (p: string) => p === 'date' ? '2026-06-15 to 2026-06-16' : undefined
            };

            const value = await plainDate.read(action as any);
            expect(value).toBe('2026-06-15 to 2026-06-16');
        });
    });

    describe('Affichage : la valeur dérivée est rendue', () => {
        test('PLANTE : getDisplay affiche le range dérivé formaté', async () => {
            const action = makeAction(
                { date: undefined },
                [{ date: '2026-03-26' }, { date: '2026-03-27' }]
            );

            const display = await dateProperty.getDisplay(action as any);
            expect(display.textContent).toContain('26 mars 2026');
            expect(display.textContent).toContain('au');
            expect(display.textContent).toContain('27 mars 2026');
        });

        test('getDisplay affiche la valeur stockée quand pas d\'animations', async () => {
            const action = makeAction(
                { date: '2026-05-01 to 2026-05-02' },
                []
            );

            const display = await dateProperty.getDisplay(action as any);
            expect(display.textContent).toContain('1 mai 2026');
            expect(display.textContent).toContain('2 mai 2026');
        });
    });

    describe('Intégration : les conditions utilisent la date dérivée', () => {
        test('PLANTE : date >= today matche une action avec animations futures', async () => {
            // Système : 19 octobre 2026
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2026-10-19T12:00:00Z'));

            try {
                const action = makeAction(
                    { date: undefined },   // rien de stocké : la dérivation décide
                    [{ date: '2026-11-05' }, { date: '2026-11-07' }]
                );

                const conditionManager = new ConditionManager();
                const condition: Condition = {
                    property: 'date',
                    type: 'greaterThanOrEqual',
                    value: 'today'
                };

                const result = await conditionManager.evaluateCondition(condition, action as any);
                // 2026-11-05 (début du range dérivé) >= today -> VRAI
                expect(result).toBe(true);
            } finally {
                jest.useRealTimers();
            }
        });

        test('PLANTE : action avec animations passées ne matche pas date >= today', async () => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2026-10-19T12:00:00Z'));

            try {
                const action = makeAction(
                    { date: undefined },
                    [{ date: '2026-03-26' }]
                );

                const conditionManager = new ConditionManager();
                const condition: Condition = {
                    property: 'date',
                    type: 'greaterThanOrEqual',
                    value: 'today'
                };

                const result = await conditionManager.evaluateCondition(condition, action as any);
                expect(result).toBe(false);
            } finally {
                jest.useRealTimers();
            }
        });
    });

    describe('Intégration : tri des tables via le fallback property.read', () => {
        test('PLANTE : getNestedPropertyValue retombe sur read() quand la métadonnée est vide', async () => {
            // Une action avec animations datées mais PAS de date stockée
            const action = makeAction(
                { date: undefined },
                [{ date: '2026-03-26' }, { date: '2026-03-27' }]
            );

            const tableConfig: any = {
                title: 'Test',
                columns: [{ name: 'Date', propertyName: 'date' }]
            };
            const table = new DynamicTable([action as any], tableConfig, vault);

            const value = await (table as any).getNestedPropertyValue(action, 'date');
            expect(value).toBe('2026-03-26 to 2026-03-27');
        });

        test('la valeur stockée reste prioritaire pour le tri quand elle existe', async () => {
            const action = makeAction(
                { date: '2026-01-15' },
                [{ date: '2026-03-26' }]
            );

            const tableConfig: any = {
                title: 'Test',
                columns: [{ name: 'Date', propertyName: 'date' }]
            };
            const table = new DynamicTable([action as any], tableConfig, vault);

            const value = await (table as any).getNestedPropertyValue(action, 'date');
            expect(value).toBe('2026-01-15');
        });
    });
});
