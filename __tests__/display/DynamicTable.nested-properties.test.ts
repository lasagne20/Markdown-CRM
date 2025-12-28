import { DynamicTable, TableConfig } from '../../src/display/DynamicTable';
import { Classe } from '../../src/vault/Classe';
import { Vault } from '../../src/vault/Vault';

/**
 * Mock implementation of Classe for testing nested properties
 */
class MockClasseWithNested extends Classe {
    public data: any;
    private fileName: string;

    constructor(data: any, fileName: string) {
        super(null as any, null as any);
        this.data = data;
        this.fileName = fileName;
    }

    async getPropertyValue(propertyName: string): Promise<any> {
        return this.data[propertyName];
    }

    getFile(): any {
        return {
            getName: (withExtension: boolean = true) => 
                withExtension ? `${this.fileName}.md` : this.fileName,
            name: `${this.fileName}.md`,
            basename: this.fileName
        };
    }

    getProperty(propertyName: string): any {
        // Return null to fallback to text display
        return undefined;
    }
}

/**
 * Mock implementation of Vault for testing
 */
class MockVault {
    getConfiguration() {
        return {
            locale: {
                currency: 'EUR',
                currencySymbol: '€',
                number: {
                    decimal: ',',
                    thousands: ' '
                }
            }
        };
    }
}

