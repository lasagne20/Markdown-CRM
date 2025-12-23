import { DynamicTable, TableConfig } from '../../src/display/DynamicTable';
import { Classe } from '../../src/vault/Classe';

/**
 * Mock implementation of Classe for DOM testing
 */
class MockClasseForDOM extends Classe {
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
        return null;
    }
}

/**
 * Mock Vault for DOM testing
 */
class MockVaultForDOM {
    getPath(): string {
        return '/mock/vault/path';
    }
    
    getName(): string {
        return 'MockVault';
    }
}

describe('DynamicTable - DOM Calculation Methods', () => {
    let mockFiles: MockClasseForDOM[];
    let mockVault: MockVaultForDOM;
    let tableConfig: TableConfig;

    beforeEach(() => {
        // Create mock files with test data
        mockFiles = [
            new MockClasseForDOM({ 
                nom: 'Projet A', 
                budget: 1500, 
                statut: 'En cours'
            }, 'projet-a.md'),
            new MockClasseForDOM({ 
                nom: 'Projet B', 
                budget: 2500, 
                statut: 'Terminé'
            }, 'projet-b.md'),
            new MockClasseForDOM({ 
                nom: 'Projet C', 
                budget: 3000, 
                statut: 'En cours'
            }, 'projet-c.md'),
        ];

        mockVault = new MockVaultForDOM();

        tableConfig = {
            columns: [
                { name: 'Fichier', propertyName: '_fileName', filter: 'text' },
                { name: 'Nom', propertyName: 'nom', filter: 'text' },
                { name: 'Budget', propertyName: 'budget', filter: false },
                { name: 'Statut', propertyName: 'statut', filter: 'select' }
            ],
            totals: [
                { formula: 'count', column: 'Total' },
                { formula: 'sum', propertyName: 'budget', column: 'Budget Total' }
            ]
        };
    });

    describe('calculateTotalFromDOM method', () => {
        test('should calculate count from DOM rows', () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            // Create a mock tbody with 3 rows
            const tbody = document.createElement('tbody');
            for (let i = 0; i < 3; i++) {
                const row = document.createElement('tr');
                tbody.appendChild(row);
            }

            const calculateTotalFromDOM = (table as any).calculateTotalFromDOM.bind(table);
            const result = calculateTotalFromDOM({ formula: 'count' }, tbody);
            
            expect(result).toBe('3');
        });

        test('should calculate sum from DOM cell values', () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            // Create mock tbody with budget values
            const tbody = document.createElement('tbody');
            const budgetValues = ['1 500,00 €', '2 500,00 €', '3 000,00 €'];
            
            budgetValues.forEach(budgetValue => {
                const row = document.createElement('tr');
                
                // Add filename cell
                const fileCell = document.createElement('td');
                fileCell.textContent = 'test-file';
                row.appendChild(fileCell);
                
                // Add name cell
                const nameCell = document.createElement('td');
                nameCell.textContent = 'Test Project';
                row.appendChild(nameCell);
                
                // Add budget cell (index 2)
                const budgetCell = document.createElement('td');
                budgetCell.textContent = budgetValue;
                row.appendChild(budgetCell);
                
                // Add status cell
                const statusCell = document.createElement('td');
                statusCell.textContent = 'En cours';
                row.appendChild(statusCell);
                
                tbody.appendChild(row);
            });

            const calculateTotalFromDOM = (table as any).calculateTotalFromDOM.bind(table);
            const result = calculateTotalFromDOM(
                { formula: 'sum', propertyName: 'budget' }, 
                tbody
            );
            
            expect(result).toBe('7\u202F000,00\u00A0€'); // Use correct French formatting
        });

        test('should calculate average from DOM cell values', () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            // Create mock tbody with budget values for average calculation
            const tbody = document.createElement('tbody');
            const budgetValues = ['1000', '2000', '3000']; // Simple numeric values
            
            budgetValues.forEach(budgetValue => {
                const row = document.createElement('tr');
                
                // Add cells to match column structure
                const fileCell = document.createElement('td');
                fileCell.textContent = 'test-file';
                row.appendChild(fileCell);
                
                const nameCell = document.createElement('td');
                nameCell.textContent = 'Test Project';
                row.appendChild(nameCell);
                
                const budgetCell = document.createElement('td');
                budgetCell.textContent = budgetValue;
                row.appendChild(budgetCell);
                
                tbody.appendChild(row);
            });

            const calculateTotalFromDOM = (table as any).calculateTotalFromDOM.bind(table);
            const result = calculateTotalFromDOM(
                { formula: 'average', propertyName: 'budget' }, 
                tbody
            );
            
            expect(result).toBe('2\u202F000');
        });

        test('should calculate min from DOM cell values', () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            const tbody = document.createElement('tbody');
            const budgetValues = ['1 500,00 €', '500,00 €', '3 000,00 €'];
            
            budgetValues.forEach(budgetValue => {
                const row = document.createElement('tr');
                
                // Match column structure
                ['test-file', 'Test Project', budgetValue, 'En cours'].forEach(cellValue => {
                    const cell = document.createElement('td');
                    cell.textContent = cellValue;
                    row.appendChild(cell);
                });
                
                tbody.appendChild(row);
            });

            const calculateTotalFromDOM = (table as any).calculateTotalFromDOM.bind(table);
            const result = calculateTotalFromDOM(
                { formula: 'min', propertyName: 'budget' }, 
                tbody
            );
            
            expect(result).toBe('500,00\u00A0€');
        });

        test('should calculate max from DOM cell values', () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            const tbody = document.createElement('tbody');
            const budgetValues = ['1 500,00 €', '500,00 €', '3 000,00 €'];
            
            budgetValues.forEach(budgetValue => {
                const row = document.createElement('tr');
                
                // Match column structure
                ['test-file', 'Test Project', budgetValue, 'En cours'].forEach(cellValue => {
                    const cell = document.createElement('td');
                    cell.textContent = cellValue;
                    row.appendChild(cell);
                });
                
                tbody.appendChild(row);
            });

            const calculateTotalFromDOM = (table as any).calculateTotalFromDOM.bind(table);
            const result = calculateTotalFromDOM(
                { formula: 'max', propertyName: 'budget' }, 
                tbody
            );
            
            expect(result).toBe('3\u202F000,00\u00A0€'); // Max should be 3000, not 1500
        });

        test('should handle empty cells gracefully', () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            const tbody = document.createElement('tbody');
            const budgetValues = ['1 000,00 €', '', '2 000,00 €'];
            
            budgetValues.forEach(budgetValue => {
                const row = document.createElement('tr');
                
                ['test-file', 'Test Project', budgetValue, 'En cours'].forEach(cellValue => {
                    const cell = document.createElement('td');
                    cell.textContent = cellValue;
                    row.appendChild(cell);
                });
                
                tbody.appendChild(row);
            });

            const calculateTotalFromDOM = (table as any).calculateTotalFromDOM.bind(table);
            const result = calculateTotalFromDOM(
                { formula: 'sum', propertyName: 'budget' }, 
                tbody
            );
            
            expect(result).toBe('3\u202F000,00\u00A0€');
        });

        test('should handle non-numeric values gracefully', () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            const tbody = document.createElement('tbody');
            const budgetValues = ['1 000,00 €', 'N/A', '2 000,00 €'];
            
            budgetValues.forEach(budgetValue => {
                const row = document.createElement('tr');
                
                ['test-file', 'Test Project', budgetValue, 'En cours'].forEach(cellValue => {
                    const cell = document.createElement('td');
                    cell.textContent = cellValue;
                    row.appendChild(cell);
                });
                
                tbody.appendChild(row);
            });

            const calculateTotalFromDOM = (table as any).calculateTotalFromDOM.bind(table);
            const result = calculateTotalFromDOM(
                { formula: 'sum', propertyName: 'budget' }, 
                tbody
            );
            
            expect(result).toBe('3\u202F000,00\u00A0€');
        });

        test('should return "-" when property not found', () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            const tbody = document.createElement('tbody');
            const row = document.createElement('tr');
            tbody.appendChild(row);

            const calculateTotalFromDOM = (table as any).calculateTotalFromDOM.bind(table);
            const result = calculateTotalFromDOM(
                { formula: 'sum', propertyName: 'nonexistent' }, 
                tbody
            );
            
            expect(result).toBe('-');
        });

        test('should return "-" when no propertyName provided for non-count formulas', () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            const tbody = document.createElement('tbody');
            const row = document.createElement('tr');
            tbody.appendChild(row);

            const calculateTotalFromDOM = (table as any).calculateTotalFromDOM.bind(table);
            const result = calculateTotalFromDOM(
                { formula: 'sum' }, // No propertyName
                tbody
            );
            
            expect(result).toBe('-');
        });

        test('should return "0" for sum when no valid values found', () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            const tbody = document.createElement('tbody');
            const row = document.createElement('tr');
            
            // Add cells but with no valid numeric values for budget
            ['test-file', 'Test Project', 'N/A', 'En cours'].forEach(cellValue => {
                const cell = document.createElement('td');
                cell.textContent = cellValue;
                row.appendChild(cell);
            });
            
            tbody.appendChild(row);

            const calculateTotalFromDOM = (table as any).calculateTotalFromDOM.bind(table);
            const result = calculateTotalFromDOM(
                { formula: 'sum', propertyName: 'budget' }, 
                tbody
            );
            
            expect(result).toBe('0');
        });

        test('should parse different currency formats correctly', () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            const tbody = document.createElement('tbody');
            const budgetValues = [
                '1 500,50 €',  // French format with space and comma
                '$2,000.00',   // US format
                '3000',        // Plain number
                '4 500.25'     // Mixed format
            ];
            
            budgetValues.forEach(budgetValue => {
                const row = document.createElement('tr');
                
                ['test-file', 'Test Project', budgetValue, 'En cours'].forEach(cellValue => {
                    const cell = document.createElement('td');
                    cell.textContent = cellValue;
                    row.appendChild(cell);
                });
                
                tbody.appendChild(row);
            });

            const calculateTotalFromDOM = (table as any).calculateTotalFromDOM.bind(table);
            const result = calculateTotalFromDOM(
                { formula: 'sum', propertyName: 'budget' }, 
                tbody
            );
            
            // 1500.5 + 2000 + 3000 + 4500.25 = 11000.75
            expect(result).toBe('11\u202F000,75\u00A0€');
        });
    });

    describe('isTestMode method', () => {
        test('should detect test mode correctly', () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            const isTestMode = (table as any).isTestMode.bind(table);
            
            // In Jest environment, this should return true
            const result = isTestMode();
            expect(typeof result).toBe('boolean');
            // In Jest, it should be true due to Node.js environment
            expect(result).toBe(true);
        });
    });

    describe('calculateTotal method logic', () => {
        test('should use file-based calculation when DOM rows mismatch filter count', async () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            // Apply a filter that should reduce the count
            (table as any).tableData.filters.set(3, 'terminé'); // Only 1 "Terminé" project
            
            // Mock a tbody that has more rows than filtered files
            const mockTable = table.getTable();
            const tbody = document.createElement('tbody');
            
            // Add 3 rows to DOM but filter should only show 1
            for (let i = 0; i < 3; i++) {
                const row = document.createElement('tr');
                tbody.appendChild(row);
            }
            mockTable.appendChild(tbody);
            
            const calculateTotal = (table as any).calculateTotal.bind(table);
            const result = await calculateTotal({ formula: 'count', column: 'Total' });
            
            // Should use file-based calculation and return 1 (filtered count)
            expect(result).toBe('1');
        });

        test('should fallback to file-based when no tbody exists', async () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            // Ensure no tbody exists in the table
            const mockTable = table.getTable();
            mockTable.innerHTML = '';
            
            const calculateTotal = (table as any).calculateTotal.bind(table);
            const result = await calculateTotal({ formula: 'count', column: 'Total' });
            
            // Should use file-based calculation
            expect(result).toBe('3');
        });

        test('should fallback to file-based when tbody is empty', async () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            // Create empty tbody
            const mockTable = table.getTable();
            const tbody = document.createElement('tbody');
            mockTable.appendChild(tbody);
            
            const calculateTotal = (table as any).calculateTotal.bind(table);
            const result = await calculateTotal({ formula: 'count', column: 'Total' });
            
            // Should use file-based calculation
            expect(result).toBe('3');
        });
    });

    describe('Currency and number formatting edge cases', () => {
        test('should handle decimal parsing correctly', () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            const tbody = document.createElement('tbody');
            const budgetValues = ['1 500,25 €', '2 000,75 €'];
            
            budgetValues.forEach(budgetValue => {
                const row = document.createElement('tr');
                ['test-file', 'Test Project', budgetValue, 'En cours'].forEach(cellValue => {
                    const cell = document.createElement('td');
                    cell.textContent = cellValue;
                    row.appendChild(cell);
                });
                tbody.appendChild(row);
            });

            const calculateTotalFromDOM = (table as any).calculateTotalFromDOM.bind(table);
            const result = calculateTotalFromDOM(
                { formula: 'sum', propertyName: 'budget' }, 
                tbody
            );
            
            // 1500.25 + 2000.75 = 3501
            expect(result).toBe('3\u202F501,00\u00A0€');
        });

        test('should handle whitespace in cell content', () => {
            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            
            const tbody = document.createElement('tbody');
            const row = document.createElement('tr');
            
            ['test-file', 'Test Project', '  1 500,00 €  ', 'En cours'].forEach(cellValue => {
                const cell = document.createElement('td');
                cell.textContent = cellValue;
                row.appendChild(cell);
            });
            
            tbody.appendChild(row);

            const calculateTotalFromDOM = (table as any).calculateTotalFromDOM.bind(table);
            const result = calculateTotalFromDOM(
                { formula: 'sum', propertyName: 'budget' }, 
                tbody
            );
            
            expect(result).toBe('1\u202F500,00\u00A0€');
        });
    });
});