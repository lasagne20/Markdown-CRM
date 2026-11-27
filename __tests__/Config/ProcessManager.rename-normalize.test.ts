import { ProcessManager } from '../../src/Config/ProcessManager';
import { Classe } from '../../src/vault/Classe';
import { File } from '../../src/vault/File';

describe('ProcessManager - RenameFileAction normalize (Prénom Nom)', () => {
    let processManager: ProcessManager;
    let mockVault: any;
    let mockInstance: Classe;

    const buildInstance = (basename: string): Classe => {
        const mockFile = {
            updateMetadata: jest.fn(),
            getMetadata: jest.fn().mockResolvedValue({ Classe: 'Personne' }),
            getClassePropertyValue: jest.fn().mockResolvedValue('Personne'),
            path: `Pers/${basename}.md`,
            basename,
            getPath: jest.fn().mockReturnValue(`Pers/${basename}.md`),
            getFile: jest.fn().mockReturnValue({ path: `Pers/${basename}.md` })
        } as any;
        return new Classe(mockVault, mockFile);
    };

    beforeEach(() => {
        mockVault = {
            app: {
                getSettings: jest.fn().mockReturnValue({
                    classePropertyName: 'Classe'
                }),
                getMetadata: jest.fn().mockImplementation((file: any) => {
                    if (file && file.getMetadata) {
                        return file.getMetadata();
                    }
                    return Promise.resolve({});
                }),
                updateMetadata: jest.fn().mockResolvedValue(undefined),
                getFile: jest.fn().mockResolvedValue(null),
                move: jest.fn().mockResolvedValue(undefined),
                isFolder: jest.fn().mockReturnValue(false),
                createDiv: jest.fn((className?: string) => {
                    const div = document.createElement('div');
                    if (className) div.className = className;
                    return div;
                }),
                setIcon: jest.fn((element: HTMLElement, icon: string) => {
                    element.setAttribute('data-icon', icon);
                }),
                needDisplayRefresh: jest.fn()
            },
            getClasseFromName: jest.fn(),
            createFile: jest.fn(),
            getFromFile: jest.fn(),
            getFromLink: jest.fn(),
            updateFileFromData: jest.fn().mockResolvedValue(undefined),
            getDynamicClassFactory: jest.fn().mockReturnValue({
                getClass: jest.fn(),
                getClassConfig: jest.fn(),
                getConfigManager: jest.fn().mockReturnValue({
                    loadClassData: jest.fn().mockResolvedValue([])
                })
            })
        };
        processManager = new ProcessManager(mockVault);
    });

    const runRename = async (instance: Classe, action: any) => {
        const classConfig = {
            className: 'Personne',
            classIcon: 'circle-user-round',
            properties: {},
            process: [
                {
                    name: 'NormaliserNomPersonne',
                    triggers: ['onCreate' as const],
                    conditions: [],
                    actions: [action]
                }
            ]
        };
        mockVault.getDynamicClassFactory().getClassConfig.mockResolvedValue(classConfig);
        await processManager.runProcesses('Personne', instance, 'onCreate');
    };

    it.each([
        ['jean.dupont', 'Jean Dupont'],
        ['jean_dupont', 'Jean Dupont'],
        ['jean-pierre_dupont', 'Jean Pierre Dupont'],
        ['jean   dupont', 'Jean Dupont'],
        ['JEAN   DUPONT', 'Jean Dupont'],
        ['émilie.lopez', 'Émilie Lopez'],
        ['jean.dupont ', 'Jean Dupont']
    ])('normalize: true - renomme "%s" en "%s"', async (input, expected) => {
        mockInstance = buildInstance(input);
        await runRename(mockInstance, {
            type: 'RenameFileAction' as const,
            template: '{current}',
            normalize: true
        });
        expect(mockVault.app.move).toHaveBeenCalledWith(
            expect.anything(),
            `Pers/${expected}.md`
        );
    });

    it('ne renomme pas si le nom est deja normalise', async () => {
        mockInstance = buildInstance('Jean Dupont');
        await runRename(mockInstance, {
            type: 'RenameFileAction' as const,
            template: '{current}',
            normalize: true
        });
        expect(mockVault.app.move).not.toHaveBeenCalled();
    });

    it('sans normalize, le comportement existant est inchange (pas de transformation)', async () => {
        mockInstance = buildInstance('jean.dupont');
        await runRename(mockInstance, {
            type: 'RenameFileAction' as const,
            template: '{current}'
        });
        expect(mockVault.app.move).not.toHaveBeenCalled();
    });

    it('separateurs personnalises : conserve les traits d union si non listes', async () => {
        mockInstance = buildInstance('jean-pierre dupont');
        await runRename(mockInstance, {
            type: 'RenameFileAction' as const,
            template: '{current}',
            normalize: { separators: ['.'] }
        });
        expect(mockVault.app.move).toHaveBeenCalledWith(
            expect.anything(),
            'Pers/Jean-Pierre Dupont.md'
        );
    });

    it('capitalizeEach: false - remplace les separateurs sans capitaliser', async () => {
        mockInstance = buildInstance('jean.dupont');
        await runRename(mockInstance, {
            type: 'RenameFileAction' as const,
            template: '{current}',
            normalize: { capitalizeEach: false }
        });
        expect(mockVault.app.move).toHaveBeenCalledWith(
            expect.anything(),
            'Pers/jean dupont.md'
        );
    });

    it('ne renomme pas si un fichier existe deja a la cible', async () => {
        mockInstance = buildInstance('jean.dupont');
        mockVault.app.getFile.mockImplementation(async (path: string) =>
            path === 'Pers/Jean Dupont.md' ? { path: 'Pers/Jean Dupont.md' } : null
        );
        await runRename(mockInstance, {
            type: 'RenameFileAction' as const,
            template: '{current}',
            normalize: true
        });
        expect(mockVault.app.move).not.toHaveBeenCalled();
    });
});
