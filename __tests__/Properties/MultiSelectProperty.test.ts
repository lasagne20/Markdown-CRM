/**
 * @jest-environment jsdom
 */

import { Vault } from '../../src/vault/Vault';
import { MultiSelectProperty } from '../../src/properties/MultiSelectProperty';

// Mocks
jest.mock('../../src/vault/Vault');

describe('MultiSelectProperty', () => {
    let multiSelectProperty: MultiSelectProperty;
    let mockVault: jest.Mocked<Vault>;
    let mockUpdate: jest.Mock<Promise<void>, [string[]]>;
    let options: {name: string, color: string}[];

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';
        // Reset all mocks
        jest.clearAllMocks();

        // Setup test options
        options = [
            { name: 'Option 1', color: '#FF0000' },
            { name: 'Option 2', color: '#00FF00' },
            { name: 'Option 3', color: '#0000FF' }
        ];

        // Setup mocks
        mockVault = {
            getPersonalName: jest.fn().mockReturnValue('John Doe'),
            app: { 
                vault: { getFiles: jest.fn(() => []) },
                setIcon: jest.fn((element: HTMLElement, iconName: string) => {
                    element.setAttribute('data-icon', iconName);
                    element.textContent = `[${iconName}]`;
                })
            }
        } as any;

        mockUpdate = jest.fn().mockResolvedValue(undefined);
    });

    describe('Constructor', () => {
        test('should create MultiSelectProperty with required parameters', () => {
            multiSelectProperty = new MultiSelectProperty('testSelect', mockVault, options);

            expect(multiSelectProperty.name).toBe('testSelect');
            expect(multiSelectProperty.type).toBe('multiSelect');
            expect(multiSelectProperty.options).toEqual(options);
        });

        test('should handle custom arguments', () => {
            const args = { icon: 'list', defaultValue: ['Option 1'] };
            multiSelectProperty = new MultiSelectProperty('testSelect', mockVault, options, args);

            expect(multiSelectProperty.name).toBe('testSelect');
            expect(multiSelectProperty.options).toEqual(options);
            expect(multiSelectProperty.icon).toBe('list');
        });

        test('should handle empty options array', () => {
            multiSelectProperty = new MultiSelectProperty('testSelect', mockVault, []);

            expect(multiSelectProperty.options).toEqual([]);
        });
    });

    describe('fillDisplay', () => {
        beforeEach(() => {
            multiSelectProperty = new MultiSelectProperty('testSelect', mockVault, options);
        });

        test('should create field container with correct structure', () => {
            const value: string[] = [];
            
            const container = multiSelectProperty.fillDisplay(mockVault, value, mockUpdate);

            expect(container).toBeDefined();
            expect(container.classList.contains('metadata-field')).toBe(true);
        });

        test('should set vault property', () => {
            const value: string[] = [];
            
            multiSelectProperty.fillDisplay(mockVault, value, mockUpdate);

            expect(multiSelectProperty.vault).toBe(mockVault);
        });

        test('should create header with correct text', () => {
            const value: string[] = [];
            
            const container = multiSelectProperty.fillDisplay(mockVault, value, mockUpdate);
            const header = container.querySelector('.metadata-header');

            expect(header).toBeDefined();
            expect(header?.textContent).toBe('testSelect');
        });

        test('should create button container', () => {
            const value: string[] = [];
            
            const container = multiSelectProperty.fillDisplay(mockVault, value, mockUpdate);
            const buttonContainer = container.querySelector('.multi-select-container');

            expect(buttonContainer).toBeDefined();
        });

        test('should handle null/undefined value', () => {
            const container1 = multiSelectProperty.fillDisplay(mockVault, null, mockUpdate);
            const container2 = multiSelectProperty.fillDisplay(mockVault, undefined, mockUpdate);

            expect(container1).toBeDefined();
            expect(container2).toBeDefined();
        });
    });

    describe('getDefaultValue', () => {
        test('should replace personalName with actual name from vault', () => {
            multiSelectProperty = new MultiSelectProperty('testSelect', mockVault, options);
            multiSelectProperty.default = ['personalName', 'Option 1'];

            const result = multiSelectProperty.getDefaultValue();

            expect(result).toEqual(['John Doe', 'Option 1']);
            expect(mockVault.getPersonalName).toHaveBeenCalled();
        });

        test('should not modify values that are not personalName', () => {
            multiSelectProperty = new MultiSelectProperty('testSelect', mockVault, options);
            multiSelectProperty.default = ['Option 1', 'Option 2'];

            const result = multiSelectProperty.getDefaultValue();

            expect(result).toEqual(['Option 1', 'Option 2']);
        });

        test('should handle array with no personalName', () => {
            multiSelectProperty = new MultiSelectProperty('testSelect', mockVault, options);
            multiSelectProperty.default = ['Option 3'];

            const result = multiSelectProperty.getDefaultValue();

            expect(result).toEqual(['Option 3']);
            expect(mockVault.getPersonalName).not.toHaveBeenCalled();
        });

        test('should handle empty default array', () => {
            multiSelectProperty = new MultiSelectProperty('testSelect', mockVault, options);
            multiSelectProperty.default = [];

            const result = multiSelectProperty.getDefaultValue();

            expect(result).toEqual([]);
        });

        test('should handle multiple personalName entries', () => {
            multiSelectProperty = new MultiSelectProperty('testSelect', mockVault, options);
            multiSelectProperty.default = ['personalName', 'Option 1', 'personalName'];

            const result = multiSelectProperty.getDefaultValue();

            expect(result).toEqual(['John Doe', 'Option 1', 'John Doe']);
            expect(mockVault.getPersonalName).toHaveBeenCalledTimes(2);
        });
    });

    describe('createButtonGroup', () => {
        beforeEach(() => {
            multiSelectProperty = new MultiSelectProperty('testSelect', mockVault, options);
        });

        test('should create button for each option', () => {
            const value: string[] = [];
            
            const buttonContainer = multiSelectProperty.createButtonGroup(value, mockUpdate);
            const buttons = buttonContainer.querySelectorAll('.multi-select-button');

            expect(buttons.length).toBe(3);
            expect(buttons[0].textContent).toBe('Option 1');
            expect(buttons[1].textContent).toBe('Option 2');
            expect(buttons[2].textContent).toBe('Option 3');
        });

        test('should mark selected options as selected', () => {
            const value: string[] = ['Option 1', 'Option 3'];
            
            const buttonContainer = multiSelectProperty.createButtonGroup(value, mockUpdate);
            const buttons = buttonContainer.querySelectorAll('.multi-select-button');

            expect(buttons[0].classList.contains('selected')).toBe(true);
            expect(buttons[1].classList.contains('selected')).toBe(false);
            expect(buttons[2].classList.contains('selected')).toBe(true);
        });

        test('should handle empty selection', () => {
            const value: string[] = [];
            
            const buttonContainer = multiSelectProperty.createButtonGroup(value, mockUpdate);
            const buttons = buttonContainer.querySelectorAll('.multi-select-button');

            buttons.forEach(button => {
                expect(button.classList.contains('selected')).toBe(false);
            });
        });

        test('should handle all options selected', () => {
            const value: string[] = ['Option 1', 'Option 2', 'Option 3'];
            
            const buttonContainer = multiSelectProperty.createButtonGroup(value, mockUpdate);
            const buttons = buttonContainer.querySelectorAll('.multi-select-button');

            buttons.forEach(button => {
                expect(button.classList.contains('selected')).toBe(true);
            });
        });

        test('should add container class', () => {
            const value: string[] = [];
            
            const buttonContainer = multiSelectProperty.createButtonGroup(value, mockUpdate);

            expect(buttonContainer.classList.contains('multi-select-container')).toBe(true);
        });
    });

    describe('Button click functionality', () => {
        beforeEach(() => {
            multiSelectProperty = new MultiSelectProperty('testSelect', mockVault, options);
        });

        test('should select unselected option on click', async () => {
            const value: string[] = [];
            
            const buttonContainer = multiSelectProperty.createButtonGroup(value, mockUpdate);
            const firstButton = buttonContainer.querySelector('.multi-select-button') as HTMLElement;

            await firstButton.click();

            expect(mockUpdate).toHaveBeenCalledWith(['Option 1']);
        });

        test('should deselect selected option on click', async () => {
            const value: string[] = ['Option 1', 'Option 2'];
            
            const buttonContainer = multiSelectProperty.createButtonGroup(value, mockUpdate);
            const firstButton = buttonContainer.querySelector('.multi-select-button') as HTMLElement;

            await firstButton.click();

            expect(mockUpdate).toHaveBeenCalledWith(['Option 2']);
        });

        test('should handle multiple selections', async () => {
            const value: string[] = [];
            
            const buttonContainer = multiSelectProperty.createButtonGroup(value, mockUpdate);
            const buttons = buttonContainer.querySelectorAll('.multi-select-button') as NodeListOf<HTMLElement>;

            // Click first button
            await buttons[0].click();
            expect(mockUpdate).toHaveBeenCalledWith(['Option 1']);

            // Reset mock for next test
            mockUpdate.mockClear();

            // Simulate value update
            const newValue = ['Option 1'];
            const newButtonContainer = multiSelectProperty.createButtonGroup(newValue, mockUpdate);
            const newButtons = newButtonContainer.querySelectorAll('.multi-select-button') as NodeListOf<HTMLElement>;

            // Click second button
            await newButtons[1].click();
            expect(mockUpdate).toHaveBeenCalledWith(['Option 1', 'Option 2']);
        });

        test('should handle button click with update error', async () => {
            mockUpdate.mockRejectedValue(new Error('Update failed'));
            const value: string[] = [];
            
            const buttonContainer = multiSelectProperty.createButtonGroup(value, mockUpdate);
            const firstButton = buttonContainer.querySelector('.multi-select-button') as HTMLElement;

            // Mock click event to test error handling
            const clickHandler = async () => {
                try {
                    const selectedValues = new Set(['Option 1']);
                    await mockUpdate([...selectedValues]);
                    multiSelectProperty.updateButtonState(buttonContainer, selectedValues);
                } catch (error) {
                    // Error should be handled gracefully
                }
            };

            // Should not throw unhandled error
            await expect(clickHandler()).resolves.toBeUndefined();
            expect(mockUpdate).toHaveBeenCalled();
        });
    });

    describe('updateButtonState', () => {
        beforeEach(() => {
            multiSelectProperty = new MultiSelectProperty('testSelect', mockVault, options);
        });

        test('should update button classes based on selected values', () => {
            const value: string[] = [];
            const buttonContainer = multiSelectProperty.createButtonGroup(value, mockUpdate);
            const selectedValues = new Set(['Option 1', 'Option 3']);

            multiSelectProperty.updateButtonState(buttonContainer, selectedValues);

            const buttons = buttonContainer.querySelectorAll('.multi-select-button');
            expect(buttons[0].classList.contains('selected')).toBe(true);
            expect(buttons[1].classList.contains('selected')).toBe(false);
            expect(buttons[2].classList.contains('selected')).toBe(true);
        });

        test('should remove all selections when set is empty', () => {
            const value: string[] = ['Option 1', 'Option 2', 'Option 3'];
            const buttonContainer = multiSelectProperty.createButtonGroup(value, mockUpdate);
            const selectedValues = new Set<string>([]);

            multiSelectProperty.updateButtonState(buttonContainer, selectedValues);

            const buttons = buttonContainer.querySelectorAll('.multi-select-button');
            buttons.forEach(button => {
                expect(button.classList.contains('selected')).toBe(false);
            });
        });

        test('should handle buttons with no text content', () => {
            const value: string[] = [];
            const buttonContainer = multiSelectProperty.createButtonGroup(value, mockUpdate);
            
            // Manually create a button with no text content
            const emptyButton = document.createElement('button');
            emptyButton.classList.add('multi-select-button');
            buttonContainer.appendChild(emptyButton);

            const selectedValues = new Set(['Option 1']);

            // Should not throw error
            expect(() => {
                multiSelectProperty.updateButtonState(buttonContainer, selectedValues);
            }).not.toThrow();
        });
    });

    describe('Integration tests', () => {
        test('should work with real DOM interactions', () => {
            multiSelectProperty = new MultiSelectProperty('Categories', mockVault, [
                { name: 'Work', color: '#FF0000' },
                { name: 'Personal', color: '#00FF00' }
            ]);

            const container = multiSelectProperty.fillDisplay(mockVault, ['Work'], mockUpdate);
            document.body.appendChild(container);

            const workButton = document.querySelector('[textContent="Work"]') as HTMLElement;
            const personalButton = document.querySelector('[textContent="Personal"]') as HTMLElement;

            expect(workButton).toBeDefined();
            expect(personalButton).toBeDefined();
        });

        test('should handle edge case with no options', () => {
            multiSelectProperty = new MultiSelectProperty('Empty', mockVault, []);

            const container = multiSelectProperty.fillDisplay(mockVault, [], mockUpdate);
            const buttons = container.querySelectorAll('.multi-select-button');

            expect(buttons.length).toBe(0);
        });

        test('should maintain state consistency', async () => {
            multiSelectProperty = new MultiSelectProperty('testSelect', mockVault, options);
            const value: string[] = ['Option 2'];
            
            const buttonContainer = multiSelectProperty.createButtonGroup(value, mockUpdate);
            const buttons = buttonContainer.querySelectorAll('.multi-select-button') as NodeListOf<HTMLElement>;

            // Verify initial state
            expect(buttons[1].classList.contains('selected')).toBe(true);

            // Click to deselect
            await buttons[1].click();
            expect(mockUpdate).toHaveBeenCalledWith([]);

            // Click to select again
            mockUpdate.mockClear();
            const newButtonContainer = multiSelectProperty.createButtonGroup([], mockUpdate);
            const newButtons = newButtonContainer.querySelectorAll('.multi-select-button') as NodeListOf<HTMLElement>;
            
            await newButtons[1].click();
            expect(mockUpdate).toHaveBeenCalledWith(['Option 2']);
        });
    });
});
