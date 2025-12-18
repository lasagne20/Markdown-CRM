import { ConditionManager, DirectLinkCondition } from '../../src/Config/ConditionManager';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { FileProperty } from '../../src/properties/FileProperty';
import { MultiFileProperty } from '../../src/properties/MultiFileProperty';
import { mockApp } from '../utils/mocks';

describe('ConditionManager - DirectLinkCondition', () => {
    let conditionManager: ConditionManager;
    let vault: Vault;
    let app: any;

    beforeEach(() => {
        app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);
        conditionManager = new ConditionManager();
    });

    describe('evaluateCondition with DirectLinkCondition', () => {
        test('should return true when instance has a direct link to current document', async () => {
            // Create current document
            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'CurrentDocument';

            // Create instance with a FileProperty linking to current document
            const instance = new Classe(vault);
            (instance as any).name = 'TestInstance';
            
            const fileProperty = new FileProperty('relatedDoc', vault, ['Classe']);
            (instance as any).properties = [fileProperty]; // Use array

            // Mock the property read to return link to current document
            jest.spyOn(fileProperty, 'read').mockResolvedValue('[[CurrentDocument]]');

            const condition: DirectLinkCondition = {
                conditionType: 'directLink',
                currentDocument: currentDoc
            };

            const result = await conditionManager.evaluateCondition(condition, instance);
            expect(result).toBe(true);
        });

        test('should return false when instance has no link to current document', async () => {
            // Create current document
            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'CurrentDocument';

            // Create instance with a FileProperty linking to different document
            const instance = new Classe(vault);
            (instance as any).name = 'TestInstance';
            
            const fileProperty = new FileProperty('relatedDoc', vault, ['Classe']);
            (instance as any).properties = [fileProperty];

            // Mock the property read to return link to different document
            jest.spyOn(fileProperty, 'read').mockResolvedValue('[[OtherDocument]]');

            const condition: DirectLinkCondition = {
                conditionType: 'directLink',
                currentDocument: currentDoc
            };

            const result = await conditionManager.evaluateCondition(condition, instance);
            expect(result).toBe(false);
        });

        test('should check specific property when linkProperty is specified', async () => {
            // Create current document
            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'CurrentDocument';

            // Create instance with multiple properties
            const instance = new Classe(vault);
            (instance as any).name = 'TestInstance';
            
            const fileProperty1 = new FileProperty('institution', vault, ['Institution']);
            const fileProperty2 = new FileProperty('contact', vault, ['Personne']);
            (instance as any).properties = [fileProperty1, fileProperty2];

            // Mock: institution links to CurrentDocument, contact links to other
            jest.spyOn(fileProperty1, 'read').mockResolvedValue('[[CurrentDocument]]');
            jest.spyOn(fileProperty2, 'read').mockResolvedValue('[[OtherPerson]]');

            // Check only the institution property
            const condition: DirectLinkCondition = {
                conditionType: 'directLink',
                currentDocument: currentDoc,
                linkProperty: 'institution'
            };

            const result = await conditionManager.evaluateCondition(condition, instance);
            expect(result).toBe(true);
        });

        test('should work with MultiFileProperty containing current document', async () => {
            // Create current document
            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'CurrentDocument';

            // Create instance with MultiFileProperty
            const instance = new Classe(vault);
            (instance as any).name = 'TestInstance';
            
            const multiFileProperty = new MultiFileProperty('contacts', vault, ['Personne']);
            (instance as any).properties = [multiFileProperty];

            // Mock the property read to return array including current document
            jest.spyOn(multiFileProperty, 'read').mockResolvedValue([
                '[[OtherPerson1]]',
                '[[CurrentDocument]]',
                '[[OtherPerson2]]'
            ]);

            const condition: DirectLinkCondition = {
                conditionType: 'directLink',
                currentDocument: currentDoc
            };

            const result = await conditionManager.evaluateCondition(condition, instance);
            expect(result).toBe(true);
        });

        test('should return false when MultiFileProperty does not contain current document', async () => {
            // Create current document
            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'CurrentDocument';

            // Create instance with MultiFileProperty
            const instance = new Classe(vault);
            (instance as any).name = 'TestInstance';
            
            const multiFileProperty = new MultiFileProperty('contacts', vault, ['Personne']);
            (instance as any).properties = [multiFileProperty];

            // Mock the property read to return array NOT including current document
            jest.spyOn(multiFileProperty, 'read').mockResolvedValue([
                '[[OtherPerson1]]',
                '[[OtherPerson2]]'
            ]);

            const condition: DirectLinkCondition = {
                conditionType: 'directLink',
                currentDocument: currentDoc
            };

            const result = await conditionManager.evaluateCondition(condition, instance);
            expect(result).toBe(false);
        });

        test('should normalize links correctly (with or without brackets)', async () => {
            // Create current document
            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'CurrentDocument';

            // Create instance
            const instance = new Classe(vault);
            (instance as any).name = 'TestInstance';
            
            const fileProperty = new FileProperty('relatedDoc', vault, ['Classe']);
            (instance as any).properties = [fileProperty];

            // Mock property with brackets
            jest.spyOn(fileProperty, 'read').mockResolvedValue('[[CurrentDocument]]');

            const condition: DirectLinkCondition = {
                conditionType: 'directLink',
                currentDocument: currentDoc
            };

            const result = await conditionManager.evaluateCondition(condition, instance);
            expect(result).toBe(true);
        });

        test('should return false when property value is empty', async () => {
            // Create current document
            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'CurrentDocument';

            // Create instance with empty property
            const instance = new Classe(vault);
            (instance as any).name = 'TestInstance';
            
            const fileProperty = new FileProperty('relatedDoc', vault, ['Classe']);
            (instance as any).properties = [fileProperty];

            // Mock empty value
            jest.spyOn(fileProperty, 'read').mockResolvedValue('');

            const condition: DirectLinkCondition = {
                conditionType: 'directLink',
                currentDocument: currentDoc
            };

            const result = await conditionManager.evaluateCondition(condition, instance);
            expect(result).toBe(false);
        });

        test('should check all file properties when no linkProperty specified', async () => {
            // Create current document
            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'CurrentDocument';

            // Create instance with multiple file properties
            const instance = new Classe(vault);
            (instance as any).name = 'TestInstance';
            
            const fileProperty1 = new FileProperty('institution', vault, ['Institution']);
            const fileProperty2 = new FileProperty('contact', vault, ['Personne']);
            const fileProperty3 = new FileProperty('lieu', vault, ['Lieu']);
            
            (instance as any).properties = [fileProperty1, fileProperty2, fileProperty3];

            // Mock: only contact links to CurrentDocument
            jest.spyOn(fileProperty1, 'read').mockResolvedValue('[[Institution1]]');
            jest.spyOn(fileProperty2, 'read').mockResolvedValue('[[CurrentDocument]]');
            jest.spyOn(fileProperty3, 'read').mockResolvedValue('[[Lieu1]]');

            const condition: DirectLinkCondition = {
                conditionType: 'directLink',
                currentDocument: currentDoc
            };

            const result = await conditionManager.evaluateCondition(condition, instance);
            expect(result).toBe(true);
        });
    });

    describe('createValidationFunction with DirectLinkCondition', () => {
        test('should create validation function that filters by direct link', async () => {
            // Create current document
            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'CurrentDocument';

            const condition: DirectLinkCondition = {
                conditionType: 'directLink',
                currentDocument: currentDoc
            };

            const validationFunction = conditionManager.createValidationFunction([condition]);

            // Create test instance linked to current document
            const linkedInstance = new Classe(vault);
            (linkedInstance as any).name = 'LinkedInstance';
            const fileProperty1 = new FileProperty('relatedDoc', vault, ['Classe']);
            (linkedInstance as any).properties = [fileProperty1];
            jest.spyOn(fileProperty1, 'read').mockResolvedValue('[[CurrentDocument]]');

            // Create test instance NOT linked to current document
            const unlinkedInstance = new Classe(vault);
            (unlinkedInstance as any).name = 'UnlinkedInstance';
            const fileProperty2 = new FileProperty('relatedDoc', vault, ['Classe']);
            (unlinkedInstance as any).properties = [fileProperty2];
            jest.spyOn(fileProperty2, 'read').mockResolvedValue('[[OtherDocument]]');

            expect(await validationFunction(linkedInstance)).toBe(true);
            expect(await validationFunction(unlinkedInstance)).toBe(false);
        });
    });
});
