import { PopulateManager } from '../../src/Config/PopulateManager';
import { Vault } from '../../src/vault/Vault';
import { mockApp } from '../utils/mocks';

describe('PopulateManager - Multiple Nested Objects Bug', () => {
    let populateManager: PopulateManager;
    let vault: Vault;
    let app: any;

    beforeEach(() => {
        app = mockApp();
        vault = new Vault(app, { configPath: 'test-config' } as any);
        populateManager = new PopulateManager(vault);
    });

    describe('Multiple objects in nested ObjectProperty', () => {
        it('should correctly handle multiple objects with nested FileProperty', async () => {
            // Simuler la sélection de plusieurs fichiers (user adds multiple objects)
            const mockFile1 = {
                path: 'institutions/Institution A.md',
                name: 'Institution A',
                basename: 'Institution A',
                extension: 'md',
                parent: { path: 'institutions' },
                vault: vault,
                getLink: () => '[[Institution A]]'
            };

            const mockFile2 = {
                path: 'institutions/Institution B.md',
                name: 'Institution B',
                basename: 'Institution B',
                extension: 'md',
                parent: { path: 'institutions' },
                vault: vault,
                getLink: () => '[[Institution B]]'
            };

            // Premier appel pour le premier objet
            app.selectFile.mockResolvedValueOnce(mockFile1);
            // Deuxième appel pour le deuxième objet (si l'utilisateur en ajoute un autre)
            app.selectFile.mockResolvedValueOnce(mockFile2);

            const classConfig: any = {
                className: 'Personne',
                classIcon: '👤',
                properties: {
                    postes: {
                        name: 'postes',
                        type: 'ObjectProperty',
                        properties: {
                            institution: {
                                name: 'institution',
                                type: 'ObjectProperty',
                                properties: {
                                    file: {
                                        name: 'file',
                                        type: 'FileProperty',
                                        classes: ['Institution'],
                                        defaultValue: ''
                                    }
                                }
                            },
                            titre: {
                                name: 'titre',
                                type: 'TextProperty',
                                defaultValue: ''
                            }
                        }
                    }
                },
                populate: [
                    {
                        property: 'postes',
                        title: 'Ajouter un poste',
                        hint: 'Sélectionnez l\'institution',
                        required: false
                    }
                ]
            };

            // Tester le premier populate
            const result1 = await populateManager.populateProperties(classConfig);

            console.log('Result 1:', JSON.stringify(result1, null, 2));

            expect(result1).not.toBeNull();
            expect(result1.postes).toBeInstanceOf(Array);
            expect(result1.postes).toHaveLength(1);
            expect(result1.postes[0]).toEqual({
                institution: {
                    file: '[[Institution A]]'
                },
                titre: ''
            });

            // Maintenant, si l'utilisateur veut ajouter un deuxième poste
            // Le problème pourrait être ici : les deux objets finissent sur la même propriété
            const result2 = await populateManager.populateProperties(classConfig);

            console.log('Result 2:', JSON.stringify(result2, null, 2));

            expect(result2).not.toBeNull();
            expect(result2.postes).toBeInstanceOf(Array);
            expect(result2.postes).toHaveLength(1);
            
            // Chaque appel devrait retourner UN objet distinct
            expect(result2.postes[0]).toEqual({
                institution: {
                    file: '[[Institution B]]'
                },
                titre: ''
            });

            // Les deux objets NE DOIVENT PAS être identiques
            expect(result1.postes[0].institution.file).not.toBe(result2.postes[0].institution.file);
        });

        it('should not merge multiple objects into the same property instance', async () => {
            const mockFile1 = {
                path: 'contacts/Contact A.md',
                name: 'Contact A',
                basename: 'Contact A',
                extension: 'md',
                parent: { path: 'contacts' },
                vault: vault,
                getLink: () => '[[Contact A]]'
            };

            const mockFile2 = {
                path: 'contacts/Contact B.md',
                name: 'Contact B',
                basename: 'Contact B',
                extension: 'md',
                parent: { path: 'contacts' },
                vault: vault,
                getLink: () => '[[Contact B]]'
            };

            app.selectFile
                .mockResolvedValueOnce(mockFile1)
                .mockResolvedValueOnce(mockFile2);

            const classConfig: any = {
                className: 'Projet',
                classIcon: '📊',
                properties: {
                    contacts: {
                        name: 'contacts',
                        type: 'ObjectProperty',
                        properties: {
                            personne: {
                                name: 'personne',
                                type: 'FileProperty',
                                classes: ['Personne'],
                                defaultValue: ''
                            },
                            role: {
                                name: 'role',
                                type: 'TextProperty',
                                defaultValue: ''
                            }
                        }
                    }
                },
                populate: [
                    {
                        property: 'contacts',
                        title: 'Ajouter un contact',
                        required: false
                    }
                ]
            };

            // Premier objet
            const firstResult = await populateManager.populateProperties(classConfig);
            
            console.log('First contact:', JSON.stringify(firstResult, null, 2));

            // Deuxième objet
            const secondResult = await populateManager.populateProperties(classConfig);
            
            console.log('Second contact:', JSON.stringify(secondResult, null, 2));

            // Vérifier que chaque appel retourne un objet indépendant
            expect(firstResult.contacts[0].personne).toBe('[[Contact A]]');
            expect(secondResult.contacts[0].personne).toBe('[[Contact B]]');

            // Les deux résultats ne doivent pas être le même objet en mémoire
            expect(firstResult.contacts[0]).not.toBe(secondResult.contacts[0]);
        });

        it('should handle deeply nested ObjectProperty with multiple potential values', async () => {
            const mockFile1 = {
                path: 'institutions/Inst 1.md',
                name: 'Inst 1',
                basename: 'Inst 1',
                extension: 'md',
                parent: { path: 'institutions' },
                vault: vault,
                getLink: () => '[[Inst 1]]'
            };

            const mockFile2 = {
                path: 'institutions/Inst 2.md',
                name: 'Inst 2',
                basename: 'Inst 2',
                extension: 'md',
                parent: { path: 'institutions' },
                vault: vault,
                getLink: () => '[[Inst 2]]'
            };

            app.selectFile
                .mockResolvedValueOnce(mockFile1)
                .mockResolvedValueOnce(mockFile2);

            const classConfig: any = {
                className: 'Document',
                classIcon: '📄',
                properties: {
                    metadata: {
                        name: 'metadata',
                        type: 'ObjectProperty',
                        properties: {
                            source: {
                                name: 'source',
                                type: 'ObjectProperty',
                                properties: {
                                    organisation: {
                                        name: 'organisation',
                                        type: 'ObjectProperty',
                                        properties: {
                                            reference: {
                                                name: 'reference',
                                                type: 'FileProperty',
                                                classes: ['Institution'],
                                                defaultValue: ''
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                populate: [
                    {
                        property: 'metadata',
                        title: 'Définir la source',
                        hint: 'Choisir l\'organisation source',
                        required: true
                    }
                ]
            };

            // Premier populate
            const result1 = await populateManager.populateProperties(classConfig);
            
            console.log('Deep nested result 1:', JSON.stringify(result1, null, 2));

            expect(result1).not.toBeNull();
            expect(result1.metadata).toBeInstanceOf(Array);
            expect(result1.metadata[0].source.organisation.reference).toBe('[[Inst 1]]');

            // Deuxième populate (nouvel objet)
            const result2 = await populateManager.populateProperties(classConfig);
            
            console.log('Deep nested result 2:', JSON.stringify(result2, null, 2));

            expect(result2).not.toBeNull();
            expect(result2.metadata).toBeInstanceOf(Array);
            expect(result2.metadata[0].source.organisation.reference).toBe('[[Inst 2]]');

            // Les valeurs doivent être différentes
            expect(result1.metadata[0].source.organisation.reference)
                .not.toBe(result2.metadata[0].source.organisation.reference);
        });

        it('should demonstrate the bug: shared property instances', async () => {
            // Ce test doit ÉCHOUER et démontrer le bug actuel
            const mockFiles = [
                {
                    path: 'files/File1.md',
                    name: 'File1',
                    basename: 'File1',
                    extension: 'md',
                    parent: { path: 'files' },
                    vault: vault,
                    getLink: () => '[[File1]]'
                },
                {
                    path: 'files/File2.md',
                    name: 'File2',
                    basename: 'File2',
                    extension: 'md',
                    parent: { path: 'files' },
                    vault: vault,
                    getLink: () => '[[File2]]'
                }
            ];

            let callCount = 0;
            app.selectFile.mockImplementation(async () => {
                return mockFiles[callCount++];
            });

            const classConfig: any = {
                className: 'Test',
                classIcon: '🧪',
                properties: {
                    items: {
                        name: 'items',
                        type: 'ObjectProperty',
                        properties: {
                            ref: {
                                name: 'ref',
                                type: 'FileProperty',
                                classes: ['Document'],
                                defaultValue: ''
                            }
                        }
                    }
                },
                populate: [
                    {
                        property: 'items',
                        title: 'Ajouter un item'
                    }
                ]
            };

            const results: any[] = [];
            
            // Simuler la création de plusieurs objets successifs
            for (let i = 0; i < 2; i++) {
                const result = await populateManager.populateProperties(classConfig);
                console.log(`Iteration ${i + 1}:`, JSON.stringify(result, null, 2));
                results.push(result);
            }

            // Vérifier que chaque résultat est distinct
            console.log('All results:', JSON.stringify(results, null, 2));

            // Si le bug existe, les deux résultats pourraient avoir la même valeur
            // ou pointer vers le même objet
            expect(results[0].items[0].ref).toBe('[[File1]]');
            expect(results[1].items[0].ref).toBe('[[File2]]');
            
            // Test critique : les objets ne doivent PAS être les mêmes en mémoire
            if (results[0].items[0] === results[1].items[0]) {
                throw new Error('BUG DETECTED: Objects share the same instance in memory!');
            }
        });
    });
});
