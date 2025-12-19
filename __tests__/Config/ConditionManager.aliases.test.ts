import { ConditionManager, PropertyCondition } from '../../src/Config/ConditionManager';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { TextProperty } from '../../src/properties/TextProperty';
import { NumberProperty } from '../../src/properties/NumberProperty';
import { mockApp } from '../utils/mocks';

describe('ConditionManager - Property Aliases', () => {
    let conditionManager: ConditionManager;
    let vault: Vault;
    let app: any;

    beforeEach(() => {
        app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);
        conditionManager = new ConditionManager();
    });

    describe('conditions with property aliases', () => {
        test('should evaluate condition using property alias', async () => {
            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'TestDoc';
            jest.spyOn(currentDoc, 'getName').mockReturnValue('TestDoc');

            const instance = new Classe(vault);
            (instance as any).name = 'TestInstance';

            // Create property with aliases
            const statusProperty = new TextProperty('status', vault);
            statusProperty.aliases = ['etat', 'statut']; // Old names
            (instance as any).properties = [statusProperty];

            jest.spyOn(statusProperty, 'read').mockResolvedValue('active');

            // Use old alias name in condition
            const condition: PropertyCondition = {
                property: 'etat', // Using alias instead of 'status'
                type: 'equals',
                value: 'active'
            };

            const result = await conditionManager.evaluateCondition(condition, instance, currentDoc);
            expect(result).toBe(true);
        });

        test('should work with multiple aliases', async () => {
            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'TestDoc';
            jest.spyOn(currentDoc, 'getName').mockReturnValue('TestDoc');

            const instance = new Classe(vault);
            const priorityProperty = new NumberProperty('priority', vault);
            priorityProperty.aliases = ['priorite', 'prio', 'importance'];
            (instance as any).properties = [priorityProperty];

            jest.spyOn(priorityProperty, 'read').mockResolvedValue('5');

            // Test first alias
            const condition1: PropertyCondition = {
                property: 'priorite',
                type: 'equals',
                value: 5
            };
            expect(await conditionManager.evaluateCondition(condition1, instance, currentDoc)).toBe(true);

            // Test second alias
            const condition2: PropertyCondition = {
                property: 'prio',
                type: 'greaterThan',
                value: 3
            };
            expect(await conditionManager.evaluateCondition(condition2, instance, currentDoc)).toBe(true);

            // Test third alias
            const condition3: PropertyCondition = {
                property: 'importance',
                type: 'lessThan',
                value: 10
            };
            expect(await conditionManager.evaluateCondition(condition3, instance, currentDoc)).toBe(true);
        });

        test('should prefer actual property name over alias', async () => {
            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'TestDoc';
            jest.spyOn(currentDoc, 'getName').mockReturnValue('TestDoc');

            const instance = new Classe(vault);

            // Create two properties: one with name, one with that name as alias
            const mainProperty = new TextProperty('status', vault);
            const oldProperty = new TextProperty('oldProp', vault);
            oldProperty.aliases = ['status']; // This creates a conflict
            
            (instance as any).properties = [mainProperty, oldProperty];

            jest.spyOn(mainProperty, 'read').mockResolvedValue('active');
            jest.spyOn(oldProperty, 'read').mockResolvedValue('inactive');

            // Should use mainProperty (actual name takes precedence)
            const condition: PropertyCondition = {
                property: 'status',
                type: 'equals',
                value: 'active'
            };

            const result = await conditionManager.evaluateCondition(condition, instance, currentDoc);
            expect(result).toBe(true);
        });

        test('should handle contains with aliases', async () => {
            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'TestDoc';
            jest.spyOn(currentDoc, 'getName').mockReturnValue('TestDoc');

            const instance = new Classe(vault);
            const tagsProperty = new TextProperty('tags', vault);
            tagsProperty.aliases = ['labels', 'categories'];
            (instance as any).properties = [tagsProperty];

            jest.spyOn(tagsProperty, 'read').mockResolvedValue(['important', 'urgent', 'pending']);

            // Use alias in contains condition
            const condition: PropertyCondition = {
                property: 'labels', // Using alias
                type: 'contains',
                value: 'urgent'
            };

            const result = await conditionManager.evaluateCondition(condition, instance, currentDoc);
            expect(result).toBe(true);
        });

        test('should handle isEmpty with aliases', async () => {
            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'TestDoc';
            jest.spyOn(currentDoc, 'getName').mockReturnValue('TestDoc');

            const instance = new Classe(vault);
            const descProperty = new TextProperty('description', vault);
            descProperty.aliases = ['desc', 'details'];
            (instance as any).properties = [descProperty];

            jest.spyOn(descProperty, 'read').mockResolvedValue('');

            // Use alias in isEmpty condition
            const condition: PropertyCondition = {
                property: 'desc', // Using alias
                type: 'isEmpty'
            };

            const result = await conditionManager.evaluateCondition(condition, instance, currentDoc);
            expect(result).toBe(true);
        });

        test('should return null when property alias not found', async () => {
            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'TestDoc';
            jest.spyOn(currentDoc, 'getName').mockReturnValue('TestDoc');

            const instance = new Classe(vault);
            const statusProperty = new TextProperty('status', vault);
            (instance as any).properties = [statusProperty];

            jest.spyOn(statusProperty, 'read').mockResolvedValue('active');

            // Use non-existent alias
            const condition: PropertyCondition = {
                property: 'nonExistentAlias',
                type: 'equals',
                value: 'active'
            };

            // Should warn and return false (null value doesn't equal 'active')
            const result = await conditionManager.evaluateCondition(condition, instance, currentDoc);
            expect(result).toBe(false);
        });

        test('should work in validation function with aliases', async () => {
            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'TestDoc';
            jest.spyOn(currentDoc, 'getName').mockReturnValue('TestDoc');

            const instance1 = new Classe(vault);
            const instance2 = new Classe(vault);

            // Both instances have property with aliases
            const prop1 = new TextProperty('status', vault);
            prop1.aliases = ['etat'];
            const prop2 = new TextProperty('status', vault);
            prop2.aliases = ['etat'];

            (instance1 as any).properties = [prop1];
            (instance2 as any).properties = [prop2];

            jest.spyOn(prop1, 'read').mockResolvedValue('active');
            jest.spyOn(prop2, 'read').mockResolvedValue('inactive');

            // Use alias in validation function
            const conditions: PropertyCondition[] = [
                {
                    property: 'etat', // Using alias
                    type: 'equals',
                    value: 'active'
                }
            ];

            const validationFn = conditionManager.createValidationFunction(conditions, currentDoc);

            expect(await validationFn(instance1)).toBe(true);
            expect(await validationFn(instance2)).toBe(false);
        });

        test('should handle complex conditions with multiple aliases', async () => {
            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'TestDoc';
            jest.spyOn(currentDoc, 'getName').mockReturnValue('TestDoc');

            const instance = new Classe(vault);
            
            const statusProp = new TextProperty('status', vault);
            statusProp.aliases = ['etat'];
            const priorityProp = new NumberProperty('priority', vault);
            priorityProp.aliases = ['priorite'];
            
            (instance as any).properties = [statusProp, priorityProp];

            jest.spyOn(statusProp, 'read').mockResolvedValue('active');
            jest.spyOn(priorityProp, 'read').mockResolvedValue('8');

            // Multiple conditions using aliases
            const conditions: PropertyCondition[] = [
                {
                    property: 'etat',
                    type: 'equals',
                    value: 'active'
                },
                {
                    property: 'priorite',
                    type: 'greaterThan',
                    value: 5
                }
            ];

            const result = await conditionManager.evaluateConditions(conditions, instance, currentDoc);
            expect(result).toBe(true);
        });
    });
});
