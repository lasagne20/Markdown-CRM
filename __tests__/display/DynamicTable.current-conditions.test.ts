import { ConditionManager, PropertyCondition } from '../../src/Config/ConditionManager';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { TextProperty } from '../../src/properties/TextProperty';
import { MultiFileProperty } from '../../src/properties/MultiFileProperty';
import { mockApp } from '../utils/mocks';

describe('Current Value Conditions - Validation Test', () => {
    let conditionManager: ConditionManager;
    let vault: Vault;
    let app: any;

    beforeEach(() => {
        app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);
        conditionManager = new ConditionManager();
    });

    test('should validate that "current" and "$current" work for equals conditions', async () => {
        console.log('🧪 Testing current and $current values in equals conditions...');

        // Create current document
        const currentDoc = new Classe(vault);
        (currentDoc as any).name = 'commercial-alpha';
        jest.spyOn(currentDoc, 'getName').mockReturnValue('commercial-alpha');
        jest.spyOn(currentDoc, 'getPath').mockReturnValue('commercial-alpha');

        // Create instance with TextProperty
        const instance = new Classe(vault);
        (instance as any).name = 'client-alpha';
        
        const textProperty = new TextProperty('commercial', vault);
        (instance as any).properties = [textProperty];
        jest.spyOn(textProperty, 'read').mockResolvedValue('[[commercial-alpha]]');

        // Test with 'current'
        const conditionCurrent: PropertyCondition = {
            property: 'commercial',
            type: 'equals',
            value: 'current'
        };

        // Test with '$current'
        const conditionDollar: PropertyCondition = {
            property: 'commercial',
            type: 'equals',
            value: '$current'
        };

        const resultCurrent = await conditionManager.evaluateCondition(conditionCurrent, instance, currentDoc);
        const resultDollar = await conditionManager.evaluateCondition(conditionDollar, instance, currentDoc);

        console.log('✅ Condition results:', { 
            'current': resultCurrent, 
            '$current': resultDollar 
        });

        // Both should work and return true
        expect(resultCurrent).toBe(true);
        expect(resultDollar).toBe(true);
    });

    test('should validate that "current" and "$current" work for contains conditions', async () => {
        console.log('🧪 Testing current and $current values in contains conditions...');

        // Create current document
        const currentDoc = new Classe(vault);
        (currentDoc as any).name = 'commercial-beta';
        jest.spyOn(currentDoc, 'getName').mockReturnValue('commercial-beta');
        jest.spyOn(currentDoc, 'getPath').mockReturnValue('commercial-beta');

        // Create instance with TextProperty containing the current document
        const instance = new Classe(vault);
        (instance as any).name = 'project-beta';
        
        const textProperty = new TextProperty('description', vault);
        (instance as any).properties = [textProperty];
        jest.spyOn(textProperty, 'read').mockResolvedValue('Projet géré par [[commercial-beta]] et son équipe');

        // Test with 'current'
        const conditionCurrent: PropertyCondition = {
            property: 'description',
            type: 'contains',
            value: 'current'
        };

        // Test with '$current'
        const conditionDollar: PropertyCondition = {
            property: 'description',
            type: 'contains',
            value: '$current'
        };

        const resultCurrent = await conditionManager.evaluateCondition(conditionCurrent, instance, currentDoc);
        const resultDollar = await conditionManager.evaluateCondition(conditionDollar, instance, currentDoc);

        console.log('✅ Contains condition results:', { 
            'current': resultCurrent, 
            '$current': resultDollar 
        });

        // Both should work and return true
        expect(resultCurrent).toBe(true);
        expect(resultDollar).toBe(true);
    });

    test('should validate that "current" and "$current" work with MultiFileProperty arrays', async () => {
        console.log('🧪 Testing current and $current values with MultiFileProperty arrays...');

        // Create current document
        const currentDoc = new Classe(vault);
        (currentDoc as any).name = 'Institution XYZ';
        jest.spyOn(currentDoc, 'getName').mockReturnValue('Institution XYZ');
        jest.spyOn(currentDoc, 'getPath').mockReturnValue('Institution XYZ');

        // Create instance with MultiFileProperty
        const instance = new Classe(vault);
        (instance as any).name = 'Projet ABC';
        
        const multiFileProperty = new MultiFileProperty('institutions', vault, ['Institution']);
        (instance as any).properties = [multiFileProperty];
        jest.spyOn(multiFileProperty, 'read').mockResolvedValue([
            '[[Institution XYZ]]',
            '[[Other Institution]]'
        ]);

        // Test with 'current'
        const conditionCurrent: PropertyCondition = {
            property: 'institutions',
            type: 'contains',
            value: 'current'
        };

        // Test with '$current'
        const conditionDollar: PropertyCondition = {
            property: 'institutions',
            type: 'contains',
            value: '$current'
        };

        const resultCurrent = await conditionManager.evaluateCondition(conditionCurrent, instance, currentDoc);
        const resultDollar = await conditionManager.evaluateCondition(conditionDollar, instance, currentDoc);

        console.log('✅ MultiFileProperty condition results:', { 
            'current': resultCurrent, 
            '$current': resultDollar 
        });

        // Both should work and return true
        expect(resultCurrent).toBe(true);
        expect(resultDollar).toBe(true);
    });

    test('should handle edge case when currentDocument is null', async () => {
        console.log('🧪 Testing edge case with null currentDocument...');

        const instance = new Classe(vault);
        (instance as any).name = 'test-instance';
        
        const textProperty = new TextProperty('owner', vault);
        (instance as any).properties = [textProperty];
        jest.spyOn(textProperty, 'read').mockResolvedValue('some-owner');

        // Test with both formats when currentDoc is null
        const conditionCurrent: PropertyCondition = {
            property: 'owner',
            type: 'equals',
            value: 'current'
        };

        const conditionDollar: PropertyCondition = {
            property: 'owner',
            type: 'equals',
            value: '$current'
        };

        const resultCurrent = await conditionManager.evaluateCondition(conditionCurrent, instance, null as any);
        const resultDollar = await conditionManager.evaluateCondition(conditionDollar, instance, null as any);

        console.log('✅ Null currentDocument results:', { 
            'current': resultCurrent, 
            '$current': resultDollar 
        });

        // Both should return false when currentDocument is null
        expect(resultCurrent).toBe(false);
        expect(resultDollar).toBe(false);
    });
});