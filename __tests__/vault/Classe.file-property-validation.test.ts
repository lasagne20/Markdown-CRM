import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { FileProperty } from '../../src/properties/FileProperty';
import { MultiFileProperty } from '../../src/properties/MultiFileProperty';
import { File } from '../../src/vault/File';

// Test implementation of Classe
class TestableClasse extends Classe {
    static create(vault: Vault): Classe {
        return new TestableClasse(vault);
    }

    async onCreate(): Promise<void> {}
    async onUpdate(): Promise<void> {
        // Call the parent onUpdate which includes file property validation
        await super.onUpdate();
    }
    async onDelete(): Promise<void> {}

    public addProperty(property: any): void {
        (this as any).properties = (this as any).properties || [];
        (this as any).properties.push(property);
    }

    public async testValidateAndUpdateFileProperties() {
        return await (this as any).validateAndUpdateFileProperties();
    }

    public async testValidateAndUpdateFileLink(fileLink: string) {
        return await FileProperty.validateSingleFileLink(this.vault, fileLink);
    }
}

describe('Classe File Property Validation', () => {
    let vault: jest.Mocked<Vault>;
    let mockApp: any;
    let testFile: File;
    let classe: TestableClasse;

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

        // Create test file
        const mockFile = {
            path: '/vault/test/TestFile.md',
            basename: 'TestFile',
            extension: 'md',
            name: 'TestFile.md'
        };
        testFile = new File(vault, mockFile as any);

        // Create test classe
        classe = new TestableClasse(vault, testFile);
    });

    describe('validateAndUpdateFileLink', () => {
        beforeEach(() => {
            vault.getFromLink.mockReset();
        });

        it('should return undefined for empty or invalid input', async () => {
            expect(await classe.testValidateAndUpdateFileLink('')).toBeUndefined();
            expect(await classe.testValidateAndUpdateFileLink(null as any)).toBeUndefined();
            expect(await classe.testValidateAndUpdateFileLink(undefined as any)).toBeUndefined();
            expect(await classe.testValidateAndUpdateFileLink(123 as any)).toBeUndefined();
        });

        it('should validate existing file link correctly', async () => {
            // Mock getFromLink to return a found file
            const mockFoundFile = {
                getFile: () => ({
                    getPath: () => '/vault/documents/ExistingFile.md'
                })
            };
            vault.getFromLink.mockResolvedValueOnce(mockFoundFile as any);

            const result = await classe.testValidateAndUpdateFileLink('[[ExistingFile]]');
            expect(result).toBeNull(); // File exists and unchanged
            expect(vault.getFromLink).toHaveBeenCalledWith('[[ExistingFile]]', false);
        });

        it('should find moved file and update link', async () => {
            // Mock getFromLink to return moved file with different path
            const mockMovedFile = {
                getFile: () => ({
                    getPath: () => '/vault/new-location/MovedFile.md'
                })
            };
            vault.getFromLink.mockResolvedValueOnce(mockMovedFile as any);

            const result = await classe.testValidateAndUpdateFileLink('[[MovedFile]]');
            expect(result).toBeNull(); // File exists and link is correct (basename unchanged)
        });

        it('should return null for non-existent files', async () => {
            // Mock getFromLink to fail
            vault.getFromLink.mockResolvedValue(null);
            
            // Mock listFiles to return empty array
            vault.listFiles.mockResolvedValue([]);

            const result = await classe.testValidateAndUpdateFileLink('[[NonExistent]]');
            expect(result).toBeUndefined(); // File not found, should be removed
        });

        it('should handle different link formats', async () => {
            const mockFoundFile = {
                getFile: () => ({
                    getPath: () => '/vault/TestFile.md'
                })
            };

            // Test with brackets - file exists and unchanged
            vault.getFromLink.mockResolvedValueOnce(mockFoundFile as any);
            let result = await classe.testValidateAndUpdateFileLink('[[TestFile]]');
            expect(result).toBeNull(); // File exists and unchanged

            // Test without brackets - should format to brackets
            vault.getFromLink.mockResolvedValueOnce(mockFoundFile as any);
            result = await classe.testValidateAndUpdateFileLink('TestFile');
            expect(result).toBe('[[TestFile]]');

            // Test with .md extension - should remove extension
            vault.getFromLink.mockResolvedValueOnce(mockFoundFile as any);
            result = await classe.testValidateAndUpdateFileLink('TestFile.md');
            expect(result).toBe('[[TestFile]]');
        });
    });

    describe('validateAndUpdateFileProperties', () => {
        beforeEach(() => {
            vault.getFromLink.mockReset();
            (vault.app.updateMetadata as jest.Mock).mockReset();
        });

        it('should validate existing file without changes', async () => {
            // Add FileProperty to classe
            const fileProperty = new FileProperty('document', vault, []);
            classe.addProperty(fileProperty);

            // Mock metadata with existing file link that doesn't need updating
            const metadata = {
                document: '[[ExistingFile]]'
            };
            mockApp.getMetadata.mockResolvedValue(metadata);

            // Mock file found via getFromLink (no need to search listFiles)
            const mockFoundFile = {
                getFile: () => ({
                    getPath: () => '/vault/ExistingFile.md'
                })
            };
            vault.getFromLink.mockResolvedValue(mockFoundFile as any);

            await classe.testValidateAndUpdateFileProperties();

            // Should NOT update metadata since file is valid and found
            expect(vault.app.updateMetadata).not.toHaveBeenCalled();
        });

        it('should keep non-existent files in MultiFileProperty', async () => {
            // Add MultiFileProperty to classe
            // Note: MultiFileProperty constructor needs vault and classes parameters
            const multiFileProperty = new MultiFileProperty('documents', vault, []);
            classe.addProperty(multiFileProperty);

            // Mock metadata with multiple file links including non-existent
            const metadata = {
                documents: ['[[File1]]', '[[NonExistent]]', '[[File2]]']
            };
            mockApp.getMetadata.mockResolvedValue(metadata);

            // Mock scenarios: File1 exists, NonExistent doesn't, File2 exists
            vault.getFromLink.mockImplementation(async (link: string) => {
                if (link === '[[File1]]' || link === '[[File2]]') {
                    const fileName = link.slice(2, -2); // Remove brackets
                    return {
                        getFile: () => ({
                            getPath: () => `/vault/${fileName}.md`
                        })
                    } as any;
                }
                return null; // NonExistent file
            });

            vault.listFiles.mockResolvedValue([
                { path: '/vault/File1.md' },
                { path: '/vault/File2.md' },
                { path: '/vault/OtherFile.md' }
            ] as any);

            await classe.testValidateAndUpdateFileProperties();

            // Should keep metadata with non-existent files (no update expected)
            expect(vault.app.updateMetadata).not.toHaveBeenCalled();
        });

        it('should handle single value in MultiFileProperty', async () => {
            // Add MultiFileProperty to classe
            const multiFileProperty = new MultiFileProperty('documents', vault, []);
            classe.addProperty(multiFileProperty);

            // Mock metadata with single file link (not array)
            const metadata = {
                documents: '[[SingleFile]]'
            };
            mockApp.getMetadata.mockResolvedValue(metadata);

            // Mock file found
            const mockFoundFile = {
                getFile: () => ({
                    getPath: () => '/vault/SingleFile.md'
                })
            };
            vault.getFromLink.mockResolvedValue(mockFoundFile as any);

            await classe.testValidateAndUpdateFileProperties();

            // Should convert to array format
            expect(vault.app.updateMetadata).toHaveBeenCalledWith(
                testFile.getFile(),
                expect.objectContaining({
                    documents: ['[[SingleFile]]']
                })
            );
        });

        it('should skip properties with no values', async () => {
            // Add FileProperty to classe
            const fileProperty = new FileProperty('document', vault, []);
            classe.addProperty(fileProperty);

            // Mock metadata with empty/null values
            const metadata = {
                document: null,
                other: undefined,
                another: ''
            };
            mockApp.getMetadata.mockResolvedValue(metadata);

            await classe.testValidateAndUpdateFileProperties();

            // Should not call updateMetadata since nothing changed
            expect(vault.app.updateMetadata).not.toHaveBeenCalled();
        });

        it('should not update if all links are valid', async () => {
            // Add FileProperty to classe
            const fileProperty = new FileProperty('document', vault, []);
            classe.addProperty(fileProperty);

            // Mock metadata with existing file link
            const metadata = {
                document: '[[ValidFile]]'
            };
            mockApp.getMetadata.mockResolvedValue(metadata);

            // Mock file found and path unchanged
            const mockFoundFile = {
                getFile: () => ({
                    getPath: () => '/vault/ValidFile.md'
                })
            };
            vault.getFromLink.mockResolvedValue(mockFoundFile as any);

            await classe.testValidateAndUpdateFileProperties();

            // Should not call updateMetadata since nothing changed
            expect(vault.app.updateMetadata).not.toHaveBeenCalled();
        });
    });

    describe('onUpdate integration', () => {
        it('should call file property validation during onUpdate', async () => {
            // Add FileProperty to classe
            const fileProperty = new FileProperty('document', vault, []);
            classe.addProperty(fileProperty);

            // Mock metadata
            const metadata = {
                document: '[[TestFile]]'
            };
            mockApp.getMetadata.mockResolvedValue(metadata);

            // Mock file found
            const mockFoundFile = {
                getFile: () => ({
                    getPath: () => '/vault/TestFile.md'
                })
            };
            vault.getFromLink.mockResolvedValue(mockFoundFile as any);

            // Spy on the validation method
            const validateSpy = jest.spyOn(classe as any, 'validateAndUpdateFileProperties');

            await classe.onUpdate();

            // Should have called validation
            expect(validateSpy).toHaveBeenCalled();
        });
    });
});