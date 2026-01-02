/**
 * @jest-environment jsdom
 */

import { DisplayRenderer } from '../../src/display/DisplayRenderer';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { NumberDisplayItem } from '../../src/Config/interfaces';
import { mockApp } from '../utils/mocks';

// Mock classes for testing nested links
class MockInstitution extends Classe {
    constructor(vault: Vault, name: string, lieu: string) {
        super(vault);
        this.fileName = name;
        this.mockData = { lieu };
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
        return this.mockData[propertyName];
    }
}

class MockClient extends Classe {
    constructor(vault: Vault, name: string, institution: string, montant: number) {
        super(vault);
        this.fileName = name;
        this.mockData = { institution, montant };
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
        return this.mockData[propertyName];
    }
}

class MockProject extends Classe {
    constructor(vault: Vault, name: string, clients: any[]) {
        super(vault);
        this.fileName = name;
        this.mockData = { clients };
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
        return this.mockData[propertyName];
    }
}

describe('PropertyNavigator - Nested Links Support', () => {
    let vault: Vault;
    let institutionParis: MockInstitution;
    let institutionLyon: MockInstitution;
    let client1: MockClient;
    let client2: MockClient;
    let project: MockProject;

    beforeEach(() => {
        vault = new Vault(mockApp as any, { vaultPath: './test-vault' } as any);

        // Create institutions
        institutionParis = new MockInstitution(vault, 'Institution-Paris', 'Paris');
        institutionLyon = new MockInstitution(vault, 'Institution-Lyon', 'Lyon');

        // Mock vault.getFromLink to return institutions
        vault.getFromLink = jest.fn(async (link: string) => {
            if (link === '[[Institution-Paris]]') {
                return institutionParis;
            }
            if (link === '[[Institution-Lyon]]') {
                return institutionLyon;
            }
            return undefined;
        });

        // Create clients with links to institutions
        client1 = new MockClient(vault, 'Client-1', '[[Institution-Paris]]', 1000);
        client2 = new MockClient(vault, 'Client-2', '[[Institution-Lyon]]', 2000);

        // Create project with array of clients
        project = new MockProject(vault, 'Project-1', [
            { institution: '[[Institution-Paris]]', montant: 1000 },
            { institution: '[[Institution-Lyon]]', montant: 2000 }
        ]);
    });

    describe('PropertyNavigator.getNestedProperty with links', () => {
        test('should resolve link property and access nested field', async () => {
            const renderer = new DisplayRenderer(vault, {}, client1, undefined);
            
            // Instead of just getting 'institution', get a property from the linked institution
            const mockContext = {
                institution: '[[Institution-Paris]]'
            };
            
            const result = await (renderer as any).propertyNavigator.getNestedProperty(mockContext, 'institution.lieu');
            
            expect(result).toBe('Paris');
        });

        test('should resolve property from linked class (institution.lieu)', async () => {
            const renderer = new DisplayRenderer(vault, {}, client1, undefined);
            
            // First get the institution link value
            const institutionLink = await client1.getPropertyValue('institution');
            expect(institutionLink).toBe('[[Institution-Paris]]');
            
            // Now resolve through the link
            const mockContext = {
                institution: '[[Institution-Paris]]'
            };
            
            const result = await (renderer as any).propertyNavigator.getNestedProperty(mockContext, 'institution.lieu');
            
            expect(result).toBe('Paris');
        });

        test('should resolve array index with linked class (clients[0].institution.lieu)', async () => {
            const renderer = new DisplayRenderer(vault, {}, project, undefined);
            
            const mockContext = {
                clients: [
                    { institution: '[[Institution-Paris]]', montant: 1000 },
                    { institution: '[[Institution-Lyon]]', montant: 2000 }
                ]
            };
            
            const result = await (renderer as any).propertyNavigator.getNestedProperty(mockContext, 'clients[0].institution.lieu');
            
            expect(result).toBe('Paris');
        });

        test('should resolve different array indices', async () => {
            const renderer = new DisplayRenderer(vault, {}, project, undefined);
            
            const mockContext = {
                clients: [
                    { institution: '[[Institution-Paris]]', montant: 1000 },
                    { institution: '[[Institution-Lyon]]', montant: 2000 }
                ]
            };
            
            const result1 = await (renderer as any).propertyNavigator.getNestedProperty(mockContext, 'clients[0].institution.lieu');
            const result2 = await (renderer as any).propertyNavigator.getNestedProperty(mockContext, 'clients[1].institution.lieu');
            
            expect(result1).toBe('Paris');
            expect(result2).toBe('Lyon');
        });

        test('should handle missing links gracefully', async () => {
            const renderer = new DisplayRenderer(vault, {}, project, undefined);
            
            const mockContext = {
                clients: [
                    { institution: '[[NonExistent]]', montant: 1000 }
                ]
            };
            
            const result = await (renderer as any).propertyNavigator.getNestedProperty(mockContext, 'clients[0].institution.lieu');
            
            expect(result).toBeUndefined();
        });

        test('should handle invalid array indices', async () => {
            const renderer = new DisplayRenderer(vault, {}, project, undefined);
            
            const mockContext = {
                clients: [
                    { institution: '[[Institution-Paris]]', montant: 1000 }
                ]
            };
            
            const result = await (renderer as any).propertyNavigator.getNestedProperty(mockContext, 'clients[5].institution.lieu');
            
            expect(result).toBeUndefined();
        });

        test('should handle simple array access without links', async () => {
            const renderer = new DisplayRenderer(vault, {}, project, undefined);
            
            const mockContext = {
                items: [
                    { total: 100 },
                    { total: 200 }
                ]
            };
            
            const result = await (renderer as any).propertyNavigator.getNestedProperty(mockContext, 'items[1].total');
            
            expect(result).toBe(200);
        });
    });

    describe('Number display with nested linked properties', () => {
        test('should use nested linked property for max value', async () => {
            const renderer = new DisplayRenderer(vault, {}, project, undefined);
            
            // Mock context with nested structure
            (project as any).mockData.budget = {
                clients: [
                    { institution: '[[Institution-Paris]]', montant: 1000 }
                ]
            };
            
            // Override getPropertyValue to support nested access
            project.getPropertyValue = jest.fn(async (prop: string) => {
                if (prop === 'budget') {
                    return (project as any).mockData.budget;
                }
                return undefined;
            });
            
            const numberItem: NumberDisplayItem = {
                type: 'number',
                source: { class: 'Project' },
                formula: 'sum',
                propertyName: 'montant',
                max: 'budget.clients[0].montant'
            };

            const result = await (renderer as any).renderNumber(numberItem);
            
            expect(result).toBeTruthy();
            const numberDisplay = result?.querySelector('.crm-number-display');
            expect(numberDisplay).toBeTruthy();
        });
    });

    describe('Edge cases', () => {
        test('should handle null values in path', async () => {
            const renderer = new DisplayRenderer(vault, {}, project, undefined);
            
            const mockContext = {
                clients: null
            };
            
            const result = await (renderer as any).propertyNavigator.getNestedProperty(mockContext, 'clients[0].institution.lieu');
            
            expect(result).toBeUndefined();
        });

        test('should handle undefined intermediate values', async () => {
            const renderer = new DisplayRenderer(vault, {}, project, undefined);
            
            const mockContext = {
                clients: [
                    { institution: undefined }
                ]
            };
            
            const result = await (renderer as any).propertyNavigator.getNestedProperty(mockContext, 'clients[0].institution.lieu');
            
            expect(result).toBeUndefined();
        });

        test('should handle non-object values in path', async () => {
            const renderer = new DisplayRenderer(vault, {}, project, undefined);
            
            const mockContext = {
                value: 'string-value'
            };
            
            const result = await (renderer as any).propertyNavigator.getNestedProperty(mockContext, 'value.property');
            
            expect(result).toBeUndefined();
        });

        test('should handle complex multi-level nesting', async () => {
            const renderer = new DisplayRenderer(vault, {}, project, undefined);
            
            const mockContext = {
                data: {
                    clients: [
                        { institution: '[[Institution-Paris]]', montant: 1000 }
                    ]
                }
            };
            
            const result = await (renderer as any).propertyNavigator.getNestedProperty(mockContext, 'data.clients[0].institution.lieu');
            
            expect(result).toBe('Paris');
        });
    });
});
