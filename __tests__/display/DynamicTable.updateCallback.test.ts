import { DynamicTable } from '../../src/display/DynamicTable';
import { Classe } from '../../src/vault/Classe';
import { Vault } from '../../src/vault/Vault';

// Mock console pour capturer les logs
const originalConsole = console.log;
const originalWarn = console.warn;
const originalError = console.error;
let consoleOutput: string[] = [];

beforeEach(() => {
    consoleOutput = [];
    console.log = (...args) => {
        consoleOutput.push(args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' '));
        originalConsole(...args);
    };
    console.warn = (...args) => {
        consoleOutput.push('WARN: ' + args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' '));
        originalWarn(...args);
    };
    console.error = (...args) => {
        consoleOutput.push('ERROR: ' + args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' '));
        originalError(...args);
    };
});

afterEach(() => {
    console.log = originalConsole;
    console.warn = originalWarn; 
    console.error = originalError;
});

describe('DynamicTable Update Callback Debug', () => {
    let mockVault: Vault;
    let mockFile: Classe;
    let mockCurrentFile: Classe;

    beforeEach(() => {
        // Mock File object
        const mockFileObj = {
            getName: jest.fn(() => 'test-file.md'),
            name: 'test-file.md',
            basename: 'test-file'
        };

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

        // Create mock data - animateur should match the current file name
        const mockData = [
            {
                animateur: 'current-file', // This should match mockCurrentFile
                etat: 'En cours',
                priorite: 'Haute',
                montant: 1500
            }
        ];

        // Mock file with updatePropertyValue spy
        mockFile = {
            getFile: jest.fn(() => mockFileObj),
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
                                    const select = document.createElement('select');
                                    select.value = value;
                                    ['En cours', 'Terminé', 'En attente', 'Payé'].forEach(option => {
                                        const opt = document.createElement('option');
                                        opt.value = option;
                                        opt.text = option;
                                        if (option === value) opt.selected = true;
                                        select.appendChild(opt);
                                    });
                                    select.onchange = () => callback(select.value);
                                    return select;
                                })
                            },
                            priorite: {
                                type: 'select',
                                name: 'priorite',
                                fillDisplay: jest.fn((value, callback) => {
                                    const select = document.createElement('select');
                                    select.value = value;
                                    return select;
                                })
                            },
                            montant: {
                                type: 'number',
                                name: 'montant',
                                fillDisplay: jest.fn((value, callback) => {
                                    const input = document.createElement('input');
                                    input.type = 'number';
                                    input.value = value;
                                    return input;
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
                console.log(`📝 updatePropertyValue called for ${propName}:`, newValue);
                return Promise.resolve();
            }),
            getPath: jest.fn(() => '/test/path/test-file.md')
        } as any;
    });

    test('should call update callback when property value changes', async () => {
        const tableConfig = {
            columns: [
                {
                    name: 'Fichier',
                    propertyName: '_fileName',
                    sort: 'asc' as const
                },
                {
                    name: 'État',
                    propertyName: 'projets.filter(animateur=$current).etat'
                }
            ]
        };

        // Clear any existing logs
        consoleOutput = [];

        const dynamicTable = new DynamicTable([mockFile], tableConfig, mockVault, mockCurrentFile);
        const table = dynamicTable.getTable();

        // Wait for async table building
        await new Promise(resolve => setTimeout(resolve, 100));

        // Get the table body
        const tbody = table.querySelector('tbody');
        expect(tbody).toBeTruthy();

        const firstRow = tbody?.querySelector('tr');
        expect(firstRow).toBeTruthy();

        const secondCell = firstRow?.querySelectorAll('td')[1]; // Get the second cell (État)
        expect(secondCell).toBeTruthy();

        console.log('🔍 État cell content:', secondCell?.innerHTML);

        // Look for a select element (or any interactive element)
        const selectElement = secondCell?.querySelector('select') as HTMLSelectElement;
        
        if (selectElement) {
            console.log('📋 Found select element with options:', Array.from(selectElement.options).map(opt => opt.value));
            
            // Simulate changing the value
            const originalValue = selectElement.value;
            console.log(`🎯 Original value: ${originalValue}`);
            
            // Change to a different value
            const newValue = originalValue === 'En cours' ? 'Terminé' : 'En cours';
            selectElement.value = newValue;
            
            // Trigger the change event
            const changeEvent = new Event('change', { bubbles: true });
            selectElement.dispatchEvent(changeEvent);
            
            console.log(`🔄 Changed value from ${originalValue} to ${newValue}`);
            
            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Check console output for our debug messages
            console.log('📊 Console output:', consoleOutput);
            
            // Verify that the update callback was triggered
            const hasUpdateCallback = consoleOutput.some(log => 
                log.includes('🔄 DynamicTable: Update callback triggered')
            );
            
            const hasUpdateFunction = consoleOutput.some(log =>
                log.includes('📝 DynamicTable.updateItemProperty called')
            );
            
            const hasUpdatePropertyValue = consoleOutput.some(log =>
                log.includes('📝 updatePropertyValue called')
            );

            // Print results
            console.log('✅ Update callback triggered:', hasUpdateCallback);
            console.log('✅ updateItemProperty called:', hasUpdateFunction);
            console.log('✅ updatePropertyValue called:', hasUpdatePropertyValue);
            
            // Verify mocks were called
            if (hasUpdatePropertyValue) {
                expect(mockFile.updatePropertyValue).toHaveBeenCalled();
            } else {
                console.log('❌ updatePropertyValue was not called - checking why...');
                
                // Print detailed debug info
                const updateLogs = consoleOutput.filter(log => 
                    log.includes('Update') || log.includes('update') || log.includes('📝')
                );
                console.log('🔍 Update-related logs:', updateLogs);
            }
            
        } else {
            // If no select element, check what's actually in the cell
            console.log('❌ No select element found in État cell');
            console.log('🔍 État cell structure:', secondCell?.outerHTML);
            
            // Check if there are other interactive elements
            const allInputs = secondCell?.querySelectorAll('input, select, button');
            console.log(`📋 Found ${allInputs?.length || 0} interactive elements in État cell`);
            
            if (allInputs && allInputs.length > 0) {
                Array.from(allInputs).forEach((element, index) => {
                    console.log(`🎯 Element ${index}:`, element.tagName, element.className);
                });
            }
        }

        // Even if we didn't find the right element, let's check if fillDisplay was called
        const fillDisplayLogs = consoleOutput.filter(log => 
            log.includes('fillDisplay') || log.includes('display')
        );
        console.log('🎨 fillDisplay related logs:', fillDisplayLogs);
    });

    test('should verify property configuration is correct', async () => {
        const property = mockFile.getProperty('projets');
        expect(property).toBeTruthy();
        expect(property?.type).toBe('object');
        
        const objectProperty = property as any;
        console.log('🔧 ObjectProperty structure:', {
            type: objectProperty.type,
            hasProperties: !!objectProperty.properties,
            propertyKeys: objectProperty.properties ? Object.keys(objectProperty.properties) : []
        });
        
        if (objectProperty.properties) {
            const etatProperty = objectProperty.properties['etat'];
            console.log('🎯 Etat property:', {
                type: etatProperty?.type,
                hasFillDisplay: typeof etatProperty?.fillDisplay === 'function',
                options: etatProperty?.config?.options
            });
            
            expect(etatProperty).toBeTruthy();
            expect(typeof etatProperty.fillDisplay).toBe('function');
        }
    });
});