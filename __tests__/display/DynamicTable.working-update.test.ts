import { DynamicTable } from '../../src/display/DynamicTable';
import { Classe } from '../../src/vault/Classe';
import { Vault } from '../../src/vault/Vault';
import { SelectProperty } from '../../src/properties/SelectProperty';

describe('DynamicTable UpdateItem Issue - Real Problem', () => {
    let mockVault: Vault;
    let mockFile: Classe;
    let mockCurrentFile: Classe;

    beforeEach(() => {
        // Mock current file
        mockCurrentFile = {
            getFile: jest.fn(() => ({
                getName: jest.fn((withExtension = true) => {
                    return withExtension ? 'current-file.md' : 'current-file';
                }),
                name: 'current-file.md',
                basename: 'current-file'
            })),
            basename: 'current-file'
        } as any;

        // Mock Vault
        mockVault = {
            app: {
                open: jest.fn()
            }
        } as any;

        // Create mock data with correct matching
        const mockData = [
            {
                animateur: 'current-file',
                etat: 'En cours',
                priorite: 'Haute',
                montant: 1500
            }
        ];

        // Mock file with updatePropertyValue spy
        mockFile = {
            getFile: jest.fn(() => ({
                getName: jest.fn(() => 'test-file.md'),
                name: 'test-file.md',
                basename: 'test-file'
            })),
            getProperty: jest.fn((propName) => {
                if (propName === 'projets') {
                    // Mock simple d'ObjectProperty qui fonctionne avec le test
                    return {
                        type: 'object',
                        name: 'projets',
                        properties: {
                            etat: {
                                type: 'select',
                                name: 'etat',
                                fillDisplay: jest.fn((value, callback) => {
                                    // Create a real select element that works
                                    const select = document.createElement('select');
                                    select.className = 'test-select';
                                    
                                    // Add options
                                    ['En cours', 'Terminé', 'En attente', 'Payé'].forEach(option => {
                                        const optionEl = document.createElement('option');
                                        optionEl.value = option;
                                        optionEl.textContent = option;
                                        if (option === value) {
                                            optionEl.selected = true;
                                        }
                                        select.appendChild(optionEl);
                                    });
                                    
                                    // Add change handler that calls the callback
                                    select.onchange = () => {
                                        callback(select.value);
                                    };
                                    
                                    return select;
                                })
                            }
                        }
                    };
                }
                return null;
            }),
            getPropertyValue: jest.fn((propName) => {
                if (propName === 'projets') {
                    return mockData;
                }
                return undefined;
            }),
            updatePropertyValue: jest.fn(async (propName, newValue) => {
                console.log(`✅ updatePropertyValue called for ${propName}:`, newValue);
                return Promise.resolve();
            }),
            getPath: jest.fn(() => '/test/path/test-file.md')
        } as any;
    });

    test('should trigger updateItemProperty when select value changes', async () => {
        const tableConfig = {
            columns: [
                {
                    name: 'Fichier',
                    propertyName: '_fileName',
                    filter: 'text' as const,
                    sort: true
                },
                {
                    name: 'État',
                    propertyName: 'projets.filter(animateur=$current).etat'
                }
            ]
        };

        const dynamicTable = new DynamicTable([mockFile], tableConfig, mockVault, mockCurrentFile);
        const table = dynamicTable.getTable();

        // Wait for async table building
        await new Promise(resolve => setTimeout(resolve, 100));

        // Get the État cell
        const tbody = table.querySelector('tbody');
        const firstRow = tbody?.querySelector('tr');
        const etatCell = firstRow?.querySelectorAll('td')[1];
        
        console.log('🔍 État cell HTML:', etatCell?.innerHTML);

        // Find the select element
        const selectElement = etatCell?.querySelector('select') as HTMLSelectElement;
        
        expect(selectElement).toBeTruthy();
        expect(selectElement.value).toBe('En cours');
        
        console.log('📋 Select found with value:', selectElement.value);
        console.log('📋 Select options:', Array.from(selectElement.options).map(opt => opt.value));

        // Simulate user changing the value
        selectElement.value = 'Terminé';
        
        // Trigger the change event
        const changeEvent = new Event('change');
        selectElement.dispatchEvent(changeEvent);
        
        console.log('🔄 Changed select value to:', selectElement.value);

        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 200));

        // Check if updatePropertyValue was called
        expect(mockFile.updatePropertyValue).toHaveBeenCalled();
        expect(mockFile.updatePropertyValue).toHaveBeenCalledWith('projets', [
            {
                animateur: 'current-file',
                etat: 'Terminé', // Should be updated
                priorite: 'Haute',
                montant: 1500
            }
        ]);

        console.log('✅ Test passed - updateItemProperty was triggered successfully!');
    });
});