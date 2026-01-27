import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { FileProperty } from '../../src/properties/FileProperty';
import { MultiFileProperty } from '../../src/properties/MultiFileProperty';
import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { TextProperty } from '../../src/properties/TextProperty';
import { File } from '../../src/vault/File';

describe('ObjectProperty File Validation', () => {
    let vault: jest.Mocked<Vault>;
    let mockApp: any;

    beforeEach(() => {
        // Create mock app
        mockApp = {
            getFile: jest.fn(),
            getMetadata: jest.fn(),
            updateMetadata: jest.fn(),
            createFolder: jest.fn(),
            readFile: jest.fn(),
            writeFile: jest.fn(),
            move: jest.fn(),
            createDiv: jest.fn(() => ({ appendChild: jest.fn(), textContent: '' })),
            setIcon: jest.fn(),
            getTemplateContent: jest.fn(),
            getSettings: jest.fn(() => ({ deleteAliasesAfterMigration: true }))
        };

        // Create mock vault
        vault = {
            app: mockApp,
            getFromLink: jest.fn(),
            listFiles: jest.fn(),
            createClasse: jest.fn(),
            getFromFile: jest.fn(),
            getProcessManager: jest.fn(() => ({ runProcesses: jest.fn() }))
        } as any;
    });

    it('should validate file links within ObjectProperty arrays', async () => {
        // Test implementation
        class PersonClasse extends Classe {
            static create(vault: Vault): Classe { return new PersonClasse(vault); }
            async onCreate(): Promise<void> {}
            async onUpdate(): Promise<void> { await super.onUpdate(); }
            async onDelete(): Promise<void> {}
            public addProperty(property: any): void {
                (this as any).properties = (this as any).properties || [];
                (this as any).properties.push(property);
            }
        }

        const mockFile = {
            path: '/vault/people/John-Doe.md',
            basename: 'John-Doe',
            extension: 'md',
            name: 'John-Doe.md'
        };
        const personFile = new File(vault, mockFile as any);
        const person = new PersonClasse(vault, personFile);

        // Create ObjectProperty with file sub-properties (simulating experiences with documents)
        const documentProperty = new FileProperty('document', vault, []);
        
        const experienceProperty = new ObjectProperty('experiences', vault, {
            'company': new TextProperty('company', vault),
            'document': documentProperty
        });

        person.addProperty(experienceProperty);

        // Mock metadata with ObjectProperty array containing file links
        mockApp.getMetadata.mockResolvedValue({
            name: 'John Doe',
            experiences: [
                {
                    company: 'Company A',
                    document: '[[contract-a]]'  // This file exists
                },
                {
                    company: 'Company B', 
                    document: '[[contract-b-missing]]'  // This file doesn't exist
                },
                {
                    company: 'Company C',
                    document: '[[contract-c]]'  // This file exists
                }
            ]
        });

        // Mock file resolution - some files exist, some don't
        vault.getFromLink.mockImplementation(async (link: string) => {
            const existingFiles = ['[[contract-a]]', '[[contract-c]]'];
            if (existingFiles.includes(link)) {
                const fileName = link.slice(2, -2);
                return {
                    getFile: () => ({
                        getPath: () => `/vault/contracts/${fileName}.md`
                    })
                } as any;
            }
            return null; // File doesn't exist
        });

        // Call onUpdate to trigger validation
        await person.onUpdate();

        // Verify that metadata is not updated since broken links are kept unchanged
        expect(mockApp.updateMetadata).not.toHaveBeenCalled();
    });

    it('should handle nested ObjectProperty with multiple file types', async () => {
        class ProjectClasse extends Classe {
            static create(vault: Vault): Classe { return new ProjectClasse(vault); }
            async onCreate(): Promise<void> {}
            async onUpdate(): Promise<void> { await super.onUpdate(); }
            async onDelete(): Promise<void> {}
            public addProperty(property: any): void {
                (this as any).properties = (this as any).properties || [];
                (this as any).properties.push(property);
            }
        }

        const mockFile = {
            path: '/vault/projects/Project-X.md',
            basename: 'Project-X',
            extension: 'md',
            name: 'Project-X.md'
        };
        const projectFile = new File(vault, mockFile as any);
        const project = new ProjectClasse(vault, projectFile);

        // Create ObjectProperty with multiple file sub-properties
        const mainDocProperty = new FileProperty('mainDoc', vault, []);

        const attachmentsProperty = new MultiFileProperty('attachments', vault, []);

        const tasksProperty = new ObjectProperty('tasks', vault, {
            'name': new TextProperty('name', vault),
            'mainDoc': mainDocProperty,
            'attachments': attachmentsProperty
        });

        project.addProperty(tasksProperty);

        // Mock metadata with complex nested structure
        mockApp.getMetadata.mockResolvedValue({
            name: 'Project X',
            tasks: [
                {
                    name: 'Task 1',
                    mainDoc: '[[task1-doc]]',  // Exists
                    attachments: ['[[task1-attach1]]', '[[missing-file]]', '[[task1-attach2]]']  // Mixed
                }
            ]
        });

        // Mock file resolution
        vault.getFromLink.mockImplementation(async (link: string) => {
            const existingFiles = ['[[task1-doc]]', '[[task1-attach1]]', '[[task1-attach2]]'];
            if (existingFiles.includes(link)) {
                const fileName = link.slice(2, -2);
                return {
                    getFile: () => ({
                        getPath: () => `/vault/tasks/${fileName}.md`
                    })
                } as any;
            }
            return null; // File doesn't exist
        });

        await project.onUpdate();

        // Verify that metadata is not updated since broken links are kept unchanged
        expect(mockApp.updateMetadata).not.toHaveBeenCalled();
    });

    it('should skip validation when ObjectProperty has no file sub-properties', async () => {
        class TestClasse extends Classe {
            static create(vault: Vault): Classe { return new TestClasse(vault); }
            async onCreate(): Promise<void> {}
            async onUpdate(): Promise<void> { await super.onUpdate(); }
            async onDelete(): Promise<void> {}
            public addProperty(property: any): void {
                (this as any).properties = (this as any).properties || [];
                (this as any).properties.push(property);
            }
        }

        const mockFile = {
            path: '/vault/test.md',
            basename: 'test',
            extension: 'md',
            name: 'test.md'
        };
        const testFile = new File(vault, mockFile as any);
        const testInstance = new TestClasse(vault, testFile);

        // ObjectProperty with only text properties (no files)
        const settingsProperty = new ObjectProperty('settings', vault, {
            'name': new TextProperty('name', vault),
            'value': new TextProperty('value', vault)
        });

        testInstance.addProperty(settingsProperty);

        mockApp.getMetadata.mockResolvedValue({
            settings: [
                { name: 'Setting 1', value: 'Value 1' },
                { name: 'Setting 2', value: 'Value 2' }
            ]
        });

        await testInstance.onUpdate();

        // Should NOT call updateMetadata since no file properties to validate
        expect(mockApp.updateMetadata).not.toHaveBeenCalled();
    });
});