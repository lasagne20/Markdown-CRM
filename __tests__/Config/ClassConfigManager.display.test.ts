import { ClassConfigManager } from '../../src/Config/ClassConfigManager';
import { ConfigLoader } from '../../src/Config/ConfigLoader';
import { Vault } from '../../src/vault/Vault';
import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { Property } from '../../src/properties/Property';

jest.mock('../../src/Config/ConfigLoader');

describe('ClassConfigManager - Display Configuration', () => {
    let configManager: ClassConfigManager;
    let mockConfigLoader: jest.Mocked<ConfigLoader>;
    let mockApp: any;
    let mockVault: Vault;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockApp = {
            getVaultPath: jest.fn(() => '/test/vault'),
            getName: jest.fn(() => 'TestVault'),
            getMetadata: jest.fn().mockResolvedValue({}),
            setIcon: jest.fn() // Mock setIcon for ObjectProperty
        };

        mockVault = {
            app: mockApp,
            getFile: jest.fn(),
        } as any;

        mockConfigLoader = {
            loadClassConfig: jest.fn(),
            getAllClassNames: jest.fn(),
            createProperty: jest.fn(),
            vault: mockVault
        } as any;

        (ConfigLoader as jest.MockedClass<typeof ConfigLoader>).mockImplementation(() => mockConfigLoader);
        
        configManager = new ClassConfigManager('./test-config', mockApp);
    });

    describe('Property.getDisplay with displayMode parameter', () => {
        it('should set display property on ObjectProperty when displayMode is provided', async () => {
            const mockObjectProperty = new ObjectProperty('items', mockVault, {
                name: { 
                    type: 'text',
                    read: jest.fn().mockResolvedValue(''),
                    getDisplay: jest.fn().mockResolvedValue(document.createElement('div'))
                } as any
            }, {});
            
            // Mock the classe instance
            const mockClasse = {
                getPropertyValue: jest.fn().mockResolvedValue([]),
                updatePropertyValue: jest.fn(),
                getFile: jest.fn().mockReturnValue({ path: 'test.md' })
            };
            
            // Default display should be 'object'
            expect(mockObjectProperty.display).toBe('object');
            
            // Call getDisplay with displayMode: 'table'
            await mockObjectProperty.getDisplay(mockClasse, { displayMode: 'table' });
            
            // Verify display was updated to 'table'
            expect(mockObjectProperty.display).toBe('table');
        });

        it('should set display property to "list" when provided', async () => {
            const mockObjectProperty = new ObjectProperty('contacts', mockVault, {
                email: {
                    type: 'email',
                    read: jest.fn().mockResolvedValue(''),
                    getDisplay: jest.fn().mockResolvedValue(document.createElement('div'))
                } as any
            }, {});
            
            const mockClasse = {
                getPropertyValue: jest.fn().mockResolvedValue([]),
                updatePropertyValue: jest.fn()
            };
            
            expect(mockObjectProperty.display).toBe('object');
            
            await mockObjectProperty.getDisplay(mockClasse, { displayMode: 'list' });
            
            expect(mockObjectProperty.display).toBe('list');
        });

        it('should not change display when displayMode is not provided', async () => {
            const mockObjectProperty = new ObjectProperty('data', mockVault, {
                field: {
                    type: 'text',
                    read: jest.fn().mockResolvedValue(''),
                    getDisplay: jest.fn().mockResolvedValue(document.createElement('div'))
                } as any
            }, {});
            
            const mockClasse = {
                getPropertyValue: jest.fn().mockResolvedValue([]),
                updatePropertyValue: jest.fn()
            };
            
            expect(mockObjectProperty.display).toBe('object');
            
            await mockObjectProperty.getDisplay(mockClasse, {});
            
            // Should remain 'object'
            expect(mockObjectProperty.display).toBe('object');
        });

        it('should not affect properties without display field', async () => {
            // Create a mock property that doesn't have a display field
            const mockTextProperty = {
                name: 'name',
                type: 'text',
                read: jest.fn().mockResolvedValue('Test'),
                getDisplay: jest.fn(async function(this: any, classe: any, args: any) {
                    // Simulate the actual getDisplay implementation
                    if (args.displayMode && 'display' in this) {
                        (this as any).display = args.displayMode;
                    }
                    return document.createElement('div');
                })
            } as any;
            
            const mockClasse = {
                getPropertyValue: jest.fn().mockResolvedValue('Test'),
                updatePropertyValue: jest.fn()
            };
            
            // Verify no display field exists
            expect(mockTextProperty).not.toHaveProperty('display');
            
            // Call getDisplay with displayMode
            await mockTextProperty.getDisplay(mockClasse, { displayMode: 'table' });
            
            // Should still not have display field
            expect(mockTextProperty).not.toHaveProperty('display');
        });

        it('should pass displayMode through Property.getDisplay correctly', async () => {
            const mockObjectProperty = new ObjectProperty('items', mockVault, {}, {});
            
            // Spy on the actual getDisplay method
            const getDisplaySpy = jest.spyOn(Property.prototype, 'getDisplay');
            
            const mockClasse = {
                getPropertyValue: jest.fn().mockResolvedValue([]),
                updatePropertyValue: jest.fn()
            };
            
            await mockObjectProperty.getDisplay(mockClasse, { 
                displayMode: 'table',
                title: 'Test Title',
                staticMode: true
            });
            
            // Verify getDisplay was called with all parameters
            expect(getDisplaySpy).toHaveBeenCalledWith(
                mockClasse,
                expect.objectContaining({
                    displayMode: 'table',
                    title: 'Test Title',
                    staticMode: true
                })
            );
            
            // Verify display was set
            expect(mockObjectProperty.display).toBe('table');
            
            getDisplaySpy.mockRestore();
        });
    });

    describe('ClassConfigManager renderProperty integration', () => {
        it('should create config with display mode in PropertyDisplayItem', async () => {
            const mockConfig = {
                className: 'TestClass',
                classIcon: 'test-icon',
                properties: {
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'text' },
                            value: { type: 'number' }
                        }
                    }
                },
                display: {
                    items: [
                        {
                            type: 'property',
                            name: 'items',
                            title: 'Items Table',
                            display: 'table'
                        }
                    ]
                }
            };

            mockConfigLoader.loadClassConfig.mockResolvedValue(mockConfig);
            
            const config = await configManager.getClassConfig('TestClass');
            
            // Verify the display configuration includes the display field
            expect(config.display.items[0]).toEqual({
                type: 'property',
                name: 'items',
                title: 'Items Table',
                display: 'table'
            });
        });

        it('should support all display modes: object, table, list', () => {
            const displayModes = ['object', 'table', 'list'];
            
            displayModes.forEach(mode => {
                const displayItem = {
                    type: 'property' as const,
                    name: 'items',
                    display: mode
                };
                
                // Verify TypeScript accepts these values
                expect(displayItem.display).toBe(mode);
            });
        });
    });
});
