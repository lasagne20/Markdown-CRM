/**
 * @jest-environment jsdom
 */

import { NumberDisplay } from '../../src/display/NumberDisplay';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { NumberDisplayItem, SourceConfig } from '../../src/Config/interfaces';
import { PropertyNavigator } from '../../src/utils/PropertyNavigator';
import { mockApp } from '../utils/mocks';

// Mock classes to simulate the user's configuration
class MockCommune extends Classe {
    constructor(vault: Vault, fileName: string) {
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
        return { nom: this.fileName };
    }

    getProperty(name: string) {
        return null;
    }
}

class MockPartenariat extends Classe {
    constructor(vault: Vault, fileName: string) {
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
        return {};
    }

    getProperty(name: string) {
        return null;
    }
}

class MockInstitution extends Classe {
    constructor(vault: Vault, fileName: string, parentCommune: MockCommune) {
        super(vault);
        this.fileName = fileName;
        this.parentCommune = parentCommune;
    }

    private fileName: string;
    private parentCommune: MockCommune;

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
        return { nom: this.fileName };
    }

    async getParent(): Promise<Classe | null> {
        return this.parentCommune;
    }

    async getParentProperty(): Promise<string | null> {
        return null;
    }

    getProperty(name: string) {
        return null;
    }
}

class MockAction extends Classe {
    constructor(
        vault: Vault, 
        fileName: string, 
        financeurs: MockInstitution[], 
        clients: MockInstitution[],
        partenariats: MockPartenariat[],
        etat: string = 'En cours'
    ) {
        super(vault);
        this.fileName = fileName;
        this.financeurs = financeurs;
        this.clients = clients;
        this.partenariats = partenariats;
        this.etat = etat;
    }

    private fileName: string;
    private financeurs: MockInstitution[];
    private clients: MockInstitution[];
    private partenariats: MockPartenariat[];
    private etat: string;

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
        return {
            financeurs: this.financeurs.map(f => `[[${f.getName()}]]`),
            clients: this.clients.map(c => `[[${c.getName()}]]`),
            partenariats: this.partenariats.map(p => `[[${p.getName()}]]`),
            etat: this.etat
        };
    }

    getProperty(name: string) {
        return null;
    }
}

