import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { FileProperty } from '../../src/properties/FileProperty';
import { MultiFileProperty } from '../../src/properties/MultiFileProperty';
import { File } from '../../src/vault/File';

describe('Classe File Property Validation - Integration Demo', () => {
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

    it('should demonstrate file property validation in action', async () => {
        // Test implementation of Classe
        class TestClasse extends Classe {
            static create(vault: Vault): Classe {
                return new TestClasse(vault);
            }

            async onCreate(): Promise<void> {}
            async onUpdate(): Promise<void> {
                await super.onUpdate();
            }
            async onDelete(): Promise<void> {}

            public addProperty(property: any): void {
                (this as any).properties = (this as any).properties || [];
                (this as any).properties.push(property);
            }
        }

        // Create test instance
        const mockFile = {
            path: '/vault/test/TestFile.md',
            basename: 'TestFile',
            extension: 'md',
            name: 'TestFile.md'
        };
        const testFile = new File(vault, mockFile as any);
        const classe = new TestClasse(vault, testFile);

        // Add properties - use proper constructors
        const docProperty = new FileProperty('document', vault, []);
        classe.addProperty(docProperty);
        
        const attachProperty = new MultiFileProperty('attachments', vault, []);
        classe.addProperty(attachProperty);

        // Mock scenario: one file exists, one doesn't
        mockApp.getMetadata.mockResolvedValue({
            document: '[[ExistingDoc]]',
            attachments: ['[[ValidFile]]', '[[MissingFile]]', '[[AnotherValid]]']
        });

        // Mock file resolution
        vault.getFromLink.mockImplementation(async (link: string) => {
            const validFiles = ['[[ExistingDoc]]', '[[ValidFile]]', '[[AnotherValid]]'];
            if (validFiles.includes(link)) {
                const fileName = link.slice(2, -2);
                return {
                    getFile: () => ({
                        getPath: () => `/vault/files/${fileName}.md`
                    })
                } as any;
            }
            return null; // Missing file
        });

        vault.listFiles.mockResolvedValue([
            { path: '/vault/files/ExistingDoc.md' },
            { path: '/vault/files/ValidFile.md' },
            { path: '/vault/files/AnotherValid.md' }
        ] as any);

        // Call onUpdate which triggers validation
        await classe.onUpdate();

        // Verify that metadata is not updated since broken links are kept unchanged
        expect(mockApp.updateMetadata).not.toHaveBeenCalled();
    });

    it('should demonstrate no changes when all files are valid', async () => {
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
            path: '/vault/test/TestFile.md',
            basename: 'TestFile',
            extension: 'md',
            name: 'TestFile.md'
        };
        const testFile = new File(vault, mockFile as any);
        const classe = new TestClasse(vault, testFile);

        const docProperty = new FileProperty('document', vault, []);
        docProperty.vault = vault;
        classe.addProperty(docProperty);

        // All files exist and are valid
        mockApp.getMetadata.mockResolvedValue({
            document: '[[ValidDoc]]'
        });

        vault.getFromLink.mockResolvedValue({
            getFile: () => ({
                getPath: () => '/vault/files/ValidDoc.md'
            })
        } as any);

        await classe.onUpdate();

        // Should NOT call updateMetadata since nothing changed
        expect(mockApp.updateMetadata).not.toHaveBeenCalled();
    });
});