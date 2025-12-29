import { DynamicTable } from '../../src/display/DynamicTable';
import { SelectProperty } from '../../src/properties/SelectProperty';
import { NumberProperty } from '../../src/properties/NumberProperty';

describe('DynamicTable - ObjectProperty.properties Access', () => {
    // Mock vault
    const mockVault = {
        app: { open: jest.fn() }
    } as any;

    class TestFile {
        private data: any;
        private fileName: string;

        constructor(data: any, fileName: string) {
            this.data = data;
            this.fileName = fileName;
        }

        async getPropertyValue(propertyName: string) {
            return this.data ? this.data[propertyName] : undefined;
        }

        getName() {
            return this.fileName;
        }

        // Add getFile method to support $current resolution
        getFile() {
            return {
                getName: (withExtension: boolean = true) => {
                    return withExtension ? this.fileName + '.md' : this.fileName;
                }
            };
        }

        getProperty(propertyName: string): any {
            if (propertyName === 'animateurs') {
                // Return a structure like a real ObjectProperty
                return {
                    type: 'ObjectProperty',
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
    }

    test('should access ObjectProperty.properties directly for real property instances', async () => {
        console.log('🧪 Testing direct access to ObjectProperty.properties...');
        
        const testFile = new TestFile({
            nom: 'Test Animation',
            animateurs: [
                { animateur: 'test-file', tarif: 1500, etat: 'Payé' }
            ]
        }, 'test-file');

        const currentFile = new TestFile({}, 'test-file');

        const table = new DynamicTable([testFile as any], {}, mockVault, currentFile as any);
        
        // Test that the real Property instances are used for display
        const tarifElement = await (table as any).getNestedPropertyDisplay(testFile, 'animateurs.filter(animateur=$current).tarif');
        console.log('✅ Tarif result:', tarifElement.textContent);
        console.log('✅ Tarif element HTML:', tarifElement.outerHTML);
        
        const etatElement = await (table as any).getNestedPropertyDisplay(testFile, 'animateurs.filter(animateur=$current).etat');
        console.log('✅ Etat result:', etatElement.textContent);
        console.log('✅ Etat element HTML:', etatElement.outerHTML);
        
        // Should use the real Property instances (not just mock functions)
        expect(tarifElement.textContent).toMatch(/1\s?500/); // Accept French formatting with space
        expect(etatElement.textContent).toContain('Payé');
    });
});