describe('NumberDisplay - Partenariat Integration Test', () => {
    let vault: Vault;
    let commune1: MockCommune;
    let commune2: MockCommune;
    let commune3: MockCommune;
    let institution1: MockInstitution;
    let institution2: MockInstitution;
    let institution3: MockInstitution;
    let partenariat1: MockPartenariat;
    let action1: MockAction;
    let action2: MockAction;
    let action3: MockAction;

    beforeEach(() => {
        const app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);
        
        // Create mock communes
        commune1 = new MockCommune(vault, 'Commune1');
        commune2 = new MockCommune(vault, 'Commune2');
        commune3 = new MockCommune(vault, 'Commune3');
        
        // Create mock institutions with parent communes
        institution1 = new MockInstitution(vault, 'Institution1', commune1);
        institution2 = new MockInstitution(vault, 'Institution2', commune2);
        institution3 = new MockInstitution(vault, 'Institution3', commune3);
        
        // Create partenariat
        partenariat1 = new MockPartenariat(vault, 'Partenariat1');
        
        // Create actions with different configurations
        // Action1: financeur from Commune1, client from Commune2
        action1 = new MockAction(vault, 'Action1', [institution1], [institution2], [partenariat1]);
        // Action2: financeur from Commune2, client from Commune3
        action2 = new MockAction(vault, 'Action2', [institution2], [institution3], [partenariat1]);
        // Action3: financeur from Commune1, client from Commune1 (same commune)
        action3 = new MockAction(vault, 'Action3', [institution1], [institution1], [partenariat1]);
        
        // Mock getFromLink to return our mock classes
        (vault as any).getFromLink = jest.fn(async (link: string) => {
            if (link.includes('Institution1')) return institution1;
            if (link.includes('Institution2')) return institution2;
            if (link.includes('Institution3')) return institution3;
            if (link.includes('Partenariat1')) return partenariat1;
            return null;
        });
    });

    describe('Partenariat configuration: countDistinct communes from financeurs and clients', () => {
        test('should count distinct communes from financeurs.financeur.parent,clients.client.parent', async () => {
            // Mock PropertyNavigator to handle parent navigation
            const mockPropertyNavigator = {
                getNestedProperty: jest.fn(async (obj: any, path: string) => {
                    if (path === 'financeurs.financeur.parent') {
                        // For action1: institution1 -> commune1
                        if (obj === action1) return `[[${commune1.getName()}]]`;
                        // For action2: institution2 -> commune2
                        if (obj === action2) return `[[${commune2.getName()}]]`;
                        // For action3: institution1 -> commune1
                        if (obj === action3) return `[[${commune1.getName()}]]`;
                    }
                    if (path === 'clients.client.parent') {
                        // For action1: institution2 -> commune2
                        if (obj === action1) return `[[${commune2.getName()}]]`;
                        // For action2: institution3 -> commune3
                        if (obj === action2) return `[[${commune3.getName()}]]`;
                        // For action3: institution1 -> commune1
                        if (obj === action3) return `[[${commune1.getName()}]]`;
                    }
                    return undefined;
                })
            };

            // Mock getPropertyValue on actions to use PropertyNavigator
            [action1, action2, action3].forEach(action => {
                (action as any).getPropertyValue = jest.fn(async (path: string, context: any) => {
                    return mockPropertyNavigator.getNestedProperty(action, path);
                });
            });

            const value = await (NumberDisplay as any).calculateValue(
                [action1, action2, action3],
                'countDistinct',
                'financeurs.financeur.parent,clients.client.parent',
                undefined,
                partenariat1 as any
            );
            
            // Expected result: 
            // Action1: financeurs.financeur.parent = Commune1, clients.client.parent = Commune2
            // Action2: financeurs.financeur.parent = Commune2, clients.client.parent = Commune3
            // Action3: financeurs.financeur.parent = Commune1, clients.client.parent = Commune1
            // Unique communes: Commune1, Commune2, Commune3 = 3
            expect(value).toBe(3);
        });

        test('should work with user configuration from Partenariat.yaml', async () => {
            // Mock getPropertyValue for all actions
            const mockPropertyNavigator = {
                getNestedProperty: jest.fn(async (obj: any, path: string) => {
                    // Handle partenariats.partenariat contains current (partenariat1)
                    if (path === 'partenariats') {
                        if (obj === action1) return [`[[${partenariat1.getName()}]]`];
                        if (obj === action2) return [`[[${partenariat1.getName()}]]`];
                        if (obj === action3) return [`[[${partenariat1.getName()}]]`];
                    }
                    if (path === 'etat') {
                        return action1.etat || action2.etat || action3.etat;
                    }
                    if (path === 'financeurs.financeur.parent') {
                        if (obj === action1) return `[[${commune1.getName()}]]`;
                        if (obj === action2) return `[[${commune2.getName()}]]`;
                        if (obj === action3) return `[[${commune1.getName()}]]`;
                    }
                    if (path === 'clients.client.parent') {
                        if (obj === action1) return `[[${commune2.getName()}]]`;
                        if (obj === action2) return `[[${commune3.getName()}]]`;
                        if (obj === action3) return `[[${commune1.getName()}]]`;
                    }
                    return undefined;
                })
            };

            [action1, action2, action3].forEach(action => {
                (action as any).getPropertyValue = jest.fn(async (path: string, context: any) => {
                    return mockPropertyNavigator.getNestedProperty(action, path);
                });
            });

            // Create the exact configuration from Partenariat.yaml
            const numberItem: NumberDisplayItem = {
                type: 'number',
                source: {
                    class: 'Action',
                    conditions: [
                        {
                            property: 'partenariats.partenariat',
                            type: 'contains',
                            value: 'current'
                        },
                        {
                            property: 'etat',
                            type: 'notEquals',
                            value: 'Annulé'
                        }
                    ]
                },
                formula: 'countDistinct',
                propertyName: 'financeurs.financeur.parent,clients.client.parent',
                title: 'Nombre de communes desservies',
                icon: 'map-pin'
            };

            // Mock getFilesForTable to return our actions
            const getFilesForTable = jest.fn().mockImplementation(async (source: SourceConfig, context: any) => {
                // Filter by partenariats contains current and etat != Annulé
                if (source.class === 'Action') {
                    return [action1, action2, action3]; // All actions have the partenariat and are not Annulé
                }
                return [];
            });

            const display = await NumberDisplay.fromConfig(
                numberItem,
                vault,
                partenariat1 as any,
                getFilesForTable
            );

            expect(display).toBeInstanceOf(NumberDisplay);
            expect(display.options.value).toBe(3); // 3 unique communes
        });
    });

    describe('Edge cases and error handling', () => {
        test('should handle missing parent gracefully', async () => {
            (action1 as any).getPropertyValue = jest.fn(async (path: string, context: any) => {
                if (path === 'financeurs.financeur.parent') {
                    return `[[${commune1.getName()}]]`;
                }
                if (path === 'clients.client.parent') {
                    return null; // No parent for client
                }
                return null;
            });

            const value = await (NumberDisplay as any).calculateValue(
                [action1],
                'countDistinct',
                'financeurs.financeur.parent,clients.client.parent',
                undefined,
                partenariat1 as any
            );
            
            expect(value).toBe(1); // Should only count Commune1
        });

        test('should handle empty property values', async () => {
            (action1 as any).getPropertyValue = jest.fn(async (path: string, context: any) => {
                return null; // All properties return null
            });

            const value = await (NumberDisplay as any).calculateValue(
                [action1],
                'countDistinct',
                'financeurs.financeur.parent,clients.client.parent',
                undefined,
                partenariat1 as any
            );
            
            expect(value).toBe(0); // Should return 0 for empty results
        });

        test('should work with single property (backward compatibility)', async () => {
            (action1 as any).getPropertyValue = jest.fn(async (path: string, context: any) => {
                if (path === 'financeurs.financeur.parent') {
                    return `[[${commune1.getName()}]]`;
                }
                return null;
            });

            const value = await (NumberDisplay as any).calculateValue(
                [action1],
                'countDistinct',
                'financeurs.financeur.parent',
                undefined,
                partenariat1 as any
            );
            
            expect(value).toBe(1); // Should work with single property
        });
    });
});
