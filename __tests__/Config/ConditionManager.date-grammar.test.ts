/**
 * @jest-environment jsdom
 *
 * Grammaire des valeurs de condition sur propriétés date :
 * mots-clés relatifs avec offset optionnel.
 *
 *   today / yesterday / tomorrow   (+/-N en jours)
 *   startOfYear / endOfYear         (+/-N en années)
 *   startOfMonth / endOfMonth      (+/-N en mois)
 *
 * Exemple d'usage (Chiffre d'affaires de l'année en cours) :
 *   - property: date
 *     type: greaterThanOrEqual
 *     value: startOfYear
 *   - property: date
 *     type: lessThanOrEqual
 *     value: endOfYear
 */

import { ConditionManager, Condition } from '../../src/Config/ConditionManager';
import { Classe } from '../../src/vault/Classe';
import { DateProperty } from '../../src/properties/DateProperty';
import { Vault } from '../../src/vault/Vault';
import { mockApp } from '../utils/mocks';

describe('ConditionManager - grammaire des valeurs de date', () => {
    let conditionManager: ConditionManager;
    let mockClasseInstance: Classe;
    let vault: Vault;
    let dateProperty: DateProperty;

    beforeEach(() => {
        conditionManager = new ConditionManager();
        const app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);

        dateProperty = new DateProperty('date', vault, [], { icon: 'calendar' });

        mockClasseInstance = {
            getProperty: jest.fn().mockReturnValue(dateProperty),
            getName: jest.fn().mockReturnValue('TestClasse'),
            getPath: jest.fn().mockReturnValue('test/path/TestClasse.md'),
            getAllProperties: jest.fn().mockReturnValue({ date: dateProperty })
        } as any;
    });

    beforeEach(() => {
        // Date système déterministe : 19 octobre 2026, 12:00 UTC
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-10-19T12:00:00Z'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    const evaluate = async (type: Condition['type'], value: any, propertyValue: any): Promise<boolean> => {
        dateProperty.read = jest.fn().mockResolvedValue(propertyValue);
        const condition: Condition = { property: 'date', type, value };
        return await conditionManager.evaluateCondition(condition, mockClasseInstance);
    };

    describe('startOfYear / endOfYear', () => {
        test('PLANTE : startOfYear vaut le 1er janvier de l\'année en cours', async () => {
            expect(await evaluate('greaterThanOrEqual', 'startOfYear', '2026-01-01')).toBe(true);
            expect(await evaluate('greaterThanOrEqual', 'startOfYear', '2025-12-31')).toBe(false);
        });

        test('PLANTE : endOfYear vaut le 31 décembre de l\'année en cours', async () => {
            expect(await evaluate('lessThanOrEqual', 'endOfYear', '2026-12-31')).toBe(true);
            expect(await evaluate('lessThanOrEqual', 'endOfYear', '2027-01-01')).toBe(false);
        });

        test('PLANTE : une date de l\'année en cours passe le filtre startOfYear..endOfYear', async () => {
            const inYear = await evaluate('greaterThanOrEqual', 'startOfYear', '2026-05-15');
            const notAfter = await evaluate('lessThanOrEqual', 'endOfYear', '2026-05-15');
            expect(inYear && notAfter).toBe(true);
        });

        test('PLANTE : offsets en années - startOfYear+1 = 1er janvier de l\'année prochaine', async () => {
            expect(await evaluate('greaterThanOrEqual', 'startOfYear+1', '2027-01-01')).toBe(true);
            expect(await evaluate('greaterThanOrEqual', 'startOfYear+1', '2026-12-31')).toBe(false);
        });

        test('PLANTE : offsets en années - endOfYear-1 = 31 décembre de l\'année précédente', async () => {
            expect(await evaluate('lessThanOrEqual', 'endOfYear-1', '2025-12-31')).toBe(true);
            expect(await evaluate('lessThanOrEqual', 'endOfYear-1', '2026-01-01')).toBe(false);
        });
    });

    describe('startOfMonth / endOfMonth', () => {
        test('PLANTE : startOfMonth vaut le 1er du mois en cours, endOfMonth son dernier jour', async () => {
            // 19 octobre 2026 -> octobre 2026
            expect(await evaluate('greaterThanOrEqual', 'startOfMonth', '2026-10-01')).toBe(true);
            expect(await evaluate('greaterThanOrEqual', 'startOfMonth', '2026-09-30')).toBe(false);
            expect(await evaluate('lessThanOrEqual', 'endOfMonth', '2026-10-31')).toBe(true);
            expect(await evaluate('lessThanOrEqual', 'endOfMonth', '2026-11-01')).toBe(false);
        });

        test('PLANTE : offsets en mois - startOfMonth+1 = 1er du mois suivant', async () => {
            expect(await evaluate('greaterThanOrEqual', 'startOfMonth+1', '2026-11-01')).toBe(true);
            expect(await evaluate('greaterThanOrEqual', 'startOfMonth+1', '2026-10-31')).toBe(false);
        });
    });

    describe('offsets sur today / yesterday / tomorrow', () => {
        test('PLANTE : today+7 accepte une date dans 7 jours', async () => {
            expect(await evaluate('greaterThanOrEqual', 'today+7', '2026-10-26')).toBe(true);
            expect(await evaluate('greaterThanOrEqual', 'today+7', '2026-10-25')).toBe(false);
        });

        test('PLANTE : today-3 accepte une date d\'il y a 3 jours ou plus', async () => {
            expect(await evaluate('lessThanOrEqual', 'today-3', '2026-10-16')).toBe(true);
            expect(await evaluate('lessThanOrEqual', 'today-3', '2026-10-17')).toBe(false);
        });

        test('today / yesterday / tomorrow continuent de fonctionner (régression)', async () => {
            expect(await evaluate('greaterThanOrEqual', 'today', '2026-10-19')).toBe(true);
            expect(await evaluate('greaterThanOrEqual', 'yesterday', '2026-10-18')).toBe(true);
            expect(await evaluate('lessThanOrEqual', 'tomorrow', '2026-10-20')).toBe(true);
        });
    });
});
