import { Classe } from '../../src/vault/Classe';
import { Vault } from '../../src/vault/Vault';
import { File } from '../../src/vault/File';
import { IFile } from '../../src/interfaces/IApp';

// Test class with autoRename configuration
class TestClasseWithAutoRename extends Classe {
    static autoRename: string;
    
    static create(vault: Vault): Classe {
        return new TestClasseWithAutoRename(vault);
    }
}

describe('Classe - AutoRename Functionality', () => {
    let mockApp: any;
    let mockVault: jest.Mocked<Vault>;
    let mockFile: File;

    beforeEach(() => {
        mockApp = {
            getMetadata: jest.fn(),
            writeFile: jest.fn(),
            updateMetadata: jest.fn(),
            move: jest.fn(),
            createFolder: jest.fn(),
            getFile: jest.fn(),
            readFile: jest.fn(),
            isFolder: jest.fn().mockReturnValue(false),
        };
        
        mockVault = {
            app: mockApp,
        } as any;
        
        const iFile: IFile = {
            path: 'vault/Person/OldName.md',
            name: 'OldName.md',
            basename: 'OldName',
            extension: 'md',
        };
        mockFile = new File(mockVault, iFile);
    });

    describe('Basic autoRename', () => {
        it('should rename file based on single property', async () => {
            TestClasseWithAutoRename.autoRename = '{name}';
            const instance = new TestClasseWithAutoRename(mockVault, mockFile);

            mockApp.getMetadata.mockResolvedValue({ name: 'John Doe' });
            mockApp.getFile.mockResolvedValue(null); // Target doesn't exist

            await instance.updateMetadata({ name: 'John Doe' });

            expect(mockApp.move).toHaveBeenCalledWith(
                mockFile,
                'vault/Person/John Doe.md'
            );
        });

        it('should rename file with multiple properties', async () => {
            TestClasseWithAutoRename.autoRename = '{dateEntree} - {nom}';
            const instance = new TestClasseWithAutoRename(mockVault, mockFile);

            mockApp.getMetadata.mockResolvedValue({ 
                dateEntree: '2025-01-15',
                nom: 'John Doe'
            });
            mockApp.getFile.mockResolvedValue(null);

            await instance.updateMetadata({ nom: 'John Doe' });

            expect(mockApp.move).toHaveBeenCalledWith(
                mockFile,
                'vault/Person/2025-01-15 - John Doe.md'
            );
        });

        it('should use {current} placeholder for current filename', async () => {
            const currentFile: IFile = {
                path: 'vault/Person/John Doe.md',
                name: 'John Doe.md',
                basename: 'John Doe',
                extension: 'md',
            };
            const file = new File(mockVault, currentFile);
            
            TestClasseWithAutoRename.autoRename = '{dateEntree} - {current}';
            const instance = new TestClasseWithAutoRename(mockVault, file);

            mockApp.getMetadata.mockResolvedValue({ 
                dateEntree: '2025-01-15'
            });
            mockApp.getFile.mockResolvedValue(null);

            await instance.updateMetadata({ dateEntree: '2025-01-15' });

            expect(mockApp.move).toHaveBeenCalledWith(
                file,
                'vault/Person/2025-01-15 - John Doe.md'
            );
        });

        it('should avoid recursion when {current} contains old template values', async () => {
            // Simulate a file that was already renamed with the template
            const alreadyRenamedFile: IFile = {
                path: 'vault/Person/2025-01-10 - Marie Dupont.md',
                name: '2025-01-10 - Marie Dupont.md',
                basename: '2025-01-10 - Marie Dupont',
                extension: 'md',
            };
            const file = new File(mockVault, alreadyRenamedFile);
            
            TestClasseWithAutoRename.autoRename = '{dateEntree} - {current}';
            const instance = new TestClasseWithAutoRename(mockVault, file);

            // Update dateEntree to a new value
            mockApp.getMetadata.mockResolvedValue({ 
                dateEntree: '2025-01-15'
            });
            mockApp.getFile.mockResolvedValue(null);

            await instance.updateMetadata({ dateEntree: '2025-01-15' });

            // Should extract "Marie Dupont" from "2025-01-10 - Marie Dupont" and create "2025-01-15 - Marie Dupont"
            // NOT "2025-01-15 - 2025-01-10 - Marie Dupont"
            expect(mockApp.move).toHaveBeenCalledWith(
                file,
                'vault/Person/2025-01-15 - Marie Dupont.md'
            );
        });

        it('should handle {current} when initial filename does not match template', async () => {
            // File that doesn't match the template pattern yet
            const initialFile: IFile = {
                path: 'vault/Person/Simple Name.md',
                name: 'Simple Name.md',
                basename: 'Simple Name',
                extension: 'md',
            };
            const file = new File(mockVault, initialFile);
            
            TestClasseWithAutoRename.autoRename = '{dateEntree} - {current}';
            const instance = new TestClasseWithAutoRename(mockVault, file);

            // Set dateEntree for the first time
            mockApp.getMetadata.mockResolvedValue({ 
                dateEntree: '2025-01-15'
            });
            mockApp.getFile.mockResolvedValue(null);

            await instance.updateMetadata({ dateEntree: '2025-01-15' });

            // Should use "Simple Name" as {current} and create "2025-01-15 - Simple Name"
            expect(mockApp.move).toHaveBeenCalledWith(
                file,
                'vault/Person/2025-01-15 - Simple Name.md'
            );
        });

        it('should clean {current} when template has multiple placeholders before it', async () => {
            // File renamed with a complex template
            const complexFile: IFile = {
                path: 'vault/Person/Actif - 2025-01-10 - Marie Dupont.md',
                name: 'Actif - 2025-01-10 - Marie Dupont.md',
                basename: 'Actif - 2025-01-10 - Marie Dupont',
                extension: 'md',
            };
            const file = new File(mockVault, complexFile);
            
            TestClasseWithAutoRename.autoRename = '{statut} - {dateEntree} - {current}';
            const instance = new TestClasseWithAutoRename(mockVault, file);

            // Update statut and dateEntree
            mockApp.getMetadata.mockResolvedValue({ 
                statut: 'Inactif',
                dateEntree: '2025-01-20'
            });
            mockApp.getFile.mockResolvedValue(null);

            await instance.updateMetadata({ 
                statut: 'Inactif',
                dateEntree: '2025-01-20'
            });

            // Should extract "Marie Dupont" and create "Inactif - 2025-01-20 - Marie Dupont"
            // NOT "Inactif - 2025-01-20 - Actif - 2025-01-10 - Marie Dupont"
            expect(mockApp.move).toHaveBeenCalledWith(
                file,
                'vault/Person/Inactif - 2025-01-20 - Marie Dupont.md'
            );
        });

        it('should handle {current} BEFORE other placeholders and avoid infinite recursion', async () => {
            // File that has been renamed multiple times with {current} at the beginning
            const recursiveFile: IFile = {
                path: 'vault/Person/Alice Durand - Actif - Actif - Actif.md',
                name: 'Alice Durand - Actif - Actif - Actif.md',
                basename: 'Alice Durand - Actif - Actif - Actif',
                extension: 'md',
            };
            const file = new File(mockVault, recursiveFile);
            
            TestClasseWithAutoRename.autoRename = '{current} - {statut}';
            const instance = new TestClasseWithAutoRename(mockVault, file);

            // Update statut
            mockApp.getMetadata.mockResolvedValue({ 
                statut: 'Inactif'
            });
            mockApp.getFile.mockResolvedValue(null);

            await instance.updateMetadata({ 
                statut: 'Inactif'
            });

            // Should extract "Alice Durand" and create "Alice Durand - Inactif"
            // NOT "Alice Durand - Actif - Actif - Actif - Inactif"
            expect(mockApp.move).toHaveBeenCalledWith(
                file,
                'vault/Person/Alice Durand - Inactif.md'
            );
        });

        it('should handle extremely recursive {current} at beginning with complex suffix', async () => {
            // File that has accumulated many repetitions
            const extremeFile: IFile = {
                path: 'vault/Person/Alice Durand - Actif - 2023-01-15 - Actif - Actif - Actif - Actif.md',
                name: 'Alice Durand - Actif - 2023-01-15 - Actif - Actif - Actif - Actif.md',
                basename: 'Alice Durand - Actif - 2023-01-15 - Actif - Actif - Actif - Actif',
                extension: 'md',
            };
            const file = new File(mockVault, extremeFile);
            
            TestClasseWithAutoRename.autoRename = '{current} - {statut}';
            const instance = new TestClasseWithAutoRename(mockVault, file);

            // Update statut
            mockApp.getMetadata.mockResolvedValue({ 
                statut: 'Inactif'
            });
            mockApp.getFile.mockResolvedValue(null);

            await instance.updateMetadata({ 
                statut: 'Inactif'
            });

            // Should extract base name and create "Alice Durand - Inactif"
            // The current logic won't clean this properly when {current} is BEFORE the placeholder
            expect(mockApp.move).toHaveBeenCalledWith(
                file,
                'vault/Person/Alice Durand - Inactif.md'
            );
        });
    });

    describe('Edge cases', () => {
        it('should not rename if property value is empty', async () => {
            TestClasseWithAutoRename.autoRename = '{name}';
            const instance = new TestClasseWithAutoRename(mockVault, mockFile);

            mockApp.getMetadata.mockResolvedValue({ name: '' });

            await instance.updateMetadata({ name: '' });

            expect(mockApp.move).not.toHaveBeenCalled();
        });

        it('should not rename if property is undefined', async () => {
            TestClasseWithAutoRename.autoRename = '{name}';
            const instance = new TestClasseWithAutoRename(mockVault, mockFile);

            mockApp.getMetadata.mockResolvedValue({});

            await instance.updateMetadata({ other: 'value' });

            expect(mockApp.move).not.toHaveBeenCalled();
        });

        it('should sanitize special characters in filename', async () => {
            TestClasseWithAutoRename.autoRename = '{name}';
            const instance = new TestClasseWithAutoRename(mockVault, mockFile);

            mockApp.getMetadata.mockResolvedValue({ 
                name: 'John/Doe:Test*Name?'
            });
            mockApp.getFile.mockResolvedValue(null);

            await instance.updateMetadata({ name: 'John/Doe:Test*Name?' });

            expect(mockApp.move).toHaveBeenCalledWith(
                mockFile,
                'vault/Person/John-Doe-Test-Name-.md'
            );
        });

        it('should handle missing properties in template gracefully', async () => {
            TestClasseWithAutoRename.autoRename = '{dateEntree} - {nom}';
            const instance = new TestClasseWithAutoRename(mockVault, mockFile);

            mockApp.getMetadata.mockResolvedValue({ 
                nom: 'John Doe'
                // dateEntree is missing
            });

            await instance.updateMetadata({ nom: 'John Doe' });

            // Should not rename if any property is missing
            expect(mockApp.move).not.toHaveBeenCalled();
        });
    });

    describe('No autoRename configuration', () => {
        it('should not rename if autoRename is not configured', async () => {
            TestClasseWithAutoRename.autoRename = undefined as any;
            const instance = new TestClasseWithAutoRename(mockVault, mockFile);

            mockApp.getMetadata.mockResolvedValue({ name: 'John Doe' });

            await instance.updateMetadata({ name: 'John Doe' });

            expect(mockApp.move).not.toHaveBeenCalled();
        });
    });

    describe('ObjectProperty support', () => {
        it('should access nested properties with dot notation', async () => {
            TestClasseWithAutoRename.autoRename = '{postes.poste} - {nom}';
            const instance = new TestClasseWithAutoRename(mockVault, mockFile);

            mockApp.getMetadata.mockResolvedValue({ 
                nom: 'John Doe',
                postes: {
                    poste: 'Manager',
                    institution: '[[ACME Corp]]'
                }
            });
            mockApp.getFile.mockResolvedValue(null);

            await instance.updateMetadata({ nom: 'John Doe' });

            expect(mockApp.move).toHaveBeenCalledWith(
                mockFile,
                'vault/Person/Manager - John Doe.md'
            );
        });
    });

    describe('File collision handling', () => {
        it('should not rename if target file already exists', async () => {
            TestClasseWithAutoRename.autoRename = '{name}';
            const instance = new TestClasseWithAutoRename(mockVault, mockFile);

            mockApp.getMetadata.mockResolvedValue({ name: 'John Doe' });
            mockApp.getFile.mockResolvedValue({ 
                path: 'vault/Person/John Doe.md',
                name: 'John Doe.md',
                basename: 'John Doe',
                extension: 'md'
            });

            await instance.updateMetadata({ name: 'John Doe' });

            expect(mockApp.move).not.toHaveBeenCalled();
        });

        it('should not rename if filename is already correct', async () => {
            const currentFile: IFile = {
                path: 'vault/Person/John Doe.md',
                name: 'John Doe.md',
                basename: 'John Doe',
                extension: 'md',
            };
            const file = new File(mockVault, currentFile);
            
            TestClasseWithAutoRename.autoRename = '{name}';
            const instance = new TestClasseWithAutoRename(mockVault, file);

            mockApp.getMetadata.mockResolvedValue({ name: 'John Doe' });

            await instance.updateMetadata({ name: 'John Doe' });

            // Should not attempt rename if filename is already correct
            expect(mockApp.move).not.toHaveBeenCalled();
        });
    });

    describe('Integration with updateMetadata and updatePropertyValue', () => {
        it('should trigger rename when updateMetadata is called', async () => {
            TestClasseWithAutoRename.autoRename = '{name}';
            const instance = new TestClasseWithAutoRename(mockVault, mockFile);

            mockApp.getMetadata.mockResolvedValue({ name: 'Jane Smith' });
            mockApp.getFile.mockResolvedValue(null);

            await instance.updateMetadata({ name: 'Jane Smith' });

            expect(mockApp.move).toHaveBeenCalled();
        });

        it('should trigger rename when updatePropertyValue is called', async () => {
            TestClasseWithAutoRename.autoRename = '{name}';
            const instance = new TestClasseWithAutoRename(mockVault, mockFile);

            mockApp.writeFile = jest.fn();
            mockApp.getMetadata.mockResolvedValue({ name: 'Jane Smith' });
            mockApp.getFile.mockResolvedValue(null);

            // Mock the file's updateMetadata method
            mockFile.updateMetadata = jest.fn();

            await instance.updatePropertyValue('name', 'Jane Smith');

            expect(mockApp.move).toHaveBeenCalled();
        });
    });
});
