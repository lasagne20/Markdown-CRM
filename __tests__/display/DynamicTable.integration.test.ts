import { DynamicTable, TableConfig } from '../../src/display/DynamicTable';
import { Classe } from '../../src/vault/Classe';
import { Vault } from '../../src/vault/Vault';

/**
 * Test d'intégration réel pour valider le fonctionnement des propriétés imbriquées
 * Utilise des objets réels et non des mocks pour détecter les vrais problèmes
 */

class MockVaultIntegration {
    getPath(): string {
        return '/mock/vault/path';
    }
    
    getName(): string {
        return 'MockVault';
    }

    getConfiguration() {
        return {
            locale: {
                currency: 'EUR',
                currencySymbol: '€',
                number: {
                    decimal: ',',
                    thousands: ' '
                }
            }
        };
    }
}

class MockFile {
    private data: any;
    private fileName: string;

    constructor(data: any, fileName: string) {
        this.data = data;
        this.fileName = fileName;
    }

    getName(withExtension: boolean = true): string {
        return withExtension ? `${this.fileName}.md` : this.fileName;
    }

    get name(): string {
        return `${this.fileName}.md`;
    }

    get basename(): string {
        return this.fileName;
    }
}

class RealClasseTest extends Classe {
    private metadata: any;
    private file: MockFile;

    constructor(metadata: any, fileName: string) {
        super(null as any, null as any);
        this.metadata = metadata;
        this.file = new MockFile(metadata, fileName);
    }

    async getMetadata(): Promise<any> {
        return this.metadata;
    }

    async getPropertyValue(propertyName: string): Promise<any> {
        console.log(`🔍 Accessing property: ${propertyName} on file: ${this.file.getName(false)}`);
        const result = this.metadata[propertyName];
        console.log(`📄 Raw value for ${propertyName}:`, result);
        return result;
    }

    getFile(): MockFile {
        return this.file;
    }

    getProperty(propertyName: string) {
        // Pour ces tests, on retourne null pour forcer l'utilisation du fallback text
        return null;
    }
}

