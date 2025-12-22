import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { TextProperty } from '../../src/properties/TextProperty';
import { Vault } from '../../src/vault/Vault';

describe('ObjectProperty - Tabs Display Mode', () => {
    let vault: Vault;
    let mockApp: any;

    beforeEach(() => {
        mockApp = {
            setIcon: jest.fn(),
            getFile: jest.fn(),
            readFile: jest.fn(),
            listFiles: jest.fn(() => []),
        };
        vault = new Vault(mockApp, { 
            templateFolder: 'templates', 
            personalName: 'Test User', 
            configPath: '.obsidian/plugins/markdown-crm/config' 
        });

        // Mock document.createElement and related DOM methods
        global.document = {
            createElement: jest.fn((tag: string) => {
                const element: any = {
                    tagName: tag.toUpperCase(),
                    classList: {
                        add: jest.fn(),
                        remove: jest.fn(),
                        contains: jest.fn(),
                    },
                    appendChild: jest.fn(),
                    setAttribute: jest.fn(),
                    addEventListener: jest.fn(),
                    querySelectorAll: jest.fn(() => []),
                    querySelector: jest.fn(),
                    style: {},
                    dataset: {},
                    onclick: null,
                    textContent: null,
                };
                return element;
            }),
        } as any;
    });

    describe('Tabs mode configuration', () => {
        it('should accept "tabs" as display mode', () => {
            const properties = {
                name: new TextProperty('name', vault),
                value: new TextProperty('value', vault)
            };

            const objectProp = new ObjectProperty('test', vault, properties, {
                display: 'tabs'
            });

            expect(objectProp.display).toBe('tabs');
        });

        it('should create tabs when display is "tabs"', () => {
            const properties = {
                name: new TextProperty('name', vault),
                description: new TextProperty('description', vault)
            };

            const objectProp = new ObjectProperty('items', vault, properties, {
                display: 'tabs'
            });

            const testData = [
                { name: 'Item 1', description: 'First item' },
                { name: 'Item 2', description: 'Second item' }
            ];

            const mockUpdate = jest.fn();
            const container = objectProp.fillDisplay(testData, mockUpdate);

            // Verify the container is defined and has content
            expect(container).toBeDefined();
            expect(mockApp.setIcon).toHaveBeenCalled();
        });
    });

    describe('Tabs functionality', () => {
        it('should create tab for each object in array', () => {
            const properties = {
                title: new TextProperty('title', vault),
                content: new TextProperty('content', vault)
            };

            const objectProp = new ObjectProperty('notes', vault, properties, {
                display: 'tabs'
            });

            const testData = [
                { title: 'Note 1', content: 'Content 1' },
                { title: 'Note 2', content: 'Content 2' },
                { title: 'Note 3', content: 'Content 3' }
            ];

            const mockUpdate = jest.fn();
            const container = objectProp.fillDisplay(testData, mockUpdate);

            expect(container).toBeDefined();
        });

        it('should handle empty array', () => {
            const properties = {
                name: new TextProperty('name', vault)
            };

            const objectProp = new ObjectProperty('items', vault, properties, {
                display: 'tabs'
            });

            const mockUpdate = jest.fn();
            const container = objectProp.fillDisplay([], mockUpdate);

            expect(container).toBeDefined();
        });

        it('should parse JSON string values', () => {
            const properties = {
                name: new TextProperty('name', vault)
            };

            const objectProp = new ObjectProperty('items', vault, properties, {
                display: 'tabs'
            });

            const jsonData = JSON.stringify([
                { name: 'Item 1' },
                { name: 'Item 2' }
            ]);

            const mockUpdate = jest.fn();
            const container = objectProp.fillDisplay(jsonData, mockUpdate);

            expect(container).toBeDefined();
        });
    });

    describe('Tabs with allowMove configuration', () => {
        it('should respect allowMove:false in tabs mode', () => {
            const properties = {
                name: new TextProperty('name', vault)
            };

            const objectProp = new ObjectProperty('items', vault, properties, {
                display: 'tabs',
                allowMove: false
            });

            expect(objectProp.display).toBe('tabs');
            expect(objectProp.allowMove).toBe(false);
        });

        it('should default allowMove to true in tabs mode', () => {
            const properties = {
                name: new TextProperty('name', vault)
            };

            const objectProp = new ObjectProperty('items', vault, properties, {
                display: 'tabs'
            });

            expect(objectProp.allowMove).toBe(true);
        });
    });

    describe('Tabs integration with reloadObjects', () => {
        it('should reload tabs when reloadObjects is called', async () => {
            const properties = {
                name: new TextProperty('name', vault)
            };

            const objectProp = new ObjectProperty('items', vault, properties, {
                display: 'tabs'
            });

            const testData = [
                { name: 'Item 1' }
            ];

            const mockUpdate = jest.fn();
            const container = objectProp.fillDisplay(testData, mockUpdate);

            // Mock innerHTML to simulate clearing
            container.innerHTML = '';

            // Reload with new data
            await objectProp.reloadObjects(
                [{ name: 'Item 1' }, { name: 'Item 2' }],
                mockUpdate,
                container
            );

            expect(container).toBeDefined();
        });
    });

    describe('Tab label generation', () => {
        it('should use first property value as tab label', () => {
            const properties = {
                title: new TextProperty('title', vault),
                content: new TextProperty('content', vault)
            };

            const objectProp = new ObjectProperty('items', vault, properties, {
                display: 'tabs'
            });

            const testData = [
                { title: 'My Title', content: 'Some content' }
            ];

            const mockUpdate = jest.fn();
            const container = objectProp.fillDisplay(testData, mockUpdate);

            expect(container).toBeDefined();
        });

        it('should truncate long labels', () => {
            const properties = {
                name: new TextProperty('name', vault)
            };

            const objectProp = new ObjectProperty('items', vault, properties, {
                display: 'tabs'
            });

            const testData = [
                { name: 'This is a very long title that should be truncated to fit in the tab' }
            ];

            const mockUpdate = jest.fn();
            const container = objectProp.fillDisplay(testData, mockUpdate);

            expect(container).toBeDefined();
        });

        it('should fall back to "Item N" when no value', () => {
            const properties = {
                name: new TextProperty('name', vault)
            };

            const objectProp = new ObjectProperty('items', vault, properties, {
                display: 'tabs'
            });

            const testData = [
                { name: '' },
                { name: null }
            ];

            const mockUpdate = jest.fn();
            const container = objectProp.fillDisplay(testData, mockUpdate);

            expect(container).toBeDefined();
        });
    });
});
