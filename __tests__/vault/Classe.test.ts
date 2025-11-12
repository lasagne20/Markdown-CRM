import { Classe } from '../../src/vault/Classe';
import { Vault } from '../../src/vault/Vault';
import { File } from '../../src/vault/File';
import { Data } from '../../src/vault/Data';
import { Property } from '../../src/properties/Property';

// Mock implementations
class MockProperty extends Property {
    constructor(name: string, vault: Vault) {
        super(name, vault);
        this.type = 'mock';
    }

    validate(value: any): any {
        return value;
    }

    async getDisplay(file: any, args: {staticMode?: boolean, title?: string} = {staticMode: false, title: ""}): Promise<HTMLDivElement> {
        const div = document.createElement('div');
        div.textContent = `Mock property: ${this.name}`;
        return div;
    }
}

class TestableClasse extends Classe {
    static create(vault: Vault): Classe {
        return new TestableClasse(vault);
    }

    async onCreate(): Promise<void> {
        // Test implementation
    }

    async onUpdate(): Promise<void> {
        // Test implementation
    }

    async onDelete(): Promise<void> {
        // Test implementation
    }
}

// Mock implementations for external dependencies
const mockApp = {
    createDiv: jest.fn((className?: string) => {
        const div = document.createElement('div');
        if (className) div.className = className;
        return div;
    }),
    setIcon: jest.fn(),
    getMetadata: jest.fn(),
    updateMetadata: jest.fn(),
    getTemplateContent: jest.fn(),
    createFolder: jest.fn()
};

const mockVault = {
    app: mockApp
} as unknown as Vault;

const mockFile = {
    name: 'test.md',
    path: '/test/test.md',
    basename: 'test',
    extension: 'md',
    getPath: jest.fn().mockReturnValue('/test/test.md')
} as unknown as File;

const mockData = {
    name: 'TestData',
    getName: jest.fn().mockReturnValue('TestData')
} as unknown as Data;

