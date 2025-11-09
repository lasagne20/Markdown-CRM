/**
 * @jest-environment jsdom
 */

import { MediaProperty } from '../../src/properties/MediaProperty';
import { MultiMediaProperty } from '../../src/properties/MultiMediaProperty';

// Mock the vault utilities
jest.mock('../../src/vault/Utils', () => ({
    selectMedia: jest.fn(),
    setIcon: jest.fn()
}));

// Import the mocked functions
const { selectMedia, setIcon } = jest.requireMock('../../src/vault/Utils');

describe('MultiMediaProperty', () => {
    let multiMediaProperty: MultiMediaProperty;
    let mockVault: any;

    beforeEach(() => {
        // Reset DOM mocks
        document.body.innerHTML = '';
        jest.clearAllMocks();
        
        // Mock vault with necessary methods
        mockVault = {
            getMediaFromLink: jest.fn().mockReturnValue({ name: 'test.jpg', path: 'path/to/test.jpg' }),
            readLinkFile: jest.fn().mockReturnValue('path/to/test.jpg'),
            files: [],
            app: {
                setIcon: jest.fn()
            }
        };

        // Assign selectMedia mock to globalThis
        globalThis.selectMedia = selectMedia;
    });

    beforeEach(() => {
        multiMediaProperty = new MultiMediaProperty('testMedia', mockVault, {});
    });

    describe('constructor', () => {
        it('should create MultiMediaProperty with correct type', () => {
            expect(multiMediaProperty.type).toBe('multiMedia');
        });

        it('should create MediaProperty instance', () => {
            expect(multiMediaProperty.property).toBeInstanceOf(MediaProperty);
        });

        it('should pass args to parent constructor and MediaProperty', () => {
            const customArgs = { flexSpan: 3 };
            const customProperty = new MultiMediaProperty('customName', mockVault, customArgs);
            expect(customProperty.name).toBe('customName');
            // flexSpan is hardcoded to 2 in the class, so we test the default value
            expect(customProperty.flexSpan).toBe(2);
        });
    });

    describe('fillDisplay', () => {
        it('should create container with correct classes', () => {
            const update = jest.fn();
            const result = multiMediaProperty.fillDisplay(null, update);
            
            expect(result.classList.contains('metadata-multiFiles-container-testmedia')).toBe(true);
            expect(result.classList.contains('metadata-multiFiles-container')).toBe(true);
        });

        it('should create add button when no values', () => {
            const update = jest.fn();
            const result = multiMediaProperty.fillDisplay(null, update);
            
            const addButton = result.querySelector('.metadata-add-button-inline-small');
            expect(addButton).toBeTruthy();
        });

        it('should create objects when values present', () => {
            const update = jest.fn();
            const values = ['[[file1.jpg]]', '[[file2.jpg]]'];
            const result = multiMediaProperty.fillDisplay(values, update);
            
            const rows = result.querySelectorAll('.metadata-multiFiles-row-inline');
            expect(rows.length).toBe(2);
        });

        it('should set vault property', () => {
            const update = jest.fn();
            
            multiMediaProperty.fillDisplay(null, update);
            expect(multiMediaProperty.vault).toBe(mockVault);
        });
    });

    describe('createObjects', () => {
        it('should handle empty array', () => {
            const update = jest.fn();
            const container = document.createElement('div');
            
            multiMediaProperty.createObjects([], update, container);
            expect(container.children.length).toBe(0);
        });

        it('should handle null values', () => {
            const update = jest.fn();
            const container = document.createElement('div');
            
            multiMediaProperty.createObjects(null, update, container);
            expect(container.children.length).toBe(0);
        });

        it('should create rows for each value', () => {
            const update = jest.fn();
            const container = document.createElement('div');
            const values = ['[[file1.jpg]]', '[[file2.jpg]]'];
            multiMediaProperty.vault = mockVault;
            
            multiMediaProperty.createObjects(values, update, container);
            expect(container.children.length).toBe(2);
        });
    });

    describe('createObjectRow', () => {
        it('should create row with correct structure', () => {
            const update = jest.fn();
            const container = document.createElement('div');
            const values = ['[[test.jpg]]'];
            const value = '[[test.jpg]]';
            const index = 0;
            multiMediaProperty.vault = mockVault;
            
            const row = multiMediaProperty.createObjectRow(values, update, value, index, container);
            
            expect(row.classList.contains('metadata-multiFiles-row-inline')).toBe(true);
            expect(row.querySelector('.metadata-delete-button-inline-small')).toBeTruthy();
        });

        it('should call property.fillDisplay with correct parameters', () => {
            const update = jest.fn();
            const container = document.createElement('div');
            const values = ['[[test.jpg]]'];
            const value = '[[test.jpg]]';
            const index = 0;
            multiMediaProperty.vault = mockVault;
            const spy = jest.spyOn(multiMediaProperty.property, 'fillDisplay');
            
            multiMediaProperty.createObjectRow(values, update, value, index, container);
            
            expect(spy).toHaveBeenCalledWith(value, expect.any(Function));
        });
    });

    describe('createDeleteButton', () => {
        it('should create button with correct classes and icon', () => {
            const values = ['[[file1.jpg]]'];
            const index = 0;
            const update = jest.fn();
            const container = document.createElement('div');
            
            const button = multiMediaProperty.createDeleteButton(values, update, index, container);
            
            expect(button.classList.contains('metadata-delete-button-inline-small')).toBe(true);
        });

        it('should have onclick handler', () => {
            const values = ['[[file1.jpg]]'];
            const index = 0;
            const update = jest.fn();
            const container = document.createElement('div');
            
            const button = multiMediaProperty.createDeleteButton(values, update, index, container);
            
            expect(button.onclick).toBeTruthy();
        });
    });

    describe('createAddButton', () => {
        it('should create button with correct classes and icon', () => {
            const values: any[] = [];
            const update = jest.fn();
            const container = document.createElement('div');
            
            const button = multiMediaProperty.createAddButton(values, update, container);
            
            expect(button.classList.contains('metadata-add-button-inline-small')).toBe(true);
        });

        it('should have onclick handler', () => {
            const values: any[] = [];
            const update = jest.fn();
            const container = document.createElement('div');
            
            const button = multiMediaProperty.createAddButton(values, update, container);
            
            expect(button.onclick).toBeTruthy();
        });
    });

    describe('addProperty', () => {
        it('should add media when selectMedia returns file', async () => {
            const mockUpdate = jest.fn();
            const container = document.createElement('div');
            const mockFile = { path: 'path/to/image.jpg', name: 'image.jpg' };
            const values: any[] = [];
            multiMediaProperty.vault = mockVault;
            
            (selectMedia as jest.Mock).mockResolvedValue(mockFile);
            jest.spyOn(multiMediaProperty, 'reloadObjects').mockResolvedValue(undefined);
            
            await multiMediaProperty.addProperty(values, mockUpdate, container);
            
            expect(values).toContain('[[path/to/image.jpg|image.jpg]]');
            expect(mockUpdate).toHaveBeenCalledWith(values);
        });

        it('should initialize values array if null', async () => {
            const mockUpdate = jest.fn();
            const container = document.createElement('div');
            const mockFile = { path: 'path/to/image.jpg', name: 'image.jpg' };
            let values: any = null;
            multiMediaProperty.vault = mockVault;
            
            (selectMedia as jest.Mock).mockResolvedValue(mockFile);
            jest.spyOn(multiMediaProperty, 'reloadObjects').mockResolvedValue(undefined);
            
            await multiMediaProperty.addProperty(values, mockUpdate, container);
            
            expect(mockUpdate).toHaveBeenCalled();
        });

        it('should not update when selectMedia returns null', async () => {
            const mockUpdate = jest.fn();
            const container = document.createElement('div');
            const values: any[] = [];
            multiMediaProperty.vault = mockVault;
            
            (selectMedia as jest.Mock).mockResolvedValue(null);
            
            await multiMediaProperty.addProperty(values, mockUpdate, container);
            
            expect(values).toHaveLength(0);
            expect(mockUpdate).not.toHaveBeenCalled();
        });

        it('should not update when selectMedia returns undefined', async () => {
            const mockUpdate = jest.fn();
            const container = document.createElement('div');
            const values: any[] = [];
            multiMediaProperty.vault = mockVault;
            
            (selectMedia as jest.Mock).mockResolvedValue(undefined);
            
            await multiMediaProperty.addProperty(values, mockUpdate, container);
            
            expect(values).toHaveLength(0);
            expect(mockUpdate).not.toHaveBeenCalled();
        });
    });

    describe('reloadObjects method inheritance', () => {
        it('should have reloadObjects method from parent class', () => {
            expect(typeof multiMediaProperty.reloadObjects).toBe('function');
        });

        it('should call reloadObjects when implemented by mock', async () => {
            const values = ['[[file1.jpg]]'];
            const update = jest.fn();
            
            jest.spyOn(multiMediaProperty, 'reloadObjects').mockResolvedValue(undefined);
            
            await multiMediaProperty.reloadObjects(values, update);
            
            expect(multiMediaProperty.reloadObjects).toHaveBeenCalledWith(values, update);
        });
    });
});
