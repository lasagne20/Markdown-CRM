import { DynamicTable, TableConfig } from '../../src/display/DynamicTable';
import { Classe } from '../../src/vault/Classe';
import { Vault } from '../../src/vault/Vault';

/**
 * Mock implementation of Classe for testing
 */
class MockClasse extends Classe {
    private mockData: Record<string, any>;
    private mockFile: any;

    constructor(data: Record<string, any>, fileName: string = 'test.md') {
        super(null as any, null as any, null as any);
        this.mockData = data;
        this.mockFile = {
            name: fileName,
            basename: fileName.replace(/\.md$/i, ''),
            getName: (withExtension: boolean = true) => withExtension ? fileName : fileName.replace(/\.md$/i, '')
        };
    }

    getFile() {
        return this.mockFile;
    }

    getPath() {
        return `/${this.mockFile.name}`;
    }

    async getPropertyValue(propertyName: string): Promise<any> {
        return this.mockData[propertyName];
    }

    getProperty(propertyName: string): any {
        // Return null for property objects - we'll test with raw values
        return null;
    }
}

/**
 * Mock implementation of Vault for testing
 */
class MockVault {
    // Simple mock without extending Vault to avoid constructor issues
    
    getPath(): string {
        return '/mock/vault/path';
    }
    
    getName(): string {
        return 'MockVault';
    }
}

