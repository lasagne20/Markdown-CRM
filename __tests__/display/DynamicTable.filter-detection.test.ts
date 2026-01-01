/**
 * @jest-environment jsdom
 */

import { DynamicTable } from '../../src/display/DynamicTable';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { mockApp } from '../utils/mocks';

// Mock class that extends DynamicTable to access private methods
class TestDynamicTable extends DynamicTable {
    public testGetAutomaticFilterType(propertyName: string, files: Classe[]): 'text' | 'select' | false {
        return (this as any).getAutomaticFilterType(propertyName, files);
    }
}

describe('DynamicTable - Automatic Filter Detection', () => {
    let vault: Vault;
    let testTable: TestDynamicTable;
    let mockFiles: Classe[];

    beforeEach(() => {
        const app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);
        
        // Create minimal table to access the method
        testTable = new (class extends DynamicTable {
            constructor() {
                // Override to prevent automatic buildTableStructure call
                const config = { columns: [] };
                super([], config, vault);
                // Clear the automatically created table
                (this as any).table = document.createElement('table');
            }
            
            public testGetAutomaticFilterType(propertyName: string, files: Classe[]): 'text' | 'select' | false {
                return (this as any).getAutomaticFilterType(propertyName, files);
            }
        })();

        // Create mock files with different property types
        mockFiles = [
            createMockFile({
                status: { type: 'select', options: [{name: 'Active'}, {name: 'Inactive'}] },
                name: { type: 'text' },
                age: { type: 'number' },
                date: { type: 'date' },
                owner: { type: 'file', classes: ['Person'] },
                photo: { type: 'media' },
                data: { type: 'object' },
                category: { type: 'custom', options: [{name: 'A'}, {name: 'B'}] },
                description: { type: 'unknown' }
            })
        ];
    });

    function createMockFile(properties: Record<string, any>): Classe {
        const file = new Classe(vault);
        file.getProperty = jest.fn().mockImplementation((propName: string) => {
            return properties[propName] || null;
        });
        return file;
    }

    test('should detect select filter for SelectProperty', () => {
        const result = testTable.testGetAutomaticFilterType('status', mockFiles);
        expect(result).toBe('select');
        console.log('✅ SelectProperty detected as select filter');
    });

    test('should detect text filter for TextProperty', () => {
        const result = testTable.testGetAutomaticFilterType('name', mockFiles);
        expect(result).toBe('text');
        console.log('✅ TextProperty detected as text filter');
    });

    test('should detect text filter for NumberProperty', () => {
        const result = testTable.testGetAutomaticFilterType('age', mockFiles);
        expect(result).toBe('text');
        console.log('✅ NumberProperty detected as text filter');
    });

    test('should detect text filter for DateProperty', () => {
        const result = testTable.testGetAutomaticFilterType('date', mockFiles);
        expect(result).toBe('text');
        console.log('✅ DateProperty detected as text filter');
    });

    test('should detect select filter for FileProperty', () => {
        const result = testTable.testGetAutomaticFilterType('owner', mockFiles);
        expect(result).toBe('select');
        console.log('✅ FileProperty detected as select filter');
    });

    test('should detect no filter for MediaProperty', () => {
        const result = testTable.testGetAutomaticFilterType('photo', mockFiles);
        expect(result).toBe(false);
        console.log('✅ MediaProperty detected as no filter');
    });

    test('should detect no filter for ObjectProperty', () => {
        const result = testTable.testGetAutomaticFilterType('data', mockFiles);
        expect(result).toBe(false);
        console.log('✅ ObjectProperty detected as no filter');
    });

    test('should detect text filter for _fileName', () => {
        const result = testTable.testGetAutomaticFilterType('_fileName', mockFiles);
        expect(result).toBe('text');
        console.log('✅ _fileName detected as text filter');
    });

    test('should detect select filter for unknown type with options', () => {
        const result = testTable.testGetAutomaticFilterType('category', mockFiles);
        expect(result).toBe('select');
        console.log('✅ Unknown type with options detected as select filter');
    });

    test('should fallback to text filter for unknown property', () => {
        const result = testTable.testGetAutomaticFilterType('nonexistent', mockFiles);
        expect(result).toBe('text');
        console.log('✅ Nonexistent property detected as text filter (fallback)');
    });

    test('should fallback to text filter for unknown type without options', () => {
        const result = testTable.testGetAutomaticFilterType('description', mockFiles);
        expect(result).toBe('text');
        console.log('✅ Unknown type without options detected as text filter (fallback)');
    });

    test('should work with empty files array', () => {
        const result = testTable.testGetAutomaticFilterType('anything', []);
        expect(result).toBe('text');
        console.log('✅ Empty files array defaults to text filter');
    });

    test('should work when property not found in any file', () => {
        const filesWithoutProperty = [createMockFile({})];
        const result = testTable.testGetAutomaticFilterType('missing', filesWithoutProperty);
        expect(result).toBe('text');
        console.log('✅ Property not found in files defaults to text filter');
    });

    test('comprehensive filter type mapping', () => {
        console.log('\n🧪 === COMPREHENSIVE FILTER MAPPING TEST ===');
        
        const expectedMappings = {
            // Should be select
            'status': 'select',      // SelectProperty
            'owner': 'select',       // FileProperty
            'category': 'select',    // Custom with options
            
            // Should be text
            'name': 'text',          // TextProperty
            'age': 'text',           // NumberProperty  
            'date': 'text',          // DateProperty
            '_fileName': 'text',     // Special case
            'description': 'text',   // Unknown type
            
            // Should be false (no filter)
            'photo': false,          // MediaProperty
            'data': false            // ObjectProperty
        };

        for (const [property, expected] of Object.entries(expectedMappings)) {
            const actual = testTable.testGetAutomaticFilterType(property, mockFiles);
            expect(actual).toBe(expected);
            console.log(`  ✅ ${property}: ${actual} (${typeof expected === 'boolean' ? 'no filter' : expected + ' filter'})`);
        }

        console.log('🎉 All filter type mappings work correctly!');
    });
});