import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { TextProperty } from '../../src/properties/TextProperty';
import { NumberProperty } from '../../src/properties/NumberProperty';
import { Vault } from '../../src/vault/Vault';
import { IApp } from '../../src/interfaces/IApp';

// Mock App minimal pour les tests
class MockApp implements Partial<IApp> {
    getSettings() {
        return { deleteAliasesAfterMigration: true };
    }
}

describe('ObjectProperty.migrateAliases', () => {
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

    describe('Top-level ObjectProperty aliases', () => {
        test('should migrate top-level property name', () => {
            const property = new ObjectProperty('address', vault, {
                street: new TextProperty('street', vault),
                city: new TextProperty('city', vault)
            }, { aliases: ['adresse', 'location'] });

            const metadata = {
                adresse: [
                    { street: '123 Main St', city: 'Paris' }
                ]
            };

            const result = property.migrateAliases(metadata, true);

            expect(result.hasChanges).toBe(true);
            expect(result.updates.address).toBeDefined();
            expect(result.updates.address[0].street).toBe('123 Main St');
            expect(result.updates.address[0].city).toBe('Paris');
            expect(result.updates.adresse).toBeUndefined();
        });

        test('should not overwrite existing top-level property', () => {
            const property = new ObjectProperty('address', vault, {
                street: new TextProperty('street', vault),
                city: new TextProperty('city', vault)
            }, { aliases: ['adresse'] });

            const metadata = {
                address: [
                    { street: 'Current St', city: 'London' }
                ],
                adresse: [
                    { street: 'Old St', city: 'Paris' }
                ]
            };

            const result = property.migrateAliases(metadata, true);

            // Property already exists, so no migration (no overwrite)
            expect(result.hasChanges).toBe(false);
            expect(result.updates.address[0].street).toBe('Current St');
            expect(result.updates.adresse).toBeDefined(); // Not deleted since no changes
        });
    });

    describe('Nested property aliases', () => {
        test('should migrate nested property names', () => {
            const property = new ObjectProperty('address', vault, {
                street: new TextProperty('street', vault, { aliases: ['rue', 'voie'] }),
                city: new TextProperty('city', vault, { aliases: ['ville'] }),
                zipCode: new TextProperty('zipCode', vault, { aliases: ['cp', 'codePostal'] })
            });

            const metadata = {
                address: [
                    { rue: '123 Avenue', ville: 'Paris', cp: '75001' }
                ]
            };

            const result = property.migrateAliases(metadata, true);

            expect(result.hasChanges).toBe(true);
            expect(result.updates.address[0].street).toBe('123 Avenue');
            expect(result.updates.address[0].city).toBe('Paris');
            expect(result.updates.address[0].zipCode).toBe('75001');
            expect(result.updates.address[0].rue).toBeUndefined();
            expect(result.updates.address[0].ville).toBeUndefined();
            expect(result.updates.address[0].cp).toBeUndefined();
        });

        test('should handle mixed old and new nested property names', () => {
            const property = new ObjectProperty('address', vault, {
                street: new TextProperty('street', vault, { aliases: ['rue'] }),
                city: new TextProperty('city', vault, { aliases: ['ville'] }),
                country: new TextProperty('country', vault, { aliases: ['pays'] })
            });

            const metadata = {
                address: [
                    { 
                        street: 'Already New St', 
                        ville: 'Paris', 
                        pays: 'France' 
                    }
                ]
            };

            const result = property.migrateAliases(metadata, true);

            expect(result.hasChanges).toBe(true);
            expect(result.updates.address[0].street).toBe('Already New St');
            expect(result.updates.address[0].city).toBe('Paris');
            expect(result.updates.address[0].country).toBe('France');
            expect(result.updates.address[0].ville).toBeUndefined();
            expect(result.updates.address[0].pays).toBeUndefined();
        });

        test('should not overwrite existing nested values', () => {
            const property = new ObjectProperty('address', vault, {
                street: new TextProperty('street', vault, { aliases: ['rue'] }),
                city: new TextProperty('city', vault, { aliases: ['ville'] })
            });

            const metadata = {
                address: [
                    { 
                        street: 'Current Street',
                        rue: 'Old Rue',
                        city: 'London',
                        ville: 'Paris'
                    }
                ]
            };

            const result = property.migrateAliases(metadata, true);

            expect(result.hasChanges).toBe(true);
            expect(result.updates.address[0].street).toBe('Current Street');
            expect(result.updates.address[0].city).toBe('London');
            expect(result.updates.address[0].rue).toBeUndefined();
            expect(result.updates.address[0].ville).toBeUndefined();
        });
    });

    describe('Multiple objects in array', () => {
        test('should migrate aliases in all array elements', () => {
            const property = new ObjectProperty('contacts', vault, {
                name: new TextProperty('name', vault, { aliases: ['nom'] }),
                email: new TextProperty('email', vault, { aliases: ['mail'] })
            });

            const metadata = {
                contacts: [
                    { nom: 'Alice', mail: 'alice@example.com' },
                    { nom: 'Bob', mail: 'bob@example.com' },
                    { nom: 'Charlie', mail: 'charlie@example.com' }
                ]
            };

            const result = property.migrateAliases(metadata, true);

            expect(result.hasChanges).toBe(true);
            expect(result.updates.contacts.length).toBe(3);
            
            expect(result.updates.contacts[0].name).toBe('Alice');
            expect(result.updates.contacts[0].email).toBe('alice@example.com');
            expect(result.updates.contacts[0].nom).toBeUndefined();
            
            expect(result.updates.contacts[1].name).toBe('Bob');
            expect(result.updates.contacts[1].email).toBe('bob@example.com');
            
            expect(result.updates.contacts[2].name).toBe('Charlie');
            expect(result.updates.contacts[2].email).toBe('charlie@example.com');
        });

        test('should handle mixed migration needs across array elements', () => {
            const property = new ObjectProperty('items', vault, {
                title: new TextProperty('title', vault, { aliases: ['name'] })
            });

            const metadata = {
                items: [
                    { name: 'Old Name 1' },
                    { title: 'Already New' },
                    { name: 'Old Name 3' }
                ]
            };

            const result = property.migrateAliases(metadata, true);

            expect(result.hasChanges).toBe(true);
            expect(result.updates.items[0].title).toBe('Old Name 1');
            expect(result.updates.items[0].name).toBeUndefined();
            expect(result.updates.items[1].title).toBe('Already New');
            expect(result.updates.items[2].title).toBe('Old Name 3');
            expect(result.updates.items[2].name).toBeUndefined();
        });
    });

    describe('Combined top-level and nested aliases', () => {
        test('should migrate both top-level and nested aliases', () => {
            const property = new ObjectProperty('postes', vault, {
                institution: new TextProperty('institution', vault, { aliases: ['Institution'] }),
                poste: new TextProperty('poste', vault, { aliases: ['Poste', 'role'] })
            }, { aliases: ['Postes', 'positions'] });

            const metadata = {
                Postes: [
                    { Institution: 'Global Corp', Poste: 'Developer' }
                ]
            };

            const result = property.migrateAliases(metadata, true);

            expect(result.hasChanges).toBe(true);
            expect(result.updates.postes).toBeDefined();
            expect(result.updates.postes[0].institution).toBe('Global Corp');
            expect(result.updates.postes[0].poste).toBe('Developer');
            expect(result.updates.postes[0].Institution).toBeUndefined();
            expect(result.updates.postes[0].Poste).toBeUndefined();
            expect(result.updates.Postes).toBeUndefined();
        });
    });

    describe('Empty and edge cases', () => {
        test('should handle empty array gracefully', () => {
            const property = new ObjectProperty('items', vault, {
                name: new TextProperty('name', vault, { aliases: ['nom'] })
            });

            const metadata = { items: [] };

            const result = property.migrateAliases(metadata, true);

            expect(result.hasChanges).toBe(false);
            expect(result.updates.items).toEqual([]);
        });

        test('should return no changes when property not found', () => {
            const property = new ObjectProperty('address', vault, {
                street: new TextProperty('street', vault, { aliases: ['rue'] })
            }, { aliases: ['adresse'] });

            const metadata = { other: 'value' };

            const result = property.migrateAliases(metadata, true);

            expect(result.hasChanges).toBe(false);
            expect(result.updates).toEqual(metadata);
        });

        test('should handle objects without nested aliases', () => {
            const property = new ObjectProperty('info', vault, {
                name: new TextProperty('name', vault),
                email: new TextProperty('email', vault)
            });

            const metadata = {
                info: [
                    { name: 'John', email: 'john@example.com' }
                ]
            };

            const result = property.migrateAliases(metadata, true);

            expect(result.hasChanges).toBe(false);
            expect(result.updates).toEqual(metadata);
        });
    });

    describe('deleteAliasesAfterMigration setting', () => {
        test('should keep aliases when setting is false', () => {
            const property = new ObjectProperty('address', vault, {
                street: new TextProperty('street', vault, { aliases: ['rue'] }),
                city: new TextProperty('city', vault, { aliases: ['ville'] })
            });

            const metadata = {
                address: [
                    { rue: '123 Avenue', ville: 'Paris' }
                ]
            };

            const result = property.migrateAliases(metadata, false);

            expect(result.hasChanges).toBe(true);
            expect(result.updates.address[0].street).toBe('123 Avenue');
            expect(result.updates.address[0].city).toBe('Paris');
            expect(result.updates.address[0].rue).toBe('123 Avenue'); // Still exists
            expect(result.updates.address[0].ville).toBe('Paris'); // Still exists
        });

        test('should keep top-level alias when setting is false', () => {
            const property = new ObjectProperty('address', vault, {
                street: new TextProperty('street', vault)
            }, { aliases: ['adresse'] });

            const metadata = {
                adresse: [
                    { street: '123 Main St' }
                ]
            };

            const result = property.migrateAliases(metadata, false);

            expect(result.hasChanges).toBe(true);
            expect(result.updates.address).toBeDefined();
            expect(result.updates.adresse).toBeDefined(); // Still exists
        });
    });

    describe('Non-object array elements', () => {
        test('should skip non-object items in array', () => {
            const property = new ObjectProperty('items', vault, {
                name: new TextProperty('name', vault, { aliases: ['nom'] })
            });

            const metadata = {
                items: [
                    { nom: 'Valid Object' },
                    'Invalid String',
                    null,
                    { nom: 'Another Valid' }
                ]
            };

            const result = property.migrateAliases(metadata, true);

            expect(result.hasChanges).toBe(true);
            expect(result.updates.items[0].name).toBe('Valid Object');
            expect(result.updates.items[1]).toBe('Invalid String');
            expect(result.updates.items[2]).toBe(null);
            expect(result.updates.items[3].name).toBe('Another Valid');
        });
    });

    describe('Metadata immutability', () => {
        test('should not mutate original metadata', () => {
            const property = new ObjectProperty('address', vault, {
                street: new TextProperty('street', vault, { aliases: ['rue'] })
            });

            const metadata = {
                address: [
                    { rue: '123 Avenue' }
                ]
            };
            const originalMetadata = JSON.parse(JSON.stringify(metadata));

            property.migrateAliases(metadata, true);

            expect(metadata).toEqual(originalMetadata);
        });
    });

    describe('Different property types', () => {
        test('should work with different nested property types', () => {
            const property = new ObjectProperty('data', vault, {
                name: new TextProperty('name', vault, { aliases: ['nom'] }),
                count: new TextProperty('count', vault, { aliases: ['number'] }),
                active: new TextProperty('active', vault, { aliases: ['status'] })
            });

            const metadata = {
                data: [
                    { nom: 'Alice', number: '30', status: 'active' }
                ]
            };

            const result = property.migrateAliases(metadata, true);

            expect(result.hasChanges).toBe(true);
            expect(result.updates.data[0].name).toBe('Alice');
            expect(result.updates.data[0].count).toBe('30');
            expect(result.updates.data[0].active).toBe('active');
            expect(result.updates.data[0].nom).toBeUndefined();
            expect(result.updates.data[0].number).toBeUndefined();
            expect(result.updates.data[0].status).toBeUndefined();
        });
    });
});
