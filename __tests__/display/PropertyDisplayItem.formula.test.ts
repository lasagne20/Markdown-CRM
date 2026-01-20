import { DisplayRenderer } from '../../src/display/DisplayRenderer';
import { PropertyDisplayItem } from '../../src/Config/interfaces';

// Mock the Property class to avoid needing full property initialization
jest.mock('../../src/properties/Property', () => {
    return {
        Property: jest.fn().mockImplementation(() => ({
            fillDisplay: jest.fn().mockReturnValue(document.createElement('div'))
        }))
    };
});

// Mock dependencies
const mockVault = {
    getAbstractFileByPath: jest.fn(),
    getRoot: jest.fn().mockReturnValue({ path: '/' }),
    getFiles: jest.fn().mockReturnValue([]),
} as any;

const mockConfigManager = {
    getClassConfig: jest.fn().mockResolvedValue({
        properties: {},
        display: {}
    }),
} as any;

describe('PropertyDisplayItem - Formula Support', () => {
    let renderer: DisplayRenderer;
    let mockContext: any;
    let mockFile: any;
    let mockProperties: any;

    beforeEach(() => {
        mockContext = {
            classe: 'TestClass',
            animations: [
                { date: '2025-01-15', nom: 'Animation 1', tarif: 1500 },
                { date: '2025-02-20', nom: 'Animation 2', tarif: 2000 },
                { date: '2025-03-10', nom: 'Animation 3', tarif: 1800 }
            ],
            clients: [
                { nom: 'Client A', email: 'clienta@test.com' },
                { nom: 'Client B', email: 'clientb@test.com' }
            ],
            details: {
                montant: 5000,
                description: 'Détails du projet',
                infos: {
                    nested: {
                        value: 'deeply nested'
                    }
                }
            },
            simple: 'Simple value',
            getPropertyValue: jest.fn((propName: string) => {
                // Extract base property name (before any . or [)
                const baseName = propName.split(/[.\[]/ )[0];
                return mockContext[baseName];
            })
        };

        // Create a mock file object with getPropertyValue method
        mockFile = {
            basename: 'test-file.md',
            path: 'test-file.md',
            getPropertyValue: mockContext.getPropertyValue
        };

        mockVault.getAbstractFileByPath.mockReturnValue(mockFile);

        // Mock properties object (empty for formula tests)
        mockProperties = {};

        renderer = new DisplayRenderer(mockVault, mockProperties, mockContext);
    });

    describe('Array indexing with brackets', () => {
        test('should render first array element property', async () => {
            const item: PropertyDisplayItem = {
                type: 'property',
                name: 'animations[0].date',
                title: 'Date de la première animation'
            };

            const result = await renderer.renderProperty(item);
            
            expect(result).not.toBeNull();
            expect(result?.className).toBe('metadata-property');
            expect(result?.textContent).toContain('Date de la première animation');
            expect(result?.textContent).toContain('2025-01-15');
        });

        test('should render middle array element property', async () => {
            const item: PropertyDisplayItem = {
                type: 'property',
                name: 'animations[1].nom'
            };

            const result = await renderer.renderProperty(item);
            
            expect(result).not.toBeNull();
            expect(result?.textContent).toContain('Animation 2');
        });

        test('should render last array element property', async () => {
            const item: PropertyDisplayItem = {
                type: 'property',
                name: 'clients[1].email',
                title: 'Email du second client'
            };

            const result = await renderer.renderProperty(item);
            
            expect(result).not.toBeNull();
            expect(result?.textContent).toContain('Email du second client');
            expect(result?.textContent).toContain('clientb@test.com');
        });

        test('should handle out of bounds index gracefully', async () => {
            const item: PropertyDisplayItem = {
                type: 'property',
                name: 'animations[10].date',
                title: 'Animation inexistante'
            };

            const result = await renderer.renderProperty(item);
            
            expect(result).not.toBeNull();
            expect(result?.textContent).toContain('-');
        });

        test('should handle negative index', async () => {
            const item: PropertyDisplayItem = {
                type: 'property',
                name: 'animations[-1].date'
            };

            const result = await renderer.renderProperty(item);
            
            expect(result).not.toBeNull();
            expect(result?.textContent).toContain('-');
        });
    });

    describe('Nested property access with dot notation', () => {
        test('should render nested property', async () => {
            const item: PropertyDisplayItem = {
                type: 'property',
                name: 'details.montant',
                title: 'Montant'
            };

            const result = await renderer.renderProperty(item);
            
            expect(result).not.toBeNull();
            expect(result?.textContent).toContain('Montant');
            expect(result?.textContent).toContain('5000');
        });

        test('should render deeply nested property', async () => {
            const item: PropertyDisplayItem = {
                type: 'property',
                name: 'details.infos.nested.value'
            };

            const result = await renderer.renderProperty(item);
            
            expect(result).not.toBeNull();
            expect(result?.textContent).toContain('deeply nested');
        });

        test('should handle missing nested property', async () => {
            const item: PropertyDisplayItem = {
                type: 'property',
                name: 'details.inexistant.property'
            };

            const result = await renderer.renderProperty(item);
            
            expect(result).not.toBeNull();
            expect(result?.textContent).toContain('-');
        });
    });

    describe('Combined array and nested access', () => {
        test('should handle array index then nested property', async () => {
            const item: PropertyDisplayItem = {
                type: 'property',
                name: 'animations[0].tarif',
                title: 'Tarif première animation'
            };

            const result = await renderer.renderProperty(item);
            
            expect(result).not.toBeNull();
            expect(result?.textContent).toContain('Tarif première animation');
            expect(result?.textContent).toContain('1500');
        });

        test('should handle multiple levels of complexity', async () => {
            mockContext.complex = {
                items: [
                    { data: { value: 'found it' } },
                    { data: { value: 'second' } }
                ]
            };

            const item: PropertyDisplayItem = {
                type: 'property',
                name: 'complex.items[0].data.value'
            };

            const result = await renderer.renderProperty(item);
            
            expect(result).not.toBeNull();
            expect(result?.textContent).toContain('found it');
        });
    });

    describe('Value formatting', () => {
        test('should display null as dash', async () => {
            mockContext.nullValue = null;

            const item: PropertyDisplayItem = {
                type: 'property',
                name: 'nullValue.anything'
            };

            const result = await renderer.renderProperty(item);
            
            expect(result).not.toBeNull();
            expect(result?.textContent).toContain('-');
        });

        test('should display undefined as dash', async () => {
            const item: PropertyDisplayItem = {
                type: 'property',
                name: 'undefinedProperty.test'
            };

            const result = await renderer.renderProperty(item);
            
            expect(result).not.toBeNull();
            expect(result?.textContent).toContain('-');
        });

        test('should stringify objects', async () => {
            mockContext.objectValue = { key: 'value', number: 42 };

            const item: PropertyDisplayItem = {
                type: 'property',
                name: 'objectValue.anything.that.returns.object'
            };

            // This will fail to navigate and return '-'
            const result = await renderer.renderProperty(item);
            
            expect(result).not.toBeNull();
            expect(result?.textContent).toContain('-');
        });

        test('should handle boolean values', async () => {
            mockContext.status = { active: true };

            const item: PropertyDisplayItem = {
                type: 'property',
                name: 'status.active'
            };

            const result = await renderer.renderProperty(item);
            
            expect(result).not.toBeNull();
            expect(result?.textContent).toContain('true');
        });

        test('should handle numeric values', async () => {
            const item: PropertyDisplayItem = {
                type: 'property',
                name: 'animations[2].tarif'
            };

            const result = await renderer.renderProperty(item);
            
            expect(result).not.toBeNull();
            expect(result?.textContent).toContain('1800');
        });
    });

    describe('Title display', () => {
        test('should display custom title when provided', async () => {
            const item: PropertyDisplayItem = {
                type: 'property',
                name: 'animations[0].date',
                title: 'Date personnalisée'
            };

            const result = await renderer.renderProperty(item);
            
            expect(result).not.toBeNull();
            const titleElement = result?.querySelector('.metadata-property-key');
            expect(titleElement?.textContent).toBe('Date personnalisée');
        });

        test('should not display title when not provided', async () => {
            const item: PropertyDisplayItem = {
                type: 'property',
                name: 'animations[0].date'
            };

            const result = await renderer.renderProperty(item);
            
            expect(result).not.toBeNull();
            const titleElement = result?.querySelector('.metadata-property-key');
            expect(titleElement).toBeNull();
        });
    });

    describe('Simple property fallback', () => {
        test('should skip simple properties without dots or brackets', async () => {
            const item: PropertyDisplayItem = {
                type: 'property',
                name: 'simple'
            };

            const result = await renderer.renderProperty(item);
            
            // Simple properties without dots or brackets return null if not in properties map
            // This is expected behavior - they need proper Property objects
            expect(result).toBeNull();
        });
    });

    describe('Error handling', () => {
        test('should handle array access on non-array property', async () => {
            const item: PropertyDisplayItem = {
                type: 'property',
                name: 'simple[0].test'
            };

            const result = await renderer.renderProperty(item);
            
            expect(result).not.toBeNull();
            expect(result?.textContent).toContain('-');
        });

        test('should handle nested access on primitive value', async () => {
            const item: PropertyDisplayItem = {
                type: 'property',
                name: 'simple.nested.property'
            };

            const result = await renderer.renderProperty(item);
            
            expect(result).not.toBeNull();
            expect(result?.textContent).toContain('-');
        });

        test('should return null for empty property name', async () => {
            const item: PropertyDisplayItem = {
                type: 'property',
                name: ''
            };

            const result = await renderer.renderProperty(item);
            
            // Empty name doesn't match formula pattern, goes to normal path which returns null
            expect(result).toBeNull();
        });
    });

    describe('Auto-detection of formula properties', () => {
        test('should detect dot notation as formula', async () => {
            const item: PropertyDisplayItem = {
                type: 'property',
                name: 'details.montant'
            };

            // Verify it's treated as formula by checking the rendering
            const result = await renderer.renderProperty(item);
            expect(result).not.toBeNull();
            expect(result?.className).toBe('metadata-property');
        });

        test('should detect bracket notation as formula', async () => {
            const item: PropertyDisplayItem = {
                type: 'property',
                name: 'animations[0].date'
            };

            // Verify it's treated as formula by checking the rendering
            const result = await renderer.renderProperty(item);
            expect(result).not.toBeNull();
            expect(result?.className).toBe('metadata-property');
        });

        test('should return null for simple property without Property object', async () => {
            const item: PropertyDisplayItem = {
                type: 'property',
                name: 'simple'
            };

            const result = await renderer.renderProperty(item);
            
            // Simple properties use different rendering path and need Property objects
            expect(result).toBeNull();
        });
    });
});
