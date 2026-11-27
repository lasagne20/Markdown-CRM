/**
 * @jest-environment jsdom
 *
 * Bug 3 (Tier 1) : DynamicTable triait les colonnes en localeCompare pur —
 * "10" < "9" en lexicographique. Les colonnes numériques (montants,
 * compteurs) et les dates doivent trier naturellement.
 *
 * Contrat attendu : tri croissant de ["9", "10", "100", "2"] →
 * ["2", "9", "10", "100"] (et l'inverse en décroissant).
 */

import { DynamicTable } from '../../src/display/DynamicTable';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { mockApp } from '../utils/mocks';

class NumericTestClass extends Classe {
    constructor(vault: Vault, fileName: string, montant: string) {
        super(vault);
        this.fileName = fileName;
        this.mockData = { montant };
    }

    private fileName: string;
    private mockData: { [key: string]: any };

    override getName(withExtension: boolean = true): string {
        return withExtension ? `${this.fileName}.md` : this.fileName;
    }

    override getFile() {
        return {
            getName: (withExtension: boolean = true) => withExtension ? `${this.fileName}.md` : this.fileName,
            name: `${this.fileName}.md`,
            basename: this.fileName,
            getFolderPath: () => 'Test',
            getPath: () => `Test/${this.fileName}.md`,
        } as any;
    }

    async getPropertyValue(propertyName: string): Promise<any> {
        return this.mockData[propertyName] ?? '';
    }

    getProperty(name: string) {
        return null;
    }
}

describe('DynamicTable - tri numérique naturel', () => {
    let vault: Vault;

    beforeEach(() => {
        vault = new Vault(mockApp(), { vaultPath: './test-vault' } as any);
    });

    const buildFiles = () => ([
        new NumericTestClass(vault, 'fichier-9', '9'),
        new NumericTestClass(vault, 'fichier-10', '10'),
        new NumericTestClass(vault, 'fichier-100', '100'),
        new NumericTestClass(vault, 'fichier-2', '2'),
    ]);

    const applyDefaultSort = (table: DynamicTable) => {
        // Le constructeur n'enregistre que le tri par défaut ; le tri des
        // fichiers lui-même est appliqué par applySortToFiles
        const sort = (table as any).tableData.currentSort;
        expect(sort.column).toBeDefined();
        return (table as any).applySortToFiles(sort.column);
    };

    it('tri croissant : 2 < 9 < 10 < 100 (et non 10 < 2 < 9)', async () => {
        const config = {
            columns: [
                { name: 'Montant', propertyName: 'montant', sort: 'asc' as const }
            ]
        };

        const table = new DynamicTable(buildFiles(), config, vault);
        await applyDefaultSort(table);
        const order = (table as any).tableData.files
            .map((f: NumericTestClass) => f.getName(false));

        expect(order).toEqual(['fichier-2', 'fichier-9', 'fichier-10', 'fichier-100']);
    });

    it('tri décroissant : 100 > 10 > 9 > 2', async () => {
        const config = {
            columns: [
                { name: 'Montant', propertyName: 'montant', sort: 'desc' as const }
            ]
        };

        const table = new DynamicTable(buildFiles(), config, vault);
        await applyDefaultSort(table);
        const order = (table as any).tableData.files
            .map((f: NumericTestClass) => f.getName(false));

        expect(order).toEqual(['fichier-100', 'fichier-10', 'fichier-9', 'fichier-2']);
    });

    it('les colonnes texte continuent de trier alphabétiquement', async () => {
        const files = [
            new NumericTestClass(vault, 'b-file', 'X'),
            new NumericTestClass(vault, 'a-file', 'X'),
        ];
        const config = {
            columns: [
                { name: 'Fichier', propertyName: '_fileName', sort: 'asc' as const }
            ]
        };

        const table = new DynamicTable(files, config, vault);
        await applyDefaultSort(table);
        const order = (table as any).tableData.files
            .map((f: NumericTestClass) => f.getName(false));

        expect(order).toEqual(['a-file', 'b-file']);
    });
});
