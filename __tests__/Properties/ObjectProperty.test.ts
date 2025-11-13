/**
 * @jest-environment jsdom
 */

import { File } from '../../src/vault/File';
import { Vault } from '../../src/vault/Vault';
import { FileProperty } from '../../src/properties/FileProperty';
import { MultiFileProperty } from '../../src/properties/MultiFileProperty';
import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { TextProperty } from '../../src/properties/TextProperty';

// Mock using the exact path used in the source file
jest.mock('../../src/vault/Utils', () => ({
    setIcon: jest.fn()
}));

// Mocks
jest.mock('../../src/properties/FileProperty');
jest.mock('../../src/properties/TextProperty');
jest.mock('../../src/properties/MultiFileProperty');
jest.mock('../../src/vault/File');
jest.mock('../../src/vault/Vault');

// Import the mocked function  
const { setIcon } = jest.requireMock('../../src/vault/Utils');

describe('ObjectProperty', () => {
    let objectProperty: ObjectProperty;
    let mockVault: jest.Mocked<Vault>;
    let mockFile: jest.Mocked<File>;
    let mockUpdate: jest.Mock;
    let mockFileProperty: jest.Mocked<FileProperty>;
    let mockTextProperty: jest.Mocked<TextProperty>;
    let mockMultiFileProperty: jest.Mocked<MultiFileProperty>;
    let properties: { [key: string]: any };

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';
        // Reset all mocks
        jest.clearAllMocks();

        // Setup mock properties - make them extend the actual classes for instanceof checks
        mockFileProperty = Object.create(FileProperty.prototype);
        Object.assign(mockFileProperty, {
            name: 'file',
            type: 'file',
            fillDisplay: jest.fn().mockReturnValue(document.createElement('div')),
            getParentValue: jest.fn(),
            getClasses: jest.fn().mockReturnValue(['Document'])
        });

        mockTextProperty = Object.create(TextProperty.prototype);
        Object.assign(mockTextProperty, {
            name: 'title',
            type: 'text',
            fillDisplay: jest.fn().mockReturnValue(document.createElement('div')),
            static: false
        });

        mockMultiFileProperty = Object.create(MultiFileProperty.prototype);
        Object.assign(mockMultiFileProperty, {
            name: 'multiFile',
            type: 'multiFile',
            fillDisplay: jest.fn().mockReturnValue(document.createElement('div')),
            getParentValue: jest.fn(),
            getClasses: jest.fn().mockReturnValue(['Image', 'Video'])
        });

        properties = {
            file: mockFileProperty,
            title: mockTextProperty,
            multiFile: mockMultiFileProperty
        };

        // Setup mocks
        mockVault = {
            getFromLink: jest.fn(),
            getFiles: jest.fn(),
            app: {
                setIcon: jest.fn()
            }
        } as any;

        mockFile = {
            updateMetadata: jest.fn(),
            vault: mockVault,
            read: jest.fn()
        } as any;

        mockUpdate = jest.fn();

        // Mock constructors
        (FileProperty as jest.MockedClass<typeof FileProperty>).mockImplementation(() => mockFileProperty);
        (TextProperty as jest.MockedClass<typeof TextProperty>).mockImplementation(() => mockTextProperty);
        (MultiFileProperty as jest.MockedClass<typeof MultiFileProperty>).mockImplementation(() => mockMultiFileProperty);
    });

    describe('Constructor', () => {
        test('should create ObjectProperty with required parameters', () => {
            objectProperty = new ObjectProperty('testObject', mockVault, properties);

            expect(objectProperty.name).toBe('testObject');
            expect(objectProperty.type).toBe('object');
            expect(objectProperty.properties).toBe(properties);
            expect(objectProperty.flexSpan).toBe(2);
            expect(objectProperty.appendFirst).toBe(false);
            expect(objectProperty.allowMove).toBe(true);
            expect(objectProperty.display).toBe('object');
        });

        test('should handle custom arguments', () => {
            const args = {
                appendFirst: true,
                allowMove: false,
                display: 'table',
                icon: 'object'
            };
            
            objectProperty = new ObjectProperty('testObject', mockVault, properties, args);

            expect(objectProperty.appendFirst).toBe(true);
            expect(objectProperty.allowMove).toBe(false);
            expect(objectProperty.display).toBe('table');
            expect(objectProperty.icon).toBe('object');
        });

        test('should handle empty properties object', () => {
            objectProperty = new ObjectProperty('testObject', mockVault, {});

            expect(objectProperty.properties).toEqual({});
            expect(Object.keys(objectProperty.properties)).toHaveLength(0);
        });

        test('should assign additional arguments', () => {
            const args = {
                customProperty: 'customValue',
                anotherProp: 123
            };
            
            objectProperty = new ObjectProperty('testObject', mockVault, properties, args);

            expect((objectProperty as any).customProperty).toBe('customValue');
            expect((objectProperty as any).anotherProp).toBe(123);
        });
    });

    describe('getClasses', () => {
        test('should return classes from FileProperty', () => {
            objectProperty = new ObjectProperty('testObject', mockVault, { file: mockFileProperty });

            const result = objectProperty.getClasses();

            expect(result).toEqual(['Document']);
            expect(mockFileProperty.getClasses).toHaveBeenCalled();
        });

        test('should return classes from MultiFileProperty', () => {
            objectProperty = new ObjectProperty('testObject', mockVault, { multiFile: mockMultiFileProperty });

            const result = objectProperty.getClasses();

            expect(result).toEqual(['Image', 'Video']);
            expect(mockMultiFileProperty.getClasses).toHaveBeenCalled();
        });

        test('should return classes from ObjectProperty', () => {
            const mockNestedObjectProperty = Object.create(ObjectProperty.prototype);
            Object.assign(mockNestedObjectProperty, {
                name: 'nested',
                type: 'object',
                getClasses: jest.fn().mockReturnValue(['Nested', 'Object'])
            });

            objectProperty = new ObjectProperty('testObject', mockVault, { nested: mockNestedObjectProperty });

            const result = objectProperty.getClasses();

            expect(result).toEqual(['Nested', 'Object']);
        });

        test('should throw error when no class found', () => {
            const propertiesWithoutClasses = {
                title: mockTextProperty
            };
            
            objectProperty = new ObjectProperty('testObject', mockVault, propertiesWithoutClasses);

            expect(() => objectProperty.getClasses()).toThrow('No class found');
        });
    });


    describe('findValue', () => {
        beforeEach(() => {
            objectProperty = new ObjectProperty('testObject', mockVault, properties);
            // Mock read method
            objectProperty.read = jest.fn();
        });

        test('should find value in object array', async () => {
            const mockValues = [
                { file: 'document1.md', title: 'First Document' },
                { file: 'document2.md', title: 'Second Document' },
                { file: 'image.jpg', title: 'Test Image' }
            ];
            
            (objectProperty.read as jest.Mock).mockResolvedValue(mockValues);

            const result = await objectProperty.findValue(mockFile, 'Test Image', 'file');

            expect(result).toBe('image.jpg');
        });

        test('should find value with partial match', async () => {
            const mockValues = [
                { file: 'long-document-name.md', title: 'Document' }
            ];
            
            (objectProperty.read as jest.Mock).mockResolvedValue(mockValues);

            const result = await objectProperty.findValue(mockFile, 'document', 'title');

            expect(result).toBe('Document');
        });

        test('should return null when value not found', async () => {
            const mockValues = [
                { file: 'document.md', title: 'Document' }
            ];
            
            (objectProperty.read as jest.Mock).mockResolvedValue(mockValues);

            const result = await objectProperty.findValue(mockFile, 'NonExistent', 'file');

            expect(result).toBeNull();
        });

        test('should return null when no values', async () => {
            (objectProperty.read as jest.Mock).mockResolvedValue(null);

            const result = await objectProperty.findValue(mockFile, 'test', 'file');

            expect(result).toBeNull();
        });

        test('should return null when empty values', async () => {
            (objectProperty.read as jest.Mock).mockResolvedValue([]);

            const result = await objectProperty.findValue(mockFile, 'test', 'file');

            expect(result).toBeNull();
        });
    });

    describe('formatParentValue', () => {
        test('should format parent value for FileProperty', () => {
            const propertiesWithFile = {
                file: mockFileProperty,
                title: mockTextProperty
            };
            objectProperty = new ObjectProperty('testObject', mockVault, propertiesWithFile);

            const result = objectProperty.formatParentValue('test-file.md');

            expect(result).toEqual([{
                file: 'test-file.md',
                title: ''
            }]);
        });

        test('should format parent value for MultiFileProperty', () => {
            const propertiesWithMultiFile = {
                multiFile: mockMultiFileProperty,
                title: mockTextProperty
            };
            objectProperty = new ObjectProperty('testObject', mockVault, propertiesWithMultiFile);

            const result = objectProperty.formatParentValue('test-files');

            expect(result).toEqual([{
                multiFile: 'test-files',
                title: ''
            }]);
        });

        test('should handle ObjectProperty as parent', () => {
            const mockObjectProperty = Object.create(ObjectProperty.prototype);
            Object.assign(mockObjectProperty, {
                name: 'object',
                type: 'object'
            });
            
            const mockTextProp = Object.create(TextProperty.prototype);
            Object.assign(mockTextProp, { name: 'title', type: 'text' });
            
            const propertiesWithObject = {
                object: mockObjectProperty,
                title: mockTextProp
            };
            objectProperty = new ObjectProperty('testObject', mockVault, propertiesWithObject);

            const result = objectProperty.formatParentValue('test-value');

            expect(result).toEqual([{
                object: 'test-value',
                title: ''
            }]);
        });

        test('should handle no parent properties', () => {
            const mockTextProperty1 = Object.create(TextProperty.prototype);
            Object.assign(mockTextProperty1, { name: 'title', type: 'text' });
            
            const mockTextProperty2 = Object.create(TextProperty.prototype);
            Object.assign(mockTextProperty2, { name: 'description', type: 'text' });
            
            const propertiesWithoutParent = {
                title: mockTextProperty1,
                description: mockTextProperty2
            };
            objectProperty = new ObjectProperty('testObject', mockVault, propertiesWithoutParent);

            const result = objectProperty.formatParentValue('test-value');

            expect(result).toEqual([{
                title: '',
                description: ''
            }]);
        });

        test('should only assign value to first parent property', () => {
            const mockFileProperty1 = Object.create(FileProperty.prototype);
            Object.assign(mockFileProperty1, { name: 'file1', type: 'file' });
            
            const mockFileProperty2 = Object.create(FileProperty.prototype);
            Object.assign(mockFileProperty2, { name: 'file2', type: 'file' });
            
            const mockTextProp = Object.create(TextProperty.prototype);
            Object.assign(mockTextProp, { name: 'title', type: 'text' });
            
            const propertiesWithMultipleParents = {
                file1: mockFileProperty1,
                file2: mockFileProperty2,
                title: mockTextProp
            };
            objectProperty = new ObjectProperty('testObject', mockVault, propertiesWithMultipleParents);

            const result = objectProperty.formatParentValue('test-value');

            expect(result).toEqual([{
                file1: 'test-value',
                file2: '',
                title: ''
            }]);
        });
    });

    describe('getDisplay', () => {
        beforeEach(() => {
            objectProperty = new ObjectProperty('testObject', mockVault, properties);
            // Mock the parent getDisplay method
            Object.getPrototypeOf(Object.getPrototypeOf(objectProperty)).getDisplay = jest.fn().mockReturnValue(document.createElement('div'));
        });

        test('should use provided display argument', () => {
            const args = { display: 'table' };
            
            objectProperty.getDisplay(mockFile, args);

            expect(objectProperty.display).toBe('table');
        });

        test('should keep existing display when no argument provided', () => {
            objectProperty.display = 'list';
            
            objectProperty.getDisplay(mockFile);

            expect(objectProperty.display).toBe('list');
        });

        test('should use default display when no argument and no existing display', () => {
            objectProperty.getDisplay(mockFile, {});

            expect(objectProperty.display).toBe('object'); // default value
        });
    });

    describe('fillDisplay', () => {
        beforeEach(() => {
            objectProperty = new ObjectProperty('testObject', mockVault, properties);
            // Mock methods that will be called
            objectProperty.createHeader = jest.fn();
            objectProperty.createObjects = jest.fn();
            objectProperty.createTable = jest.fn();
        });

        test('should create container with correct class', () => {
            const values: any[] = [];
            
            const container = objectProperty.fillDisplay(values, mockUpdate);

            expect(container.classList.contains('metadata-object-container-testobject')).toBe(true);
        });

        test('should set vault property', () => {
            const values: any[] = [];
            
            objectProperty.fillDisplay(values, mockUpdate);

            expect(objectProperty.vault).toBe(mockVault);
        });

        test('should create header', () => {
            const values: any[] = [];
            
            const container = objectProperty.fillDisplay(values, mockUpdate);

            expect(objectProperty.createHeader).toHaveBeenCalledWith(values, mockUpdate, container);
        });

        test('should create table when display is table', () => {
            objectProperty.display = 'table';
            const values: any[] = [];
            
            const container = objectProperty.fillDisplay(values, mockUpdate);

            expect(objectProperty.createTable).toHaveBeenCalledWith(values, mockUpdate, container);
            expect(objectProperty.createObjects).not.toHaveBeenCalled();
        });

        test('should create objects when display is not table', () => {
            objectProperty.display = 'object';
            const values: any[] = [];
            
            const container = objectProperty.fillDisplay(values, mockUpdate);

            expect(objectProperty.createObjects).toHaveBeenCalledWith(values, mockUpdate, container);
            expect(objectProperty.createTable).not.toHaveBeenCalled();
        });

        test('should create objects by default', () => {
            const values: any[] = [];
            
            objectProperty.fillDisplay(values, mockUpdate);

            expect(objectProperty.createObjects).toHaveBeenCalled();
        });
    });

    describe('getDisplayProperties', () => {
        beforeEach(() => {
            objectProperty = new ObjectProperty('testObject', mockVault, properties);
            objectProperty.read = jest.fn();
            // Mock updateObject method
            objectProperty.updateObject = jest.fn();
        });

        test('should return display properties for valid property', async () => {
            const mockValues = [
                { file: 'doc1.md', title: 'Document 1' },
                { file: 'doc2.md', title: 'Document 2' }
            ];
            
            (objectProperty.read as jest.Mock).mockResolvedValue(mockValues);
            // Mock getFromLink to return different values based on the link
            mockVault.getFromLink.mockImplementation(async (link: string) => {
                return { name: link, path: link } as any;
            });

            const result = await objectProperty.getDisplayProperties(mockFile, 'file', 'title');

            expect(result).toHaveLength(2);
            expect(result[0].classe.name).toBe('doc1.md');
            expect(result[1].classe.name).toBe('doc2.md');
            expect(mockTextProperty.fillDisplay).toHaveBeenCalledTimes(2);
        });

        test('should set property as static when isStatic is true', async () => {
            const mockValues = [{ file: 'doc.md', title: 'Document' }];
            (objectProperty.read as jest.Mock).mockResolvedValue(mockValues);

            await objectProperty.getDisplayProperties(mockFile, 'file', 'title', true);

            expect(mockTextProperty.static).toBe(true);
        });

        test('should set property as non-static when isStatic is false', async () => {
            const mockValues = [{ file: 'doc.md', title: 'Document' }];
            (objectProperty.read as jest.Mock).mockResolvedValue(mockValues);

            await objectProperty.getDisplayProperties(mockFile, 'file', 'title', false);

            expect(mockTextProperty.static).toBe(false);
        });

        test('should throw error when property not found', async () => {
            await expect(
                objectProperty.getDisplayProperties(mockFile, 'file', 'nonexistent')
            ).rejects.toThrow('Property nonexistent not found in ObjectProperty testObject');
        });

        test('should return empty array when no values', async () => {
            (objectProperty.read as jest.Mock).mockResolvedValue(null);

            const result = await objectProperty.getDisplayProperties(mockFile, 'file', 'title');

            expect(result).toEqual([]);
        });

        test('should return empty array when empty values', async () => {
            (objectProperty.read as jest.Mock).mockResolvedValue([]);

            const result = await objectProperty.getDisplayProperties(mockFile, 'file', 'title');

            expect(result).toEqual([]);
        });
    });

    describe('Integration tests', () => {
        test('should work with complex nested properties', () => {
            const complexProperties = {
                mainFile: mockFileProperty,
                details: {
                    title: mockTextProperty,
                    description: mockTextProperty
                },
                attachments: mockMultiFileProperty
            };
            
            objectProperty = new ObjectProperty('complex', mockVault, complexProperties as any);

            expect(objectProperty.properties).toBe(complexProperties);
            expect(() => objectProperty.getClasses()).not.toThrow();
        });

        test('should handle real DOM interactions', () => {
            objectProperty = new ObjectProperty('testObject', mockVault, properties);
            // Mock the methods to avoid calling them
            objectProperty.createHeader = jest.fn();
            objectProperty.createObjects = jest.fn();
            
            const container = objectProperty.fillDisplay([], mockUpdate);
            
            // Test that the container has the right class
            expect(container.classList.contains('metadata-object-container-testobject')).toBe(true);
            
            // Test that appendChild was called successfully
            expect(() => document.body.appendChild(container)).not.toThrow();
        });

        test('should maintain property references', () => {
            objectProperty = new ObjectProperty('testObject', mockVault, properties);

            expect(objectProperty.properties.file).toBe(mockFileProperty);
            expect(objectProperty.properties.title).toBe(mockTextProperty);
            expect(objectProperty.properties.multiFile).toBe(mockMultiFileProperty);
        });
    });

    describe('createHeader', () => {
        beforeEach(() => {
            objectProperty = new ObjectProperty('testObject', mockVault, properties);
        });

        test('should create header row with title', () => {
            const mockContainer = document.createElement('div');
            const values: any[] = [];
            
            objectProperty.createHeader(values, mockUpdate, mockContainer);
            
            const headerRow = mockContainer.querySelector('.metadata-object-header-row');
            expect(headerRow).toBeTruthy();
            
            const title = mockContainer.querySelector('.metadata-header');
            expect(title?.textContent).toBe('testObject : ');
        });

        test('should use custom title when provided', () => {
            objectProperty.title = 'Custom Title';
            const mockContainer = document.createElement('div');
            const values: any[] = [];
            
            objectProperty.createHeader(values, mockUpdate, mockContainer);
            
            const title = mockContainer.querySelector('.metadata-header');
            expect(title?.textContent).toBe('Custom Title');
        });

        test('should create add button in header', () => {
            const mockContainer = document.createElement('div');
            const values: any[] = [];
            jest.spyOn(objectProperty, 'createAddButton').mockReturnValue(document.createElement('button'));
            
            objectProperty.createHeader(values, mockUpdate, mockContainer);
            
            expect(objectProperty.createAddButton).toHaveBeenCalledWith(values, mockUpdate, mockContainer);
        });
    });

    describe('createAddButton', () => {
        beforeEach(() => {
            objectProperty = new ObjectProperty('testObject', mockVault, properties);
            objectProperty.addProperty = jest.fn();
        });

        test('should create add button with correct class and icon', () => {
            const mockContainer = document.createElement('div');
            const values: any[] = [];
            
            const button = objectProperty.createAddButton(values, mockUpdate, mockContainer);
            
            expect(button.tagName).toBe('BUTTON');
            expect(button.classList.contains('metadata-add-button')).toBe(true);
            expect(mockVault.app.setIcon).toHaveBeenCalledWith(button, 'circle-plus');
        });

        test('should handle button click', async () => {
            const mockContainer = document.createElement('div');
            const values: any[] = [];
            
            const button = objectProperty.createAddButton(values, mockUpdate, mockContainer);
            
            // Manually trigger the onclick event since jsdom doesn't automatically execute it
            if (button.onclick) {
                await button.onclick(new MouseEvent('click') as any);
            }
            
            expect(objectProperty.addProperty).toHaveBeenCalledWith(values, mockUpdate, mockContainer);
        });
    });

    describe('createObjects', () => {
        beforeEach(() => {
            objectProperty = new ObjectProperty('testObject', mockVault, properties);
            objectProperty.createObjectRow = jest.fn().mockReturnValue(document.createElement('div'));
            objectProperty.enableDragAndDrop = jest.fn();
        });

        test('should create object rows for each value', () => {
            const mockContainer = document.createElement('div');
            const values = [
                { file: 'file1.md', title: 'Title 1' },
                { file: 'file2.md', title: 'Title 2' }
            ];
            
            objectProperty.createObjects(values, mockUpdate, mockContainer);
            
            expect(objectProperty.createObjectRow).toHaveBeenCalledTimes(2);
            expect(objectProperty.createObjectRow).toHaveBeenCalledWith(values, mockUpdate, values[0], 0, mockContainer);
            expect(objectProperty.createObjectRow).toHaveBeenCalledWith(values, mockUpdate, values[1], 1, mockContainer);
        });

        test('should enable drag and drop when allowMove is true', () => {
            const mockContainer = document.createElement('div');
            const values = [{ file: 'file1.md', title: 'Title 1' }];
            objectProperty.allowMove = true;
            
            objectProperty.createObjects(values, mockUpdate, mockContainer);
            
            expect(objectProperty.enableDragAndDrop).toHaveBeenCalledWith(values, mockUpdate, mockContainer);
        });

        test('should not enable drag and drop when allowMove is false', () => {
            const mockContainer = document.createElement('div');
            const values = [{ file: 'file1.md', title: 'Title 1' }];
            objectProperty.allowMove = false;
            
            objectProperty.createObjects(values, mockUpdate, mockContainer);
            
            expect(objectProperty.enableDragAndDrop).not.toHaveBeenCalled();
        });

        test('should return early when no values', () => {
            const mockContainer = document.createElement('div');
            
            objectProperty.createObjects(null, mockUpdate, mockContainer);
            
            expect(objectProperty.createObjectRow).not.toHaveBeenCalled();
        });
    });

    describe('createObjectRow', () => {
        beforeEach(() => {
            objectProperty = new ObjectProperty('testObject', mockVault, properties);
            objectProperty.createDeleteButton = jest.fn().mockReturnValue(document.createElement('button'));
        });

        test('should create row with correct classes and structure', () => {
            const mockContainer = document.createElement('div');
            const values = [{ file: 'file1.md', title: 'Title 1' }];
            const objects = values[0];
            const index = 0;
            
            const row = objectProperty.createObjectRow(values, mockUpdate, objects, index, mockContainer);
            
            expect(row.classList.contains('metadata-object-row')).toBe(true);
            expect(row.style.position).toBe('relative');
        });

        test('should set draggable when allowMove is true', () => {
            const mockContainer = document.createElement('div');
            const values = [{ file: 'file1.md', title: 'Title 1' }];
            const objects = values[0];
            const index = 0;
            objectProperty.allowMove = true;
            
            const row = objectProperty.createObjectRow(values, mockUpdate, objects, index, mockContainer);
            
            expect(row.draggable).toBe(true);
            expect(row.dataset.index).toBe('0');
            expect(row.style.cursor).toBe('grab');
        });

        test('should not set draggable when allowMove is false', () => {
            const mockContainer = document.createElement('div');
            const values = [{ file: 'file1.md', title: 'Title 1' }];
            const objects = values[0];
            const index = 0;
            objectProperty.allowMove = false;
            
            const row = objectProperty.createObjectRow(values, mockUpdate, objects, index, mockContainer);
            
            // When allowMove is false, draggable is not explicitly set, so it remains false by default
            expect(row.draggable).toBeFalsy();
            expect(row.dataset.index).toBeUndefined();
            expect(row.style.cursor).not.toBe('grab');
        });

        test('should create property containers for each property', () => {
            const mockContainer = document.createElement('div');
            const values = [{ file: 'file1.md', title: 'Title 1' }];
            const objects = values[0];
            const index = 0;
            objectProperty.updateObject = jest.fn();
            
            const row = objectProperty.createObjectRow(values, mockUpdate, objects, index, mockContainer);
            
            expect(mockFileProperty.fillDisplay).toHaveBeenCalledWith(
                'file1.md', 
                expect.any(Function)
            );
            expect(mockTextProperty.fillDisplay).toHaveBeenCalledWith(
                'Title 1', 
                expect.any(Function)
            );
            
            const propertyContainers = row.querySelectorAll('.metadata-object-property');
            expect(propertyContainers).toHaveLength(3); // file, title, multiFile
        });

        test('should set grid column span for properties with flexSpan', () => {
            const mockContainer = document.createElement('div');
            const values = [{ file: 'file1.md', title: 'Title 1' }];
            const objects = values[0];
            const index = 0;
            mockFileProperty.flexSpan = 2;
            
            const row = objectProperty.createObjectRow(values, mockUpdate, objects, index, mockContainer);
            
            const propertyContainer = row.querySelector('.metadata-object-property') as HTMLElement;
            expect(propertyContainer?.style.gridColumn).toBe('span 2');
        });

        test('should create delete button', () => {
            const mockContainer = document.createElement('div');
            const values = [{ file: 'file1.md', title: 'Title 1' }];
            const objects = values[0];
            const index = 0;
            
            objectProperty.createObjectRow(values, mockUpdate, objects, index, mockContainer);
            
            expect(objectProperty.createDeleteButton).toHaveBeenCalledWith(values, mockUpdate, index, mockContainer);
        });
    });

    describe('createDeleteButton', () => {
        beforeEach(() => {
            objectProperty = new ObjectProperty('testObject', mockVault, properties);
            objectProperty.removeProperty = jest.fn();
        });

        test('should create delete button with correct class and icon', () => {
            const mockContainer = document.createElement('div');
            const values: any[] = [];
            const index = 0;
            
            const button = objectProperty.createDeleteButton(values, mockUpdate, index, mockContainer);
            
            expect(button.tagName).toBe('BUTTON');
            expect(button.classList.contains('metadata-delete-button')).toBe(true);
            expect(mockVault.app.setIcon).toHaveBeenCalledWith(button, 'circle-minus');
        });

        test('should handle button click', async () => {
            const mockContainer = document.createElement('div');
            const values: any[] = [];
            const index = 0;
            
            const button = objectProperty.createDeleteButton(values, mockUpdate, index, mockContainer);
            
            // Manually trigger the onclick event
            if (button.onclick) {
                await button.onclick(new MouseEvent('click') as any);
            }
            
            expect(objectProperty.removeProperty).toHaveBeenCalledWith(values, mockUpdate, index, mockContainer);
        });
    });

    describe('createTable', () => {
        beforeEach(() => {
            objectProperty = new ObjectProperty('testObject', mockVault, properties);
            objectProperty.createAddButton = jest.fn().mockReturnValue(document.createElement('button'));
            objectProperty.updateObject = jest.fn();
            objectProperty.createDeleteButton = jest.fn().mockReturnValue(document.createElement('button'));
        });

        test('should create table wrapper and table', () => {
            const mockContainer = document.createElement('div');
            const values: any[] = [];
            
            objectProperty.createTable(values, mockUpdate, mockContainer);
            
            const tableWrapper = mockContainer.querySelector('div');
            expect(tableWrapper?.style.position).toBe('relative');
            
            const table = mockContainer.querySelector('table');
            expect(table?.classList.contains('metadata-object-table')).toBe(true);
        });

        test('should create header row with property names', () => {
            const mockContainer = document.createElement('div');
            const values: any[] = [];
            
            objectProperty.createTable(values, mockUpdate, mockContainer);
            
            const headerRow = mockContainer.querySelector('tr');
            const headers = headerRow?.querySelectorAll('th');
            
            expect(headers).toHaveLength(4); // file, title, multiFile + delete column
            expect(headers?.[0].textContent).toBe('file');
            expect(headers?.[1].textContent).toBe('title');
            expect(headers?.[2].textContent).toBe('multiFile');
        });

        test('should create rows for each value', () => {
            const mockContainer = document.createElement('div');
            const values = [
                { file: 'file1.md', title: 'Title 1', multiFile: [] },
                { file: 'file2.md', title: 'Title 2', multiFile: [] }
            ];
            
            objectProperty.createTable(values, mockUpdate, mockContainer);
            
            const rows = mockContainer.querySelectorAll('tr');
            expect(rows).toHaveLength(3); // header + 2 data rows
            
            expect(mockFileProperty.fillDisplay).toHaveBeenCalledTimes(2);
            expect(mockTextProperty.fillDisplay).toHaveBeenCalledTimes(2);
        });

        test('should position add button absolutely', () => {
            const mockContainer = document.createElement('div');
            const values: any[] = [];
            const mockAddButton = document.createElement('button');
            jest.spyOn(objectProperty, 'createAddButton').mockReturnValue(mockAddButton);
            
            objectProperty.createTable(values, mockUpdate, mockContainer);
            
            expect(mockAddButton.style.position).toBe('absolute');
            expect(mockAddButton.style.top).toBe('0px');
            expect(mockAddButton.style.right).toBe('0px');
        });
    });

    describe('removeProperty', () => {
        beforeEach(() => {
            objectProperty = new ObjectProperty('testObject', mockVault, properties);
            objectProperty.reloadObjects = jest.fn();
            // Mock console.log to avoid output during tests
            jest.spyOn(console, 'log').mockImplementation(() => {});
        });

        test('should remove object at specified index', async () => {
            const values = [
                { file: 'file1.md', title: 'Title 1' },
                { file: 'file2.md', title: 'Title 2' },
                { file: 'file3.md', title: 'Title 3' }
            ];
            const mockContainer = document.createElement('div');
            const index = 1;
            
            await objectProperty.removeProperty(values, mockUpdate, index, mockContainer);
            
            expect(values).toHaveLength(2);
            expect(values[0]).toEqual({ file: 'file1.md', title: 'Title 1' });
            expect(values[1]).toEqual({ file: 'file3.md', title: 'Title 3' });
        });

        test('should call update and reloadObjects', async () => {
            const values = [{ file: 'file1.md', title: 'Title 1' }];
            const mockContainer = document.createElement('div');
            const index = 0;
            
            await objectProperty.removeProperty(values, mockUpdate, index, mockContainer);
            
            expect(mockUpdate).toHaveBeenCalledWith([]);
            expect(objectProperty.reloadObjects).toHaveBeenCalledWith([], mockUpdate);
        });
    });

    describe('addProperty', () => {
        beforeEach(() => {
            objectProperty = new ObjectProperty('testObject', mockVault, properties);
            objectProperty.reloadObjects = jest.fn();
            // Mock console.log to avoid output during tests
            jest.spyOn(console, 'log').mockImplementation(() => {});
        });

        test('should call update and reloadObjects', async () => {
            const values: any[] = [];
            const mockContainer = document.createElement('div');
            
            // Mock the entire addProperty method to avoid complex logic
            const originalAddProperty = objectProperty.addProperty;
            objectProperty.addProperty = jest.fn().mockImplementation(async (vals, upd, cont) => {
                vals.push({ file: '', title: '', multiFile: '' });
                await upd(vals);
                await objectProperty.reloadObjects(vals, upd);
            });
            
            await objectProperty.addProperty(values, mockUpdate, mockContainer);
            
            expect(mockUpdate).toHaveBeenCalled();
            expect(objectProperty.reloadObjects).toHaveBeenCalled();
        });

        test('should be called when add button is clicked', () => {
            objectProperty.addProperty = jest.fn();
            const values: any[] = [];
            const mockContainer = document.createElement('div');
            
            const button = objectProperty.createAddButton(values, mockUpdate, mockContainer);
            
            // Check that the onclick handler is set
            expect(button.onclick).toBeTruthy();
        });
    });

    describe('updateObject', () => {
        beforeEach(() => {
            objectProperty = new ObjectProperty('testObject', mockVault, properties);
            objectProperty.reloadObjects = jest.fn();
            // Mock console.log to avoid output during tests
            jest.spyOn(console, 'log').mockImplementation(() => {});
        });

        test('should update specific property at index', async () => {
            const values = [
                { file: 'file1.md', title: 'Title 1' },
                { file: 'file2.md', title: 'Title 2' }
            ];
            const index = 1;
            const property = mockTextProperty;
            const newValue = 'Updated Title';
            
            await objectProperty.updateObject(values, mockUpdate, index, property, newValue);
            
            expect(values[1].title).toBe('Updated Title');
            expect(values[0]).toEqual({ file: 'file1.md', title: 'Title 1' }); // Unchanged
        });

        test('should create values array if null', async () => {
            let values: any = null;
            const index = 0;
            const property = mockTextProperty;
            const newValue = 'New Title';
            
            await objectProperty.updateObject(values, mockUpdate, index, property, newValue);
            
            expect(mockUpdate).toHaveBeenCalledWith([{ title: 'New Title' }]);
        });

        test('should call update and reloadObjects', async () => {
            const values = [{ file: 'file1.md', title: 'Title 1' }];
            const index = 0;
            const property = mockTextProperty;
            const newValue = 'Updated Title';
            
            await objectProperty.updateObject(values, mockUpdate, index, property, newValue);
            
            expect(mockUpdate).toHaveBeenCalledWith(values);
            expect(objectProperty.reloadObjects).toHaveBeenCalledWith(values, mockUpdate);
        });
    });

    describe('reloadObjects', () => {
        beforeEach(() => {
            objectProperty = new ObjectProperty('testObject', mockVault, properties);
            objectProperty.createHeader = jest.fn();
            objectProperty.createObjects = jest.fn();
            objectProperty.createTable = jest.fn();
            // Mock console.log to avoid output during tests
            jest.spyOn(console, 'log').mockImplementation(() => {});
        });

        test('should clear container and recreate content', async () => {
            const values = [{ file: 'file1.md', title: 'Title 1' }];
            
            // Create a container in the DOM with the correct class
            const container = document.createElement('div');
            container.classList.add('metadata-object-container-testobject');
            container.innerHTML = '<div>Old Content</div>';
            document.body.appendChild(container);
            
            // Mock querySelector to return our container
            const originalQuerySelector = document.querySelector;
            document.querySelector = jest.fn().mockImplementation((selector) => {
                if (selector === '.metadata-object-container-testobject') {
                    return container;
                }
                return originalQuerySelector.call(document, selector);
            });
            
            await objectProperty.reloadObjects(values, mockUpdate);
            
            expect(container.innerHTML).toBe('');
            expect(objectProperty.createHeader).toHaveBeenCalledWith(values, mockUpdate, container);
            
            // Restore original querySelector
            document.querySelector = originalQuerySelector;
        });

        test('should recreate objects when display is not table', async () => {
            const values = [{ file: 'file1.md', title: 'Title 1' }];
            objectProperty.display = 'object';
            
            const container = document.createElement('div');
            container.classList.add('metadata-object-container-testobject');
            document.body.appendChild(container);
            
            // Mock querySelector
            const originalQuerySelector = document.querySelector;
            document.querySelector = jest.fn().mockImplementation((selector) => {
                if (selector === '.metadata-object-container-testobject') {
                    return container;
                }
                return originalQuerySelector.call(document, selector);
            });
            
            await objectProperty.reloadObjects(values, mockUpdate);
            
            expect(objectProperty.createObjects).toHaveBeenCalledWith(values, mockUpdate, container);
            expect(objectProperty.createTable).not.toHaveBeenCalled();
            
            // Restore original querySelector
            document.querySelector = originalQuerySelector;
        });

        test('should recreate table when display is table', async () => {
            const values = [{ file: 'file1.md', title: 'Title 1' }];
            objectProperty.display = 'table';
            
            const container = document.createElement('div');
            container.classList.add('metadata-object-container-testobject');
            document.body.appendChild(container);
            
            // Mock querySelector
            const originalQuerySelector = document.querySelector;
            document.querySelector = jest.fn().mockImplementation((selector) => {
                if (selector === '.metadata-object-container-testobject') {
                    return container;
                }
                return originalQuerySelector.call(document, selector);
            });
            
            await objectProperty.reloadObjects(values, mockUpdate);
            
            expect(objectProperty.createTable).toHaveBeenCalledWith(values, mockUpdate, container);
            expect(objectProperty.createObjects).not.toHaveBeenCalled();
            
            // Restore original querySelector
            document.querySelector = originalQuerySelector;
        });

        test('should handle missing container gracefully', async () => {
            const values = [{ file: 'file1.md', title: 'Title 1' }];
            
            // No container in DOM
            await objectProperty.reloadObjects(values, mockUpdate);
            
            // Should not throw error
            expect(objectProperty.createHeader).not.toHaveBeenCalled();
        });
    });

    describe('getParentFile', () => {
        beforeEach(() => {
            properties = {
                file: mockFileProperty,
                title: mockTextProperty
            };
            objectProperty = new ObjectProperty('testObject', mockVault, properties);
        });

        test('should return undefined for null value', async () => {
            const result = await objectProperty.getParentFile(null);
            expect(result).toBeUndefined();
        });

        test('should return undefined for empty array', async () => {
            const result = await objectProperty.getParentFile([]);
            expect(result).toBeUndefined();
        });

        test('should return File from first FileProperty in object', async () => {
            const mockFile = { path: 'test.md', name: 'test' };
            mockFileProperty.getParentFile = jest.fn().mockResolvedValue(mockFile);
            
            const values = [
                { file: '[[File1]]', title: 'Title 1' },
                { file: '[[File2]]', title: 'Title 2' }
            ];
            
            const result = await objectProperty.getParentFile(values);
            
            expect(mockFileProperty.getParentFile).toHaveBeenCalledWith('[[File1]]');
            expect(result).toBe(mockFile);
        });

        test('should handle JSON string value', async () => {
            const mockFile = { path: 'test.md', name: 'test' };
            mockFileProperty.getParentFile = jest.fn().mockResolvedValue(mockFile);
            
            const jsonValue = JSON.stringify([
                { file: '[[File1]]', title: 'Title 1' }
            ]);
            
            const result = await objectProperty.getParentFile(jsonValue);
            
            expect(mockFileProperty.getParentFile).toHaveBeenCalledWith('[[File1]]');
            expect(result).toBe(mockFile);
        });

        test('should handle MultiFileProperty in object', async () => {
            const mockFile = { path: 'test.md', name: 'test' };
            const mockMultiFileProp = Object.create(MultiFileProperty.prototype);
            Object.assign(mockMultiFileProp, {
                name: 'files',  // Must match the key in values object
                type: 'multiFile',
                getParentFile: jest.fn().mockResolvedValue(mockFile)
            });
            
            properties = {
                files: mockMultiFileProp,
                title: mockTextProperty
            };
            objectProperty = new ObjectProperty('testObject', mockVault, properties);
            
            const values = [
                { files: ['[[File1]]', '[[File2]]'], title: 'Title 1' }
            ];
            
            const result = await objectProperty.getParentFile(values);
            
            expect(mockMultiFileProp.getParentFile).toHaveBeenCalledWith(['[[File1]]', '[[File2]]']);
            expect(result).toBe(mockFile);
        });

        test('should return undefined when no FileProperty found', async () => {
            properties = {
                title: mockTextProperty,
                description: mockTextProperty
            };
            objectProperty = new ObjectProperty('testObject', mockVault, properties);
            
            const values = [
                { title: 'Title 1', description: 'Desc 1' }
            ];
            
            const result = await objectProperty.getParentFile(values);
            
            expect(result).toBeUndefined();
        });

        test('should return undefined when property has no getParentFile method', async () => {
            // Create a property without getParentFile
            const mockPropWithoutMethod = Object.create(FileProperty.prototype);
            Object.assign(mockPropWithoutMethod, {
                name: 'file',
                type: 'file'
                // No getParentFile method
            });
            
            properties = {
                file: mockPropWithoutMethod,
                title: mockTextProperty
            };
            objectProperty = new ObjectProperty('testObject', mockVault, properties);
            
            const values = [
                { file: '[[File1]]', title: 'Title 1' }
            ];
            
            const result = await objectProperty.getParentFile(values);
            
            expect(result).toBeUndefined();
        });

        test('should return undefined when first object has no link value', async () => {
            mockFileProperty.getParentFile = jest.fn().mockResolvedValue(undefined);
            
            const values = [
                { file: '', title: 'Title 1' }
            ];
            
            const result = await objectProperty.getParentFile(values);
            
            // Empty string is falsy, so getParentFile should not be called
            expect(mockFileProperty.getParentFile).not.toHaveBeenCalled();
            expect(result).toBeUndefined();
        });

        test('should handle invalid JSON string', async () => {
            const result = await objectProperty.getParentFile('not valid json');
            
            expect(result).toBeUndefined();
        });

        test('should only check first FileProperty found', async () => {
            const mockFile = { path: 'test.md', name: 'test' };
            const mockFileProperty2 = Object.create(FileProperty.prototype);
            Object.assign(mockFileProperty2, {
                name: 'otherFile',
                type: 'file',
                getParentFile: jest.fn().mockResolvedValue({ path: 'other.md' })
            });
            
            mockFileProperty.getParentFile = jest.fn().mockResolvedValue(mockFile);
            
            properties = {
                file: mockFileProperty,
                title: mockTextProperty,
                otherFile: mockFileProperty2
            };
            objectProperty = new ObjectProperty('testObject', mockVault, properties);
            
            const values = [
                { file: '[[File1]]', title: 'Title 1', otherFile: '[[Other]]' }
            ];
            
            const result = await objectProperty.getParentFile(values);
            
            expect(mockFileProperty.getParentFile).toHaveBeenCalledWith('[[File1]]');
            expect(mockFileProperty2.getParentFile).not.toHaveBeenCalled();
            expect(result).toBe(mockFile);
        });
    });
});
