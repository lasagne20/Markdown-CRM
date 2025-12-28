import { ConditionManager, PropertyCondition } from '../../src/Config/ConditionManager';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { TextProperty } from '../../src/properties/TextProperty';
import { MultiFileProperty } from '../../src/properties/MultiFileProperty';
import { mockApp } from '../utils/mocks';

describe('ConditionManager - Current Links Validation', () => {
    let conditionManager: ConditionManager;
    let vault: Vault;
    let app: any;

    beforeEach(() => {
        app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);
        conditionManager = new ConditionManager();
    });

    describe('equals condition with current value', () => {
        test('should work with simple link format [[FileName]]', async () => {
            console.log('🧪 Testing equals with simple link [[FileName]]...');

            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'test-document';
            jest.spyOn(currentDoc, 'getName').mockReturnValue('test-document');
            jest.spyOn(currentDoc, 'getPath').mockReturnValue('test-document');
            jest.spyOn(currentDoc, 'getFile').mockImplementation(() => ({
                getName: (withExt: boolean = true) => withExt ? 'test-document.md' : 'test-document'
            } as any));

            const instance = new Classe(vault);
            (instance as any).name = 'client-instance';
            
            const textProperty = new TextProperty('assigné', vault);
            (instance as any).properties = [textProperty];
            jest.spyOn(textProperty, 'read').mockResolvedValue('[[test-document]]');

            const condition: PropertyCondition = {
                property: 'assigné',
                type: 'equals',
                value: 'current'
            };

            const result = await conditionManager.evaluateCondition(condition, instance, currentDoc);

            console.log('✅ Simple link result:', result);
            expect(result).toBe(true);
        });

        test('should work with path-based link [[folder/FileName]]', async () => {
            console.log('🧪 Testing equals with path-based link...');

            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'test-document';
            jest.spyOn(currentDoc, 'getName').mockReturnValue('test-document');
            jest.spyOn(currentDoc, 'getPath').mockReturnValue('clients/test-document');
            jest.spyOn(currentDoc, 'getFile').mockImplementation(() => ({
                getName: (withExt: boolean = true) => withExt ? 'test-document.md' : 'test-document'
            } as any));

            const instance = new Classe(vault);
            (instance as any).name = 'project-instance';
            
            const textProperty = new TextProperty('client', vault);
            (instance as any).properties = [textProperty];
            jest.spyOn(textProperty, 'read').mockResolvedValue('[[clients/test-document]]');

            const condition: PropertyCondition = {
                property: 'client',
                type: 'equals',
                value: 'current'
            };

            const result = await conditionManager.evaluateCondition(condition, instance, currentDoc);

            console.log('✅ Path-based link result:', result);
            expect(result).toBe(true);
        });

        test('should work with display name link [[FileName|Display Name]]', async () => {
            console.log('🧪 Testing equals with display name link...');

            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'test-document';
            jest.spyOn(currentDoc, 'getName').mockReturnValue('test-document');
            jest.spyOn(currentDoc, 'getPath').mockReturnValue('test-document');
            jest.spyOn(currentDoc, 'getFile').mockImplementation(() => ({
                getName: (withExt: boolean = true) => withExt ? 'test-document.md' : 'test-document'
            } as any));

            const instance = new Classe(vault);
            (instance as any).name = 'task-instance';
            
            const textProperty = new TextProperty('responsable', vault);
            (instance as any).properties = [textProperty];
            jest.spyOn(textProperty, 'read').mockResolvedValue('[[test-document|John Doe]]');

            const condition: PropertyCondition = {
                property: 'responsable',
                type: 'equals',
                value: 'current'
            };

            const result = await conditionManager.evaluateCondition(condition, instance, currentDoc);

            console.log('✅ Display name link result:', result);
            expect(result).toBe(true);
        });

        test('should work with spaced file names', async () => {
            console.log('🧪 Testing equals with spaced file names...');

            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'Test Document With Spaces';
            jest.spyOn(currentDoc, 'getName').mockReturnValue('Test Document With Spaces');
            jest.spyOn(currentDoc, 'getPath').mockReturnValue('Test Document With Spaces');
            jest.spyOn(currentDoc, 'getFile').mockImplementation(() => ({
                getName: (withExt: boolean = true) => withExt ? 'Test Document With Spaces.md' : 'Test Document With Spaces'
            } as any));

            const instance = new Classe(vault);
            (instance as any).name = 'spaced-instance';
            
            const textProperty = new TextProperty('document', vault);
            (instance as any).properties = [textProperty];
            jest.spyOn(textProperty, 'read').mockResolvedValue('[[Test Document With Spaces]]');

            const condition: PropertyCondition = {
                property: 'document',
                type: 'equals',
                value: 'current'
            };

            const result = await conditionManager.evaluateCondition(condition, instance, currentDoc);

            console.log('✅ Spaced file names result:', result);
            expect(result).toBe(true);
        });

        test('should work with $current format', async () => {
            console.log('🧪 Testing equals with $current...');

            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'current-test';
            jest.spyOn(currentDoc, 'getName').mockReturnValue('current-test');
            jest.spyOn(currentDoc, 'getPath').mockReturnValue('current-test');
            jest.spyOn(currentDoc, 'getFile').mockImplementation(() => ({
                getName: (withExt: boolean = true) => withExt ? 'current-test.md' : 'current-test'
            } as any));

            const instance = new Classe(vault);
            (instance as any).name = 'dollar-instance';
            
            const textProperty = new TextProperty('owner', vault);
            (instance as any).properties = [textProperty];
            jest.spyOn(textProperty, 'read').mockResolvedValue('[[current-test]]');

            const condition: PropertyCondition = {
                property: 'owner',
                type: 'equals',
                value: '$current'
            };

            const result = await conditionManager.evaluateCondition(condition, instance, currentDoc);

            console.log('✅ $current format result:', result);
            expect(result).toBe(true);
        });
    });

    describe('equals condition with arrays', () => {
        test('should work with current in MultiFileProperty arrays', async () => {
            console.log('🧪 Testing equals with current in arrays...');

            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'team-lead';
            jest.spyOn(currentDoc, 'getName').mockReturnValue('team-lead');
            jest.spyOn(currentDoc, 'getPath').mockReturnValue('team-lead');
            jest.spyOn(currentDoc, 'getFile').mockImplementation(() => ({
                getName: (withExt: boolean = true) => withExt ? 'team-lead.md' : 'team-lead'
            } as any));

            const instance = new Classe(vault);
            (instance as any).name = 'project-instance';
            
            const multiFileProperty = new MultiFileProperty('équipe', vault, ['User']);
            (instance as any).properties = [multiFileProperty];
            jest.spyOn(multiFileProperty, 'read').mockResolvedValue([
                '[[team-lead]]',
                '[[other-member]]',
                '[[third-member]]'
            ]);

            const condition: PropertyCondition = {
                property: 'équipe',
                type: 'equals',
                value: 'current'
            };

            const result = await conditionManager.evaluateCondition(condition, instance, currentDoc);

            console.log('✅ Array equals result:', result);
            expect(result).toBe(true);
        });
    });

    describe('other conditions with current value', () => {
        test('should work with notEquals condition', async () => {
            console.log('🧪 Testing notEquals with current...');

            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'current-user';
            jest.spyOn(currentDoc, 'getName').mockReturnValue('current-user');
            jest.spyOn(currentDoc, 'getPath').mockReturnValue('current-user');
            jest.spyOn(currentDoc, 'getFile').mockImplementation(() => ({
                getName: (withExt: boolean = true) => withExt ? 'current-user.md' : 'current-user'
            } as any));

            const instance = new Classe(vault);
            (instance as any).name = 'test-instance';
            
            const textProperty = new TextProperty('author', vault);
            (instance as any).properties = [textProperty];
            jest.spyOn(textProperty, 'read').mockResolvedValue('[[other-user]]');

            const condition: PropertyCondition = {
                property: 'author',
                type: 'notEquals',
                value: 'current'
            };

            const result = await conditionManager.evaluateCondition(condition, instance, currentDoc);

            console.log('✅ notEquals result:', result);
            expect(result).toBe(true);
        });

        test('should work with equalsAny condition', async () => {
            console.log('🧪 Testing equalsAny with current...');

            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'valid-user';
            jest.spyOn(currentDoc, 'getName').mockReturnValue('valid-user');
            jest.spyOn(currentDoc, 'getPath').mockReturnValue('valid-user');
            jest.spyOn(currentDoc, 'getFile').mockImplementation(() => ({
                getName: (withExt: boolean = true) => withExt ? 'valid-user.md' : 'valid-user'
            } as any));

            const instance = new Classe(vault);
            (instance as any).name = 'test-instance';
            
            const textProperty = new TextProperty('approver', vault);
            (instance as any).properties = [textProperty];
            jest.spyOn(textProperty, 'read').mockResolvedValue('[[valid-user]]');

            const condition: PropertyCondition = {
                property: 'approver',
                type: 'equalsAny',
                values: ['admin-user', 'current', 'supervisor']
            };

            const result = await conditionManager.evaluateCondition(condition, instance, currentDoc);

            console.log('✅ equalsAny result:', result);
            expect(result).toBe(true);
        });

        test('should work with notEqualsAny condition', async () => {
            console.log('🧪 Testing notEqualsAny with current...');

            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'excluded-user';
            jest.spyOn(currentDoc, 'getName').mockReturnValue('excluded-user');
            jest.spyOn(currentDoc, 'getPath').mockReturnValue('excluded-user');
            jest.spyOn(currentDoc, 'getFile').mockImplementation(() => ({
                getName: (withExt: boolean = true) => withExt ? 'excluded-user.md' : 'excluded-user'
            } as any));

            const instance = new Classe(vault);
            (instance as any).name = 'test-instance';
            
            const textProperty = new TextProperty('author', vault);
            (instance as any).properties = [textProperty];
            jest.spyOn(textProperty, 'read').mockResolvedValue('[[excluded-user]]');

            const condition: PropertyCondition = {
                property: 'author',
                type: 'notEqualsAny',
                values: ['current', 'blocked-user', 'suspended-user']
            };

            const result = await conditionManager.evaluateCondition(condition, instance, currentDoc);

            console.log('✅ notEqualsAny result:', result);
            expect(result).toBe(false); // Should be false since current user IS in the excluded list
        });

        test('should work with notContains condition with arrays', async () => {
            console.log('🧪 Testing notContains with current in arrays...');

            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'excluded-member';
            jest.spyOn(currentDoc, 'getName').mockReturnValue('excluded-member');
            jest.spyOn(currentDoc, 'getPath').mockReturnValue('excluded-member');
            jest.spyOn(currentDoc, 'getFile').mockImplementation(() => ({
                getName: (withExt: boolean = true) => withExt ? 'excluded-member.md' : 'excluded-member'
            } as any));

            const instance = new Classe(vault);
            (instance as any).name = 'project-instance';
            
            const multiFileProperty = new MultiFileProperty('team', vault, ['User']);
            (instance as any).properties = [multiFileProperty];
            const teamArray = [
                '[[team-lead]]',
                '[[developer-1]]',
                '[[excluded-member]]'
            ];
            jest.spyOn(multiFileProperty, 'read').mockResolvedValue(teamArray);

            console.log('🔍 Array content:', JSON.stringify(teamArray));
            console.log('🔍 Looking for:', currentDoc.getName());

            const condition: PropertyCondition = {
                property: 'team',
                type: 'notContains',
                value: 'current'
            };

            const result = await conditionManager.evaluateCondition(condition, instance, currentDoc);

            console.log('✅ notContains array result:', result);
            expect(result).toBe(false); // Should be false since current user IS in the team
        });

        test('should work with mixed current and $current in equalsAny', async () => {
            console.log('🧪 Testing mixed current/$current formats...');

            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'mixed-user';
            jest.spyOn(currentDoc, 'getName').mockReturnValue('mixed-user');
            jest.spyOn(currentDoc, 'getPath').mockReturnValue('mixed-user');
            jest.spyOn(currentDoc, 'getFile').mockImplementation(() => ({
                getName: (withExt: boolean = true) => withExt ? 'mixed-user.md' : 'mixed-user'
            } as any));

            const instance = new Classe(vault);
            (instance as any).name = 'test-instance';
            
            const textProperty = new TextProperty('assignee', vault);
            (instance as any).properties = [textProperty];
            jest.spyOn(textProperty, 'read').mockResolvedValue('[[mixed-user]]');

            const condition: PropertyCondition = {
                property: 'assignee',
                type: 'equalsAny',
                values: ['static-user', 'current', '$current', 'another-user']
            };

            const result = await conditionManager.evaluateCondition(condition, instance, currentDoc);

            console.log('✅ Mixed current/$current result:', result);
            expect(result).toBe(true);
        });
    });
});