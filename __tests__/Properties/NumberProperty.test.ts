/**
 * @jest-environment jsdom
 */

import { NumberProperty } from '../../src/properties/NumberProperty';

// Mock fs module
jest.mock('fs', () => ({
    cp: jest.fn()
}));

// Mock App module
jest.mock('../../src/vault/Utils', () => ({
    setIcon: jest.fn((element: HTMLElement, iconName: string) => {
        element.setAttribute('data-icon', iconName);
    })
}));

// Mock Vault
jest.mock('../../src/vault/Vault', () => ({
    Vault: jest.fn()
}));

// Mock FormulaProperty
jest.mock('../../src/properties/FormulaProperty', () => ({
    FormulaProperty: jest.fn().mockImplementation((name, formula, args) => ({
        name,
        formula,
        args,
        read: jest.fn(() => '42'),
        type: 'formula'
    }))
}));

describe('NumberProperty', () => {
    let numberProperty: NumberProperty;
    let mockVault: any;
    let mockFile: any;

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';
        
        // Mock vault
        mockVault = {
            app: {
                vault: { getFiles: jest.fn(() => []) },
                setIcon: jest.fn((element: HTMLElement, iconName: string) => {
                    element.setAttribute('data-icon', iconName);
                    element.textContent = `[${iconName}]`;
                })
            }
        };

        // Mock file
        mockFile = {
            getMetadata: jest.fn(() => ({ testNumber: '123' })),
            getMetadataValue: jest.fn((key: string) => key === 'testNumber' ? '123' : undefined),
            updateMetadata: jest.fn(),
            vault: mockVault
        };

        numberProperty = new NumberProperty('testNumber', mockVault, 'kg');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create NumberProperty with default values', () => {
            const prop = new NumberProperty('test', mockVault);
            
            expect(prop.name).toBe('test');
            expect(prop.type).toBe('number');
            expect(prop.unit).toBe('');
            expect(prop.formulaProperty).toBeNull();
        });

        it('should create NumberProperty with unit', () => {
            const prop = new NumberProperty('weight', mockVault, 'kg');
            
            expect(prop.name).toBe('weight');
            expect(prop.unit).toBe('kg');
            expect(prop.type).toBe('number');
        });

        it('should create NumberProperty with formula', () => {
            const args = { icon: 'calculator', static: false, formula: 'a + b' };
            const prop = new NumberProperty('calculated', mockVault, 'units', args);
            
            expect(prop.name).toBe('calculated');
            expect(prop.unit).toBe('units');
            expect(prop.formulaProperty).toBeTruthy();
        });

        it('should create NumberProperty without formula when not provided', () => {
            const args = { icon: 'hash', static: true };
            const prop = new NumberProperty('simple', mockVault, 'cm', args);
            
            expect(prop.formulaProperty).toBeNull();
        });
    });

    describe('validate', () => {
        it('should validate valid numbers', () => {
            expect(numberProperty.validate('123')).toBe('123');
            expect(numberProperty.validate('123.45')).toBe('123.45');
            expect(numberProperty.validate('0')).toBe('0');
            expect(numberProperty.validate('-50')).toBe('-50');
            expect(numberProperty.validate('3.14159')).toBe('3.14159');
        });

        it('should handle invalid numbers', () => {
            expect(numberProperty.validate('abc')).toBe('');
            expect(numberProperty.validate('12abc')).toBe('');
            expect(numberProperty.validate('')).toBe('');
            expect(numberProperty.validate('   ')).toBe('');
            expect(numberProperty.validate('NaN')).toBe('');
        });

        it('should handle edge cases', () => {
            expect(numberProperty.validate('Infinity')).toBe('Infinity');
            expect(numberProperty.validate('-Infinity')).toBe('-Infinity');
            expect(numberProperty.validate('1e10')).toBe('10000000000');
            expect(numberProperty.validate('1.23e-4')).toBe('0.000123');
        });
    });

    describe('createFieldInput', () => {
        it('should create number input element', () => {
            const input = numberProperty.createFieldInput('123');
            
            expect(input.tagName).toBe('INPUT');
            expect((input as HTMLInputElement).type).toBe('number');
            expect((input as HTMLInputElement).value).toBe('123');
            expect(input.classList.contains('field-input')).toBe(true);
        });

        it('should handle empty value', () => {
            const input = numberProperty.createFieldInput('');
            
            expect((input as HTMLInputElement).value).toBe('');
        });
    });

    describe('createFieldLink', () => {
        it('should create link with value and unit', () => {
            const link = numberProperty.createFieldLink('123');
            
            expect(link.tagName).toBe('DIV');
            expect(link.textContent).toBe('123 kg');
            expect(link.classList.contains('field-link')).toBe(true);
        });

        it('should create link without unit when unit is empty', () => {
            const propWithoutUnit = new NumberProperty('test', mockVault, "");
            const link = propWithoutUnit.createFieldLink('123');
            
            expect(link.textContent).toBe('123 ');
        });

        it('should handle empty value', () => {
            const link = numberProperty.createFieldLink('');
            
            expect(link.textContent).toBe('');
        });

        it('should have correct cursor style based on static property', () => {
            numberProperty.static = false;
            const link = numberProperty.createFieldLink('123');
            expect(link.style.cursor).toBe('text');
            
            numberProperty.static = true;
            const linkStatic = numberProperty.createFieldLink('123');
            expect(linkStatic.style.cursor).toBe('default');
        });

        it('should add click listener for non-static properties', () => {
            numberProperty.static = false;
            const link = numberProperty.createFieldLink('123');
            
            // Setup DOM structure for modifyField
            const field = document.createElement('div');
            field.classList.add('metadata-field');
            const input = document.createElement('input');
            input.classList.add('field-input');
            field.appendChild(link);
            field.appendChild(input);
            document.body.appendChild(field);
            
            link.click();
            
            expect(link.style.display).toBe('none');
            expect(input.style.display).toBe('block');
        });
    });

    describe('createFieldContainerContent', () => {
        it('should create field container with input and link', () => {
            const updateFn = jest.fn();
            const container = numberProperty.createFieldContainerContent(updateFn, '123');
            
            expect(container.tagName).toBe('DIV');
            expect(container.classList.contains('field-container')).toBe(true);
            
            const link = container.querySelector('.field-link');
            const input = container.querySelector('.field-input');
            
            expect(link).toBeTruthy();
            expect(input).toBeTruthy();
        });

        it('should show link when static property is true', () => {
            numberProperty.static = true;
            const updateFn = jest.fn();
            const container = numberProperty.createFieldContainerContent(updateFn, '123');
            
            const link = container.querySelector('.field-link') as HTMLElement;
            const input = container.querySelector('.field-input') as HTMLElement;
            
            expect(link.style.display).toBe('block');
            expect(input.style.display).toBe('none');
        });

        it('should show appropriate field based on value validity for non-static', () => {
            numberProperty.static = false;
            const updateFn = jest.fn();
            
            // Valid value - should show link
            const containerValid = numberProperty.createFieldContainerContent(updateFn, '123');
            const linkValid = containerValid.querySelector('.field-link') as HTMLElement;
            const inputValid = containerValid.querySelector('.field-input') as HTMLElement;
            
            expect(linkValid.style.display).toBe('block');
            expect(inputValid.style.display).toBe('none');
            
            // Invalid value - should show input
            const containerInvalid = numberProperty.createFieldContainerContent(updateFn, 'abc');
            const linkInvalid = containerInvalid.querySelector('.field-link') as HTMLElement;
            const inputInvalid = containerInvalid.querySelector('.field-input') as HTMLElement;
            
            expect(linkInvalid.style.display).toBe('none');
            expect(inputInvalid.style.display).toBe('block');
        });
    });

    describe('updateField', () => {
        it('should update field with valid value', async () => {
            const updateFn = jest.fn();
            const input = document.createElement('input') as HTMLInputElement;
            const link = document.createElement('div');
            
            input.value = '456';
            
            await numberProperty.updateField(updateFn, input, link);
            
            expect(updateFn).toHaveBeenCalledWith('456');
            expect(input.style.display).toBe('none');
            expect(link.textContent).toBe('456 kg');
            expect(link.style.display).toBe('block');
        });

        it('should update field with empty value', async () => {
            const updateFn = jest.fn();
            const input = document.createElement('input') as HTMLInputElement;
            const link = document.createElement('div');
            
            input.value = '';
            
            await numberProperty.updateField(updateFn, input, link);
            
            expect(updateFn).toHaveBeenCalledWith('');
        });

        it('should handle units correctly in display', async () => {
            const updateFn = jest.fn();
            const input = document.createElement('input') as HTMLInputElement;
            const link = document.createElement('div');
            
            // Test with unit
            input.value = '100';
            await numberProperty.updateField(updateFn, input, link);
            expect(link.textContent).toBe('100 kg');
            
            // Test without unit
            const propWithoutUnit = new NumberProperty('test', mockVault, "");
            input.value = '200';
            await propWithoutUnit.updateField(updateFn, input, link);
            expect(link.textContent).toBe('200 ');
        });
    });

    describe('getDisplay', () => {
        it('should use regular value when available', async () => {
            numberProperty.read = jest.fn().mockResolvedValue('123');
            numberProperty.fillDisplay = jest.fn(() => document.createElement('div'));
            
            await numberProperty.getDisplay(mockFile, { staticMode: true, title: 'Test Number' });
            
            expect(numberProperty.static).toBe(true);
            expect(numberProperty.title).toBe('Test Number');
            expect(numberProperty.read).toHaveBeenCalledWith(mockFile);
            expect(numberProperty.fillDisplay).toHaveBeenCalledWith(
                '123',
                expect.any(Function)
            );
        });

        it('should use formula value when regular value not available', async () => {
            const mockFormulaProperty = {
                read: jest.fn().mockResolvedValue('42')
            };
            
            numberProperty.formulaProperty = mockFormulaProperty as any;
            numberProperty.read = jest.fn().mockResolvedValue(null);
            numberProperty.fillDisplay = jest.fn(() => document.createElement('div'));
            
            await numberProperty.getDisplay(mockFile);
            
            expect(numberProperty.read).toHaveBeenCalledWith(mockFile);
            expect(mockFormulaProperty.read).toHaveBeenCalledWith(mockFile);
            expect(numberProperty.fillDisplay).toHaveBeenCalledWith(
                '42', // Mock formula result
                expect.any(Function)
            );
        });

        it('should use regular value when both regular and formula available', async () => {
            const mockFormulaProperty = {
                read: jest.fn().mockResolvedValue('42')
            };
            
            numberProperty.formulaProperty = mockFormulaProperty as any;
            numberProperty.read = jest.fn().mockResolvedValue('999');
            numberProperty.fillDisplay = jest.fn(() => document.createElement('div'));
            
            await numberProperty.getDisplay(mockFile);
            
            expect(numberProperty.read).toHaveBeenCalledWith(mockFile);
            expect(mockFormulaProperty.read).not.toHaveBeenCalled();
            expect(numberProperty.fillDisplay).toHaveBeenCalledWith(
                '999',
                expect.any(Function)
            );
        });
    });

    describe('fillDisplay', () => {
        it('should create complete display with title', () => {
            numberProperty.title = 'Weight';
            const updateFn = jest.fn();
            
            const result = numberProperty.fillDisplay('150', updateFn);
            
            expect(numberProperty.vault).toBe(mockVault);
            expect(result.querySelector('.metadata-title')).toBeTruthy();
            expect(result.querySelector('.metadata-title')?.textContent).toBe('Weight');
            expect(result.querySelector('.icon-container')).toBeTruthy();
            expect(result.querySelector('.field-container')).toBeTruthy();
        });

        it('should create display without title when title is empty', () => {
            numberProperty.title = '';
            const updateFn = jest.fn();
            
            const result = numberProperty.fillDisplay('150', updateFn);
            
            expect(result.querySelector('.metadata-title')).toBeFalsy();
        });
    });

    describe('integration with Property base class', () => {
        it('should inherit all base functionality', () => {
            expect(numberProperty.name).toBe('testNumber');
            expect(numberProperty.type).toBe('number');
            expect(numberProperty).toBeInstanceOf(NumberProperty);
        });

        it('should override createFieldInput to use number input', () => {
            const input = numberProperty.createFieldInput('123');
            expect((input as HTMLInputElement).type).toBe('number');
        });

        it('should work with base class methods', () => {
            expect(typeof numberProperty.read).toBe('function');
            expect(typeof numberProperty.getPretty).toBe('function');
            expect(typeof numberProperty.getLink).toBe('function');
        });
    });

    describe('edge cases and error handling', () => {
        it('should handle null and undefined values', () => {
            expect(numberProperty.validate(null as any)).toBe('');
            expect(numberProperty.validate(undefined as any)).toBe('');
        });

        it('should handle very large numbers', () => {
            const largeNumber = '999999999999999999999';
            const result = numberProperty.validate(largeNumber);
            expect(result).toBe('1e+21');
        });

        it('should handle very small numbers', () => {
            const smallNumber = '0.000000000000000001';
            const result = numberProperty.validate(smallNumber);
            expect(result).toBe('1e-18');
        });

        it('should handle whitespace in input', () => {
            expect(numberProperty.validate('  123  ')).toBe('123');
            expect(numberProperty.validate('\t456\n')).toBe('456');
        });

        it('should create field link with falsy values', () => {
            const link1 = numberProperty.createFieldLink('0');
            expect(link1.textContent).toBe('0 kg');
            
            const link2 = numberProperty.createFieldLink(null as any);
            expect(link2.textContent).toBe('');
            
            const link3 = numberProperty.createFieldLink(undefined as any);
            expect(link3.textContent).toBe('');
        });
    });
});
