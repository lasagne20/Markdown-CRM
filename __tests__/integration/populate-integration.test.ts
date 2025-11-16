import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Vault, Settings } from '../../src/vault/Vault';
import { File } from '../../src/vault/File';
import { mockApp } from '../utils/mocks';
import { DynamicClassFactory } from '../../src/Config/DynamicClassFactory';

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

        vault = new Vault(app, settings);
        
        // Initialize dynamic classes with mocked config
        factory = new DynamicClassFactory(settings.configPath!, vault);
        (Vault as any).dynamicClassFactory = factory;
        
        // Mock getAvailableClasses
        jest.spyOn(factory, 'getAvailableClasses').mockResolvedValue(['Personne', 'Institution']);
        
        // Mock getClassConfig to return test configuration
        jest.spyOn(factory, 'getClassConfig').mockImplementation(async (className: string) => {
            if (className === 'Personne') {
                return {
                    className: 'Personne',
                    classIcon: '👤',
                    parent: {
                        property: 'institution',
                        folder: 'Personnes'
                    },
                    populate: [
                        {
                            property: 'institution',
                            title: 'Choisir une institution',
                            required: true
                        },
                        {
                            property: 'statut',
                            title: 'Choisir un statut',
                            required: false
                        }
                    ],
                    properties: {
                        institution: {
                            name: 'institution',
                            type: 'FileProperty',
                            title: 'Institution',
                            required: false,
                            classes: ['Institution']
                        },
                        statut: {
                            name: 'statut',
                            type: 'SelectProperty',
                            title: 'Statut',
                            required: false,
                            defaultValue: 'Actif',
                            options: ['Actif', 'Inactif', 'En congé', 'Parti']
                        }
                    }
                } as any;
            } else if (className === 'Institution') {
                return {
                    className: 'Institution',
                    classIcon: '🏢',
                    properties: {}
                } as any;
            }
            return null;
        });
        
        // Load classes
        const availableClasses = await factory.getAvailableClasses();
        for (const className of availableClasses) {
            const dynamicClass = await factory.getClass(className);
            (Vault as any).classes[className] = dynamicClass;
        }

        // Mock readFile for template reading
        app.readFile.mockImplementation(async (file: any) => {
            const path = file.path || file;
            if (path.includes('Personne.md')) {
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
            } else if (path.includes('Institution.md')) {
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
            return null;
        });
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
});
