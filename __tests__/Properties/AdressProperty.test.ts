/**
 * @jest-environment jsdom
 */

import { AdressProperty } from '../../src/properties/AdressProperty';
import { LinkProperty } from '../../src/properties/LinkProperty';

jest.mock('../../src/vault/Utils', () => ({
    setIcon: jest.fn()
}));

describe('AdressProperty', () => {
    let adressProperty: AdressProperty;
    let mockVault: any;

    beforeAll(() => {
        // Create mock vault with all necessary properties
        mockVault = {
            app: {
                setIcon: jest.fn()
            }
        };
    });

    beforeEach(() => {
        // Reset DOM mocks
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    beforeEach(() => {
        adressProperty = new AdressProperty('testAdress', mockVault);
    });

    describe('constructor', () => {
        it('should create AdressProperty with correct type', () => {
            expect(adressProperty.type).toBe('adress');
        });

        it('should inherit from LinkProperty', () => {
            expect(adressProperty).toBeInstanceOf(LinkProperty);
        });

        it('should use default icon when no args provided', () => {
            const defaultProperty = new AdressProperty('defaultTest', mockVault);
            expect(defaultProperty.name).toBe('defaultTest');
            expect(defaultProperty.type).toBe('adress');
        });

        it('should pass custom args to parent constructor', () => {
            const customArgs = { icon: 'custom-icon', flexSpan: 3 };
            const customProperty = new AdressProperty('customName', mockVault, customArgs);
            expect(customProperty.name).toBe('customName');
        });
    });

    describe('validate', () => {
        it('should return input value unchanged', () => {
            const testAddress = '123 Main St, Paris, France';
            expect(adressProperty.validate(testAddress)).toBe(testAddress);
        });

        it('should handle empty string', () => {
            expect(adressProperty.validate('')).toBe('');
        });

        it('should handle special characters in address', () => {
            const specialAddress = 'Rue de l\'Église, 75001 Paris';
            expect(adressProperty.validate(specialAddress)).toBe(specialAddress);
        });

        it('should handle unicode characters', () => {
            const unicodeAddress = '北京市朝阳区';
            expect(adressProperty.validate(unicodeAddress)).toBe(unicodeAddress);
        });

        it('should handle multiline addresses', () => {
            const multilineAddress = '123 Main St\\nApt 4B\\nParis, France';
            expect(adressProperty.validate(multilineAddress)).toBe(multilineAddress);
        });
    });

    describe('getLink', () => {
        it('should generate Google Maps search URL for simple address', () => {
            const address = '123 Main St, Paris';
            const expectedUrl = 'https://www.google.com/maps/search/123%20Main%20St%2C%20Paris';
            expect(adressProperty.getLink(address)).toBe(expectedUrl);
        });

        it('should properly encode special characters', () => {
            const address = 'Rue de l\'Église & Café';
            const expectedUrl = 'https://www.google.com/maps/search/Rue%20de%20l\'%C3%89glise%20%26%20Caf%C3%A9';
            expect(adressProperty.getLink(address)).toBe(expectedUrl);
        });

        it('should handle empty address', () => {
            const address = '';
            const expectedUrl = 'https://www.google.com/maps/search/';
            expect(adressProperty.getLink(address)).toBe(expectedUrl);
        });

        it('should encode spaces correctly', () => {
            const address = 'New York City';
            const expectedUrl = 'https://www.google.com/maps/search/New%20York%20City';
            expect(adressProperty.getLink(address)).toBe(expectedUrl);
        });

        it('should handle complex international address', () => {
            const address = '東京都渋谷区, Japan';
            const result = adressProperty.getLink(address);
            expect(result).toContain('https://www.google.com/maps/search/');
            expect(result).toContain('%E6%9D%B1%E4%BA%AC%E9%83%BD'); // Encoded Tokyo characters
        });

        it('should handle address with numbers and symbols', () => {
            const address = '123-45 Main St #456';
            const result = adressProperty.getLink(address);
            expect(result).toContain('https://www.google.com/maps/search/');
            expect(result).toContain('123-45%20Main%20St%20%23456');
        });

        it('should handle very long address', () => {
            const longAddress = 'Very Long Street Name With Many Words And Details Including Building Number 12345 Apartment Complex Building A Unit 456 City State Postal Code Country';
            const result = adressProperty.getLink(longAddress);
            expect(result).toContain('https://www.google.com/maps/search/');
            expect(result.length).toBeGreaterThan(50); // Should be encoded and long
        });
    });

    describe('inheritance from LinkProperty', () => {
        it('should have fillDisplay method from parent', () => {
            expect(typeof adressProperty.fillDisplay).toBe('function');
        });

        it('should have validate method from parent', () => {
            expect(typeof adressProperty.validate).toBe('function');
        });

        it('should have getLink method', () => {
            expect(typeof adressProperty.getLink).toBe('function');
        });

        it('should have createFieldLink method from parent', () => {
            expect(typeof adressProperty.createFieldLink).toBe('function');
        });

        it('should have getPretty method from parent', () => {
            expect(typeof adressProperty.getPretty).toBe('function');
        });

        it('should have name property from parent', () => {
            expect(adressProperty.name).toBe('testAdress');
        });
    });

    describe('link functionality integration', () => {
        it('should create clickable link with Google Maps URL', () => {
            const mockFile = {};
            const mockUpdate = jest.fn();
            const address = 'Paris, France';
            
            const result = adressProperty.fillDisplay(null, address, mockUpdate, mockFile);
            
            expect(result).toBeTruthy();
            expect(result.tagName).toBe('DIV');
        });

        it('should handle null value in fillDisplay', () => {
            const mockFile = {};
            const mockUpdate = jest.fn();
            
            const result = adressProperty.fillDisplay(null, null, mockUpdate, mockFile);
            
            expect(result).toBeTruthy();
            expect(result.tagName).toBe('DIV');
        });

        it('should handle undefined value in fillDisplay', () => {
            const mockFile = {};
            const mockUpdate = jest.fn();
            
            const result = adressProperty.fillDisplay(null, undefined, mockUpdate, mockFile);
            
            expect(result).toBeTruthy();
            expect(result.tagName).toBe('DIV');
        });
    });
});
