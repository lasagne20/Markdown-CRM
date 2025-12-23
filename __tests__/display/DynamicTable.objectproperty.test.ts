import { DynamicTable, TableConfig } from '../../src/display/DynamicTable';
import { Classe } from '../../src/vault/Classe';

/**
 * Test pour valider le comportement avec des ObjectProperty réels (toujours des arrays)
 */
class MockVault {
    getPath(): string { return '/mock/vault/path'; }
    getName(): string { return 'MockVault'; }
    getConfiguration() {
        return {
            locale: { currency: 'EUR', currencySymbol: '€', number: { decimal: ',', thousands: ' ' } }
        };
    }
}

class MockFile {
    constructor(private fileName: string) {}
    getName(withExtension: boolean = true): string {
        return withExtension ? `${this.fileName}.md` : this.fileName;
    }
    get name(): string { return `${this.fileName}.md`; }
    get basename(): string { return this.fileName; }
}

class ObjectPropertyTestClass extends Classe {
    private metadata: any;
    private file: MockFile;

    constructor(metadata: any, fileName: string) {
        super(null as any, null as any);
        this.metadata = metadata;
        this.file = new MockFile(fileName);
    }

    async getMetadata(): Promise<any> { return this.metadata; }
    async getPropertyValue(propertyName: string): Promise<any> {
        console.log(`🔍 Getting property: ${propertyName} =`, this.metadata[propertyName]);
        return this.metadata[propertyName];
    }
    getFile(): MockFile { return this.file; }
    getProperty(propertyName: string) { return null; }
}

describe('DynamicTable - ObjectProperty Arrays', () => {
    let mockFiles: ObjectPropertyTestClass[];
    let mockVault: MockVault;

    beforeEach(() => {
        // Simule des vraies données ObjectProperty (toujours des arrays, même avec un élément)
        mockFiles = [
            new ObjectPropertyTestClass({
                nom: 'Entreprise A',
                // ObjectProperty avec UN élément - stocké comme array
                partenariats: [{
                    partenariat: 'Partenaire A',
                    montant: 15000,
                    statut: 'current'
                }]
            }, 'entreprise-a'),

            new ObjectPropertyTestClass({
                nom: 'Entreprise B',
                // ObjectProperty VIDE - array vide
                partenariats: []
            }, 'entreprise-b'),

            new ObjectPropertyTestClass({
                nom: 'Entreprise C',
                // Pas de propriété partenariats
                autre: 'valeur'
            }, 'entreprise-c'),

            new ObjectPropertyTestClass({
                nom: 'Entreprise D',
                // ObjectProperty avec PLUSIEURS éléments (vraiment un array)
                partenariats: [
                    { partenariat: 'Partenaire D1', montant: 10000, statut: 'current' },
                    { partenariat: 'Partenaire D2', montant: 5000, statut: 'pending' }
                ]
            }, 'entreprise-d'),
        ];

        mockVault = new MockVault();
    });

    describe('Single element ObjectProperty arrays', () => {
        test('should access property in single-element ObjectProperty array', async () => {
            console.log('🧪 Testing single element ObjectProperty array...');
            
            const tableConfig: TableConfig = {
                columns: [
                    { name: 'Partenaire', propertyName: 'partenariats.partenariat' },
                    { name: 'Montant', propertyName: 'partenariats.montant' }
                ]
            };

            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            const getNestedPropertyValue = (table as any).getNestedPropertyValue.bind(table);

            // Test avec Entreprise A qui a un ObjectProperty avec un seul élément
            const partenaire = await getNestedPropertyValue(mockFiles[0], 'partenariats.partenariat');
            console.log('✅ Partenaire result:', partenaire);
            expect(partenaire).toBe('Partenaire A');

            const montant = await getNestedPropertyValue(mockFiles[0], 'partenariats.montant');
            console.log('✅ Montant result:', montant);
            expect(montant).toBe(15000);
        });

        test('should return undefined for empty ObjectProperty array', async () => {
            console.log('🧪 Testing empty ObjectProperty array...');
            
            const tableConfig: TableConfig = {
                columns: [{ name: 'Montant', propertyName: 'partenariats.montant' }]
            };

            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            const getNestedPropertyValue = (table as any).getNestedPropertyValue.bind(table);

            // Test avec Entreprise B qui a un array vide
            const result = await getNestedPropertyValue(mockFiles[1], 'partenariats.montant');
            console.log('✅ Empty array result:', result);
            expect(result).toBeUndefined();
        });

        test('should return undefined for missing ObjectProperty', async () => {
            console.log('🧪 Testing missing ObjectProperty...');
            
            const tableConfig: TableConfig = {
                columns: [{ name: 'Montant', propertyName: 'partenariats.montant' }]
            };

            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            const getNestedPropertyValue = (table as any).getNestedPropertyValue.bind(table);

            // Test avec Entreprise C qui n'a pas de propriété partenariats
            const result = await getNestedPropertyValue(mockFiles[2], 'partenariats.montant');
            console.log('✅ Missing property result:', result);
            expect(result).toBeUndefined();
        });
    });

    describe('Multiple elements ObjectProperty arrays (should still use filter syntax)', () => {
        test('should NOT unwrap multi-element arrays automatically', async () => {
            console.log('🧪 Testing multi-element ObjectProperty array...');
            
            const tableConfig: TableConfig = {
                columns: [{ name: 'Montant', propertyName: 'partenariats.montant' }]
            };

            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            const getNestedPropertyValue = (table as any).getNestedPropertyValue.bind(table);

            // Test avec Entreprise D qui a plusieurs éléments - ne devrait PAS marcher sans filter()
            const result = await getNestedPropertyValue(mockFiles[3], 'partenariats.montant');
            console.log('✅ Multi-element array result (should be undefined):', result);
            expect(result).toBeUndefined();
        });

        test('should work with filter syntax for multi-element arrays', async () => {
            console.log('🧪 Testing filter syntax on multi-element array...');
            
            const tableConfig: TableConfig = {
                columns: [{ name: 'Current', propertyName: 'partenariats.filter(statut=current).montant' }]
            };

            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            const getNestedPropertyValue = (table as any).getNestedPropertyValue.bind(table);

            // Test avec Entreprise D et syntaxe filter
            const result = await getNestedPropertyValue(mockFiles[3], 'partenariats.filter(statut=current).montant');
            console.log('✅ Filtered multi-element result:', result);
            expect(result).toBe(10000); // Seul D1 a statut=current
        });
    });

    describe('Integration with table operations', () => {
        test('should work with calculateTotal for single-element ObjectProperty', async () => {
            console.log('🧪 Testing totals with single-element ObjectProperty...');
            
            const tableConfig: TableConfig = {
                columns: [{ name: 'Montant', propertyName: 'partenariats.montant' }],
                totals: [{ formula: 'sum', propertyName: 'partenariats.montant', column: 'Total' }]
            };

            const table = new DynamicTable(mockFiles, tableConfig, mockVault as any);
            const calculateTotal = (table as any).calculateTotal.bind(table);

            const totalConfig = { 
                formula: 'sum', 
                propertyName: 'partenariats.montant', 
                column: 'Total' 
            };

            const result = await calculateTotal(totalConfig);
            console.log('✅ Total result:', result);
            
            // Seule Entreprise A a un montant accessible : 15000
            expect(result).toContain('15');
            expect(result).toContain('000');
        });
    });
});