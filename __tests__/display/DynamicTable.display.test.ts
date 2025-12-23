import { DynamicTable } from '../../src/display/DynamicTable';
import { Vault } from '../../src/vault/Vault';

describe('DynamicTable - Nested Property Display', () => {
    let mockVault: Vault;

    // Mock class for testing nested property display
    class DisplayTestClass {
        private data: any;
        
        constructor(data: any) {
            this.data = data;
        }
        
        async getPropertyValue(propertyName: string): Promise<any> {
            console.log(`🔍 Getting property: ${propertyName} =`, this.data[propertyName]);
            return this.data[propertyName];
        }
        
        getProperty(propertyName: string): any {
            // Mock property object with basic configuration
            return {
                name: propertyName,
                type: this.data[propertyName + '_type'] || 'text',
                getDisplay: async (file: any) => {
                    // Mock display element
                    const span = document.createElement('span');
                    const value = this.data[propertyName];
                    if (typeof value === 'number') {
                        span.textContent = value.toLocaleString('fr-FR');
                    } else {
                        span.textContent = String(value || '-');
                    }
                    return span;
                }
            };
        }
        
        getPath(): string {
            return `test-${this.data.nom || 'file'}`;
        }
    }

    beforeEach(() => {
        // Create minimal mock vault
        mockVault = {} as Vault;
    });

    describe('getNestedPropertyDisplay method', () => {
        it('should format currency for filtered montant properties', async () => {
            console.log('🧪 Testing currency formatting for filtered montant...');
            
            const testFile = new DisplayTestClass({
                nom: 'Test Entity',
                partenariats: [
                    { partenariat: 'Partner A', montant: 15000, statut: 'current' },
                    { partenariat: 'Partner B', montant: 8000, statut: 'pending' },
                    { partenariat: 'Partner C', montant: 12000, statut: 'current' }
                ]
            });

            const config = {
                columns: [
                    { name: 'Nom', propertyName: 'nom' },
                    { name: 'Montant Current', propertyName: 'partenariats.filter(statut=current).montant' }
                ]
            };

            const table = new DynamicTable([testFile as any], config, mockVault);
            
            // Access the private method for testing
            const displayElement = await (table as any).getNestedPropertyDisplay(testFile, 'partenariats.filter(statut=current).montant');
            
            console.log('✅ Formatted display:', displayElement.textContent);
            
            // Should format as Euro currency: 15000 + 12000 = 27000
            expect(displayElement.textContent).toMatch(/27\s?000[,.]00\s?€/);
        });

        it('should format currency for simple nested montant properties', async () => {
            console.log('🧪 Testing currency formatting for simple nested montant...');
            
            const testFile = new DisplayTestClass({
                nom: 'Test Entity',
                partenaire: { montant: 25000, statut: 'active' }
            });

            const config = {
                columns: [
                    { name: 'Nom', propertyName: 'nom' },
                    { name: 'Montant Partenaire', propertyName: 'partenaire.montant' }
                ]
            };

            const table = new DynamicTable([testFile as any], config, mockVault);
            
            // Access the private method for testing
            const displayElement = await (table as any).getNestedPropertyDisplay(testFile, 'partenaire.montant');
            
            console.log('✅ Formatted display:', displayElement.textContent);
            
            // Should format as Euro currency
            expect(displayElement.textContent).toMatch(/25\s?000[,.]00\s?€/);
        });

        it('should format numbers without currency for non-monetary properties', async () => {
            console.log('🧪 Testing number formatting for non-monetary properties...');
            
            const testFile = new DisplayTestClass({
                nom: 'Test Entity',
                stats: [
                    { type: 'visits', count: 1500, period: 'current' },
                    { type: 'views', count: 800, period: 'pending' },
                    { type: 'clicks', count: 2200, period: 'current' }
                ]
            });

            const config = {
                columns: [
                    { name: 'Nom', propertyName: 'nom' },
                    { name: 'Current Count', propertyName: 'stats.filter(period=current).count' }
                ]
            };

            const table = new DynamicTable([testFile as any], config, mockVault);
            
            // Access the private method for testing
            const displayElement = await (table as any).getNestedPropertyDisplay(testFile, 'stats.filter(period=current).count');
            
            console.log('✅ Formatted display:', displayElement.textContent);
            
            // Should format as number without currency: 1500 + 2200 = 3700
            expect(displayElement.textContent).toMatch(/3\s?700/);
        });

        it('should handle string concatenation for filtered text properties', async () => {
            console.log('🧪 Testing string concatenation for filtered properties...');
            
            const testFile = new DisplayTestClass({
                nom: 'Test Entity',
                contacts: [
                    { nom: 'John Doe', type: 'manager', email: 'john@test.com' },
                    { nom: 'Jane Smith', type: 'assistant', email: 'jane@test.com' },
                    { nom: 'Bob Wilson', type: 'manager', email: 'bob@test.com' }
                ]
            });

            const config = {
                columns: [
                    { name: 'Entity', propertyName: 'nom' },
                    { name: 'Managers', propertyName: 'contacts.filter(type=manager).nom' }
                ]
            };

            const table = new DynamicTable([testFile as any], config, mockVault);
            
            // Access the private method for testing
            const displayElement = await (table as any).getNestedPropertyDisplay(testFile, 'contacts.filter(type=manager).nom');
            
            console.log('✅ Formatted display:', displayElement.textContent);
            
            // Should concatenate manager names
            expect(displayElement.textContent).toBe('John Doe, Bob Wilson');
        });

        it('should return dash for empty results', async () => {
            console.log('🧪 Testing empty results handling...');
            
            const testFile = new DisplayTestClass({
                nom: 'Test Entity',
                partners: []
            });

            const config = {
                columns: [
                    { name: 'Entity', propertyName: 'nom' },
                    { name: 'Current Partners', propertyName: 'partners.filter(statut=current).nom' }
                ]
            };

            const table = new DynamicTable([testFile as any], config, mockVault);
            
            // Access the private method for testing
            const displayElement = await (table as any).getNestedPropertyDisplay(testFile, 'partners.filter(statut=current).nom');
            
            console.log('✅ Empty result display:', displayElement.textContent);
            
            // Should show dash for empty results
            expect(displayElement.textContent).toBe('-');
        });

        it('should handle missing properties gracefully', async () => {
            console.log('🧪 Testing missing properties handling...');
            
            const testFile = new DisplayTestClass({
                nom: 'Test Entity'
                // No partenariats property
            });

            const config = {
                columns: [
                    { name: 'Entity', propertyName: 'nom' },
                    { name: 'Partners', propertyName: 'partenariats.filter(statut=current).nom' }
                ]
            };

            const table = new DynamicTable([testFile as any], config, mockVault);
            
            // Access the private method for testing
            const displayElement = await (table as any).getNestedPropertyDisplay(testFile, 'partenariats.filter(statut=current).nom');
            
            console.log('✅ Missing property display:', displayElement.textContent);
            
            // Should show dash for missing properties
            expect(displayElement.textContent).toBe('-');
        });
    });
});