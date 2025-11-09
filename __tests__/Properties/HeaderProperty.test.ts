/**
 * @jest-environment jsdom
 */

import { HearderProperty } from '../../src/properties/HeaderProperty';

describe('HearderProperty', () => {
    let headerProperty: HearderProperty;
    let mockVault: any;

    beforeEach(() => {
        // Reset DOM mocks
        document.body.innerHTML = '';
        jest.clearAllMocks();
        
        // Mock focus pour tous les éléments HTML
        HTMLElement.prototype.focus = jest.fn();
        
        // Setup mock vault
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

    describe('constructor', () => {
        it('should create HearderProperty with default values', () => {
            headerProperty = new HearderProperty('testHeader', mockVault);
            
            expect(headerProperty.name).toBe('testHeader');
            expect(headerProperty.type).toBe('header');
        });

        it('should create HearderProperty with custom args', () => {
            headerProperty = new HearderProperty('testHeader', mockVault, { icon: 'heading', staticProperty: true });
            
            expect(headerProperty.name).toBe('testHeader');
            expect(headerProperty.type).toBe('header');
            expect(headerProperty.icon).toBe('heading');
            expect(headerProperty.static).toBe(true);
        });
    });

    describe('fillDisplay', () => {
        beforeEach(() => {
            headerProperty = new HearderProperty('testHeader', mockVault);
        });

        it('should create container with correct structure', () => {
            const mockUpdate = jest.fn();
            const container = headerProperty.fillDisplay({}, 'Test Header', mockUpdate);
            
            expect(container.tagName).toBe('DIV');
            expect(container.classList.contains('metadata-headerfield')).toBe(true);
            
            const fieldContainer = container.querySelector('.field-container');
            expect(fieldContainer).toBeTruthy();
        });

        it('should apply custom size to header elements', () => {
            const mockUpdate = jest.fn();
            const container = headerProperty.fillDisplay({}, 'Test Header', mockUpdate, { size: '3em' });
            
            const link = container.querySelector('.field-headerlink') as HTMLElement;
            const input = container.querySelector('.field-header') as HTMLInputElement;
            
            expect(link?.style.fontSize).toBe('3em');
            expect(input?.style.fontSize).toBe('3em');
        });

        it('should use default size when no size specified', () => {
            const mockUpdate = jest.fn();
            const container = headerProperty.fillDisplay({}, 'Test Header', mockUpdate);
            
            const link = container.querySelector('.field-headerlink') as HTMLElement;
            const input = container.querySelector('.field-header') as HTMLInputElement;
            
            expect(link?.style.fontSize).toBe('2em');
            expect(input?.style.fontSize).toBe('2em');
        });
    });

    describe('createFieldInput', () => {
        beforeEach(() => {
            headerProperty = new HearderProperty('testHeader', mockVault);
        });

        it('should create input element with header class', () => {
            const input = headerProperty.createFieldInput('Test Value');
            
            expect(input.tagName).toBe('INPUT');
            expect(input.type).toBe('text');
            expect(input.value).toBe('Test Value');
            expect(input.classList.contains('field-header')).toBe(true);
        });

        it('should create input with empty value when no value provided', () => {
            const input = headerProperty.createFieldInput('');
            
            expect(input.value).toBe('');
        });

        it('should handle null/undefined value', () => {
            const input = headerProperty.createFieldInput(null as any);
            
            expect(input.value).toBe('');
        });
    });

    describe('createFieldContainer', () => {
        beforeEach(() => {
            headerProperty = new HearderProperty('testHeader', mockVault);
        });

        it('should create container with metadata-headerfield class', () => {
            const container = headerProperty.createFieldContainer();
            
            expect(container.tagName).toBe('DIV');
            expect(container.classList.contains('metadata-headerfield')).toBe(true);
        });
    });

    describe('createFieldLink', () => {
        beforeEach(() => {
            headerProperty = new HearderProperty('testHeader', mockVault);
        });

        it('should create h2 element with header link class', () => {
            const link = headerProperty.createFieldLink('Test Header');
            
            expect(link.tagName).toBe('H2');
            expect(link.innerHTML).toBe('Test Header');
            expect(link.classList.contains('field-headerlink')).toBe(true);
            expect(link.style.cursor).toBe('text');
        });

        it('should create link with empty content when no value', () => {
            const link = headerProperty.createFieldLink('');
            
            expect(link.innerHTML).toBe('');
        });

        it('should set cursor to default when static', () => {
            headerProperty.static = true;
            const link = headerProperty.createFieldLink('Test Header');
            
            expect(link.style.cursor).toBe('default');
        });

        it('should handle click event to trigger modifyField when not static', () => {
            const spy = jest.spyOn(headerProperty, 'modifyField');
            const link = headerProperty.createFieldLink('Test Header');
            
            link.click();
            
            expect(spy).toHaveBeenCalledWith(expect.objectContaining({
                type: 'click'
            }));
        });

        it('should not add click listener when static', () => {
            headerProperty.static = true;
            const spy = jest.spyOn(headerProperty, 'modifyField');
            const link = headerProperty.createFieldLink('Test Header');
            
            link.click();
            
            expect(spy).not.toHaveBeenCalled();
        });
    });

    describe('modifyField', () => {
        beforeEach(() => {
            headerProperty = new HearderProperty('testHeader', mockVault);
        });

        it('should switch from link to input on event', () => {
            // Créer la structure DOM attendue
            const container = document.createElement('div');
            container.classList.add('metadata-headerfield');
            
            const fieldContainer = document.createElement('div');
            fieldContainer.classList.add('field-container');
            
            const link = document.createElement('h2');
            link.classList.add('field-headerlink');
            link.textContent = 'Test Header';
            
            const input = document.createElement('input');
            input.classList.add('field-header');
            input.value = 'Test Header';
            
            fieldContainer.appendChild(link);
            fieldContainer.appendChild(input);
            container.appendChild(fieldContainer);
            document.body.appendChild(container);
            
            const focusSpy = jest.spyOn(input, 'focus');
            
            // État initial
            link.style.display = 'block';
            input.style.display = 'none';
            
            // Créer l'événement avec target = link
            const event = {
                target: link
            } as unknown as Event;
            
            headerProperty.modifyField(event);
            
            expect(link.style.display).toBe('none');
            expect(input.style.display).toBe('block');
            expect(focusSpy).toHaveBeenCalled();
        });

        it('should handle missing elements gracefully', () => {
            const event = {
                target: document.createElement('div')
            } as unknown as Event;
            
            // Ne devrait pas lever d'erreur
            expect(() => headerProperty.modifyField(event)).not.toThrow();
        });
    });

    describe('handleFieldInput', () => {
        beforeEach(() => {
            headerProperty = new HearderProperty('testHeader', mockVault);
        });

        it('should handle blur event', async () => {
            const mockUpdate = jest.fn().mockResolvedValue(undefined);
            const input = document.createElement('input');
            const link = document.createElement('h2');
            const spy = jest.spyOn(headerProperty, 'updateField').mockResolvedValue(undefined);
            
            headerProperty.handleFieldInput(mockUpdate, input, link);
            
            // Simuler l'événement blur
            const blurEvent = new Event('blur');
            input.dispatchEvent(blurEvent);
            
            // Attendre que les promesses se résolvent
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(spy).toHaveBeenCalledWith(mockUpdate, input, link);
        });

        it('should add keydown event handler', () => {
            const mockUpdate = jest.fn();
            const input = document.createElement('input');
            const link = document.createElement('h2');
            
            headerProperty.handleFieldInput(mockUpdate, input, link);
            
            expect(input.onkeydown).toBeDefined();
            expect(typeof input.onkeydown).toBe('function');
        });

        it('should add blur event handler', () => {
            const mockUpdate = jest.fn();
            const input = document.createElement('input');
            const link = document.createElement('h2');
            
            headerProperty.handleFieldInput(mockUpdate, input, link);
            
            expect(input.onblur).toBeDefined();
            expect(typeof input.onblur).toBe('function');
        });

        it('should not handle other key presses', async () => {
            const mockUpdate = jest.fn().mockResolvedValue(undefined);
            const input = document.createElement('input');
            const link = document.createElement('h2');
            const spy = jest.spyOn(headerProperty, 'updateField').mockResolvedValue(undefined);
            
            headerProperty.handleFieldInput(mockUpdate, input, link);
            
            // Simuler l'appui sur une autre touche
            const otherKeyEvent = new KeyboardEvent('keydown', { key: 'a' });
            input.dispatchEvent(otherKeyEvent);
            
            // Attendre que les promesses se résolvent
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(spy).not.toHaveBeenCalled();
        });
    });
});
