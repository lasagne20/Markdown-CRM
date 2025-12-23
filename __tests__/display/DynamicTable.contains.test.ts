import { DynamicTable } from '../../src/display/DynamicTable';
import { Vault } from '../../src/vault/Vault';

describe('DynamicTable - Current File Contains Logic', () => {
    let mockVault: Vault;

    class ContainsTestClass {
        private data: any;
        private fileName: string;
        
        constructor(data: any, fileName: string) {
            this.data = data;
            this.fileName = fileName;
        }
        
        async getPropertyValue(propertyName: string): Promise<any> {
            console.log(`🔍 Getting property: ${propertyName} on file: ${this.fileName} =`, this.data[propertyName]);
            return this.data[propertyName];
        }
        
        getProperty(propertyName: string): any {
            return {
                name: propertyName,
                type: 'ObjectProperty',
                getDisplay: async (file: any) => {
                    const span = document.createElement('span');
                    span.textContent = String(this.data[propertyName] || '-');
                    return span;
                }
            };
        }
        
        getFile(): any {
            return {
                getName: (withExtension?: boolean) => {
                    return withExtension ? `${this.fileName}.md` : this.fileName;
                },
                name: `${this.fileName}.md`,
                basename: this.fileName
            };
        }
        
        getPath(): string {
            return `test-${this.fileName}`;
        }
    }

    beforeEach(() => {
        mockVault = {} as Vault;
    });

    test('should match current file with wikilink format [[filename]]', async () => {
        console.log('🧪 Testing wikilink format...');
        
        const testFile = new ContainsTestClass({
            nom: 'Test Company',
            partenariats: [
                { partenariat: '[[entreprise-alpha]]', montant: 15000, statut: 'active' },
                { partenariat: '[[autre-entreprise]]', montant: 8000, statut: 'pending' }
            ]
        }, 'company-data');
        
        // Current file context - entreprise-alpha
        const currentFile = new ContainsTestClass({}, 'entreprise-alpha');

        const table = new DynamicTable([testFile as any], { columns: [] }, mockVault, currentFile as any);
        const value = await (table as any).getNestedPropertyValue(testFile, 'partenariats.filter(partenariat=$current).montant');
        
        console.log('✅ Wikilink result:', value);
        expect(value).toBe(15000);
    });

    test('should match current file with markdown link format', async () => {
        console.log('🧪 Testing markdown link format...');
        
        const testFile = new ContainsTestClass({
            nom: 'Test Company',
            partenariats: [
                { partenariat: '[Entreprise Alpha](entreprise-alpha)', montant: 25000, statut: 'active' },
                { partenariat: '[Autre Entreprise](autre-entreprise)', montant: 12000, statut: 'pending' }
            ]
        }, 'company-data');
        
        // Current file context - entreprise-alpha
        const currentFile = new ContainsTestClass({}, 'entreprise-alpha');

        const table = new DynamicTable([testFile as any], { columns: [] }, mockVault, currentFile as any);
        const value = await (table as any).getNestedPropertyValue(testFile, 'partenariats.filter(partenariat=$current).montant');
        
        console.log('✅ Markdown link result:', value);
        expect(value).toBe(25000);
    });

    test('should match current file when filename is part of longer string', async () => {
        console.log('🧪 Testing partial filename match...');
        
        const testFile = new ContainsTestClass({
            nom: 'Test Company',
            partenariats: [
                { partenariat: 'Partenaire: entreprise-alpha (principal)', montant: 18000, statut: 'active' },
                { partenariat: 'Partenaire: autre-entreprise', montant: 7000, statut: 'pending' }
            ]
        }, 'company-data');
        
        // Current file context - entreprise-alpha
        const currentFile = new ContainsTestClass({}, 'entreprise-alpha');

        const table = new DynamicTable([testFile as any], { columns: [] }, mockVault, currentFile as any);
        const value = await (table as any).getNestedPropertyValue(testFile, 'partenariats.filter(partenariat=$current).montant');
        
        console.log('✅ Partial match result:', value);
        expect(value).toBe(18000);
    });

    test('should handle multiple matches with contains logic', async () => {
        console.log('🧪 Testing multiple contains matches...');
        
        const testFile = new ContainsTestClass({
            nom: 'Test Company',
            partenariats: [
                { partenariat: '[[test-company]] - Principal', montant: 10000, statut: 'active' },
                { partenariat: 'Ref: test-company (secondaire)', montant: 5000, statut: 'active' },
                { partenariat: '[[autre-company]]', montant: 3000, statut: 'active' }
            ]
        }, 'company-data');
        
        // Current file context - test-company
        const currentFile = new ContainsTestClass({}, 'test-company');

        const table = new DynamicTable([testFile as any], { columns: [] }, mockVault, currentFile as any);
        const value = await (table as any).getNestedPropertyValue(testFile, 'partenariats.filter(partenariat=$current).montant');
        
        console.log('✅ Multiple matches sum:', value);
        expect(value).toBe(15000); // 10000 + 5000
    });

    test('should not match when filename is not contained', async () => {
        console.log('🧪 Testing no match scenario...');
        
        const testFile = new ContainsTestClass({
            nom: 'Test Company',
            partenariats: [
                { partenariat: '[[autre-entreprise]]', montant: 15000, statut: 'active' },
                { partenariat: '[Different Company](different-company)', montant: 8000, statut: 'pending' }
            ]
        }, 'company-data');
        
        // Current file context - entreprise-alpha (should not match)
        const currentFile = new ContainsTestClass({}, 'entreprise-alpha');

        const table = new DynamicTable([testFile as any], { columns: [] }, mockVault, currentFile as any);
        const value = await (table as any).getNestedPropertyValue(testFile, 'partenariats.filter(partenariat=$current).montant');
        
        console.log('✅ No match result:', value);
        expect(value).toBeUndefined();
    });

    test('should still work with regular filters (non-$current)', async () => {
        console.log('🧪 Testing regular filter still works...');
        
        const testFile = new ContainsTestClass({
            nom: 'Test Company',
            partenariats: [
                { partenariat: '[[entreprise-alpha]]', montant: 15000, statut: 'current' },
                { partenariat: '[[autre-entreprise]]', montant: 8000, statut: 'pending' }
            ]
        }, 'company-data');
        
        // Current file context (not needed for this test)
        const currentFile = new ContainsTestClass({}, 'entreprise-alpha');

        const table = new DynamicTable([testFile as any], { columns: [] }, mockVault, currentFile as any);
        const value = await (table as any).getNestedPropertyValue(testFile, 'partenariats.filter(statut=current).montant');
        
        console.log('✅ Regular filter result:', value);
        expect(value).toBe(15000);
    });

    test('should work with display formatting and contains logic', async () => {
        console.log('🧪 Testing display with contains logic...');
        
        const testFile = new ContainsTestClass({
            nom: 'Test Entity',
            partenariats: [
                { partenariat: '[[test-entity]] - Partnership', montant: 22000, statut: 'active' },
                { partenariat: '[[other-entity]]', montant: 9000, statut: 'pending' }
            ]
        }, 'entity-data');
        
        // Current file context - test-entity
        const currentFile = new ContainsTestClass({}, 'test-entity');

        const table = new DynamicTable([testFile as any], { columns: [] }, mockVault, currentFile as any);
        const displayElement = await (table as any).getNestedPropertyDisplay(testFile, 'partenariats.filter(partenariat=$current).montant');
        
        console.log('✅ Display with contains result:', displayElement.textContent);
        expect(displayElement.textContent).toMatch(/22\s?000[,.]00\s?€/);
    });
});