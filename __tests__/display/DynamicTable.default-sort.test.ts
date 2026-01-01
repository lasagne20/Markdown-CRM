/**
 * @jest-environment jsdom
 */

import { DynamicTable } from '../../src/display/DynamicTable';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { DateProperty } from '../../src/properties/DateProperty';
import { SelectProperty } from '../../src/properties/SelectProperty';
import { TextProperty } from '../../src/properties/TextProperty';
import { mockApp } from '../utils/mocks';

class DefaultSortTestClass extends Classe {
    constructor(vault: Vault, fileName: string, date: string, etat: string, description: string) {
        super(vault);
        this.fileName = fileName;
        this.mockData = {
            date,
            etat,
            description
        };
    }

    private fileName: string;
    private mockData: { [key: string]: any };

    getName(withExtension: boolean = true): string {
        return withExtension ? `${this.fileName}.md` : this.fileName;
    }

    getFile() {
        return {
            getName: (withExtension: boolean = true) => this.getName(withExtension),
            name: this.fileName,
            basename: this.fileName
        } as any;
    }

    async getPropertyValue(propertyName: string): Promise<any> {
        console.log(`🔍 Getting ${propertyName} from ${this.fileName}: ${this.mockData[propertyName]}`);
        return this.mockData[propertyName] || '';
    }

    getProperty(name: string) {
        const vault = this.vault;
        const properties = {
            date: new DateProperty('date', vault, ['DD/MM/YYYY']),
            etat: new SelectProperty('etat', vault, [
                { name: 'Devis signé', color: 'blue' },
                { name: 'Date validée', color: 'yellow' },
                { name: 'Réalisé', color: 'green' },
                { name: 'Facturé', color: 'orange' },
                { name: 'Payé', color: 'purple' }
            ]),
            description: new TextProperty('description', vault)
        };

        const property = properties[name as keyof typeof properties];
        if (property) {
            // Mock getDisplay method
            property.getDisplay = jest.fn().mockResolvedValue(document.createElement('span'));
        }
        return property || null;
    }
}

