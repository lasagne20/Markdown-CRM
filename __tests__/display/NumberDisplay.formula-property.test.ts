/**
 * @jest-environment jsdom
 *
 * Bug : sum sur une FormulaProperty (ex: montant de Action) renvoie 0.
 *
 * FormulaProperty calcule sa valeur dans read() mais ne la persiste dans le
 * frontmatter QUE si write: true (défaut: false). NumberDisplay.calculateValue
 * lit via file.getPropertyValue() (métadonnées brutes) -> undefined -> sum 0.
 *
 * Correction : quand getPropertyValue ne renvoie rien pour une propriété
 * simple, retomber sur property.read(file) qui exécute la formule.
 */

import { NumberDisplay } from '../../src/display/NumberDisplay';
import { Vault } from '../../src/vault/Vault';
import { mockApp } from '../utils/mocks';

describe('NumberDisplay - sum sur FormulaProperty non persistée (write: false)', () => {
    let vault: Vault;

    beforeEach(() => {
        const app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);
    });

    // Instance mockée : la propriété 'montant' est une FormulaProperty
    // - getPropertyValue('montant') -> undefined (rien dans le frontmatter)
    // - getProperty('montant').read(file) -> "1234 €" (formule calculée à la volée)
    const makeActionWithFormula = (formulaResult: string | undefined) => ({
        getVault: () => vault,
        getPropertyValue: jest.fn(async () => undefined),
        getProperty: jest.fn((propName: string) =>
            propName === 'montant'
                ? { type: 'formula', read: jest.fn().mockResolvedValue(formulaResult) }
                : undefined
        )
    });

    test('PLANTE : sum additionne les valeurs calculées des FormulaProperty', async () => {
        const action1 = makeActionWithFormula('1234 €');
        const action2 = makeActionWithFormula('500 €');

        const value = await (NumberDisplay as any).calculateValue(
            [action1, action2],
            'sum',
            'montant',
            undefined,
            undefined,
            vault
        );

        // parseFloat("1234 €") = 1234, parseFloat("500 €") = 500
        expect(value).toBe(1734);
    });

    test('PLANTE : une seule action avec formule', async () => {
        const action = makeActionWithFormula('999 €');

        const value = await (NumberDisplay as any).calculateValue(
            [action],
            'sum',
            'montant',
            undefined,
            undefined,
            vault
        );

        expect(value).toBe(999);
    });

    test('PLANTE : countDistinct sur FormulaProperty calcule aussi via read', async () => {
        const action1 = makeActionWithFormula('1234 €');
        const action2 = makeActionWithFormula('1234 €');  // même valeur -> distinct
        const action3 = makeActionWithFormula('500 €');

        const value = await (NumberDisplay as any).calculateValue(
            [action1, action2, action3],
            'countDistinct',
            'montant',
            undefined,
            undefined,
            vault
        );

        // "1234 €" et "500 €" -> 2 valeurs distinctes
        expect(value).toBe(2);
    });

    test('une propriété stockée dans le frontmatter reste lue directement (pas de read)', async () => {
        const readSpy = jest.fn();
        const action = {
            getVault: () => vault,
            getPropertyValue: jest.fn(async (name: string) => name === 'tarif' ? 150 : undefined),
            getProperty: jest.fn((propName: string) =>
                propName === 'tarif'
                    ? { type: 'number', read: readSpy }
                    : undefined
            )
        };

        const value = await (NumberDisplay as any).calculateValue(
            [action],
            'sum',
            'tarif',
            undefined,
            undefined,
            vault
        );

        expect(value).toBe(150);
        // La valeur stockée suffit : read() ne doit pas être appelé
        expect(readSpy).not.toHaveBeenCalled();
    });

    test('formule qui retourne undefined -> exclu sans crash', async () => {
        const action = makeActionWithFormula(undefined);

        const value = await (NumberDisplay as any).calculateValue(
            [action],
            'sum',
            'montant',
            undefined,
            undefined,
            vault
        );

        expect(value).toBe(0);
    });

    test('les paths complexes ne déclenchent pas le fallback read', async () => {
        const readSpy = jest.fn();
        const action = {
            getVault: () => vault,
            getPropertyValue: jest.fn(async () => undefined),
            getProperty: jest.fn(() => ({ type: 'formula', read: readSpy }))
        };

        const value = await (NumberDisplay as any).calculateValue(
            [action],
            'sum',
            'financeurs.montant',   // path complexe : navigation standard uniquement
            undefined,
            undefined,
            vault
        );

        expect(value).toBe(0);
        expect(readSpy).not.toHaveBeenCalled();
    });
});
