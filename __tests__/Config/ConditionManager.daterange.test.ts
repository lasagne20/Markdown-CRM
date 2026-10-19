/**
 * @jest-environment jsdom
 *
 * Bug : les comparaisons de dates (greaterThan, lessThan, etc.) sur une
 * propriété RangeDateProperty (type "dateRange") ne convertissent pas la
 * valeur en timestamp : toNumericValueSmart ne détecte que type === 'date'.
 * Le fallback parseFloat("2026-03-10") = 2026 compare uniquement l'ANNÉE.
 *
 * Correction attendue : les dateRange sont convertis en timestamp du DÉBUT
 * de la plage ("YYYY-MM-DD to YYYY-MM-DD" -> timestamp du premier YYYY-MM-DD),
 * avec les mêmes formats de valeur de condition que les dates simples
 * ("2026", "2026-01-15", date parsable).
 */

import { ConditionManager, Condition } from '../../src/Config/ConditionManager';
import { Classe } from '../../src/vault/Classe';
import { DateProperty } from '../../src/properties/DateProperty';
import { RangeDateProperty } from '../../src/properties/RangeDateProperty';
import { Vault } from '../../src/vault/Vault';
import { mockApp } from '../utils/mocks';

describe('ConditionManager - comparaisons sur RangeDateProperty (dateRange)', () => {
    let conditionManager: ConditionManager;
    let mockClasseInstance: Classe;
    let vault: Vault;
    let rangeDateProperty: RangeDateProperty;
    let simpleDateProperty: DateProperty;

    beforeEach(() => {
        conditionManager = new ConditionManager();
        const app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);

        rangeDateProperty = new RangeDateProperty('date', vault, { icon: 'calendar' });
        simpleDateProperty = new DateProperty('dateSimple', vault, [], { icon: 'calendar' });

        mockClasseInstance = {
            getProperty: jest.fn(),
            getName: jest.fn().mockReturnValue('TestClasse'),
            getPath: jest.fn().mockReturnValue('test/path/TestClasse.md'),
            getAllProperties: jest.fn().mockReturnValue({
                date: rangeDateProperty,
                dateSimple: simpleDateProperty
            })
        } as any;

        (mockClasseInstance.getProperty as jest.Mock).mockImplementation((name: string) => {
            if (name === 'date') return rangeDateProperty;
            if (name === 'dateSimple') return simpleDateProperty;
            return undefined;
        });
    });

    describe('PLANTE : comparaisons fines (mois/jour) sur une plage de dates', () => {
        test('greaterThanOrEqual compare le début de plage, pas seulement l\'année', async () => {
            // Plage commençant le 10 mars, condition au 15 mars
            rangeDateProperty.read = jest.fn().mockResolvedValue('2026-03-10 to 2026-03-20');

            const condition: Condition = {
                property: 'date',
                type: 'greaterThanOrEqual',
                value: '2026-03-15'
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            // 10 mars < 15 mars -> FAUX (avant le fix : 2026 >= 2026 -> vrai)
            expect(result).toBe(false);
        });

        test('lessThan compare le début de plage, pas seulement l\'année', async () => {
            // Plage commençant le 10 janvier, condition au 15 janvier
            rangeDateProperty.read = jest.fn().mockResolvedValue('2026-01-10 to 2026-02-20');

            const condition: Condition = {
                property: 'date',
                type: 'lessThan',
                value: '2026-01-15'
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            // 10 janvier < 15 janvier -> VRAI (avant le fix : 2026 < 2026 -> faux)
            expect(result).toBe(true);
        });

        test('greaterThan avec une plage qui commence exactement à la date de condition', async () => {
            rangeDateProperty.read = jest.fn().mockResolvedValue('2026-03-15 to 2026-03-20');

            const condition: Condition = {
                property: 'date',
                type: 'greaterThan',
                value: '2026-03-15'
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            // Strictement supérieur : 15 mars > 15 mars -> FAUX
            expect(result).toBe(false);
        });
    });

    describe('Cohérence après correction', () => {
        test('greaterThanOrEqual vrai quand la plage commence après la date de condition', async () => {
            rangeDateProperty.read = jest.fn().mockResolvedValue('2026-03-16 to 2026-03-20');

            const condition: Condition = {
                property: 'date',
                type: 'greaterThanOrEqual',
                value: '2026-03-15'
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });

        test('valeur de condition en année seule ("2026") fonctionne sur dateRange', async () => {
            rangeDateProperty.read = jest.fn().mockResolvedValue('2026-03-10 to 2026-03-20');

            const condition: Condition = {
                property: 'date',
                type: 'greaterThanOrEqual',
                value: '2026'    // -> 1er janvier 2026
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            // 10 mars 2026 >= 1er janvier 2026 -> vrai
            expect(result).toBe(true);
        });

        test('dateRange avec une seule date (sans " to ") reste supporté', async () => {
            rangeDateProperty.read = jest.fn().mockResolvedValue('2026-03-10');

            const condition: Condition = {
                property: 'date',
                type: 'greaterThanOrEqual',
                value: '2026-03-10'
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });

        test('plage de dates en valeur de condition ("2026-01-01 to 2026-12-31") prend le début', async () => {
            rangeDateProperty.read = jest.fn().mockResolvedValue('2026-06-15 to 2026-06-20');

            const condition: Condition = {
                property: 'date',
                type: 'lessThanOrEqual',
                value: '2026-01-01 to 2026-12-31'
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            // 15 juin <= 1er janvier (début de la plage de condition) -> faux
            expect(result).toBe(false);
        });

        test('DateProperty simple (type date) : comportement inchangé', async () => {
            simpleDateProperty.read = jest.fn().mockResolvedValue('2024-12-31');

            const condition: Condition = {
                property: 'dateSimple',
                type: 'greaterThanOrEqual',
                value: '2024-12-31'
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });

        test('valeur non parsable -> condition fausse sans crash', async () => {
            rangeDateProperty.read = jest.fn().mockResolvedValue('n\'importe quoi');

            const condition: Condition = {
                property: 'date',
                type: 'greaterThan',
                value: '2026-01-01'
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(false);
        });
    });
});
