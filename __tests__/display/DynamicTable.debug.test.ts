import { DynamicTable } from '../../src/display/DynamicTable';
import { Vault } from '../../src/vault/Vault';

describe('DynamicTable - Debug Current File', () => {
    let mockVault: Vault;

    // Simple test class
    class DebugTestClass {
        private data: any;
        private fileName: string;
        
        constructor(data: any, fileName: string) {
            this.data = data;
            this.fileName = fileName;
        }
        
        async getPropertyValue(propertyName: string): Promise<any> {
            console.log(`🔍 Debug - Getting property: ${propertyName} on file: ${this.fileName} =`, this.data[propertyName]);
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
            console.log(`🎯 Debug - getFile() called for: ${this.fileName}`);
            return {
                getName: (withExtension?: boolean) => {
                    const result = withExtension ? `${this.fileName}.md` : this.fileName;
                    console.log(`🎯 Debug - getName(${withExtension}) returned: ${result}`);
                    return result;
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

    test('Debug - should show step by step what happens with $current', async () => {
        console.log('🧪 === DEBUG TEST START ===');
        
        const testFile = new DebugTestClass({
            nom: 'Test Company',
            partenariats: [
                { partenariat: 'test-company', montant: 15000, statut: 'active' },
                { partenariat: 'other-company', montant: 8000, statut: 'pending' }
            ]
        }, 'test-company');

        console.log('🔧 Creating DynamicTable...');
        const table = new DynamicTable([testFile as any], { columns: [] }, mockVault);
        
        console.log('🔧 Testing direct getNestedPropertyValue...');
        const value = await (table as any).getNestedPropertyValue(testFile, 'partenariats.filter(partenariat=$current).montant');
        
        console.log('✅ Final result:', value);
        expect(value).toBe(15000);
    });

    test('Debug - Test what happens without $current (regular filter)', async () => {
        console.log('🧪 === REGULAR FILTER TEST ===');
        
        const testFile = new DebugTestClass({
            nom: 'Test Company',
            partenariats: [
                { partenariat: 'test-company', montant: 15000, statut: 'current' },
                { partenariat: 'other-company', montant: 8000, statut: 'pending' }
            ]
        }, 'test-company');

        const table = new DynamicTable([testFile as any], { columns: [] }, mockVault);
        
        console.log('🔧 Testing regular filter with statut=current...');
        const value = await (table as any).getNestedPropertyValue(testFile, 'partenariats.filter(statut=current).montant');
        
        console.log('✅ Regular filter result:', value);
        expect(value).toBe(15000);
    });

    test('Debug - Test with actual filename pattern you might be using', async () => {
        console.log('🧪 === REAL PATTERN TEST ===');
        
        // Test avec un pattern plus réaliste
        const testFile = new DebugTestClass({
            nom: 'Entreprise Alpha', 
            partenariats: [
                { partenariat: 'entreprise-alpha', montant: 25000, statut: 'active' },
                { partenariat: 'entreprise-beta', montant: 12000, statut: 'pending' },
                { partenariat: 'autre-entreprise', montant: 5000, statut: 'active' }
            ]
        }, 'entreprise-alpha');

        const table = new DynamicTable([testFile as any], { columns: [] }, mockVault);
        
        console.log('🔧 Testing with pattern: partenariats.filter(partenariat=$current).montant');
        const value = await (table as any).getNestedPropertyValue(testFile, 'partenariats.filter(partenariat=$current).montant');
        
        console.log('✅ Real pattern result:', value);
        expect(value).toBe(25000);
    });
});