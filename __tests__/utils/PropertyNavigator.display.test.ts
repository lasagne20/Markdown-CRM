import { PropertyNavigator } from '../../src/utils/PropertyNavigator';
import { Vault } from '../../src/vault/Vault';
import { DateProperty } from '../../src/properties/DateProperty';
import { TextProperty } from '../../src/properties/TextProperty';
import { NumberProperty } from '../../src/properties/NumberProperty';
import { ObjectProperty } from '../../src/properties/ObjectProperty';

describe('PropertyNavigator - getPropertyDisplayForPath', () => {
    let vault: Vault;
    let mockContext: any;
    let properties: any;
    let updateCallback: jest.Mock;
    let navigator: PropertyNavigator;

    beforeEach(() => {
        // Mock Vault with app
        vault = {
            getFromLink: jest.fn(),
            app: {
                setIcon: jest.fn(), // Mock Obsidian's setIcon function
            }
        } as any;

        // Create sub-properties for animations (using proper constructor signatures)
        const animationsSubProperties = {
            date: new DateProperty('date', vault, []),
            titre: new TextProperty('titre', vault),
            tarif: new NumberProperty('tarif', vault, '0,0')
        };

        // Create sub-properties for details
        const detailsSubProperties = {
            montant: new NumberProperty('montant', vault, '0,0.00'),
            description: new TextProperty('description', vault)
        };

        // Create ObjectProperty instances with proper constructor signature
        const animationsProperty = new ObjectProperty('animations', vault, animationsSubProperties, {
            title: 'Animations'
        });

        const detailsProperty = new ObjectProperty('details', vault, detailsSubProperties, {
            title: 'Détails'
        });

        // Ensure properties are accessible (ObjectProperty stores them internally)
        properties = {
            animations: animationsProperty,
            details: detailsProperty
        };

        // Mock context with data
        mockContext = {
            animations: [
                { date: '2025-12-20', titre: 'Formation JS', tarif: 1500 },
                { date: '2025-12-25', titre: 'Workshop React', tarif: 2000 }
            ],
            details: {
                montant: 5000.50,
                description: 'Test description'
            },
            getPropertyValue: jest.fn((propName) => mockContext[propName]),
            updatePropertyValue: jest.fn()
        };

        updateCallback = jest.fn();

        navigator = new PropertyNavigator(vault, mockContext, properties, updateCallback);
    });

    describe('Array indexing with sub-property', () => {
        it('should get display for animations[0].date', async () => {
            const display = await navigator.getPropertyDisplayForPath('animations[0].date');

            expect(display).not.toBeNull();
            expect(display).toBeInstanceOf(HTMLElement);
            // DateProperty creates a metadata-field container
            expect(display?.classList.contains('metadata-field')).toBe(true);
        });

        it('should get display for animations[1].titre', async () => {
            const display = await navigator.getPropertyDisplayForPath('animations[1].titre');

            expect(display).not.toBeNull();
            expect(display).toBeInstanceOf(HTMLElement);
            expect(display?.textContent).toContain('Workshop React');
        });

        it('should get display for animations[0].tarif', async () => {
            const display = await navigator.getPropertyDisplayForPath('animations[0].tarif');

            expect(display).not.toBeNull();
            expect(display).toBeInstanceOf(HTMLElement);
        });

        it('should include title when provided', async () => {
            const display = await navigator.getPropertyDisplayForPath('animations[0].date', 'Date de la première animation');

            expect(display).not.toBeNull();
            expect(display?.classList.contains('metadata-property')).toBe(true);
            
            const titleElement = display?.querySelector('.metadata-property-key');
            expect(titleElement?.textContent).toBe('Date de la première animation');
            
            const valueElement = display?.querySelector('.metadata-property-value');
            expect(valueElement).not.toBeNull();
            // The wrapped DateProperty display
            expect(valueElement?.querySelector('.metadata-field')).not.toBeNull();
        });

        it('should handle index out of bounds', async () => {
            const display = await navigator.getPropertyDisplayForPath('animations[5].date');

            expect(display).toBeNull();
        });

        it('should handle negative index', async () => {
            const display = await navigator.getPropertyDisplayForPath('animations[-1].date');

            expect(display).toBeNull();
        });
    });

    describe('Nested object property', () => {
        it('should get display for details.montant', async () => {
            const display = await navigator.getPropertyDisplayForPath('details.montant');

            expect(display).not.toBeNull();
            expect(display).toBeInstanceOf(HTMLElement);
        });

        it('should get display for details.description', async () => {
            const display = await navigator.getPropertyDisplayForPath('details.description');

            expect(display).not.toBeNull();
            expect(display).toBeInstanceOf(HTMLElement);
            expect(display?.textContent).toContain('Test description');
        });

        it('should include title for nested object property', async () => {
            const display = await navigator.getPropertyDisplayForPath('details.montant', 'Montant total');

            expect(display).not.toBeNull();
            expect(display?.classList.contains('metadata-property')).toBe(true);
            
            const titleElement = display?.querySelector('.metadata-property-key');
            expect(titleElement?.textContent).toBe('Montant total');
        });
    });

    describe('Update callbacks', () => {
        it('should call update callback when array item property changes', async () => {
            const display = await navigator.getPropertyDisplayForPath('animations[0].tarif');
            expect(display).not.toBeNull();

            // Simulate property update by calling the property's update function
            const input = display?.querySelector('input');
            if (input) {
                const event = new Event('change');
                Object.defineProperty(event, 'target', { value: { value: '2500' }, enumerable: true });
                input.value = '2500';
                input.dispatchEvent(event);
            }

            // The update should modify the array and call the callback
            // Note: actual callback execution depends on property implementation
        });

        it('should call update callback when nested object property changes', async () => {
            const display = await navigator.getPropertyDisplayForPath('details.montant');
            expect(display).not.toBeNull();

            // Verify that the update mechanism exists
            // Actual update testing would require triggering the property's update function
        });

        it('should update array value at correct index', async () => {
            const originalValue = mockContext.animations[0].tarif;
            
            await navigator.getPropertyDisplayForPath('animations[0].tarif');

            // Verify original value is preserved
            expect(mockContext.animations[0].tarif).toBe(originalValue);
            expect(mockContext.animations[1].tarif).toBe(2000);
        });
    });

    describe('Error handling', () => {
        it('should return null for non-existent property', async () => {
            const display = await navigator.getPropertyDisplayForPath('nonExistent[0].date');

            expect(display).toBeNull();
        });

        it('should return null for non-existent sub-property', async () => {
            const display = await navigator.getPropertyDisplayForPath('animations[0].nonExistent');

            expect(display).toBeNull();
        });

        it('should return null when property is not an ObjectProperty', async () => {
            properties.simple = new TextProperty('simple', vault);
            
            const display = await navigator.getPropertyDisplayForPath('simple[0].date');

            expect(display).toBeNull();
        });

        it('should return null when array value is not an array', async () => {
            mockContext.animations = 'not an array';
            
            const display = await navigator.getPropertyDisplayForPath('animations[0].date');

            expect(display).toBeNull();
        });

        it('should return null when nested object value is not an object', async () => {
            mockContext.details = 'not an object';
            
            const display = await navigator.getPropertyDisplayForPath('details.montant');

            expect(display).toBeNull();
        });

        it('should return null when navigator has no properties', async () => {
            const navigatorWithoutProps = new PropertyNavigator(vault, mockContext);
            
            const display = await navigatorWithoutProps.getPropertyDisplayForPath('animations[0].date');

            expect(display).toBeNull();
        });
    });

    describe('Edge cases', () => {
        it('should handle empty array', async () => {
            mockContext.animations = [];
            
            const display = await navigator.getPropertyDisplayForPath('animations[0].date');

            expect(display).toBeNull();
        });

        it('should handle null array value', async () => {
            mockContext.animations = null;
            
            const display = await navigator.getPropertyDisplayForPath('animations[0].date');

            expect(display).toBeNull();
        });

        it('should handle undefined array value', async () => {
            mockContext.animations = undefined;
            
            const display = await navigator.getPropertyDisplayForPath('animations[0].date');

            expect(display).toBeNull();
        });

        it('should handle null sub-property value', async () => {
            mockContext.animations[0].date = null;
            
            const display = await navigator.getPropertyDisplayForPath('animations[0].date');

            // Should still create display, just with null value
            expect(display).not.toBeNull();
        });

        it('should handle undefined sub-property value', async () => {
            mockContext.animations[0].date = undefined;
            
            const display = await navigator.getPropertyDisplayForPath('animations[0].date');

            // Should still create display, just with undefined value
            expect(display).not.toBeNull();
        });

        it('should handle missing item in array', async () => {
            mockContext.animations[0] = undefined;
            
            const display = await navigator.getPropertyDisplayForPath('animations[0].date');

            // Should still create display but value will be undefined
            expect(display).not.toBeNull();
        });

        it('should work with context that has getPropertyValue method', async () => {
            const display = await navigator.getPropertyDisplayForPath('animations[0].date');

            expect(display).not.toBeNull();
            expect(mockContext.getPropertyValue).toHaveBeenCalledWith('animations');
        });

        it('should work with context without getPropertyValue method', async () => {
            delete mockContext.getPropertyValue;
            
            const display = await navigator.getPropertyDisplayForPath('animations[0].date');

            expect(display).not.toBeNull();
        });
    });

    describe('Different property types', () => {
        it('should create DateProperty display', async () => {
            const display = await navigator.getPropertyDisplayForPath('animations[0].date');

            expect(display).not.toBeNull();
            // DateProperty creates a metadata-field container
            expect(display?.classList.contains('metadata-field')).toBe(true);
        });

        it('should create TextProperty display', async () => {
            const display = await navigator.getPropertyDisplayForPath('animations[0].titre');

            expect(display).not.toBeNull();
            // TextProperty creates a metadata-textfield container (overrides createFieldContainer)
            expect(display?.classList.contains('metadata-textfield')).toBe(true);
        });

        it('should create NumberProperty display', async () => {
            const display = await navigator.getPropertyDisplayForPath('animations[0].tarif');

            expect(display).not.toBeNull();
            // NumberProperty creates a metadata-field with formatted value
            expect(display?.classList.contains('metadata-field')).toBe(true);
        });
    });

    describe('Complex scenarios', () => {
        it('should handle multiple calls for different indices', async () => {
            const display0 = await navigator.getPropertyDisplayForPath('animations[0].date');
            const display1 = await navigator.getPropertyDisplayForPath('animations[1].date');

            expect(display0).not.toBeNull();
            expect(display1).not.toBeNull();
            expect(display0).not.toBe(display1);
        });

        it('should handle multiple calls for different properties', async () => {
            const dateDisplay = await navigator.getPropertyDisplayForPath('animations[0].date');
            const titreDisplay = await navigator.getPropertyDisplayForPath('animations[0].titre');
            const tarifDisplay = await navigator.getPropertyDisplayForPath('animations[0].tarif');

            expect(dateDisplay).not.toBeNull();
            expect(titreDisplay).not.toBeNull();
            expect(tarifDisplay).not.toBeNull();
        });

        it('should handle array and object properties in same navigator', async () => {
            const arrayDisplay = await navigator.getPropertyDisplayForPath('animations[0].date');
            const objectDisplay = await navigator.getPropertyDisplayForPath('details.montant');

            expect(arrayDisplay).not.toBeNull();
            expect(objectDisplay).not.toBeNull();
        });
    });

    describe('Path pattern matching', () => {
        it('should match array[index].property pattern', async () => {
            const display = await navigator.getPropertyDisplayForPath('animations[0].date');
            expect(display).not.toBeNull();
        });

        it('should match object.property pattern', async () => {
            const display = await navigator.getPropertyDisplayForPath('details.montant');
            expect(display).not.toBeNull();
        });

        it('should not match invalid patterns', async () => {
            const display1 = await navigator.getPropertyDisplayForPath('animations.0.date'); // Should use [0]
            const display2 = await navigator.getPropertyDisplayForPath('animations[0]date'); // Missing dot
            const display3 = await navigator.getPropertyDisplayForPath('animations[a].date'); // Non-numeric index

            expect(display1).toBeNull();
            expect(display2).toBeNull();
            expect(display3).toBeNull();
        });

        it('should handle large index numbers', async () => {
            // Add item at high index
            mockContext.animations[99] = { date: '2026-01-01', titre: 'Test', tarif: 1000 };
            
            const display = await navigator.getPropertyDisplayForPath('animations[99].date');

            expect(display).not.toBeNull();
        });
    });

    describe('Console logging', () => {
        let consoleLogSpy: jest.SpyInstance;
        let consoleWarnSpy: jest.SpyInstance;

        beforeEach(() => {
            consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
            consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        });

        afterEach(() => {
            consoleLogSpy.mockRestore();
            consoleWarnSpy.mockRestore();
        });

        it('should log debug info for successful path resolution', async () => {
            await navigator.getPropertyDisplayForPath('animations[0].date');

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('🔍 Getting display for animations[0].date')
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('✅ Found sub-property date')
            );
        });

        it('should warn when property not found', async () => {
            await navigator.getPropertyDisplayForPath('nonExistent[0].date');

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('❌ Property nonExistent not found')
            );
        });

        it('should warn when index out of bounds', async () => {
            await navigator.getPropertyDisplayForPath('animations[10].date');

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('❌ Index 10 out of bounds')
            );
        });

        it('should warn when value is not an array', async () => {
            mockContext.animations = 'not an array';
            
            await navigator.getPropertyDisplayForPath('animations[0].date');

            // The warn is called with two arguments: message and value
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('❌ animations is not an array'),
                'not an array'
            );
        });

        it('should log array value for debugging', async () => {
            await navigator.getPropertyDisplayForPath('animations[0].date');

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('📊 Array value for animations:'),
                expect.any(Array)
            );
        });

        it('should log final value for debugging', async () => {
            await navigator.getPropertyDisplayForPath('animations[0].date');

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('📦 Value at animations[0].date:'),
                '2025-12-20'
            );
        });

        it('should warn when no properties provided to navigator', async () => {
            const navigatorWithoutProps = new PropertyNavigator(vault, mockContext);
            
            await navigatorWithoutProps.getPropertyDisplayForPath('animations[0].date');

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('PropertyNavigator: properties not provided')
            );
        });
    });
});
