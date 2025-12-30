import { Vault } from "../../src/vault/Vault";
import { IApp, IFile } from "../../src/interfaces/IApp";

describe('Vault - Path Change Handling', () => {
    let mockApp: jest.Mocked<IApp>;
    let vault: Vault;
    let mockFiles: IFile[];

    beforeEach(() => {
        mockApp = {
            listFiles: jest.fn(),
            getMetadata: jest.fn(),
            updateMetadata: jest.fn(),
            createFile: jest.fn(),
            readFile: jest.fn(),
            writeFile: jest.fn(),
            getFile: jest.fn(),
            isFile: jest.fn(),
            isFolder: jest.fn(),
            getVaultPath: jest.fn(),
            getName: jest.fn(),
            getSettings: jest.fn().mockReturnValue({ classePropertyName: 'Classe' }),
            setIcon: jest.fn(),
            selectFile: jest.fn(),
            selectClasse: jest.fn(),
            sendNotice: jest.fn(),
            getUrl: jest.fn(),
            open: jest.fn(),
            delete: jest.fn(),
            listFolders: jest.fn(),
            waitForFileMetaDataUpdate: jest.fn()
        } as any;

        // Mock files: le fichier a changé de chemin
        mockFiles = [
            {
                name: '38 - Isère.md',
                path: 'France/ARA/38 - Isère/38 - Isère.md', // Nouveau chemin
                basename: '38 - Isère',
                extension: 'md'
            }
        ];

        mockApp.listFiles.mockResolvedValue(mockFiles);
        mockApp.getMetadata.mockImplementation(async (file: IFile) => {
            if (file.name === '38 - Isère.md') {
                return { 
                    Classe: 'Departement',
                    nom: '38 - Isère'
                };
            }
            return {};
        });

        vault = new Vault(mockApp, {
            templateFolder: 'templates',
            personalName: 'Test User'
        });
    });

    describe('getFromLink with path changes', () => {
        it('should find file with path segments matching (specific algorithm test)', async () => {
            // Configuration avec plusieurs fichiers du même nom
            const multipleFiles: IFile[] = [
                {
                    name: '38 - Isère.md',
                    path: 'France/ARA/38 - Isère/38 - Isère.md',
                    basename: '38 - Isère',
                    extension: 'md'
                },
                {
                    name: '38 - Isère.md',
                    path: 'Archive/Old/38 - Isère.md',
                    basename: '38 - Isère',
                    extension: 'md'
                },
                {
                    name: '38 - Isère.md',
                    path: 'Backup/National/38 - Isère/38 - Isère.md',
                    basename: '38 - Isère',
                    extension: 'md'
                }
            ];
            
            mockApp.listFiles.mockResolvedValue(multipleFiles);
            mockApp.getMetadata.mockImplementation(async (file: IFile) => ({
                Classe: 'Departement',
                nom: '38 - Isère'
            }));
            
            // Ancien lien vers le dossier National
            const oldPathLink = '[[National/84 - Auvergne-Rhône-Alpes/38 - Isère/38 - Isère.md]]';
            
            const result = await vault.getFromLink(oldPathLink, false);
            
            expect(result).not.toBeNull();
            expect(result?.getName()).toBe('38 - Isère');
            
            // Devrait préférer le fichier qui a des segments correspondants (Backup/National/38 - Isère/38 - Isère.md)
            // car il contient "National" et "38 - Isère" de l'ancien chemin
            expect(result?.getPath()).toBe('Backup/National/38 - Isère/38 - Isère.md');
        });

        it('should find file with old path in link when multiple files have same name', async () => {
            // Ajouter un deuxième fichier avec le même nom mais dans un autre dossier
            const additionalFiles: IFile[] = [
                ...mockFiles,
                {
                    name: '38 - Isère.md',
                    path: 'Backup/Archives/38 - Isère.md',
                    basename: '38 - Isère',
                    extension: 'md'
                }
            ];
            
            mockApp.listFiles.mockResolvedValue(additionalFiles);
            mockApp.getMetadata.mockImplementation(async (file: IFile) => {
                if (file.name === '38 - Isère.md') {
                    return { 
                        Classe: 'Departement',
                        nom: '38 - Isère'
                    };
                }
                return {};
            });

            // Le lien fait référence à l'ancien chemin qui correspond mieux au nouveau
            const oldPathLink = '[[National/84 - Auvergne-Rhône-Alpes/38 - Isère/38 - Isère.md]]';
            
            const result = await vault.getFromLink(oldPathLink);
            
            expect(result).not.toBeNull();
            // Devrait préférer le fichier qui a le chemin le plus proche de l'ancien
            expect(result?.getPath()).toBe('France/ARA/38 - Isère/38 - Isère.md');
        });

        it('should handle simple filename links even after path change', async () => {
            const simpleLink = '[[38 - Isère]]';
            
            const result = await vault.getFromLink(simpleLink);
            
            expect(result).not.toBeNull();
            expect(result?.getName()).toBe('38 - Isère');
        });

        it('should handle alias links even after path change', async () => {
            const aliasLink = '[[National/84 - Auvergne-Rhône-Alpes/38 - Isère/38 - Isère.md|Isère]]';
            
            const result = await vault.getFromLink(aliasLink);
            
            expect(result).not.toBeNull();
            expect(result?.getName()).toBe('38 - Isère');
        });
    });
});