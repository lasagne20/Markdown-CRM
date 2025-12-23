import { DynamicTable } from '../../src/display/DynamicTable';
import { Vault } from '../../src/vault/Vault';

describe('DynamicTable - Current File Reference', () => {
    let mockVault: Vault;

    // Mock class for testing current file reference
    class CurrentFileTestClass {
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
            // Mock property object
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
        // Create minimal mock vault
        mockVault = {} as Vault;
    });

    describe('current file reference in filters', () => {
        it('should filter using current filename with "$current" keyword', async () => {
            console.log('🧪 Testing current file reference...');
            
            const testFile = new CurrentFileTestClass({
                nom: 'Entreprise Alpha',
                partenariats: [
                    { partenariat: 'entreprise-alpha', montant: 15000, statut: 'active' },
                    { partenariat: 'entreprise-beta', montant: 8000, statut: 'pending' },
                    { partenariat: 'entreprise-gamma', montant: 12000, statut: 'active' }
                ]
            }, 'entreprise-alpha');

            const config = {
                columns: [
                    { name: 'Nom', propertyName: 'nom' },
                    { name: 'Montant Current', propertyName: 'partenariats.filter(partenariat=$current).montant' }
                ]
            };
            
            // Current file context
            const currentFile = new CurrentFileTestClass({ nom: 'Current File' }, 'entreprise-alpha');

            const table = new DynamicTable([testFile as any], config, mockVault, currentFile as any);
            
            // Test the nested property value directly
            const value = await (table as any).getNestedPropertyValue(testFile, 'partenariats.filter(partenariat=$current).montant');
            
            console.log('✅ Current file filtered value:', value);
            
            // Should return the montant for the partnership matching the current file name
            expect(value).toBe(15000);
        });

        it('should handle multiple current file references', async () => {
            console.log('🧪 Testing multiple current file references...');
            
            const testFile = new CurrentFileTestClass({
                nom: 'Main Company',
                partenariats: [
                    { partenariat: 'main-company', montant: 25000, type: 'primary' },
                    { partenariat: 'main-company', montant: 10000, type: 'secondary' },
                    { partenariat: 'other-company', montant: 5000, type: 'primary' }
                ]
            }, 'main-company');

            const config = {
                columns: [
                    { name: 'Nom', propertyName: 'nom' },
                    { name: 'Total Current', propertyName: 'partenariats.filter(partenariat=$current).montant' }
                ]
            };
            
            // Current file context
            const currentFile = new CurrentFileTestClass({ nom: 'Current File' }, 'main-company');

            const table = new DynamicTable([testFile as any], config, mockVault, currentFile as any);
            
            const value = await (table as any).getNestedPropertyValue(testFile, 'partenariats.filter(partenariat=$current).montant');
            
            console.log('✅ Multiple current file references sum:', value);
            
            // Should sum all montants for partnerships matching the current file name: 25000 + 10000 = 35000
            expect(value).toBe(35000);
        });

        it('should work with display formatting for current file references', async () => {
            console.log('🧪 Testing display formatting with current file reference...');
            
            const testFile = new CurrentFileTestClass({
                nom: 'Test Entity',
                partenariats: [
                    { partenariat: 'test-entity', montant: 18000, statut: 'active' },
                    { partenariat: 'other-entity', montant: 7000, statut: 'inactive' }
                ]
            }, 'test-entity');

            const config = {
                columns: [
                    { name: 'Entity', propertyName: 'nom' },
                    { name: 'Current Montant', propertyName: 'partenariats.filter(partenariat=$current).montant' }
                ]
            };
            
            // Current file context
            const currentFile = new CurrentFileTestClass({ nom: 'Current File' }, 'test-entity');

            const table = new DynamicTable([testFile as any], config, mockVault, currentFile as any);
            
            // Test the display formatting
            const displayElement = await (table as any).getNestedPropertyDisplay(testFile, 'partenariats.filter(partenariat=$current).montant');
            
            console.log('✅ Formatted display for current file:', displayElement.textContent);
            
            // Should format as Euro currency
            expect(displayElement.textContent).toMatch(/18\s?000[,.]00\s?€/);
        });

        it('should return undefined when no current file matches', async () => {
            console.log('🧪 Testing no current file matches...');
            
            const testFile = new CurrentFileTestClass({
                nom: 'No Match Entity',
                partenariats: [
                    { partenariat: 'other-file', montant: 5000, statut: 'active' },
                    { partenariat: 'another-file', montant: 3000, statut: 'pending' }
                ]
            }, 'no-match-entity');

            const config = {
                columns: [
                    { name: 'Entity', propertyName: 'nom' },
                    { name: 'Current Montant', propertyName: 'partenariats.filter(partenariat=current).montant' }
                ]
            };

            const table = new DynamicTable([testFile as any], config, mockVault);
            
            const value = await (table as any).getNestedPropertyValue(testFile, 'partenariats.filter(partenariat=current).montant');
            
            console.log('✅ No matches result:', value);
            
            // Should return undefined when no partnerships match current file name
            expect(value).toBeUndefined();
        });

        it('should work with case insensitive matching', async () => {
            console.log('🧪 Testing case insensitive current file matching...');
            
            const testFile = new CurrentFileTestClass({
                nom: 'Case Test',
                partenariats: [
                    { partenariat: 'CASE-TEST', montant: 9000, statut: 'active' },
                    { partenariat: 'other-file', montant: 2000, statut: 'pending' }
                ]
            }, 'case-test');

            const config = {
                columns: [
                    { name: 'Entity', propertyName: 'nom' },
                    { name: 'Current Montant', propertyName: 'partenariats.filter(partenariat=$current).montant' }
                ]
            };
            
            // Current file context
            const currentFile = new CurrentFileTestClass({ nom: 'Current File' }, 'case-test');

            const table = new DynamicTable([testFile as any], config, mockVault, currentFile as any);
            
            const value = await (table as any).getNestedPropertyValue(testFile, 'partenariats.filter(partenariat=$current).montant');
            
            console.log('✅ Case insensitive result:', value);
            
            // Should match despite case differences
            expect(value).toBe(9000);
        });

        it('should work in table totals with current file reference', async () => {
            console.log('🧪 Testing totals with current file reference...');
            
            const files = [
                new CurrentFileTestClass({
                    nom: 'File One',
                    partenariats: [
                        { partenariat: 'file-one', montant: 10000, statut: 'active' },
                        { partenariat: 'other', montant: 5000, statut: 'active' }
                    ]
                }, 'file-one'),
                new CurrentFileTestClass({
                    nom: 'File Two', 
                    partenariats: [
                        { partenariat: 'file-two', montant: 15000, statut: 'active' },
                        { partenariat: 'other', montant: 3000, statut: 'active' }
                    ]
                }, 'file-two')
            ];

            const config = {
                columns: [
                    { name: 'Nom', propertyName: 'nom' },
                    { name: 'Current Montant', propertyName: 'partenariats.filter(partenariat=$current).montant' }
                ],
                totals: [
                    { formula: 'sum', propertyName: 'partenariats.filter(partenariat=$current).montant', column: 'Total Current' }
                ]
            };
            
            // Current file context
            const currentFile = new CurrentFileTestClass({ nom: 'Current File' }, 'file-one');

            const table = new DynamicTable(files as any, config, mockVault, currentFile as any);
            
            const total = await (table as any).calculateTotal({
                formula: 'sum',
                propertyName: 'partenariats.filter(partenariat=$current).montant',
                column: 'Total Current'
            });
            
            console.log('✅ Total with current file references:', total);
            
            // Should sum only the current file matches from all files: 10000 from file-one, 0 from file-two = 10000
            expect(total).toMatch(/10\s?000[,.]00\s?€/);
        });
    });
});