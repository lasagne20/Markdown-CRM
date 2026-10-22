/**
 * @jest-environment jsdom
 *
 * Totaux de table sur des valeurs formatées (calcul via fichiers).
 *
 * Bug : une FormulaProperty peut renvoyer une valeur FORMATTÉE (ex: la
 * formule montant d'Action se termine par + ' €' -> "1000 €").
 * calculateTotalFromFiles faisait Number("1000 €") = NaN -> toutes les
 * valeurs étaient ignorées -> total '0', alors que calculateTotalFromDOM
 * parse correctement ces mêmes textes (symboles €/$, espaces, format
 * français).
 *
 * Fix attendu : le chemin fichiers partage le même nettoyage que le
 * chemin DOM (parseNumericValue), les chaînes formatées sont sommées.
 */

import { DynamicTable } from '../../src/display/DynamicTable';
import { Classe } from '../../src/vault/Classe';
import { Vault } from '../../src/vault/Vault';

/**
 * Mock d'une Classe dont la propriété "montant" est calculée par read()
 * (FormulaProperty) et renvoie une chaîne formatée avec suffixe €.
 */
class MockFormulaClasse extends Classe {
    private formattedMontant: string;

    constructor(formattedMontant: string) {
        super(null as any, null as any, null as any);
        this.formattedMontant = formattedMontant;
    }

    getFile(): any {
        return {
            name: 'test-action.md',
            basename: 'test-action',
            getName: (withExtension: boolean = true) => withExtension ? 'test-action.md' : 'test-action'
        };
    }

    getPath(): string {
        return '/test-action.md';
    }

    async getPropertyValue(propertyName: string): Promise<any> {
        // Le montant n'est PAS stocké dans les métadonnées (formule)
        return undefined;
    }

    getProperty(propertyName: string): any {
        if (propertyName === 'montant') {
            const self = this;
            return {
                name: 'montant',
                type: 'formula',
                read: async () => self.formattedMontant,
                getDisplay: async () => {
                    const span = document.createElement('span');
                    span.textContent = self.formattedMontant;
                    return span;
                }
            };
        }
        return null;
    }
}

describe('DynamicTable - totaux sur valeurs formatées (chemin fichiers)', () => {
    let mockVault: Vault;

    beforeEach(() => {
        mockVault = {} as Vault;
    });

    const tableConfig = {
        columns: [
            { name: 'Fichier', propertyName: '_fileName' },
            { name: 'Montant', propertyName: 'montant' }
        ],
        totals: [
            { formula: 'sum', propertyName: 'montant', column: 'Montant' }
        ]
    };

    const expectedCurrency = (value: number) =>
        value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

    test('PLANTE : sum additionne les valeurs formatées "1000 €" (formule avec suffixe)', async () => {
        const files = [
            new MockFormulaClasse('1000 €'),
            new MockFormulaClasse('1000 €')
        ];
        const table = new DynamicTable(files as any, tableConfig, mockVault as any);

        const calculateTotalFromFiles = (table as any).calculateTotalFromFiles.bind(table);
        const result = await calculateTotalFromFiles({ formula: 'sum', propertyName: 'montant' });

        expect(result).toBe(expectedCurrency(2000));
    });

    test('PLANTE : sum gère les formats mélangés (formaté, nombre pur, format français)', async () => {
        class MixedClasse extends MockFormulaClasse {
            private rawValue: any;
            constructor(rawValue: any) {
                super(String(rawValue));
                this.rawValue = rawValue;
            }
            override async getPropertyValue(propertyName: string): Promise<any> {
                if (propertyName === 'montant') {
                    return this.rawValue; // nombre pur pour certains fichiers
                }
                return undefined;
            }
        }

        const files = [
            new MockFormulaClasse('1 000,50 €'),
            new MixedClasse(499.5)
        ];
        const table = new DynamicTable(files as any, tableConfig, mockVault as any);

        const calculateTotalFromFiles = (table as any).calculateTotalFromFiles.bind(table);
        const result = await calculateTotalFromFiles({ formula: 'sum', propertyName: 'montant' });

        expect(result).toBe(expectedCurrency(1500));
    });

    test('régression DOM : calculateTotalFromDOM continue de sommer les cellules formatées', () => {
        const files = [
            new MockFormulaClasse('1000 €'),
            new MockFormulaClasse('1000 €')
        ];
        const table = new DynamicTable(files as any, tableConfig, mockVault as any);

        const tbody = document.createElement('tbody');
        ['1000 €', '1000 €'].forEach(montant => {
            const row = document.createElement('tr');
            const fileCell = document.createElement('td');
            fileCell.textContent = 'test-action.md';
            row.appendChild(fileCell);
            const montantCell = document.createElement('td');
            montantCell.textContent = montant;
            row.appendChild(montantCell);
            tbody.appendChild(row);
        });

        const calculateTotalFromDOM = (table as any).calculateTotalFromDOM.bind(table);
        const result = calculateTotalFromDOM({ formula: 'sum', propertyName: 'montant' }, tbody);

        expect(result).toBe(expectedCurrency(2000));
    });
});
