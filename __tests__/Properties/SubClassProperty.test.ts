/**
 * @jest-environment jsdom
 */

import { SelectProperty } from '../../src/properties/SelectProperty';
import { SubClassProperty } from '../../src/properties/SubClassProperty';

// Mock dependencies
jest.mock('../../src/vault/Utils', () => ({
    setIcon: jest.fn()
}));

describe('SubClassProperty', () => {
    let subClassProperty: SubClassProperty;
    let mockSubClasses: any[];
    let mockFile: any;
    let mockVault: any;

    beforeEach(() => {
        // Reset DOM mocks
        document.body.innerHTML = '';
        jest.clearAllMocks();
        
        // Mock vault with necessary methods
        mockVault = {
            app: {
                setIcon: jest.fn()
            }
        };
        
        // Mock SubClass objects
        mockSubClasses = [
            {
                getsubClassName: jest.fn().mockReturnValue('SubClass1'),
                getConstructor: jest.fn().mockReturnValue('Constructor1'),
                getProperties: jest.fn().mockReturnValue({
                    prop1: { name: 'prop1', type: 'text' },
                    prop2: { name: 'prop2', type: 'number' }
                }),
                getTopDisplayContent: jest.fn().mockReturnValue(document.createElement('div'))
            },
            {
                getsubClassName: jest.fn().mockReturnValue('SubClass2'),
                getConstructor: jest.fn().mockReturnValue('Constructor2'),
                getProperties: jest.fn().mockReturnValue({
                    prop3: { name: 'prop3', type: 'text' }
                }),
                getTopDisplayContent: jest.fn().mockReturnValue(document.createElement('span'))
            }
        ];
        
        // Mock File object
        mockFile = {
            metadata: {},
            updateMetadata: jest.fn()
        };
    });

    beforeEach(() => {
        subClassProperty = new SubClassProperty('testSubClass', mockVault, mockSubClasses);
    });

    describe('constructor', () => {
        it('should create SubClassProperty with correct type', () => {
            expect(subClassProperty.type).toBe('subClass');
        });

        it('should inherit from SelectProperty', () => {
            expect(subClassProperty).toBeInstanceOf(SelectProperty);
        });

        it('should store subClasses correctly', () => {
            expect(subClassProperty.subClasses).toBe(mockSubClasses);
            expect(subClassProperty.subClasses.length).toBe(2);
        });

        it('should pass subclass names to parent SelectProperty', () => {
            // Check that options were created from subclass names
            expect(subClassProperty.options).toEqual([
                { name: 'SubClass1', color: '' },
                { name: 'SubClass2', color: '' }
            ]);
        });

        it('should pass args to parent constructor', () => {
            const customArgs = { icon: 'custom-icon' };
            const customProperty = new SubClassProperty('customName', mockVault, mockSubClasses, customArgs);
            expect(customProperty.name).toBe('customName');
        });

        it('should handle empty subClasses array', () => {
            const emptyProperty = new SubClassProperty('empty', mockVault, []);
            expect(emptyProperty.subClasses).toEqual([]);
            expect(emptyProperty.options).toEqual([]);
        });
    });

    describe('getSubClassFromName', () => {
        it('should return constructor for existing subclass name', () => {
            const result = subClassProperty.getSubClassFromName('SubClass1');
            expect(result).toBe('Constructor1');
            expect(mockSubClasses[0].getsubClassName).toHaveBeenCalled();
            expect(mockSubClasses[0].getConstructor).toHaveBeenCalled();
        });

        it('should return undefined for non-existing subclass name', () => {
            const result = subClassProperty.getSubClassFromName('NonExistentClass');
            expect(result).toBeUndefined();
        });

        it('should handle empty string', () => {
            const result = subClassProperty.getSubClassFromName('');
            expect(result).toBeUndefined();
        });

        it('should handle null input', () => {
            const result = subClassProperty.getSubClassFromName(null as any);
            expect(result).toBeUndefined();
        });

        it('should handle case sensitivity', () => {
            const result = subClassProperty.getSubClassFromName('subclass1');
            expect(result).toBeUndefined(); // Should be case sensitive
        });
    });

    describe('getSubClass', () => {
        beforeEach(() => {
            // Mock the read method to return a specific value
            subClassProperty.read = jest.fn();
        });

        it('should return subclass when value matches', () => {
            subClassProperty.read = jest.fn().mockReturnValue('SubClass1');
            
            const result = subClassProperty.getSubClass(mockFile);
            
            expect(subClassProperty.read).toHaveBeenCalledWith(mockFile);
            expect(result).toBe(mockSubClasses[0]);
        });

        it('should return undefined when no match found', () => {
            subClassProperty.read = jest.fn().mockReturnValue('NonExistentClass');
            
            const result = subClassProperty.getSubClass(mockFile);
            
            expect(result).toBeUndefined();
        });

        it('should return undefined when read returns null', () => {
            subClassProperty.read = jest.fn().mockReturnValue(null);
            
            const result = subClassProperty.getSubClass(mockFile);
            
            expect(result).toBeUndefined();
        });

        it('should return undefined when read returns undefined', () => {
            subClassProperty.read = jest.fn().mockReturnValue(undefined);
            
            const result = subClassProperty.getSubClass(mockFile);
            
            expect(result).toBeUndefined();
        });

        it('should handle second subclass correctly', () => {
            subClassProperty.read = jest.fn().mockReturnValue('SubClass2');
            
            const result = subClassProperty.getSubClass(mockFile);
            
            expect(result).toBe(mockSubClasses[1]);
        });
    });

    describe('getSubclassesNames', () => {
        it('should return all subclasses', () => {
            const result = subClassProperty.getSubclassesNames();
            
            expect(result).toBe(mockSubClasses);
            expect(result.length).toBe(2);
        });

        it('should return empty array when no subclasses', () => {
            const emptyProperty = new SubClassProperty('empty', mockVault, []);
            
            const result = emptyProperty.getSubclassesNames();
            
            expect(result).toEqual([]);
        });

        it('should return same reference to subclasses array', () => {
            const result = subClassProperty.getSubclassesNames();
            
            expect(result).toBe(subClassProperty.subClasses);
        });
    });

    describe('getSubClassProperty', () => {
        beforeEach(() => {
            subClassProperty.read = jest.fn();
        });

        it('should return properties when subclass found', () => {
            subClassProperty.read = jest.fn().mockReturnValue('SubClass1');
            
            const result = subClassProperty.getSubClassProperty(mockFile);
            
            expect(result).toEqual([
                { name: 'prop1', type: 'text' },
                { name: 'prop2', type: 'number' }
            ]);
            expect(mockSubClasses[0].getProperties).toHaveBeenCalled();
        });

        it('should return empty array when no subclass found', () => {
            subClassProperty.read = jest.fn().mockReturnValue('NonExistentClass');
            
            const result = subClassProperty.getSubClassProperty(mockFile);
            
            expect(result).toEqual([]);
        });

        it('should return empty array when subclass has no properties', () => {
            const subClassWithoutProps = {
                getsubClassName: jest.fn().mockReturnValue('EmptyClass'),
                getConstructor: jest.fn().mockReturnValue('EmptyConstructor'),
                getProperties: jest.fn().mockReturnValue(null),
                getTopDisplayContent: jest.fn().mockReturnValue(document.createElement('div'))
            };
            
            const propertyWithEmptyClass = new SubClassProperty('test', mockVault, [subClassWithoutProps]);
            propertyWithEmptyClass.read = jest.fn().mockReturnValue('EmptyClass');
            
            const result = propertyWithEmptyClass.getSubClassProperty(mockFile);
            
            expect(result).toEqual([]);
        });

        it('should handle different property structures', () => {
            subClassProperty.read = jest.fn().mockReturnValue('SubClass2');
            
            const result = subClassProperty.getSubClassProperty(mockFile);
            
            expect(result).toEqual([{ name: 'prop3', type: 'text' }]);
        });
    });

    describe('getTopDisplayContent', () => {
        beforeEach(() => {
            subClassProperty.read = jest.fn();
        });

        it('should return container with subclass content when subclass found', () => {
            subClassProperty.read = jest.fn().mockReturnValue('SubClass1');
            
            const result = subClassProperty.getTopDisplayContent(mockFile);
            
            expect(result.tagName).toBe('DIV');
            expect(result.children.length).toBe(1);
            expect(mockSubClasses[0].getTopDisplayContent).toHaveBeenCalledWith(mockFile);
        });

        it('should return empty container when no subclass found', () => {
            subClassProperty.read = jest.fn().mockReturnValue('NonExistentClass');
            
            const result = subClassProperty.getTopDisplayContent(mockFile);
            
            expect(result.tagName).toBe('DIV');
            expect(result.children.length).toBe(0);
        });

        it('should handle null read result', () => {
            subClassProperty.read = jest.fn().mockReturnValue(null);
            
            const result = subClassProperty.getTopDisplayContent(mockFile);
            
            expect(result.tagName).toBe('DIV');
            expect(result.children.length).toBe(0);
        });

        it('should call getTopDisplayContent on correct subclass', () => {
            subClassProperty.read = jest.fn().mockReturnValue('SubClass2');
            
            const result = subClassProperty.getTopDisplayContent(mockFile);
            
            expect(mockSubClasses[1].getTopDisplayContent).toHaveBeenCalledWith(mockFile);
            expect(mockSubClasses[0].getTopDisplayContent).not.toHaveBeenCalled();
        });
    });

    describe('inheritance from SelectProperty', () => {
        it('should have options property from parent', () => {
            expect(subClassProperty.options).toBeDefined();
            expect(Array.isArray(subClassProperty.options)).toBe(true);
        });

        it('should have name property from parent', () => {
            expect(subClassProperty.name).toBe('testSubClass');
        });

        it('should have fillDisplay method from parent', () => {
            expect(typeof subClassProperty.fillDisplay).toBe('function');
        });

        it('should have read method from parent', () => {
            expect(typeof subClassProperty.read).toBe('function');
        });
    });

    describe('integration with subclasses', () => {
        it('should maintain consistency between subClasses and options', () => {
            expect(subClassProperty.subClasses.length).toBe(subClassProperty.options.length);
            
            subClassProperty.subClasses.forEach((subClass, index) => {
                expect(subClass.getsubClassName()).toBe(subClassProperty.options[index].name);
            });
        });

        it('should handle subclass method calls correctly', () => {
            subClassProperty.read = jest.fn().mockReturnValue('SubClass1');
            
            // Test multiple method calls
            subClassProperty.getSubClass(mockFile);
            subClassProperty.getSubClassProperty(mockFile);
            subClassProperty.getTopDisplayContent(mockFile);
            
            // Verify all methods were called on the correct subclass
            expect(mockSubClasses[0].getsubClassName).toHaveBeenCalled();
            expect(mockSubClasses[0].getProperties).toHaveBeenCalled();
            expect(mockSubClasses[0].getTopDisplayContent).toHaveBeenCalled();
        });
    });
});
