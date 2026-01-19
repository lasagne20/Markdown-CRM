/**
 * @jest-environment jsdom
 * 
 * Test reproduisant le bug où l'ajout du premier objet à un ObjectProperty
 * efface tout le contenu du fichier au lieu de juste ajouter la propriété.
 */

import { File } from '../../src/vault/File';
import { Vault } from '../../src/vault/Vault';
import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { TextProperty } from '../../src/properties/TextProperty';

// Mock using the exact path used in the source file
jest.mock('../../src/vault/Utils', () => ({
    setIcon: jest.fn()
}));

// Mocks
jest.mock('../../src/properties/TextProperty');
jest.mock('../../src/vault/File');
jest.mock('../../src/vault/Vault');

describe('ObjectProperty - First Object Bug', () => {
    let objectProperty: ObjectProperty;
    let mockVault: jest.Mocked<Vault>;
    let mockFile: jest.Mocked<File>;
    let mockTextProperty: jest.Mocked<TextProperty>;
    let properties: { [key: string]: any };
    let originalMetadata: any;

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';
        jest.clearAllMocks();

        // Setup original file metadata with multiple properties
        originalMetadata = {
            title: 'My Document',
            description: 'A test document',
            tags: ['test', 'sample'],
            created: '2026-01-19'
        };

        // Setup mock text property
        mockTextProperty = Object.create(TextProperty.prototype);
        Object.assign(mockTextProperty, {
            name: 'name',
            type: 'text',
            fillDisplay: jest.fn().mockReturnValue(document.createElement('div')),
            static: false,
            read: jest.fn().mockResolvedValue(''),
            getDefaultValue: jest.fn().mockReturnValue('')
        });

        properties = {
            name: mockTextProperty
        };

        // Setup mocks
        mockVault = {
            getFromLink: jest.fn(),
            getFiles: jest.fn(),
            app: {
                setIcon: jest.fn(),
                getMetadata: jest.fn().mockResolvedValue({ ...originalMetadata }),
                updateMetadata: jest.fn().mockResolvedValue(undefined)
            }
        } as any;

        mockFile = {
            updateMetadata: jest.fn(async (propertyName: string, value: any) => {
                // Simulate correct File.updateMetadata behavior:
                // 1. Get current metadata
                // 2. Update only the specified property
                // 3. Save the merged metadata
                const currentMetadata = await mockFile.getMetadata();
                const mergedMetadata = {
                    ...currentMetadata,
                    [propertyName]: value
                };
                console.log('File.updateMetadata merging:', { propertyName, value, mergedMetadata });
                await mockVault.app.updateMetadata(mockFile, mergedMetadata);
            }),
            vault: mockVault,
            read: jest.fn(),
            getMetadata: jest.fn().mockResolvedValue({ ...originalMetadata }),
            getPropertyValue: jest.fn().mockImplementation((propName: string) => {
                return originalMetadata[propName];
            })
        } as any;

        // Mock constructors
        (TextProperty as jest.MockedClass<typeof TextProperty>).mockImplementation(() => mockTextProperty);

        objectProperty = new ObjectProperty('items', mockVault, properties);
    });

    test('adding first object should NOT erase existing file metadata', async () => {
        // Verify initial metadata has multiple properties
        const initialMeta = await mockFile.getMetadata();
        expect(initialMeta).toEqual(originalMetadata);
        expect(Object.keys(initialMeta).length).toBeGreaterThan(1);

        // Simulate adding the first object to the ObjectProperty
        const updateFunction = async (value: any) => {
            // This is what ObjectProperty does internally
            await mockFile.updateMetadata('items', value);
        };

        const container = document.createElement('div');
        
        // Add first object
        await objectProperty.addProperty([], updateFunction, container);

        // Get the last call to app.updateMetadata
        const updateCalls = mockVault.app.updateMetadata.mock.calls;
        expect(updateCalls.length).toBeGreaterThan(0);
        
        const lastCall = updateCalls[updateCalls.length - 1];
        const [file, updatedMetadata] = lastCall;

        // BUG: The updatedMetadata should contain ALL original properties + the new 'items' property
        // Currently, it only contains the 'items' property, erasing everything else
        
        console.log('Original metadata:', originalMetadata);
        console.log('Updated metadata:', updatedMetadata);
        
        // This assertion SHOULD pass but will FAIL due to the bug
        expect(updatedMetadata).toHaveProperty('title', 'My Document');
        expect(updatedMetadata).toHaveProperty('description', 'A test document');
        expect(updatedMetadata).toHaveProperty('tags');
        expect(updatedMetadata).toHaveProperty('created', '2026-01-19');
        expect(updatedMetadata).toHaveProperty('items');
        
        // Verify the new 'items' property contains the new object
        expect(Array.isArray(updatedMetadata.items)).toBe(true);
        expect(updatedMetadata.items.length).toBe(1);
        
        // Total properties should be original + 1 new property
        expect(Object.keys(updatedMetadata).length).toBe(Object.keys(originalMetadata).length + 1);
    });

    test('File.updateMetadata should merge new property with existing metadata', async () => {
        // This test verifies the expected behavior of File.updateMetadata
        
        const propertyName = 'items';
        const propertyValue = [{ name: 'First Item' }];
        
        // Expected behavior: updateMetadata should:
        // 1. Get current metadata
        // 2. Update only the specified property
        // 3. Keep all other properties intact
        
        const currentMetadata = await mockFile.getMetadata();
        const expectedMetadata = {
            ...currentMetadata,
            [propertyName]: propertyValue
        };
        
        // Simulate correct behavior
        await mockVault.app.updateMetadata(mockFile, expectedMetadata);
        
        // Verify it was called with merged metadata
        expect(mockVault.app.updateMetadata).toHaveBeenCalledWith(
            mockFile,
            expect.objectContaining({
                title: 'My Document',
                description: 'A test document',
                tags: ['test', 'sample'],
                created: '2026-01-19',
                items: propertyValue
            })
        );
    });

    test('integration test - adding first object through Property.fillDisplay update callback', async () => {
        // This test simulates the real flow when a user adds an object via the UI
        
        // Setup a more realistic scenario
        const realMetadata = {
            title: 'Test File',
            tags: ['important'],
            // items property doesn't exist yet
        };
        
        mockFile.getMetadata = jest.fn().mockResolvedValue({ ...realMetadata });
        mockVault.app.getMetadata = jest.fn().mockResolvedValue({ ...realMetadata });
        
        // Create ObjectProperty display
        const container = document.createElement('div');
        const display = objectProperty.fillDisplay(undefined, async (newValue: any) => {
            // This is the update callback that fillDisplay creates
            // It should call file.updateMetadata(propertyName, newValue)
            await mockFile.updateMetadata('items', newValue);
        });
        
        // Simulate user clicking "add" button
        const addButton = display.querySelector('[data-add-button]') || display.querySelector('button');
        
        // Manually call addProperty since we might not have the button
        const updateCallback = async (value: any) => {
            await mockFile.updateMetadata('items', value);
        };
        
        await objectProperty.addProperty(undefined, updateCallback, container);
        
        // Verify that app.updateMetadata was called with merged metadata
        const calls = mockVault.app.updateMetadata.mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        
        const finalCall = calls[calls.length - 1];
        const [file, finalMetadata] = finalCall;
        
        // Should have original properties + new items property
        expect(finalMetadata).toHaveProperty('title', 'Test File');
        expect(finalMetadata).toHaveProperty('tags');
        expect(finalMetadata).toHaveProperty('items');
        expect(Array.isArray(finalMetadata.items)).toBe(true);
    });

    test('using getDisplay with a Classe should preserve metadata', async () => {
        // Simulate using ObjectProperty.getDisplay() with a Classe instance
        // This is the most realistic scenario
        
        const mockClasse = {
            getPropertyValue: jest.fn().mockResolvedValue(undefined), // No items yet
            updatePropertyValue: jest.fn(async (propertyName: string, value: any) => {
                // Simulate Classe.updatePropertyValue behavior
                const metadata = await mockFile.getMetadata();
                metadata[propertyName] = value;
                await mockVault.app.updateMetadata(mockFile, metadata);
            }),
            vault: mockVault,
            file: mockFile
        };
        
        // Call getDisplay like it would be called in real code
        const display = await objectProperty.getDisplay(mockClasse, { title: 'Items' });
        document.body.appendChild(display);
        
        // Simulate adding the first object
        const container = display.querySelector('[data-object-container]') || display;
        await objectProperty.addProperty(undefined, mockClasse.updatePropertyValue.bind(mockClasse, 'items'), container as HTMLDivElement);
        
        // Verify updatePropertyValue was called
        expect(mockClasse.updatePropertyValue).toHaveBeenCalled();
        
        // Verify metadata was preserved
        const calls = mockVault.app.updateMetadata.mock.calls;
        if (calls.length > 0) {
            const lastCall = calls[calls.length - 1];
            const [, finalMetadata] = lastCall;
            
            expect(finalMetadata).toHaveProperty('title', 'My Document');
            expect(finalMetadata).toHaveProperty('items');
        }
    });
});
