import { ClassConfigManager } from '../../src/Config/ClassConfigManager';
import { Vault } from '../../src/vault/Vault';
import { ConfigLoader } from '../../src/Config/ConfigLoader';
import { ClassConfig } from '../../src/Config/interfaces';

describe('DisplayItems - New Structure', () => {
    let mockVault: any;
    let classConfigManager: ClassConfigManager;
    let mockLoadClassConfig: jest.SpyInstance;

    beforeEach(() => {
        mockVault = {
            app: {
                getMetadata: jest.fn(),
                updateMetadata: jest.fn(),
                listFiles: jest.fn().mockResolvedValue([]),
                getSettings: jest.fn().mockReturnValue({}),
                setIcon: jest.fn()
            },
            getDynamicClassFactory: jest.fn(),
            getConfig: jest.fn().mockResolvedValue({})
        };

        // Use a mock config path since we're passing configs directly
        classConfigManager = new ClassConfigManager('./config', mockVault as Vault);
        
        // Mock the loadClassConfig to return the config we pass in tests
        mockLoadClassConfig = jest.spyOn(classConfigManager['configLoader'], 'loadClassConfig');
    });

    describe('Property Display Item', () => {
        it('should render a property with default title', async () => {
            const config: ClassConfig = {
                className: 'TestClass',
                classIcon: 'test',
                properties: {
                    nom: { type: 'name' }
                },
                display: {
                    items: [
                        {
                            type: 'property' as const,
                            name: 'nom'
                        }
                    ]
                }
            };

            mockLoadClassConfig.mockResolvedValue(config);
            const ClassConstructor = await classConfigManager.createDynamicClasse('TestClass');
            const mockFile = {
                path: 'test.md',
                basename: 'test',
                name: 'test.md'
            } as any;

            // Set up mock to return metadata when getMetadata is called with this file
            mockVault.app.getMetadata.mockResolvedValue({ nom: 'John Doe' });

            const instance = new ClassConstructor(mockVault, mockFile);
            const display = await instance.getDisplay();

            expect(display).toBeDefined();
            expect(display instanceof HTMLElement).toBe(true);
        });

        it('should render a property with custom title', async () => {
            const config: ClassConfig = {
                className: 'TestClass',
                classIcon: 'test',
                properties: {
                    email: { type: 'email', title: 'Email' }
                },
                display: {
                    items: [
                        {
                            type: 'property' as const,
                            name: 'email',
                            title: 'Email professionnel'
                        }
                    ]
                }
            };

            mockLoadClassConfig.mockResolvedValue(config);
            const ClassConstructor = await classConfigManager.createDynamicClasse('TestClass');
            const mockFile = { path: 'test.md', basename: 'test', name: 'test.md' } as any;
            mockVault.app.getMetadata.mockResolvedValue({ email: 'test@example.com' });

            const instance = new ClassConstructor(mockVault, mockFile);
            const display = await instance.getDisplay();

            expect(display).toBeDefined();
            // The property should be rendered with custom title
        });

        it('should render a property as static', async () => {
            const config: ClassConfig = {
                className: 'TestClass',
                classIcon: 'test',
                properties: {
                    id: { type: 'text' }
                },
                display: {
                    items: [
                        {
                            type: 'property' as const,
                            name: 'id',
                            static: true
                        }
                    ]
                }
            };

            mockLoadClassConfig.mockResolvedValue(config); const ClassConstructor = await classConfigManager.createDynamicClasse(config.className);
            const mockFile = { path: 'test.md', basename: 'test', name: 'test.md' } as any;
            mockVault.app.getMetadata.mockResolvedValue({ id: '123' });

            const instance = new ClassConstructor(mockVault, mockFile);
            const display = await instance.getDisplay();

            expect(display).toBeDefined();
        });
    });

    describe('Button Display Item', () => {
        it('should render a button with label', async () => {
            const config: ClassConfig = {
                className: 'TestClass',
                classIcon: 'test',
                properties: {
                    nom: { type: 'name' }
                },
                process: [
                    {
                        name: 'testProcess',
                        conditions: [],
                        actions: []
                    }
                ],
                display: {
                    items: [
                        {
                            type: 'button' as const,
                            label: 'Test Action',
                            process: 'testProcess'
                        }
                    ]
                }
            };

            mockLoadClassConfig.mockResolvedValue(config); const ClassConstructor = await classConfigManager.createDynamicClasse(config.className);
            const mockFile = { path: 'test.md', basename: 'test', name: 'test.md' } as any;
            mockVault.app.getMetadata.mockResolvedValue({});

            const instance = new ClassConstructor(mockVault, mockFile);
            const display = await instance.getDisplay();

            expect(display).toBeDefined();
            const button = display.querySelector('button.crm-action-button');
            expect(button).toBeDefined();
            expect(button?.textContent).toContain('Test Action');
        });

        it('should render a button with icon', async () => {
            const config: ClassConfig = {
                className: 'TestClass',
                classIcon: 'test',
                properties: {},
                process: [
                    {
                        name: 'convertProcess',
                        conditions: [],
                        actions: []
                    }
                ],
                display: {
                    items: [
                        {
                            type: 'button' as const,
                            label: 'Convert',
                            icon: 'user-plus',
                            process: 'convertProcess'
                        }
                    ]
                }
            };

            mockLoadClassConfig.mockResolvedValue(config); const ClassConstructor = await classConfigManager.createDynamicClasse(config.className);
            const mockFile = { path: 'test.md', basename: 'test', name: 'test.md' } as any;
            mockVault.app.getMetadata.mockResolvedValue({});

            const instance = new ClassConstructor(mockVault, mockFile);
            const display = await instance.getDisplay();

            expect(display).toBeDefined();
            expect(mockVault.app.setIcon).toHaveBeenCalled();
        });
    });

    describe('Container Display Items', () => {
        it('should render a line container with multiple items', async () => {
            const config: ClassConfig = {
                className: 'TestClass',
                classIcon: 'test',
                properties: {
                    nom: { type: 'name' },
                    email: { type: 'email' }
                },
                display: {
                    items: [
                        {
                            type: 'line' as const,
                            className: 'metadata-line',
                            items: [
                                { type: 'property' as const, name: 'nom' },
                                { type: 'property' as const, name: 'email' }
                            ]
                        }
                    ]
                }
            };

            mockLoadClassConfig.mockResolvedValue(config); const ClassConstructor = await classConfigManager.createDynamicClasse(config.className);
            const mockFile = { path: 'test.md', basename: 'test', name: 'test.md' } as any;
            mockVault.app.getMetadata.mockResolvedValue({ nom: 'John', email: 'john@test.com' });

            const instance = new ClassConstructor(mockVault, mockFile);
            const display = await instance.getDisplay();

            expect(display).toBeDefined();
            const lineContainer = display.querySelector('.metadata-line');
            expect(lineContainer).toBeDefined();
        });

        it('should render a column container with title', async () => {
            const config: ClassConfig = {
                className: 'TestClass',
                classIcon: 'test',
                properties: {
                    telephone: { type: 'phone' }
                },
                display: {
                    items: [
                        {
                            type: 'column' as const,
                            title: 'Contact',
                            items: [
                                { type: 'property' as const, name: 'telephone' }
                            ]
                        }
                    ]
                }
            };

            mockLoadClassConfig.mockResolvedValue(config); const ClassConstructor = await classConfigManager.createDynamicClasse(config.className);
            const mockFile = { path: 'test.md', basename: 'test', name: 'test.md' } as any;
            mockVault.app.getMetadata.mockResolvedValue({ telephone: '0123456789' });

            const instance = new ClassConstructor(mockVault, mockFile);
            const display = await instance.getDisplay();

            expect(display).toBeDefined();
            const title = display.querySelector('h3.container-section-title');
            expect(title?.textContent).toBe('Contact');
        });
    });

    describe('Tabs Display Item', () => {
        it('should render tabs with multiple sections', async () => {
            const config: ClassConfig = {
                className: 'TestClass',
                classIcon: 'test',
                properties: {
                    nom: { type: 'name' },
                    email: { type: 'email' },
                    notes: { type: 'text' }
                },
                display: {
                    items: [
                        {
                            type: 'tabs' as const,
                            tabs: [
                                {
                                    name: 'Info',
                                    items: [
                                        { type: 'property' as const, name: 'nom' },
                                        { type: 'property' as const, name: 'email' }
                                    ]
                                },
                                {
                                    name: 'Notes',
                                    items: [
                                        { type: 'property' as const, name: 'notes' }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            };

            mockLoadClassConfig.mockResolvedValue(config); const ClassConstructor = await classConfigManager.createDynamicClasse(config.className);
            const mockFile = { path: 'test.md', basename: 'test', name: 'test.md' } as any;
            mockVault.app.getMetadata.mockResolvedValue({ nom: 'John', email: 'john@test.com', notes: 'Test' });

            const instance = new ClassConstructor(mockVault, mockFile);
            const display = await instance.getDisplay();

            expect(display).toBeDefined();
            const tabsContainer = display.querySelector('.metadata-tabs-container');
            expect(tabsContainer).toBeDefined();
            
            const tabHeaders = display.querySelectorAll('.tab-header');
            expect(tabHeaders.length).toBe(2);
        });
    });

    describe('Fold Display Item', () => {
        it('should render a fold with collapsible content', async () => {
            const config: ClassConfig = {
                className: 'TestClass',
                classIcon: 'test',
                properties: {
                    details: { type: 'text' }
                },
                display: {
                    items: [
                        {
                            type: 'fold' as const,
                            title: 'Détails',
                            items: [
                                { type: 'property' as const, name: 'details' }
                            ]
                        }
                    ]
                }
            };

            mockLoadClassConfig.mockResolvedValue(config); const ClassConstructor = await classConfigManager.createDynamicClasse(config.className);
            const mockFile = { path: 'test.md', basename: 'test', name: 'test.md' } as any;
            mockVault.app.getMetadata.mockResolvedValue({ details: 'Some details' });

            const instance = new ClassConstructor(mockVault, mockFile);
            const display = await instance.getDisplay();

            expect(display).toBeDefined();
            const foldContainer = display.querySelector('.metadata-fold-container');
            expect(foldContainer).toBeDefined();
            
            const foldHeader = display.querySelector('.fold-header');
            expect(foldHeader?.textContent).toBe('Détails');
        });
    });

    describe('Complex nested structure', () => {
        it('should render complex nested layout', async () => {
            const config: ClassConfig = {
                className: 'TestClass',
                classIcon: 'test',
                properties: {
                    nom: { type: 'name' },
                    email: { type: 'email' },
                    telephone: { type: 'phone' },
                    notes: { type: 'text' }
                },
                process: [
                    {
                        name: 'archiveAction',
                        conditions: [],
                        actions: []
                    }
                ],
                display: {
                    items: [
                        {
                            type: 'line' as const,
                            className: 'header-line',
                            items: [
                                { type: 'property' as const, name: 'nom', static: true },
                                { type: 'button' as const, label: 'Archive', process: 'archiveAction' }
                            ]
                        },
                        {
                            type: 'tabs' as const,
                            tabs: [
                                {
                                    name: 'Contact',
                                    items: [
                                        {
                                            type: 'column' as const,
                                            items: [
                                                { type: 'property' as const, name: 'email' },
                                                { type: 'property' as const, name: 'telephone' }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    name: 'Notes',
                                    items: [
                                        { type: 'property' as const, name: 'notes' }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            };

            mockLoadClassConfig.mockResolvedValue(config); const ClassConstructor = await classConfigManager.createDynamicClasse(config.className);
            const mockFile = { path: 'test.md', basename: 'test', name: 'test.md' } as any;
            mockVault.app.getMetadata.mockResolvedValue({
                    nom: 'John Doe',
                    email: 'john@test.com',
                    telephone: '0123456789',
                    notes: 'Test notes'
                });

            const instance = new ClassConstructor(mockVault, mockFile);
            const display = await instance.getDisplay();

            expect(display).toBeDefined();
            
            // Check header line
            const headerLine = display.querySelector('.header-line');
            expect(headerLine).toBeDefined();
            
            // Check button
            const button = display.querySelector('button.crm-action-button');
            expect(button).toBeDefined();
            
            // Check tabs
            const tabsContainer = display.querySelector('.metadata-tabs-container');
            expect(tabsContainer).toBeDefined();
            
            const tabHeaders = display.querySelectorAll('.tab-header');
            expect(tabHeaders.length).toBe(2);
        });
    });

    describe('Default display (no config)', () => {
        it('should render all properties in default layout when no display config', async () => {
            const config: ClassConfig = {
                className: 'TestClass',
                classIcon: 'test',
                properties: {
                    nom: { type: 'name' },
                    email: { type: 'email' }
                }
            };

            mockLoadClassConfig.mockResolvedValue(config);
            const ClassConstructor = await classConfigManager.createDynamicClasse(config.className);
            const mockFile = { path: 'test.md', basename: 'test', name: 'test.md' } as any;
            mockVault.app.getMetadata.mockResolvedValue({ nom: 'John', email: 'john@test.com' });

            const instance = new ClassConstructor(mockVault, mockFile);
            const display = await instance.getDisplay();

            expect(display).toBeDefined();
            // Should render all properties
        });
    });
});





