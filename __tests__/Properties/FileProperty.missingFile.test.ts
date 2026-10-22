/**
 * @jest-environment jsdom
 *
 * FileProperty - liens vers fichiers inexistants :
 * - style distinct (classe missing-file) quand la cible n'existe pas
 * - clic sur un lien absent => creation du fichier markdown (avec parent)
 * - clic sur un lien existant => ouverture, pas de creation
 */

import { FileProperty } from '../../src/properties/FileProperty';

async function flushAsync(): Promise<void> {
    for (let i = 0; i < 5; i++) {
        await Promise.resolve();
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
}

describe('FileProperty - missing file', () => {
    let property: FileProperty;
    let mockVault: any;
    let mockClasse: any;
    let mockClassConstructor: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockClassConstructor = jest.fn();
        mockClasse = {
            name: 'SOCLE.md',
            getPath: jest.fn().mockReturnValue('I - Impulsion/SOCLE/SOCLE.md'),
            getLink: jest.fn().mockReturnValue('[[I - Impulsion/SOCLE/SOCLE.md|SOCLE]]')
        };

        mockVault = {
            app: {
                setIcon: jest.fn(),
                open: jest.fn().mockResolvedValue(undefined),
                getSettings: jest.fn().mockReturnValue({}),
                getUrl: jest.fn().mockImplementation((p: string) => p)
            },
            readLinkFile: jest.fn().mockImplementation((link: string, path = false) => {
                if (!link) return '';
                const match = link.match(/^\[\[(.*?)(?:\|([^\\]]+?))?\]\]$/);
                const fileName = match ? match[1].trim() : link;
                if (path) {
                    return /\.[^/\\]+$/.test(fileName) ? fileName : `${fileName}.md`;
                }
                return fileName.replace('.md', '');
            }),
            getFromLink: jest.fn().mockResolvedValue(null),
            createFile: jest.fn().mockResolvedValue({
                getPath: jest.fn().mockReturnValue('D - I-MOD-EOL-EOLI-SOCLE-D.md')
            }),
            getDynamicClassFactory: jest.fn().mockReturnValue({
                getClass: jest.fn().mockResolvedValue(mockClassConstructor)
            })
        };

        property = new FileProperty('Piece', mockVault, ['Piece', 'Assemblage'], { createMissing: true });
    });

    describe('style missing-file', () => {
        it('devrait marquer le lien avec missing-file si le fichier n existe pas', async () => {
            mockVault.getFromLink.mockResolvedValue(null);

            const container = property.fillDisplay('[[D - I-MOD-EOL-EOLI-SOCLE-D]]', jest.fn());
            await flushAsync();

            const link = container.querySelector('.field-link') as HTMLElement;
            expect(link).toBeTruthy();
            expect(link.classList.contains('missing-file')).toBe(true);
        });

        it('ne devrait pas marquer le lien si le fichier existe', async () => {
            mockVault.getFromLink.mockResolvedValue(mockClasse);

            const container = property.fillDisplay('[[I - Impulsion/SOCLE/SOCLE.md|SOCLE]]', jest.fn());
            await flushAsync();

            const link = container.querySelector('.field-link') as HTMLElement;
            expect(link.classList.contains('missing-file')).toBe(false);
        });
    });

    describe('clic sur un lien absent', () => {
        it('devrait creer le fichier avec la premiere classe et le parent courant', async () => {
            mockVault.getFromLink.mockResolvedValue(null);

            const container = property.fillDisplay('[[D - I-MOD-EOL-EOLI-SOCLE-D]]', jest.fn(), { classe: mockClasse });
            await flushAsync();

            const link = container.querySelector('.field-link') as HTMLElement;
            link.dispatchEvent(new MouseEvent('click'));
            await flushAsync();

            expect(mockVault.getDynamicClassFactory().getClass).toHaveBeenCalledWith('Piece');
            expect(mockVault.createFile).toHaveBeenCalledWith(
                mockClassConstructor,
                'D - I-MOD-EOL-EOLI-SOCLE-D',
                { parent: mockClasse }
            );
        });

        it('devrait creer sans parent si aucune classe de contexte n est disponible', async () => {
            mockVault.getFromLink.mockResolvedValue(null);

            const container = property.fillDisplay('[[D - X]]', jest.fn());
            await flushAsync();

            const link = container.querySelector('.field-link') as HTMLElement;
            link.dispatchEvent(new MouseEvent('click'));
            await flushAsync();

            expect(mockVault.createFile).toHaveBeenCalledWith(mockClassConstructor, 'D - X', {});
        });

        it('devrait retirer missing-file et ouvrir le fichier apres creation', async () => {
            mockVault.getFromLink.mockResolvedValue(null);

            const container = property.fillDisplay('[[D - X]]', jest.fn(), { classe: mockClasse });
            await flushAsync();

            const link = container.querySelector('.field-link') as HTMLElement;
            link.dispatchEvent(new MouseEvent('click'));
            await flushAsync();

            expect(link.classList.contains('missing-file')).toBe(false);
            expect(mockVault.app.open).toHaveBeenCalledWith('D - I-MOD-EOL-EOLI-SOCLE-D.md');
        });
    });

    describe('option createMissing (desactivee par defaut)', () => {
        it('ne devrait pas creer le fichier au clic sans createMissing: true', async () => {
            const gated = new FileProperty('Piece', mockVault, ['Piece', 'Assemblage'], {});
            mockVault.getFromLink.mockResolvedValue(null);
            mockVault.app.sendNotice = jest.fn();

            const container = gated.fillDisplay('[[D - X]]', jest.fn(), { classe: mockClasse });
            await flushAsync();

            const link = container.querySelector('.field-link') as HTMLElement;
            link.dispatchEvent(new MouseEvent('click'));
            await flushAsync();

            expect(mockVault.createFile).not.toHaveBeenCalled();
            expect(mockVault.app.sendNotice).toHaveBeenCalled();
        });

        it('devrait garder le style missing-file meme sans createMissing', async () => {
            const gated = new FileProperty('Piece', mockVault, ['Piece', 'Assemblage'], {});
            mockVault.getFromLink.mockResolvedValue(null);

            const container = gated.fillDisplay('[[D - X]]', jest.fn());
            await flushAsync();

            const link = container.querySelector('.field-link') as HTMLElement;
            expect(link.classList.contains('missing-file')).toBe(true);
        });
    });

    describe('clic sur un lien existant', () => {
        it('devrait ouvrir le fichier sans creer', async () => {
            mockVault.getFromLink.mockResolvedValue({
                getPath: jest.fn().mockReturnValue('I - Impulsion/SOCLE/SOCLE.md')
            });

            const container = property.fillDisplay('[[SOCLE]]', jest.fn(), { classe: mockClasse });
            await flushAsync();

            const link = container.querySelector('.field-link') as HTMLElement;
            link.dispatchEvent(new MouseEvent('click'));
            await flushAsync();

            expect(mockVault.createFile).not.toHaveBeenCalled();
            expect(mockVault.app.open).toHaveBeenCalledWith('I - Impulsion/SOCLE/SOCLE.md', false);
        });
    });
});
