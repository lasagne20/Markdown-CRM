import { ConditionManager, PropertyCondition } from '../../src/Config/ConditionManager';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { MultiFileProperty } from '../../src/properties/MultiFileProperty';
import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { TextProperty } from '../../src/properties/TextProperty';
import { mockApp } from '../utils/mocks';

describe('ConditionManager - Current Value Resolution', () => {
    let conditionManager: ConditionManager;
    let vault: Vault;
    let app: any;

    beforeEach(() => {
        app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);
        conditionManager = new ConditionManager();
    });

    describe('contains operator with current value', () => {
        test('should resolve "current" to current document link in MultiFileProperty', async () => {
            // Create current document
            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'Institution XYZ';
            jest.spyOn(currentDoc, 'getName').mockReturnValue('Institution XYZ');
            jest.spyOn(currentDoc, 'getPath').mockReturnValue('Institution XYZ');

            // Create instance with MultiFileProperty containing links
            const instance = new Classe(vault);
            (instance as any).name = 'Projet ABC';
            
            const multiFileProperty = new MultiFileProperty('institutions', vault, ['Institution']);
            (instance as any).properties = [multiFileProperty];

            // Mock the property to return an array with the current document link
            jest.spyOn(multiFileProperty, 'read').mockResolvedValue([
                '[[Institution XYZ]]',
                '[[Other Institution]]'
            ]);

            const condition: PropertyCondition = {
                property: 'institutions',
                type: 'contains',
                value: 'current'
            };

            const result = await conditionManager.evaluateCondition(condition, instance, currentDoc);
            expect(result).toBe(true);
        });

        test('should return false when current document is not in the array', async () => {
            // Create current document
            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'Institution XYZ';
            jest.spyOn(currentDoc, 'getName').mockReturnValue('Institution XYZ');
            jest.spyOn(currentDoc, 'getPath').mockReturnValue('Institution XYZ');

            // Create instance with MultiFileProperty not containing current doc
            const instance = new Classe(vault);
            (instance as any).name = 'Projet ABC';
            
            const multiFileProperty = new MultiFileProperty('institutions', vault, ['Institution']);
            (instance as any).properties = [multiFileProperty];

            jest.spyOn(multiFileProperty, 'read').mockResolvedValue([
                '[[Different Institution]]',
                '[[Other Institution]]'
            ]);

            const condition: PropertyCondition = {
                property: 'institutions',
                type: 'contains',
                value: 'current'
            };

            const result = await conditionManager.evaluateCondition(condition, instance, currentDoc);
            expect(result).toBe(false);
        });

        test('should work with ObjectProperty containing link arrays', async () => {
            // Create current document
            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'Institution ABC';
            jest.spyOn(currentDoc, 'getName').mockReturnValue('Institution ABC');
            jest.spyOn(currentDoc, 'getPath').mockReturnValue('Institution ABC');

            // Create instance with ObjectProperty
            const instance = new Classe(vault);
            (instance as any).name = 'Employee';
            
            const objectProperty = new ObjectProperty('postes', vault, {
                institution: new MultiFileProperty('institution', vault, ['Institution']),
                poste: new TextProperty('poste', vault)
            });
            (instance as any).properties = [objectProperty];

            // Mock the property to return array of objects with institutions
            jest.spyOn(objectProperty, 'read').mockResolvedValue([
                { institution: '[[Institution ABC]]', poste: 'Manager' },
                { institution: '[[Other Corp]]', poste: 'Director' }
            ]);

            // Condition checking if postes array contains current institution
            // This would be interpreted as: does the postes property (as a whole) contain a reference to current?
            const condition: PropertyCondition = {
                property: 'postes',
                type: 'contains',
                value: 'current'
            };

            const result = await conditionManager.evaluateCondition(condition, instance, currentDoc);
            expect(result).toBe(true);
        });

        test('should handle links with paths and display names', async () => {
            // Create current document
            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'CurrentDoc';
            jest.spyOn(currentDoc, 'getName').mockReturnValue('CurrentDoc');
            jest.spyOn(currentDoc, 'getPath').mockReturnValue('folder/CurrentDoc');

            // Create instance with links using different formats
            const instance = new Classe(vault);
            const multiFileProperty = new MultiFileProperty('links', vault, ['Document']);
            (instance as any).properties = [multiFileProperty];

            jest.spyOn(multiFileProperty, 'read').mockResolvedValue([
                '[[folder/CurrentDoc|Display Name]]',
                '[[OtherDoc]]'
            ]);

            const condition: PropertyCondition = {
                property: 'links',
                type: 'contains',
                value: 'current'
            };

            const result = await conditionManager.evaluateCondition(condition, instance, currentDoc);
            expect(result).toBe(true);
        });
    });

    describe('equals operator with current value', () => {
        test('should resolve "current" to current document link', async () => {
            // Create current document
            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'MainDoc';
            jest.spyOn(currentDoc, 'getName').mockReturnValue('MainDoc');

            // Create instance with property equal to current doc
            const instance = new Classe(vault);
            const textProperty = new TextProperty('reference', vault);
            (instance as any).properties = [textProperty];

            jest.spyOn(textProperty, 'read').mockResolvedValue('[[MainDoc]]');

            const condition: PropertyCondition = {
                property: 'reference',
                type: 'equals',
                value: 'current'
            };

            const result = await conditionManager.evaluateCondition(condition, instance, currentDoc);
            expect(result).toBe(true);
        });
    });

    describe('notContains operator with current value', () => {
        test('should return true when current document is not in the array', async () => {
            // Create current document
            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'ExcludedDoc';
            jest.spyOn(currentDoc, 'getName').mockReturnValue('ExcludedDoc');
            jest.spyOn(currentDoc, 'getPath').mockReturnValue('ExcludedDoc');

            // Create instance without current doc in array
            const instance = new Classe(vault);
            const multiFileProperty = new MultiFileProperty('excludedDocs', vault, ['Document']);
            (instance as any).properties = [multiFileProperty];

            jest.spyOn(multiFileProperty, 'read').mockResolvedValue([
                '[[Doc1]]',
                '[[Doc2]]'
            ]);

            const condition: PropertyCondition = {
                property: 'excludedDocs',
                type: 'notContains',
                value: 'current'
            };

            const result = await conditionManager.evaluateCondition(condition, instance, currentDoc);
            expect(result).toBe(true);
        });
    });

    describe('equalsAny operator with current value', () => {
        test('should resolve "current" in values array', async () => {
            // Create current document
            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'SpecialDoc';
            jest.spyOn(currentDoc, 'getName').mockReturnValue('SpecialDoc');

            // Create instance
            const instance = new Classe(vault);
            const textProperty = new TextProperty('status', vault);
            (instance as any).properties = [textProperty];

            jest.spyOn(textProperty, 'read').mockResolvedValue('[[SpecialDoc]]');

            const condition: PropertyCondition = {
                property: 'status',
                type: 'equalsAny',
                values: ['[[OtherDoc]]', 'current', '[[AnotherDoc]]']
            };

            const result = await conditionManager.evaluateCondition(condition, instance, currentDoc);
            expect(result).toBe(true);
        });
    });

    describe('edge cases', () => {
        test('should work with non-current values in contains', async () => {
            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'Doc';
            jest.spyOn(currentDoc, 'getName').mockReturnValue('Doc');

            const instance = new Classe(vault);
            const textProperty = new TextProperty('field', vault);
            (instance as any).properties = [textProperty];

            jest.spyOn(textProperty, 'read').mockResolvedValue('some value');

            const condition: PropertyCondition = {
                property: 'field',
                type: 'contains',
                value: 'value'
            };

            const result = await conditionManager.evaluateCondition(condition, instance, currentDoc);
            expect(result).toBe(true); // 'some value' contains 'value'
        });

        test('should work with empty arrays', async () => {
            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'Doc';
            jest.spyOn(currentDoc, 'getName').mockReturnValue('Doc');

            const instance = new Classe(vault);
            const multiFileProperty = new MultiFileProperty('links', vault, ['Doc']);
            (instance as any).properties = [multiFileProperty];

            jest.spyOn(multiFileProperty, 'read').mockResolvedValue([]);

            const condition: PropertyCondition = {
                property: 'links',
                type: 'contains',
                value: 'current'
            };

            const result = await conditionManager.evaluateCondition(condition, instance, currentDoc);
            expect(result).toBe(false);
        });
    });
});
