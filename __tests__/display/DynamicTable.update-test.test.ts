import { DynamicTable } from '../../src/display/DynamicTable';
import { SelectProperty } from '../../src/properties/SelectProperty';
import { NumberProperty } from '../../src/properties/NumberProperty';

describe('DynamicTable - Property Updates', () => {
    // Mock vault with complete app structure
    const mockVault = {
        app: { 
            open: jest.fn(),
            setIcon: jest.fn() // Add the missing setIcon method
        }
    } as any;

    class TestFile {
        private data: any;
        private fileName: string;
        private updateCallback: jest.Mock;

        constructor(data: any, fileName: string) {
            this.data = { ...data }; // Clone data to avoid mutations
            this.fileName = fileName;
            this.updateCallback = jest.fn();
        }

        async getPropertyValue(propertyName: string) {
            return this.data ? this.data[propertyName] : undefined;
        }

        async updatePropertyValue(propertyName: string, newValue: any) {
            // Mock update - store the new value and call callback
            this.data[propertyName] = newValue;
            this.updateCallback(propertyName, newValue);
            return Promise.resolve();
        }

        getName() {
            return this.fileName;
        }

        getFile() {
            return {
                getName: (withExtension: boolean = true) => {
                    return withExtension ? this.fileName + '.md' : this.fileName;
                }
            };
        }

        getProperty(propertyName: string): any {
            if (propertyName === 'animateurs') {
                return {
                    name: 'animateurs',
                    type: 'object', // This should match the check in getPropertyDisplayForItem
                    properties: {
                        tarif: new NumberProperty('tarif', mockVault, '€'),
                        etat: new SelectProperty('etat', mockVault, [
                            { name: 'Non payé', color: 'red' },
                            { name: 'Facturé', color: 'orange' },
                            { name: 'Payé', color: 'green' }
                        ])
                    }
                };
            }
            return null;
        }

        getUpdateCallback() {
            return this.updateCallback;
        }

        getCurrentData() {
            return this.data;
        }
    }

    test('should update property values when using fillDisplay callbacks', async () => {
        console.log('🧪 Testing property updates in DynamicTable...');
        
        const testFile = new TestFile({
            nom: 'Test Animation',
            animateurs: [
                { animateur: 'test-file', tarif: 1500, etat: 'Non payé' }
            ]
        }, 'test-file');

        const currentFile = new TestFile({}, 'test-file');

        const table = new DynamicTable([testFile as any], {}, mockVault, currentFile as any);
        
        // Get the display element for tarif property
        const tarifElement = await (table as any).getNestedPropertyDisplay(testFile, 'animateurs.filter(animateur=$current).tarif');
        expect(tarifElement.textContent).toMatch(/1\s?500/);
        
        // Try to get the property display for the item to test the update mechanism
        const arrayProperty = testFile.getProperty('animateurs');
        const arrayValue = await testFile.getPropertyValue('animateurs');
        const item = arrayValue[0];
        
        // Get the property display element (this creates the fillDisplay with update callback)
        const propertyDisplayElement = await (table as any).getPropertyDisplayForItem(testFile, arrayProperty, item, 'tarif');
        expect(propertyDisplayElement).not.toBeNull();
        
        // Simulate a property update by calling the internal update method directly
        // In real usage, this would be triggered by user interaction with the property display
        await (table as any).updateItemProperty(testFile, arrayProperty, item, 'tarif', 2000);
        
        // Verify the update was called
        const updateCallback = testFile.getUpdateCallback();
        expect(updateCallback).toHaveBeenCalledWith('animateurs', expect.any(Array));
        
        // Verify the data was updated in the file
        const updatedData = testFile.getCurrentData();
        expect(updatedData.animateurs[0].tarif).toBe(2000);
        
        // Verify the item object was updated in place
        expect(item.tarif).toBe(2000);
        
        console.log('✅ Property update test completed successfully');
        console.log('✅ Original tarif: 1500, Updated tarif:', updatedData.animateurs[0].tarif);
    });

    test('should handle updates for different property types', async () => {
        console.log('🧪 Testing updates for different property types...');
        
        const testFile = new TestFile({
            animateurs: [
                { animateur: 'test-file', tarif: 1500, etat: 'Non payé' }
            ]
        }, 'test-file');

        const currentFile = new TestFile({}, 'test-file');
        const table = new DynamicTable([testFile as any], {}, mockVault, currentFile as any);
        
        const arrayProperty = testFile.getProperty('animateurs');
        const arrayValue = await testFile.getPropertyValue('animateurs');
        const item = arrayValue[0];
        
        // Test NumberProperty update
        await (table as any).updateItemProperty(testFile, arrayProperty, item, 'tarif', 2500);
        expect(testFile.getCurrentData().animateurs[0].tarif).toBe(2500);
        
        // Test SelectProperty update
        await (table as any).updateItemProperty(testFile, arrayProperty, item, 'etat', 'Payé');
        expect(testFile.getCurrentData().animateurs[0].etat).toBe('Payé');
        
        // Verify both updates were saved
        const updateCallback = testFile.getUpdateCallback();
        expect(updateCallback).toHaveBeenCalledTimes(2);
        
        console.log('✅ Multiple property type updates completed');
        console.log('✅ Final data:', JSON.stringify(testFile.getCurrentData().animateurs[0], null, 2));
    });
});