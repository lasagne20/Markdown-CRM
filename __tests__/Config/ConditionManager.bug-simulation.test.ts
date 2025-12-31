/**
 * @jest-environment jsdom
 */

import { ConditionManager, Condition } from '../../src/Config/ConditionManager';
import { Classe } from '../../src/vault/Classe';
import { Property } from '../../src/properties/Property';
import { Vault } from '../../src/vault/Vault';
import { mockApp } from '../utils/mocks';

describe('ConditionManager - Original equalsAny Bug Simulation', () => {
    let conditionManager: ConditionManager;
    let mockClasseInstance: Classe;
    let vault: Vault;
    let mockProperty: Property;

    beforeEach(() => {
        conditionManager = new ConditionManager();
        const app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);
        
        // Create mock property
        mockProperty = new Property('etat', vault);
        mockProperty.read = jest.fn().mockResolvedValue('Réalisé');
        
        // Create mock classe instance
        mockClasseInstance = {
            getProperty: jest.fn(),
            getName: jest.fn().mockReturnValue('TestClasse'),
            getPath: jest.fn().mockReturnValue('test/path/TestClasse.md'),
            getAllProperties: jest.fn().mockReturnValue({
                etat: mockProperty
            })
        } as any;

        // Mock getProperty to return our property
        (mockClasseInstance.getProperty as jest.Mock).mockImplementation((name: string) => {
            if (name === 'etat') {
                return mockProperty;
            }
            return undefined;
        });
    });

    /**
     * This test simulates what would happen with the ORIGINAL code (before our fix)
     * If you comment out the validation in ConditionManager.ts lines 155-158 and 166-169,
     * this test would fail with: "TypeError: Cannot read properties of undefined (reading 'some')"
     */
    test('SIMULATION: Original bug - equalsAny with undefined values would crash', async () => {
        // This simulates a poorly configured condition from YAML
        const badCondition = {
            property: 'etat',
            type: 'equalsAny',
            // values: undefined <- This is what causes the crash
        } as any;

        // With our fix, this should return false and log a warning
        // WITHOUT our fix, this would throw: TypeError: Cannot read properties of undefined (reading 'some')
        const result = await conditionManager.evaluateCondition(badCondition, mockClasseInstance);
        
        expect(result).toBe(false);
        
        // If this test passes, it means our fix is working!
        // If this test would fail with "Cannot read properties of undefined (reading 'some')",
        // it means the original bug still exists
    });

    test('SIMULATION: What the original buggy code would do', () => {
        // This is essentially what was happening in the original code:
        const undefinedValues = undefined;
        
        expect(() => {
            // This would be the line that crashed: propertyCondition.values.some(...)
            (undefinedValues as any).some((value: any) => value === 'test');
        }).toThrow('Cannot read properties of undefined (reading \'some\')');
    });

    test('SIMULATION: Original bug with null values', async () => {
        const badCondition = {
            property: 'etat',
            type: 'equalsAny',
            values: null
        } as any;

        // With our fix, this should handle gracefully
        const result = await conditionManager.evaluateCondition(badCondition, mockClasseInstance);
        expect(result).toBe(false);
    });

    test('SIMULATION: Original bug with string instead of array', async () => {
        const badCondition = {
            property: 'etat',
            type: 'equalsAny',
            values: 'should-be-an-array-but-is-string'
        } as any;

        // With our fix, this should handle gracefully
        const result = await conditionManager.evaluateCondition(badCondition, mockClasseInstance);
        expect(result).toBe(false);
    });

    test('PROOF: Our fix works - valid values still work correctly', async () => {
        mockProperty.read = jest.fn().mockResolvedValue('Réalisé');

        const validCondition: Condition = {
            property: 'etat',
            type: 'equalsAny',
            values: ['Réalisé', 'Facturé', 'Payé']
        };

        const result = await conditionManager.evaluateCondition(validCondition, mockClasseInstance);
        expect(result).toBe(true);
    });
});