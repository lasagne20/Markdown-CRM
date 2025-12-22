import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { TextProperty } from '../../src/properties/TextProperty';
import { Vault } from '../../src/vault/Vault';
import { mockApp } from '../utils/mocks';

describe('ObjectProperty - Nested ObjectProperty Display', () => {
    let vault: Vault;
    let app: any;

    beforeEach(() => {
        app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);
    });

    it('should create unique container identifiers for nested ObjectProperty', async () => {
        // Create nested ObjectProperty structure
        // Inner ObjectProperty
        const innerProperties = {
            name: new TextProperty('name', vault),
            value: new TextProperty('value', vault)
        };

        const innerObjectProp = new ObjectProperty('details', vault, innerProperties);

        // Outer ObjectProperty containing the inner one
        const outerProperties = {
            title: new TextProperty('title', vault),
            details: innerObjectProp
        };

        const outerObjectProp = new ObjectProperty('items', vault, outerProperties);

        // Create two objects with nested data
        const testData = [
            {
                title: 'First Item',
                details: [
                    { name: 'Detail 1A', value: 'Value 1A' },
                    { name: 'Detail 1B', value: 'Value 1B' }
                ]
            },
            {
                title: 'Second Item',
                details: [
                    { name: 'Detail 2A', value: 'Value 2A' },
                    { name: 'Detail 2B', value: 'Value 2B' }
                ]
            }
        ];

        const mockUpdate = jest.fn();

        // Create displays for both objects
        const display1 = outerObjectProp.fillDisplay(testData, mockUpdate);
        
        // Get all containers created
        const containers1 = display1.querySelectorAll('.metadata-object-container');
        const containerClasses1: string[] = [];
        containers1.forEach((container: Element) => {
            container.classList.forEach(className => {
                if (className.startsWith('metadata-object-container-')) {
                    containerClasses1.push(className);
                }
            });
        });

        console.log('First display container classes:', containerClasses1);

        // Create second display
        const display2 = outerObjectProp.fillDisplay(testData, mockUpdate);
        
        const containers2 = display2.querySelectorAll('.metadata-object-container');
        const containerClasses2: string[] = [];
        containers2.forEach((container: Element) => {
            container.classList.forEach(className => {
                if (className.startsWith('metadata-object-container-')) {
                    containerClasses2.push(className);
                }
            });
        });

        console.log('Second display container classes:', containerClasses2);

        // The problem: both displays will have identical container class names
        // This means the nested ObjectProperty "details" will have the same class in both
        // When we have nested ObjectProperty, each instance should have unique identifiers
        
        // Count how many 'details' containers we have
        const detailsContainers1 = containerClasses1.filter(c => c.includes('details'));
        const detailsContainers2 = containerClasses2.filter(c => c.includes('details'));
        
        console.log('Details containers in display 1:', detailsContainers1);
        console.log('Details containers in display 2:', detailsContainers2);
        
        // We should have nested details containers (one for each parent object item)
        expect(detailsContainers1.length).toBeGreaterThan(0);
        expect(detailsContainers2.length).toBeGreaterThan(0);
        
        // Each should be unique within its parent display
        // The current bug is they're all using the same class name "metadata-object-container-details"
        // which causes conflicts when trying to target specific instances
        
        // This will fail: all details containers have the same class
        const uniqueDetailsContainers1 = new Set(detailsContainers1);
        const uniqueDetailsContainers2 = new Set(detailsContainers2);
        
        // This assertion should fail with current code, revealing the bug
        // Each nested ObjectProperty instance should have a unique identifier
        expect(uniqueDetailsContainers1.size).toBe(detailsContainers1.length);
        expect(uniqueDetailsContainers2.size).toBe(detailsContainers2.length);
    });
});
