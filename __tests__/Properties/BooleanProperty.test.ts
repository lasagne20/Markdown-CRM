/**
 * @jest-environment jsdom
 */

import { BooleanProperty } from '../../src/properties/BooleanProperty';

// Mock vault utilities
jest.mock('../../src/vault/Utils', () => ({
    setIcon: jest.fn()
}));

// Import the mocked function for use in tests
const { setIcon } = jest.requireMock('../../src/vault/Utils');

describe('BooleanProperty', () => {
    let booleanProperty: BooleanProperty;
    let mockVault: any;
    let mockFile: any;

    // Helper function to trigger clicks in jsdom
    const triggerClick = (button: HTMLElement) => {
        const clickEvent = new MouseEvent('click', { bubbles: true });
        button.dispatchEvent(clickEvent);
    };

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';
        
        // Clear all mocks
        jest.clearAllMocks();
        
        // Ensure setIcon mock is working properly
        setIcon.mockImplementation((element: HTMLElement, iconName: string) => {
            element.setAttribute('data-icon', iconName);
            element.textContent = `[${iconName}]`;
        });
        
        // Mock vault
        mockVault = {
            app: {
                setIcon: jest.fn((element: HTMLElement, iconName: string) => {
                    element.setAttribute('data-icon', iconName);
                    element.textContent = `[${iconName}]`;
                }),
                vault: { getFiles: jest.fn(() => []) }
            }
        };

        // Mock file
        mockFile = {
            getMetadata: jest.fn(() => ({ isActive: true })),
            getMetadataValue: jest.fn((key: string) => key === 'isActive' ? true : undefined),
            updateMetadata: jest.fn(),
            vault: mockVault
        };

        booleanProperty = new BooleanProperty('isActive', mockVault);
        
        // Ensure clean state for each test
        booleanProperty.static = false;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create BooleanProperty with correct type', () => {
            const prop = new BooleanProperty('test', mockVault);
            
            expect(prop.name).toBe('test');
            expect(prop.type).toBe('boolean');
        });

        it('should accept additional arguments', () => {
            const args = { icon: 'check', staticProperty: true };
            const prop = new BooleanProperty('testBool', mockVault, args);
            
            expect(prop.name).toBe('testBool');
            expect(prop.static).toBe(true);
            expect(prop.icon).toBe('check');
        });

        it('should use default icon if not provided', () => {
            const prop = new BooleanProperty('testDefault', mockVault);
            
            expect(prop.icon).toBe('align-left'); // Default from base Property class
        });
    });

    describe('fillDisplay', () => {
        it('should create container with button element', () => {
            const updateFn = jest.fn();
            const container = booleanProperty.fillDisplay(true, updateFn);
            
            expect(container.tagName).toBe('DIV');
            
            const button = container.querySelector('span');
            expect(button).toBeTruthy();
            expect(button?.getAttribute('data-icon')).toBe('align-left');
        });

        it('should set vault reference', () => {
            const updateFn = jest.fn();
            booleanProperty.fillDisplay(true, updateFn);
            
            expect(booleanProperty.vault).toBe(mockVault);
        });

        it('should add active class when value is true', () => {
            const updateFn = jest.fn();
            const container = booleanProperty.fillDisplay(true, updateFn);
            
            const button = container.querySelector('span');
            expect(button?.classList.contains('boolean-property-button-active')).toBe(true);
        });

        it('should not add active class when value is false', () => {
            const updateFn = jest.fn();
            const container = booleanProperty.fillDisplay(false, updateFn);
            
            const button = container.querySelector('span');
            expect(button?.classList.contains('boolean-property-button-active')).toBe(false);
        });

        it('should not add active class when value is falsy', () => {
            const updateFn = jest.fn();
            
            // Test various falsy values
            const falsyValues = [false, null, undefined, 0, '', NaN];
            
            falsyValues.forEach(value => {
                const container = booleanProperty.fillDisplay(value, updateFn);
                const button = container.querySelector('span');
                expect(button?.classList.contains('boolean-property-button-active')).toBe(false);
            });
        });

        it('should add active class for truthy values', () => {
            const updateFn = jest.fn();
            
            // Test various truthy values
            const truthyValues = [true, 1, 'yes', {}, [], 42];
            
            truthyValues.forEach(value => {
                const container = booleanProperty.fillDisplay(value, updateFn);
                const button = container.querySelector('span');
                expect(button?.classList.contains('boolean-property-button-active')).toBe(true);
            });
        });
    });

    describe('click functionality for non-static property', () => {
        it('should toggle value on click when not static', async () => {
            booleanProperty.static = false;
            const updateFn = jest.fn();
            let currentValue = false;
            
            const container = booleanProperty.fillDisplay(currentValue, updateFn);
            const button = container.querySelector('span') as HTMLElement;
            
            // Initially false, should not have active class
            expect(button.classList.contains('boolean-property-button-active')).toBe(false);
            
            // Click to toggle
            button.click();
            
            // Wait for async update
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(updateFn).toHaveBeenCalledWith(true);
            expect(button.classList.contains('boolean-property-button-active')).toBe(true);
        });

        it('should toggle from true to false', async () => {
            booleanProperty.static = false;
            const updateFn = jest.fn();
            let currentValue = true;
            
            const container = booleanProperty.fillDisplay(currentValue, updateFn);
            const button = container.querySelector('span') as HTMLElement;
            
            // Initially true, should have active class
            expect(button.classList.contains('boolean-property-button-active')).toBe(true);
            
            // Click to toggle
            button.click();
            
            // Wait for async update
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(updateFn).toHaveBeenCalledWith(false);
            expect(button.classList.contains('boolean-property-button-active')).toBe(false);
        });

        it('should handle multiple clicks correctly', async () => {
            booleanProperty.static = false;
            const updateFn = jest.fn();
            let currentValue = false;
            
            const container = booleanProperty.fillDisplay(currentValue, updateFn);
            const button = container.querySelector('span') as HTMLElement;
            
            // Add to document for proper event handling
            document.body.appendChild(container);
            
            // First click: false -> true
            button.click();
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(updateFn).toHaveBeenNthCalledWith(1, true);
            
            // Second click: true -> false
            button.click();
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(updateFn).toHaveBeenNthCalledWith(2, false);
            
            // Third click: false -> true
            button.click();
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(updateFn).toHaveBeenNthCalledWith(3, true);
            
            expect(updateFn).toHaveBeenCalledTimes(3);
        });

        it('should update visual state immediately on click', async () => {
            booleanProperty.static = false;
            const updateFn = jest.fn();
            
            const container = booleanProperty.fillDisplay(false, updateFn);
            const button = container.querySelector('span') as HTMLElement;
            
            // Before click
            expect(button.classList.contains('boolean-property-button-active')).toBe(false);
            
            // Click should immediately update visual state
            button.click();
            
            // Visual state should update immediately, before async operation completes
            expect(button.classList.contains('boolean-property-button-active')).toBe(true);
            
            // Wait for async operation
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(updateFn).toHaveBeenCalledWith(true);
        });
    });

    describe('static property behavior', () => {
        it('should not add click listener when static', () => {
            booleanProperty.static = true;
            const updateFn = jest.fn();
            
            const container = booleanProperty.fillDisplay(false, updateFn);
            const button = container.querySelector('span') as HTMLElement;
            
            // Click should not trigger update
            button.click();
            
            expect(updateFn).not.toHaveBeenCalled();
        });

        it('should still show correct visual state when static', () => {
            booleanProperty.static = true;
            const updateFn = jest.fn();
            
            // Test true value
            const containerTrue = booleanProperty.fillDisplay(true, updateFn);
            const buttonTrue = containerTrue.querySelector('span');
            expect(buttonTrue?.classList.contains('boolean-property-button-active')).toBe(true);
            
            // Test false value
            const containerFalse = booleanProperty.fillDisplay(false, updateFn);
            const buttonFalse = containerFalse.querySelector('span');
            expect(buttonFalse?.classList.contains('boolean-property-button-active')).toBe(false);
        });
    });

    describe('icon functionality', () => {
        it('should set custom icon', () => {
            const customProperty = new BooleanProperty('custom', mockVault, { icon: 'check-circle' });
            const updateFn = jest.fn();
            
            const container = customProperty.fillDisplay(true, updateFn);
            const button = container.querySelector('span');
            
            expect(button?.getAttribute('data-icon')).toBe('check-circle');
        });

        it('should call setIcon with correct parameters', () => {
            const updateFn = jest.fn();
            
            // Clear previous calls
            mockVault.app.setIcon.mockClear();
            
            booleanProperty.fillDisplay(true, updateFn);
            
            expect(mockVault.app.setIcon).toHaveBeenCalled();
            const callArgs = mockVault.app.setIcon.mock.calls[0];
            expect(callArgs[0]).toHaveProperty('tagName'); // Should be an element-like object
            expect(callArgs[0]).toHaveProperty('classList'); // Should have DOM-like interface
            expect(callArgs[1]).toBe('align-left');
        });
    });

    describe('integration with base Property class', () => {
        it('should inherit from Property class', () => {
            expect(booleanProperty).toBeInstanceOf(BooleanProperty);
            expect(booleanProperty.name).toBe('isActive');
            expect(booleanProperty.type).toBe('boolean');
        });

        it('should have access to base class properties', () => {
            expect(typeof booleanProperty.read).toBe('function');
            expect(typeof booleanProperty.validate).toBe('function');
            expect(typeof booleanProperty.getPretty).toBe('function');
        });

    });

    describe('edge cases and error handling', () => {
        it('should handle null update function gracefully', () => {
            booleanProperty.static = false;
            
            // Should not throw error with null update function
            expect(() => {
                booleanProperty.fillDisplay(true, null as any);
            }).not.toThrow();
        });

        it('should handle undefined value', () => {
            const updateFn = jest.fn();
            const container = booleanProperty.fillDisplay(undefined, updateFn);
            const button = container.querySelector('span');
            
            expect(button?.classList.contains('boolean-property-button-active')).toBe(false);
        });

        it('should handle string boolean values', () => {
            const updateFn = jest.fn();
            
            // Test truthy strings
            const containerTruthy = booleanProperty.fillDisplay('true', updateFn);
            const buttonTruthy = containerTruthy.querySelector('span');
            expect(buttonTruthy?.classList.contains('boolean-property-button-active')).toBe(true);
            
            // Test empty string (falsy)
            const containerFalsy = booleanProperty.fillDisplay('', updateFn);
            const buttonFalsy = containerFalsy.querySelector('span');
            expect(buttonFalsy?.classList.contains('boolean-property-button-active')).toBe(false);
        });

        it('should handle rapid successive clicks', async () => {
            booleanProperty.static = false;
            const updateFn = jest.fn();
            
            const container = booleanProperty.fillDisplay(false, updateFn);
            const button = container.querySelector('span') as HTMLElement;
            
            // Rapid clicks
            button.click();
            button.click();
            button.click();
            
            // Wait for all async operations
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(updateFn).toHaveBeenCalledTimes(3);
            // Final state should be true (false -> true -> false -> true)
            expect(updateFn).toHaveBeenLastCalledWith(true);
        });
    });

    describe('CSS class management', () => {
        it('should properly add and remove active class', () => {
            booleanProperty.static = false;
            const updateFn = jest.fn();
            
            // Start with false
            const container = booleanProperty.fillDisplay(false, updateFn);
            const button = container.querySelector('span') as HTMLElement;
            
            // Should not have active class initially
            expect(button.classList.contains('boolean-property-button-active')).toBe(false);
            
            // Click to activate
            button.click();
            expect(button.classList.contains('boolean-property-button-active')).toBe(true);
            
            // Click to deactivate
            button.click();
            expect(button.classList.contains('boolean-property-button-active')).toBe(false);
        });

        it('should not interfere with other CSS classes', () => {
            booleanProperty.static = false;
            const updateFn = jest.fn();
            
            const container = booleanProperty.fillDisplay(true, updateFn);
            const button = container.querySelector('span') as HTMLElement;
            
            // Add some other classes
            button.classList.add('custom-class', 'another-class');
            
            // Verify active class is added correctly
            expect(button.classList.contains('boolean-property-button-active')).toBe(true);
            expect(button.classList.contains('custom-class')).toBe(true);
            expect(button.classList.contains('another-class')).toBe(true);
            
            // Toggle and verify other classes remain
            if (!booleanProperty.static) {
                button.click();
                expect(button.classList.contains('custom-class')).toBe(true);
                expect(button.classList.contains('another-class')).toBe(true);
            }
        });
    });
});
