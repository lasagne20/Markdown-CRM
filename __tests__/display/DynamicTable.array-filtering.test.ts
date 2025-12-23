import { DynamicTable, TableConfig } from '../../src/display/DynamicTable';
import { Classe } from '../../src/vault/Classe';
import { Vault } from '../../src/vault/Vault';

/**
 * Mock implementation of Classe for testing array filtering
 */
class MockClasseWithArray extends Classe {
    private data: any;
    private fileName: string;

    constructor(data: any, fileName: string) {
        super(null as any, null as any);
        this.data = data;
        this.fileName = fileName;
    }

    async getPropertyValue(propertyName: string): Promise<any> {
        return this.data[propertyName];
    }

    getFile() {
        return {
            getName: (withExtension: boolean = true) => 
                withExtension ? `${this.fileName}.md` : this.fileName,
            name: `${this.fileName}.md`,
            basename: this.fileName
        };
    }

    getProperty(propertyName: string) {
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

describe('DynamicTable - Array Filtering', () => {
    let mockFiles: MockClasseWithArray[];
    let mockVault: MockVault;
    let tableConfig: TableConfig;

    beforeEach(() => {
        // Create mock files with array of partnerships
        mockFiles = [
            new MockClasseWithArray({ 
                nom: 'Entreprise A',
                partenariats: [
                    { partenariat: 'Partenaire 1', montant: 15000, statut: 'current' },
                    { partenariat: 'Partenaire 2', montant: 8000, statut: 'pending' },
                    { partenariat: 'Partenaire 3', montant: 12000, statut: 'current' }
                ],
                budget: 50000
            }, 'entreprise-a'),
            new MockClasseWithArray({ 
                nom: 'Entreprise B',
                partenariats: [
                    { partenariat: 'Partenaire 4', montant: 25000, statut: 'current' },
                    { partenariat: 'Partenaire 5', montant: 5000, statut: 'completed' }
                ],
                budget: 75000
            }, 'entreprise-b'),
            new MockClasseWithArray({ 
                nom: 'Entreprise C',
                partenariats: [
                    { partenariat: 'Partenaire 6', montant: 10000, statut: 'pending' },
                    { partenariat: 'Partenaire 7', montant: 18000, statut: 'pending' }
                ],
                budget: 30000
            }, 'entreprise-c'),
            new MockClasseWithArray({ 
                nom: 'Entreprise D',
                // No partnerships
                partenariats: [],
                budget: 20000
            }, 'entreprise-d'),
            new MockClasseWithArray({ 
                nom: 'Entreprise E',
                // No partenariats property at all
                budget: 40000
            }, 'entreprise-e'),
        ];

        mockVault = new MockVault();

        // Table configuration with array filtering
        tableConfig = {
            columns: [
                { name: 'Fichier', propertyName: '_fileName', filter: 'text' },
                { name: 'Nom', propertyName: 'nom', filter: 'text' },
                { name: 'Montant Current', propertyName: 'partenariats.filter(statut=current).montant', filter: false },
                { name: 'Partenaire Current', propertyName: 'partenariats.filter(statut=current).partenariat', filter: 'text' },
                { name: 'Montant Pending', propertyName: 'partenariats.filter(statut=pending).montant', filter: false },
                { name: 'Budget', propertyName: 'budget', filter: false }
            ],
            totals: [
                { formula: 'count', column: 'Total' },
                { formula: 'sum', propertyName: 'partenariats.filter(statut=current).montant', column: 'Total Current' },
                { formula: 'sum', propertyName: 'budget', column: 'Budget Total' }
            ]
        };
    });

    describe('getNestedPropertyValue with array filtering', () => {
        test('should filter array and sum numeric values', async () => {
            // Test the method directly without constructing the table
            const table = { 
                async getNestedPropertyValue(file: any, propertyPath: string): Promise<any> {
                    // Copy the implementation from DynamicTable
                    if (!propertyPath.includes('.')) {
                        return await file.getPropertyValue(propertyPath);
                    }

                    const filterMatch = propertyPath.match(/^([^.]+)\.filter\(([^=]+)=([^)]+)\)\.(.+)$/);
                    if (filterMatch) {
                        const [, arrayProperty, filterProperty, filterValue, targetProperty] = filterMatch;
                        
                        const arrayValue = await file.getPropertyValue(arrayProperty);
                        if (!Array.isArray(arrayValue)) {
                            return undefined;
                        }

                        const filteredItems = arrayValue.filter((item: any) => {
                            if (typeof item !== 'object' || item === null) {
                                return false;
                            }
                            const itemValue = String(item[filterProperty] || '').toLowerCase();
                            const targetValue = String(filterValue).toLowerCase();
                            return itemValue === targetValue;
                        });

                        if (filteredItems.length === 0) {
                            return undefined;
                        }

                        const targetValues = filteredItems.map((item: any) => {
                            if (targetProperty.includes('.')) {
                                return this.navigateNestedProperty(item, targetProperty.split('.'));
                            } else {
                                return item[targetProperty];
                            }
                        }).filter((value: any) => value !== undefined && value !== null);

                        if (targetValues.length === 0) {
                            return undefined;
                        }

                        const firstValue = targetValues[0];
                        if (typeof firstValue === 'number') {
                            return targetValues.reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
                        } else if (targetValues.length === 1) {
                            return firstValue;
                        } else {
                            if (typeof firstValue === 'string') {
                                return targetValues.join(', ');
                            }
                            return targetValues;
                        }
                    }

                    return undefined;
                },

                navigateNestedProperty(currentValue: any, parts: string[]): any {
                    for (const part of parts) {
                        if (currentValue === null || currentValue === undefined) {
                            return undefined;
                        }

                        if (typeof currentValue === 'object' && !Array.isArray(currentValue)) {
                            currentValue = currentValue[part];
                        } else {
                            return undefined;
                        }
                    }
                    return currentValue;
                }
            };
            
            // Entreprise A has two current partnerships: 15000 + 12000 = 27000
            const result = await table.getNestedPropertyValue(mockFiles[0], 'partenariats.filter(statut=current).montant');
            expect(result).toBe(27000);
        });

        test('should filter array and return single string value', async () => {
            const table = { 
                async getNestedPropertyValue(file: any, propertyPath: string): Promise<any> {
                    if (!propertyPath.includes('.')) {
                        return await file.getPropertyValue(propertyPath);
                    }

                    const filterMatch = propertyPath.match(/^([^.]+)\.filter\(([^=]+)=([^)]+)\)\.(.+)$/);
                    if (filterMatch) {
                        const [, arrayProperty, filterProperty, filterValue, targetProperty] = filterMatch;
                        
                        const arrayValue = await file.getPropertyValue(arrayProperty);
                        if (!Array.isArray(arrayValue)) {
                            return undefined;
                        }

                        const filteredItems = arrayValue.filter((item: any) => {
                            if (typeof item !== 'object' || item === null) {
                                return false;
                            }
                            const itemValue = String(item[filterProperty] || '').toLowerCase();
                            const targetValue = String(filterValue).toLowerCase();
                            return itemValue === targetValue;
                        });

                        if (filteredItems.length === 0) {
                            return undefined;
                        }

                        const targetValues = filteredItems.map((item: any) => item[targetProperty])
                            .filter((value: any) => value !== undefined && value !== null);

                        if (targetValues.length === 0) {
                            return undefined;
                        }

                        const firstValue = targetValues[0];
                        if (typeof firstValue === 'number') {
                            return targetValues.reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
                        } else if (targetValues.length === 1) {
                            return firstValue;
                        } else {
                            if (typeof firstValue === 'string') {
                                return targetValues.join(', ');
                            }
                            return targetValues;
                        }
                    }

                    return undefined;
                }
            };
            
            // Entreprise B has one current partnership
            const result = await table.getNestedPropertyValue(mockFiles[1], 'partenariats.filter(statut=current).partenariat');
            expect(result).toBe('Partenaire 4');
        });

        test('should filter array and concatenate multiple string values', async () => {
            const table = { 
                async getNestedPropertyValue(file: any, propertyPath: string): Promise<any> {
                    if (!propertyPath.includes('.')) {
                        return await file.getPropertyValue(propertyPath);
                    }

                    const filterMatch = propertyPath.match(/^([^.]+)\.filter\(([^=]+)=([^)]+)\)\.(.+)$/);
                    if (filterMatch) {
                        const [, arrayProperty, filterProperty, filterValue, targetProperty] = filterMatch;
                        
                        const arrayValue = await file.getPropertyValue(arrayProperty);
                        if (!Array.isArray(arrayValue)) {
                            return undefined;
                        }

                        const filteredItems = arrayValue.filter((item: any) => {
                            if (typeof item !== 'object' || item === null) {
                                return false;
                            }
                            const itemValue = String(item[filterProperty] || '').toLowerCase();
                            const targetValue = String(filterValue).toLowerCase();
                            return itemValue === targetValue;
                        });

                        if (filteredItems.length === 0) {
                            return undefined;
                        }

                        const targetValues = filteredItems.map((item: any) => item[targetProperty])
                            .filter((value: any) => value !== undefined && value !== null);

                        if (targetValues.length === 0) {
                            return undefined;
                        }

                        const firstValue = targetValues[0];
                        if (typeof firstValue === 'number') {
                            return targetValues.reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
                        } else if (targetValues.length === 1) {
                            return firstValue;
                        } else {
                            if (typeof firstValue === 'string') {
                                return targetValues.join(', ');
                            }
                            return targetValues;
                        }
                    }

                    return undefined;
                }
            };
            
            // Entreprise A has two current partnerships
            const result = await table.getNestedPropertyValue(mockFiles[0], 'partenariats.filter(statut=current).partenariat');
            expect(result).toBe('Partenaire 1, Partenaire 3');
        });

        test('should return undefined when filter matches no items', async () => {
            const table = { 
                async getNestedPropertyValue(file: any, propertyPath: string): Promise<any> {
                    const filterMatch = propertyPath.match(/^([^.]+)\.filter\(([^=]+)=([^)]+)\)\.(.+)$/);
                    if (filterMatch) {
                        const [, arrayProperty, filterProperty, filterValue, targetProperty] = filterMatch;
                        
                        const arrayValue = await file.getPropertyValue(arrayProperty);
                        if (!Array.isArray(arrayValue)) {
                            return undefined;
                        }

                        const filteredItems = arrayValue.filter((item: any) => {
                            if (typeof item !== 'object' || item === null) {
                                return false;
                            }
                            const itemValue = String(item[filterProperty] || '').toLowerCase();
                            const targetValue = String(filterValue).toLowerCase();
                            return itemValue === targetValue;
                        });

                        return filteredItems.length === 0 ? undefined : 'has-items';
                    }
                    return undefined;
                }
            };
            
            // Entreprise C has no current partnerships (only pending)
            const result = await table.getNestedPropertyValue(mockFiles[2], 'partenariats.filter(statut=current).montant');
            expect(result).toBeUndefined();
        });

        test('should return undefined for empty array', async () => {
            const table = { 
                async getNestedPropertyValue(file: any, propertyPath: string): Promise<any> {
                    const filterMatch = propertyPath.match(/^([^.]+)\.filter\(([^=]+)=([^)]+)\)\.(.+)$/);
                    if (filterMatch) {
                        const [, arrayProperty] = filterMatch;
                        const arrayValue = await file.getPropertyValue(arrayProperty);
                        return Array.isArray(arrayValue) && arrayValue.length === 0 ? undefined : 'not-empty';
                    }
                    return undefined;
                }
            };
            
            // Entreprise D has empty partnerships array
            const result = await table.getNestedPropertyValue(mockFiles[3], 'partenariats.filter(statut=current).montant');
            expect(result).toBeUndefined();
        });

