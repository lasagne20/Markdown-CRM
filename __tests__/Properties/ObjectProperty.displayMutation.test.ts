/**
 * @jest-environment jsdom
 */

import { ObjectProperty } from "../../src/properties/ObjectProperty";
import { TextProperty } from "../../src/properties/TextProperty";
import { mockApp } from "../utils/mocks";

describe("ObjectProperty - Display Configuration Mutation Bug", () => {
    let vault: any;

    beforeEach(() => {
        const app = mockApp();
        vault = {
            app: app,
            getFromLink: jest.fn(),
            getFiles: jest.fn(),
            readLinkFile: jest.fn((link: string) => link.replace('.md', '')),
            getExtendedClasses: jest.fn(async (classes: string[]) => classes)
        };
        document.body.innerHTML = '';
    });

    it('should NOT mutate shared Property instances when using custom display config', async () => {
        // Create a shared TextProperty instance
        const sharedNameProperty = new TextProperty('name', vault, { title: 'Original Title' });
        
        // Store original title
        const originalTitle = sharedNameProperty.title;
        
        // Create ObjectProperty with custom display configuration
        const properties = {
            name: sharedNameProperty
        };

        const objectProperty = new ObjectProperty('items', vault, properties, {
            display: {
                items: [
                    {
                        type: 'property' as const,
                        name: 'name',
                        title: 'Custom Title For Item 1' // This should NOT permanently change sharedNameProperty.title
                    }
                ]
            }
        });

        const testData = [
            { name: 'Item 1' }
        ];

        const mockUpdate = jest.fn();

        // Render the display
        const container = objectProperty.fillDisplay(testData, mockUpdate);
        document.body.appendChild(container);

        // Wait for async rendering
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check that the shared property's title was NOT permanently mutated
        expect(sharedNameProperty.title).toBe(originalTitle);
        
        // Alternatively, if it WAS mutated, it should be 'Custom Title For Item 1'
        // This test will FAIL if there's a bug, demonstrating the problem
        if (sharedNameProperty.title !== originalTitle) {
            console.error('BUG DETECTED: Shared property instance was mutated!');
            console.error('Original title:', originalTitle);
            console.error('Current title:', sharedNameProperty.title);
        }
    });

    it('should NOT share display configuration between multiple object instances', async () => {
        const innerProperties = {
            detail: new TextProperty('detail', vault)
        };

        // Create a SHARED ObjectProperty instance for nested use
        const sharedDetailsProperty = new ObjectProperty('details', vault, innerProperties);
        
        // Store original display config
        const originalDisplay = sharedDetailsProperty.display;

        const outerProperties = {
            title: new TextProperty('title', vault),
            details: sharedDetailsProperty
        };

        const outerObjectProp = new ObjectProperty('items', vault, outerProperties, {
            display: {
                items: [
                    {
                        type: 'property' as const,
                        name: 'title'
                    },
                    {
                        type: 'property' as const,
                        name: 'details',
                        display: 'table' // Custom display for nested ObjectProperty
                    }
                ]
            }
        });

        const testData = [
            {
                title: 'Item 1',
                details: [
                    { detail: 'Detail 1A' }
                ]
            }
        ];

        const mockUpdate = jest.fn();

        const container = outerObjectProp.fillDisplay(testData, mockUpdate);
        document.body.appendChild(container);

        await new Promise(resolve => setTimeout(resolve, 100));

        // The shared instance should NOT have its display permanently changed
        expect(sharedDetailsProperty.display).toBe(originalDisplay);

        if (sharedDetailsProperty.display !== originalDisplay) {
            console.error('BUG: Nested ObjectProperty display was permanently mutated!');
            console.error('Original:', originalDisplay);
            console.error('Current:', sharedDetailsProperty.display);
        }
    });

    it('should create independent display configurations for each object row', async () => {
        const nameProperty = new TextProperty('name', vault, { title: 'Name' });
        
        const properties = {
            name: nameProperty
        };

        const objectProperty = new ObjectProperty('items', vault, properties, {
            display: {
                items: [
                    {
                        type: 'line' as const,
                        items: [
                            {
                                type: 'property' as const,
                                name: 'name',
                                title: 'Override Title'
                            }
                        ]
                    }
                ]
            }
        });

        const testData = [
            { name: 'First' },
            { name: 'Second' },
            { name: 'Third' }
        ];

        const mockUpdate = jest.fn();

        // Render first time
        const container1 = objectProperty.fillDisplay(testData, mockUpdate);
        document.body.appendChild(container1);
        await new Promise(resolve => setTimeout(resolve, 100));

        // The property's original title should still be intact
        const titleAfterFirstRender = nameProperty.title;

        // Render a second time (simulating multiple renders)
        const container2 = objectProperty.fillDisplay(testData, mockUpdate);
        document.body.appendChild(container2);
        await new Promise(resolve => setTimeout(resolve, 100));

        // The title should still be the same
        expect(nameProperty.title).toBe(titleAfterFirstRender);
    });

    it('should handle multiple renders without accumulating mutations', async () => {
        const valueProperty = new TextProperty('value', vault, { title: 'Value' });
        
        const properties = {
            value: valueProperty
        };

        const objectProperty = new ObjectProperty('data', vault, properties, {
            display: {
                items: [
                    {
                        type: 'property' as const,
                        name: 'value',
                        title: 'Modified Title'
                    }
                ]
            }
        });

        const testData = [{ value: 'test' }];
        const mockUpdate = jest.fn();

        // Track title changes across multiple renders
        const titles: string[] = [];
        
        for (let i = 0; i < 5; i++) {
            const container = objectProperty.fillDisplay(testData, mockUpdate);
            document.body.appendChild(container);
            await new Promise(resolve => setTimeout(resolve, 50));
            titles.push(valueProperty.title || 'undefined');
            document.body.removeChild(container);
        }

        // All titles should be the same (no accumulation of mutations)
        const allSame = titles.every(t => t === titles[0]);
        expect(allSame).toBe(true);

        console.log('Titles after each render:', titles);
    });
});
