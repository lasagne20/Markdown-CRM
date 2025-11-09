/**
 * @jest-environment jsdom
 */

import { Property } from '../../src/properties/Property';

// Mock setIcon function to work synchronously in tests
jest.mock('../../src/vault/Utils', () => ({
    setIcon: jest.fn((element: HTMLElement, iconName: string) => {
        element.setAttribute('data-icon', iconName);
    }),
    waitForFileMetaDataUpdate: jest.fn(() => Promise.resolve()),
    waitForMetaDataCacheUpdate: jest.fn(() => Promise.resolve())
}));

describe('Property', () => {
    let property: Property;
    let mockVault: any;
    let mockFile: any;

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';
        
        // Mock vault
        mockVault = {
            app: {
                setIcon: jest.fn((element: HTMLElement, iconName: string) => {
                    element.setAttribute('data-icon', iconName);
                })
            },
            getPersonalName: jest.fn(() => 'Test User')
        };

        // Mock file with metadata
        mockFile = {
            getMetadata: jest.fn(() => ({ testProp: 'test value' })),
            getMetadataValue: jest.fn((key: string) => key === 'testProp' ? 'test value' : undefined),
            updateMetadata: jest.fn(),
            vault: mockVault
        };

        property = new Property('testProp', mockVault);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create property with default values', () => {
            const prop = new Property('test', mockVault);
            
            expect(prop.name).toBe('test');
            expect(prop.icon).toBe('align-left');
            expect(prop.static).toBe(false);
            expect(prop.flexSpan).toBe(1);
            expect(prop.default).toBe('');
            expect(prop.type).toBe('text');
        });

        it('should create property with custom options', () => {
            const options = {
                icon: 'star',
                staticProperty: true,
                flexSpan: 2,
                defaultValue: 'default test',
                customOption: 'custom'
            };
            
            const prop = new Property('custom', mockVault, options);
            
            expect(prop.name).toBe('custom');
            expect(prop.icon).toBe('star');
            expect(prop.static).toBe(true);
            expect(prop.flexSpan).toBe(2);
            expect(prop.default).toBe('default test');
            expect((prop as any).customOption).toBe('custom');
        });
    });

    describe('getDefaultValue', () => {
        it('should return personal name when default is "personalName"', () => {
            property.default = 'personalName';
            
            const result = property.getDefaultValue();
            
            expect(result).toBe('Test User');
            expect(mockVault.getPersonalName).toHaveBeenCalled();
        });

        it('should return default value when not "personalName"', () => {
            property.default = 'static value';
            
            const result = property.getDefaultValue();
            
            expect(result).toBe('static value');
        });
    });

    describe('read', () => {
        it('should read from file with readProperty method', async () => {
            const fileWithReadProperty = {
                ...mockFile,
                readProperty: true,
                getMetadataValue: jest.fn().mockResolvedValue('property value')
            };
            
            const result = await property.read(fileWithReadProperty);
            
            expect(result).toBe('property value');
            expect(fileWithReadProperty.getMetadataValue).toHaveBeenCalledWith('testProp');
        });

        it('should read from file metadata', async () => {
            const result = await property.read(mockFile);
            
            expect(result).toBe('test value');
            expect(mockFile.getMetadataValue).toHaveBeenCalledWith('testProp');
        });

        it('should handle file without metadata', async () => {
            const fileWithoutMetadata = {
                ...mockFile,
                getMetadata: jest.fn(() => null),
                getMetadataValue: jest.fn().mockResolvedValue(undefined)
            };
            
            const result = await property.read(fileWithoutMetadata);
            
            expect(result).toBeUndefined();
        });
    });

    describe('validate', () => {
        it('should return the same value by default', () => {
            const result = property.validate('test input');
            
            expect(result).toBe('test input');
        });
    });

    describe('getLink', () => {
        it('should return the same value by default', () => {
            const result = property.getLink('test link');
            
            expect(result).toBe('test link');
        });
    });

    describe('getPretty', () => {
        it('should return the same value by default', () => {
            const result = property.getPretty('test pretty');
            
            expect(result).toBe('test pretty');
        });
    });

    describe('DOM creation methods', () => {
        describe('createFieldContainer', () => {
            it('should create field container with correct class', () => {
                const container = property.createFieldContainer();
                
                expect(container.tagName).toBe('DIV');
                expect(container.classList.contains('metadata-field')).toBe(true);
            });
        });

        describe('createIconContainer', () => {
            it('should create icon container with icon', () => {
                const updateFn = jest.fn();
                const container = property.createIconContainer(updateFn);
                
                expect(container.tagName).toBe('DIV');
                expect(container.classList.contains('icon-container')).toBe(true);
                
                const icon = container.querySelector('div');
                expect(icon).toBeTruthy();
                expect(icon?.getAttribute('data-icon')).toBe('align-left');
            });

            it('should add click listener for non-static properties', async () => {
                property.static = false;
                const updateFn = jest.fn();
                
                // Create mock DOM structure for modifyField to work
                const field = document.createElement('div');
                field.classList.add('metadata-field');
                const link = document.createElement('div');
                link.classList.add('field-link');
                const input = document.createElement('input');
                input.classList.add('field-input');
                
                // Create icon container
                const container = property.createIconContainer(updateFn);
                
                // Setup DOM hierarchy properly
                field.appendChild(container);
                field.appendChild(link);
                field.appendChild(input);
                document.body.appendChild(field);
                
                // Set initial state
                link.style.display = 'block';
                input.style.display = 'none';
                
                // Test that clicking the icon container triggers the modifyField functionality
                // We'll spy on the modifyField method and then simulate a click
                const spy = jest.spyOn(property, 'modifyField');
                
                // Create and dispatch a click event on the icon container
                const clickEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                });
                
                container.dispatchEvent(clickEvent);
                
                // Verify modifyField was called
                expect(spy).toHaveBeenCalled();
                
                expect(link.style.display).toBe('none');
                expect(input.style.display).toBe('block');
            });
        });

        describe('createFieldInput', () => {
            it('should create input element with correct attributes', () => {
                const input = property.createFieldInput('test value');
                
                expect(input.tagName).toBe('INPUT');
                expect((input as HTMLInputElement).type).toBe('text');
                expect((input as HTMLInputElement).value).toBe('test value');
                expect(input.classList.contains('field-input')).toBe(true);
            });

            it('should handle empty value', () => {
                const input = property.createFieldInput('');
                
                expect((input as HTMLInputElement).value).toBe('');
            });
        });

        describe('createFieldLink', () => {
            it('should create link element with correct content', () => {
                const link = property.createFieldLink('test content');
                
                expect(link.tagName).toBe('DIV');
                expect(link.textContent).toBe('test content');
                expect(link.classList.contains('field-link')).toBe(true);
            });

            it('should have pointer cursor for non-static properties', () => {
                property.static = false;
                const link = property.createFieldLink('test');
                
                expect(link.style.cursor).toBe('text');
            });

            it('should have default cursor for static properties', () => {
                property.static = true;
                const link = property.createFieldLink('test');
                
                expect(link.style.cursor).toBe('default');
            });

            it('should handle empty value', () => {
                const link = property.createFieldLink('');
                
                expect(link.textContent).toBe('');
            });
        });
    });

    describe('modifyField', () => {
        it('should show input and hide link when called', () => {
            // Setup DOM structure
            const field = document.createElement('div');
            field.classList.add('metadata-field');
            const link = document.createElement('div');
            link.classList.add('field-link');
            link.style.display = 'block';
            const input = document.createElement('input');
            input.classList.add('field-input');
            input.style.display = 'none';
            
            field.appendChild(link);
            field.appendChild(input);
            document.body.appendChild(field);
            
            // Create mock event
            const mockEvent = {
                target: link
            } as unknown as Event;
            
            property.modifyField(mockEvent);
            
            expect(link.style.display).toBe('none');
            expect(input.style.display).toBe('block');
        });
    });

    describe('updateField', () => {
        it('should update field with valid value', async () => {
            const updateFn = jest.fn();
            const input = document.createElement('input') as HTMLInputElement;
            const link = document.createElement('div');
            
            input.value = 'new value';
            property.validate = jest.fn(() => 'validated value');
            
            await property.updateField(updateFn, input, link);
            
            expect(property.validate).toHaveBeenCalledWith('new value');
            expect(updateFn).toHaveBeenCalledWith('validated value');
            expect(input.style.display).toBe('none');
            expect(link.textContent).toBe('validated value');
            expect(link.style.display).toBe('block');
        });

        it('should update field with invalid value', async () => {
            const updateFn = jest.fn();
            const input = document.createElement('input') as HTMLInputElement;
            const link = document.createElement('div');
            
            input.value = 'invalid value';
            property.validate = jest.fn(() => '');
            
            await property.updateField(updateFn, input, link);
            
            expect(property.validate).toHaveBeenCalledWith('invalid value');
            expect(updateFn).toHaveBeenCalledWith('invalid value');
        });

        it('should update href for anchor elements', async () => {
            const updateFn = jest.fn();
            const input = document.createElement('input') as HTMLInputElement;
            const link = document.createElement('a') as HTMLAnchorElement;
            
            // Set initial href to trigger the href update path
            link.href = 'http://initial.com';
            
            input.value = 'new value';
            property.validate = jest.fn(() => 'validated value');
            property.getLink = jest.fn(() => 'http://test.com');
            
            await property.updateField(updateFn, input, link);
            
            expect(property.getLink).toHaveBeenCalledWith('validated value');
            expect(link.href).toBe('http://test.com/');
        });
    });

    describe('handleFieldInput', () => {
        it('should setup blur and keydown event listeners', () => {
            const updateFn = jest.fn();
            const input = document.createElement('input') as HTMLInputElement;
            const link = document.createElement('div');
            
            // Spy on addEventListener
            const addEventListenerSpy = jest.spyOn(input, 'addEventListener');
            
            property.handleFieldInput(updateFn, input, link);
            
            expect(addEventListenerSpy).toHaveBeenCalledWith('blur', expect.any(Function));
            expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
        });

        it('should handle Enter key press', async () => {
            const updateFn = jest.fn();
            const input = document.createElement('input') as HTMLInputElement;
            const link = document.createElement('div');
            
            input.value = 'test value';
            property.validate = jest.fn(() => 'validated value');
            
            property.handleFieldInput(updateFn, input, link);
            
            // Create and dispatch a real KeyboardEvent
            const keyEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                bubbles: true,
                cancelable: true,
            });
            
            // Spy on preventDefault to verify it was called
            const preventDefaultSpy = jest.spyOn(keyEvent, 'preventDefault');
            
            // Dispatch the event on the input
            input.dispatchEvent(keyEvent);
            
            // Wait for async operation to complete
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(preventDefaultSpy).toHaveBeenCalled();
            expect(updateFn).toHaveBeenCalledWith('validated value');
        });

        it('should handle Escape key press', async () => {
            const updateFn = jest.fn();
            const input = document.createElement('input') as HTMLInputElement;
            const link = document.createElement('div');
            
            input.value = 'escape value';
            property.validate = jest.fn(() => 'validated escape');
            
            property.handleFieldInput(updateFn, input, link);
            
            // Create and dispatch a real KeyboardEvent
            const keyEvent = new KeyboardEvent('keydown', {
                key: 'Escape',
                bubbles: true,
                cancelable: true,
            });
            
            // Spy on preventDefault to verify it was called
            const preventDefaultSpy = jest.spyOn(keyEvent, 'preventDefault');
            
            // Dispatch the event on the input
            input.dispatchEvent(keyEvent);
            
            // Wait for async operation to complete
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(preventDefaultSpy).toHaveBeenCalled();
            expect(updateFn).toHaveBeenCalledWith('validated escape');
        });
    });

    describe('getDisplay', () => {
        it('should create complete display element', async () => {
            property.read = jest.fn().mockResolvedValue('test value');
            property.fillDisplay = jest.fn(() => {
                const div = document.createElement('div');
                div.textContent = 'display content';
                return div;
            });
            
            const result = await property.getDisplay(mockFile, { staticMode: true, title: 'Test Title' });
            
            expect(property.static).toBe(true);
            expect(property.title).toBe('Test Title');
            expect(property.read).toHaveBeenCalledWith(mockFile);
            expect(property.fillDisplay).toHaveBeenCalledWith(
                'test value',
                expect.any(Function),
                { staticMode: true, title: 'Test Title' }
            );
        });
    });

    describe('fillDisplay', () => {
        it('should create complete field display with title', () => {
            property.title = 'Test Title';
            property.createFieldContainer = jest.fn(() => {
                const div = document.createElement('div');
                div.classList.add('metadata-field');
                return div;
            });
            property.createIconContainer = jest.fn(() => {
                const div = document.createElement('div');
                div.classList.add('icon-container');
                return div;
            });
            property.createFieldContainerContent = jest.fn(() => {
                const div = document.createElement('div');
                div.classList.add('field-container');
                return div;
            });
            
            const updateFn = jest.fn();
            const result = property.fillDisplay('test value', updateFn);
            
            expect(property.vault).toBe(mockVault);
            expect(property.createFieldContainer).toHaveBeenCalled();
            expect(property.createIconContainer).toHaveBeenCalledWith(updateFn);
            expect(property.createFieldContainerContent).toHaveBeenCalledWith(updateFn, 'test value');
            
            expect(result.querySelector('.metadata-title')).toBeTruthy();
            expect(result.querySelector('.metadata-title')?.textContent).toBe('Test Title');
        });

        it('should create field display without title', () => {
            property.title = '';
            property.createFieldContainer = jest.fn(() => document.createElement('div'));
            property.createIconContainer = jest.fn(() => document.createElement('div'));
            property.createFieldContainerContent = jest.fn(() => document.createElement('div'));
            
            const updateFn = jest.fn();
            const result = property.fillDisplay('test value', updateFn);
            
            expect(result.querySelector('.metadata-title')).toBeFalsy();
        });
    });

    describe('reloadDynamicContent', () => {
        it('should update field content when DOM elements exist', async () => {
            // Setup DOM
            const field = document.createElement('div');
            field.classList.add('metadata-field');
            const link = document.createElement('div');
            link.classList.add('field-link');
            const input = document.createElement('input');
            input.classList.add('field-input');
            
            field.appendChild(link);
            field.appendChild(input);
            document.body.appendChild(field);
            
            // Mock document.querySelector to return our field
            const originalQuerySelector = document.querySelector;
            document.querySelector = jest.fn((selector: string) => {
                if (selector === '.metadata-field') {
                    return field;
                }
                return null;
            });
            
            property.read = jest.fn().mockResolvedValue('new value');
            
            await property.reloadDynamicContent(mockFile);
            
            expect(property.read).toHaveBeenCalledWith(mockFile);
            expect(link.textContent).toBe('new value');
            expect((input as HTMLInputElement).value).toBe('new value');
            
            // Restore original
            document.querySelector = originalQuerySelector;
        });

        it('should handle missing DOM elements gracefully', async () => {
            property.read = jest.fn().mockResolvedValue('new value');
            
            // Should not throw error when no DOM elements exist
            await expect(property.reloadDynamicContent(mockFile)).resolves.toBeUndefined();
        });
    });
});