describe('DynamicTable - Filtering and Totals', () => {
    let mockFiles: MockClasse[];
    let mockVault: MockVault;
    let tableConfig: TableConfig;

    beforeEach(() => {
        // Create mock files with test data
        mockFiles = [
            new MockClasse({ 
                nom: 'Projet A', 
                budget: 1000, 
                statut: 'En cours', 
                priorite: 1,
                equipe: 5
            }, 'projet-a.md'),
            new MockClasse({ 
                nom: 'Projet B', 
                budget: 2500, 
                statut: 'Terminé', 
                priorite: 2,
                equipe: 3
            }, 'projet-b.md'),
            new MockClasse({ 
                nom: 'Projet C', 
                budget: 1500, 
                statut: 'En cours', 
                priorite: 1,
                equipe: 4
            }, 'projet-c.md'),
            new MockClasse({ 
                nom: 'Test Project', 
                budget: 3000, 
                statut: 'Planifié', 
                priorite: 3,
                equipe: 6
            }, 'test-project.md'),
        ];

        mockVault = new MockVault();

        // Basic table configuration
        tableConfig = {
            columns: [
                { name: 'Fichier', propertyName: '_fileName' },
                { name: 'Nom', propertyName: 'nom' },
                { name: 'Budget', propertyName: 'budget' },
                { name: 'Statut', propertyName: 'statut' },
                { name: 'Équipe', propertyName: 'equipe' }
            ],
            totals: [
                { formula: 'count', column: 'Total' },
                { formula: 'sum', propertyName: 'budget', column: 'Budget Total' },
                { formula: 'average', propertyName: 'equipe', column: 'Équipe Moyenne' },
                { formula: 'min', propertyName: 'budget', column: 'Budget Min' },
                { formula: 'max', propertyName: 'budget', column: 'Budget Max' }
            ]
        };
    });

    describe('getFilteredFiles method', () => {
        test('should return all files when no filters are applied', async () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            // Access private method using type assertion
            const getFilteredFiles = (table as any).getFilteredFiles.bind(table);
            
            const result = await getFilteredFiles();
            expect(result).toHaveLength(4);
            expect(result).toEqual(mockFiles);
        });

        test('should filter by filename correctly', async () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            // Set filename filter
            (table as any).tableData.filters.set(0, 'projet'); // Column 0 is filename
            
            const getFilteredFiles = (table as any).getFilteredFiles.bind(table);
            const result = await getFilteredFiles();
            
            expect(result).toHaveLength(3);
            expect(result.every((file: any) => file.getFile().getName(false).toLowerCase().includes('projet'))).toBe(true);
        });

        test('should filter by property value correctly', async () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            // Set status filter - column 3 is statut
            (table as any).tableData.filters.set(3, 'en cours');
            
            const getFilteredFiles = (table as any).getFilteredFiles.bind(table);
            const result = await getFilteredFiles();
            
            expect(result).toHaveLength(2);
            for (const file of result) {
                const statut = await file.getPropertyValue('statut');
                expect(statut.toLowerCase()).toContain('en cours');
            }
        });

        test('should apply multiple filters correctly', async () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            // Set multiple filters
            (table as any).tableData.filters.set(0, 'projet'); // filename contains "projet"
            (table as any).tableData.filters.set(3, 'en cours'); // status is "en cours"
            
            const getFilteredFiles = (table as any).getFilteredFiles.bind(table);
            const result = await getFilteredFiles();
            
            expect(result).toHaveLength(2);
            expect(result[0].getFile().getName(false)).toBe('projet-a');
            expect(result[1].getFile().getName(false)).toBe('projet-c');
        });

        test('should return empty array when no files match filters', async () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            // Set filter that matches no files
            (table as any).tableData.filters.set(1, 'non-existent-project');
            
            const getFilteredFiles = (table as any).getFilteredFiles.bind(table);
            const result = await getFilteredFiles();
            
            expect(result).toHaveLength(0);
        });
    });

    describe('calculateTotal method', () => {
        test('should calculate count on all files when no filters applied', async () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            const calculateTotal = (table as any).calculateTotal.bind(table);
            const result = await calculateTotal({ formula: 'count', column: 'Total' });
            
            expect(result).toBe('4');
        });

        test('should calculate count on filtered files only', async () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            // Set filter to show only 2 files
            (table as any).tableData.filters.set(3, 'en cours');
            
            const calculateTotal = (table as any).calculateTotal.bind(table);
            const result = await calculateTotal({ formula: 'count', column: 'Total' });
            
            expect(result).toBe('2');
        });

        test('should calculate sum on all files when no filters applied', async () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            const calculateTotal = (table as any).calculateTotal.bind(table);
            const result = await calculateTotal({ 
                formula: 'sum', 
                propertyName: 'budget', 
                column: 'Budget Total' 
            });
            
            // Total budget: 1000 + 2500 + 1500 + 3000 = 8000
            expect(result).toBe('8 000,00 €');
        });

        test('should calculate sum on filtered files only', async () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            // Filter to show only "En cours" projects (budget: 1000 + 1500 = 2500)
            (table as any).tableData.filters.set(3, 'en cours');
            
            const calculateTotal = (table as any).calculateTotal.bind(table);
            const result = await calculateTotal({ 
                formula: 'sum', 
                propertyName: 'budget', 
                column: 'Budget Total' 
            });
            
            expect(result).toBe('2 500,00 €');
        });

        test('should calculate average on filtered files', async () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            // Filter to show only "En cours" projects (equipe: 5 + 4 = 9, average = 4.5)
            (table as any).tableData.filters.set(3, 'en cours');
            
            const calculateTotal = (table as any).calculateTotal.bind(table);
            const result = await calculateTotal({ 
                formula: 'average', 
                propertyName: 'equipe', 
                column: 'Équipe Moyenne' 
            });
            
            expect(result).toBe('4,5');
        });

        test('should calculate min on filtered files', async () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            // Filter to show only "En cours" projects (budget min: 1000)
            (table as any).tableData.filters.set(3, 'en cours');
            
            const calculateTotal = (table as any).calculateTotal.bind(table);
            const result = await calculateTotal({ 
                formula: 'min', 
                propertyName: 'budget', 
                column: 'Budget Min' 
            });
            
            expect(result).toBe('1 000,00 €');
        });

        test('should calculate max on filtered files', async () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            // Filter to show only "En cours" projects (budget max: 1500)
            (table as any).tableData.filters.set(3, 'en cours');
            
            const calculateTotal = (table as any).calculateTotal.bind(table);
            const result = await calculateTotal({ 
                formula: 'max', 
                propertyName: 'budget', 
                column: 'Budget Max' 
            });
            
            expect(result).toBe('1 500,00 €');
        });

        test('should handle empty filtered results', async () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            // Set filter that matches no files
            (table as any).tableData.filters.set(1, 'non-existent');
            
            const calculateTotal = (table as any).calculateTotal.bind(table);
            
            const countResult = await calculateTotal({ formula: 'count', column: 'Total' });
            expect(countResult).toBe('0');
            
            const sumResult = await calculateTotal({ 
                formula: 'sum', 
                propertyName: 'budget', 
                column: 'Budget Total' 
            });
            expect(sumResult).toBe('0');
        });

        test('should format currency values correctly', async () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            const calculateTotal = (table as any).calculateTotal.bind(table);
            const result = await calculateTotal({ 
                formula: 'sum', 
                propertyName: 'budget', 
                column: 'Budget Total' 
            });
            
            // Should be formatted as currency in French locale
            expect(result).toMatch(/€$/);
            expect(result).toBe('8 000,00 €');
        });

        test('should format non-currency numeric values correctly', async () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            const calculateTotal = (table as any).calculateTotal.bind(table);
            const result = await calculateTotal({ 
                formula: 'average', 
                propertyName: 'equipe', 
                column: 'Équipe Moyenne' 
            });
            
            // Should be formatted as number with French locale (comma for decimals)
            expect(result).toBe('4,5');
        });
    });

    describe('Integration: Filtering + Totals', () => {
        test('should update totals when filters change', async () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            await (table as any).buildTableStructure();
            
            const calculateTotal = (table as any).calculateTotal.bind(table);
            
            // Initially all files (count = 4, sum = 8000)
            let countResult = await calculateTotal({ formula: 'count', column: 'Total' });
            let sumResult = await calculateTotal({ 
                formula: 'sum', 
                propertyName: 'budget', 
                column: 'Budget Total' 
            });
            
            expect(countResult).toBe('4');
            expect(sumResult).toBe('8 000,00 €');
            
            // Apply filter for "En cours" projects (count = 2, sum = 2500)
            (table as any).tableData.filters.set(3, 'en cours');
            await (table as any).filterAndRender();
            
            countResult = await calculateTotal({ formula: 'count', column: 'Total' });
            sumResult = await calculateTotal({ 
                formula: 'sum', 
                propertyName: 'budget', 
                column: 'Budget Total' 
            });
            
            expect(countResult).toBe('2');
            expect(sumResult).toBe('2 500,00 €');
            
            // Change filter to "Terminé" projects (count = 1, sum = 2500)
            (table as any).tableData.filters.set(3, 'terminé');
            await (table as any).filterAndRender();
            
            countResult = await calculateTotal({ formula: 'count', column: 'Total' });
            sumResult = await calculateTotal({ 
                formula: 'sum', 
                propertyName: 'budget', 
                column: 'Budget Total' 
            });
            
            expect(countResult).toBe('1');
            expect(sumResult).toBe('2 500,00 €');
        });

        test('should handle complex multi-column filtering', async () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            const calculateTotal = (table as any).calculateTotal.bind(table);
            
            // Apply multiple filters: filename contains "projet" AND status contains "cours"
            (table as any).tableData.filters.set(0, 'projet'); // filename filter
            (table as any).tableData.filters.set(3, 'cours'); // status filter
            
            // Should match only "Projet A" and "Projet C" (both "En cours")
            const countResult = await calculateTotal({ formula: 'count', column: 'Total' });
            const sumResult = await calculateTotal({ 
                formula: 'sum', 
                propertyName: 'budget', 
                column: 'Budget Total' 
            });
            const avgResult = await calculateTotal({ 
                formula: 'average', 
                propertyName: 'equipe', 
                column: 'Équipe Moyenne' 
            });
            
            expect(countResult).toBe('2');
            expect(sumResult).toBe('2 500,00 €'); // 1000 + 1500
            expect(avgResult).toBe('4,5'); // (5 + 4) / 2
        });

        test('should maintain totals accuracy across filter changes', async () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            await (table as any).buildTableStructure();
            
            const calculateTotal = (table as any).calculateTotal.bind(table);
            
            // Test sequence of filter changes
            const testCases = [
                {
                    filter: { column: 3, value: 'en cours' },
                    expected: { count: '2', sum: '2 500,00 €' }
                },
                {
                    filter: { column: 3, value: 'terminé' },
                    expected: { count: '1', sum: '2 500,00 €' }
                },
                {
                    filter: { column: 3, value: 'planifié' },
                    expected: { count: '1', sum: '3 000,00 €' }
                },
                {
                    filter: { column: 0, value: 'test' },
                    expected: { count: '1', sum: '3 000,00 €' }
                }
            ];
            
            for (const testCase of testCases) {
                // Clear previous filters
                (table as any).tableData.filters.clear();
                
                // Apply new filter
                (table as any).tableData.filters.set(testCase.filter.column, testCase.filter.value);
                await (table as any).filterAndRender();
                
                const countResult = await calculateTotal({ formula: 'count', column: 'Total' });
                const sumResult = await calculateTotal({ 
                    formula: 'sum', 
                    propertyName: 'budget', 
                    column: 'Budget Total' 
                });
                
                expect(countResult).toBe(testCase.expected.count);
                expect(sumResult).toBe(testCase.expected.sum);
            }
        });
    });

    describe('Edge Cases', () => {
        test('should handle files with missing property values', async () => {
            const filesWithMissing = [
                ...mockFiles,
                new MockClasse({ 
                    nom: 'Incomplete Project',
                    // budget is missing
                    statut: 'En cours',
                    equipe: 2
                }, 'incomplete.md')
            ];
            
            const table = new DynamicTable(filesWithMissing, tableConfig, mockVault as any);
            
            const calculateTotal = (table as any).calculateTotal.bind(table);
            const result = await calculateTotal({ 
                formula: 'sum', 
                propertyName: 'budget', 
                column: 'Budget Total' 
            });
            
            // Should sum only files with valid budget values
            expect(result).toBe('8 000,00 €');
        });

        test('should handle non-numeric values in numeric calculations', async () => {
            const filesWithInvalidData = [
                new MockClasse({ 
                    nom: 'Project with invalid budget',
                    budget: 'not-a-number',
                    statut: 'En cours',
                    equipe: 'too-many'
                }, 'invalid.md'),
                ...mockFiles.slice(0, 2) // Only first 2 valid files
            ];
            
            const table = new DynamicTable(filesWithInvalidData, tableConfig, mockVault as any);
            
            const calculateTotal = (table as any).calculateTotal.bind(table);
            
            const budgetSum = await calculateTotal({ 
                formula: 'sum', 
                propertyName: 'budget', 
                column: 'Budget Total' 
            });
            
            const equipeAvg = await calculateTotal({ 
                formula: 'average', 
                propertyName: 'equipe', 
                column: 'Équipe Moyenne' 
            });
            
            // Should only include valid numeric values in calculations
            expect(budgetSum).toBe('3 500,00 €'); // 1000 + 2500
            expect(equipeAvg).toBe('4'); // (5 + 3) / 2
        });

        test('should handle empty dataset', async () => {
            const table = new DynamicTable([], tableConfig, mockVault as any);
            
            const calculateTotal = (table as any).calculateTotal.bind(table);
            
            const countResult = await calculateTotal({ formula: 'count', column: 'Total' });
            const sumResult = await calculateTotal({ 
                formula: 'sum', 
                propertyName: 'budget', 
                column: 'Budget Total' 
            });
            
            expect(countResult).toBe('0');
            expect(sumResult).toBe('0');
        });
    });
});