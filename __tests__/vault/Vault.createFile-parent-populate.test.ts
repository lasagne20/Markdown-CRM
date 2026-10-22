/**
 * Vault.createFile - pre-remplissage de la propriete parent :
 * quand un parent est fourni, le populate ne doit pas redemander
 * la propriete parent, et le lien doit se retrouver dans le frontmatter.
 */

import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { ClassConfig } from '../../src/Config/interfaces';

describe('Vault.createFile - parent fourni et populate', () => {
    let mockApp: any;
    let mockSettings: any;
    let vault: Vault;
    let mockFactory: any;
    let mockParent: any;

    beforeEach(() => {
        mockSettings = {
            templateFolder: 'templates',
            classePropertyName: 'Classe',
            configPath: 'config'
        };

        mockApp = {
            getSettings: jest.fn(() => mockSettings),
            getFile: jest.fn().mockResolvedValue(null),
            createFile: jest.fn().mockResolvedValue({ path: 'I - Impulsion/SOCLE/D - PIECE.md', extension: 'md' }),
            createFolder: jest.fn(),
            isFile: jest.fn(),
            isFolder: jest.fn(() => false),
            readFile: jest.fn(),
            getMetadata: jest.fn().mockResolvedValue({}),
            waitForFileMetaDataUpdate: jest.fn((path: string, prop: string, callback: () => Promise<void>) => callback()),
            setIcon: jest.fn(),
            // Le prompt de populate (FileProperty) passe par selectFile :
            // il ne doit jamais etre appele quand le parent est fourni
            selectFile: jest.fn(),
            sendNotice: jest.fn()
        };

        mockFactory = {
            getClassConfig: jest.fn()
        };

        mockParent = {
            // Forme d'une Classe : le wikilink parent vit sur son File
            getFile: jest.fn().mockReturnValue({
                getLink: jest.fn().mockReturnValue('[[I - Impulsion/MOD/EOL/EOLI/SOCLE/SOCLE|SOCLE]]'),
                getFolderPath: jest.fn().mockReturnValue('I - Impulsion/MOD/EOL/EOLI/SOCLE'),
                getName: jest.fn().mockReturnValue('SOCLE.md')
            }),
            getPath: jest.fn().mockReturnValue('I - Impulsion/MOD/EOL/EOLI/SOCLE/SOCLE.md'),
            name: 'SOCLE'
        };

        vault = new Vault(mockApp, mockSettings);
        vault.getDynamicClassFactory = jest.fn(() => mockFactory);

        // Desactive le traitement post-creation (onCreate) pour isoler
        vault.getFromFile = jest.fn().mockResolvedValue(null);
    });

    it('ne devrait pas redemander le parent au populate quand il est fourni', async () => {
        const classConfig: ClassConfig = {
            className: 'Piece',
            classIcon: 'puzzle',
            parent: { property: 'Parent' },
            populate: [
                { property: 'Parent', title: 'Sélectionner le parent', required: true }
            ],
            properties: {
                Parent: { type: 'FileProperty', title: 'Parent', classes: ['Assemblage'] }
            }
        };
        mockFactory.getClassConfig.mockResolvedValue(classConfig);

        class TestPiece extends Classe {
            static className = 'Piece';
        }

        await vault.createFile(TestPiece, 'D - PIECE', { parent: mockParent as any });

        expect(mockApp.selectFile).not.toHaveBeenCalled();
    });

    it('devrait injecter le lien du parent dans le frontmatter du fichier cree', async () => {
        const classConfig: ClassConfig = {
            className: 'Piece',
            classIcon: 'puzzle',
            parent: { property: 'Parent' },
            populate: [
                { property: 'Parent', title: 'Sélectionner le parent', required: true }
            ],
            properties: {
                Parent: { type: 'FileProperty', title: 'Parent', classes: ['Assemblage'] }
            }
        };
        mockFactory.getClassConfig.mockResolvedValue(classConfig);

        class TestPiece extends Classe {
            static className = 'Piece';
        }

        await vault.createFile(TestPiece, 'D - PIECE', { parent: mockParent as any });

        expect(mockApp.createFile).toHaveBeenCalled();
        const content = mockApp.createFile.mock.calls[0][1] as string;
        expect(content).toContain('Parent: "[[I - Impulsion/MOD/EOL/EOLI/SOCLE/SOCLE|SOCLE]]"');
    });

    it('devrait quand meme demander le parent au populate si aucun parent n est fourni', async () => {
        const classConfig: ClassConfig = {
            className: 'Piece',
            classIcon: 'puzzle',
            parent: { property: 'Parent' },
            populate: [
                { property: 'Parent', title: 'Sélectionner le parent', required: true }
            ],
            properties: {
                Parent: { type: 'FileProperty', title: 'Parent', classes: ['Assemblage'] }
            }
        };
        mockFactory.getClassConfig.mockResolvedValue(classConfig);
        // Le selectFile du prompt renvoie un fichier (simule la reponse utilisateur)
        mockApp.selectFile.mockResolvedValue({ getLink: jest.fn().mockReturnValue('[[X|X]]') });

        class TestPiece extends Classe {
            static className = 'Piece';
        }

        await vault.createFile(TestPiece, 'D - PIECE');

        expect(mockApp.selectFile).toHaveBeenCalled();
    });

    it('ne devrait PAS pre-remplir le parent fourni si autoFill: false (prompt a la place)', async () => {
        const classConfig: ClassConfig = {
            className: 'Piece',
            classIcon: 'puzzle',
            parent: { property: 'Parent', autoFill: false },
            populate: [
                { property: 'Parent', title: 'Sélectionner le parent', required: true }
            ],
            properties: {
                Parent: { type: 'FileProperty', title: 'Parent', classes: ['Assemblage'] }
            }
        };
        mockFactory.getClassConfig.mockResolvedValue(classConfig);
        mockApp.selectFile.mockResolvedValue({ getLink: jest.fn().mockReturnValue('[[CHOISI|CHOISI]]') });

        class TestPiece extends Classe {
            static className = 'Piece';
        }

        await vault.createFile(TestPiece, 'D - PIECE', { parent: mockParent as any });

        // Le parent fourni n a pas ete injecte silencieusement : le populate demande
        expect(mockApp.selectFile).toHaveBeenCalled();
        const content = mockApp.createFile.mock.calls[0][1] as string;
        expect(content).not.toContain('[[I - Impulsion/MOD/EOL/EOLI/SOCLE/SOCLE|SOCLE]]');
    });
});
