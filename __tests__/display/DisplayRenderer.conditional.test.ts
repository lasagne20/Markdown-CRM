/**
 * @jest-environment jsdom
 * 
 * Tests pour le conditional display
 * Permet d'afficher ou masquer des éléments selon des conditions
 */

import { DisplayRenderer } from '../../src/display/DisplayRenderer';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { Property } from '../../src/properties/Property';
import { mockApp } from '../utils/mocks';

describe('DisplayRenderer - Conditional Display', () => {
    let vault: Vault;
    let app: any;
    let mockInstance: any;
    let properties: Record<string, Property>;

    beforeEach(() => {
        app = mockApp();
        vault = new Vault(app, {
            vaultPath: './test-vault',
            configPath: '__tests__/Config/test-configs'
        } as any);

        // Créer les propriétés mockées
        const createMockProperty = (name: string) => {
            return {
                name,
                read: jest.fn(),
                getDisplay: jest.fn().mockImplementation(async (instance: any) => {
                    const span = document.createElement('span');
                    const value = await instance.getPropertyValue(name);
                    span.textContent = String(value || '');
                    return span;
                }),
                fillDisplay: jest.fn().mockImplementation((value: any, updateFn: any) => {
                    const span = document.createElement('span');
                    span.textContent = String(value || '');
                    return span;
                })
            } as any;
        };

        properties = {
            nom: createMockProperty('nom'),
            siret: createMockProperty('siret'),
            type: createMockProperty('type'),
            statut: createMockProperty('statut'),
            montant: createMockProperty('montant'),
            tags: createMockProperty('tags'),
            description: createMockProperty('description')
        };

        // Mock instance avec différentes propriétés
        mockInstance = {
            vault,
            type: 'Entreprise',
            statut: 'Actif',
            montant: 1000,
            nom: 'Test Company',
            siret: '12345678901234',
            getValue: jest.fn().mockImplementation(async (name: string) => mockInstance[name]),
            getProperty: (name: string) => {
                const mockProperty = {
                    name,
                    read: jest.fn().mockResolvedValue(mockInstance[name]),
                    getDisplay: jest.fn().mockImplementation(async () => {
                        const span = document.createElement('span');
                        span.textContent = String(mockInstance[name] || '');
                        return span;
                    })
                };
                return mockProperty as any;
            },
            getPropertyValue: async (name: string) => mockInstance[name]
        };
    });

    test('should display item without conditions', async () => {
        console.log('🧪 Testing item without conditions...');

        const displayConfig = {
            items: [
                {
                    type: 'property' as const,
                    name: 'nom'
                }
            ]
        };

        const renderer = new DisplayRenderer(vault, properties, mockInstance);
        const container = document.createElement('div');
        await renderer.renderDisplayItems(container, displayConfig.items);

        expect(container.children.length).toBe(1);
        expect(container.textContent).toContain('Test Company');
        console.log('✅ Item without conditions displayed');
    });

    test('should display item when condition is met', async () => {
        console.log('🧪 Testing item with condition met...');

        const displayConfig = {
            items: [
                {
                    type: 'property' as const,
                    name: 'siret',
                    conditions: [
                        {
                            property: 'type',
                            type: 'equals' as const,
                            value: 'Entreprise'
                        }
                    ]
                }
            ]
        };

        const renderer = new DisplayRenderer(vault, properties, mockInstance);
        const container = document.createElement('div');
        await renderer.renderDisplayItems(container, displayConfig.items);

        expect(container.children.length).toBe(1);
        expect(container.textContent).toContain('12345678901234');
        console.log('✅ Item displayed when condition met');
    });

    test('should NOT display item when condition is not met', async () => {
        console.log('🧪 Testing item with condition not met...');

        const displayConfig = {
            items: [
                {
                    type: 'property' as const,
                    name: 'siret',
                    conditions: [
                        {
                            property: 'type',
                            type: 'equals' as const,
                            value: 'Personne'
                        }
                    ]
                }
            ]
        };

        const renderer = new DisplayRenderer(vault, properties, mockInstance);
        const container = document.createElement('div');
        await renderer.renderDisplayItems(container, displayConfig.items);

        expect(container.children.length).toBe(0);
        console.log('✅ Item NOT displayed when condition not met');
    });

    test('should display item when all multiple conditions are met', async () => {
        console.log('🧪 Testing multiple conditions (all met)...');

        const displayConfig = {
            items: [
                {
                    type: 'property' as const,
                    name: 'nom',
                    conditions: [
                        {
                            property: 'type',
                            type: 'equals' as const,
                            value: 'Entreprise'
                        },
                        {
                            property: 'statut',
                            type: 'equals' as const,
                            value: 'Actif'
                        },
                        {
                            property: 'montant',
                            type: 'greaterThan' as const,
                            value: 500
                        }
                    ]
                }
            ]
        };

        const renderer = new DisplayRenderer(vault, properties, mockInstance);
        const container = document.createElement('div');
        await renderer.renderDisplayItems(container, displayConfig.items);

        expect(container.children.length).toBe(1);
        console.log('✅ Item displayed when all conditions met');
    });

    test('should NOT display item when one condition fails', async () => {
        console.log('🧪 Testing multiple conditions (one fails)...');

        const displayConfig = {
            items: [
                {
                    type: 'property' as const,
                    name: 'nom',
                    conditions: [
                        {
                            property: 'type',
                            type: 'equals' as const,
                            value: 'Entreprise'
                        },
                        {
                            property: 'statut',
                            type: 'equals' as const,
                            value: 'Inactif' // Cette condition échoue
                        }
                    ]
                }
            ]
        };

        const renderer = new DisplayRenderer(vault, properties, mockInstance);
        const container = document.createElement('div');
        await renderer.renderDisplayItems(container, displayConfig.items);

        expect(container.children.length).toBe(0);
        console.log('✅ Item NOT displayed when one condition fails');
    });

    test('should work with container conditional display', async () => {
        console.log('🧪 Testing conditional container...');

        const displayConfig = {
            items: [
                {
                    type: 'line' as const,
                    title: 'Infos Entreprise',
                    className: 'info-box',
                    conditions: [
                        {
                            property: 'type',
                            type: 'equals' as const,
                            value: 'Entreprise'
                        }
                    ],
                    items: [
                        {
                            type: 'property' as const,
                            name: 'siret'
                        },
                        {
                            type: 'property' as const,
                            name: 'nom'
                        }
                    ]
                }
            ]
        };

        const renderer = new DisplayRenderer(vault, properties, mockInstance);
        const container = document.createElement('div');
        await renderer.renderDisplayItems(container, displayConfig.items);

        expect(container.children.length).toBe(1);
        const containerEl = container.querySelector('.info-box');
        expect(containerEl).not.toBeNull();
        expect(containerEl?.textContent).toContain('12345678901234');
        expect(containerEl?.textContent).toContain('Test Company');
        console.log('✅ Conditional container displayed');
    });

    test('should NOT display container when condition fails', async () => {
        console.log('🧪 Testing container with failed condition...');

        const displayConfig = {
            items: [
                {
                    type: 'line' as const,
                    title: 'Infos Entreprise',
                    conditions: [
                        {
                            property: 'type',
                            type: 'equals' as const,
                            value: 'Personne'
                        }
                    ],
                    items: [
                        {
                            type: 'property' as const,
                            name: 'siret'
                        }
                    ]
                }
            ]
        };

        const renderer = new DisplayRenderer(vault, properties, mockInstance);
        const container = document.createElement('div');
        await renderer.renderDisplayItems(container, displayConfig.items);

        expect(container.children.length).toBe(0);
        console.log('✅ Container NOT displayed when condition fails');
    });

    test('should work with notEquals condition', async () => {
        console.log('🧪 Testing notEquals condition...');

        const displayConfig = {
            items: [
                {
                    type: 'property' as const,
                    name: 'nom',
                    conditions: [
                        {
                            property: 'type',
                            type: 'notEquals' as const,
                            value: 'Personne'
                        }
                    ]
                }
            ]
        };

        const renderer = new DisplayRenderer(vault, properties, mockInstance);
        const container = document.createElement('div');
        await renderer.renderDisplayItems(container, displayConfig.items);

        expect(container.children.length).toBe(1);
        console.log('✅ Item displayed with notEquals condition');
    });

    test('should work with contains condition', async () => {
        console.log('🧪 Testing contains condition...');

        mockInstance.tags = ['entreprise', 'client'];

        const displayConfig = {
            items: [
                {
                    type: 'property' as const,
                    name: 'nom',
                    conditions: [
                        {
                            property: 'tags',
                            type: 'contains' as const,
                            value: 'client'
                        }
                    ]
                }
            ]
        };

        const renderer = new DisplayRenderer(vault, properties, mockInstance);
        const container = document.createElement('div');
        await renderer.renderDisplayItems(container, displayConfig.items);

        expect(container.children.length).toBe(1);
        console.log('✅ Item displayed with contains condition');
    });

    test('should work with equalsAny condition', async () => {
        console.log('🧪 Testing equalsAny condition...');

        const displayConfig = {
            items: [
                {
                    type: 'property' as const,
                    name: 'nom',
                    conditions: [
                        {
                            property: 'statut',
                            type: 'equalsAny' as const,
                            values: ['Actif', 'En cours', 'Validé']
                        }
                    ]
                }
            ]
        };

        const renderer = new DisplayRenderer(vault, properties, mockInstance);
        const container = document.createElement('div');
        await renderer.renderDisplayItems(container, displayConfig.items);

        expect(container.children.length).toBe(1);
        console.log('✅ Item displayed with equalsAny condition');
    });

    test('should work with isEmpty condition', async () => {
        console.log('🧪 Testing isEmpty condition...');

        mockInstance.description = '';

        const displayConfig = {
            items: [
                {
                    type: 'property' as const,
                    name: 'nom',
                    conditions: [
                        {
                            property: 'description',
                            type: 'isEmpty' as const
                        }
                    ]
                }
            ]
        };

        const renderer = new DisplayRenderer(vault, properties, mockInstance);
        const container = document.createElement('div');
        await renderer.renderDisplayItems(container, displayConfig.items);

        expect(container.children.length).toBe(1);
        console.log('✅ Item displayed with isEmpty condition');
    });

    test('should work with isNotEmpty condition', async () => {
        console.log('🧪 Testing isNotEmpty condition...');

        const displayConfig = {
            items: [
                {
                    type: 'property' as const,
                    name: 'nom',
                    conditions: [
                        {
                            property: 'siret',
                            type: 'isNotEmpty' as const
                        }
                    ]
                }
            ]
        };

        const renderer = new DisplayRenderer(vault, properties, mockInstance);
        const container = document.createElement('div');
        await renderer.renderDisplayItems(container, displayConfig.items);

        expect(container.children.length).toBe(1);
        console.log('✅ Item displayed with isNotEmpty condition');
    });

    test('should display mix of conditional and unconditional items', async () => {
        console.log('🧪 Testing mix of conditional and unconditional items...');

        const displayConfig = {
            items: [
                {
                    type: 'property' as const,
                    name: 'nom'
                    // Pas de conditions - toujours affiché
                },
                {
                    type: 'property' as const,
                    name: 'siret',
                    conditions: [
                        {
                            property: 'type',
                            type: 'equals' as const,
                            value: 'Entreprise'
                        }
                    ]
                },
                {
                    type: 'property' as const,
                    name: 'type'
                    // Pas de conditions - toujours affiché
                }
            ]
        };

        const renderer = new DisplayRenderer(vault, properties, mockInstance);
        const container = document.createElement('div');
        await renderer.renderDisplayItems(container, displayConfig.items);

        // 3 items affichés : nom (sans condition), siret (condition OK), type (sans condition)
        expect(container.children.length).toBe(3);
        console.log('✅ Mix of items displayed correctly');
    });

    test('should handle button with conditions', async () => {
        console.log('🧪 Testing conditional button...');

        const mockProcess = jest.fn();
        
        const displayConfig = {
            items: [
                {
                    type: 'button' as const,
                    label: 'Générer facture',
                    process: 'genererFacture',
                    conditions: [
                        {
                            property: 'statut',
                            type: 'equals' as const,
                            value: 'Actif'
                        },
                        {
                            property: 'montant',
                            type: 'greaterThan' as const,
                            value: 0
                        }
                    ]
                }
            ]
        };

        const renderer = new DisplayRenderer(vault, properties, mockInstance);
        const container = document.createElement('div');
        await renderer.renderDisplayItems(container, displayConfig.items);

        const button = container.querySelector('button');
        expect(button).not.toBeNull();
        expect(button?.textContent).toContain('Générer facture');
        console.log('✅ Conditional button displayed');
    });

    test('should NOT display button when conditions fail', async () => {
        console.log('🧪 Testing button with failed conditions...');

        mockInstance.montant = 0; // Condition échoue

        const displayConfig = {
            items: [
                {
                    type: 'button' as const,
                    label: 'Générer facture',
                    process: 'genererFacture',
                    conditions: [
                        {
                            property: 'montant',
                            type: 'greaterThan' as const,
                            value: 0
                        }
                    ]
                }
            ]
        };

        const renderer = new DisplayRenderer(vault, properties, mockInstance);
        const container = document.createElement('div');
        await renderer.renderDisplayItems(container, displayConfig.items);

        expect(container.children.length).toBe(0);
        console.log('✅ Button NOT displayed when conditions fail');
    });
});
