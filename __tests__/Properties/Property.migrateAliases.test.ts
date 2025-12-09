import { Property } from '../../src/properties/Property';
import { Vault } from '../../src/vault/Vault';
import { IApp } from '../../src/interfaces/IApp';

// Mock App minimal pour les tests
class MockApp implements Partial<IApp> {
    getSettings() {
        return { deleteAliasesAfterMigration: true };
    }
}

describe('Property.migrateAliases', () => {
    let vault: Vault;
    let mockApp: MockApp;

    beforeEach(() => {
        mockApp = new MockApp();
        vault = new Vault(mockApp as IApp, { 
            templateFolder: 'templates', 
            personalName: 'Test', 
            configPath: './config' 
        });
    });

    describe('Properties without aliases', () => {
        test('should return no changes when property has no aliases', () => {
            const property = new Property('name', vault);
            const metadata = { name: 'John Doe' };

            const result = property.migrateAliases(metadata, true);

            expect(result.hasChanges).toBe(false);
            expect(result.updates).toEqual(metadata);
        });

        test('should return no changes when aliases array is empty', () => {
            const property = new Property('name', vault, { aliases: [] });
            const metadata = { name: 'John Doe' };

            const result = property.migrateAliases(metadata, true);

            expect(result.hasChanges).toBe(false);
            expect(result.updates).toEqual(metadata);
        });
    });

    describe('Simple alias migration', () => {
        test('should migrate value from single alias', () => {
            const property = new Property('email', vault, { aliases: ['mail'] });
            const metadata = { mail: 'test@example.com' };

            const result = property.migrateAliases(metadata, true);

            expect(result.hasChanges).toBe(true);
            expect(result.updates.email).toBe('test@example.com');
            expect(result.updates.mail).toBeUndefined();
        });

        test('should migrate from first found alias when multiple exist', () => {
            const property = new Property('email', vault, { aliases: ['mail', 'courriel', 'e-mail'] });
            const metadata = { 
                courriel: 'old@example.com',
                mail: 'newer@example.com' 
            };

            const result = property.migrateAliases(metadata, true);

            expect(result.hasChanges).toBe(true);
            expect(result.updates.email).toBe('newer@example.com');
            expect(result.updates.mail).toBeUndefined();
            expect(result.updates.courriel).toBeUndefined();
        });

        test('should migrate from first alias in order', () => {
            const property = new Property('phone', vault, { aliases: ['telephone', 'mobile'] });
            const metadata = { 
                mobile: '555-0002',
                telephone: '555-0001'
            };

            const result = property.migrateAliases(metadata, true);

            expect(result.hasChanges).toBe(true);
            expect(result.updates.phone).toBe('555-0001');
            expect(result.updates.telephone).toBeUndefined();
            expect(result.updates.mobile).toBeUndefined();
        });
    });

    describe('Non-overwrite behavior', () => {
        test('should not overwrite existing value with new name', () => {
            const property = new Property('email', vault, { aliases: ['mail'] });
            const metadata = { 
                email: 'current@example.com',
                mail: 'old@example.com' 
            };

            const result = property.migrateAliases(metadata, true);

            expect(result.hasChanges).toBe(true);
            expect(result.updates.email).toBe('current@example.com');
            expect(result.updates.mail).toBeUndefined(); // Still deleted
        });

        test('should not migrate when new property has non-empty value', () => {
            const property = new Property('status', vault, { aliases: ['state'] });
            const metadata = { 
                status: 'active',
                state: 'pending' 
            };

            const result = property.migrateAliases(metadata, true);

            expect(result.hasChanges).toBe(true);
            expect(result.updates.status).toBe('active');
            expect(result.updates.state).toBeUndefined();
        });
    });

    describe('Empty value handling', () => {
        test('should migrate when new property is undefined', () => {
            const property = new Property('email', vault, { aliases: ['mail'] });
            const metadata = { 
                email: undefined,
                mail: 'test@example.com' 
            };

            const result = property.migrateAliases(metadata, true);

            expect(result.hasChanges).toBe(true);
            expect(result.updates.email).toBe('test@example.com');
            expect(result.updates.mail).toBeUndefined();
        });

        test('should migrate when new property is empty string', () => {
            const property = new Property('email', vault, { aliases: ['mail'] });
            const metadata = { 
                email: '',
                mail: 'test@example.com' 
            };

            const result = property.migrateAliases(metadata, true);

            expect(result.hasChanges).toBe(true);
            expect(result.updates.email).toBe('test@example.com');
            expect(result.updates.mail).toBeUndefined();
        });

        test('should not migrate when new property is 0 (falsy but valid)', () => {
            const property = new Property('count', vault, { aliases: ['number'] });
            const metadata = { 
                count: 0,
                number: 5 
            };

            const result = property.migrateAliases(metadata, true);

            expect(result.hasChanges).toBe(true);
            expect(result.updates.count).toBe(0);
            expect(result.updates.number).toBeUndefined();
        });
    });

    describe('deleteAliasesAfterMigration setting', () => {
        test('should delete aliases when setting is true', () => {
            const property = new Property('email', vault, { aliases: ['mail', 'courriel'] });
            const metadata = { 
                mail: 'test@example.com',
                courriel: 'test2@example.com'
            };

            const result = property.migrateAliases(metadata, true);

            expect(result.hasChanges).toBe(true);
            expect(result.updates.email).toBe('test@example.com');
            expect(result.updates.mail).toBeUndefined();
            expect(result.updates.courriel).toBeUndefined();
        });

        test('should keep aliases when setting is false', () => {
            const property = new Property('email', vault, { aliases: ['mail'] });
            const metadata = { mail: 'test@example.com' };

            const result = property.migrateAliases(metadata, false);

            expect(result.hasChanges).toBe(true);
            expect(result.updates.email).toBe('test@example.com');
            expect(result.updates.mail).toBe('test@example.com'); // Still exists
        });

        test('should delete all aliases even when not migrating value', () => {
            const property = new Property('email', vault, { aliases: ['mail', 'courriel'] });
            const metadata = { 
                email: 'current@example.com',
                mail: 'old@example.com',
                courriel: 'old2@example.com'
            };

            const result = property.migrateAliases(metadata, true);

            expect(result.hasChanges).toBe(true);
            expect(result.updates.email).toBe('current@example.com');
            expect(result.updates.mail).toBeUndefined();
            expect(result.updates.courriel).toBeUndefined();
        });
    });

    describe('No changes scenarios', () => {
        test('should return no changes when alias not found', () => {
            const property = new Property('email', vault, { aliases: ['mail'] });
            const metadata = { email: 'test@example.com' };

            const result = property.migrateAliases(metadata, true);

            expect(result.hasChanges).toBe(false);
            expect(result.updates).toEqual(metadata);
        });

        test('should return no changes when new property exists and no aliases found', () => {
            const property = new Property('email', vault, { aliases: ['mail', 'courriel'] });
            const metadata = { 
                email: 'test@example.com',
                other: 'value'
            };

            const result = property.migrateAliases(metadata, true);

            expect(result.hasChanges).toBe(false);
            expect(result.updates).toEqual(metadata);
        });
    });

    describe('Complex metadata preservation', () => {
        test('should preserve other metadata fields', () => {
            const property = new Property('email', vault, { aliases: ['mail'] });
            const metadata = { 
                mail: 'test@example.com',
                name: 'John Doe',
                age: 30,
                active: true
            };

            const result = property.migrateAliases(metadata, true);

            expect(result.hasChanges).toBe(true);
            expect(result.updates.email).toBe('test@example.com');
            expect(result.updates.mail).toBeUndefined();
            expect(result.updates.name).toBe('John Doe');
            expect(result.updates.age).toBe(30);
            expect(result.updates.active).toBe(true);
        });

        test('should not mutate original metadata', () => {
            const property = new Property('email', vault, { aliases: ['mail'] });
            const metadata = { mail: 'test@example.com' };
            const originalMetadata = { ...metadata };

            property.migrateAliases(metadata, true);

            expect(metadata).toEqual(originalMetadata);
        });
    });
});
