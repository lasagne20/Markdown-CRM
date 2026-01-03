/**
 * @jest-environment jsdom
 */

import { NumberDisplay } from '../../src/display/NumberDisplay';
import { DisplayRenderer } from '../../src/display/DisplayRenderer';
import { NumberDisplayItem } from '../../src/Config/interfaces';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { mockApp } from '../utils/mocks';
import { PropertyNavigator } from '../../src/utils/PropertyNavigator';

// Mock class for testing array indexing
class MockTestFile extends Classe {
    constructor(vault: Vault, fileName: string, private mockData: { [key: string]: any }) {
        super(vault);
        this.fileName = fileName;
    }

    private fileName: string;

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

    async getMetadata(): Promise<Record<string, any>> {
        return this.mockData;
    }
}

describe('NumberDisplay - Array Indexing Tests', () => {
    let mockVault: Vault;
    
    beforeEach(() => {
        mockVault = {
            app: mockApp,
            listFiles: async () => [],
            getFromLink: async () => undefined,
        } as any;
    });

    describe('Array indexing with NumberDisplay', () => {
        test('should calculate sum from array element property clients[0].budget', async () => {
            const file1 = new MockTestFile(mockVault, 'file1', {
                budget: 1000,
                montant: 500,
                clients: [
                    { name: 'Client A', budget: 100 },
                    { name: 'Client B', budget: 200 }
                ]
            });
            const file2 = new MockTestFile(mockVault, 'file2', {
                budget: 2000,
                montant: 300,
                clients: [
                    { name: 'Client C', budget: 150 },
                    { name: 'Client D', budget: 250 }
                ]
            });

            const renderer = new DisplayRenderer(mockVault, {}, file1, undefined);
            (renderer as any).getFilesForTable = async () => [file1, file2];

            const numberItem: NumberDisplayItem = {
                type: 'number',
                source: { class: 'TestFile' },
                formula: 'sum',
                propertyName: 'clients[0].budget'
            };

            const result = await (renderer as any).renderNumber(numberItem);
            expect(result).toBeTruthy();
            
            const textContent = result.querySelector('text')?.textContent;
            expect(textContent).toBe('250'); // 100 + 150
        });

        test('should count array elements using clients[0].name', async () => {
            const file1 = new MockTestFile(mockVault, 'file1', {
                budget: 1000,
                montant: 500,
                clients: [
                    { name: 'Client A' },
                    { name: 'Client B' }
                ]
            });
            const file2 = new MockTestFile(mockVault, 'file2', {
                budget: 2000,
                montant: 300,
                clients: [
                    { name: 'Client C' }
                ]
            });

            const renderer = new DisplayRenderer(mockVault, {}, file1, undefined);
            (renderer as any).getFilesForTable = async () => [file1, file2];

            const numberItem: NumberDisplayItem = {
                type: 'number',
                source: { class: 'TestFile' },
                formula: 'count',
                propertyName: 'clients[0].name'
            };

            const result = await (renderer as any).renderNumber(numberItem);
            expect(result).toBeTruthy();
            
            const textContent = result.querySelector('text')?.textContent;
            expect(textContent).toBe('2'); // Both files have clients[0].name
        });

        test('should handle array index out of bounds gracefully', async () => {
            const file1 = new MockTestFile(mockVault, 'file1', {
                budget: 1000,
                montant: 500,
                clients: [
                    { name: 'Client A' }
                ]
            });
            const file2 = new MockTestFile(mockVault, 'file2', {
                budget: 2000,
                montant: 300,
                clients: [] // Empty array
            });

            const renderer = new DisplayRenderer(mockVault, {}, file1, undefined);
            (renderer as any).getFilesForTable = async () => [file1, file2];

            const numberItem: NumberDisplayItem = {
                type: 'number',
                source: { class: 'TestFile' },
                formula: 'count',
                propertyName: 'clients[5].name' // Index out of bounds
            };

            const result = await (renderer as any).renderNumber(numberItem);
            expect(result).toBeTruthy();
            
            const textContent = result.querySelector('text')?.textContent;
            expect(textContent).toBe('0'); // No valid values found
        });

        test('should calculate average from nested array property clients[0].budget', async () => {
            const file1 = new MockTestFile(mockVault, 'file1', {
                budget: 1000,
                montant: 500,
                clients: [
                    { name: 'Client A', budget: 100 },
                    { name: 'Client B', budget: 200 }
                ]
            });
            const file2 = new MockTestFile(mockVault, 'file2', {
                budget: 2000,
                montant: 300,
                clients: [
                    { name: 'Client C', budget: 300 },
                    { name: 'Client D', budget: 400 }
                ]
            });
            const file3 = new MockTestFile(mockVault, 'file3', {
                budget: 3000,
                montant: 600,
                clients: [
                    { name: 'Client E', budget: 200 }
                ]
            });

            const renderer = new DisplayRenderer(mockVault, {}, file1, undefined);
            (renderer as any).getFilesForTable = async () => [file1, file2, file3];

            const numberItem: NumberDisplayItem = {
                type: 'number',
                source: { class: 'TestFile' },
                formula: 'avg',
                propertyName: 'clients[0].budget'
            };

            const result = await (renderer as any).renderNumber(numberItem);
            expect(result).toBeTruthy();
            
            const textContent = result.querySelector('text')?.textContent;
            expect(textContent).toBe('200'); // (100 + 300 + 200) / 3
        });

        test('should count distinct values from array elements clients[0].type', async () => {
            const file1 = new MockTestFile(mockVault, 'file1', {
                budget: 1000,
                montant: 500,
                clients: [
                    { name: 'Client A', type: 'Premium' },
                    { name: 'Client B', type: 'Standard' }
                ]
            });
            const file2 = new MockTestFile(mockVault, 'file2', {
                budget: 2000,
                montant: 300,
                clients: [
                    { name: 'Client C', type: 'Standard' },  // Standard again
                    { name: 'Client D', type: 'Basic' }
                ]
            });
            const file3 = new MockTestFile(mockVault, 'file3', {
                budget: 3000,
                montant: 600,
                clients: [
                    { name: 'Client E', type: 'Premium' }  // Premium again
                ]
            });

            const renderer = new DisplayRenderer(mockVault, {}, file1, undefined);
            (renderer as any).getFilesForTable = async () => [file1, file2, file3];

            const numberItem: NumberDisplayItem = {
                type: 'number',
                source: { class: 'TestFile' },
                formula: 'countDistinct',
                propertyName: 'clients[0].type'
            };

            const result = await (renderer as any).renderNumber(numberItem);
            expect(result).toBeTruthy();
            
            const textContent = result.querySelector('text')?.textContent;
            // File1: clients[0].type = 'Premium'
            // File2: clients[0].type = 'Standard'  
            // File3: clients[0].type = 'Premium'
            // Distinct values: Premium, Standard = 2
            expect(textContent).toBe('2'); // Premium and Standard (Basic is in clients[1], not counted)
        });

        test('should handle clients[1] (second element) correctly', async () => {
            const file1 = new MockTestFile(mockVault, 'file1', {
                budget: 1000,
                montant: 500,
                clients: [
                    { name: 'Client A', amount: 100 },
                    { name: 'Client B', amount: 200 }
                ]
            });
            const file2 = new MockTestFile(mockVault, 'file2', {
                budget: 2000,
                montant: 300,
                clients: [
                    { name: 'Client C', amount: 150 },
                    { name: 'Client D', amount: 250 }
                ]
            });

            const renderer = new DisplayRenderer(mockVault, {}, file1, undefined);
            (renderer as any).getFilesForTable = async () => [file1, file2];

            const numberItem: NumberDisplayItem = {
                type: 'number',
                source: { class: 'TestFile' },
                formula: 'sum',
                propertyName: 'clients[1].amount'
            };

            const result = await (renderer as any).renderNumber(numberItem);
            expect(result).toBeTruthy();
            
            const textContent = result.querySelector('text')?.textContent;
            expect(textContent).toBe('450'); // 200 + 250
        });

        test('should handle simple clients[0] without nested property', async () => {
            const file1 = new MockTestFile(mockVault, 'file1', {
                budget: 1000,
                montant: 500,
                clients: [
                    'Client A',
                    'Client B'
                ]
            });
            const file2 = new MockTestFile(mockVault, 'file2', {
                budget: 2000,
                montant: 300,
                clients: [
                    'Client C'
                ]
            });

            const renderer = new DisplayRenderer(mockVault, {}, file1, undefined);
            (renderer as any).getFilesForTable = async () => [file1, file2];

            const numberItem: NumberDisplayItem = {
                type: 'number',
                source: { class: 'TestFile' },
                formula: 'count',
                propertyName: 'clients[0]'
            };

            const result = await (renderer as any).renderNumber(numberItem);
            expect(result).toBeTruthy();
            
            const textContent = result.querySelector('text')?.textContent;
            expect(textContent).toBe('2'); // Both files have clients[0]
        });
    });
});
