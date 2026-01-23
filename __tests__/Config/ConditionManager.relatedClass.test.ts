import { ConditionManager, RelatedClassCondition } from '../../src/Config/ConditionManager';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { FileProperty } from '../../src/properties/FileProperty';
import { MultiFileProperty } from '../../src/properties/MultiFileProperty';
import { Property } from '../../src/properties/Property';
import { mockApp } from '../utils/mocks';

describe('ConditionManager - RelatedClassCondition', () => {
    let conditionManager: ConditionManager;
    let vault: Vault;
    let app: any;

    beforeEach(() => {
        app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);
        conditionManager = new ConditionManager(vault);
    });

    describe('Incoming links (Action → Person)', () => {
        test('should find persons referenced by actions matching conditions', async () => {
            // Setup: Person "Alice"
            const alice = new Classe(vault);
            (alice as any).name = 'Alice';

            // Setup: Actions that reference Alice
            const action1 = new Classe(vault);
            (action1 as any).name = 'Action1';
            const participantsProperty1 = new MultiFileProperty('participants', vault, ['Person']);
            (action1 as any).properties = [participantsProperty1];
            jest.spyOn(participantsProperty1, 'read').mockResolvedValue(['[[Alice]]']);

            // Add lieu property to action1
            const lieuProperty1 = new Property('lieu', vault);
            (action1 as any).properties.push(lieuProperty1);
            jest.spyOn(lieuProperty1, 'read').mockResolvedValue('Isère');

            const action2 = new Classe(vault);
            (action2 as any).name = 'Action2';
            const participantsProperty2 = new MultiFileProperty('participants', vault, ['Person']);
            (action2 as any).properties = [participantsProperty2];
            jest.spyOn(participantsProperty2, 'read').mockResolvedValue(['[[Alice]]']);

            const lieuProperty2 = new Property('lieu', vault);
            (action2 as any).properties.push(lieuProperty2);
            jest.spyOn(lieuProperty2, 'read').mockResolvedValue('Rhône');

            // Mock vault methods for getClassInstances
            jest.spyOn(action1, 'getClassName').mockReturnValue('Action');
            jest.spyOn(action2, 'getClassName').mockReturnValue('Action');
            vault.listFiles = jest.fn().mockResolvedValue([
                { path: 'action1.md', name: 'action1.md' },
                { path: 'action2.md', name: 'action2.md' }
            ]);
            vault.getFromFile = jest.fn()
                .mockResolvedValueOnce(action1)
                .mockResolvedValueOnce(action2);

            const condition: RelatedClassCondition = {
                conditionType: 'relatedClass',
                relatedClass: 'Action',
                linkDirection: 'incoming',
                matchMode: 'any',
                conditions: [
                    {
                        property: 'lieu',
                        type: 'equals',
                        value: 'Isère'
                    }
                ]
            };

            const result = await conditionManager.evaluateCondition(condition, alice);
            expect(result).toBe(true); // Alice is in Action1 which has lieu=Isère
        });

        test('should return false when no related instances match conditions', async () => {
            const alice = new Classe(vault);
            (alice as any).name = 'Alice';

            const action1 = new Classe(vault);
            (action1 as any).name = 'Action1';
            const participantsProperty = new MultiFileProperty('participants', vault, ['Person']);
            (action1 as any).properties = [participantsProperty];
            jest.spyOn(participantsProperty, 'read').mockResolvedValue(['[[Alice]]']);

            const lieuProperty = new Property('lieu', vault);
            (action1 as any).properties.push(lieuProperty);
            jest.spyOn(lieuProperty, 'read').mockResolvedValue('Rhône');

            jest.spyOn(action1, 'getClassName').mockReturnValue('Action');
            vault.listFiles = jest.fn().mockResolvedValue([{ path: 'action1.md', name: 'action1.md' }]);
            vault.getFromFile = jest.fn().mockResolvedValue(action1);

            const condition: RelatedClassCondition = {
                conditionType: 'relatedClass',
                relatedClass: 'Action',
                linkDirection: 'incoming',
                matchMode: 'any',
                conditions: [
                    {
                        property: 'lieu',
                        type: 'equals',
                        value: 'Isère'
                    }
                ]
            };

            const result = await conditionManager.evaluateCondition(condition, alice);
            expect(result).toBe(false);
        });

        test('should check specific linkProperty when specified', async () => {
            const alice = new Classe(vault);
            (alice as any).name = 'Alice';

            // Action with multiple file properties
            const action1 = new Classe(vault);
            (action1 as any).name = 'Action1';

            const participantsProperty = new MultiFileProperty('participants', vault, ['Person']);
            const organizersProperty = new MultiFileProperty('organizers', vault, ['Person']);
            (action1 as any).properties = [participantsProperty, organizersProperty];

            jest.spyOn(participantsProperty, 'read').mockResolvedValue(['[[Alice]]']);
            jest.spyOn(organizersProperty, 'read').mockResolvedValue(['[[Bob]]']);

            const lieuProperty = new Property('lieu', vault);
            (action1 as any).properties.push(lieuProperty);
            jest.spyOn(lieuProperty, 'read').mockResolvedValue('Isère');

            jest.spyOn(action1, 'getClassName').mockReturnValue('Action');
            vault.listFiles = jest.fn().mockResolvedValue([{ path: 'action1.md', name: 'action1.md' }]);
            vault.getFromFile = jest.fn().mockResolvedValue(action1);

            // Check only participants property
            const condition: RelatedClassCondition = {
                conditionType: 'relatedClass',
                relatedClass: 'Action',
                linkDirection: 'incoming',
                linkProperty: 'participants',
                matchMode: 'any',
                conditions: [
                    {
                        property: 'lieu',
                        type: 'equals',
                        value: 'Isère'
                    }
                ]
            };

            const result = await conditionManager.evaluateCondition(condition, alice);
            expect(result).toBe(true);
        });

        test('should work with FileProperty (single file link)', async () => {
            const alice = new Classe(vault);
            (alice as any).name = 'Alice';

            const action1 = new Classe(vault);
            (action1 as any).name = 'Action1';
            const responsibleProperty = new FileProperty('responsible', vault, ['Person']);
            (action1 as any).properties = [responsibleProperty];
            jest.spyOn(responsibleProperty, 'read').mockResolvedValue('[[Alice]]');

            const statusProperty = new Property('status', vault);
            (action1 as any).properties.push(statusProperty);
            jest.spyOn(statusProperty, 'read').mockResolvedValue('Active');

            jest.spyOn(action1, 'getClassName').mockReturnValue('Action');
            vault.listFiles = jest.fn().mockResolvedValue([{ path: 'action1.md', name: 'action1.md' }]);
            vault.getFromFile = jest.fn().mockResolvedValue(action1);

            const condition: RelatedClassCondition = {
                conditionType: 'relatedClass',
                relatedClass: 'Action',
                linkDirection: 'incoming',
                matchMode: 'any',
                conditions: [
                    {
                        property: 'status',
                        type: 'equals',
                        value: 'Active'
                    }
                ]
            };

            const result = await conditionManager.evaluateCondition(condition, alice);
            expect(result).toBe(true);
        });

        test('matchMode=all should require all matching instances to satisfy conditions', async () => {
            const alice = new Classe(vault);
            (alice as any).name = 'Alice';

            // Action1: Alice, lieu=Isère
            const action1 = new Classe(vault);
            (action1 as any).name = 'Action1';
            const participantsProperty1 = new MultiFileProperty('participants', vault, ['Person']);
            const lieuProperty1 = new Property('lieu', vault);
            (action1 as any).properties = [participantsProperty1, lieuProperty1];
            jest.spyOn(participantsProperty1, 'read').mockResolvedValue(['[[Alice]]']);
            jest.spyOn(lieuProperty1, 'read').mockResolvedValue('Isère');

            // Action2: Alice, lieu=Rhône
            const action2 = new Classe(vault);
            (action2 as any).name = 'Action2';
            const participantsProperty2 = new MultiFileProperty('participants', vault, ['Person']);
            const lieuProperty2 = new Property('lieu', vault);
            (action2 as any).properties = [participantsProperty2, lieuProperty2];
            jest.spyOn(participantsProperty2, 'read').mockResolvedValue(['[[Alice]]']);
            jest.spyOn(lieuProperty2, 'read').mockResolvedValue('Rhône');

            jest.spyOn(action1, 'getClassName').mockReturnValue('Action');
            jest.spyOn(action2, 'getClassName').mockReturnValue('Action');
            vault.listFiles = jest.fn().mockResolvedValue([
                { path: 'action1.md', name: 'action1.md' },
                { path: 'action2.md', name: 'action2.md' }
            ]);
            vault.getFromFile = jest.fn()
                .mockResolvedValueOnce(action1)
                .mockResolvedValueOnce(action2);

            const condition: RelatedClassCondition = {
                conditionType: 'relatedClass',
                relatedClass: 'Action',
                linkDirection: 'incoming',
                matchMode: 'all',
                conditions: [
                    {
                        property: 'lieu',
                        type: 'equals',
                        value: 'Isère'
                    }
                ]
            };

            const result = await conditionManager.evaluateCondition(condition, alice);
            expect(result).toBe(false); // Not all actions have lieu=Isère
        });
    });

    describe('Outgoing links (Person → Action)', () => {
        test('should find persons with actions matching conditions', async () => {
            const alice = new Classe(vault);
            (alice as any).name = 'Alice';

            // Alice has a "projects" property linking to actions
            const projectsProperty = new MultiFileProperty('projects', vault, ['Action']);
            (alice as any).properties = [projectsProperty];
            jest.spyOn(projectsProperty, 'read').mockResolvedValue(['[[Action1]]', '[[Action2]]']);

            // Mock actions
            const action1 = new Classe(vault);
            (action1 as any).name = 'Action1';
            jest.spyOn(action1, 'getClassName').mockReturnValue('Action');
            const statusProperty1 = new Property('status', vault);
            (action1 as any).properties = [statusProperty1];
            jest.spyOn(statusProperty1, 'read').mockResolvedValue('Active');

            const action2 = new Classe(vault);
            (action2 as any).name = 'Action2';
            jest.spyOn(action2, 'getClassName').mockReturnValue('Action');
            const statusProperty2 = new Property('status', vault);
            (action2 as any).properties = [statusProperty2];
            jest.spyOn(statusProperty2, 'read').mockResolvedValue('Completed');

            // Mock vault to resolve links
            vault.getFromLink = jest.fn()
                .mockResolvedValueOnce(action1)
                .mockResolvedValueOnce(action2);

            const condition: RelatedClassCondition = {
                conditionType: 'relatedClass',
                relatedClass: 'Action',
                linkDirection: 'outgoing',
                matchMode: 'any',
                conditions: [
                    {
                        property: 'status',
                        type: 'equals',
                        value: 'Active'
                    }
                ]
            };

            const result = await conditionManager.evaluateCondition(condition, alice);
            expect(result).toBe(true);
        });

        test('should check specific linkProperty when specified (outgoing)', async () => {
            const alice = new Classe(vault);
            (alice as any).name = 'Alice';

            const projectsProperty = new MultiFileProperty('projects', vault, ['Action']);
            const watchlistProperty = new MultiFileProperty('watchlist', vault, ['Action']);
            (alice as any).properties = [projectsProperty, watchlistProperty];

            jest.spyOn(projectsProperty, 'read').mockResolvedValue(['[[Action1]]']);
            jest.spyOn(watchlistProperty, 'read').mockResolvedValue(['[[Action2]]']);

            const action1 = new Classe(vault);
            (action1 as any).name = 'Action1';
            jest.spyOn(action1, 'getClassName').mockReturnValue('Action');
            const statusProperty1 = new Property('status', vault);
            (action1 as any).properties = [statusProperty1];
            jest.spyOn(statusProperty1, 'read').mockResolvedValue('Active');

            vault.getFromLink = jest.fn().mockResolvedValue(action1);

            const condition: RelatedClassCondition = {
                conditionType: 'relatedClass',
                relatedClass: 'Action',
                linkDirection: 'outgoing',
                linkProperty: 'projects',
                matchMode: 'any',
                conditions: [
                    {
                        property: 'status',
                        type: 'equals',
                        value: 'Active'
                    }
                ]
            };

            const result = await conditionManager.evaluateCondition(condition, alice);
            expect(result).toBe(true);
        });
    });

    describe('Edge cases', () => {
        test('should return false when no instances of related class exist', async () => {
            const alice = new Classe(vault);
            (alice as any).name = 'Alice';

            vault.listFiles = jest.fn().mockResolvedValue([]);

            const condition: RelatedClassCondition = {
                conditionType: 'relatedClass',
                relatedClass: 'Action',
                linkDirection: 'incoming',
                matchMode: 'any',
                conditions: []
            };

            const result = await conditionManager.evaluateCondition(condition, alice);
            expect(result).toBe(false);
        });

        test('should support $current value in nested conditions', async () => {
            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'Isère';

            const alice = new Classe(vault);
            (alice as any).name = 'Alice';

            const action1 = new Classe(vault);
            (action1 as any).name = 'Action1';
            const participantsProperty = new MultiFileProperty('participants', vault, ['Person']);
            const lieuProperty = new FileProperty('lieu', vault, ['Departement']);
            (action1 as any).properties = [participantsProperty, lieuProperty];
            jest.spyOn(participantsProperty, 'read').mockResolvedValue(['[[Alice]]']);
            jest.spyOn(lieuProperty, 'read').mockResolvedValue('[[Isère]]');

            jest.spyOn(action1, 'getClassName').mockReturnValue('Action');
            vault.listFiles = jest.fn().mockResolvedValue([{ path: 'action1.md', name: 'action1.md' }]);
            vault.getFromFile = jest.fn().mockResolvedValue(action1);

            const condition: RelatedClassCondition = {
                conditionType: 'relatedClass',
                relatedClass: 'Action',
                linkDirection: 'incoming',
                matchMode: 'any',
                conditions: [
                    {
                        property: 'lieu',
                        type: 'equals',
                        value: '$current'
                    }
                ]
            };

            const result = await conditionManager.evaluateCondition(condition, alice, currentDoc);
            expect(result).toBe(true);
        });

        test('should handle no conditions (all related instances pass)', async () => {
            const alice = new Classe(vault);
            (alice as any).name = 'Alice';

            const action1 = new Classe(vault);
            (action1 as any).name = 'Action1';
            const participantsProperty = new MultiFileProperty('participants', vault, ['Person']);
            (action1 as any).properties = [participantsProperty];
            jest.spyOn(participantsProperty, 'read').mockResolvedValue(['[[Alice]]']);

            jest.spyOn(action1, 'getClassName').mockReturnValue('Action');
            vault.listFiles = jest.fn().mockResolvedValue([{ path: 'action1.md', name: 'action1.md' }]);
            vault.getFromFile = jest.fn().mockResolvedValue(action1);

            const condition: RelatedClassCondition = {
                conditionType: 'relatedClass',
                relatedClass: 'Action',
                linkDirection: 'incoming',
                matchMode: 'any',
                conditions: []
            };

            const result = await conditionManager.evaluateCondition(condition, alice);
            expect(result).toBe(true); // At least one action references Alice
        });

        test('should check links inside ObjectProperty', async () => {
            const alice = new Classe(vault);
            (alice as any).name = 'Alice';

            const action1 = new Classe(vault);
            (action1 as any).name = 'Action1';

            // Create ObjectProperty with nested FileProperty
            const objectProperty = new Property('details', vault);
            objectProperty.type = 'object';
            (objectProperty as any).properties = {
                responsible: new FileProperty('responsible', vault, ['Person']),
                location: new Property('location', vault)
            };
            (action1 as any).properties = [objectProperty];

            // Mock the nested FileProperty read
            jest.spyOn((objectProperty as any).properties.responsible, 'read').mockResolvedValue('[[Alice]]');
            
            // Mock objectProperty.read to return the object with nested properties
            jest.spyOn(objectProperty, 'read').mockResolvedValue({
                responsible: '[[Alice]]',
                location: 'Paris'
            });

            const statusProperty = new Property('status', vault);
            (action1 as any).properties.push(statusProperty);
            jest.spyOn(statusProperty, 'read').mockResolvedValue('Active');

            jest.spyOn(action1, 'getClassName').mockReturnValue('Action');
            vault.listFiles = jest.fn().mockResolvedValue([{ path: 'action1.md', name: 'action1.md' }]);
            vault.getFromFile = jest.fn().mockResolvedValue(action1);

            const condition: RelatedClassCondition = {
                conditionType: 'relatedClass',
                relatedClass: 'Action',
                linkDirection: 'incoming',
                matchMode: 'any',
                conditions: [
                    {
                        property: 'status',
                        type: 'equals',
                        value: 'Active'
                    }
                ]
            };

            const result = await conditionManager.evaluateCondition(condition, alice);
            expect(result).toBe(true); // Alice is referenced in nested ObjectProperty
        });
    });
});
