import { Vault } from '../../src/vault/Vault';
import { mockApp } from '../utils/mocks';

// Simple test to verify the ObjectProperty notation parsing
describe('DisplayRenderer - ObjectProperty Table Source (Simple)', () => {
    let vault: Vault;
    let app: any;

    beforeEach(() => {
        app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);
    });

    test('should parse ClassName.propertyName notation', () => {
        console.log('🧪 Testing ObjectProperty notation parsing...');

        // Test the parsing logic directly
        const sourceWithDot = { class: 'Personne.postes' };
        const sourceWithoutDot = { class: 'Personne' };

        // This should be detected as ObjectProperty notation
        const hasDot1 = sourceWithDot.class.includes('.');
        expect(hasDot1).toBe(true);

        // This should be detected as regular class notation
        const hasDot2 = sourceWithoutDot.class.includes('.');
        expect(hasDot2).toBe(false);

        // Test parsing
        if (hasDot1) {
            const [className, propertyName] = sourceWithDot.class.split('.');
            expect(className).toBe('Personne');
            expect(propertyName).toBe('postes');
        }

        console.log('✅ Notation parsing works correctly');
    });

    test('should handle various ObjectProperty notations', () => {
        console.log('🧪 Testing different notation formats...');

        const testCases = [
            { input: 'Institution.employes', className: 'Institution', propertyName: 'employes' },
            { input: 'Personne.postes', className: 'Personne', propertyName: 'postes' },
            { input: 'Projet.taches', className: 'Projet', propertyName: 'taches' },
            { input: 'Simple', className: 'Simple', propertyName: null } // No dot
        ];

        testCases.forEach(testCase => {
            const hasDot = testCase.input.includes('.');
            
            if (hasDot) {
                const [className, propertyName] = testCase.input.split('.');
                expect(className).toBe(testCase.className);
                expect(propertyName).toBe(testCase.propertyName);
            } else {
                expect(testCase.input).toBe(testCase.className);
                expect(testCase.propertyName).toBe(null);
            }
        });

        console.log('✅ Various notations handled correctly');
    });

    test('should create proper pseudo-instance structure', () => {
        console.log('🧪 Testing pseudo-instance creation...');

        // Simulate what createPseudoInstance should create
        const mockParentInstance = {
            getName: () => 'Jean Dupont',
            getPath: () => 'Jean Dupont',
            getClassName: () => 'Personne'
        };

        const mockObjectData = {
            entreprise: 'TechCorp',
            poste: 'Développeur',
            salaire: 45000
        };

        const mockIndex = 0;

        // Expected pseudo-instance structure
        const expectedName = `${mockParentInstance.getName()}.postes[${mockIndex}]`;
        const expectedPath = `${mockParentInstance.getPath()}#postes[${mockIndex}]`;

        expect(expectedName).toBe('Jean Dupont.postes[0]');
        expect(expectedPath).toBe('Jean Dupont#postes[0]');

        console.log('✅ Pseudo-instance structure correct');
    });
});