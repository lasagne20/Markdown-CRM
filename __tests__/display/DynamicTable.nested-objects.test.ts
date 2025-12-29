import { DynamicTable } from '../../src/display/DynamicTable';
import { SelectProperty } from '../../src/properties/SelectProperty';
import { NumberProperty } from '../../src/properties/NumberProperty';
import { TextProperty } from '../../src/properties/TextProperty';

describe('DynamicTable - Nested Objects and SelectProperty', () => {
    // Mock vault with complete app structure
    const mockVault = {
        app: { 
            open: jest.fn(),
            setIcon: jest.fn()
        }
    } as any;

    class TestFile {
        private data: any;
        private fileName: string;

        constructor(data: any, fileName: string) {
            this.data = { ...data };
            this.fileName = fileName;
        }

        async getPropertyValue(propertyName: string) {
            return this.data ? this.data[propertyName] : undefined;
        }

        async updatePropertyValue(propertyName: string, newValue: any) {
            this.data[propertyName] = newValue;
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
            if (propertyName === 'projets') {
                return {
                    name: 'projets',
                    type: 'object',
                    properties: {
                        nom: new TextProperty('nom', mockVault),
                        budget: new NumberProperty('budget', mockVault, '€'),
                        statut: new SelectProperty('statut', mockVault, [
                            { name: 'En attente', color: 'yellow' },
                            { name: 'En cours', color: 'blue' },
                            { name: 'Terminé', color: 'green' },
                            { name: 'Annulé', color: 'red' }
                        ]),
                        contact: new SelectProperty('contact', mockVault, [
                            { name: 'Jean Dupont', color: 'blue' },
                            { name: 'Marie Martin', color: 'purple' },
                            { name: 'Pierre Durand', color: 'orange' }
                        ])
                    }
                };
            }
            return null;
        }
    }

    test('should properly display SelectProperty values in nested objects', async () => {
        console.log('🧪 Testing SelectProperty display in nested objects...');
        
        const testFile = new TestFile({
            nom: 'Projet Principal',
            projets: [
                { 
                    nom: 'Site Web', 
                    budget: 15000, 
                    statut: 'En cours',
                    contact: 'Jean Dupont'
                },
                { 
                    nom: 'App Mobile', 
                    budget: 25000, 
                    statut: 'En attente',
                    contact: 'Marie Martin'
                }
            ]
        }, 'projet-principal');

        const currentFile = new TestFile({}, 'projet-principal');

        const table = new DynamicTable([testFile as any], {}, mockVault, currentFile as any);
        
        // Test direct property access first
        const projetsProperty = testFile.getProperty('projets');
        expect(projetsProperty).not.toBeNull();
        expect(projetsProperty.properties.statut).toBeInstanceOf(SelectProperty);
        
        // Test that the SelectProperty has the correct options
        const statutProperty = projetsProperty.properties.statut;
        console.log('🔍 Statut property options:', statutProperty.options);
        
        // Test nested property display for first project
        const displayElement1 = await (table as any).getNestedPropertyDisplay(testFile, 'projets.filter(nom=Site Web).statut');
        console.log('✅ Site Web statut result:', displayElement1.textContent);
        console.log('✅ Site Web statut HTML:', displayElement1.outerHTML);
        
        // Test nested property display for second project  
        const displayElement2 = await (table as any).getNestedPropertyDisplay(testFile, 'projets.filter(nom=App Mobile).statut');
        console.log('✅ App Mobile statut result:', displayElement2.textContent);
        console.log('✅ App Mobile statut HTML:', displayElement2.outerHTML);
        
        // Test contact property as well
        const contactElement1 = await (table as any).getNestedPropertyDisplay(testFile, 'projets.filter(nom=Site Web).contact');
        console.log('✅ Site Web contact result:', contactElement1.textContent);
        
        // Verify the SelectProperty values are properly displayed
        expect(displayElement1.textContent).toContain('En cours');
        expect(displayElement2.textContent).toContain('En attente');
        expect(contactElement1.textContent).toContain('Jean Dupont');
        
        console.log('✅ SelectProperty in nested objects test completed');
    });

    test('should handle complex nested object updates', async () => {
        console.log('🧪 Testing complex nested object updates...');
        
        const testFile = new TestFile({
            projets: [
                { 
                    nom: 'Site Web', 
                    budget: 15000, 
                    statut: 'En attente',
                    contact: 'Jean Dupont'
                }
            ]
        }, 'test-project');

        const table = new DynamicTable([testFile as any], {}, mockVault);
        
        const projetsProperty = testFile.getProperty('projets');
        const projetsValue = await testFile.getPropertyValue('projets');
        const item = projetsValue[0];
        
        // Test updating SelectProperty value
        await (table as any).updateItemProperty(testFile, projetsProperty, item, 'statut', 'En cours');
        
        // Verify the update
        const updatedData = await testFile.getPropertyValue('projets');
        expect(updatedData[0].statut).toBe('En cours');
        
        // Test that the display now shows the updated value
        const updatedDisplayElement = await (table as any).getNestedPropertyDisplay(testFile, 'projets.filter(nom=Site Web).statut');
        expect(updatedDisplayElement.textContent).toContain('En cours');
        
        console.log('✅ Complex nested object update test completed');
        console.log('✅ Updated status:', updatedData[0].statut);
    });
});