/**
 * @jest-environment jsdom
 */

import { ClasseProperty } from '../../src/properties/ClasseProperty';
import { Property } from '../../src/properties/Property';

jest.mock('../../src/vault/Utils', () => ({
    setIcon: jest.fn()
}));

// Import the mocked function for use in tests
const { setIcon } = jest.requireMock('../../src/vault/Utils');

describe('ClasseProperty', () => {
    let classeProperty: ClasseProperty;
    let mockVault: any;

    beforeEach(() => {
        // Reset DOM mocks
        document.body.innerHTML = '';
        jest.clearAllMocks();
        
        // Setup mock vault
        mockVault = {
            app: { 
                vault: { getFiles: jest.fn(() => []) },
                setIcon: jest.fn((element: HTMLElement, iconName: string) => {
                    element.setAttribute('data-icon', iconName);
                    element.textContent = `[${iconName}]`;
                })
            }
        } as any;
        
        classeProperty = new ClasseProperty('testClasse', mockVault);
    });

    describe('constructor', () => {
        it('should create ClasseProperty with correct type', () => {
            expect(classeProperty.type).toBe('class');
        });

        it('should inherit from Property', () => {
            expect(classeProperty).toBeInstanceOf(Property);
        });

        it('should use empty icon by default', () => {
            const defaultProperty = new ClasseProperty('defaultTest', mockVault, mockVault);
            expect(defaultProperty.name).toBe('defaultTest');
            expect(defaultProperty.type).toBe('class');
        });

        it('should accept custom icon', () => {
            const customProperty = new ClasseProperty('customName', mockVault, 'custom-icon');
            expect(customProperty.name).toBe('customName');
            expect(customProperty.icon).toBe('custom-icon');
        });

        it('should handle empty string icon', () => {
            const emptyIconProperty = new ClasseProperty('emptyIcon', mockVault, '');
            expect(emptyIconProperty.name).toBe('emptyIcon');
            expect(emptyIconProperty.icon).toBe('');
        });
    });

    describe('fillDisplay', () => {
        it('should create field with correct structure', () => {

            const mockUpdate = jest.fn();
            const value = 'Test Class Value';
            
            const result = classeProperty.fillDisplay(value, mockUpdate);
            
            expect(result.tagName).toBe('DIV');
            expect(result.classList.contains('metadata-field')).toBe(true);
        });

        it('should create label with correct text content', () => {

            const mockUpdate = jest.fn();
            const value = 'Test Class Value';
            
            const result = classeProperty.fillDisplay(value, mockUpdate);
            const label = result.querySelector('label');
            
            expect(label).toBeTruthy();
            expect(label?.textContent).toBe(value);
        });

        it('should set vault property', () => {

            const mockUpdate = jest.fn();
            const value = 'Test Value';
            
            classeProperty.fillDisplay(value, mockUpdate);
            
            expect(classeProperty.vault).toBe(mockVault);
        });

        it('should handle null value', () => {

            const mockUpdate = jest.fn();
            
            const result = classeProperty.fillDisplay(null, mockUpdate);
            const label = result.querySelector('label');
            
            expect(label?.textContent).toBe('');
        });

        it('should handle undefined value', () => {

            const mockUpdate = jest.fn();
            
            const result = classeProperty.fillDisplay(undefined, mockUpdate);
            const label = result.querySelector('label');
            
            expect(label?.textContent).toBe('');
        });

        it('should handle empty string value', () => {

            const mockUpdate = jest.fn();
            
            const result = classeProperty.fillDisplay('', mockUpdate);
            const label = result.querySelector('label');
            
            expect(label?.textContent).toBe('');
        });

        it('should handle numeric value', () => {

            const mockUpdate = jest.fn();
            const numericValue = 42;
            
            const result = classeProperty.fillDisplay(numericValue, mockUpdate);
            const label = result.querySelector('label');
            
            expect(label?.textContent).toBe('42');
        });

        it('should handle object value', () => {

            const mockUpdate = jest.fn();
            const objectValue = { name: 'test', id: 123 };
            
            const result = classeProperty.fillDisplay(objectValue, mockUpdate);
            const label = result.querySelector('label');
            
            expect(label?.textContent).toBe('[object Object]');
        });
    });

    describe('icon handling', () => {
        it('should not create icon container when no icon', () => {
            const propertyWithoutIcon = new ClasseProperty('noIcon', mockVault, '');

            const mockUpdate = jest.fn();
            const value = 'Test Value';
            
            const result = propertyWithoutIcon.fillDisplay(value, mockUpdate);
            const iconContainer = result.querySelector('.icon-container');
            
            expect(iconContainer).toBeNull();
        });

        it('should create icon container when icon provided', () => {
            const propertyWithIcon = new ClasseProperty('withIcon', mockVault, 'test-icon');

            const mockUpdate = jest.fn();
            const value = 'Test Value';
            
            const result = propertyWithIcon.fillDisplay(value, mockUpdate);
            const iconContainer = result.querySelector('.icon-container');
            
            expect(iconContainer).toBeTruthy();
            expect(iconContainer?.classList.contains('icon-container')).toBe(true);
        });

        it('should call setIcon when icon is provided', () => {
            const propertyWithIcon = new ClasseProperty('withIcon', mockVault, 'custom-icon');

            const mockUpdate = jest.fn();
            const value = 'Test Value';
            
            propertyWithIcon.fillDisplay(value, mockUpdate);
            
            expect(mockVault.app.setIcon).toHaveBeenCalledWith(expect.objectContaining({
                classList: expect.objectContaining({
                    contains: expect.any(Function)
                })
            }), 'custom-icon');
        });

        it('should not call setIcon when no icon', () => {
            mockVault.app.setIcon.mockClear();
            
            const propertyWithoutIcon = new ClasseProperty('noIcon', mockVault, '');

            const mockUpdate = jest.fn();
            const value = 'Test Value';
            
            propertyWithoutIcon.fillDisplay(value, mockUpdate);
            
            expect(mockVault.app.setIcon).not.toHaveBeenCalled();
        });
    });

    describe('inheritance from Property', () => {
        it('should have name property from parent', () => {
            expect(classeProperty.name).toBe('testClasse');
        });

        it('should have type property', () => {
            expect(classeProperty.type).toBe('class');
        });

        it('should have icon property from parent', () => {
            expect(classeProperty.icon).toBeDefined();
        });

        it('should have vault property that can be set', () => {

            classeProperty.vault = mockVault;
            expect(classeProperty.vault).toBe(mockVault);
        });
    });

    describe('field structure validation', () => {
        it('should have correct DOM structure without icon', () => {
            const propertyWithoutIcon = new ClasseProperty('test', mockVault, '');

            const mockUpdate = jest.fn();
            const value = 'Test Value';
            
            const result = propertyWithoutIcon.fillDisplay(value, mockUpdate);
            
            expect(result.children.length).toBe(1); // Only label
            expect(result.children[0].tagName).toBe('LABEL');
        });

        it('should have correct DOM structure with icon', () => {
            const propertyWithIcon = new ClasseProperty('test', mockVault, 'icon');

            const mockUpdate = jest.fn();
            const value = 'Test Value';
            
            const result = propertyWithIcon.fillDisplay(value, mockUpdate);
            
            expect(result.children.length).toBe(2); // Icon container + label
            expect(result.children[0].classList.contains('icon-container')).toBe(true);
            expect(result.children[1].tagName).toBe('LABEL');
        });

        it('should maintain correct order: icon first, then label', () => {
            const propertyWithIcon = new ClasseProperty('test', mockVault, 'icon');

            const mockUpdate = jest.fn();
            const value = 'Test Value';
            
            const result = propertyWithIcon.fillDisplay(value, mockUpdate);
            
            const firstChild = result.children[0];
            const secondChild = result.children[1];
            
            expect(firstChild.classList.contains('icon-container')).toBe(true);
            expect(secondChild.tagName).toBe('LABEL');
        });
    });
});
