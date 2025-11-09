/**
 * @jest-environment jsdom
 */

import { DateProperty } from '../../src/properties/DateProperty';

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

// Mock Property base class
jest.mock('../../src/properties/Property', () => {
    return {
        Property: class MockProperty {
            name: string;
            type: string;
            title: string = '';
            static: boolean = false;
            icon: string = '';
            default: any;
            vault: any;

            constructor(name: string, vault: any, ...args: any[]) {
                this.name = name;
                this.vault = vault;
                this.type = 'property';
                
                if (args.length > 0 && typeof args[args.length - 1] === 'object') {
                    Object.assign(this, args[args.length - 1]);
                }
            }

            read = jest.fn(() => '');
            validate = jest.fn((value: string) => value);
            getPretty = jest.fn(() => '');
            getDisplay = jest.fn(() => document.createElement('div'));
            fillDisplay = jest.fn(() => {
                const div = document.createElement('div');
                div.classList.add('field-container-column');
                const field = document.createElement('div');
                field.classList.add('metadata-field');
                div.appendChild(field);
                return div;
            });
        }
    };
});

describe('DateProperty', () => {
    let dateProperty: DateProperty;
    let mockVault: any;
    let mockFile: any;

    beforeEach(() => {
        jest.clearAllMocks();
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

        mockFile = {
            getMetadata: jest.fn(() => ({ eventDate: '2024-03-15' })),
            getMetadataValue: jest.fn((key: string) => key === 'eventDate' ? '2024-03-15' : undefined),
            updateMetadata: jest.fn(),
            vault: mockVault
        };

        dateProperty = new DateProperty('eventDate', mockVault, ['today', 'tomorrow', 'next-week']);
        
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2024-03-15T10:00:00Z'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('constructor', () => {
        it('should create DateProperty with correct properties', () => {
            const quickIcons = ['today', 'tomorrow'];
            const prop = new DateProperty('testDate', mockVault, quickIcons);
            
            expect(prop.name).toBe('testDate');
            expect(prop.type).toBe('date');
            expect((prop as any).quickSelectIcons).toEqual(quickIcons);
        });
    });

    describe('formatDateForStorage', () => {
        it('should format date in YYYY-MM-DD format', () => {
            const testDate = new Date('2024-03-15T10:30:00Z');
            const result = dateProperty.formatDateForStorage(testDate);
            expect(result).toBe('2024-03-15');
        });
    });

    describe('formatDateForDisplay', () => {
        it('should format valid date strings', () => {
            const result = dateProperty.formatDateForDisplay('2024-03-15');
            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');
        });

        it('should handle invalid dates', () => {
            const result = dateProperty.formatDateForDisplay('invalid-date');
            expect(result).toBe('Invalid Date');
        });
    });

    describe('getDateForOption', () => {
        it('should return correct dates for standard options', () => {
            const today = dateProperty.getDateForOption('today');
            expect(today.getDate()).toBe(15);
            
            const tomorrow = dateProperty.getDateForOption('tomorrow');
            expect(tomorrow.getDate()).toBe(16);
        });
    });

    describe('createFieldLink', () => {
        it('should create a clickable link element', () => {
            const link = dateProperty.createFieldLink('2024-03-15');
            
            expect(link.tagName).toBe('DIV');
            expect(link.classList.contains('field-link')).toBe(true);
            expect(link.style.cursor).toBe('pointer');
        });

        it('should show placeholder for empty values', () => {
            const link = dateProperty.createFieldLink('');
            expect(link.textContent).toBe('Aucune date sélectionnée');
        });
    });

    describe('createFieldDate', () => {
        it('should create input with flatpickr initialization', () => {
            const updateFn = jest.fn();
            const link = document.createElement('div');
            
            const input = dateProperty.createFieldDate('2024-03-15', updateFn, link);
            
            expect(input.tagName).toBe('INPUT');
            expect(input.value).toBe('2024-03-15');
            expect(input.classList.contains('field-input')).toBe(true);
        });
    });

    describe('createQuickSelect', () => {
        it('should create buttons for quick select options', () => {
            const updateFn = jest.fn();
            const link = document.createElement('div');
            const input = document.createElement('input') as HTMLInputElement;
            

            const container = dateProperty.createQuickSelect('', updateFn, link, input);
            
            expect(container.tagName).toBe('DIV');
            expect(container.classList.contains('quick-select-container')).toBe(true);
            
            const buttons = container.querySelectorAll('button');
            expect(buttons.length).toBe(3);
        });
    });

    describe('updateField', () => {
        it('should update field with valid input', async () => {
            const updateFn = jest.fn().mockResolvedValue(undefined);
            const input = document.createElement('input') as HTMLInputElement;
            const link = document.createElement('div');
            
            input.value = '2024-03-20';
            dateProperty.validate = jest.fn(() => '2024-03-20');
            
            await dateProperty.updateField(updateFn, input, link);
            
            expect(updateFn).toHaveBeenCalledWith('2024-03-20');
        });
    });

    describe('fillDisplay', () => {
        it('should create display structure', () => {
            const updateFn = jest.fn();
            const result = dateProperty.fillDisplay(mockVault, '2024-03-15', updateFn);
            
            expect(result).toBeTruthy();
            expect(result.classList.contains('field-container-column')).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('should handle null values gracefully', () => {
            expect(() => {
                dateProperty.createFieldLink(null as any);
                dateProperty.formatDateForDisplay('');
            }).not.toThrow();
        });

        it('should handle empty quick select icons', () => {
            const prop = new DateProperty('test', mockVault, []);
            const updateFn = jest.fn();
            const link = document.createElement('div');
            const input = document.createElement('input') as HTMLInputElement;
            
            const container = prop.createQuickSelect('', updateFn, link, input);
            const buttons = container.querySelectorAll('button');
            
            expect(buttons.length).toBe(0);
        });
    });
});
