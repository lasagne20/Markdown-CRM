/**
 * @jest-environment jsdom
 *
 * Tri d'une colonne SelectProperty : ordre de CONFIGURATION, pas alphabétique.
 *
 * Actuellement applySortToFiles compare avec localeCompare : trier "Etat"
 * donne Facturé, Payé, Piste, Réalisé... alors que la liste d'options de la
 * config définit l'ordre du workflow (Piste -> Réflexion -> Devis envoyé ->
 * Devis signé -> Réalisé -> Facturé -> Payé).
 *
 * Fix attendu : quand la propriété définit une liste `options` (SelectProperty),
 * le tri suit l'ordre des options ; les valeurs inconnues vont après les
 * valeurs connues, les vides restent en fin de tableau. Le tri alphabétique
 * reste le comportement par défaut pour les autres propriétés.
 */

import { DynamicTable } from '../../src/display/DynamicTable';
import { Classe } from '../../src/vault/Classe';
import { Vault } from '../../src/vault/Vault';

const ETAT_OPTIONS = [
    { name: 'Piste', color: 'gray' },
    { name: 'Réflexion', color: 'blue' },
    { name: 'Devis envoyé', color: 'orange' },
    { name: 'Devis signé', color: 'green' },
    { name: 'Réalisé', color: 'purple' },
    { name: 'Facturé', color: 'red' },
    { name: 'Payé', color: 'gold' }
];

class MockSelectClasse extends Classe {
    constructor(private etat: string) {
        super(null as any, null as any, null as any);
    }

    getFile(): any {
        return {
            name: `${this.etat}.md`,
            basename: this.etat,
            getName: (withExtension: boolean = true) => withExtension ? `${this.etat}.md` : this.etat
        };
    }

    getPath(): string {
        return `/${this.etat}.md`;
    }

    async getPropertyValue(propertyName: string): Promise<any> {
        return propertyName === 'etat' ? this.etat : undefined;
    }

    getProperty(propertyName: string): any {
        if (propertyName === 'etat') {
            const etat = this.etat;
            return {
                name: 'etat',
                type: 'select',
                options: ETAT_OPTIONS,
                getDisplay: async () => {
                    const span = document.createElement('span');
                    span.textContent = etat;
                    return span;
                }
            };
        }
        return null;
    }
}

describe('DynamicTable - tri par ordre des options (SelectProperty)', () => {
    let mockVault: Vault;

    beforeEach(() => {
        mockVault = {} as Vault;
    });

    const tableConfig = {
        columns: [
            { name: 'Etat', propertyName: 'etat', sort: true }
        ]
    };

    const statesOf = async (table: DynamicTable): Promise<string[]> =>
        await Promise.all(
            (table as any).tableData.files.map((f: MockSelectClasse) => f.getPropertyValue('etat'))
        );

    test('PLANTE : le tri ascendant suit l\'ordre des options de la config, pas l\'alphabet', async () => {
        const files = [
            new MockSelectClasse('Payé'),
            new MockSelectClasse('Piste'),
            new MockSelectClasse('Réalisé')
        ];
        const table = new DynamicTable(files as any, tableConfig, mockVault as any);
        (table as any).tableData.currentSort = { column: 1, ascending: true };

        await (table as any).applySortToFiles(1);

        expect(await statesOf(table)).toEqual(['Piste', 'Réalisé', 'Payé']);
    });

    test('PLANTE : le tri descendant inverse l\'ordre des options', async () => {
        const files = [
            new MockSelectClasse('Payé'),
            new MockSelectClasse('Piste'),
            new MockSelectClasse('Réalisé')
        ];
        const table = new DynamicTable(files as any, tableConfig, mockVault as any);
        (table as any).tableData.currentSort = { column: 1, ascending: false };

        await (table as any).applySortToFiles(1);

        expect(await statesOf(table)).toEqual(['Payé', 'Réalisé', 'Piste']);
    });

    test('PLANTE : valeurs inconnues après les valeurs connues, vides toujours en dernier', async () => {
        const files = [
            new MockSelectClasse('Inconnu'),
            new MockSelectClasse('Payé'),
            new MockSelectClasse(''),
            new MockSelectClasse('Piste')
        ];
        const table = new DynamicTable(files as any, tableConfig, mockVault as any);
        (table as any).tableData.currentSort = { column: 1, ascending: true };

        await (table as any).applySortToFiles(1);

        // Ordre des options d'abord (Piste < Payé), puis inconnues, puis vides
        expect(await statesOf(table)).toEqual(['Piste', 'Payé', 'Inconnu', '']);
    });

    test('régression : les propriétés sans liste d\'options restent triées alphabétiquement', async () => {
        class MockTextClasse extends MockSelectClasse {
            override getProperty(propertyName: string): any {
                return null;
            }
        }
        const files = [
            new MockTextClasse('Zèbre'),
            new MockTextClasse('Ananas')
        ];
        const table = new DynamicTable(files as any, tableConfig, mockVault as any);
        (table as any).tableData.currentSort = { column: 1, ascending: true };

        await (table as any).applySortToFiles(1);

        expect(await statesOf(table)).toEqual(['Ananas', 'Zèbre']);
    });
});
