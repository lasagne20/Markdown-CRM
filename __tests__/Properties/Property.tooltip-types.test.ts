import { Property } from '../../src/properties/Property';
import { Vault } from '../../src/vault/Vault';

describe('Property - Tooltip Type Configuration', () => {
    let vault: any;
    let mockApp: any;

    beforeEach(() => {
        mockApp = {
            setIcon: jest.fn(),
            getSettings: jest.fn(() => ({ tooltipType: 'title' })) // Default
        };
        vault = { app: mockApp };
    });

    describe('tooltipType: title (default)', () => {
        test('should use only title attribute when tooltipType is "title"', () => {
            mockApp.getSettings = jest.fn(() => ({ tooltipType: 'title' }));
            
            const property = new Property('test', vault, {
                tooltip: 'Test tooltip'
            });

            const mockUpdate = jest.fn();
            const iconContainer = property.createIconContainer(mockUpdate);

            const icon = iconContainer.querySelector('div');
            expect(icon?.getAttribute('title')).toBe('Test tooltip');
            expect(icon?.hasAttribute('aria-label')).toBe(false);
        });

        test('should default to title when tooltipType is not specified', () => {
            mockApp.getSettings = jest.fn(() => ({})); // No tooltipType
            
            const property = new Property('test', vault, {
                tooltip: 'Default tooltip'
            });

            const mockUpdate = jest.fn();
            const iconContainer = property.createIconContainer(mockUpdate);

            const icon = iconContainer.querySelector('div');
            expect(icon?.getAttribute('title')).toBe('Default tooltip');
            expect(icon?.hasAttribute('aria-label')).toBe(false);
        });
    });

    describe('tooltipType: aria-label', () => {
        test('should use only aria-label attribute when tooltipType is "aria-label"', () => {
            mockApp.getSettings = jest.fn(() => ({ tooltipType: 'aria-label' }));
            
            const property = new Property('test', vault, {
                tooltip: 'Accessible tooltip'
            });

            const mockUpdate = jest.fn();
            const iconContainer = property.createIconContainer(mockUpdate);

            const icon = iconContainer.querySelector('div');
            expect(icon?.getAttribute('aria-label')).toBe('Accessible tooltip');
            expect(icon?.hasAttribute('title')).toBe(false);
        });
    });

    describe('tooltipType: both', () => {
        test('should use both title and aria-label when tooltipType is "both"', () => {
            mockApp.getSettings = jest.fn(() => ({ tooltipType: 'both' }));
            
            const property = new Property('test', vault, {
                tooltip: 'Full accessibility tooltip'
            });

            const mockUpdate = jest.fn();
            const iconContainer = property.createIconContainer(mockUpdate);

            const icon = iconContainer.querySelector('div');
            expect(icon?.getAttribute('title')).toBe('Full accessibility tooltip');
            expect(icon?.getAttribute('aria-label')).toBe('Full accessibility tooltip');
        });
    });

    describe('No tooltip configured', () => {
        test('should not add any tooltip attributes when tooltip is empty', () => {
            mockApp.getSettings = jest.fn(() => ({ tooltipType: 'both' }));
            
            const property = new Property('test', vault, {
                tooltip: ''
            });

            const mockUpdate = jest.fn();
            const iconContainer = property.createIconContainer(mockUpdate);

            const icon = iconContainer.querySelector('div');
            expect(icon?.hasAttribute('title')).toBe(false);
            expect(icon?.hasAttribute('aria-label')).toBe(false);
        });

        test('should not add any tooltip attributes when tooltip is not provided', () => {
            mockApp.getSettings = jest.fn(() => ({ tooltipType: 'both' }));
            
            const property = new Property('test', vault);

            const mockUpdate = jest.fn();
            const iconContainer = property.createIconContainer(mockUpdate);

            const icon = iconContainer.querySelector('div');
            expect(icon?.hasAttribute('title')).toBe(false);
            expect(icon?.hasAttribute('aria-label')).toBe(false);
        });
    });

    describe('Settings integration', () => {
        test('should read tooltipType from vault settings', () => {
            const getSettingsSpy = jest.fn(() => ({ tooltipType: 'aria-label' }));
            mockApp.getSettings = getSettingsSpy;
            
            const property = new Property('test', vault, {
                tooltip: 'Test'
            });

            const mockUpdate = jest.fn();
            property.createIconContainer(mockUpdate);

            expect(getSettingsSpy).toHaveBeenCalled();
        });

        test('should work with different tooltip types across multiple properties', () => {
            // First property with title
            mockApp.getSettings = jest.fn(() => ({ tooltipType: 'title' }));
            const property1 = new Property('test1', vault, { tooltip: 'Tooltip 1' });
            const container1 = property1.createIconContainer(jest.fn());
            const icon1 = container1.querySelector('div');
            
            expect(icon1?.getAttribute('title')).toBe('Tooltip 1');
            expect(icon1?.hasAttribute('aria-label')).toBe(false);

            // Second property with aria-label
            mockApp.getSettings = jest.fn(() => ({ tooltipType: 'aria-label' }));
            const property2 = new Property('test2', vault, { tooltip: 'Tooltip 2' });
            const container2 = property2.createIconContainer(jest.fn());
            const icon2 = container2.querySelector('div');
            
            expect(icon2?.getAttribute('aria-label')).toBe('Tooltip 2');
            expect(icon2?.hasAttribute('title')).toBe(false);
        });
    });
});
