import { DisplayRenderer } from '../../src/display/DisplayRenderer';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { mockApp } from '../utils/mocks';

describe('DisplayRenderer - ObjectProperty Table Integration', () => {
    let vault: Vault;
    let app: any;
    let renderer: DisplayRenderer;

    beforeEach(() => {
        app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);
        
        const mockFactory = {
            getAllInstancesForClass: jest.fn()
        };
        vault.getDynamicClassFactory = jest.fn().mockReturnValue(mockFactory);
        
        renderer = new DisplayRenderer(vault, {}, [], async () => {});
    });

    test('should handle complex ObjectProperty scenario with real-world data', async () => {
        console.log('🌟 Running complete ObjectProperty integration test...');

        // Create realistic Personne instances
        const jean = createPersonne('Jean Dupont');
        const marie = createPersonne('Marie Martin');
        const paul = createPersonne('Paul Durand');

        // Create realistic ObjectProperty data
        const mockObjectProperty = {
            type: 'object',
            read: jest.fn()
        };

        // Set up postes data for each person
        const postesData: { [key: string]: any[] } = {
            'Jean Dupont': [
                { entreprise: 'TechStart', poste: 'Développeur Junior', salaire: 35000, dateDebut: '2020-01-15' },
                { entreprise: 'InnovateCorp', poste: 'Développeur Senior', salaire: 55000, dateDebut: '2022-03-01' }
            ],
            'Marie Martin': [
                { entreprise: 'DesignPro', poste: 'UX Designer', salaire: 45000, dateDebut: '2019-06-01' },
                { entreprise: 'CreativeHub', poste: 'Lead Designer', salaire: 65000, dateDebut: '2021-09-15' },
                { entreprise: 'TechStart', poste: 'Design Manager', salaire: 75000, dateDebut: '2023-01-10' }
            ],
            'Paul Durand': [
                { entreprise: 'ManageCorp', poste: 'Chef de Projet', salaire: 60000, dateDebut: '2018-03-01' }
            ]
        };

        // Configure each person's postes property
        [jean, marie, paul].forEach(person => {
            person.getProperty.mockImplementation((propName: string) => {
                if (propName === 'postes') return mockObjectProperty;
                return null;
            });
        });

        // Mock ObjectProperty read method
        mockObjectProperty.read.mockImplementation(async (instance: Classe) => {
            const name = instance.getName();
            return postesData[name] || [];
        });

        // Configure factory
        const mockFactory = vault.getDynamicClassFactory();
        (mockFactory as any).getAllInstancesForClass.mockResolvedValue([jean, marie, paul]);

        // Test 1: Basic ObjectProperty extraction
        console.log('\n📋 Test 1: Basic extraction');
        const basicSource = {
            class: 'Personne.postes',
            smartFilter: 'all'
        };

        const allPostes = await (renderer as any).getFilesForTable(basicSource);
        console.log(`Found ${allPostes.length} total postes`);
        
        expect(allPostes).toHaveLength(6); // 2 + 3 + 1 postes
        
        // Verify structure of extracted items
        const firstPoste = allPostes[0];
        expect(firstPoste.getName()).toMatch(/^Jean Dupont\.postes\[\d+\]$/);
        expect(firstPoste._objectData.entreprise).toBeDefined();
        expect(firstPoste._parentInstance.getName()).toBe('Jean Dupont');

        // Test 2: Property access on pseudo-instances
        console.log('\n🔍 Test 2: Property access');
        const entrepriseProp = firstPoste.getProperty('entreprise');
        expect(entrepriseProp).toBeDefined();
        
        const entrepriseValue = await entrepriseProp.read();
        expect(entrepriseValue).toBe(firstPoste._objectData.entreprise);

        const fileNameProp = firstPoste.getProperty('_fileName');
        const fileName = await fileNameProp.read();
        expect(fileName).toBe(firstPoste.getName());

        // Test 3: Filtering with conditions
        console.log('\n⚡ Test 3: Condition filtering');
        
        // Mock condition manager for salary filtering
        vault.conditionManager = {
            createValidationFunction: jest.fn().mockImplementation((conditions) => {
                return async (item: any) => {
                    const salaireProp = item.getProperty('salaire');
                    const salaire = await salaireProp.read();
                    return salaire >= 60000; // High salary positions
                };
            })
        } as any;

        const filteredSource = {
            class: 'Personne.postes',
            conditions: [{ property: 'salaire', type: 'greaterThanOrEqual', value: 60000 }]
        };

        const highSalaryPostes = await (renderer as any).getFilesForTable(filteredSource);
        console.log(`Found ${highSalaryPostes.length} high-salary postes`);
        
        expect(highSalaryPostes.length).toBeGreaterThan(0);
        
        // Verify all returned items meet the condition
        for (const poste of highSalaryPostes) {
            expect(poste._objectData.salaire).toBeGreaterThanOrEqual(60000);
        }

        // Test 4: SmartFilter with current instance
        console.log('\n🎯 Test 4: SmartFilter children');
        
        // Create institution with employees
        const techStart = {
            getName: () => 'TechStart',
            findChildren: jest.fn().mockResolvedValue([jean, marie])
        } as any;

        const childrenSource = {
            class: 'Personne.postes',
            smartFilter: 'children'
        };

        const employeePostes = await (renderer as any).getFilesForTable(childrenSource, techStart);
        console.log(`Found ${employeePostes.length} postes from employees`);
        
        expect(employeePostes.length).toBeGreaterThan(0);
        
        // Should only include postes from jean and marie (employees)
        const parentNames = employeePostes.map((p: any) => p._parentInstance.getName());
        expect(parentNames).toContain('Jean Dupont');
        expect(parentNames).toContain('Marie Martin');
        expect(parentNames).not.toContain('Paul Durand'); // Not an employee

        console.log('\n✅ Complete ObjectProperty integration test passed!');
        console.log('🎉 Users can now use "ClassName.propertyName" notation in table sources');
    });

    test('should handle edge cases and error scenarios', async () => {
        console.log('🛡️ Testing edge cases...');

        const mockFactory = vault.getDynamicClassFactory();

        // Test 1: Non-existent property
        const person = createPersonne('Test Person');
        person.getProperty.mockReturnValue(null); // Property doesn't exist
        (mockFactory as any).getAllInstancesForClass.mockResolvedValue([person]);

        const invalidSource = {
            class: 'Personne.nonExistentProperty',
            smartFilter: 'all'
        };

        const result1 = await (renderer as any).getFilesForTable(invalidSource);
        expect(result1).toHaveLength(0); // Should handle gracefully

        // Test 2: Empty ObjectProperty
        person.getProperty.mockImplementation((propName: string) => {
            if (propName === 'emptyProperty') {
                return {
                    type: 'object',
                    read: jest.fn().mockResolvedValue([]) // Empty array
                };
            }
            return null;
        });

        const emptySource = {
            class: 'Personne.emptyProperty',
            smartFilter: 'all'
        };

        const result2 = await (renderer as any).getFilesForTable(emptySource);
        expect(result2).toHaveLength(0); // Should handle empty arrays

        // Test 3: Invalid object structure in ObjectProperty
        person.getProperty.mockImplementation((propName: string) => {
            if (propName === 'invalidProperty') {
                return {
                    type: 'object',
                    read: jest.fn().mockResolvedValue([
                        null, // Invalid entry
                        undefined, // Invalid entry
                        { valid: 'entry' } // Valid entry
                    ])
                };
            }
            return null;
        });

        const invalidObjectSource = {
            class: 'Personne.invalidProperty',
            smartFilter: 'all'
        };

        const result3 = await (renderer as any).getFilesForTable(invalidObjectSource);
        expect(result3).toHaveLength(1); // Should filter out invalid entries

        console.log('✅ Edge cases handled properly');
    });

    function createPersonne(name: string): any {
        return {
            getName: () => name,
            getPath: () => name,
            getClassName: () => 'Personne',
            getProperty: jest.fn()
        };
    }
});