import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Vault, Settings } from '../../src/vault/Vault';
import { File } from '../../src/vault/File';
import { mockApp } from '../utils/mocks';
import { DynamicClassFactory } from '../../src/Config/DynamicClassFactory';
import * as fs from 'fs';
import * as path from 'path';

describe('Populate Feature Integration Test', () => {
    let vault: Vault;
    let app: any;
    let factory: DynamicClassFactory;

    beforeEach(async () => {
        app = mockApp();
        
        const settings: Settings = {
            templateFolder: 'templates',
            personalName: 'Test User',
            configPath: '__tests__/integration/visual-interface/config'
        };

        // Configure mocks BEFORE creating vault and factory
        // Mock readFile for template reading and YAML config loading
        app.readFile.mockImplementation(async (file: any) => {
            const filePath = file.path || file;
            
            // Read YAML config files from disk
            if (filePath.endsWith('.yaml')) {
                try {
                    const fullPath = path.join(__dirname, '..', '..', filePath);
                    return fs.readFileSync(fullPath, 'utf-8');
                } catch (error) {
                    // File not found - return empty string to trigger default config
                    return '';
                }
            }
            
            // Template files
            if (filePath.includes('Personne.md')) {
                return `---
Classe: Personne
nom: ""
prenom: ""
institution: ""
poste: ""
email: ""
telephone: ""
dateEntree: ""
statut: Actif
competences: []
notes: ""
---

# {{prenom}} {{nom}}

Informations sur la personne...`;
            } else if (filePath.includes('Institution.md')) {
                return `---
Classe: Institution
nom: ""
---

# Institution`;
            }
            return '';
        });

        // Mock isFile to return true for template files
        app.isFile.mockResolvedValue(true);

        // Mock getFile for both template files and created files
        app.getFile.mockImplementation(async (path: string) => {
            if (path.includes('templates/') || path.endsWith('.md')) {
                return {
                    path: path,
                    name: path.split('/').pop(),
                    basename: path.split('/').pop()?.replace('.md', ''),
                    extension: 'md'
                };
            }
            // Support YAML config files
            if (path.endsWith('.yaml')) {
                return {
                    path: path,
                    name: path.split('/').pop(),
                    basename: path.split('/').pop()?.replace('.yaml', ''),
                    extension: 'yaml'
                };
            }
            return null;
        });

        vault = new Vault(app, settings);
        
        // Initialize dynamic classes with mocked config
        factory = new DynamicClassFactory(settings.configPath!, vault);
        (Vault as any).dynamicClassFactory = factory;
        
        // Mock getAvailableClasses
        jest.spyOn(factory, 'getAvailableClasses').mockResolvedValue(['Personne', 'Institution']);
        
        // Load classes
        const availableClasses = await factory.getAvailableClasses();
        for (const className of availableClasses) {
            const dynamicClass = await factory.getClass(className);
            (Vault as any).classes[className] = dynamicClass;
        }
    });

    it('should create file with populated values', async () => {
        // Setup mock responses
        const mockInstitution = {
            getName: () => 'TechCorp',
            getLink: () => '[[TechCorp]]',
            file: new File(vault, {
                path: 'Institutions/TechCorp/TechCorp.md',
                name: 'TechCorp.md',
                basename: 'TechCorp',
                extension: 'md'
            })
        };

        // Mock selectFile to return institution
        app.selectFile.mockResolvedValue(mockInstitution);

        // Mock selectFromList to return statut
        app.selectFromList.mockResolvedValue('Actif');

        // Mock file creation
        const createdFilePath = 'Test Person.md';
        app.createFile.mockImplementation(async (path: string, content: string) => {
            // Verify that content has populated values injected
            expect(content).toContain('institution: [[TechCorp]]');
            expect(content).toContain('statut: Actif');
            
            return {
                path: createdFilePath,
                name: 'Test Person.md',
                basename: 'Test Person',
                extension: 'md'
            };
        });

        // Mock metadata reading
        app.getMetadata.mockResolvedValue({
            Classe: 'Personne',
            institution: '[[TechCorp]]',
            statut: 'Actif'
        });

        // Create file through vault (will trigger populate)
        const file = await vault.createFile(
            vault.getClasseFromName('Personne'),
            'Test Person.md'
        );

        // Verify populate was called
        expect(app.selectFile).toHaveBeenCalledWith(
            vault,
            ['Institution'],
            expect.objectContaining({
                hint: expect.stringContaining('Choisir une institution')
            })
        );

        expect(app.selectFromList).toHaveBeenCalledWith(
            ['Actif', 'Inactif', 'En congé', 'Parti'],
            expect.objectContaining({
                multiple: false,
                title: expect.stringContaining('Choisir un statut')
            })
        );

        // Verify file was created
        expect(file).toBeDefined();
        expect(app.createFile).toHaveBeenCalled();
    });

    it('should cancel file creation when required field is cancelled', async () => {
        // Mock selectFile to return null (user cancelled)
        app.selectFile.mockResolvedValue(null);

        // Mock sendNotice
        app.sendNotice.mockImplementation((message: string) => {
            console.log(`Notice: ${message}`);
        });

        // Create file through vault (will trigger populate)
        const file = await vault.createFile(
            vault.getClasseFromName('Personne'),
            'Test Person.md'
        );

        // File creation should be cancelled
        expect(file).toBeUndefined();
        
        // Notice should be sent
        expect(app.sendNotice).toHaveBeenCalledWith(
            expect.stringContaining('annulée')
        );

        // createFile should NOT be called
        expect(app.createFile).not.toHaveBeenCalled();
    });

    it('should continue file creation when optional field is skipped', async () => {
        // Setup mock for institution (required in example)
        const mockInstitution = {
            getName: () => 'TechCorp',
            getLink: () => '[[TechCorp]]',
            file: new File(vault, {
                path: 'Institutions/TechCorp/TechCorp.md',
                name: 'TechCorp.md',
                basename: 'TechCorp',
                extension: 'md'
            })
        };

        app.selectFile.mockResolvedValue(mockInstitution);

        // Mock selectFromList to return null (user cancelled optional field)
        app.selectFromList.mockResolvedValue(null);

        // Mock file creation
        app.createFile.mockImplementation(async (path: string, content: string) => {
            // Verify institution is populated but statut is not changed
            expect(content).toContain('institution: [[TechCorp]]');
            // statut should keep default value from template
            expect(content).toContain('statut: Actif');
            
            return {
                path: 'Test Person.md',
                name: 'Test Person.md',
                basename: 'Test Person',
                extension: 'md'
            };
        });

        app.getMetadata.mockResolvedValue({
            Classe: 'Personne',
            institution: '[[TechCorp]]'
        });

        // Create file through vault
        const file = await vault.createFile(
            vault.getClasseFromName('Personne'),
            'Test Person.md'
        );

        // File should still be created (optional field can be skipped)
        expect(file).toBeDefined();
        expect(app.createFile).toHaveBeenCalled();
    });

    it('should populate multiple properties in correct order', async () => {
        const mockInstitution = {
            getName: () => 'TechCorp',
            getLink: () => '[[TechCorp]]',
            file: new File(vault, {
                path: 'Institutions/TechCorp/TechCorp.md',
                name: 'TechCorp.md',
                basename: 'TechCorp',
                extension: 'md'
            })
        };

        let callOrder: string[] = [];

        app.selectFile.mockImplementation(async () => {
            callOrder.push('selectFile');
            return mockInstitution;
        });

        app.selectFromList.mockImplementation(async () => {
            callOrder.push('selectFromList');
            return 'Actif';
        });

        app.createFile.mockImplementation(async (path: string, content: string) => {
            expect(content).toContain('institution: [[TechCorp]]');
            expect(content).toContain('statut: Actif');
            
            return {
                path: 'Test Person.md',
                name: 'Test Person.md',
                basename: 'Test Person',
                extension: 'md'
            };
        });

        app.getMetadata.mockResolvedValue({
            Classe: 'Personne',
            institution: '[[TechCorp]]',
            statut: 'Actif'
        });

        // Create file
        await vault.createFile(
            vault.getClasseFromName('Personne'),
            'Test Person.md'
        );

        // Verify both prompts were called
        expect(app.selectFile).toHaveBeenCalled();
        expect(app.selectFromList).toHaveBeenCalled();

        // Verify institution was called first (before statut)
        expect(callOrder).toEqual(['selectFile', 'selectFromList']);
    });

    it('should not show populate prompts for classes without populate config', async () => {
        // Try to create an Institution (no populate config)
        app.createFile.mockImplementation(async (path: string, content: string) => {
            return {
                path: 'Test Institution.md',
                name: 'Test Institution.md',
                basename: 'Test Institution',
                extension: 'md'
            };
        });

        app.getMetadata.mockResolvedValue({
            Classe: 'Institution'
        });

        await vault.createFile(
            vault.getClasseFromName('Institution'),
            'Test Institution.md'
        );

        // No populate prompts should be shown
        expect(app.selectFile).not.toHaveBeenCalled();
        expect(app.selectFromList).not.toHaveBeenCalled();
        
        // File should still be created
        expect(app.createFile).toHaveBeenCalled();
    });

    it('should write ObjectProperty with default value even without populate template', async () => {
        // Mock class config with ObjectProperty NOT in populate array
        jest.spyOn(factory, 'getClassConfig').mockImplementation(async (className: string) => {
            if (className === 'Task') {
                return {
                    className: 'Task',
                    classIcon: '📋',
                    populate: [
                        {
                            property: 'statut',
                            title: 'Choisir le statut',
                            required: true
                        }
                    ],
                    properties: {
                        responsable: {
                            name: 'responsable',
                            type: 'ObjectProperty',
                            title: 'Responsable',
                            defaultValue: [], // Empty array as default
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
                            title: 'Statut',
                            defaultValue: 'En cours',
                            options: ['A faire', 'En cours', 'Terminé']
                        },
                        description: {
                            name: 'description',
                            type: 'TextProperty',
                            defaultValue: ''
                        }
                    }
                } as any;
            }
            return null;
        });

        // Create Task class
        const TaskClass = await factory.getClass('Task');
        (Vault as any).classes['Task'] = TaskClass;

        // Mock selectFromList for statut
        app.selectFromList.mockResolvedValue('En cours');

        // Mock readFile for Task template
        app.readFile.mockImplementation(async (file: any) => {
            const path = file.path || file;
            if (path.includes('Task.md')) {
                return `---
Classe: Task
responsable: []
statut: En cours
description: ""
---

# Task`;
            }
            return '';
        });

        // Mock file creation and verify content
        app.createFile.mockImplementation(async (path: string, content: string) => {
            // Verify that ObjectProperty 'responsable' is written even without populate
            expect(content).toContain('responsable: []');
            // Verify that statut was populated
            expect(content).toContain('statut: En cours');
            // Verify that description has default value
            expect(content).toContain('description: ""');
            
            return {
                path: 'Test Task.md',
                name: 'Test Task.md',
                basename: 'Test Task',
                extension: 'md'
            };
        });

        app.getMetadata.mockResolvedValue({
            Classe: 'Task',
            responsable: [],
            statut: 'En cours',
            description: ''
        });

        // Create file
        const file = await vault.createFile(TaskClass, 'Test Task.md');

        // Verify file was created
        expect(file).toBeDefined();
        expect(app.createFile).toHaveBeenCalled();

        // Verify only statut was prompted (not responsable)
        expect(app.selectFromList).toHaveBeenCalledTimes(1);
        expect(app.selectFromList).toHaveBeenCalledWith(
            ['A faire', 'En cours', 'Terminé'],
            expect.objectContaining({
                multiple: false,
                title: expect.stringContaining('Choisir le statut')
            })
        );

        // Verify responsable was NOT prompted (no selectFile for it)
        // selectFile should not have been called at all
        expect(app.selectFile).not.toHaveBeenCalled();
    });

    it('should write all property types with default values even without populate template', async () => {
        // Mock class config with multiple property types, only one in populate
        jest.spyOn(factory, 'getClassConfig').mockImplementation(async (className: string) => {
            if (className === 'ComplexEntity') {
                return {
                    className: 'ComplexEntity',
                    classIcon: '📊',
                    populate: [
                        {
                            property: 'statut',
                            title: 'Choisir le statut',
                            required: true
                        }
                    ],
                    properties: {
                        nom: {
                            name: 'nom',
                            type: 'TextProperty',
                            defaultValue: ''
                        },
                        description: {
                            name: 'description',
                            type: 'TextProperty',
                            defaultValue: 'Description par défaut'
                        },
                        prix: {
                            name: 'prix',
                            type: 'NumberProperty',
                            defaultValue: 0
                        },
                        quantite: {
                            name: 'quantite',
                            type: 'NumberProperty',
                            defaultValue: 1
                        },
                        actif: {
                            name: 'actif',
                            type: 'BooleanProperty',
                            defaultValue: true
                        },
                        archive: {
                            name: 'archive',
                            type: 'BooleanProperty',
                            defaultValue: false
                        },
                        dateCreation: {
                            name: 'dateCreation',
                            type: 'DateProperty',
                            defaultValue: '2025-01-01'
                        },
                        responsable: {
                            name: 'responsable',
                            type: 'FileProperty',
                            classes: ['Personne'],
                            defaultValue: ''
                        },
                        priorite: {
                            name: 'priorite',
                            type: 'SelectProperty',
                            options: ['Low', 'Medium', 'High'],
                            defaultValue: 'Medium'
                        },
                        tags: {
                            name: 'tags',
                            type: 'MultiSelectProperty',
                            options: ['urgent', 'important', 'normal'],
                            defaultValue: []
                        },
                        contact: {
                            name: 'contact',
                            type: 'ObjectProperty',
                            defaultValue: [],
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
                            options: ['Actif', 'Inactif'],
                            defaultValue: 'Actif'
                        }
                    }
                } as any;
            }
            return null;
        });

        // Create ComplexEntity class
        const ComplexEntityClass = await factory.getClass('ComplexEntity');
        (Vault as any).classes['ComplexEntity'] = ComplexEntityClass;

        // Mock selectFromList for statut
        app.selectFromList.mockResolvedValue('Inactif');

        // Mock readFile for ComplexEntity template
        app.readFile.mockImplementation(async (file: any) => {
            const path = file.path || file;
            if (path.includes('ComplexEntity.md')) {
                return `---
Classe: ComplexEntity
nom: ""
description: "Description par défaut"
prix: 0
quantite: 1
actif: true
archive: false
dateCreation: "2025-01-01"
responsable: ""
priorite: Medium
tags: []
contact: []
statut: Actif
---

# ComplexEntity`;
            }
            return '';
        });

        // Mock file creation and verify content
        app.createFile.mockImplementation(async (path: string, content: string) => {
            // Verify all properties are written with their default values
            expect(content).toContain('nom: ""');
            expect(content).toContain('description: "Description par défaut"');
            expect(content).toContain('prix: 0');
            expect(content).toContain('quantite: 1');
            expect(content).toContain('actif: true');
            expect(content).toContain('archive: false');
            expect(content).toContain('dateCreation: "2025-01-01"');
            expect(content).toContain('responsable: ""');
            expect(content).toContain('priorite: Medium');
            expect(content).toContain('tags: []');
            expect(content).toContain('contact: []');
            // Only statut should be changed from default
            expect(content).toContain('statut: Inactif');
            
            return {
                path: 'Test Entity.md',
                name: 'Test Entity.md',
                basename: 'Test Entity',
                extension: 'md'
            };
        });

        app.getMetadata.mockResolvedValue({
            Classe: 'ComplexEntity',
            nom: '',
            description: 'Description par défaut',
            prix: 0,
            quantite: 1,
            actif: true,
            archive: false,
            dateCreation: '2025-01-01',
            responsable: '',
            priorite: 'Medium',
            tags: [],
            contact: [],
            statut: 'Inactif'
        });

        // Create file
        const file = await vault.createFile(ComplexEntityClass, 'Test Entity.md');

        // Verify file was created
        expect(file).toBeDefined();
        expect(app.createFile).toHaveBeenCalled();

        // Verify only statut was prompted (not any other property)
        expect(app.selectFromList).toHaveBeenCalledTimes(1);
        expect(app.selectFromList).toHaveBeenCalledWith(
            ['Actif', 'Inactif'],
            expect.objectContaining({
                multiple: false,
                title: expect.stringContaining('Choisir le statut')
            })
        );

        // Verify no other prompts were called
        expect(app.selectFile).not.toHaveBeenCalled();
    });
});
