import { ConfigLoader } from '../../src/Config/ConfigLoader';
import { ConditionManager, DirectLinkCondition } from '../../src/Config/ConditionManager';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { FileProperty } from '../../src/properties/FileProperty';
import { mockApp } from '../utils/mocks';

describe('ConfigLoader - DirectLinkCondition Integration', () => {
    let vault: Vault;
    let app: any;
    let configLoader: ConfigLoader;

    beforeEach(() => {
        app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault', configPath: './__tests__/Config/test-configs' } as any);
        configLoader = new ConfigLoader('./__tests__/Config/test-configs', vault);
    });

    describe('DirectLinkCondition in PropertyConfig', () => {
        test('should parse DirectLinkCondition from config', async () => {
            const propertyConfig: any = {
                type: 'FileProperty',
                title: 'Institution liée',
                icon: '🏢',
                propertyKey: 'institution',
                classes: ['Institution'],
                conditions: [
                    {
                        conditionType: 'directLink',
                        linkProperty: 'contacts' // Check if institution.contacts contains current document
                    }
                ]
            };

            const property = configLoader.createProperty(propertyConfig) as FileProperty;

            expect(property).toBeInstanceOf(FileProperty);
            expect(property.conditions).toBeDefined();
            expect(property.conditions).toHaveLength(1);
            expect(property.conditions![0]).toHaveProperty('conditionType', 'directLink');
        });

        test('should support mixed conditions (property + directLink)', async () => {
            const propertyConfig: any = {
                type: 'FileProperty',
                title: 'Institution active liée',
                icon: '🏢',
                propertyKey: 'institution',
                classes: ['Institution'],
                conditions: [
                    {
                        property: 'statut',
                        type: 'equals',
                        value: 'Actif'
                    },
                    {
                        conditionType: 'directLink'
                    }
                ]
            };

            const property = configLoader.createProperty(propertyConfig) as FileProperty;

            expect(property.conditions).toHaveLength(2);
            expect(property.conditions![0]).toHaveProperty('property', 'statut');
            expect(property.conditions![1]).toHaveProperty('conditionType', 'directLink');
        });
    });

    describe('Runtime validation with currentDocument', () => {
        test('should filter instances with createValidationFunction and currentDocument', async () => {
            // Create current document (a person)
            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'John Doe';

            // Create institution 1 - has John Doe in contacts
            const institution1 = new Classe(vault);
            (institution1 as any).name = 'Institution1';
            const contactsProp1 = new FileProperty('contacts', vault, ['Personne']);
            (institution1 as any).properties = [contactsProp1];
            jest.spyOn(contactsProp1, 'read').mockResolvedValue(['[[John Doe]]', '[[Jane Smith]]']);

            // Create institution 2 - does NOT have John Doe in contacts
            const institution2 = new Classe(vault);
            (institution2 as any).name = 'Institution2';
            const contactsProp2 = new FileProperty('contacts', vault, ['Personne']);
            (institution2 as any).properties = [contactsProp2];
            jest.spyOn(contactsProp2, 'read').mockResolvedValue(['[[Jane Smith]]', '[[Bob Wilson]]']);

            // Create DirectLinkCondition
            const condition: DirectLinkCondition = {
                conditionType: 'directLink',
                linkProperty: 'contacts',
                currentDocument: currentDoc
            };

            // Create validation function WITH currentDocument
            const conditionManager = new ConditionManager();
            const validationFn = conditionManager.createValidationFunction([condition], currentDoc);

            // Test filtering
            const result1 = await validationFn(institution1);
            const result2 = await validationFn(institution2);

            expect(result1).toBe(true);  // Institution1 has John Doe
            expect(result2).toBe(false); // Institution2 doesn't have John Doe
        });

        test('should inject currentDocument into DirectLinkCondition at runtime', async () => {
            // Create current document
            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'CurrentPerson';

            // Create condition WITHOUT currentDocument set
            const condition: any = {
                conditionType: 'directLink',
                linkProperty: 'related'
            };

            // Create instance
            const instance = new Classe(vault);
            (instance as any).name = 'TestInstance';
            const relatedProp = new FileProperty('related', vault, ['Personne']);
            (instance as any).properties = [relatedProp];
            jest.spyOn(relatedProp, 'read').mockResolvedValue('[[CurrentPerson]]');

            // createValidationFunction should inject currentDocument
            const conditionManager = new ConditionManager();
            const validationFn = conditionManager.createValidationFunction([condition], currentDoc);

            const result = await validationFn(instance);
            expect(result).toBe(true);
        });

        test('should work with PropertyCondition and DirectLinkCondition combined', async () => {
            // Current document
            const currentDoc = new Classe(vault);
            (currentDoc as any).name = 'CurrentDoc';

            // Create test instance - Active AND linked to CurrentDoc
            const activeLinkedInstance = new Classe(vault);
            (activeLinkedInstance as any).name = 'ActiveLinked';
            
            const statusProp1 = { 
                name: 'status',
                type: 'select',
                read: jest.fn().mockResolvedValue('Active')
            };
            const linkProp1 = new FileProperty('relatedDoc', vault, ['Classe']);
            (activeLinkedInstance as any).properties = [statusProp1 as any, linkProp1];
            jest.spyOn(linkProp1, 'read').mockResolvedValue('[[CurrentDoc]]');

            // Create test instance - Active but NOT linked
            const activeNotLinkedInstance = new Classe(vault);
            (activeNotLinkedInstance as any).name = 'ActiveNotLinked';
            
            const statusProp2 = {
                name: 'status',
                type: 'select',
                read: jest.fn().mockResolvedValue('Active')
            };
            const linkProp2 = new FileProperty('relatedDoc', vault, ['Classe']);
            (activeNotLinkedInstance as any).properties = [statusProp2 as any, linkProp2];
            jest.spyOn(linkProp2, 'read').mockResolvedValue('[[OtherDoc]]');

            // Create test instance - Linked but Inactive
            const inactiveLinkedInstance = new Classe(vault);
            (inactiveLinkedInstance as any).name = 'InactiveLinked';
            
            const statusProp3 = {
                name: 'status',
                type: 'select',
                read: jest.fn().mockResolvedValue('Inactive')
            };
            const linkProp3 = new FileProperty('relatedDoc', vault, ['Classe']);
            (inactiveLinkedInstance as any).properties = [statusProp3 as any, linkProp3];
            jest.spyOn(linkProp3, 'read').mockResolvedValue('[[CurrentDoc]]');

            // Create combined conditions
            const conditions: any[] = [
                {
                    property: 'status',
                    type: 'equals',
                    value: 'Active'
                },
                {
                    conditionType: 'directLink'
                }
            ];

            const conditionManager = new ConditionManager();
            const validationFn = conditionManager.createValidationFunction(conditions, currentDoc);

            // Only activeLinkedInstance should pass both conditions
            expect(await validationFn(activeLinkedInstance)).toBe(true);
            expect(await validationFn(activeNotLinkedInstance)).toBe(false);
            expect(await validationFn(inactiveLinkedInstance)).toBe(false);
        });
    });

    describe('ConditionManager.parseConditions', () => {
        test('should parse mixed condition types from YAML format', () => {
            const yamlConditions = [
                {
                    property: 'status',
                    type: 'equals',
                    value: 'Active'
                },
                {
                    conditionType: 'directLink',
                    linkProperty: 'contacts'
                },
                {
                    property: 'type',
                    type: 'equalsAny',
                    values: ['Type1', 'Type2']
                }
            ];

            const parsed = ConditionManager.parseConditions(yamlConditions);

            expect(parsed).toHaveLength(3);
            expect(parsed[0]).toHaveProperty('property', 'status');
            expect(parsed[1]).toHaveProperty('conditionType', 'directLink');
            expect(parsed[1]).toHaveProperty('linkProperty', 'contacts');
            expect(parsed[2]).toHaveProperty('property', 'type');
        });
    });
});