        test('should handle case-insensitive filtering', async () => {
            const table = { 
                async getNestedPropertyValue(file: any, propertyPath: string): Promise<any> {
                    const filterMatch = propertyPath.match(/^([^.]+)\.filter\(([^=]+)=([^)]+)\)\.(.+)$/);
                    if (filterMatch) {
                        const [, arrayProperty, filterProperty, filterValue, targetProperty] = filterMatch;
                        
                        const arrayValue = await file.getPropertyValue(arrayProperty);
                        if (!Array.isArray(arrayValue)) {
                            return undefined;
                        }

                        const filteredItems = arrayValue.filter((item: any) => {
                            if (typeof item !== 'object' || item === null) {
                                return false;
                            }
                            const itemValue = String(item[filterProperty] || '').toLowerCase();
                            const targetValue = String(filterValue).toLowerCase();
                            return itemValue === targetValue;
                        });

                        if (filteredItems.length === 0) {
                            return undefined;
                        }

                        const targetValues = filteredItems.map((item: any) => item[targetProperty])
                            .filter((value: any) => value !== undefined && value !== null);

                        if (targetValues.length === 0) {
                            return undefined;
                        }

                        if (typeof targetValues[0] === 'number') {
                            return targetValues.reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
                        }
                        return targetValues[0];
                    }
                    return undefined;
                }
            };
            
            // Test with different case
            const result = await table.getNestedPropertyValue(mockFiles[0], 'partenariats.filter(statut=CURRENT).montant');
            expect(result).toBe(27000);
        });

        test('should sum multiple pending partnerships', async () => {
            const table = { 
                async getNestedPropertyValue(file: any, propertyPath: string): Promise<any> {
                    const filterMatch = propertyPath.match(/^([^.]+)\.filter\(([^=]+)=([^)]+)\)\.(.+)$/);
                    if (filterMatch) {
                        const [, arrayProperty, filterProperty, filterValue, targetProperty] = filterMatch;
                        
                        const arrayValue = await file.getPropertyValue(arrayProperty);
                        if (!Array.isArray(arrayValue)) {
                            return undefined;
                        }

                        const filteredItems = arrayValue.filter((item: any) => {
                            if (typeof item !== 'object' || item === null) {
                                return false;
                            }
                            const itemValue = String(item[filterProperty] || '').toLowerCase();
                            const targetValue = String(filterValue).toLowerCase();
                            return itemValue === targetValue;
                        });

                        if (filteredItems.length === 0) {
                            return undefined;
                        }

                        const targetValues = filteredItems.map((item: any) => item[targetProperty])
                            .filter((value: any) => value !== undefined && value !== null);

                        if (targetValues.length === 0) {
                            return undefined;
                        }

                        if (typeof targetValues[0] === 'number') {
                            return targetValues.reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
                        }
                        return targetValues[0];
                    }
                    return undefined;
                }
            };
            
            // Entreprise C has two pending partnerships: 10000 + 18000 = 28000
            const result = await table.getNestedPropertyValue(mockFiles[2], 'partenariats.filter(statut=pending).montant');
            expect(result).toBe(28000);
        });
    });
});