import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { TextProperty } from '../../src/properties/TextProperty';
import { Vault } from '../../src/vault/Vault';
import { mockApp } from '../utils/mocks';

describe('ObjectProperty - Container Reload After Add/Update', () => {
    let vault: Vault;
    let app: any;

    beforeEach(() => {
        app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);
    });

    it('should reload container after adding a new object', async () => {
        const properties = {
            name: new TextProperty('name', vault),
            value: new TextProperty('value', vault)
        };

        const objectProp = new ObjectProperty('items', vault, properties);

        const initialValues = [
            { name: 'Item 1', value: 'Value 1' }
        ];

        const mockUpdate = jest.fn();

        // Create initial display
        const container = objectProp.fillDisplay(initialValues, mockUpdate);
        document.body.appendChild(container);

        // Get the unique container class name
        const containerClasses = Array.from(container.classList);
        const uniqueClass = containerClasses.find(c => c.startsWith('metadata-object-container-items-'));
        
        expect(uniqueClass).toBeDefined();
        console.log('Container class:', uniqueClass);

        // Count initial rows
        const initialRows = container.querySelectorAll('.metadata-object-row');
        expect(initialRows.length).toBe(1);

        // Simulate adding a new object
        await objectProp.addProperty(initialValues, mockUpdate, container);

        // After adding, the container should be reloaded with the new object
        // But the querySelector in reloadObjects uses the old class pattern without the ID
        
        // Check if mockUpdate was called with the new values
        expect(mockUpdate).toHaveBeenCalled();
        const updatedValues = mockUpdate.mock.calls[0][0];
        expect(updatedValues.length).toBe(2);

        // Check if container was reloaded - this will fail with current code
        // because reloadObjects can't find the container with the unique ID
        const reloadedContainer = document.querySelector('.' + uniqueClass);
        expect(reloadedContainer).toBeTruthy();

        // The container should now have 2 rows
        const updatedRows = container.querySelectorAll('.metadata-object-row');
        expect(updatedRows.length).toBe(2);
    });

    it('should reload container after updating an object', async () => {
        const properties = {
            name: new TextProperty('name', vault),
            value: new TextProperty('value', vault)
        };

        const objectProp = new ObjectProperty('items', vault, properties);

        const initialValues = [
            { name: 'Item 1', value: 'Value 1' }
        ];

        const mockUpdate = jest.fn();

        // Create initial display
        const container = objectProp.fillDisplay(initialValues, mockUpdate);
        document.body.appendChild(container);

        // Update an object
        await objectProp.updateObject(initialValues, mockUpdate, 0, properties.name, 'Updated Name');

        // Check if mockUpdate was called
        expect(mockUpdate).toHaveBeenCalled();
        const updatedValues = mockUpdate.mock.calls[0][0];
        expect(updatedValues[0].name).toBe('Updated Name');

        // The container should be reloaded with updated content
        // This will fail because reloadObjects can't find the container
        const reloadedContainer = document.querySelector('.metadata-object-container-items-');
        // Note: this selector won't match because we need the full class with ID
    });

    it('should reload container after removing an object', async () => {
        const properties = {
            name: new TextProperty('name', vault),
            value: new TextProperty('value', vault)
        };

        const objectProp = new ObjectProperty('items', vault, properties);

        const initialValues = [
            { name: 'Item 1', value: 'Value 1' },
            { name: 'Item 2', value: 'Value 2' }
        ];

        const mockUpdate = jest.fn();

        // Create initial display
        const container = objectProp.fillDisplay(initialValues, mockUpdate);
        document.body.appendChild(container);

        // Count initial rows
        const initialRows = container.querySelectorAll('.metadata-object-row');
        expect(initialRows.length).toBe(2);

        // Remove an object
        await objectProp.removeProperty(initialValues, mockUpdate, 0, container);

        // Check if mockUpdate was called
        expect(mockUpdate).toHaveBeenCalled();
        const updatedValues = mockUpdate.mock.calls[0][0];
        expect(updatedValues.length).toBe(1);

        // The container should be reloaded with only 1 row
        const updatedRows = container.querySelectorAll('.metadata-object-row');
        expect(updatedRows.length).toBe(1);
    });
});
