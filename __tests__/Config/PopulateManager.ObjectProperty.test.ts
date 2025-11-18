import { PopulateManager } from '../../src/Config/PopulateManager';
import { Vault } from '../../src/vault/Vault';
import { mockApp } from '../utils/mocks';

describe('PopulateManager - ObjectProperty Support', () => {
    let populateManager: PopulateManager;
    let vault: Vault;
    let app: any;

    beforeEach(() => {
        app = mockApp();
        vault = new Vault(app, { configPath: 'test-config' } as any);
        populateManager = new PopulateManager(vault);
    });

    describe('populateProperties with ObjectProperty', () => {
        it('should populate ObjectProperty with FileProperty', async () => {
            const mockFile = {
                path: 'institutions/Test Institution.md',
                name: 'Test Institution',
                basename: 'Test Institution',
                extension: 'md',
                parent: { path: 'institutions' },
                vault: vault,
                getLink: () => '[[Test Institution]]'
            };

            app.selectFile.mockResolvedValue(mockFile);

            const classConfig: any = {
                className: 'Task',
                classIcon: '📋',
                properties: {
                    responsable: {
                        name: 'responsable',
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
                        property: 'responsable',
                        title: 'Choisir un responsable',
                        required: true
                    }
                ]
            };

            const result = await populateManager.populateProperties(classConfig);

            expect(result).not.toBeNull();
            expect(result).toEqual({
                responsable: [
                    {
                        personne: '[[Test Institution]]',
                        role: ''
                    }
                ]
            });
            expect(app.selectFile).toHaveBeenCalledWith(
                vault,
                ['Personne'],
                { hint: 'Choisir un responsable (requis)' }
            );
        });

        it('should populate ObjectProperty with SelectProperty', async () => {
            app.selectFromList.mockResolvedValue('Haute');

            const classConfig: any = {
                className: 'Task',
                classIcon: '📋',
                properties: {
                    priorite: {
                        name: 'priorite',
                        type: 'ObjectProperty',
                        properties: {
                            niveau: {
                                name: 'niveau',
                                type: 'SelectProperty',
                                options: [
                                    { name: 'Basse', value: 'Basse' },
                                    { name: 'Moyenne', value: 'Moyenne' },
                                    { name: 'Haute', value: 'Haute' }
                                ],
                                defaultValue: 'Moyenne'
                            },
                            raison: {
                                name: 'raison',
                                type: 'TextProperty',
                                defaultValue: ''
                            }
                        }
                    }
                },
                populate: [
                    {
                        property: 'priorite',
                        title: 'Choisir la priorité',
                        required: false
                    }
                ]
            };

            const result = await populateManager.populateProperties(classConfig);

            expect(result).not.toBeNull();
            expect(result).toEqual({
                priorite: [
                    {
                        niveau: 'Haute',
                        raison: ''
                    }
                ]
            });
            expect(app.selectFromList).toHaveBeenCalledWith(
                ['Basse', 'Moyenne', 'Haute'],
                { multiple: false, title: 'Choisir la priorité' }
            );
        });

        it('should use first FileProperty when multiple properties exist', async () => {
            const mockFile = {
                path: 'persons/John.md',
                name: 'John',
                basename: 'John',
                extension: 'md',
                parent: { path: 'persons' },
                vault: vault,
                getLink: () => '[[John]]'
            };

            app.selectFile.mockResolvedValue(mockFile);

            const classConfig: any = {
                className: 'Task',
                classIcon: '📋',
                properties: {
                    assignment: {
                        name: 'assignment',
                        type: 'ObjectProperty',
                        properties: {
                            person: {
                                name: 'person',
                                type: 'FileProperty',
                                classes: ['Personne'],
                                defaultValue: ''
                            },
                            status: {
                                name: 'status',
                                type: 'SelectProperty',
                                options: [
                                    { name: 'Todo', value: 'Todo' },
                                    { name: 'In Progress', value: 'In Progress' },
                                    { name: 'Done', value: 'Done' }
                                ],
                                defaultValue: 'Todo'
                            },
                            notes: {
                                name: 'notes',
                                type: 'TextProperty',
                                defaultValue: ''
                            }
                        }
                    }
                },
                populate: [
                    {
                        property: 'assignment',
                        title: 'Assigner à une personne',
                        required: true
                    }
                ]
            };

            const result = await populateManager.populateProperties(classConfig);

            expect(result).not.toBeNull();
            expect(result).toEqual({
                assignment: [
                    {
                        person: '[[John]]',
                        status: 'Todo',
                        notes: ''
                    }
                ]
            });
            // Should only call selectFile, not selectFromList
            expect(app.selectFile).toHaveBeenCalledTimes(1);
            expect(app.selectFromList).not.toHaveBeenCalled();
        });

        it('should return null when user cancels ObjectProperty with FileProperty', async () => {
            app.selectFile.mockResolvedValue(null);

            const classConfig: any = {
                className: 'Task',
                classIcon: '📋',
                properties: {
                    responsable: {
                        name: 'responsable',
                        type: 'ObjectProperty',
                        properties: {
                            personne: {
                                name: 'personne',
                                type: 'FileProperty',
                                classes: ['Personne'],
                                defaultValue: ''
                            }
                        }
                    }
                },
                populate: [
                    {
                        property: 'responsable',
                        title: 'Choisir un responsable',
                        required: true
                    }
                ]
            };

            const result = await populateManager.populateProperties(classConfig);

            expect(result).toBeNull();
            expect(app.sendNotice).toHaveBeenCalledWith('Création annulée : champ requis non rempli');
        });

        it('should return null when user cancels ObjectProperty with SelectProperty', async () => {
            app.selectFromList.mockResolvedValue(null);

            const classConfig: any = {
                className: 'Task',
                classIcon: '📋',
                properties: {
                    priorite: {
                        name: 'priorite',
                        type: 'ObjectProperty',
                        properties: {
                            niveau: {
                                name: 'niveau',
                                type: 'SelectProperty',
                                options: [
                                    { name: 'Basse', value: 'Basse' },
                                    { name: 'Moyenne', value: 'Moyenne' },
                                    { name: 'Haute', value: 'Haute' }
                                ],
                                defaultValue: 'Moyenne'
                            }
                        }
                    }
                },
                populate: [
                    {
                        property: 'priorite',
                        title: 'Choisir la priorité',
                        required: true
                    }
                ]
            };

            const result = await populateManager.populateProperties(classConfig);

            expect(result).toBeNull();
            expect(app.sendNotice).toHaveBeenCalledWith('Création annulée : champ requis non rempli');
        });

        it('should skip ObjectProperty when optional and user cancels', async () => {
            app.selectFile.mockResolvedValue(null);

            const classConfig: any = {
                className: 'Task',
                classIcon: '📋',
                properties: {
                    responsable: {
                        name: 'responsable',
                        type: 'ObjectProperty',
                        properties: {
                            personne: {
                                name: 'personne',
                                type: 'FileProperty',
                                classes: ['Personne'],
                                defaultValue: ''
                            }
                        }
                    }
                },
                populate: [
                    {
                        property: 'responsable',
                        title: 'Choisir un responsable',
                        required: false
                    }
                ]
            };

            const result = await populateManager.populateProperties(classConfig);

            expect(result).not.toBeNull();
            expect(result).toEqual({});
            expect(app.sendNotice).not.toHaveBeenCalled();
        });

        it('should return null for ObjectProperty without FileProperty or SelectProperty', async () => {
            const classConfig: any = {
                className: 'Task',
                classIcon: '📋',
                properties: {
                    metadata: {
                        name: 'metadata',
                        type: 'ObjectProperty',
                        properties: {
                            title: {
                                name: 'title',
                                type: 'TextProperty',
                                defaultValue: ''
                            },
                            count: {
                                name: 'count',
                                type: 'NumberProperty',
                                defaultValue: 0
                            }
                        }
                    }
                },
                populate: [
                    {
                        property: 'metadata',
                        title: 'Configurer metadata',
                        required: false
                    }
                ]
            };

            const result = await populateManager.populateProperties(classConfig);

            expect(result).not.toBeNull();
            expect(result).toEqual({});
        });

        it('should handle ObjectProperty with empty properties', async () => {
            const classConfig: any = {
                className: 'Task',
                classIcon: '📋',
                properties: {
                    empty: {
                        name: 'empty',
                        type: 'ObjectProperty',
                        properties: {}
                    }
                },
                populate: [
                    {
                        property: 'empty',
                        title: 'Empty object',
                        required: false
                    }
                ]
            };

            const result = await populateManager.populateProperties(classConfig);

            expect(result).not.toBeNull();
            expect(result).toEqual({});
        });

        it('should integrate ObjectProperty with other property types', async () => {
            const mockFile = {
                path: 'persons/Jane.md',
                name: 'Jane',
                basename: 'Jane',
                extension: 'md',
                parent: { path: 'persons' },
                vault: vault,
                getLink: () => '[[Jane]]'
            };

            app.selectFile.mockResolvedValue(mockFile);
            app.selectFromList.mockResolvedValue('En cours');

            const classConfig: any = {
                className: 'Project',
                classIcon: '📁',
                properties: {
                    responsable: {
                        name: 'responsable',
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
                    },
                    statut: {
                        name: 'statut',
                        type: 'SelectProperty',
                        options: [
                            { name: 'Planifié', value: 'Planifié' },
                            { name: 'En cours', value: 'En cours' },
                            { name: 'Terminé', value: 'Terminé' }
                        ],
                        defaultValue: 'Planifié'
                    }
                },
                populate: [
                    {
                        property: 'responsable',
                        title: 'Choisir un responsable',
                        required: true
                    },
                    {
                        property: 'statut',
                        title: 'Choisir un statut',
                        required: true
                    }
                ]
            };

            const result = await populateManager.populateProperties(classConfig);

            expect(result).not.toBeNull();
            expect(result).toEqual({
                responsable: [
                    {
                        personne: '[[Jane]]',
                        role: ''
                    }
                ],
                statut: 'En cours'
            });
        });
    });
});
