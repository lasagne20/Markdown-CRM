import { ConfigLoader } from '../../src/Config/ConfigLoader';
import { Vault } from '../../src/vault/Vault';
import { mockApp } from '../utils/mocks';
import { PropertyConfig } from '../../src/Config/interfaces';
import { FileProperty } from '../../src/properties/FileProperty';
import { MultiFileProperty } from '../../src/properties/MultiFileProperty';
import { Condition } from '../../src/Config/ConditionManager';

describe('ConfigLoader - Conditions Support', () => {
    let configLoader: ConfigLoader;
    let vault: Vault;
    let app: any;

    beforeEach(() => {
        app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);
        configLoader = new ConfigLoader('./config', vault);
    });

    describe('createProperty with conditions', () => {
        test('should create FileProperty with conditions', () => {
            const conditions: Condition[] = [
                { property: 'status', type: 'equals', value: 'active' }
            ];

            const config: PropertyConfig = {
                type: 'FileProperty',
                title: 'Institution',
                icon: '🏢',
                classes: ['Institution'],
                conditions: conditions,
                propertyKey: 'institution'
            } as any;

            const property = configLoader.createProperty(config);

            expect(property).toBeInstanceOf(FileProperty);
            expect((property as FileProperty).conditions).toEqual(conditions);
        });

        test('should create FileProperty without conditions', () => {
            const config: PropertyConfig = {
                type: 'FileProperty',
                title: 'Institution',
                icon: '🏢',
                classes: ['Institution'],
                propertyKey: 'institution'
            } as any;

            const property = configLoader.createProperty(config);

            expect(property).toBeInstanceOf(FileProperty);
            expect((property as FileProperty).conditions).toBeUndefined();
        });

        test('should create MultiFileProperty with conditions', () => {
            const conditions: Condition[] = [
                { property: 'statut', type: 'equals', value: 'Actif' }
            ];

            const config: PropertyConfig = {
                type: 'MultiFileProperty',
                title: 'Contacts',
                icon: '👤',
                classes: ['Personne'],
                conditions: conditions,
                propertyKey: 'contacts'
            } as any;

            const property = configLoader.createProperty(config);

            expect(property).toBeInstanceOf(MultiFileProperty);
            expect((property as MultiFileProperty).conditions).toEqual(conditions);
        });

        test('should create MultiFileProperty without conditions', () => {
            const config: PropertyConfig = {
                type: 'MultiFileProperty',
                title: 'Contacts',
                icon: '👤',
                classes: ['Personne'],
                propertyKey: 'contacts'
            } as any;

            const property = configLoader.createProperty(config);

            expect(property).toBeInstanceOf(MultiFileProperty);
            expect((property as MultiFileProperty).conditions).toBeUndefined();
        });

        test('should handle multiple conditions', () => {
            const conditions: Condition[] = [
                { property: 'status', type: 'equals', value: 'active' },
                { property: 'type', type: 'equalsAny', values: ['Institution', 'Lieu'] }
            ];

            const config: PropertyConfig = {
                type: 'FileProperty',
                classes: ['Institution'],
                conditions: conditions,
                propertyKey: 'institution'
            } as any;

            const property = configLoader.createProperty(config);

            expect((property as FileProperty).conditions).toHaveLength(2);
            expect((property as FileProperty).conditions).toEqual(conditions);
        });

        test('should handle complex conditions', () => {
            const conditions: Condition[] = [
                { property: 'population', type: 'greaterThan', value: 10000 },
                { property: 'description', type: 'isNotEmpty' },
                { property: 'type', type: 'equals', value: 'Commune' }
            ];

            const config: PropertyConfig = {
                type: 'FileProperty',
                classes: ['Lieu'],
                conditions: conditions,
                propertyKey: 'lieu'
            } as any;

            const property = configLoader.createProperty(config);

            expect((property as FileProperty).conditions).toHaveLength(3);
        });

        test('should preserve other options with conditions', () => {
            const conditions: Condition[] = [
                { property: 'status', type: 'equals', value: 'active' }
            ];

            const config: PropertyConfig = {
                type: 'FileProperty',
                title: 'Institution Active',
                icon: '🏢',
                tooltip: 'Sélectionner une institution active',
                classes: ['Institution'],
                conditions: conditions,
                aliases: ['oldInstitution'],
                propertyKey: 'institution'
            } as any;

            const property = configLoader.createProperty(config);

            expect(property.title).toBe('Institution Active');
            expect(property.icon).toBe('🏢');
            expect(property.tooltip).toBe('Sélectionner une institution active');
            expect(property.aliases).toEqual(['oldInstitution']);
            expect((property as FileProperty).conditions).toEqual(conditions);
        });

        test('should handle isEmpty condition', () => {
            const conditions: Condition[] = [
                { property: 'email', type: 'isEmpty' }
            ];

            const config: PropertyConfig = {
                type: 'FileProperty',
                classes: ['Personne'],
                conditions: conditions,
                propertyKey: 'contact'
            } as any;

            const property = configLoader.createProperty(config);

            expect((property as FileProperty).conditions).toEqual(conditions);
        });

        test('should handle isNotEmpty condition', () => {
            const conditions: Condition[] = [
                { property: 'description', type: 'isNotEmpty' }
            ];

            const config: PropertyConfig = {
                type: 'MultiFileProperty',
                classes: ['Institution'],
                conditions: conditions,
                propertyKey: 'institutions'
            } as any;

            const property = configLoader.createProperty(config);

            expect((property as MultiFileProperty).conditions).toEqual(conditions);
        });

        test('should handle contains condition', () => {
            const conditions: Condition[] = [
                { property: 'nom', type: 'contains', value: 'Paris' }
            ];

            const config: PropertyConfig = {
                type: 'FileProperty',
                classes: ['Lieu'],
                conditions: conditions,
                propertyKey: 'lieu'
            } as any;

            const property = configLoader.createProperty(config);

            expect((property as FileProperty).conditions).toEqual(conditions);
        });

        test('should handle notEquals condition', () => {
            const conditions: Condition[] = [
                { property: 'statut', type: 'notEquals', value: 'Inactif' }
            ];

            const config: PropertyConfig = {
                type: 'MultiFileProperty',
                classes: ['Personne'],
                conditions: conditions,
                propertyKey: 'contacts'
            } as any;

            const property = configLoader.createProperty(config);

            expect((property as MultiFileProperty).conditions).toEqual(conditions);
        });

        test('should handle lessThan condition', () => {
            const conditions: Condition[] = [
                { property: 'population', type: 'lessThan', value: 50000 }
            ];

            const config: PropertyConfig = {
                type: 'FileProperty',
                classes: ['Lieu'],
                conditions: conditions,
                propertyKey: 'lieu'
            } as any;

            const property = configLoader.createProperty(config);

            expect((property as FileProperty).conditions).toEqual(conditions);
        });

        test('should handle greaterThanOrEqual condition', () => {
            const conditions: Condition[] = [
                { property: 'population', type: 'greaterThanOrEqual', value: 1000 }
            ];

            const config: PropertyConfig = {
                type: 'FileProperty',
                classes: ['Lieu'],
                conditions: conditions,
                propertyKey: 'lieu'
            } as any;

            const property = configLoader.createProperty(config);

            expect((property as FileProperty).conditions).toEqual(conditions);
        });

        test('should handle lessThanOrEqual condition', () => {
            const conditions: Condition[] = [
                { property: 'population', type: 'lessThanOrEqual', value: 100000 }
            ];

            const config: PropertyConfig = {
                type: 'MultiFileProperty',
                classes: ['Lieu'],
                conditions: conditions,
                propertyKey: 'lieux'
            } as any;

            const property = configLoader.createProperty(config);

            expect((property as MultiFileProperty).conditions).toEqual(conditions);
        });

        test('should handle empty conditions array', () => {
            const conditions: Condition[] = [];

            const config: PropertyConfig = {
                type: 'FileProperty',
                classes: ['Institution'],
                conditions: conditions,
                propertyKey: 'institution'
            } as any;

            const property = configLoader.createProperty(config);

            expect((property as FileProperty).conditions).toEqual([]);
        });

        test('should not affect non-file properties', () => {
            const conditions: Condition[] = [
                { property: 'status', type: 'equals', value: 'active' }
            ];

            const config: PropertyConfig = {
                type: 'Property',
                conditions: conditions, // Conditions are added to options but not used by Property
                propertyKey: 'description'
            } as any;

            const property = configLoader.createProperty(config);

            // Property class doesn't use conditions, but they might be in options
            // The important thing is that it doesn't break the property creation
            expect(property).toBeDefined();
            expect(property.name).toBe('description');
        });
    });
});