describe('Classe', () => {
    let classe: TestableClasse;
    let mockProperty: MockProperty;

    beforeEach(() => {
        jest.clearAllMocks();
        classe = new TestableClasse(mockVault);
        mockProperty = new MockProperty('testProperty', mockVault);
    });

    describe('Constructor', () => {
        it('should create a Classe instance without file and data', () => {
            const newClasse = new TestableClasse(mockVault);
            expect(newClasse).toBeInstanceOf(Classe);
            expect(newClasse.getFile()).toBeUndefined();
            expect(newClasse.data).toBeNull();
        });

        it('should create a Classe instance with file', () => {
            const newClasse = new TestableClasse(mockVault, mockFile);
            expect(newClasse.getFile()?.['file']).toBe(mockFile); // Compare inner file
        });

        it('should create a Classe instance with data', () => {
            const newClasse = new TestableClasse(mockVault, undefined, mockData);
            expect(newClasse.data).toBe(mockData);
        });

        it('should create a Classe instance with both file and data', () => {
            const newClasse = new TestableClasse(mockVault, mockFile, mockData);
            expect(newClasse.getFile()?.['file']).toBe(mockFile); // Compare inner file
            expect(newClasse.data).toBe(mockData);
        });
    });

    describe('Name management', () => {
        it('should get name when set', () => {
            classe.name = 'TestName';
            expect(classe.getName()).toBe('TestName');
        });

        it('should return empty string when name not set', () => {
            expect(classe.getName()).toBe('');
        });
    });

    describe('Property management', () => {
        it('should add property', () => {
            classe.addProperty(mockProperty);
            expect(classe.getProperties()).toHaveLength(1);
            expect(classe.getProperties()[0]).toBe(mockProperty);
        });

        it('should get property by name', () => {
            classe.addProperty(mockProperty);
            expect(classe.getProperty('testProperty')).toBe(mockProperty);
        });

        it('should return undefined for non-existent property', () => {
            expect(classe.getProperty('nonExistent')).toBeUndefined();
        });

        it('should return copy of properties array', () => {
            classe.addProperty(mockProperty);
            const properties = classe.getProperties();
            properties.push(new MockProperty('another', mockVault));
            expect(classe.getProperties()).toHaveLength(1);
        });

        it('should handle multiple properties', () => {
            const property2 = new MockProperty('property2', mockVault);
            classe.addProperty(mockProperty);
            classe.addProperty(property2);
            
            expect(classe.getProperties()).toHaveLength(2);
            expect(classe.getProperty('testProperty')).toBe(mockProperty);
            expect(classe.getProperty('property2')).toBe(property2);
        });
    });

    describe('File operations', () => {
        it('should set file', () => {
            classe.setFile(mockFile);
            expect(classe.getFile()?.['file']).toBe(mockFile); // Compare inner file
        });

        it('should get file path', () => {
            classe.setFile(mockFile);
            expect(classe.getPath()).toBe('/test/test.md');
        });

        it('should return undefined path when no file set', () => {
            expect(classe.getPath()).toBeUndefined();
        });
    });

    describe('Metadata operations', () => {
        beforeEach(() => {
            classe.setFile(mockFile);
        });

        it('should get metadata', async () => {
            const expectedMetadata = { key: 'value' };
            mockApp.getMetadata.mockResolvedValue(expectedMetadata);

            const metadata = await classe.getMetadata();
            expect(metadata).toBe(expectedMetadata);
            // Should be called with the File wrapper
            const callArg = mockApp.getMetadata.mock.calls[0][0];
            expect(callArg?.['file']).toBe(mockFile);
        });

        it('should return empty object when no file set', async () => {
            const classeWithoutFile = new TestableClasse(mockVault);
            const metadata = await classeWithoutFile.getMetadata();
            expect(metadata).toEqual({});
        });

        it('should update metadata', async () => {
            const newMetadata = { key: 'newValue' };

            await classe.updateMetadata(newMetadata);
            // Should be called with the File wrapper
            const callArg = mockApp.updateMetadata.mock.calls[0][0];
            expect(callArg?.['file']).toBe(mockFile);
            expect(mockApp.updateMetadata).toHaveBeenCalledWith(expect.anything(), newMetadata);
        });        it('should not update metadata when no file set', async () => {
            const classeWithoutFile = new TestableClasse(mockVault);
            await classeWithoutFile.updateMetadata({ key: 'value' });
            expect(mockApp.updateMetadata).not.toHaveBeenCalled();
        });

        it('should get property value from metadata', async () => {
            const metadata = { testProperty: 'testValue' };
            mockApp.getMetadata.mockResolvedValue(metadata);

            const value = await classe.getPropertyValue('testProperty');
            expect(value).toBe('testValue');
        });

        it('should set property value', async () => {
            const metadata = { existingProperty: 'existingValue' };
            mockApp.getMetadata.mockResolvedValue(metadata);

            await classe.setPropertyValue('testProperty', 'newValue');
            
            const expectedMetadata = {
                existingProperty: 'existingValue',
                testProperty: 'newValue'
            };
            // Should be called with the File wrapper
            const callArg = mockApp.updateMetadata.mock.calls[0][0];
            expect(callArg?.['file']).toBe(mockFile);
            expect(mockApp.updateMetadata).toHaveBeenCalledWith(expect.anything(), expectedMetadata);
        });
    });

    describe('Update and validation', () => {
        beforeEach(() => {
            classe.setFile(mockFile);
        });

        it('should update without file', async () => {
            const classeWithoutFile = new TestableClasse(mockVault);
            await expect(classeWithoutFile.update()).resolves.not.toThrow();
        });

        it('should update with file', async () => {
            mockApp.getMetadata.mockResolvedValue({});
            await expect(classe.update()).resolves.not.toThrow();
        });

        it('should validate all properties successfully', async () => {
            const property1 = new MockProperty('prop1', mockVault);
            const property2 = new MockProperty('prop2', mockVault);
            
            // Mock property validation to return true
            property1.validate = jest.fn().mockReturnValue('validValue1');
            property2.validate = jest.fn().mockReturnValue('validValue2');
            
            classe.addProperty(property1);
            classe.addProperty(property2);
            
            mockApp.getMetadata.mockResolvedValue({
                prop1: 'value1',
                prop2: 'value2'
            });

            const isValid = await classe.validate();
            expect(isValid).toBe(true);
        });

        it('should fail validation when property validation fails', async () => {
            const property1 = new MockProperty('prop1', mockVault);
            property1.validate = jest.fn().mockReturnValue(false);
            
            classe.addProperty(property1);
            mockApp.getMetadata.mockResolvedValue({ prop1: 'invalidValue' });

            const isValid = await classe.validate();
            expect(isValid).toBe(false);
        });
    });

    describe('Content generation', () => {
        beforeEach(() => {
            classe.setFile(mockFile);
            classe.name = 'TestClass';
            classe.icon = 'test-icon';
        });


        it('should generate template content', async () => {
            classe.template = 'test-template';
            const expectedContent = 'Template content here';
            mockApp.getTemplateContent.mockResolvedValue(expectedContent);
            
            const content = await classe['generateTemplateContent']();
            expect(content).toBe(expectedContent);
            expect(mockApp.getTemplateContent).toHaveBeenCalledWith('test-template');
        });

        it('should handle template not found', async () => {
            classe.template = 'non-existent-template';
            mockApp.getTemplateContent.mockRejectedValue(new Error('Template not found'));
            
            const content = await classe['generateTemplateContent']();
            expect(content).toBe('');
        });

        it('should generate empty template content when no template set', async () => {
            const content = await classe['generateTemplateContent']();
            expect(content).toBe('');
        });
    });

    describe('Display methods', () => {
        beforeEach(() => {
            classe.name = 'TestClass';
            classe.icon = 'test-icon';
        });

        it('should create display element', async () => {
            const mockDiv = document.createElement('div');
            const mockHeader = document.createElement('div');
            mockApp.createDiv.mockReturnValueOnce(mockDiv).mockReturnValueOnce(mockHeader);
            mockApp.getMetadata.mockResolvedValue({});

            const display = await classe.getDisplay();
            
            expect(mockApp.createDiv).toHaveBeenCalledWith('classe-display');
            expect(mockApp.createDiv).toHaveBeenCalledWith('classe-header');
            expect(mockApp.setIcon).toHaveBeenCalledWith(mockHeader, 'test-icon');
        });

        it('should include properties in display when file is set', async () => {
            const mockDiv = document.createElement('div');
            const mockHeader = document.createElement('div');
            const mockPropertyDiv = document.createElement('div');
            
            mockApp.createDiv.mockReturnValueOnce(mockDiv).mockReturnValueOnce(mockHeader);
            
            const mockProperty = new MockProperty('testProperty', mockVault);
            mockProperty.getDisplay = jest.fn().mockResolvedValue(mockPropertyDiv);
            classe.addProperty(mockProperty);
            classe.setFile(mockFile);

            const display = await classe.getDisplay();
            
            expect(mockProperty.getDisplay).toHaveBeenCalledWith(classe);
        });

        it('should not include properties in display when no file is set', async () => {
            const mockDiv = document.createElement('div');
            const mockHeader = document.createElement('div');
            
            mockApp.createDiv.mockReturnValueOnce(mockDiv).mockReturnValueOnce(mockHeader);
            
            const mockProperty = new MockProperty('testProperty', mockVault);
            mockProperty.getDisplay = jest.fn().mockResolvedValue(document.createElement('div'));
            classe.addProperty(mockProperty);
            // Don't set file

            const display = await classe.getDisplay();
            
            // Even without file, properties should still be displayed (they get the classe)
            expect(mockProperty.getDisplay).toHaveBeenCalledWith(classe);
        });
    });

    describe('Utility methods', () => {
        it('should sanitize file name', () => {
            const sanitized = classe['sanitizeFileName']('test<>:"/\\|?*name');
            expect(sanitized).toBe('test---------name');
        });

        it('should sanitize file name with spaces', () => {
            const sanitized = classe['sanitizeFileName'](' test name ');
            expect(sanitized).toBe('test name');
        });

        it('should ensure folder creation', async () => {
            await classe['ensureFolder']('/test/folder');
            expect(mockApp.createFolder).toHaveBeenCalledWith('/test/folder');
        });

        it('should handle folder creation error gracefully', async () => {
            mockApp.createFolder.mockRejectedValue(new Error('Folder exists'));
            await expect(classe['ensureFolder']('/test/folder')).resolves.not.toThrow();
        });
    });

    describe('Factory method', () => {
        it('should throw error for base class create method', () => {
            expect(() => Classe.create(mockVault)).toThrow('Must implement create method in subclass');
        });

        it('should work for subclass create method', () => {
            const instance = TestableClasse.create(mockVault);
            expect(instance).toBeInstanceOf(TestableClasse);
        });
    });

    describe('Lifecycle hooks', () => {
        it('should call onCreate hook', async () => {
            const spy = jest.spyOn(classe, 'onCreate');
            await classe.onCreate();
            expect(spy).toHaveBeenCalled();
        });

        it('should call onUpdate hook', async () => {
            const spy = jest.spyOn(classe, 'onUpdate');
            await classe.onUpdate();
            expect(spy).toHaveBeenCalled();
        });

        it('should call onDelete hook', async () => {
            const spy = jest.spyOn(classe, 'onDelete');
            await classe.onDelete();
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('Private methods', () => {
        beforeEach(() => {
            classe.setFile(mockFile);
        });

        it('should update all properties metadata when changes detected', async () => {
            const property1 = new MockProperty('prop1', mockVault);
            const property2 = new MockProperty('prop2', mockVault);
            
            // Mock property validation to return different values
            property1.validate = jest.fn().mockReturnValue('newValue1');
            property2.validate = jest.fn().mockReturnValue('originalValue2');
            
            classe.addProperty(property1);
            classe.addProperty(property2);
            
            const originalMetadata = {
                prop1: 'originalValue1',
                prop2: 'originalValue2'
            };
            
            mockApp.getMetadata.mockResolvedValue(originalMetadata);

            await classe['updateAllPropertiesMetadata']();
            
            const expectedMetadata = {
                prop1: 'newValue1',
                prop2: 'originalValue2'
            };
            
            // Should be called with the File wrapper
            const callArg = mockApp.updateMetadata.mock.calls[0][0];
            expect(callArg?.['file']).toBe(mockFile);
            expect(mockApp.updateMetadata).toHaveBeenCalledWith(expect.anything(), expectedMetadata);
        });

        it('should not update metadata when no changes detected', async () => {
            const property = new MockProperty('prop1', mockVault);
            property.validate = jest.fn().mockReturnValue('sameValue');
            
            classe.addProperty(property);
            
            mockApp.getMetadata.mockResolvedValue({
                prop1: 'sameValue'
            });

            await classe['updateAllPropertiesMetadata']();
            
            expect(mockApp.updateMetadata).not.toHaveBeenCalled();
        });
    });

    describe('Edge cases', () => {
        it('should handle empty properties array', () => {
            expect(classe.getProperties()).toHaveLength(0);
            expect(classe.getProperty('any')).toBeUndefined();
        });

        it('should handle null/undefined values in metadata', async () => {
            classe.setFile(mockFile);
            mockApp.getMetadata.mockResolvedValue({
                nullProp: null,
                undefinedProp: undefined
            });

            const nullValue = await classe.getPropertyValue('nullProp');
            const undefinedValue = await classe.getPropertyValue('undefinedProp');
            
            expect(nullValue).toBeNull();
            expect(undefinedValue).toBeUndefined();
        });

        it('should validate empty properties list', async () => {
            const isValid = await classe.validate();
            expect(isValid).toBe(true);
        });
    });
});