describe('DynamicTable - Nested Properties', () => {
    let mockFiles: MockClasseWithNested[];
    let mockVault: MockVault;
    let tableConfig: TableConfig;

    beforeEach(() => {
        // Create mock files with nested object structures
        mockFiles = [
            new MockClasseWithNested({ 
                nom: 'Entreprise A',
                partenariats: {
                    partenariat: 'Partenaire 1',
                    montant: 15000,
                    statut: 'current'
                },
                budget: 50000
            }, 'entreprise-a'),
            new MockClasseWithNested({ 
                nom: 'Entreprise B',
                partenariats: {
                    partenariat: 'Partenaire 2', 
                    montant: 25000,
                    statut: 'pending'
                },
                budget: 75000
            }, 'entreprise-b'),
            new MockClasseWithNested({ 
                nom: 'Entreprise C',
                partenariats: {
                    partenariat: 'Partenaire 3',
                    montant: 10000,
                    statut: 'current'
                },
                budget: 30000
            }, 'entreprise-c'),
            new MockClasseWithNested({ 
                nom: 'Entreprise D',
                // Test case without partenariats property
                budget: 20000
            }, 'entreprise-d'),
        ];

        mockVault = new MockVault();

        // Table configuration with nested properties
        tableConfig = {
            columns: [
                { name: 'Fichier', propertyName: '_fileName', filter: 'text' },
                { name: 'Nom', propertyName: 'nom', filter: 'text' },
                { name: 'Partenaire', propertyName: 'partenariats.partenariat', filter: 'text' },
                { name: 'Montant Partenariat', propertyName: 'partenariats.montant', filter: false },
                { name: 'Statut Partenariat', propertyName: 'partenariats.statut', filter: 'select' },
                { name: 'Budget', propertyName: 'budget', filter: false }
            ],
            totals: [
                { formula: 'count', column: 'Total' },
                { formula: 'sum', propertyName: 'partenariats.montant', column: 'Total Partenariats' },
                { formula: 'sum', propertyName: 'budget', column: 'Budget Total' }
            ]
        };
    });

    describe('getNestedPropertyValue method', () => {
        test('should return simple property values', async () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            const getNestedPropertyValue = (table as any).getNestedPropertyValue.bind(table);
            
            const result = await getNestedPropertyValue(mockFiles[0], 'nom');
            expect(result).toBe('Entreprise A');
        });

        test('should return nested property values with dot notation', async () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            const getNestedPropertyValue = (table as any).getNestedPropertyValue.bind(table);
            
            const montant = await getNestedPropertyValue(mockFiles[0], 'partenariats.montant');
            expect(montant).toBe(15000);
            
            const partenaire = await getNestedPropertyValue(mockFiles[1], 'partenariats.partenariat');
            expect(partenaire).toBe('Partenaire 2');
            
            const statut = await getNestedPropertyValue(mockFiles[2], 'partenariats.statut');
            expect(statut).toBe('current');
        });

        test('should return undefined for missing nested properties', async () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            const getNestedPropertyValue = (table as any).getNestedPropertyValue.bind(table);
            
            // File without partenariats property
            const result = await getNestedPropertyValue(mockFiles[3], 'partenariats.montant');
            expect(result).toBeUndefined();
        });

        test('should return undefined for deeply nested missing properties', async () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            const getNestedPropertyValue = (table as any).getNestedPropertyValue.bind(table);
            
            const result = await getNestedPropertyValue(mockFiles[0], 'partenariats.details.contact');
            expect(result).toBeUndefined();
        });

        test('should handle null/undefined intermediate values gracefully', async () => {
            const fileWithNullProperty = new MockClasseWithNested({ 
                nom: 'Test',
                partenariats: null
            }, 'test-null');
            
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            const getNestedPropertyValue = (table as any).getNestedPropertyValue.bind(table);
            
            const result = await getNestedPropertyValue(fileWithNullProperty, 'partenariats.montant');
            expect(result).toBeUndefined();
        });
    });

    describe('filtering with nested properties', () => {
        test('should filter by nested property values', async () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            // Filter by partenariat status
            (table as any).tableData.filters.set(4, 'current'); // column index 4 = partenariats.statut
            
            const getFilteredFiles = (table as any).getFilteredFiles.bind(table);
            const result = await getFilteredFiles();
            
            expect(result).toHaveLength(2);
            expect(result[0].getFile().getName(false)).toBe('entreprise-a');
            expect(result[1].getFile().getName(false)).toBe('entreprise-c');
        });

        test('should filter by nested partenaire name', async () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            // Filter by partenaire name containing "Partenaire 2"
            (table as any).tableData.filters.set(2, 'partenaire 2'); // column index 2 = partenariats.partenariat
            
            const getFilteredFiles = (table as any).getFilteredFiles.bind(table);
            const result = await getFilteredFiles();
            
            expect(result).toHaveLength(1);
            expect(result[0].getFile().getName(false)).toBe('entreprise-b');
        });

        test('should handle missing nested properties in filtering', async () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            // Filter by property that some files don't have
            (table as any).tableData.filters.set(3, '15000'); // column index 3 = partenariats.montant
            
            const getFilteredFiles = (table as any).getFilteredFiles.bind(table);
            const result = await getFilteredFiles();
            
            expect(result).toHaveLength(1);
            expect(result[0].getFile().getName(false)).toBe('entreprise-a');
        });
    });

    describe('totals with nested properties', () => {
        test('should calculate sum of nested numeric properties', async () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            const totalConfig = { 
                formula: 'sum', 
                propertyName: 'partenariats.montant', 
                column: 'Total Partenariats' 
            };
            
            const calculateTotal = (table as any).calculateTotal.bind(table);
            const result = await calculateTotal(totalConfig);
            
            // Sum: 15000 + 25000 + 10000 = 50000 (entreprise-d has no partenariats)
            expect(result).toContain('50');
            expect(result).toContain('000');
            expect(result).toContain('€');
        });

        test('should handle missing nested properties in totals', async () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            // Add a file without nested property structure
            const fileWithoutNested = new MockClasseWithNested({ 
                nom: 'Entreprise E',
                budget: 40000
                // No partenariats property
            }, 'entreprise-e');
            
            (table as any).tableData.files.push(fileWithoutNested);
            
            const totalConfig = { 
                formula: 'sum', 
                propertyName: 'partenariats.montant', 
                column: 'Total Partenariats' 
            };
            
            const calculateTotal = (table as any).calculateTotal.bind(table);
            const result = await calculateTotal(totalConfig);
            
            // Should still sum only valid values, ignoring undefined
            expect(result).toContain('50');
            expect(result).toContain('000');
            expect(result).toContain('€');
        });

        test('should calculate average of nested properties', async () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            const totalConfig = { 
                formula: 'average', 
                propertyName: 'partenariats.montant', 
                column: 'Moyenne Partenariats' 
            };
            
            const calculateTotal = (table as any).calculateTotal.bind(table);
            const result = await calculateTotal(totalConfig);
            
            // Average: (15000 + 25000 + 10000) / 3 = 16666.67
            expect(result).toContain('16');
            expect(result).toContain('666');
        });

        test('should return zero for sum when no valid nested values found', async () => {
            const filesWithoutValues = [
                new MockClasseWithNested({ nom: 'Test 1' }, 'test1'),
                new MockClasseWithNested({ nom: 'Test 2' }, 'test2')
            ];
            
            const table = new DynamicTable(filesWithoutValues, tableConfig, mockVault as any);
            
            const totalConfig = { 
                formula: 'sum', 
                propertyName: 'partenariats.montant', 
                column: 'Total' 
            };
            
            const calculateTotal = (table as any).calculateTotal.bind(table);
            const result = await calculateTotal(totalConfig);
            
            expect(result).toBe('0');
        });
    });
});