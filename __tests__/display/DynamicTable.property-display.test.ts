import { DynamicTable } from '../../src/display/DynamicTable';
import { Vault } from '../../src/vault/Vault';

describe('DynamicTable - Property Display Integration', () => {
    let mockVault: Vault;

    class PropertyDisplayTestClass {
        private data: any;
        private fileName: string;
        
        constructor(data: any, fileName: string) {
            this.data = data;
            this.fileName = fileName;
        }
        
        async getPropertyValue(propertyName: string): Promise<any> {
            return this.data[propertyName];
        }
        
        getProperty(propertyName: string): any {
            if (propertyName === 'partenariats') {
                return {
                    name: propertyName,
                    type: 'ObjectProperty',
                    config: {
                        properties: {
                            montant: {
                                name: 'montant',
                                type: 'NumberProperty',
                                getDisplay: async (obj: any) => {
                                    const span = document.createElement('span');
                                    span.textContent = new Intl.NumberFormat('fr-FR', {
                                        style: 'currency',
                                        currency: 'EUR',
                                        minimumFractionDigits: 2
                                    }).format(obj.montant);
                                    span.className = 'currency-amount';
                                    return span;
                                }
                            },
                            statut: {
                                name: 'statut',
                                type: 'TextProperty',
                                getDisplay: async (obj: any) => {
                                    const span = document.createElement('span');
                                    span.textContent = obj.statut.toUpperCase();
                                    span.className = `status-${obj.statut}`;
                                    return span;
                                }
                            }
                        }
                    }
                };
            }
            
            return {
                name: propertyName,
                type: 'TextProperty',
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

    test('should use property display configuration for filtered properties', async () => {
        console.log('🧪 Testing property display configuration...');
        
        const testFile = new PropertyDisplayTestClass({
            nom: 'Test Company',
            partenariats: [
                { partenariat: 'test-company', montant: 15000, statut: 'active' },
                { partenariat: 'other-company', montant: 8000, statut: 'pending' }
            ]
        }, 'company-data');
        
        // Current file context
        const currentFile = new PropertyDisplayTestClass({}, 'test-company');
        
        const config = {
            columns: [
                { propertyName: 'partenariats.filter(partenariat=$current).montant' }
            ]
        };
        
        const table = new DynamicTable([testFile as any], config, mockVault, currentFile as any);
        const displayElement = await (table as any).getNestedPropertyDisplay(testFile, 'partenariats.filter(partenariat=$current).montant');
        
        console.log('✅ Property display result:', displayElement.textContent);
        console.log('✅ Element class:', displayElement.className);
        
        // Should use the custom currency formatting from property config
        expect(displayElement.textContent).toMatch(/15\s?000[,.]00\s?€/);
        // Should have the CSS class from the property config
        expect(displayElement.className).toBe('currency-amount');
    });

    test('should fallback to intelligent formatting when no property config found', async () => {
        console.log('🧪 Testing fallback formatting...');
        
        const testFile = new PropertyDisplayTestClass({
            nom: 'Test Company',
            budgets: [
                { projet: 'test-company', montant: 25000, devise: 'EUR' },
                { projet: 'other-company', montant: 12000, devise: 'USD' }
            ]
        }, 'company-data');
        
        // Current file context
        const currentFile = new PropertyDisplayTestClass({}, 'test-company');
        
        const config = {
            columns: [
                { propertyName: 'budgets.filter(projet=$current).montant' }
            ]
        };
        
        const table = new DynamicTable([testFile as any], config, mockVault, currentFile as any);
        const displayElement = await (table as any).getNestedPropertyDisplay(testFile, 'budgets.filter(projet=$current).montant');
        
        console.log('✅ Fallback display result:', displayElement.textContent);
        
        // Should still format as currency due to intelligent detection
        expect(displayElement.textContent).toMatch(/25\s?000[,.]00\s?€/);
    });

    test('should handle non-currency properties with custom display', async () => {
        console.log('🧪 Testing non-currency property display...');
        
        const testFile = new PropertyDisplayTestClass({
            nom: 'Test Company',
            partenariats: [
                { partenariat: 'test-company', montant: 15000, statut: 'active' },
                { partenariat: 'other-company', montant: 8000, statut: 'pending' }
            ]
        }, 'company-data');
        
        // Current file context
        const currentFile = new PropertyDisplayTestClass({}, 'test-company');
        
        const config = {
            columns: [
                { propertyName: 'partenariats.filter(partenariat=$current).statut' }
            ]
        };
        
        const table = new DynamicTable([testFile as any], config, mockVault, currentFile as any);
        const displayElement = await (table as any).getNestedPropertyDisplay(testFile, 'partenariats.filter(partenariat=$current).statut');
        
        console.log('✅ Status display result:', displayElement.textContent);
        console.log('✅ Status class:', displayElement.className);
        
        // Should use the custom status formatting from property config
        expect(displayElement.textContent).toBe('ACTIVE');
        expect(displayElement.className).toBe('status-active');
    });

    test('should handle multiple values in filtered results', async () => {
        console.log('🧪 Testing multiple filtered values...');
        
        const testFile = new PropertyDisplayTestClass({
            nom: 'Test Company',
            partenariats: [
                { partenariat: 'test-company-main', montant: 10000, statut: 'active' },
                { partenariat: 'test-company-secondary', montant: 5000, statut: 'active' },
                { partenariat: 'other-company', montant: 8000, statut: 'pending' }
            ]
        }, 'company-data');
        
        // Current file context
        const currentFile = new PropertyDisplayTestClass({}, 'test-company');
        
        const config = {
            columns: [
                { propertyName: 'partenariats.filter(partenariat=$current).montant' }
            ]
        };
        
        const table = new DynamicTable([testFile as any], config, mockVault, currentFile as any);
        const displayElement = await (table as any).getNestedPropertyDisplay(testFile, 'partenariats.filter(partenariat=$current).montant');
        
        console.log('✅ Multiple values result:', displayElement.textContent);
        
        // Should sum the values and format as currency: 10000 + 5000 = 15000
        expect(displayElement.textContent).toMatch(/15\s?000[,.]00\s?€/);
    });
});