describe('DynamicTable - Real Integration Tests', () => {
    let mockFiles: RealClasseTest[];
    let mockVault: MockVaultIntegration;

    beforeEach(() => {
        // Données de test réalistes avec structure imbriquée
        mockFiles = [
            new RealClasseTest({
                nom: 'Entreprise Alpha',
                // Objet simple (pas array)
                partenariats: {
                    partenariat: 'Partenaire Simple',
                    montant: 15000,
                    statut: 'current'
                },
                // Array d'objets 
                partenariatsArray: [
                    { partenariat: 'Partenaire A1', montant: 10000, statut: 'current' },
                    { partenariat: 'Partenaire A2', montant: 5000, statut: 'pending' },
                    { partenariat: 'Partenaire A3', montant: 8000, statut: 'current' }
                ]
            }, 'entreprise-alpha'),

            new RealClasseTest({
                nom: 'Entreprise Beta',
                partenariats: {
                    partenariat: 'Partenaire Beta',
                    montant: 25000,
                    statut: 'pending'
                },
                partenariatsArray: [
                    { partenariat: 'Partenaire B1', montant: 12000, statut: 'current' }
                ]
            }, 'entreprise-beta'),

            new RealClasseTest({
                nom: 'Entreprise Gamma',
                // Pas de partenariats
                partenariatsArray: []
            }, 'entreprise-gamma'),
        ];

        mockVault = new MockVaultIntegration();
    });

    describe('Simple nested properties (object.property)', () => {
        test('should access simple nested property values correctly', async () => {
            console.log('🧪 Testing simple nested property access...');
            
            const tableConfig: TableConfig = {
                columns: [
                    { name: 'Nom', propertyName: 'nom' },
                    { name: 'Partenaire', propertyName: 'partenariats.partenariat' },
                    { name: 'Montant', propertyName: 'partenariats.montant' }
                ]
            };

            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            const getNestedPropertyValue = (table as any).getNestedPropertyValue.bind(table);

            // Test accès aux propriétés simples imbriquées
            const nom = await getNestedPropertyValue(mockFiles[0], 'nom');
            console.log('✅ Nom result:', nom);
            expect(nom).toBe('Entreprise Alpha');

            const partenaire = await getNestedPropertyValue(mockFiles[0], 'partenariats.partenariat');
            console.log('✅ Partenaire result:', partenaire);
            expect(partenaire).toBe('Partenaire Simple');

            const montant = await getNestedPropertyValue(mockFiles[0], 'partenariats.montant');
            console.log('✅ Montant result:', montant);
            expect(montant).toBe(15000);
        });

        test('should handle missing nested properties gracefully', async () => {
            console.log('🧪 Testing missing nested properties...');
            
            const tableConfig: TableConfig = {
                columns: [{ name: 'Missing', propertyName: 'partenariats.inexistant' }]
            };

            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            const getNestedPropertyValue = (table as any).getNestedPropertyValue.bind(table);

            // Entreprise Gamma n'a pas de propriété partenariats
            const result = await getNestedPropertyValue(mockFiles[2], 'partenariats.montant');
            console.log('✅ Missing property result:', result);
            expect(result).toBeUndefined();
        });
    });

    describe('Array filtering (array.filter(prop=value).target)', () => {
        test('should filter array and sum numeric values', async () => {
            console.log('🧪 Testing array filtering with sum...');
            
            const tableConfig: TableConfig = {
                columns: [
                    { name: 'Current Montant', propertyName: 'partenariatsArray.filter(statut=current).montant' }
                ]
            };

            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            const getNestedPropertyValue = (table as any).getNestedPropertyValue.bind(table);

            // Entreprise Alpha: 2 current partnerships (10000 + 8000 = 18000)
            const result = await getNestedPropertyValue(mockFiles[0], 'partenariatsArray.filter(statut=current).montant');
            console.log('✅ Filtered sum result:', result);
            expect(result).toBe(18000);
        });

        test('should filter array and concatenate string values', async () => {
            console.log('🧪 Testing array filtering with string concatenation...');
            
            const tableConfig: TableConfig = {
                columns: [
                    { name: 'Current Partners', propertyName: 'partenariatsArray.filter(statut=current).partenariat' }
                ]
            };

            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            const getNestedPropertyValue = (table as any).getNestedPropertyValue.bind(table);

            // Entreprise Alpha: 2 current partnerships
            const result = await getNestedPropertyValue(mockFiles[0], 'partenariatsArray.filter(statut=current).partenariat');
            console.log('✅ Filtered concatenation result:', result);
            expect(result).toBe('Partenaire A1, Partenaire A3');
        });

        test('should return undefined when no array elements match filter', async () => {
            console.log('🧪 Testing array filtering with no matches...');
            
            const tableConfig: TableConfig = {
                columns: [
                    { name: 'Completed', propertyName: 'partenariatsArray.filter(statut=completed).montant' }
                ]
            };

            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            const getNestedPropertyValue = (table as any).getNestedPropertyValue.bind(table);

            // Aucun partenariat avec statut 'completed'
            const result = await getNestedPropertyValue(mockFiles[0], 'partenariatsArray.filter(statut=completed).montant');
            console.log('✅ No matches result:', result);
            expect(result).toBeUndefined();
        });

        test('should handle empty arrays', async () => {
            console.log('🧪 Testing empty array handling...');
            
            const tableConfig: TableConfig = {
                columns: [
                    { name: 'Empty', propertyName: 'partenariatsArray.filter(statut=current).montant' }
                ]
            };

            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            const getNestedPropertyValue = (table as any).getNestedPropertyValue.bind(table);

            // Entreprise Gamma a un array vide
            const result = await getNestedPropertyValue(mockFiles[2], 'partenariatsArray.filter(statut=current).montant');
            console.log('✅ Empty array result:', result);
            expect(result).toBeUndefined();
        });

        test('should be case insensitive in filtering', async () => {
            console.log('🧪 Testing case insensitive filtering...');
            
            const tableConfig: TableConfig = {
                columns: [
                    { name: 'Case Test', propertyName: 'partenariatsArray.filter(statut=CURRENT).montant' }
                ]
            };

            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            const getNestedPropertyValue = (table as any).getNestedPropertyValue.bind(table);

            // Test avec CURRENT en majuscules
            const result = await getNestedPropertyValue(mockFiles[0], 'partenariatsArray.filter(statut=CURRENT).montant');
            console.log('✅ Case insensitive result:', result);
            expect(result).toBe(18000);
        });
    });

    describe('Integration with table operations', () => {
        test('should work with calculateTotal for nested properties', async () => {
            console.log('🧪 Testing totals with nested properties...');
            
            const tableConfig: TableConfig = {
                columns: [
                    { name: 'Montant', propertyName: 'partenariats.montant' }
                ],
                totals: [
                    { formula: 'sum', propertyName: 'partenariats.montant', column: 'Total Simple' }
                ]
            };

            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            const calculateTotal = (table as any).calculateTotal.bind(table);

            const totalConfig = { 
                formula: 'sum', 
                propertyName: 'partenariats.montant', 
                column: 'Total Simple' 
            };

            const result = await calculateTotal(totalConfig);
            console.log('✅ Total simple result:', result);
            
            // Alpha: 15000, Beta: 25000, Gamma: undefined => 40000 total
            expect(result).toContain('40');
            expect(result).toContain('000');
        });

        test('should work with calculateTotal for filtered arrays', async () => {
            console.log('🧪 Testing totals with filtered arrays...');
            
            const tableConfig: TableConfig = {
                columns: [
                    { name: 'Current', propertyName: 'partenariatsArray.filter(statut=current).montant' }
                ],
                totals: [
                    { formula: 'sum', propertyName: 'partenariatsArray.filter(statut=current).montant', column: 'Total Current' }
                ]
            };

            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            const calculateTotal = (table as any).calculateTotal.bind(table);

            const totalConfig = { 
                formula: 'sum', 
                propertyName: 'partenariatsArray.filter(statut=current).montant', 
                column: 'Total Current' 
            };

            const result = await calculateTotal(totalConfig);
            console.log('✅ Total filtered result:', result);
            
            // Alpha: 18000, Beta: 12000, Gamma: undefined => 30000 total
            expect(result).toContain('30');
            expect(result).toContain('000');
        });
    });
});