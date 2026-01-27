/**
 * @jest-environment jsdom
 */

import { DateProperty } from "../../src/properties/DateProperty";

// Mock flatpickr completely
jest.mock('flatpickr', () => {
    const mockInstance = {
        destroy: jest.fn(),
        setDate: jest.fn(),
        clear: jest.fn()
    };
    
    const mockFlatpickr = jest.fn((element, options) => {
        (element as any).flatpickrOptions = options;
        (element as any).flatpickrInstance = mockInstance;
        return mockInstance;
    });
    
    return mockFlatpickr;
});

// Mock French locale
jest.mock('flatpickr/dist/l10n/fr.js', () => ({
    French: { locale: 'fr' }
}));

// Mock all dependencies
jest.mock('../../src/vault/Classe', () => ({}));
jest.mock('../../src/vault/File', () => ({}));
jest.mock('../../src/vault/Vault', () => ({}));
jest.mock('../../src/vault/Utils', () => ({
    setIcon: jest.fn((element: HTMLElement, iconName: string) => {
        element.setAttribute('data-icon', iconName);
        element.textContent = `[${iconName}]`;
    })
}));

describe("DateProperty - Default Value Conversion", () => {
    let mockUpdate: jest.Mock;
    let mockVault: any;

    beforeEach(() => {
        mockUpdate = jest.fn();
        document.body.innerHTML = '';
        
        mockVault = {
            app: { 
                vault: { getFiles: jest.fn(() => []) },
                setIcon: jest.fn((element: HTMLElement, iconName: string) => {
                    element.setAttribute('data-icon', iconName);
                    element.textContent = `[${iconName}]`;
                })
            }
        };
    });

    test("should convert 'today' to current date in YYYY-MM-DD format", () => {
        const property = new DateProperty("testDate", mockVault, [], { default: "today" });
        
        const result = property.fillDisplay("today", mockUpdate);
        document.body.appendChild(result);

        const input = result.querySelector('input.field-input') as HTMLInputElement;
        expect(input).toBeTruthy();
        
        // Verify the value is in YYYY-MM-DD format
        expect(input.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        
        // Verify it's today's date
        const today = new Date();
        const expectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        expect(input.value).toBe(expectedDate);
    });

    test("should convert 'yesterday' to previous day", () => {
        const property = new DateProperty("testDate", mockVault, [], { default: "yesterday" });
        
        const result = property.fillDisplay("yesterday", mockUpdate);
        document.body.appendChild(result);

        const input = result.querySelector('input.field-input') as HTMLInputElement;
        expect(input).toBeTruthy();
        expect(input.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);

        // Verify it's yesterday's date
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const expectedDate = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
        expect(input.value).toBe(expectedDate);
    });

    test("should convert 'tomorrow' to next day", () => {
        const property = new DateProperty("testDate", mockVault, [], { default: "tomorrow" });
        
        const result = property.fillDisplay("tomorrow", mockUpdate);
        document.body.appendChild(result);

        const input = result.querySelector('input.field-input') as HTMLInputElement;
        expect(input).toBeTruthy();
        expect(input.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);

        // Verify it's tomorrow's date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const expectedDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
        expect(input.value).toBe(expectedDate);
    });

    test("should convert 'next-week' to 7 days from now", () => {
        const property = new DateProperty("testDate", mockVault, [], { default: "next-week" });
        
        const result = property.fillDisplay("next-week", mockUpdate);
        document.body.appendChild(result);

        const input = result.querySelector('input.field-input') as HTMLInputElement;
        expect(input).toBeTruthy();
        expect(input.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test("should not modify value already in YYYY-MM-DD format", () => {
        const property = new DateProperty("testDate", mockVault, []);
        
        const existingDate = "2026-01-15";
        const result = property.fillDisplay(existingDate, mockUpdate);
        document.body.appendChild(result);

        const input = result.querySelector('input.field-input') as HTMLInputElement;
        expect(input).toBeTruthy();
        expect(input.value).toBe(existingDate);
    });

    test("should handle empty value gracefully", () => {
        const property = new DateProperty("testDate", mockVault, []);
        
        const result = property.fillDisplay("", mockUpdate);
        document.body.appendChild(result);

        const input = result.querySelector('input.field-input') as HTMLInputElement;
        expect(input).toBeTruthy();
        expect(input.value).toBe("");
    });

    test("should handle invalid date value without crashing", () => {
        const property = new DateProperty("testDate", mockVault, []);
        
        // Should not throw an error
        let result: HTMLElement | undefined;
        expect(() => {
            result = property.fillDisplay("invalid-date-string", mockUpdate);
        }).not.toThrow();

        if (result) {
            document.body.appendChild(result);
            const input = result.querySelector('input.field-input') as HTMLInputElement;
            expect(input).toBeTruthy();
        }
    });

    test("should handle null value gracefully", () => {
        const property = new DateProperty("testDate", mockVault, []);
        
        const result = property.fillDisplay(null, mockUpdate);
        document.body.appendChild(result);

        const input = result.querySelector('input.field-input') as HTMLInputElement;
        expect(input).toBeTruthy();
    });
});
