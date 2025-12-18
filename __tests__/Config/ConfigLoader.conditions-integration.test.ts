import { ConfigLoader } from '../../src/Config/ConfigLoader';
import { Vault } from '../../src/vault/Vault';
import { mockApp } from '../utils/mocks';
import { FileProperty } from '../../src/properties/FileProperty';
import { MultiFileProperty } from '../../src/properties/MultiFileProperty';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

describe('Integration - Conditions from YAML', () => {
    let configLoader: ConfigLoader;
    let vault: Vault;
    let app: any;

    beforeEach(() => {
        app = mockApp();
        vault = new Vault(app, { 
            vaultPath: './test-vault',
            configPath: path.join(__dirname, 'test-configs')
        } as any);
        
        // Mock getFile to return our test YAML
        app.getFile = jest.fn().mockImplementation(async (filePath: string) => {
            if (filePath.includes('TestPersonne.yaml')) {
                return {
                    path: filePath,
                    name: 'TestPersonne.yaml',
                    basename: 'TestPersonne',
                    extension: 'yaml'
                };
            }
            return null;
        });

        // Mock readFile to return YAML content
        app.readFile = jest.fn().mockImplementation(async (file: any) => {
            const yamlPath = path.join(__dirname, 'test-configs', 'TestPersonne.yaml');
            return fs.readFileSync(yamlPath, 'utf8');
        });

        configLoader = new ConfigLoader(path.join(__dirname, 'test-configs'), vault);
    });

    describe('Load YAML configuration with conditions', () => {
        test('should load class config with FileProperty conditions', async () => {
            const config = await configLoader.loadClassConfig('TestPersonne');

            expect(config).toBeDefined();
            expect(config.properties).toBeDefined();
            expect(config.properties['institution_active']).toBeDefined();
        });

        test('should create FileProperty with simple condition from YAML', async () => {
            const config = await configLoader.loadClassConfig('TestPersonne');
            const propertyConfig = config.properties['institution_active'];
            (propertyConfig as any).propertyKey = 'institution_active';

            const property = configLoader.createProperty(propertyConfig);

            expect(property).toBeInstanceOf(FileProperty);
            const fileProperty = property as FileProperty;
            expect(fileProperty.conditions).toBeDefined();
            expect(fileProperty.conditions).toHaveLength(1);
            expect(fileProperty.conditions![0]).toEqual({
                property: 'status',
                type: 'equals',
                value: 'active'
            });
        });

        test('should create FileProperty with multiple conditions from YAML', async () => {
            const config = await configLoader.loadClassConfig('TestPersonne');
            const propertyConfig = config.properties['lieu_filtre'];
            (propertyConfig as any).propertyKey = 'lieu_filtre';

            const property = configLoader.createProperty(propertyConfig);

            expect(property).toBeInstanceOf(FileProperty);
            const fileProperty = property as FileProperty;
            expect(fileProperty.conditions).toHaveLength(2);
            expect(fileProperty.conditions![0]).toEqual({
                property: 'type',
                type: 'equals',
                value: 'Commune'
            });
            expect(fileProperty.conditions![1]).toEqual({
                property: 'population',
                type: 'greaterThan',
                value: 10000
            });
        });

        test('should create MultiFileProperty with conditions from YAML', async () => {
            const config = await configLoader.loadClassConfig('TestPersonne');
            const propertyConfig = config.properties['contacts_actifs'];
            (propertyConfig as any).propertyKey = 'contacts_actifs';

            const property = configLoader.createProperty(propertyConfig);

            expect(property).toBeInstanceOf(MultiFileProperty);
            const multiFileProperty = property as MultiFileProperty;
            expect(multiFileProperty.conditions).toBeDefined();
            expect(multiFileProperty.conditions).toHaveLength(1);
            expect(multiFileProperty.conditions![0]).toEqual({
                property: 'statut',
                type: 'equals',
                value: 'Actif'
            });
        });

        test('should create FileProperty with equalsAny condition from YAML', async () => {
            const config = await configLoader.loadClassConfig('TestPersonne');
            const propertyConfig = config.properties['institutions_diverses'];
            (propertyConfig as any).propertyKey = 'institutions_diverses';

            const property = configLoader.createProperty(propertyConfig);

            expect(property).toBeInstanceOf(MultiFileProperty);
            const multiFileProperty = property as MultiFileProperty;
            expect(multiFileProperty.conditions![0]).toEqual({
                property: 'type',
                type: 'equalsAny',
                values: ['Institution', 'Lieu']
            });
        });

        test('should create FileProperty with isEmpty condition from YAML', async () => {
            const config = await configLoader.loadClassConfig('TestPersonne');
            const propertyConfig = config.properties['contact_sans_email'];
            (propertyConfig as any).propertyKey = 'contact_sans_email';

            const property = configLoader.createProperty(propertyConfig);

            expect(property).toBeInstanceOf(FileProperty);
            const fileProperty = property as FileProperty;
            expect(fileProperty.conditions![0]).toEqual({
                property: 'email',
                type: 'isEmpty'
            });
        });

        test('should create FileProperty with isNotEmpty condition from YAML', async () => {
            const config = await configLoader.loadClassConfig('TestPersonne');
            const propertyConfig = config.properties['contact_avec_description'];
            (propertyConfig as any).propertyKey = 'contact_avec_description';

            const property = configLoader.createProperty(propertyConfig);

            expect(property).toBeInstanceOf(FileProperty);
            const fileProperty = property as FileProperty;
            expect(fileProperty.conditions![0]).toEqual({
                property: 'description',
                type: 'isNotEmpty'
            });
        });

        test('should create FileProperty with contains condition from YAML', async () => {
            const config = await configLoader.loadClassConfig('TestPersonne');
            const propertyConfig = config.properties['lieu_paris'];
            (propertyConfig as any).propertyKey = 'lieu_paris';

            const property = configLoader.createProperty(propertyConfig);

            expect(property).toBeInstanceOf(FileProperty);
            const fileProperty = property as FileProperty;
            expect(fileProperty.conditions![0]).toEqual({
                property: 'nom',
                type: 'contains',
                value: 'Paris'
            });
        });

        test('should create FileProperty with notEquals condition from YAML', async () => {
            const config = await configLoader.loadClassConfig('TestPersonne');
            const propertyConfig = config.properties['personne_non_inactive'];
            (propertyConfig as any).propertyKey = 'personne_non_inactive';

            const property = configLoader.createProperty(propertyConfig);

            expect(property).toBeInstanceOf(FileProperty);
            const fileProperty = property as FileProperty;
            expect(fileProperty.conditions![0]).toEqual({
                property: 'statut',
                type: 'notEquals',
                value: 'Inactif'
            });
        });

        test('should preserve other property attributes with conditions', async () => {
            const config = await configLoader.loadClassConfig('TestPersonne');
            const propertyConfig = config.properties['institution_active'];
            (propertyConfig as any).propertyKey = 'institution_active';

            const property = configLoader.createProperty(propertyConfig);

            expect(property.title).toBe('Institution Active');
            expect(property.icon).toBe('🏢');
            expect((property as FileProperty).classes).toEqual(['Institution']);
            expect((property as FileProperty).conditions).toBeDefined();
        });

        test('should handle properties without conditions', async () => {
            const config = await configLoader.loadClassConfig('TestPersonne');
            const propertyConfig = config.properties['nom'];
            (propertyConfig as any).propertyKey = 'nom';

            const property = configLoader.createProperty(propertyConfig);

            expect(property.title).toBe('Nom');
            // Properties without conditions don't have the conditions field
            expect((property as any).conditions).toBeUndefined();
        });
    });

    describe('Full integration test', () => {
        test('should load all properties with conditions correctly', async () => {
            const config = await configLoader.loadClassConfig('TestPersonne');

            // Check that all expected properties are loaded
            expect(config.properties['institution_active']).toBeDefined();
            expect(config.properties['lieu_filtre']).toBeDefined();
            expect(config.properties['contacts_actifs']).toBeDefined();
            expect(config.properties['institutions_diverses']).toBeDefined();
            expect(config.properties['contact_sans_email']).toBeDefined();
            expect(config.properties['contact_avec_description']).toBeDefined();
            expect(config.properties['lieu_paris']).toBeDefined();
            expect(config.properties['personne_non_inactive']).toBeDefined();

            // Create properties and verify conditions
            const institutionActive = configLoader.createProperty({
                ...config.properties['institution_active'],
                propertyKey: 'institution_active'
            } as any);
            expect((institutionActive as FileProperty).conditions).toHaveLength(1);

            const lieuFiltre = configLoader.createProperty({
                ...config.properties['lieu_filtre'],
                propertyKey: 'lieu_filtre'
            } as any);
            expect((lieuFiltre as FileProperty).conditions).toHaveLength(2);

            const contactsActifs = configLoader.createProperty({
                ...config.properties['contacts_actifs'],
                propertyKey: 'contacts_actifs'
            } as any);
            expect((contactsActifs as MultiFileProperty).conditions).toHaveLength(1);
        });

        test('should maintain condition types correctly', async () => {
            const config = await configLoader.loadClassConfig('TestPersonne');

            const properties = [
                { key: 'institution_active', expectedType: 'equals' },
                { key: 'lieu_filtre', expectedType: 'equals' },
                { key: 'contact_sans_email', expectedType: 'isEmpty' },
                { key: 'contact_avec_description', expectedType: 'isNotEmpty' },
                { key: 'lieu_paris', expectedType: 'contains' },
                { key: 'personne_non_inactive', expectedType: 'notEquals' }
            ];

            for (const { key, expectedType } of properties) {
                const prop = configLoader.createProperty({
                    ...config.properties[key],
                    propertyKey: key
                } as any);
                
                const conditions = (prop as FileProperty).conditions;
                expect(conditions).toBeDefined();
                const condition = conditions![0];
                // Check if it's a PropertyCondition (not DirectLinkCondition)
                if ('type' in condition) {
                    expect(condition.type).toBe(expectedType);
                }
            }
        });
    });
});
