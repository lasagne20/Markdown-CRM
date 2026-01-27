import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { FileProperty } from '../../src/properties/FileProperty';
import { MultiFileProperty } from '../../src/properties/MultiFileProperty';
import { File } from '../../src/vault/File';

describe('File Property Validation - Real World Example', () => {
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

    it('should clean up file properties after multiple populate operations', async () => {
        /**
         * Scenario: During multiple populate operations, files get moved around 
         * and some links become invalid. The validation should:
         * 1. Remove broken/missing file links
         * 2. Keep valid file links unchanged
         * 3. Convert single values to arrays for MultiFileProperty
         */
        
        // Create test person class
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

        // Add file properties typical for a person
        const cvProperty = new FileProperty('cv', vault, []);
        person.addProperty(cvProperty);
        
        const documentsProperty = new MultiFileProperty('documents', vault, []);
        person.addProperty(documentsProperty);

        // Simulate metadata after populate operations with some broken links
        mockApp.getMetadata.mockResolvedValue({
            name: 'John Doe',
            cv: '[[john-cv]]',              // This file exists
            documents: [
                '[[contract-2024]]',        // This file exists
                '[[old-reference]]',        // This file was deleted
                '[[meeting-notes-jan]]'     // This file exists
            ]
        });

        // Mock file resolution - some files exist, some don't
        vault.getFromLink.mockImplementation(async (link: string) => {
            const existingFiles = ['[[john-cv]]', '[[contract-2024]]', '[[meeting-notes-jan]]'];
            if (existingFiles.includes(link)) {
                const fileName = link.slice(2, -2);
                return {
                    getFile: () => ({
                        getPath: () => `/vault/files/${fileName}.md`
                    })
                } as any;
            }
            return null; // File doesn't exist
        });

        vault.listFiles.mockResolvedValue([
            { path: '/vault/files/john-cv.md' },
            { path: '/vault/files/contract-2024.md' },
            { path: '/vault/files/meeting-notes-jan.md' },
            // Note: old-reference.md is NOT in the list (it was deleted)
        ] as any);

        // Call onUpdate which should trigger file validation
        await person.onUpdate();

        // Verify that metadata is not updated since broken links are kept unchanged
        expect(mockApp.updateMetadata).not.toHaveBeenCalled();
    });

    it('should handle edge cases gracefully', async () => {
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
            path: '/vault/test/EdgeCase.md',
            basename: 'EdgeCase',
            extension: 'md',
            name: 'EdgeCase.md'
        };
        const testFile = new File(vault, mockFile as any);
        const testClasse = new TestClasse(vault, testFile);

        // Add properties with edge case values
        const docProperty = new FileProperty('document', vault, []);
        testClasse.addProperty(docProperty);
        
        const attachProperty = new (class extends MultiFileProperty {
            constructor(name: string) {
                super(name, vault, [], {});
            }
        })('attachments');
        testClasse.addProperty(attachProperty);

        // Test edge cases: empty values, null, undefined, empty arrays
        mockApp.getMetadata.mockResolvedValue({
            document: null,        // Null value - should be ignored
            attachments: [],       // Empty array - should be ignored
            other: undefined       // Undefined - should be ignored
        });

        await testClasse.onUpdate();

        // Should NOT call updateMetadata since no valid file properties to update
        expect(mockApp.updateMetadata).not.toHaveBeenCalled();
    });
});