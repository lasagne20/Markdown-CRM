/**
 * @jest-environment jsdom
 */

import { FileProperty } from '../../src/properties/FileProperty';
import { LinkProperty } from '../../src/properties/LinkProperty';

// Mock entire modules
jest.mock('../../src/vault/Utils', () => ({
    setIcon: jest.fn(),
    Notice: jest.fn(),
    selectFile: jest.fn()
}));

// Mock global functions
(global as any).selectFile = jest.fn();

// Get reference to mocked function
const { selectFile } = require('../../src/vault/Utils');

describe('FileProperty', () => {
    let fileProperty: FileProperty;
    let mockVault: any;

    beforeEach(() => {
        // Reset DOM mocks
        document.body.innerHTML = '';
        jest.clearAllMocks();
        
        // Mock vault with necessary methods
        mockVault = {
            readLinkFile: jest.fn(),
            getFromLink: jest.fn(),
            getFromFile: jest.fn(),
            getName: jest.fn().mockReturnValue('TestVault'),
            app: {
                vault: {
                    getName: jest.fn().mockReturnValue('TestVault'),
                    getAbstractFileByPath: jest.fn()
                },
                workspace: {
                    getLeaf: jest.fn().mockReturnValue({
                        openFile: jest.fn()
                    })
                },
                setIcon: jest.fn(),
                selectFile: jest.fn()
            }
        };
    });

    beforeEach(() => {
        fileProperty = new FileProperty('testFile', mockVault, ['class1', 'class2']);
    });

    describe('constructor', () => {
        it('should create FileProperty with correct type', () => {
            expect(fileProperty.type).toBe('file');
        });

        it('should inherit from LinkProperty', () => {
            expect(fileProperty).toBeInstanceOf(LinkProperty);
        });

        it('should store classes correctly', () => {
            expect(fileProperty.classes).toEqual(['class1', 'class2']);
        });

        it('should pass args to parent constructor', () => {
            const customArgs = { icon: 'custom-icon' };
            const customProperty = new FileProperty('customName', mockVault, ['class1'], customArgs);
            expect(customProperty.name).toBe('customName');
            expect(customProperty.classes).toEqual(['class1']);
        });

        it('should handle empty classes array', () => {
            const emptyClassProperty = new FileProperty('empty', mockVault, []);
            expect(emptyClassProperty.classes).toEqual([]);
        });
    });

    describe('getClasses', () => {
        it('should return classes array', () => {
            expect(fileProperty.getClasses()).toEqual(['class1', 'class2']);
        });

        it('should return empty array when no classes', () => {
            const emptyProperty = new FileProperty('test', mockVault, []);
            expect(emptyProperty.getClasses()).toEqual([]);
        });

        it('should return same reference to classes array', () => {
            const classes = ['test1', 'test2'];
            const property = new FileProperty('test', mockVault, classes);
            expect(property.getClasses()).toBe(classes);
        });
    });


    //     it('should handle object values', () => {
    //         const objectValue = { test: 'value' };
    //         expect(fileProperty.getParentValue(objectValue)).toBe(objectValue);
    //     });
    // });

    describe('getPretty', () => {
        it('should call vault.readLinkFile with value', () => {
            const testValue = '[[TestFile]]';
            mockVault.readLinkFile.mockReturnValue('TestFile');
            fileProperty.vault = mockVault;
            
            const result = fileProperty.getPretty(testValue);
            
            expect(mockVault.readLinkFile).toHaveBeenCalledWith(testValue);
            expect(result).toBe('TestFile');
        });

        it('should handle empty value', () => {
            mockVault.readLinkFile.mockReturnValue('');
            fileProperty.vault = mockVault;
            
            const result = fileProperty.getPretty('');
            
            expect(mockVault.readLinkFile).toHaveBeenCalledWith('');
            expect(result).toBe('');
        });
    });

    describe('getClasse', () => {
        it('should return classe when found', async () => {
            const mockClasse = { name: 'TestClass' };
            const mockRead = {} as any;
            const testLink = '[[TestFile]]';
            
            fileProperty.read = jest.fn().mockReturnValue(testLink);
            mockVault.getFromLink.mockResolvedValue(mockClasse);
            fileProperty.vault = mockVault;
            
            const result = await fileProperty.getClasse(mockRead);
            
            expect(fileProperty.read).toHaveBeenCalledWith(mockRead);
            expect(mockVault.getFromLink).toHaveBeenCalledWith(testLink);
            expect(result).toBe(mockClasse);
        });

        it('should return undefined when no link found', async () => {
            const mockRead = {} as any;
            
            fileProperty.read = jest.fn().mockReturnValue(null);
            fileProperty.vault = mockVault;
            
            const result = await fileProperty.getClasse(mockRead);
            
            expect(result).toBeUndefined();
        });

        it('should return undefined when classe not found', async () => {
            const mockRead = {} as any;
            const testLink = '[[TestFile]]';
            
            fileProperty.read = jest.fn().mockReturnValue(testLink);
            mockVault.getFromLink.mockResolvedValue(null);
            fileProperty.vault = mockVault;
            
            const result = await fileProperty.getClasse(mockRead);
            
            expect(result).toBeUndefined();
        });
    });

    describe('validate', () => {
        it('should extract and return valid Obsidian link', () => {
            const input = '[[TestFile]]';
            expect(fileProperty.validate(input)).toBe('[[TestFile]]');
        });

        it('should extract link from text with link', () => {
            const input = 'Some text [[TestFile]] more text';
            expect(fileProperty.validate(input)).toBe('[[TestFile]]');
        });

        it('should handle link with alias', () => {
            const input = '[[TestFile|Alias]]';
            expect(fileProperty.validate(input)).toBe('[[TestFile|Alias]]');
        });

        it('should return empty string for invalid format', () => {
            const input = 'Just plain text';
            expect(fileProperty.validate(input)).toBe('');
        });

        it('should return empty string for malformed links', () => {
            const input = '[[TestFile';
            expect(fileProperty.validate(input)).toBe('');
        });

        it('should handle empty string', () => {
            expect(fileProperty.validate('')).toBe('');
        });

        it('should handle multiple links and return first', () => {
            const input = '[[FirstFile]] and [[SecondFile]]';
            expect(fileProperty.validate(input)).toBe('[[FirstFile]]');
        });
    });

    describe('getLink', () => {
        beforeEach(() => {
            fileProperty.vault = mockVault;
        });

        it('should generate obsidian URL with file path when file exists', () => {
            const testValue = '[[TestFile]]';
            const filePath = 'path/to/TestFile.md';
            
            mockVault.readLinkFile.mockReturnValueOnce(filePath).mockReturnValueOnce('TestFile');
            mockVault.app.vault.getAbstractFileByPath.mockReturnValue(true);
            
            const result = fileProperty.getLink(testValue);
            
            expect(result).toBe('obsidian://open?vault=TestVault&file=path%2Fto%2FTestFile.md');
        });

        it('should use fallback when file does not exist', () => {
            const testValue = '[[TestFile]]';
            const filePath = 'path/to/TestFile.md';
            
            mockVault.readLinkFile.mockImplementation((value: any, withPath: any) => withPath ? null : 'TestFile');
            mockVault.app.vault.getAbstractFileByPath.mockReturnValue(null);
            
            const result = fileProperty.getLink(testValue);
            
            expect(result).toBe('obsidian://open?vault=TestVault&file=TestFile');
        });

        it('should set vault when provided as parameter', () => {
            const newVault = { ...mockVault };
            fileProperty.vault = null;
            
            mockVault.readLinkFile.mockReturnValue('TestFile');
            mockVault.app.vault.getAbstractFileByPath.mockReturnValue(null);
            
            fileProperty.getLink('[[TestFile]]', newVault);
            
            expect(fileProperty.vault).toBe(newVault);
        });

        it('should encode special characters in vault name', () => {
            const testValue = '[[TestFile]]';
            mockVault.getName.mockReturnValue('My Vault & Stuff');
            mockVault.readLinkFile.mockReturnValue('TestFile');
            mockVault.app.vault.getAbstractFileByPath.mockReturnValue(null);
            
            const result = fileProperty.getLink(testValue);
            
            expect(result).toContain('vault=My%20Vault%20%26%20Stuff');
        });
    });

    describe('createIconContainer', () => {
        it('should create icon container with correct structure', () => {
            const mockUpdate = jest.fn();
            
            const result = fileProperty.createIconContainer(mockUpdate);
            
            expect(result.tagName).toBe('DIV');
            expect(result.classList.contains('icon-container')).toBe(true);
            expect(result.children.length).toBe(1);
        });

        it('should set cursor pointer when not static', () => {
            const mockUpdate = jest.fn();
            fileProperty.static = false;
            
            const result = fileProperty.createIconContainer(mockUpdate);
            const icon = result.children[0] as HTMLElement;
            
            expect(icon.style.cursor).toBe('pointer');
        });

        it('should not set cursor pointer when static', () => {
            const mockUpdate = jest.fn();
            fileProperty.static = true;
            
            const result = fileProperty.createIconContainer(mockUpdate);
            const icon = result.children[0] as HTMLElement;
            
            expect(icon.style.cursor).toBe('');
        });
    });

    describe('handleIconClick', () => {
        beforeEach(() => {
            fileProperty.vault = mockVault;
        });

        it('should call selectFile with correct parameters', async () => {
            const mockUpdate = jest.fn();
            const mockEvent = {
                target: document.createElement('div')
            } as any;
            
            mockVault.app.selectFile.mockResolvedValue(null);
            
            await fileProperty.handleIconClick(mockUpdate, mockEvent);
            
            expect(mockVault.app.selectFile).toHaveBeenCalledWith(
                mockVault,
                ['class1', 'class2'],
                { hint: "Choisissez un fichier class1 ou class2" }
            );
        });

        it('should update value when file selected', async () => {
            const mockUpdate = jest.fn();
            const mockFile = {
                getLink: jest.fn().mockReturnValue('[[SelectedFile]]')
            };
            const mockEvent = {
                target: document.createElement('div')
            } as any;
            
            mockVault.app.selectFile.mockResolvedValue(mockFile);
            
            await fileProperty.handleIconClick(mockUpdate, mockEvent);
            
            expect(mockUpdate).toHaveBeenCalledWith('[[SelectedFile]]');
        });

        it('should not update when no file selected', async () => {
            const mockUpdate = jest.fn();
            const mockEvent = {
                target: document.createElement('div')
            } as any;
            
            mockVault.app.selectFile.mockResolvedValue(null);
            
            await fileProperty.handleIconClick(mockUpdate, mockEvent);
            
            expect(mockUpdate).not.toHaveBeenCalled();
        });
    });

    describe('createFieldContainerContent', () => {
        beforeEach(() => {
            fileProperty.vault = mockVault;
        });

        it('should create field container with correct structure', () => {
            const mockUpdate = jest.fn();
            const testValue = '[[TestFile]]';
            
            mockVault.readLinkFile.mockReturnValue('TestFile');
            fileProperty.getLink = jest.fn().mockReturnValue('obsidian://test');
            
            const result = fileProperty.createFieldContainerContent(mockUpdate, testValue);
            
            expect(result.tagName).toBe('DIV');
            expect(result.classList.contains('field-container')).toBe(true);
        });

        it('should create link with correct href and text', () => {
            const mockUpdate = jest.fn();
            const testValue = '[[TestFile]]';
            
            mockVault.readLinkFile.mockReturnValue('TestFile');
            fileProperty.getLink = jest.fn().mockReturnValue('obsidian://test');
            
            const result = fileProperty.createFieldContainerContent(mockUpdate, testValue);
            const link = result.querySelector('a');
            
            expect(link?.href).toBe('obsidian://test');
            expect(link?.textContent).toBe('TestFile');
            expect(link?.classList.contains('field-link')).toBe(true);
        });

        it('should handle empty value', () => {
            const mockUpdate = jest.fn();
            const testValue = '';
            
            mockVault.readLinkFile.mockReturnValue('');
            fileProperty.getLink = jest.fn().mockReturnValue('obsidian://test');
            
            const result = fileProperty.createFieldContainerContent(mockUpdate, testValue);
            const link = result.querySelector('a');
            
            expect(link?.textContent).toBe('');
        });
    });
});
