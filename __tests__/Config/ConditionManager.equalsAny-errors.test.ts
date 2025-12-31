/**
 * @jest-environment jsdom
 */

import { ConditionManager, Condition } from '../../src/Config/ConditionManager';
import { Classe } from '../../src/vault/Classe';
import { Property } from '../../src/properties/Property';
import { Vault } from '../../src/vault/Vault';
import { mockApp } from '../utils/mocks';

describe('ConditionManager - equalsAny/notEqualsAny Error Handling', () => {
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

    describe('equalsAny with invalid values', () => {
        test('should handle equalsAny with undefined values gracefully', async () => {
            const condition = {
                property: 'etat',
                type: 'equalsAny',
                // values is undefined - this would cause the "Cannot read properties of undefined" error
            } as any;

            // This should not throw an error anymore
            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            
            // Should return false and log a warning instead of crashing
            expect(result).toBe(false);
        });

        test('should handle equalsAny with null values gracefully', async () => {
            const condition = {
                property: 'etat',
                type: 'equalsAny',
                values: null
            } as any;

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(false);
        });

        test('should handle equalsAny with empty array', async () => {
            const condition: Condition = {
                property: 'etat',
                type: 'equalsAny',
                values: []
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(false);
        });

        test('should handle equalsAny with non-array values', async () => {
            const condition = {
                property: 'etat',
                type: 'equalsAny',
                values: 'not-an-array'
            } as any;

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(false);
        });
    });

    describe('notEqualsAny with invalid values', () => {
        test('should handle notEqualsAny with undefined values gracefully', async () => {
            const condition = {
                property: 'etat',
                type: 'notEqualsAny',
                // values is undefined
            } as any;

            // Should return true (if no values to exclude, everything is allowed)
            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });

        test('should handle notEqualsAny with null values gracefully', async () => {
            const condition = {
                property: 'etat',
                type: 'notEqualsAny',
                values: null
            } as any;

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });

        test('should handle notEqualsAny with empty array', async () => {
            const condition: Condition = {
                property: 'etat',
                type: 'notEqualsAny',
                values: []
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });
    });

    describe('equalsAny/notEqualsAny with valid values', () => {
        test('should work correctly with equalsAny and valid values', async () => {
            mockProperty.read = jest.fn().mockResolvedValue('Réalisé');

            const condition: Condition = {
                property: 'etat',
                type: 'equalsAny',
                values: ['Réalisé', 'Facturé', 'Payé']
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });

        test('should work correctly with notEqualsAny and valid values', async () => {
            mockProperty.read = jest.fn().mockResolvedValue('En cours');

            const condition: Condition = {
                property: 'etat',
                type: 'notEqualsAny',
                values: ['Réalisé', 'Facturé', 'Payé']
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });

        test('should return false for equalsAny when value does not match any', async () => {
            mockProperty.read = jest.fn().mockResolvedValue('En cours');

            const condition: Condition = {
                property: 'etat',
                type: 'equalsAny',
                values: ['Réalisé', 'Facturé', 'Payé']
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(false);
        });

        test('should return false for notEqualsAny when value matches one', async () => {
            mockProperty.read = jest.fn().mockResolvedValue('Réalisé');

            const condition: Condition = {
                property: 'etat',
                type: 'notEqualsAny',
                values: ['Réalisé', 'Facturé', 'Payé']
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(false);
        });
    });

    describe('Console warning verification', () => {
        let consoleWarnSpy: jest.SpyInstance;

        beforeEach(() => {
            consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        });

        afterEach(() => {
            consoleWarnSpy.mockRestore();
        });

        test('should log warning for equalsAny with invalid values', async () => {
            const condition = {
                property: 'etat',
                type: 'equalsAny',
                values: undefined
            } as any;

            await conditionManager.evaluateCondition(condition, mockClasseInstance);
            
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('equalsAny condition requires non-empty \'values\' array')
            );
        });

        test('should log warning for notEqualsAny with invalid values', async () => {
            const condition = {
                property: 'etat',
                type: 'notEqualsAny',
                values: undefined
            } as any;

            await conditionManager.evaluateCondition(condition, mockClasseInstance);
            
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('notEqualsAny condition requires non-empty \'values\' array')
            );
        });
    });
});