describe('DynamicTable - Default Sort Validation', () => {
    let vault: Vault;
    let mockFiles: DefaultSortTestClass[];

    beforeEach(() => {
        const app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);

        mockFiles = [
            new DefaultSortTestClass(vault, 'action-01', '2026-03-15', 'Devis signé', 'Formation équipe'),
            new DefaultSortTestClass(vault, 'action-02', '2026-01-20', 'Payé', 'Audit sécurité'),
            new DefaultSortTestClass(vault, 'action-03', '2026-02-10', 'Date validée', 'Mise à jour site'),
            new DefaultSortTestClass(vault, 'action-04', '2026-01-05', 'Réalisé', 'Analyse besoins'),
            new DefaultSortTestClass(vault, 'action-05', '2026-04-01', 'Facturé', 'Développement app')
        ];
    });

    test('should apply the last specified sort as default', async () => {
        console.log('🧪 Testing default sort from last column with sort specification...');

        const config = {
            columns: [
                {
                    name: 'Fichier',
                    propertyName: '_fileName',
                    sort: 'desc' as const // Premier sort spécifié
                },
                {
                    name: 'Etat',
                    propertyName: 'etat'
                    // Pas de sort
                },
                {
                    name: 'Date',
                    propertyName: 'date',
                    sort: 'asc' as const // Dernier sort spécifié - devrait être celui appliqué
                }
            ]
        };

        const table = new DynamicTable(mockFiles, config, vault);

        // Vérifier que le tri par défaut est appliqué à la colonne Date (index 2) en ordre croissant
        expect((table as any).tableData.currentSort.column).toBe(2);
        expect((table as any).tableData.currentSort.ascending).toBe(true);

        console.log(`✅ Default sort applied to column ${(table as any).tableData.currentSort.column} (Date) in ${(table as any).tableData.currentSort.ascending ? 'ascending' : 'descending'} order`);
    });

    test('should apply sort to first column when no later sort is specified', async () => {
        console.log('🧪 Testing default sort when only first column has sort...');

        const config = {
            columns: [
                {
                    name: 'Fichier',
                    propertyName: '_fileName',
                    sort: 'desc' as const // Seul sort spécifié
                },
                {
                    name: 'Etat',
                    propertyName: 'etat'
                    // Pas de sort
                },
                {
                    name: 'Date',
                    propertyName: 'date'
                    // Pas de sort non plus
                }
            ]
        };

        const table = new DynamicTable(mockFiles, config, vault);

        // Vérifier que le tri par défaut est appliqué à la colonne Fichier (index 0) en ordre décroissant
        expect((table as any).tableData.currentSort.column).toBe(0);
        expect((table as any).tableData.currentSort.ascending).toBe(false);

        console.log(`✅ Default sort applied to column ${(table as any).tableData.currentSort.column} (Fichier) in ${(table as any).tableData.currentSort.ascending ? 'ascending' : 'descending'} order`);
    });

    test('should override earlier sorts with later ones', async () => {
        console.log('🧪 Testing sort override with multiple sort specifications...');

        const config = {
            columns: [
                {
                    name: 'Fichier',
                    propertyName: '_fileName',
                    sort: 'asc' as const // Premier sort
                },
                {
                    name: 'Etat',
                    propertyName: 'etat',
                    sort: 'desc' as const // Deuxième sort
                },
                {
                    name: 'Date',
                    propertyName: 'date',
                    sort: 'asc' as const // Troisième sort - devrait être celui appliqué
                },
                {
                    name: 'Description',
                    propertyName: 'description'
                    // Pas de sort
                }
            ]
        };

        const table = new DynamicTable(mockFiles, config, vault);

        // Vérifier que c'est le dernier sort spécifié qui est appliqué (Date, index 2, asc)
        expect((table as any).tableData.currentSort.column).toBe(2);
        expect((table as any).tableData.currentSort.ascending).toBe(true);

        console.log(`✅ Latest sort applied to column ${(table as any).tableData.currentSort.column} (Date) in ${(table as any).tableData.currentSort.ascending ? 'ascending' : 'descending'} order`);
    });

    test('should have no default sort when no sort is specified', async () => {
        console.log('🧪 Testing no default sort when no sort specifications...');

        const config = {
            columns: [
                {
                    name: 'Fichier',
                    propertyName: '_fileName'
                    // Pas de sort
                },
                {
                    name: 'Etat',
                    propertyName: 'etat'
                    // Pas de sort
                },
                {
                    name: 'Date',
                    propertyName: 'date'
                    // Pas de sort
                }
            ]
        };

        const table = new DynamicTable(mockFiles, config, vault);

        // Vérifier qu'aucun tri par défaut n'est appliqué
        expect((table as any).tableData.currentSort.column).toBe(-1);

        console.log(`✅ No default sort applied when no sort specifications exist`);
    });

    test('should validate real world configuration from user example', async () => {
        console.log('🧪 Testing exact configuration from user example...');

        // Configuration exacte de l'exemple utilisateur
        const config = {
            columns: [
                {
                    name: "Fichier",
                    propertyName: "_fileName"
                    // Pas de sort dans l'exemple original
                },
                {
                    name: "Etat",
                    propertyName: "etat"
                    // Pas de sort
                },
                {
                    name: "Date",
                    propertyName: "date",
                    sort: "asc" as const // Seul sort spécifié
                }
            ]
        };

        const table = new DynamicTable(mockFiles, config, vault);

        // Vérifier que le tri est appliqué à la colonne Date (index 2) en ordre croissant
        expect((table as any).tableData.currentSort.column).toBe(2);
        expect((table as any).tableData.currentSort.ascending).toBe(true);

        console.log(`✅ User example configuration: Date column (index 2) sorted ascending by default`);
        console.log(`✅ This validates that the last 'sort' specification takes precedence`);
    });
});