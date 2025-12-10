import { FileProperty } from '../../src/properties/FileProperty';
import { PhoneProperty } from '../../src/properties/PhoneProperty';
import { Vault } from '../../src/vault/Vault';

describe('FileProperty & PhoneProperty - Tooltip Type Configuration', () => {
    let vault: any;
    let mockApp: any;

    beforeEach(() => {
        mockApp = {
            setIcon: jest.fn(),
            getSettings: jest.fn(() => ({ tooltipType: 'title', phoneFormat: 'FR' }))
        };
        vault = {
            app: mockApp,
            readLinkFile: jest.fn((value: string) => value.replace(/\[\[|\]\]/g, ''))
        };
    });

    describe('FileProperty with different tooltip types', () => {
        test('should use title only when tooltipType is "title"', () => {
            mockApp.getSettings = jest.fn(() => ({ tooltipType: 'title' }));
            
            const property = new FileProperty('file', vault, ['Contact'], {
                tooltip: 'Select a file'
            });

            const container = property.createIconContainer(jest.fn());
            const icon = container.querySelector('div');

            expect(icon?.getAttribute('title')).toBe('Select a file');
            expect(icon?.hasAttribute('aria-label')).toBe(false);
        });

        test('should use aria-label only when tooltipType is "aria-label"', () => {
            mockApp.getSettings = jest.fn(() => ({ tooltipType: 'aria-label' }));
            
            const property = new FileProperty('file', vault, ['Contact'], {
                tooltip: 'Select a file'
            });

            const container = property.createIconContainer(jest.fn());
            const icon = container.querySelector('div');

            expect(icon?.getAttribute('aria-label')).toBe('Select a file');
            expect(icon?.hasAttribute('title')).toBe(false);
        });

        test('should use both when tooltipType is "both"', () => {
            mockApp.getSettings = jest.fn(() => ({ tooltipType: 'both' }));
            
            const property = new FileProperty('file', vault, ['Contact'], {
                tooltip: 'Select a file'
            });

            const container = property.createIconContainer(jest.fn());
            const icon = container.querySelector('div');

            expect(icon?.getAttribute('title')).toBe('Select a file');
            expect(icon?.getAttribute('aria-label')).toBe('Select a file');
        });
    });

    describe('PhoneProperty with different tooltip types', () => {
        test('should use title only when tooltipType is "title"', () => {
            mockApp.getSettings = jest.fn(() => ({ tooltipType: 'title', phoneFormat: 'FR' }));
            
            const property = new PhoneProperty('phone', vault, {
                tooltip: 'Enter phone number'
            });

            const container = property.createIconContainer(jest.fn());
            const icon = container.querySelector('div');

            expect(icon?.getAttribute('title')).toBe('Enter phone number');
            expect(icon?.hasAttribute('aria-label')).toBe(false);
        });

        test('should use aria-label only when tooltipType is "aria-label"', () => {
            mockApp.getSettings = jest.fn(() => ({ tooltipType: 'aria-label', phoneFormat: 'FR' }));
            
            const property = new PhoneProperty('phone', vault, {
                tooltip: 'Enter phone number'
            });

            const container = property.createIconContainer(jest.fn());
            const icon = container.querySelector('div');

            expect(icon?.getAttribute('aria-label')).toBe('Enter phone number');
            expect(icon?.hasAttribute('title')).toBe(false);
        });

        test('should use both when tooltipType is "both"', () => {
            mockApp.getSettings = jest.fn(() => ({ tooltipType: 'both', phoneFormat: 'FR' }));
            
            const property = new PhoneProperty('phone', vault, {
                tooltip: 'Enter phone number'
            });

            const container = property.createIconContainer(jest.fn());
            const icon = container.querySelector('div');

            expect(icon?.getAttribute('title')).toBe('Enter phone number');
            expect(icon?.getAttribute('aria-label')).toBe('Enter phone number');
        });

        test('should default to title when tooltipType is not set', () => {
            mockApp.getSettings = jest.fn(() => ({ phoneFormat: 'FR' })); // No tooltipType
            
            const property = new PhoneProperty('phone', vault, {
                tooltip: 'Phone tooltip'
            });

            const container = property.createIconContainer(jest.fn());
            const icon = container.querySelector('div');

            expect(icon?.getAttribute('title')).toBe('Phone tooltip');
            expect(icon?.hasAttribute('aria-label')).toBe(false);
        });
    });

    describe('Mixed properties with different settings', () => {
        test('should respect tooltipType setting for each property', () => {
            // Create FileProperty with title
            mockApp.getSettings = jest.fn(() => ({ tooltipType: 'title' }));
            const fileProperty = new FileProperty('file', vault, ['Contact'], {
                tooltip: 'File tooltip'
            });
            const fileContainer = fileProperty.createIconContainer(jest.fn());
            const fileIcon = fileContainer.querySelector('div');

            expect(fileIcon?.getAttribute('title')).toBe('File tooltip');
            expect(fileIcon?.hasAttribute('aria-label')).toBe(false);

            // Change setting and create PhoneProperty with aria-label
            mockApp.getSettings = jest.fn(() => ({ tooltipType: 'aria-label', phoneFormat: 'FR' }));
            const phoneProperty = new PhoneProperty('phone', vault, {
                tooltip: 'Phone tooltip'
            });
            const phoneContainer = phoneProperty.createIconContainer(jest.fn());
            const phoneIcon = phoneContainer.querySelector('div');

            expect(phoneIcon?.getAttribute('aria-label')).toBe('Phone tooltip');
            expect(phoneIcon?.hasAttribute('title')).toBe(false);
        });
    });
});
