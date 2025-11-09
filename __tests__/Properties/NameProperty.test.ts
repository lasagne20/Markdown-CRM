/**
 * @jest-environment jsdom
 */

import { NameProperty } from '../../src/properties/NameProperty';

// Mock setIcon function to work synchronously in tests
jest.mock('../../src/vault/Utils', () => ({
    setIcon: jest.fn((element: HTMLElement, iconName: string) => {
        element.setAttribute('data-icon', iconName);
    }),
    sendNotice: jest.fn()
}));

describe('NameProperty', () => {
    let nameProperty: NameProperty;
    let mockVault: any;

    beforeEach(() => {
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
        
        nameProperty = new NameProperty(mockVault);
    });

    describe('constructor', () => {
        it('should create NameProperty with correct type and name', () => {
            expect(nameProperty.name).toBe('name');
            expect(nameProperty.type).toBe('name');
            expect(nameProperty.static).toBe(true);
        });

        it('should inherit from Property', () => {
            expect(nameProperty).toBeInstanceOf(nameProperty.constructor);
            expect(nameProperty.hasOwnProperty('name')).toBe(true);
            expect(nameProperty.hasOwnProperty('type')).toBe(true);
            expect(nameProperty.hasOwnProperty('static')).toBe(true);
        });
    });

    describe('read', () => {
        it('should call getLink on file object', () => {
            const mockFile = {
                getLink: jest.fn().mockReturnValue('Test Link')
            };
            
            const result = nameProperty.read(mockFile);
            
            expect(mockFile.getLink).toHaveBeenCalledTimes(1);
            expect(result).toBe('Test Link');
        });

        it('should throw error when file has no getLink method', () => {
            const mockFile = {};
            
            expect(() => nameProperty.read(mockFile)).toThrow();
        });

        it('should throw error with null file', () => {
            expect(() => nameProperty.read(null)).toThrow();
        });

        it('should throw error with undefined file', () => {
            expect(() => nameProperty.read(undefined)).toThrow();
        });

        it('should return result from getLink even if empty', () => {
            const mockFile = {
                getLink: jest.fn().mockReturnValue('')
            };
            
            const result = nameProperty.read(mockFile);
            
            expect(result).toBe('');
        });

        it('should return null if getLink returns null', () => {
            const mockFile = {
                getLink: jest.fn().mockReturnValue(null)
            };
            
            const result = nameProperty.read(mockFile);
            
            expect(result).toBeNull();
        });
    });

    describe('inherited methods', () => {
        it('should have validate method from parent class', () => {
            expect(typeof nameProperty.validate).toBe('function');
            expect(nameProperty.validate('test')).toBe('test');
        });

        it('should have getLink method from parent class', () => {
            expect(typeof nameProperty.getLink).toBe('function');
            expect(nameProperty.getLink('test')).toBe('test');
        });

        it('should have getPretty method from parent class', () => {
            expect(typeof nameProperty.getPretty).toBe('function');
            expect(nameProperty.getPretty('test')).toBe('test');
        });

        it('should have fillDisplay method from parent class', () => {
            expect(typeof nameProperty.fillDisplay).toBe('function');
        });
    });

    describe('static behavior', () => {
        it('should create static fields when using fillDisplay', () => {
            const mockVault = {};
            const mockUpdate = jest.fn();
            
            const display = nameProperty.fillDisplay('Test Name', mockUpdate);
            
            // Vérifier que l'élément créé contient les bonnes classes
            expect(display.tagName).toBe('DIV');
            expect(display.classList.contains('metadata-field')).toBe(true);
        });

        it('should not allow field modification when static', () => {
            const mockVault = {};
            const mockUpdate = jest.fn();
            
            const display = nameProperty.fillDisplay('Test Name', mockUpdate);
            const link = display.querySelector('.field-link') as HTMLElement;
            
            if (link) {
                expect(link.style.cursor).toBe('default');
            }
        });
    });
});
