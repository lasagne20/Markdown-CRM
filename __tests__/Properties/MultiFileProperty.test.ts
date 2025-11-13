/**
 * @jest-environment jsdom
 */

import { File } from '../../src/vault/File';
import { Vault } from '../../src/vault/Vault';
import { FileProperty } from '../../src/properties/FileProperty';
import { MultiFileProperty } from '../../src/properties/MultiFileProperty';

// Mock the vault utilities
jest.mock('../../src/vault/Utils', () => ({
    selectMultipleFile: jest.fn(),
    setIcon: jest.fn()
}));

// Mock the related classes
jest.mock('../../src/properties/FileProperty');
jest.mock('../../src/vault/File');
jest.mock('../../src/vault/Vault');

// Import the mocked functions
const { selectMultipleFile, setIcon } = jest.requireMock('../../src/vault/Utils');

describe('MultiFileProperty', () => {
    let multiFileProperty: MultiFileProperty;
    let mockVault: jest.Mocked<Vault>;
    let mockFileProperty: jest.Mocked<FileProperty>;
    let mockFile: jest.Mocked<File>;
    let mockUpdate: jest.Mock;

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';
        // Reset all mocks
        jest.clearAllMocks();
        
        // Mock DOM methods that need to be tracked - we'll spy on individual instances instead

        // Setup mocks
        mockVault = {
            readFile: jest.fn(),
            getFiles: jest.fn(),
            app: {
                selectMultipleFile: selectMultipleFile,
                setIcon: jest.fn((element: HTMLElement, iconName: string) => {
                    element.setAttribute('data-icon', iconName);
                    element.textContent = `[${iconName}]`;
                })
            }
        } as any;

        mockFile = {
            getLink: jest.fn().mockReturnValue('[[TestFile]]'),
            path: 'TestFile.md'
        } as any;

        mockFileProperty = {
            fillDisplay: jest.fn().mockReturnValue(document.createElement('div')),
            getParentValue: jest.fn(),
            name: 'testFile'
        } as any;

        mockUpdate = jest.fn();

        // Mock FileProperty constructor
        (FileProperty as jest.MockedClass<typeof FileProperty>).mockImplementation(() => mockFileProperty);

        // Reset selectMultipleFile to return empty array by default
        selectMultipleFile.mockResolvedValue([]);
    });

    describe('Constructor', () => {
        test('should create MultiFileProperty with required parameters', () => {
            const classes = ['Document', 'Image'];
            multiFileProperty = new MultiFileProperty('testFiles', mockVault, classes);

            expect(multiFileProperty.name).toBe('testFiles');
            expect(multiFileProperty.type).toBe('multiFile');
            expect(multiFileProperty.classes).toEqual(classes);
            expect(multiFileProperty.flexSpan).toBe(2);
            expect(multiFileProperty.property).toBe(mockFileProperty);
        });

        test('should create FileProperty instance in constructor', () => {
            const classes = ['Document'];
            const args = { icon: 'file' };
            
            multiFileProperty = new MultiFileProperty('testFiles', mockVault, classes, args);

            expect(FileProperty).toHaveBeenCalledWith('testFiles', mockVault, classes, args);
        });

        test('should handle empty classes array', () => {
            multiFileProperty = new MultiFileProperty('testFiles', mockVault, []);

            expect(multiFileProperty.classes).toEqual([]);
            expect(multiFileProperty.getClasses()).toEqual([]);
        });
    });

    describe('getClasses', () => {
        test('should return classes array', () => {
            const classes = ['Document', 'Image', 'Video'];
            multiFileProperty = new MultiFileProperty('testFiles', mockVault, classes);

            expect(multiFileProperty.getClasses()).toEqual(classes);
        });
    });

    describe('formatParentValue', () => {
        test('should wrap single value in array', () => {
            multiFileProperty = new MultiFileProperty('testFiles', mockVault, ['Document']);

            const result = multiFileProperty.formatParentValue('test-value');
            
            expect(result).toEqual(['test-value']);
        });

        test('should handle empty string', () => {
            multiFileProperty = new MultiFileProperty('testFiles', mockVault, ['Document']);

            const result = multiFileProperty.formatParentValue('');
            
            expect(result).toEqual(['']);
        });
    });

    describe('fillDisplay', () => {
        beforeEach(() => {
            multiFileProperty = new MultiFileProperty('testFiles', mockVault, ['Document']);
        });

        test('should create container with correct classes', () => {
            const values: any[] = [];
            
            const container = multiFileProperty.fillDisplay(values, mockUpdate);

            expect(container.classList.contains('metadata-multiFiles-container-testfiles')).toBe(true);
            expect(container.classList.contains('metadata-multiFiles-container')).toBe(true);
        });

        test('should set vault property', () => {
            const values: any[] = [];
            
            multiFileProperty.fillDisplay(values, mockUpdate);

            expect(multiFileProperty.vault).toBe(mockVault);
        });

        test('should create add button', () => {
            const values: any[] = [];
            
            const container = multiFileProperty.fillDisplay(values, mockUpdate);

            // Test that a button with the add button class was created
            expect(container.querySelector('button.metadata-add-button-inline-small')).not.toBeNull();
        });

        test('should handle null values', () => {
            const container = multiFileProperty.fillDisplay(null, mockUpdate);

            expect(container).toBeDefined();
            expect(container.tagName).toBe('DIV');
        });
    });

    describe('createObjects', () => {
        beforeEach(() => {
            multiFileProperty = new MultiFileProperty('testFiles', mockVault, ['Document']);
        });

        test('should handle null values', () => {
            const container = document.createElement('div');
            
            // Should not throw
            multiFileProperty.createObjects(null, mockUpdate, container);
            multiFileProperty.createObjects(undefined, mockUpdate, container);
            
            // No children should have been added for null/undefined values
            expect(container.children.length).toBe(0);
        });

        test('should create rows for each value', () => {
            const container = document.createElement('div');
            const values = ['[[File1]]', '[[File2]]', '[[File3]]'];
            
            multiFileProperty.createObjects(values, mockUpdate, container);

            // Should have created 3 row elements
            expect(container.children.length).toBe(3);
        });

        test('should handle empty array', () => {
            const container = document.createElement('div');
            const values: any[] = [];
            
            multiFileProperty.createObjects(values, mockUpdate, container);

            // Empty array should not add any children
            expect(container.children.length).toBe(0);
        });
    });

    describe('createObjectRow', () => {
        beforeEach(() => {
            multiFileProperty = new MultiFileProperty('testFiles', mockVault, ['Document']);
            multiFileProperty.vault = mockVault;
        });

        test('should create row with correct class', () => {
            const container = document.createElement('div');
            const values = ['[[File1]]'];
            
            const row = multiFileProperty.createObjectRow(values, mockUpdate, '[[File1]]', 0, container);

            expect(row.classList.contains('metadata-multiFiles-row-inline')).toBe(true);
        });

        test('should create delete button', () => {
            const container = document.createElement('div');
            const values = ['[[File1]]'];
            
            const row = multiFileProperty.createObjectRow(values, mockUpdate, '[[File1]]', 0, container);

            // Should have 2 children: delete button + property container
            expect(row.children.length).toBe(2);
            expect(row.querySelector('button.metadata-delete-button-inline-small')).not.toBeNull();
        });

        test('should create property container', () => {
            const container = document.createElement('div');
            const values = ['[[File1]]'];
            
            const row = multiFileProperty.createObjectRow(values, mockUpdate, '[[File1]]', 0, container);

            expect(mockFileProperty.fillDisplay).toHaveBeenCalledWith(
                '[[File1]]', 
                expect.any(Function)
            );
        });
    });

    describe('createDeleteButton', () => {
        beforeEach(() => {
            multiFileProperty = new MultiFileProperty('testFiles', mockVault, ['Document']);
        });

        test('should create button with correct classes and icon', () => {
            const container = document.createElement('div');
            const values = ['[[File1]]'];
            
            const button = multiFileProperty.createDeleteButton(values, mockUpdate, 0, container);

            expect(mockVault.app.setIcon).toHaveBeenCalledWith(button, 'x');
            expect(button.classList.contains('metadata-delete-button-inline-small')).toBe(true);
        });

        test('should have onclick handler', () => {
            const container = document.createElement('div');
            const values = ['[[File1]]'];
            
            const button = multiFileProperty.createDeleteButton(values, mockUpdate, 0, container);

            expect(button.onclick).toBeDefined();
            expect(typeof button.onclick).toBe('function');
        });
    });

    describe('createAddButton', () => {
        beforeEach(() => {
            multiFileProperty = new MultiFileProperty('testFiles', mockVault, ['Document']);
        });

        test('should create button with correct classes and icon', () => {
            const container = document.createElement('div');
            const values: any[] = [];
            
            const button = multiFileProperty.createAddButton(values, mockUpdate, container);

            expect(mockVault.app.setIcon).toHaveBeenCalledWith(button, 'plus');
            expect(button.classList.contains('metadata-add-button-inline-small')).toBe(true);
        });

        test('should have onclick handler', () => {
            const container = document.createElement('div');
            const values: any[] = [];
            
            const button = multiFileProperty.createAddButton(values, mockUpdate, container);

            expect(button.onclick).toBeDefined();
            expect(typeof button.onclick).toBe('function');
        });
    });

    describe('addProperty', () => {
        beforeEach(() => {
            multiFileProperty = new MultiFileProperty('testFiles', mockVault, ['Document', 'Image']);
            multiFileProperty.vault = mockVault;
            // Mock reloadObjects method
            multiFileProperty.reloadObjects = jest.fn();
        });

        test('should call selectMultipleFile with correct parameters', async () => {
            const container = document.createElement('div');
            const values: any[] = [];

            await multiFileProperty.addProperty(values, mockUpdate, container);

            expect(selectMultipleFile).toHaveBeenCalledWith(
                mockVault,
                ['Document', 'Image'],
                { hint: 'Choisissez des fichiers Document ou Image' }
            );
        });

        test('should add files to values when files are selected', async () => {
            const container = document.createElement('div');
            const values: any[] = [];
            const mockFiles = [
                { getLink: () => '[[File1]]' },
                { getLink: () => '[[File2]]' }
            ];
            
            (selectMultipleFile as jest.Mock).mockResolvedValue(mockFiles);
            
            await multiFileProperty.addProperty(values, mockUpdate, container);

            expect(values).toEqual(['[[File1]]', '[[File2]]']);
            expect(mockUpdate).toHaveBeenCalledWith(['[[File1]]', '[[File2]]']);
        });
        
        test('should initialize values array if null', async () => {
            const container = document.createElement('div');
            let values: any = null;
            const mockFiles = [{ getLink: () => '[[File1]]' }];

            (selectMultipleFile as jest.Mock).mockResolvedValue(mockFiles);

            await multiFileProperty.addProperty(values, mockUpdate, container);

            expect(mockUpdate).toHaveBeenCalledWith(['[[File1]]']);
        });

        test('should handle no files selected', async () => {
            const container = document.createElement('div');
            const values: any[] = [];

            (selectMultipleFile as jest.Mock).mockResolvedValue(null);

            await multiFileProperty.addProperty(values, mockUpdate, container);

            expect(mockUpdate).not.toHaveBeenCalled();
        });

        test('should handle empty files array', async () => {
            const container = document.createElement('div');
            const values: any[] = [];

            (selectMultipleFile as jest.Mock).mockResolvedValue([]);

            await multiFileProperty.addProperty(values, mockUpdate, container);

            expect(mockUpdate).not.toHaveBeenCalled();
        });

        test('should call reloadObjects when files are added', async () => {
            const container = document.createElement('div');
            const values: any[] = [];
            const mockFiles = [{ getLink: () => '[[File1]]' }];

            (selectMultipleFile as jest.Mock).mockResolvedValue(mockFiles);

            await multiFileProperty.addProperty(values, mockUpdate, container);

            expect(multiFileProperty.reloadObjects).toHaveBeenCalledWith(values, mockUpdate);
        });
    });

    describe('enableDragAndDrop', () => {
        test('should exist and be callable', () => {
            multiFileProperty = new MultiFileProperty('testFiles', mockVault, ['Document']);

            expect(() => multiFileProperty.enableDragAndDrop()).not.toThrow();
        });
    });

    describe('Integration', () => {
        test('should work with multiple classes in hint', () => {
            const classes = ['Document', 'Image', 'Video'];
            multiFileProperty = new MultiFileProperty('testFiles', mockVault, classes);

            expect(multiFileProperty.getClasses().join(' ou ')).toBe('Document ou Image ou Video');
        });

        test('should handle single class in hint', () => {
            const classes = ['Document'];
            multiFileProperty = new MultiFileProperty('testFiles', mockVault, classes);

            expect(multiFileProperty.getClasses().join(' ou ')).toBe('Document');
        });

        test('should maintain proper inheritance from ObjectProperty', () => {
            multiFileProperty = new MultiFileProperty('testFiles', mockVault, ['Document']);

            expect(multiFileProperty.type).toBe('multiFile');
            expect(typeof multiFileProperty.fillDisplay).toBe('function');
        });
    });

    describe('getParentFile', () => {
        beforeEach(() => {
            multiFileProperty = new MultiFileProperty('testFiles', mockVault, ['Document']);
        });

        test('should return undefined for null value', async () => {
            const result = await multiFileProperty.getParentFile(null);
            expect(result).toBeUndefined();
        });

        test('should return undefined for empty array', async () => {
            const result = await multiFileProperty.getParentFile([]);
            expect(result).toBeUndefined();
        });

        test('should return File from first element in array', async () => {
            const mockFile = { path: 'test.md', name: 'test' };
            
            // Mock the internal FileProperty's getParentFile method
            multiFileProperty.property.getParentFile = jest.fn().mockResolvedValue(mockFile);
            
            const values = ['[[File1]]', '[[File2]]'];
            const result = await multiFileProperty.getParentFile(values);
            
            expect(multiFileProperty.property.getParentFile).toHaveBeenCalledWith('[[File1]]');
            expect(result).toBe(mockFile);
        });

        test('should handle JSON string value', async () => {
            const mockFile = { path: 'test.md', name: 'test' };
            
            multiFileProperty.property.getParentFile = jest.fn().mockResolvedValue(mockFile);
            
            const jsonValue = JSON.stringify(['[[File1]]', '[[File2]]']);
            const result = await multiFileProperty.getParentFile(jsonValue);
            
            expect(multiFileProperty.property.getParentFile).toHaveBeenCalledWith('[[File1]]');
            expect(result).toBe(mockFile);
        });

        test('should handle single string value (not array)', async () => {
            const mockFile = { path: 'test.md', name: 'test' };
            
            multiFileProperty.property.getParentFile = jest.fn().mockResolvedValue(mockFile);
            
            const result = await multiFileProperty.getParentFile('[[SingleFile]]');
            
            expect(multiFileProperty.property.getParentFile).toHaveBeenCalledWith('[[SingleFile]]');
            expect(result).toBe(mockFile);
        });

        test('should return undefined when property.getParentFile returns undefined', async () => {
            multiFileProperty.property.getParentFile = jest.fn().mockResolvedValue(undefined);
            
            const values = ['[[File1]]'];
            const result = await multiFileProperty.getParentFile(values);
            
            expect(result).toBeUndefined();
        });

        test('should handle invalid JSON string by treating as single value', async () => {
            const mockFile = { path: 'test.md', name: 'test' };
            
            multiFileProperty.property.getParentFile = jest.fn().mockResolvedValue(mockFile);
            
            const result = await multiFileProperty.getParentFile('not valid json');
            
            expect(multiFileProperty.property.getParentFile).toHaveBeenCalledWith('not valid json');
            expect(result).toBe(mockFile);
        });
    });
});
