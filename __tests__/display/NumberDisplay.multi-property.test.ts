/**
 * @jest-environment jsdom
 */

import { NumberDisplay } from '../../src/display/NumberDisplay';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { NumberDisplayItem } from '../../src/Config/interfaces';
import { mockApp } from '../utils/mocks';

// Mock classes for testing parent navigation
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

    getProperty(name: string) {
        return null;
    }
}

class MockAction extends Classe {
    constructor(vault: Vault, fileName: string, financeurs: MockInstitution[], clients: MockInstitution[]) {
        super(vault);
        this.fileName = fileName;
        this.financeurs = financeurs;
        this.clients = clients;
    }

    private fileName: string;
    private financeurs: MockInstitution[];
    private clients: MockInstitution[];

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
            clients: this.clients.map(c => `[[${c.getName()}]]`)
        };
    }

    getProperty(name: string) {
        return null;
    }
}

describe('NumberDisplay Multi-Property Support', () => {
    let vault: Vault;
    let commune1: MockCommune;
    let commune2: MockCommune;
    let commune3: MockCommune;
    let institution1: MockInstitution;
    let institution2: MockInstitution;
    let institution3: MockInstitution;
    let action1: MockAction;
    let action2: MockAction;

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
        
        // Create mock actions
        // Action1: financeur from Commune1, client from Commune2
        action1 = new MockAction(vault, 'Action1', [institution1], [institution2]);
        // Action2: financeur from Commune2, client from Commune3  
        action2 = new MockAction(vault, 'Action2', [institution2], [institution3]);
        
        // Mock getFromLink to return our mock classes
        (vault as any).getFromLink = jest.fn(async (link: string) => {
            if (link.includes('Institution1')) return institution1;
            if (link.includes('Institution2')) return institution2;
            if (link.includes('Institution3')) return institution3;
            return null;
        });
    });

    describe('Multiple properties with comma syntax', () => {
        test('should handle single property with .parent', async () => {
            // Mock getPropertyValue to handle financeurs.financeur.parent
            (action1 as any).getPropertyValue = jest.fn(async (path: string, context: any) => {
                if (path === 'financeurs.financeur.parent') {
                    // This should return the parent commune of the first financeur
                    return `[[${commune1.getName()}]]`;
                }
                return null;
            });

            const value = await (NumberDisplay as any).calculateValue(
                [action1],
                'countDistinct',
                'financeurs.financeur.parent',
                undefined,
                action1
            );
            
            expect(value).toBe(1); // Should find 1 unique commune
        });

        test('should handle multiple properties separated by comma', async () => {
            // Mock getPropertyValue to handle both properties
            (action1 as any).getPropertyValue = jest.fn(async (path: string, context: any) => {
                if (path === 'financeurs.financeur.parent') {
                    return `[[${commune1.getName()}]]`; // Institution1 -> Commune1
                }
                if (path === 'clients.client.parent') {
                    return `[[${commune2.getName()}]]`; // Institution2 -> Commune2
                }
                return null;
            });

            const value = await (NumberDisplay as any).calculateValue(
                [action1],
                'countDistinct',
                'financeurs.financeur.parent,clients.client.parent',
                undefined,
                action1
            );
            
            // Should find 2 unique communes: Commune1 (from financeurs) and Commune2 (from clients)
            expect(value).toBe(2);
        });

        test('should count distinct communes across multiple actions with multiple properties', async () => {
            // Mock getPropertyValue for both actions
            (action1 as any).getPropertyValue = jest.fn(async (path: string, context: any) => {
                if (path === 'financeurs.financeur.parent') {
                    return `[[${commune1.getName()}]]`; // Institution1 -> Commune1
                }
                if (path === 'clients.client.parent') {
                    return `[[${commune2.getName()}]]`; // Institution2 -> Commune2
                }
                return null;
            });

            (action2 as any).getPropertyValue = jest.fn(async (path: string, context: any) => {
                if (path === 'financeurs.financeur.parent') {
                    return `[[${commune2.getName()}]]`; // Institution2 -> Commune2
                }
                if (path === 'clients.client.parent') {
                    return `[[${commune3.getName()}]]`; // Institution3 -> Commune3
                }
                return null;
            });

            const value = await (NumberDisplay as any).calculateValue(
                [action1, action2],
                'countDistinct',
                'financeurs.financeur.parent,clients.client.parent',
                undefined,
                undefined
            );
            
            // Should find 3 unique communes: Commune1, Commune2, Commune3
            expect(value).toBe(3);
        });

        test('should handle empty values gracefully', async () => {
            (action1 as any).getPropertyValue = jest.fn(async (path: string, context: any) => {
                if (path === 'financeurs.financeur.parent') {
                    return `[[${commune1.getName()}]]`;
                }
                if (path === 'clients.client.parent') {
                    return null; // No client parent
                }
                return null;
            });

            const value = await (NumberDisplay as any).calculateValue(
                [action1],
                'countDistinct',
                'financeurs.financeur.parent,clients.client.parent',
                undefined,
                action1
            );
            
            // Should only count Commune1, ignore null values
            expect(value).toBe(1);
        });

        test('should handle duplicate communes across properties', async () => {
            // Same commune from both properties
            (action1 as any).getPropertyValue = jest.fn(async (path: string, context: any) => {
                if (path === 'financeurs.financeur.parent') {
                    return `[[${commune1.getName()}]]`; // Institution1 -> Commune1
                }
                if (path === 'clients.client.parent') {
                    return `[[${commune1.getName()}]]`; // Institution1 -> Commune1 (same commune)
                }
                return null;
            });

            const value = await (NumberDisplay as any).calculateValue(
                [action1],
                'countDistinct',
                'financeurs.financeur.parent,clients.client.parent',
                undefined,
                action1
            );
            
            // Should count only 1 unique commune even though it appears twice
            expect(value).toBe(1);
        });

        test('should work with count formula', async () => {
            (action1 as any).getPropertyValue = jest.fn(async (path: string, context: any) => {
                if (path === 'financeurs.financeur.parent') {
                    return `[[${commune1.getName()}]]`;
                }
                if (path === 'clients.client.parent') {
                    return `[[${commune2.getName()}]]`;
                }
                return null;
            });

            const value = await (NumberDisplay as any).calculateValue(
                [action1],
                'count',
                'financeurs.financeur.parent,clients.client.parent',
                undefined,
                action1
            );
            
            // Should count total values (2) not unique
            expect(value).toBe(2);
        });
    });

    describe('Integration with full NumberDisplay', () => {
        test('should create NumberDisplay with multi-property countDistinct', async () => {
            // Mock getPropertyValue for action
            (action1 as any).getPropertyValue = jest.fn(async (path: string, context: any) => {
                if (path === 'financeurs.financeur.parent') {
                    return `[[${commune1.getName()}]]`;
                }
                if (path === 'clients.client.parent') {
                    return `[[${commune2.getName()}]]`;
                }
                return null;
            });

            // Create a mock getFilesForTable
            const getFilesForTable = jest.fn().mockResolvedValue([action1]);

            const numberItem: NumberDisplayItem = {
                type: 'number',
                source: { class: 'Action' },
                formula: 'countDistinct',
                propertyName: 'financeurs.financeur.parent,clients.client.parent',
                title: 'Nombre de communes desservies'
            };

            const display = await NumberDisplay.fromConfig(
                numberItem,
                vault,
                action1 as any,
                getFilesForTable
            );

            expect(display).toBeInstanceOf(NumberDisplay);
            expect(display.options.value).toBe(2); // 2 unique communes
        });
    });
});
