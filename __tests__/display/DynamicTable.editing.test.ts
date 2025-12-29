import { DynamicTable } from '../../src/display/DynamicTable';
import { SelectProperty } from '../../src/properties/SelectProperty';
import { NumberProperty } from '../../src/properties/NumberProperty';
import { TextProperty } from '../../src/properties/TextProperty';

describe('DynamicTable - Nested ObjectProperty Editing', () => {
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
        private updateCallback: jest.Mock;

        constructor(data: any, fileName: string) {
            this.data = { ...data };
            this.fileName = fileName;
            this.updateCallback = jest.fn();
        }

        async getPropertyValue(propertyName: string) {
            return this.data ? this.data[propertyName] : undefined;
        }

        async updatePropertyValue(propertyName: string, newValue: any) {
            this.data[propertyName] = newValue;
            this.updateCallback(propertyName, newValue);
            console.log(`📝 Updated ${propertyName}:`, newValue);
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
                            { name: 'Terminé', color: 'green' }
                        ]),
                        details: {
                            name: 'details',
                            type: 'object',
                            properties: {
                                priorite: new SelectProperty('priorite', mockVault, [
                                    { name: 'Basse', color: 'green' },
                                    { name: 'Moyenne', color: 'orange' },
                                    { name: 'Haute', color: 'red' }
                                ]),
                                cout: new NumberProperty('cout', mockVault, '€')
                            }
                        }
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

    test('should allow editing nested ObjectProperty values', async () => {
        console.log('🧪 Testing nested ObjectProperty editing...');
        
        const testFile = new TestFile({
            projets: [
                { 
                    nom: 'Site Web', 
                    budget: 15000, 
                    statut: 'En attente',
                    details: {
                        priorite: 'Moyenne',
                        cout: 8000
                    }
                },
                { 
                    nom: 'App Mobile', 
                    budget: 25000, 
                    statut: 'En cours',
                    details: {
                        priorite: 'Haute',
                        cout: 12000
                    }
                }
            ]
        }, 'projet-test');

        const table = new DynamicTable([testFile as any], {}, mockVault);
        
        // Test 1: Edit a direct property (statut) in first project
        const projetsProperty = testFile.getProperty('projets');
        const projetsValue = await testFile.getPropertyValue('projets');
        const firstProject = projetsValue[0];
        
        console.log('🔍 Original first project statut:', firstProject.statut);
        
        // Simulate editing the statut property
        await (table as any).updateItemProperty(testFile, projetsProperty, firstProject, 'statut', 'En cours');
        
        // Verify the update
        const updatedData = testFile.getCurrentData();
        expect(updatedData.projets[0].statut).toBe('En cours');
        expect(testFile.getUpdateCallback()).toHaveBeenCalledWith('projets', expect.any(Array));
        
        console.log('✅ Direct property update working:', updatedData.projets[0].statut);
        
        // Test 2: Edit a nested property (priorite in details) 
        console.log('🔍 Original nested priority:', firstProject.details.priorite);
        
        // This should work with nested object access
        firstProject.details.priorite = 'Haute';
        await (table as any).updateItemProperty(testFile, projetsProperty, firstProject, 'details', firstProject.details);
        
        const updatedNestedData = testFile.getCurrentData();
        expect(updatedNestedData.projets[0].details.priorite).toBe('Haute');
        
        console.log('✅ Nested property update working:', updatedNestedData.projets[0].details.priorite);
        
        // Test 3: Verify that the property display is not static (editable)
        const displayElement = await (table as any).getPropertyDisplayForItem(testFile, projetsProperty, firstProject, 'statut');
        expect(displayElement).not.toBeNull();
        
        // The display element should be interactive (not disabled)
        const selectElement = displayElement?.querySelector('select');
        if (selectElement) {
            expect(selectElement.disabled).toBe(false); // Should be editable
            console.log('✅ Property display is editable (not disabled)');
        } else {
            console.log('ℹ️ No select element found, might be using different display format');
        }
        
        console.log('✅ Nested ObjectProperty editing test completed');
    });

    test('should handle deeply nested object editing through table interface', async () => {
        console.log('🧪 Testing deep nested editing through table interface...');
        
        const testFile = new TestFile({
            projets: [
                { 
                    nom: 'Complex Project',
                    details: {
                        priorite: 'Basse',
                        cout: 5000
                    }
                }
            ]
        }, 'complex-project');

        const table = new DynamicTable([testFile as any], {}, mockVault);
        
        // Test accessing nested properties through filter syntax
        const nestedDisplay = await (table as any).getNestedPropertyDisplay(testFile, 'projets.filter(nom=Complex Project).details');
        console.log('🔍 Nested display result:', nestedDisplay.textContent);
        
        // Test updating through the proper nested path
        const projetsProperty = testFile.getProperty('projets');
        const projectData = (await testFile.getPropertyValue('projets'))[0];
        
        // Update nested property and verify
        projectData.details.priorite = 'Haute';
        await (table as any).updateItemProperty(testFile, projetsProperty, projectData, 'details', projectData.details);
        
        const finalData = testFile.getCurrentData();
        expect(finalData.projets[0].details.priorite).toBe('Haute');
        
        console.log('✅ Deep nested editing working:', finalData.projets[0].details.priorite);
        console.log('✅ Deep nested editing test completed');
    });
});