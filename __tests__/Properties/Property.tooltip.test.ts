import { Property } from '../../src/properties/Property';
import { TextProperty } from '../../src/properties/TextProperty';
import { NumberProperty } from '../../src/properties/NumberProperty';
import { DateProperty } from '../../src/properties/DateProperty';
import { SelectProperty } from '../../src/properties/SelectProperty';
import { BooleanProperty } from '../../src/properties/BooleanProperty';

// Simple mock vault without full initialization
const createMockVault = () => ({
    app: {
        setIcon: (element: HTMLElement, iconName: string) => {
            element.setAttribute('data-icon', iconName);
            element.textContent = `[${iconName}]`;
        },
        getSettings: () => ({
            classePropertyName: 'Classe',
            classePropertyAliases: [],
            deleteAliasesAfterMigration: true
        })
    },
    getPersonalName: () => 'Test User'
}) as any;

describe('Property Tooltip Tests', () => {
    let vault: any;

    beforeEach(() => {
        vault = createMockVault();
    });

    describe('Base Property tooltip', () => {
        it('should add tooltip attributes when tooltip is provided', () => {
            const property = new Property('testProp', vault, {
                tooltip: 'This is a helpful tooltip'
            });

            const iconContainer = property.createIconContainer(async () => {});
            const icon = iconContainer.querySelector('div');

            expect(icon).toBeTruthy();
            expect(icon?.getAttribute('aria-label')).toBe('This is a helpful tooltip');
            expect(icon?.getAttribute('title')).toBe('This is a helpful tooltip');
        });

        it('should not add tooltip attributes when tooltip is empty', () => {
            const property = new Property('testProp', vault, {
                tooltip: ''
            });

            const iconContainer = property.createIconContainer(async () => {});
            const icon = iconContainer.querySelector('div');

            expect(icon).toBeTruthy();
            expect(icon?.getAttribute('aria-label')).toBeNull();
            expect(icon?.getAttribute('title')).toBeNull();
        });

        it('should not add tooltip attributes when tooltip is not provided', () => {
            const property = new Property('testProp', vault);

            const iconContainer = property.createIconContainer(async () => {});
            const icon = iconContainer.querySelector('div');

            expect(icon).toBeTruthy();
            expect(icon?.getAttribute('aria-label')).toBeNull();
            expect(icon?.getAttribute('title')).toBeNull();
        });

        it('should handle multiline tooltip text', () => {
            const multilineTooltip = 'Line 1\nLine 2\nLine 3';
            const property = new Property('testProp', vault, {
                tooltip: multilineTooltip
            });

            const iconContainer = property.createIconContainer(async () => {});
            const icon = iconContainer.querySelector('div');

            expect(icon?.getAttribute('title')).toBe(multilineTooltip);
            expect(icon?.getAttribute('aria-label')).toBe(multilineTooltip);
        });

        it('should handle special characters in tooltip', () => {
            const specialTooltip = 'Tooltip with "quotes" and <tags>';
            const property = new Property('testProp', vault, {
                tooltip: specialTooltip
            });

            const iconContainer = property.createIconContainer(async () => {});
            const icon = iconContainer.querySelector('div');

            expect(icon?.getAttribute('title')).toBe(specialTooltip);
        });

        it('should update tooltip value when set after construction', () => {
            const property = new Property('testProp', vault);
            property.tooltip = 'Updated tooltip';

            const iconContainer = property.createIconContainer(async () => {});
            const icon = iconContainer.querySelector('div');

            expect(icon?.getAttribute('title')).toBe('Updated tooltip');
        });
    });

    describe('TextProperty tooltip', () => {
        it('should support tooltip in TextProperty', () => {
            const property = new TextProperty('name', vault, {
                tooltip: 'Enter the name here'
            });

            const iconContainer = property.createIconContainer(async () => {});
            const icon = iconContainer.querySelector('div');

            expect(icon?.getAttribute('title')).toBe('Enter the name here');
        });

        it('should inherit tooltip behavior from Property', () => {
            const property = new TextProperty('description', vault, {
                icon: 'file-text',
                tooltip: 'Provide a detailed description'
            });

            expect(property.tooltip).toBe('Provide a detailed description');
            expect(property.icon).toBe('file-text');
        });
    });

    describe('NumberProperty tooltip', () => {
        it('should support tooltip in NumberProperty', () => {
            const property = new NumberProperty('age', vault, '', {
                tooltip: 'Age in years'
            });

            const iconContainer = property.createIconContainer(async () => {});
            const icon = iconContainer.querySelector('div');

            expect(icon?.getAttribute('title')).toBe('Age in years');
        });
    });

    describe('DateProperty tooltip', () => {
        it('should support tooltip in DateProperty', () => {
            const property = new DateProperty('birthDate', vault, [], {
                tooltip: 'Select your birth date'
            });

            const iconContainer = property.createIconContainer(async () => {});
            const icon = iconContainer.querySelector('div');

            expect(icon?.getAttribute('title')).toBe('Select your birth date');
        });
    });

    describe('SelectProperty tooltip', () => {
        it('should support tooltip in SelectProperty', () => {
            const property = new SelectProperty('status', vault, [
                { name: 'Active', color: '#green' },
                { name: 'Inactive', color: '#red' }
            ], {
                tooltip: 'Choose the current status'
            });

            const iconContainer = property.createIconContainer(async () => {});
            const icon = iconContainer.querySelector('div');

            expect(icon?.getAttribute('title')).toBe('Choose the current status');
        });
    });

    describe('BooleanProperty tooltip', () => {
        it('should support tooltip in BooleanProperty', () => {
            const property = new BooleanProperty('isActive', vault, {
                tooltip: 'Toggle to activate or deactivate'
            });

            const iconContainer = property.createIconContainer(async () => {});
            const icon = iconContainer.querySelector('div');

            expect(icon?.getAttribute('title')).toBe('Toggle to activate or deactivate');
        });
    });

    describe('Tooltip in full display', () => {
        it('should include tooltip in full property display', async () => {
            const property = new TextProperty('testField', vault, {
                tooltip: 'This is a test field',
                icon: 'text'
            });

            // Mock classe with getPropertyValue
            const mockClasse = {
                getPropertyValue: jest.fn().mockResolvedValue('Test Value'),
                updatePropertyValue: jest.fn().mockResolvedValue(undefined)
            };

            const display = await property.getDisplay(mockClasse);

            const icon = display.querySelector('.icon-container div');
            expect(icon?.getAttribute('title')).toBe('This is a test field');
            expect(icon?.getAttribute('aria-label')).toBe('This is a test field');
        });

        it('should work with static properties', async () => {
            const property = new Property('staticProp', vault, {
                tooltip: 'Static field tooltip',
                staticProperty: true
            });

            const mockClasse = {
                getPropertyValue: jest.fn().mockResolvedValue('Static Value'),
                updatePropertyValue: jest.fn()
            };

            const display = await property.getDisplay(mockClasse, { staticMode: true });

            const icon = display.querySelector('.icon-container div');
            expect(icon?.getAttribute('title')).toBe('Static field tooltip');
        });

        it('should work with title and tooltip together', async () => {
            const property = new Property('combinedProp', vault, {
                tooltip: 'Helpful tooltip',
                icon: 'info'
            });

            const mockClasse = {
                getPropertyValue: jest.fn().mockResolvedValue('Value'),
                updatePropertyValue: jest.fn()
            };

            const display = await property.getDisplay(mockClasse, { title: 'Field Title' });

            const title = display.querySelector('.metadata-title');
            const icon = display.querySelector('.icon-container div');

            expect(title?.textContent).toBe('Field Title');
            expect(icon?.getAttribute('title')).toBe('Helpful tooltip');
        });
    });

    describe('Accessibility', () => {
        it('should provide both title and aria-label for accessibility', () => {
            const property = new Property('accessibleProp', vault, {
                tooltip: 'Accessible tooltip'
            });

            const iconContainer = property.createIconContainer(async () => {});
            const icon = iconContainer.querySelector('div');

            // Both attributes should be present for better accessibility
            expect(icon?.getAttribute('title')).toBe('Accessible tooltip');
            expect(icon?.getAttribute('aria-label')).toBe('Accessible tooltip');
        });

        it('should support long descriptive tooltips for screen readers', () => {
            const longTooltip = 'This is a comprehensive description of the field that provides detailed context for users who need additional information about what to enter and why it matters.';
            
            const property = new Property('detailedProp', vault, {
                tooltip: longTooltip
            });

            const iconContainer = property.createIconContainer(async () => {});
            const icon = iconContainer.querySelector('div');

            expect(icon?.getAttribute('aria-label')).toBe(longTooltip);
        });
    });

    describe('Edge cases', () => {
        it('should handle undefined tooltip gracefully', () => {
            const property = new Property('testProp', vault, {
                tooltip: undefined as any
            });

            const iconContainer = property.createIconContainer(async () => {});
            const icon = iconContainer.querySelector('div');

            expect(icon?.getAttribute('title')).toBeNull();
        });

        it('should handle null tooltip gracefully', () => {
            const property = new Property('testProp', vault, {
                tooltip: null as any
            });

            const iconContainer = property.createIconContainer(async () => {});
            const icon = iconContainer.querySelector('div');

            expect(icon?.getAttribute('title')).toBeNull();
        });

        it('should trim whitespace from tooltip', () => {
            const property = new Property('testProp', vault, {
                tooltip: '   Tooltip with spaces   '
            });

            // Tooltip should be preserved as-is (no automatic trimming)
            expect(property.tooltip).toBe('   Tooltip with spaces   ');
        });

        it('should handle very long tooltip text', () => {
            const veryLongTooltip = 'A'.repeat(500);
            const property = new Property('testProp', vault, {
                tooltip: veryLongTooltip
            });

            const iconContainer = property.createIconContainer(async () => {});
            const icon = iconContainer.querySelector('div');

            expect(icon?.getAttribute('title')).toBe(veryLongTooltip);
            expect(icon?.getAttribute('title')?.length).toBe(500);
        });
    });

    describe('Integration with other options', () => {
        it('should work with aliases and tooltip', () => {
            const property = new Property('newName', vault, {
                aliases: ['oldName', 'legacyName'],
                tooltip: 'This field was renamed'
            });

            expect(property.aliases).toEqual(['oldName', 'legacyName']);
            expect(property.tooltip).toBe('This field was renamed');
        });

        it('should work with all constructor options', () => {
            const property = new Property('complexProp', vault, {
                icon: 'star',
                staticProperty: true,
                flexSpan: 2,
                defaultValue: 'default',
                aliases: ['old'],
                tooltip: 'Complex property tooltip'
            });

            expect(property.icon).toBe('star');
            expect(property.static).toBe(true);
            expect(property.flexSpan).toBe(2);
            expect(property.default).toBe('default');
            expect(property.aliases).toEqual(['old']);
            expect(property.tooltip).toBe('Complex property tooltip');
        });
    });
});
