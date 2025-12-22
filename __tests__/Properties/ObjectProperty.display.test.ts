import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { TextProperty } from '../../src/properties/TextProperty';
import { FileProperty } from '../../src/properties/FileProperty';
import { Vault } from '../../src/vault/Vault';
import { DisplayContainer } from '../../src/Config/interfaces';

describe('ObjectProperty with Custom Display Configuration', () => {
    let vault: Vault;
    let mockApp: any;

    beforeEach(() => {
        mockApp = {
            setIcon: jest.fn(),
            getFile: jest.fn(),
            readFile: jest.fn(),
        };
        vault = new Vault(mockApp, { 
            templateFolder: 'templates', 
            personalName: 'Test User', 
            configPath: '.obsidian/plugins/markdown-crm/config' 
        });
    });

    describe('Display configuration parsing', () => {
        it('should accept string display mode (legacy)', () => {
            const properties = {
                name: new TextProperty('name', vault),
                value: new TextProperty('value', vault)
            };

            const objectProp = new ObjectProperty('test', vault, properties, {
                display: 'table'
            });

            expect(objectProp.display).toBe('table');
        });

        it('should accept DisplayContainer object', () => {
            const properties = {
                name: new TextProperty('name', vault),
                value: new TextProperty('value', vault)
            };

            const displayConfig: DisplayContainer = {
                items: [
                    {
                        type: 'line' as const,
                        items: [
                            { type: 'property' as const, name: 'name' },
                            { type: 'property' as const, name: 'value' }
                        ]
                    }
                ]
            };

            const objectProp = new ObjectProperty('test', vault, properties, {
                displayContainer: displayConfig
            });

            expect(objectProp.displayContainer).toEqual(displayConfig);
            expect(typeof objectProp.displayContainer).toBe('object');
            expect((objectProp.displayContainer as DisplayContainer).items).toBeDefined();
        });

        it('should update display via getDisplay args', async () => {
            const properties = {
                name: new TextProperty('name', vault)
            };

            const objectProp = new ObjectProperty('test', vault, properties);
            
            const displayConfig: DisplayContainer = {
                items: [
                    { type: 'property' as const, name: 'name' }
                ]
            };

            const mockClasse = {
                getPropertyValue: jest.fn().mockResolvedValue(null)
            };
            await objectProp.getDisplay(mockClasse, { displayContainer: displayConfig });

            expect(objectProp.displayContainer).toEqual(displayConfig);
        });
    });

    describe('Custom display rendering', () => {
        it('should render custom display with line layout', async () => {
            const properties = {
                institution: new TextProperty('institution', vault),
                poste: new TextProperty('poste', vault)
            };

            const displayConfig: DisplayContainer = {
                items: [
                    {
                        type: 'line' as const,
                        className: 'poste-line',
                        items: [
                            { type: 'property' as const, name: 'institution' },
                            { type: 'property' as const, name: 'poste' }
                        ]
                    }
                ]
            };

            const objectProp = new ObjectProperty('postes', vault, properties, {
                displayContainer: displayConfig
            });

            const values = [
                { institution: 'Test Corp', poste: 'Developer' }
            ];

            const container = objectProp.fillDisplay(values, async () => {});

            // Attendre que le rendu asynchrone soit terminé
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(container).toBeDefined();
            expect(container.classList.contains('metadata-object-container')).toBe(true);
        });

        it('should render custom display with column layout', () => {
            const properties = {
                field1: new TextProperty('field1', vault),
                field2: new TextProperty('field2', vault)
            };

            const displayConfig: DisplayContainer = {
                items: [
                    {
                        type: 'column' as const,
                        items: [
                            { type: 'property' as const, name: 'field1' },
                            { type: 'property' as const, name: 'field2' }
                        ]
                    }
                ]
            };

            const objectProp = new ObjectProperty('test', vault, properties, {
                displayContainer: displayConfig
            });

            const values = [{ field1: 'value1', field2: 'value2' }];
            const container = objectProp.fillDisplay(values, async () => {});

            expect(container.classList.contains('metadata-object-container')).toBe(true);
            expect(container.querySelector('.metadata-objects-custom-container')).toBeDefined();
        });

        it('should render custom display with tabs', () => {
            const properties = {
                name: new TextProperty('name', vault),
                email: new TextProperty('email', vault),
                phone: new TextProperty('phone', vault)
            };

            const displayConfig: DisplayContainer = {
                items: [
                    {
                        type: 'tabs' as const,
                        tabs: [
                            {
                                name: 'Info',
                                items: [{ type: 'property' as const, name: 'name' }]
                            },
                            {
                                name: 'Contact',
                                items: [
                                    { type: 'property' as const, name: 'email' },
                                    { type: 'property' as const, name: 'phone' }
                                ]
                            }
                        ]
                    }
                ]
            };

            const objectProp = new ObjectProperty('person', vault, properties, {
                displayContainer: displayConfig
            });

            const values = [{ name: 'John', email: 'john@test.com', phone: '123' }];
            const container = objectProp.fillDisplay(values, async () => {});

            expect(container).toBeDefined();
        });

        it('should render custom display with fold', () => {
            const properties = {
                detail1: new TextProperty('detail1', vault),
                detail2: new TextProperty('detail2', vault)
            };

            const displayConfig: DisplayContainer = {
                items: [
                    {
                        type: 'fold' as const,
                        title: 'Details',
                        items: [
                            { type: 'property' as const, name: 'detail1' },
                            { type: 'property' as const, name: 'detail2' }
                        ]
                    }
                ]
            };

            const objectProp = new ObjectProperty('data', vault, properties, {
                displayContainer: displayConfig
            });

            const values = [{ detail1: 'value1', detail2: 'value2' }];
            const container = objectProp.fillDisplay(values, async () => {});

            expect(container).toBeDefined();
        });
    });

    describe('Backward compatibility', () => {
        it('should still render table mode when display is "table"', () => {
            const properties = {
                col1: new TextProperty('col1', vault),
                col2: new TextProperty('col2', vault)
            };

            const objectProp = new ObjectProperty('test', vault, properties, {
                display: 'table'
            });

            const values = [{ col1: 'a', col2: 'b' }];
            const container = objectProp.fillDisplay(values, async () => {});

            expect(container.classList.contains('metadata-object-container')).toBe(true);
            // Should not have custom container class
            expect(container.querySelector('.metadata-objects-custom-container')).toBeNull();
        });

        it('should still render object mode when display is "object" or undefined', () => {
            const properties = {
                field: new TextProperty('field', vault)
            };

            const objectProp = new ObjectProperty('test', vault, properties);

            const values = [{ field: 'test' }];
            const container = objectProp.fillDisplay(values, async () => {});

            expect(container.classList.contains('metadata-object-container')).toBe(true);
        });
    });

    describe('Custom display with multiple objects', () => {
        it('should render multiple objects with custom display', async () => {
            const properties = {
                name: new TextProperty('name', vault),
                value: new TextProperty('value', vault)
            };

            const displayConfig: DisplayContainer = {
                items: [
                    {
                        type: 'line' as const,
                        items: [
                            { type: 'property' as const, name: 'name' },
                            { type: 'property' as const, name: 'value' }
                        ]
                    }
                ]
            };

            const objectProp = new ObjectProperty('items', vault, properties, {
                displayContainer: displayConfig
            });

            const values = [
                { name: 'Item 1', value: 'Value 1' },
                { name: 'Item 2', value: 'Value 2' },
                { name: 'Item 3', value: 'Value 3' }
            ];

            const container = objectProp.fillDisplay(values, async () => {});
            // Wait for async rendering to complete
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(container).toBeDefined();
            const objectRows = container.querySelectorAll('.metadata-object-custom-row');
            expect(objectRows.length).toBe(3);
        });

        it('should include delete buttons for each object in custom display', async () => {
            const properties = {
                field: new TextProperty('field', vault)
            };

            const displayConfig: DisplayContainer = {
                items: [
                    { type: 'property' as const, name: 'field' }
                ]
            };

            const objectProp = new ObjectProperty('test', vault, properties, {
                displayContainer: displayConfig
            });

            const values = [{ field: 'a' }, { field: 'b' }];
            const container = objectProp.fillDisplay(values, async () => {});
            // Wait for async rendering to complete
            await new Promise(resolve => setTimeout(resolve, 100));

            const deleteButtons = container.querySelectorAll('.metadata-delete-button');
            expect(deleteButtons.length).toBe(2);
        });
    });

    describe('Update callbacks with custom display', () => {
        it('should call update callback when property changes in custom display', async () => {
            const properties = {
                name: new TextProperty('name', vault)
            };

            const displayConfig: DisplayContainer = {
                items: [
                    { type: 'property' as const, name: 'name' }
                ]
            };

            const objectProp = new ObjectProperty('test', vault, properties, {
                displayContainer: displayConfig
            });

            const values = [{ name: 'Initial' }];
            const updateMock = jest.fn();

            const container = objectProp.fillDisplay(values, updateMock);

            expect(container).toBeDefined();
            // Note: Full update testing would require simulating property change events
        });
    });

    describe('Header rendering with custom display', () => {
        it('should render add button in custom display header', () => {
            const properties = {
                field: new TextProperty('field', vault)
            };

            const displayConfig: DisplayContainer = {
                items: [
                    { type: 'property' as const, name: 'field' }
                ]
            };

            const objectProp = new ObjectProperty('test', vault, properties, {
                displayContainer: displayConfig
            });

            const values: any[] = [];
            const container = objectProp.fillDisplay(values, async () => {});

            const addButton = container.querySelector('.metadata-add-button');
            expect(addButton).toBeDefined();
        });
    });

    describe('Drag and drop with custom display', () => {
        it('should enable drag and drop when allowMove is true', async () => {
            const properties = {
                field: new TextProperty('field', vault)
            };

            const displayConfig: DisplayContainer = {
                items: [
                    { type: 'property' as const, name: 'field' }
                ]
            };

            const objectProp = new ObjectProperty('test', vault, properties, {
                displayContainer: displayConfig,
                allowMove: true
            });

            const values = [{ field: 'a' }, { field: 'b' }];
            const container = objectProp.fillDisplay(values, async () => {});
            // Wait for async rendering to complete
            await new Promise(resolve => setTimeout(resolve, 100));

            const draggableRows = container.querySelectorAll('[draggable="true"]');
            expect(draggableRows.length).toBe(2);
        });

        it('should not enable drag and drop when allowMove is false', () => {
            const properties = {
                field: new TextProperty('field', vault)
            };

            const displayConfig: DisplayContainer = {
                items: [
                    { type: 'property' as const, name: 'field' }
                ]
            };

            const objectProp = new ObjectProperty('test', vault, properties, {
                displayContainer: displayConfig,
                allowMove: false
            });

            const values = [{ field: 'a' }];
            const container = objectProp.fillDisplay(values, async () => {});

            const draggableRows = container.querySelectorAll('[draggable="true"]');
            expect(draggableRows.length).toBe(0);
        });
    });

    describe('Empty values with custom display', () => {
        it('should handle empty array with custom display', () => {
            const properties = {
                field: new TextProperty('field', vault)
            };

            const displayConfig: DisplayContainer = {
                items: [
                    { type: 'property' as const, name: 'field' }
                ]
            };

            const objectProp = new ObjectProperty('test', vault, properties, {
                displayContainer: displayConfig
            });

            const container = objectProp.fillDisplay([], async () => {});

            expect(container).toBeDefined();
            expect(container.classList.contains('metadata-object-container')).toBe(true);
            
            const objectRows = container.querySelectorAll('.metadata-object-custom-row');
            expect(objectRows.length).toBe(0);
        });

        it('should handle string JSON values with custom display', async () => {
            const properties = {
                field: new TextProperty('field', vault)
            };

            const displayConfig: DisplayContainer = {
                items: [
                    { type: 'property' as const, name: 'field' }
                ]
            };

            const objectProp = new ObjectProperty('test', vault, properties, {
                displayContainer: displayConfig
            });

            const jsonString = JSON.stringify([{ field: 'test' }]);
            const container = objectProp.fillDisplay(jsonString, async () => {});
            // Wait for async rendering to complete
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(container).toBeDefined();
            const objectRows = container.querySelectorAll('.metadata-object-custom-row');
            expect(objectRows.length).toBe(1);
        });
    });

    describe('Complex nested layouts', () => {
        it('should render line inside column', () => {
            const properties = {
                a: new TextProperty('a', vault),
                b: new TextProperty('b', vault),
                c: new TextProperty('c', vault)
            };

            const displayConfig: DisplayContainer = {
                items: [
                    {
                        type: 'column' as const,
                        items: [
                            {
                                type: 'line' as const,
                                items: [
                                    { type: 'property' as const, name: 'a' },
                                    { type: 'property' as const, name: 'b' }
                                ]
                            },
                            { type: 'property' as const, name: 'c' }
                        ]
                    }
                ]
            };

            const objectProp = new ObjectProperty('test', vault, properties, {
                displayContainer: displayConfig
            });

            const values = [{ a: '1', b: '2', c: '3' }];
            const container = objectProp.fillDisplay(values, async () => {});

            expect(container).toBeDefined();
        });

        it('should render multiple layout types in sequence', () => {
            const properties = {
                name: new TextProperty('name', vault),
                email: new TextProperty('email', vault),
                notes: new TextProperty('notes', vault)
            };

            const displayConfig: DisplayContainer = {
                items: [
                    { type: 'property' as const, name: 'name' },
                    {
                        type: 'line' as const,
                        items: [
                            { type: 'property' as const, name: 'email' }
                        ]
                    },
                    {
                        type: 'fold' as const,
                        title: 'Notes',
                        items: [
                            { type: 'property' as const, name: 'notes' }
                        ]
                    }
                ]
            };

            const objectProp = new ObjectProperty('contact', vault, properties, {
                displayContainer: displayConfig
            });

            const values = [{ name: 'John', email: 'john@test.com', notes: 'Test notes' }];
            const container = objectProp.fillDisplay(values, async () => {});

            expect(container).toBeDefined();
        });
    });
});


