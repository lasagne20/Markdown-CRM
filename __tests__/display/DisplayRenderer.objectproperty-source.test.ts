import { DisplayRenderer } from '../../src/display/DisplayRenderer';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { TextProperty } from '../../src/properties/TextProperty';
import { mockApp } from '../utils/mocks';

describe('DisplayRenderer - ObjectProperty Table Source', () => {
    let vault: Vault;
    let app: any;
    let renderer: DisplayRenderer;

    beforeEach(() => {
        app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);
        
        // Mock getDynamicClassFactory
        const mockFactory = {
            getAllInstancesForClass: jest.fn()
        };
        vault.getDynamicClassFactory = jest.fn().mockReturnValue(mockFactory);
        
        renderer = new DisplayRenderer(vault, {}, [], async () => {});
    });

    test('should extract objects from ObjectProperty using ClassName.propertyName notation', async () => {
        console.log('🧪 Testing ObjectProperty table source...');

        // Create mock instances with ObjectProperty data
        const personne1 = {
            getName: () => 'Jean Dupont',
            getPath: () => 'Jean Dupont',
            getClassName: () => 'Personne',
            getProperty: jest.fn()
        } as any;

        const personne2 = {
            getName: () => 'Marie Martin',
            getPath: () => 'Marie Martin', 
            getClassName: () => 'Personne',
            getProperty: jest.fn()
        } as any;

        // Mock ObjectProperty with postes data
        const mockPostesProperty = {
            type: 'object',
            read: jest.fn()
        };

        // Mock postes data for each person
        const postesJean = [
            { entreprise: 'TechCorp', poste: 'Développeur', salaire: 45000 },
            { entreprise: 'StartupXYZ', poste: 'CTO', salaire: 80000 }
        ];

        const postesMarie = [
            { entreprise: 'DesignCo', poste: 'Designer', salaire: 40000 }
        ];

        personne1.getProperty.mockImplementation((propName: string) => {
            if (propName === 'postes') return mockPostesProperty;
            return null;
        });

        personne2.getProperty.mockImplementation((propName: string) => {
            if (propName === 'postes') return mockPostesProperty;
            return null;
        });

        // Mock property read to return different data for each person
        mockPostesProperty.read.mockImplementation(async (instance: Classe) => {
            if (instance === personne1) return postesJean;
            if (instance === personne2) return postesMarie;
            return [];
        });

        // Mock factory to return our test instances
        const mockFactory = vault.getDynamicClassFactory();
        (mockFactory as any).getAllInstancesForClass.mockResolvedValue([personne1, personne2]);

        // Configure source to use ObjectProperty notation
        const source = {
            class: 'Personne.postes', // This should extract all postes from all Personne instances
            smartFilter: 'all'
        };

        // Call getFilesForTable via reflection (private method)
        const result = await (renderer as any).getFilesForTable(source);

        console.log('📊 Results:');
        console.log(`- Found ${result.length} ObjectProperty items`);
        result.forEach((item: any, index: number) => {
            console.log(`  ${index + 1}. ${item.getName()} - ${item._objectData?.entreprise} (${item._objectData?.poste})`);
        });

        // Verify results
        expect(result).toHaveLength(3); // 2 postes from Jean + 1 poste from Marie

        // Check first item (Jean's first poste)
        expect(result[0].getName()).toBe('Jean Dupont.postes[0]');
        expect(result[0].getPath()).toBe('Jean Dupont#postes[0]');
        expect(result[0]._objectData.entreprise).toBe('TechCorp');
        expect(result[0]._objectData.poste).toBe('Développeur');

        // Check access to properties via getProperty
        const entrepriseProp = result[0].getProperty('entreprise');
        const entrepriseValue = await entrepriseProp.read();
        expect(entrepriseValue).toBe('TechCorp');

        // Check special _fileName property
        const fileNameProp = result[0].getProperty('_fileName');
        const fileName = await fileNameProp.read();
        expect(fileName).toBe('Jean Dupont.postes[0]');

        console.log('✅ ObjectProperty table source working correctly!');
    });

    test('should handle smartFilter with ObjectProperty notation', async () => {
        console.log('🧪 Testing smartFilter with ObjectProperty...');

        // Create current instance for children filter
        const currentInstitution = {
            getName: () => 'TechCorp',
            findChildren: jest.fn()
        } as any;
        
        // Mock children method to return employees
        const employee1 = {
            getName: () => 'Alice Smith',
            getClassName: () => 'Personne',
            getProperty: jest.fn()
        } as any;

        currentInstitution.findChildren.mockResolvedValue([employee1]);

        // Mock employee's postes property
        const mockPostesProperty = {
            type: 'object',
            read: jest.fn().mockResolvedValue([
                { entreprise: 'TechCorp', poste: 'Manager', salaire: 60000 }
            ])
        };

        employee1.getProperty.mockImplementation((propName: string) => {
            if (propName === 'postes') return mockPostesProperty;
            return null;
        });

        const source = {
            class: 'Personne.postes',
            smartFilter: 'children'
        };

        const result = await (renderer as any).getFilesForTable(source, currentInstitution);

        expect(result).toHaveLength(1);
        expect(result[0]._objectData.poste).toBe('Manager');
        expect(result[0]._parentInstance.getName()).toBe('Alice Smith');

        console.log('✅ SmartFilter with ObjectProperty working!');
    });

    test('should apply conditions to ObjectProperty items', async () => {
        console.log('🧪 Testing conditions with ObjectProperty items...');

        // Create mock instance
        const person = {
            getName: () => 'Test Person',
            getClassName: () => 'Personne',
            getProperty: jest.fn()
        } as any;

        // Mock ObjectProperty with different salaries
        const mockPostesProperty = {
            type: 'object',
            read: jest.fn().mockResolvedValue([
                { entreprise: 'CompanyA', poste: 'Junior Dev', salaire: 35000 },
                { entreprise: 'CompanyB', poste: 'Senior Dev', salaire: 65000 },
                { entreprise: 'CompanyC', poste: 'Manager', salaire: 85000 }
            ])
        };

        person.getProperty.mockImplementation((propName: string) => {
            if (propName === 'postes') return mockPostesProperty;
            return null;
        });

        const mockFactory = vault.getDynamicClassFactory();
        (mockFactory as any).getAllInstancesForClass.mockResolvedValue([person]);

        // Mock condition manager
        vault.conditionManager = {
            createValidationFunction: jest.fn().mockImplementation((conditions, currentInstance) => {
                return async (item: any) => {
                    // Simulate condition: salary > 50000
                    const salaireProp = item.getProperty('salaire');
                    const salaire = await salaireProp.read();
                    return salaire > 50000;
                };
            })
        } as any;

        const source = {
            class: 'Personne.postes',
            conditions: [
                { property: 'salaire', type: 'greaterThan', value: 50000 }
            ]
        };

        const result = await (renderer as any).getFilesForTable(source);

        // Should only return items with salary > 50000
        expect(result).toHaveLength(2); // Senior Dev (65000) and Manager (85000)
        expect(result[0]._objectData.salaire).toBeGreaterThan(50000);
        expect(result[1]._objectData.salaire).toBeGreaterThan(50000);

        console.log('✅ Conditions applied successfully to ObjectProperty items!');
    });
});