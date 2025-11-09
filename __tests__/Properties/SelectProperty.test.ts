/**
 * @jest-environment jsdom
 */

import { Property } from '../../src/properties/Property';
import { SelectProperty } from '../../src/properties/SelectProperty';

// Mock App module
jest.mock('../../src/vault/Utils', () => ({
    setIcon: jest.fn((element: HTMLElement, iconName: string) => {
        element.setAttribute('data-icon', iconName);
    }),
    sendNotice: jest.fn(),
    Notice: jest.fn()
}));

// Mock Vault
jest.mock('../../src/vault/Vault', () => ({
    Vault: jest.fn()
}));

describe('SelectProperty', () => {
    let selectProperty: SelectProperty;
    let mockVault: any;
    let mockFile: any;
    let options: {name: string, color: string}[];

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';
        
        // Mock vault
        mockVault = {
            app: {
                vault: { getFiles: jest.fn(() => []) },
                setIcon: jest.fn()
            }
        };

        // Mock file
        mockFile = {
            getMetadata: jest.fn(() => ({ status: 'in-progress' })),
            getMetadataValue: jest.fn((key: string) => key === 'status' ? 'in-progress' : undefined),
            updateMetadata: jest.fn(),
            vault: mockVault
        };

        // Create test options
        options = [
            { name: 'todo', color: '#ffcccc' },
            { name: 'in-progress', color: '#ccffcc' },
            { name: 'done', color: '#ccccff' },
            { name: 'blocked', color: '#ffccff' }
        ];

        selectProperty = new SelectProperty('status', mockVault, options);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create SelectProperty with correct type and options', () => {
            const prop = new SelectProperty('test', mockVault, options);
            
            expect(prop.name).toBe('test');
            expect(prop.type).toBe('select');
            expect(prop.options).toBe(options);
            expect(prop.options.length).toBe(4);
        });

        it('should inherit from Property', () => {
            expect(selectProperty).toBeInstanceOf(Property);
            expect(selectProperty).toBeInstanceOf(SelectProperty);
        });

        it('should accept custom arguments', () => {
            const args = { icon: 'custom-select', staticProperty: true };
            const prop = new SelectProperty('custom', mockVault, options, args);
            
            expect(prop.name).toBe('custom');
            expect(prop.static).toBe(true);
            expect(prop.icon).toBe('custom-select');
            expect(prop.options).toBe(options);
        });

        it('should handle empty options array', () => {
            const prop = new SelectProperty('empty', mockVault, []);
            
            expect(prop.options).toEqual([]);
            expect(prop.options.length).toBe(0);
        });
    });

    describe('fillDisplay', () => {
        it('should create complete display structure', () => {
            const updateFn = jest.fn();
            const display = selectProperty.fillDisplay('in-progress', updateFn);
            
            expect(display).toBeTruthy();
            expect(display.classList.contains('metadata-field')).toBe(true);
            
            const fieldContainer = display.querySelector('.field-container-column');
            expect(fieldContainer).toBeTruthy();
            
            const selectElement = display.querySelector('select');
            expect(selectElement).toBeTruthy();
        });

        it('should create header when title is provided', () => {
            selectProperty.title = 'Project Status';
            const updateFn = jest.fn();
            const display = selectProperty.fillDisplay('todo', updateFn);
            
            const header = display.querySelector('.metadata-header');
            expect(header).toBeTruthy();
            expect(header?.textContent).toBe('Project Status');
        });

        it('should not create header when title is not provided', () => {
            selectProperty.title = undefined as any;
            const updateFn = jest.fn();
            const display = selectProperty.fillDisplay('todo', updateFn);
            
            const header = display.querySelector('.metadata-header');
            expect(header).toBeFalsy();
        });

        it('should set vault property', () => {
            const updateFn = jest.fn();
            selectProperty.fillDisplay('done', updateFn);
            
            expect(selectProperty.vault).toBe(mockVault);
        });
    });

    describe('createSelectWidget', () => {
        it('should create select element with all options', () => {
            const updateFn = jest.fn();
            const selectElement = selectProperty.createSelectWidget('in-progress', updateFn);
            
            expect(selectElement.tagName).toBe('SELECT');
            expect(selectElement.classList.contains('select-dropdown')).toBe(true);
            
            const optionElements = selectElement.querySelectorAll('option');
            expect(optionElements.length).toBe(4);
            
            optionElements.forEach((optionEl, index) => {
                expect(optionEl.value).toBe(options[index].name);
                expect(optionEl.textContent).toBe(options[index].name);
                // Browser converts hex colors to rgb format, so we check the style attribute directly
                expect(optionEl.style.backgroundColor).toBeTruthy();
                expect(optionEl.classList.contains('select-dropdown-option')).toBe(true);
            });
        });

        it('should set selected option correctly', () => {
            const updateFn = jest.fn();
            const selectElement = selectProperty.createSelectWidget('done', updateFn);
            
            const selectedOption = Array.from(selectElement.options).find(opt => opt.selected);
            expect(selectedOption?.value).toBe('done');
            expect(selectedOption?.textContent).toBe('done');
        });

        it('should apply background color of selected option', () => {
            const updateFn = jest.fn();
            const selectElement = selectProperty.createSelectWidget('blocked', updateFn);
            
            // Check that a background color was set (browser converts hex to rgb)
            expect(selectElement.style.backgroundColor).toBeTruthy();
        });

        it('should handle no initial value by selecting first option', async () => {
            const updateFn = jest.fn();
            const selectElement = selectProperty.createSelectWidget('', updateFn);
            
            expect(selectElement.style.backgroundColor).toBeTruthy(); // First option color set
            expect(updateFn).toHaveBeenCalledWith('todo'); // First option name
        });

        it('should handle empty value by selecting first option', async () => {
            const updateFn = jest.fn();
            const selectElement = selectProperty.createSelectWidget(null as any, updateFn);
            
            expect(selectElement.style.backgroundColor).toBeTruthy(); // First option color set
            expect(updateFn).toHaveBeenCalledWith('todo'); // First option name
        });

        it('should handle empty options array gracefully', () => {
            const emptyProperty = new SelectProperty('empty', mockVault, []);
            const updateFn = jest.fn();
            const selectElement = emptyProperty.createSelectWidget('any-value', updateFn);
            
            expect(selectElement.options.length).toBe(0);
            expect(selectElement.style.backgroundColor).toBe(''); // No color set
            expect(updateFn).not.toHaveBeenCalled();
        });

        it('should disable select when static is true', () => {
            selectProperty.static = true;
            const updateFn = jest.fn();
            const selectElement = selectProperty.createSelectWidget('todo', updateFn);
            
            expect(selectElement.disabled).toBe(true);
        });

        it('should not disable select when static is false', () => {
            selectProperty.static = false;
            const updateFn = jest.fn();
            const selectElement = selectProperty.createSelectWidget('todo', updateFn);
            
            expect(selectElement.disabled).toBe(false);
        });
    });

    describe('change event handling', () => {
        it('should handle option change events', async () => {
            const updateFn = jest.fn();
            const selectElement = selectProperty.createSelectWidget('todo', updateFn);
            
            // Change to 'done' option
            selectElement.value = 'done';
            const changeEvent = new Event('change');
            
            selectElement.dispatchEvent(changeEvent);
            
            // Wait for async update
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(updateFn).toHaveBeenCalledWith('done');
            expect(selectElement.style.backgroundColor).toBeTruthy(); // Color should be set
        });

        it('should update background color on change', async () => {
            const updateFn = jest.fn();
            const selectElement = selectProperty.createSelectWidget('todo', updateFn);
            
            const initialColor = selectElement.style.backgroundColor;
            expect(initialColor).toBeTruthy(); // todo color set
            
            // Change to 'in-progress'
            selectElement.value = 'in-progress';
            selectElement.dispatchEvent(new Event('change'));
            
            // Wait for event processing
            await new Promise(resolve => setTimeout(resolve, 0));
            
            const newColor = selectElement.style.backgroundColor;
            expect(newColor).toBeTruthy(); // in-progress color set
            expect(newColor).not.toBe(initialColor); // Color should change
        });

        it('should handle change to non-existent option gracefully', async () => {
            const updateFn = jest.fn();
            const selectElement = selectProperty.createSelectWidget('todo', updateFn);
            
            // Since select elements only allow values that exist as options,
            // setting a non-existent value will actually result in an empty string
            selectElement.value = 'non-existent'; // This gets normalized to ''
            selectElement.dispatchEvent(new Event('change'));
            
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(updateFn).toHaveBeenCalledWith(''); // Empty string for invalid value
            // Background color should remain unchanged since option not found
            expect(selectElement.style.backgroundColor).toBeTruthy(); // Original color still set
        });
    });

    describe('integration with base Property class', () => {
        it('should work with getDisplay method', async () => {
            selectProperty.read = jest.fn().mockResolvedValue('in-progress');
            
            const display = await selectProperty.getDisplay(mockFile);
            
            expect(display).toBeTruthy();
            expect(display.classList.contains('metadata-field')).toBe(true);
        });

        it('should inherit all base functionality', () => {
            expect(selectProperty.name).toBe('status');
            expect(selectProperty.type).toBe('select');
            expect(typeof selectProperty.read).toBe('function');
            expect(typeof selectProperty.createFieldContainer).toBe('function');
        });

        it('should use correct field container', () => {
            const container = selectProperty.createFieldContainer();
            
            expect(container.tagName).toBe('DIV');
            expect(container.classList.contains('metadata-field')).toBe(true);
        });
    });

    describe('option management', () => {
        it('should handle options with different colors', () => {
            const colorfulOptions = [
                { name: 'red', color: 'red' },
                { name: 'green', color: 'green' },
                { name: 'blue', color: 'blue' },
                { name: 'yellow', color: '#ffff00' },
                { name: 'transparent', color: 'transparent' }
            ];
            
            const colorProperty = new SelectProperty('colors', mockVault, colorfulOptions);
            const updateFn = jest.fn();
            const selectElement = colorProperty.createSelectWidget('blue', updateFn);
            
            expect(selectElement.style.backgroundColor).toBeTruthy(); // Blue color set
            
            const options = selectElement.querySelectorAll('option');
            expect(options[0].style.backgroundColor).toBeTruthy(); // Red set
            expect(options[1].style.backgroundColor).toBeTruthy(); // Green set
            expect(options[2].style.backgroundColor).toBeTruthy(); // Blue set
            expect(options[3].style.backgroundColor).toBeTruthy(); // Yellow set
            expect(options[4].style.backgroundColor).toBeTruthy(); // Transparent set
        });

        it('should handle options with special characters in names', () => {
            const specialOptions = [
                { name: 'option-with-dashes', color: 'red' },
                { name: 'option_with_underscores', color: 'green' },
                { name: 'option with spaces', color: 'blue' },
                { name: 'option.with.dots', color: 'yellow' },
                { name: 'option/with/slashes', color: 'purple' }
            ];
            
            const specialProperty = new SelectProperty('special', mockVault, specialOptions);
            const updateFn = jest.fn();
            const selectElement = specialProperty.createSelectWidget('option with spaces', updateFn);
            
            const selectedOption = Array.from(selectElement.options).find(opt => opt.selected);
            expect(selectedOption?.value).toBe('option with spaces');
            expect(selectedOption?.textContent).toBe('option with spaces');
        });

        it('should handle long option names', () => {
            const longOptions = [
                { name: 'Very long option name that might cause display issues', color: 'red' },
                { name: 'Another extremely long option name for testing purposes', color: 'green' }
            ];
            
            const longProperty = new SelectProperty('long', mockVault, longOptions);
            const updateFn = jest.fn();
            const selectElement = longProperty.createSelectWidget(longOptions[0].name, updateFn);
            
            const options = selectElement.querySelectorAll('option');
            expect(options[0].textContent).toBe(longOptions[0].name);
            expect(options[1].textContent).toBe(longOptions[1].name);
        });
    });

    describe('edge cases and error handling', () => {
        it('should handle undefined colors', () => {
            const undefinedColorOptions = [
                { name: 'no-color', color: undefined as any },
                { name: 'empty-color', color: '' },
                { name: 'null-color', color: null as any }
            ];
            
            const undefinedProperty = new SelectProperty('undefined', mockVault, undefinedColorOptions);
            const updateFn = jest.fn();
            const selectElement = undefinedProperty.createSelectWidget('no-color', updateFn);
            
            // Should not crash and create options anyway
            expect(selectElement.options.length).toBe(3);
        });

        it('should handle duplicate option names', () => {
            const duplicateOptions = [
                { name: 'duplicate', color: 'red' },
                { name: 'unique', color: 'green' },
                { name: 'duplicate', color: 'blue' }
            ];
            
            const duplicateProperty = new SelectProperty('duplicate', mockVault, duplicateOptions);
            const updateFn = jest.fn();
            const selectElement = duplicateProperty.createSelectWidget('duplicate', updateFn);
            
            // Should create all options, even duplicates
            expect(selectElement.options.length).toBe(3);
            
            // Last duplicate with same name should be selected (browser behavior)
            const selectedOptions = Array.from(selectElement.options).filter(opt => opt.selected);
            expect(selectedOptions.length).toBe(1);
            expect(selectedOptions[0].style.backgroundColor).toBeTruthy(); // Color should be set (last duplicate)
        });

        it('should handle case sensitivity in option selection', () => {
            const updateFn = jest.fn();
            const selectElement = selectProperty.createSelectWidget('TODO', updateFn); // Wrong case
            
            // Value 'TODO' doesn't match any option (case sensitive), so no styling applied
            expect(selectElement.style.backgroundColor).toBe(''); // No color set for non-matching value
            expect(updateFn).not.toHaveBeenCalled(); // No update called for non-matching value
            
            // But the select element should still contain all options
            expect(selectElement.options.length).toBe(4);
        });

        it('should handle null/undefined values in widget creation', () => {
            const updateFn = jest.fn();
            
            // Should not crash with null/undefined
            expect(() => {
                selectProperty.createSelectWidget(null as any, updateFn);
            }).not.toThrow();
            
            expect(() => {
                selectProperty.createSelectWidget(undefined as any, updateFn);
            }).not.toThrow();
        });
    });

    describe('complete workflow', () => {
        it('should handle complete selection workflow', async () => {
            const updateFn = jest.fn();
            
            // Create display
            const display = selectProperty.fillDisplay('todo', updateFn);
            const selectElement = display.querySelector('select') as HTMLSelectElement;
            
            // Verify initial state
            expect(selectElement.value).toBe('todo');
            const initialColor = selectElement.style.backgroundColor;
            expect(initialColor).toBeTruthy();
            
            // Change selection
            selectElement.value = 'done';
            selectElement.dispatchEvent(new Event('change'));
            
            await new Promise(resolve => setTimeout(resolve, 0));
            
            // Verify update
            expect(updateFn).toHaveBeenCalledWith('done');
            const newColor = selectElement.style.backgroundColor;
            expect(newColor).toBeTruthy();
            expect(newColor).not.toBe(initialColor);
        });

        it('should work with property read/write cycle', async () => {
            // Mock the read method
            selectProperty.read = jest.fn().mockResolvedValue('blocked');
            
            const display = await selectProperty.getDisplay(mockFile);
            const selectElement = display.querySelector('select') as HTMLSelectElement;
            
            expect(selectElement).toBeTruthy();
            // The value should be set based on what read returns
            expect(selectElement.style.backgroundColor).toBeTruthy(); // blocked color set
        });
    });
});
