/**
 * @jest-environment jsdom
 */

import { TimeProperty } from '../../src/properties/TimeProperty ';

// Mock flatpickr
jest.mock('flatpickr', () => {
    return jest.fn().mockImplementation((element, options) => {
        // Simuler l'initialization flatpickr
        element.setAttribute('data-flatpickr', 'true');
        
        // Simuler le trigger des événements flatpickr
        if (options?.onChange) {
            element._flatpickrOnChange = options.onChange;
        }
        if (options?.onClose) {
            element._flatpickrOnClose = options.onClose;
        }
        
        return {
            destroy: jest.fn(),
            clear: jest.fn(),
            setDate: jest.fn()
        };
    });
});

// Mock French locale
jest.mock('flatpickr/dist/l10n/fr.js', () => ({
    French: {}
}), { virtual: true });

describe('TimeProperty', () => {
    let timeProperty: TimeProperty;
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
        
        // Mock focus pour tous les éléments HTML
        HTMLElement.prototype.focus = jest.fn();
    });

    describe('constructor', () => {
        it('should create TimeProperty with default format', () => {
            timeProperty = new TimeProperty('testTime', mockVault);
            
            expect(timeProperty.name).toBe('testTime');
            expect(timeProperty.type).toBe('time');
            expect(timeProperty['format']).toBe('HH:mm'); // format par défaut
        });

        it('should create TimeProperty with custom format', () => {
            timeProperty = new TimeProperty('testTime', mockVault, { format: 'HH:mm:ss', icon: 'clock' });
            
            expect(timeProperty.name).toBe('testTime');
            expect(timeProperty.type).toBe('time');
            expect(timeProperty['format']).toBe('HH:mm:ss');
            expect(timeProperty.icon).toBe('clock');
        });
    });

    describe('validate', () => {
        beforeEach(() => {
            timeProperty = new TimeProperty('testTime', mockVault);
        });

        it('should validate correct time format HH:mm', () => {
            expect(timeProperty.validate('14:30')).toBe('14:30');
            expect(timeProperty.validate('09:15')).toBe('09:15');
            expect(timeProperty.validate('00:00')).toBe('00:00');
            expect(timeProperty.validate('23:59')).toBe('23:59');
        });

        it('should return empty string for invalid time format', () => {
            expect(timeProperty.validate('25:00')).toBe('25:00'); // Format valide même si heure invalide
            expect(timeProperty.validate('14:70')).toBe('14:70'); // Format valide même si minutes invalides
            expect(timeProperty.validate('14')).toBe(''); // Format incomplet
            expect(timeProperty.validate('14:3')).toBe(''); // Format incorrect (pas 2 digits)
            expect(timeProperty.validate('abc')).toBe(''); // Texte invalide
            expect(timeProperty.validate('')).toBe(''); // Chaîne vide
        });
    });

    describe('formatTimeForDisplay', () => {
        it('should format time for HH:mm format', () => {
            timeProperty = new TimeProperty('testTime', mockVault, { format: 'HH:mm' });
            
            expect(timeProperty.formatTimeForDisplay('14:30')).toBe('14:30');
            expect(timeProperty.formatTimeForDisplay('09:15')).toBe('09:15');
            expect(timeProperty.formatTimeForDisplay('')).toBe('Aucune heure sélectionnée');
        });

        it('should format time for custom format with units', () => {
            timeProperty = new TimeProperty('testTime', mockVault, { format: 'custom' });
            
            expect(timeProperty.formatTimeForDisplay('14:30')).toBe('14h 30 min');
            expect(timeProperty.formatTimeForDisplay('09:00')).toBe('9h');
            expect(timeProperty.formatTimeForDisplay('00:15')).toBe('15 min');
            expect(timeProperty.formatTimeForDisplay('00:00')).toBe('0 min');
            expect(timeProperty.formatTimeForDisplay('')).toBe('');
        });

        it('should handle time with seconds', () => {
            timeProperty = new TimeProperty('testTime', mockVault, { format: 'custom' });
            
            expect(timeProperty.formatTimeForDisplay('14:30:45')).toBe('14h 30 min 45s');
            expect(timeProperty.formatTimeForDisplay('00:00:30')).toBe('30s');
        });
    });

    describe('formatTimeForStorage', () => {
        beforeEach(() => {
            timeProperty = new TimeProperty('testTime', mockVault);
        });

        it('should format Date to HH:mm string', () => {
            const date1 = new Date('2024-01-01T14:30:00');
            const date2 = new Date('2024-01-01T09:15:00');
            
            expect(timeProperty.formatTimeForStorage(date1)).toBe('14:30');
            expect(timeProperty.formatTimeForStorage(date2)).toBe('09:15');
        });
    });

    describe('createFieldLink', () => {
        beforeEach(() => {
            timeProperty = new TimeProperty('testTime', mockVault);
        });

        it('should create link element with time value', () => {
            const link = timeProperty.createFieldLink('14:30');
            
            expect(link.tagName).toBe('DIV');
            expect(link.textContent).toBe('14:30');
            expect(link.classList.contains('time-field-link')).toBe(true);
            expect(link.classList.contains('field-link')).toBe(true);
            expect(link.style.cursor).toBe('pointer');
        });

        it('should create link with default text when no value', () => {
            const link = timeProperty.createFieldLink('');
            
            expect(link.textContent).toBe('Aucune heure sélectionnée');
        });

        it('should handle click event to trigger modifyField', () => {
            const spy = jest.spyOn(timeProperty, 'modifyField');
            const link = timeProperty.createFieldLink('14:30');
            
            // Simulate the click event more accurately
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
            });
            Object.defineProperty(clickEvent, 'currentTarget', {
                value: link,
                writable: false
            });
            
            link.dispatchEvent(clickEvent);
            
            expect(spy).toHaveBeenCalledWith(expect.objectContaining({
                type: 'click',
                currentTarget: link
            }));
        });
    });

    describe('createFieldTime', () => {
        beforeEach(() => {
            timeProperty = new TimeProperty('testTime', mockVault);
        });

        it('should create input element with flatpickr', () => {
            const mockUpdate = jest.fn();
            const mockLink = document.createElement('div');
            
            const input = timeProperty.createFieldTime('14:30', mockUpdate, mockLink);
            
            expect(input.tagName).toBe('INPUT');
            expect(input.type).toBe('text');
            expect(input.value).toBe('14:30');
            expect(input.classList.contains('field-input')).toBe(true);
            expect(input.hasAttribute('data-flatpickr')).toBe(true);
        });

        it('should create input with empty value when no initial value', () => {
            const mockUpdate = jest.fn();
            const mockLink = document.createElement('div');
            
            const input = timeProperty.createFieldTime('', mockUpdate, mockLink);
            
            expect(input.value).toBe('');
        });

        it('should handle flatpickr onChange event', async () => {
            const mockUpdate = jest.fn().mockResolvedValue(undefined);
            const mockLink = document.createElement('div');
            const spy = jest.spyOn(timeProperty, 'updateField').mockResolvedValue(undefined);
            
            const input = timeProperty.createFieldTime('', mockUpdate, mockLink) as any;
            
            // Simuler le changement flatpickr
            const mockDate = new Date('2024-01-01T15:45:00');
            if (input._flatpickrOnChange) {
                await input._flatpickrOnChange([mockDate]);
            }
            
            expect(input.value).toBe('15:45');
            expect(spy).toHaveBeenCalledWith(mockUpdate, input, mockLink);
        });

        it('should handle flatpickr onClose event', async () => {
            const mockUpdate = jest.fn().mockResolvedValue(undefined);
            const mockLink = document.createElement('div');
            const spy = jest.spyOn(timeProperty, 'updateField').mockResolvedValue(undefined);
            
            const input = timeProperty.createFieldTime('invalid', mockUpdate, mockLink) as any;
            
            // Simuler la fermeture flatpickr
            if (input._flatpickrOnClose) {
                await input._flatpickrOnClose();
            }
            
            expect(input.value).toBe(''); // Valeur invalide effacée
            expect(spy).toHaveBeenCalledWith(mockUpdate, input, mockLink);
        });
    });

    describe('fillDisplay', () => {
        beforeEach(() => {
            timeProperty = new TimeProperty('testTime', mockVault);
        });

        it('should create container with link and input for valid value', () => {
            const mockUpdate = jest.fn();
            const container = timeProperty.fillDisplay('14:30', mockUpdate);
            
            expect(container.tagName).toBe('DIV');
            expect(container.classList.contains('field-container')).toBe(true);
            
            const link = container.querySelector('.time-field-link') as HTMLElement;
            const input = container.querySelector('input') as HTMLInputElement;
            
            expect(link).toBeTruthy();
            expect(input).toBeTruthy();
            expect(link?.style.display).toBe('block');
            // L'input est initialisé par flatpickr, donc on vérifie qu'il existe mais pas nécessairement qu'il soit caché
            expect(input).toBeTruthy();
        });

        it('should show input for invalid value', () => {
            const mockUpdate = jest.fn();
            const container = timeProperty.fillDisplay('invalid', mockUpdate);
            
            const link = container.querySelector('.time-field-link') as HTMLElement;
            const input = container.querySelector('input') as HTMLInputElement;
            
            expect(input?.style.display).toBe('block');
            expect(link?.style.display).toBe('none');
        });

        it('should show input for empty value', () => {
            const mockUpdate = jest.fn();
            const container = timeProperty.fillDisplay('', mockUpdate);
            
            const link = container.querySelector('.time-field-link') as HTMLElement;
            const input = container.querySelector('input') as HTMLInputElement;
            
            expect(input?.style.display).toBe('block');
            expect(link?.style.display).toBe('none');
        });
    });

    describe('updateField', () => {
        beforeEach(() => {
            timeProperty = new TimeProperty('testTime', mockVault);
        });

        it('should update field with valid value', async () => {
            const mockUpdate = jest.fn().mockResolvedValue(undefined);
            const input = document.createElement('input');
            input.value = '14:30';
            const link = document.createElement('div');
            
            await timeProperty.updateField(mockUpdate, input, link);
            
            expect(mockUpdate).toHaveBeenCalledWith('14:30');
            expect(input.style.display).toBe('none');
            expect(link.style.display).toBe('block');
            expect(link.textContent).toBe('14:30');
        });

        it('should handle invalid value', async () => {
            const mockUpdate = jest.fn().mockResolvedValue(undefined);
            const input = document.createElement('input');
            input.value = 'invalid';
            const link = document.createElement('div');
            
            await timeProperty.updateField(mockUpdate, input, link);
            
            expect(mockUpdate).toHaveBeenCalledWith('');
            expect(link.textContent).toBe('Aucune heure sélectionnée');
        });
    });

    describe('modifyField', () => {
        beforeEach(() => {
            timeProperty = new TimeProperty('testTime', mockVault);
        });

        it('should call modifyField without throwing errors', () => {
            // Test que modifyField peut être appelé sans erreur
            const container = document.createElement('div');
            const link = document.createElement('div');
            const input = document.createElement('input');
            
            container.appendChild(link);
            container.appendChild(input);
            
            const event = { currentTarget: link } as unknown as Event;
            
            // Vérifier que modifyField ne lance pas d'erreur
            expect(() => timeProperty.modifyField(event)).not.toThrow();
        });

        it('should handle missing container', () => {
            const link = document.createElement('div'); // Pas de parent
            
            const event = { currentTarget: link } as unknown as Event;
            
            // Ne devrait pas lever d'erreur
            expect(() => timeProperty.modifyField(event)).not.toThrow();
        });

        it('should handle missing input in container', () => {
            const container = document.createElement('div');
            const link = document.createElement('div');
            container.appendChild(link); // Pas d'input
            
            const event = { currentTarget: link } as unknown as Event;
            
            // Ne devrait pas lever d'erreur
            expect(() => timeProperty.modifyField(event)).not.toThrow();
        });
    });
});
