/**
 * @jest-environment jsdom
 */

import { NumberDisplay } from '../../src/display/NumberDisplay';
import { DisplayRenderer } from '../../src/display/DisplayRenderer';
import { NumberDisplayItem } from '../../src/Config/interfaces';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { NumberProperty } from '../../src/properties/NumberProperty';
import { SelectProperty } from '../../src/properties/SelectProperty';
import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { mockApp } from '../utils/mocks';

// Mock Action file with partenariats array
class MockActionFile extends Classe {
    constructor(vault: Vault, fileName: string, etat: string, partenariats: any[]) {
        super(vault);
        this.fileName = fileName;
        this.mockData = { etat, partenariats };
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

    getPath(): string {
        return `/vault/actions/${this.fileName}.md`;
    }

    async getMetadata(): Promise<Record<string, any>> {
        return this.mockData;
    }

    // Méthode publique pour accéder aux données dans les tests
    getMockData() {
        return this.mockData;
    }

    getProperty(name: string) {
        if (name === 'partenariats') {
            return new ObjectProperty('partenariats', this.vault, {}, { display: 'object' });
        }
        
        return {
            type: name === 'etat' ? 'select' : 'text',
            getDisplay: jest.fn().mockResolvedValue(document.createElement('span'))
        } as any;
    }
}

describe('NumberDisplay Complex Sum with Filtered Properties', () => {
    let vault: Vault;
    let mockFiles: MockActionFile[];
    let renderer: DisplayRenderer;
    let currentFile: MockActionFile;

    beforeEach(() => {
        const app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);
        
        // Create current file
        currentFile = new MockActionFile(vault, 'action-current', 'En cours', []);
        const currentPath = currentFile.getPath();
        
        // Create mock Action files with different states and partenariats
        mockFiles = [
            new MockActionFile(vault, 'action-1', 'En cours', [
                { partenariat: currentPath, montant: 1000 },
                { partenariat: '/other/file.md', montant: 500 }
            ]),
            new MockActionFile(vault, 'action-2', 'En cours', [
                { partenariat: currentPath, montant: 2000 },
                { partenariat: currentPath, montant: 1500 }
            ]),
            new MockActionFile(vault, 'action-3', 'Annulé', [
                { partenariat: currentPath, montant: 3000 } // Should be excluded by condition
            ]),
            new MockActionFile(vault, 'action-4', 'Terminé', [
                { partenariat: '/other/file.md', montant: 800 }, // Should be excluded by filter
                { partenariat: currentPath, montant: 2500 }
            ])
        ];

        const properties = {
            etat: new SelectProperty('etat', vault, []),
            partenariats: new ObjectProperty('partenariats', vault, {}, { display: 'object' })
        };

        Object.values(properties).forEach(prop => {
            (prop as any).getDisplay = jest.fn().mockResolvedValue(document.createElement('span'));
        });

        renderer = new DisplayRenderer(vault, properties, currentFile);
        
        // Mock getFilesForTable to return filtered files based on conditions
        (renderer as any).getFilesForTable = jest.fn().mockImplementation(async () => {
            // Simulate the source filtering:
            // 1. etat ≠ "Annulé"
            // 2. partenariats contains "current" (i.e., has partnership with current file)
            return mockFiles.filter(file => {
                // Check etat condition
                if (file.getMockData().etat === 'Annulé') {
                    return false;
                }
                
                // Check contains condition for partenariats
                const partenariats = file.getMockData().partenariats || [];
                const hasCurrentPartnership = partenariats.some((p: any) => 
                    p.partenariat === currentFile.getPath()
                );
                
                return hasCurrentPartnership;
            });
        });
    });

    test('should calculate sum of filtered properties with source conditions', async () => {
        const numberItem: NumberDisplayItem = {
            type: 'number',
            title: 'Total Partenariats',
            source: {
                class: 'Action',
                conditions: [
                    {
                        type: 'contains',
                        property: 'partenariats',
                        value: 'current'
                    },
                    {
                        type: 'notEquals',
                        property: 'etat',
                        value: 'Annulé'
                    }
                ]
            },
            formula: 'sum',
            propertyName: 'partenariats.filter(partenariat=$current).montant',
            unit: '€',
            label: 'Montant Total',
            max: 10000
        };

        const result = await (renderer as any).renderNumber(numberItem);
        
        expect(result).toBeTruthy();
        expect(result?.querySelector('h3')?.textContent).toBe('Total Partenariats');
        expect(result?.querySelector('.crm-number-display')).toBeTruthy();
        
        // Expected calculation:
        // action-1: [1000] (only current partenariat) = 1000
        // action-2: [2000, 1500] (both current partenariats) = 3500  
        // action-3: excluded by "Annulé" state
        // action-4: [2500] (only current partenariat) = 2500
        // Total: 1000 + 3500 + 2500 = 7000
        const svg = result?.querySelector('svg');
        const text = svg?.querySelector('text');
        expect(text?.textContent).toBe('7000€');
    });

    test('should handle empty filtered results gracefully', async () => {
        // Mock getFilesForTable to return files with no matching partenariats
        (renderer as any).getFilesForTable = jest.fn().mockResolvedValue([
            new MockActionFile(vault, 'empty-1', 'En cours', [
                { partenariat: '/other/file.md', montant: 1000 }
            ])
        ]);

        const numberItem: NumberDisplayItem = {
            type: 'number',
            source: { class: 'Action' },
            formula: 'sum',
            propertyName: 'partenariats.filter(partenariat=$current).montant',
            unit: '€'
        };

        const result = await (renderer as any).renderNumber(numberItem);
        
        expect(result).toBeTruthy();
        const svg = result?.querySelector('svg');
        const text = svg?.querySelector('text');
        expect(text?.textContent).toBe('0€');
    });

    test('should calculate progress with max value', async () => {
        const numberItem: NumberDisplayItem = {
            type: 'number',
            source: { class: 'Action' },
            formula: 'sum',
            propertyName: 'partenariats.filter(partenariat=$current).montant',
            max: 10000 // Total: 7000, so progress = 7000/10000 = 0.7 (70%)
        };

        const result = await (renderer as any).renderNumber(numberItem);
        
        expect(result).toBeTruthy();
        // The NumberDisplay should receive fillLevel = 0.7
        // We can verify the calculation by checking the rendered value
        const svg = result?.querySelector('svg');
        const text = svg?.querySelector('text');
        expect(text?.textContent).toBe('7000');
    });

    test('should work with different formula types on filtered properties', async () => {
        const avgNumberItem: NumberDisplayItem = {
            type: 'number',
            source: { class: 'Action' },
            formula: 'avg',
            propertyName: 'partenariats.filter(partenariat=$current).montant',
            unit: '€'
        };

        const result = await (renderer as any).renderNumber(avgNumberItem);
        
        expect(result).toBeTruthy();
        
        // Average of [1000, 2000, 1500, 2500] = 7000 / 4 = 1750
        const svg = result?.querySelector('svg');
        const text = svg?.querySelector('text');
        expect(text?.textContent).toBe('1750€');
    });

    test('should handle count formula on filtered properties', async () => {
        const countNumberItem: NumberDisplayItem = {
            type: 'number',
            source: { class: 'Action' },
            formula: 'count',
            propertyName: 'partenariats.filter(partenariat=$current).montant',
            label: 'Nombre de Partenariats'
        };

        const result = await (renderer as any).renderNumber(countNumberItem);
        
        expect(result).toBeTruthy();
        
        // Count of filtered partenariats: 4 items total
        const svg = result?.querySelector('svg');
        const text = svg?.querySelector('text');
        expect(text?.textContent).toBe('4');
    });

    test('should handle min/max formulas on filtered properties', async () => {
        const minNumberItem: NumberDisplayItem = {
            type: 'number',
            source: { class: 'Action' },
            formula: 'min',
            propertyName: 'partenariats.filter(partenariat=$current).montant',
            unit: '€'
        };

        const maxNumberItem: NumberDisplayItem = {
            type: 'number',
            source: { class: 'Action' },
            formula: 'max',
            propertyName: 'partenariats.filter(partenariat=$current).montant',
            unit: '€'
        };

        const minResult = await (renderer as any).renderNumber(minNumberItem);
        const maxResult = await (renderer as any).renderNumber(maxNumberItem);
        
        // Min: 1000, Max: 2500
        const minText = minResult?.querySelector('svg text')?.textContent;
        const maxText = maxResult?.querySelector('svg text')?.textContent;
        
        expect(minText).toBe('1000€');
        expect(maxText).toBe('2500€');
    });
});