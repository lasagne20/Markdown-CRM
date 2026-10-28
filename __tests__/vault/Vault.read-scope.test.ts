/**
 * Read scope : cache borné à un rendu de page (option A).
 *
 * listFiles() relit la propriété classe de chaque fichier du vault à
 * chaque appel, et getFromLink() le rappelle jusqu'à deux fois par lien.
 * Sur une page avec des dizaines de résolutions de liens (countDistinct,
 * cellules de tableau), cela représente des secondes de scans redondants.
 *
 * Le fix : un scope de lecture. Tant qu'il est ouvert, listFiles() sert un
 * snapshot partagé et getFromLink() mémoïse ses résolutions (réussies ET
 * échouées). À la fermeture du scope, tout est relâché : chaque nouveau
 * rendu relit le vault pour de vrai (zéro désynchro inter-rendus). Les
 * mutations connues du Vault (rename via moveCachedClasse) invalident le
 * snapshot à chaud, même scope ouvert.
 */

import { Vault } from '../../src/vault/Vault';
import { DisplayRenderer } from '../../src/display/DisplayRenderer';

function makeFile(path: string): any {
    const name = path.split('/').pop() as string;
    return {
        path,
        name,
        basename: name.replace('.md', ''),
        extension: 'md',
        parent: { path: path.substring(0, path.lastIndexOf('/')) || '' }
    };
}

describe('Vault - read scope (cache borné au rendu)', () => {
    let app: any;
    let vault: Vault;
    const settings: any = {
        templateFolder: './templates',
        personalName: 'Test',
        configPath: './config'
    };

    beforeEach(() => {
        app = {
            listFiles: jest.fn(async () => [
                makeFile('Actions/Action 1.md'),
                makeFile('Actions/Action 2.md'),
                makeFile('Autres/Note.md')
            ]),
            getMetadata: jest.fn(async (f: any) =>
                f.path.startsWith('Actions/') ? { classe: 'Action' } : {}
            ),
            getSettings: jest.fn(() => ({
                classePropertyName: 'classe',
                classePropertyAliases: [],
                deleteAliasesAfterMigration: false
            })),
            getFile: jest.fn(),
            isFolder: jest.fn(() => false)
        };
        vault = new Vault(app, settings);
    });

    test('PLANTE : listFiles partagé dans le scope, rescanné après', async () => {
        // Laisse l'initialisation en arrière-plan du constructeur se terminer
        // (ConfigLoader appelle aussi app.listFiles)
        await new Promise(r => setTimeout(r, 50));
        const count = () => app.listFiles.mock.calls.length;

        const before = count();
        await vault.withReadScope(async () => {
            await vault.listFiles();
            await vault.listFiles();
            expect(count() - before).toBe(1);
        });

        // Hors scope : chaque appel relit le vault pour de vrai
        await vault.listFiles();
        expect(count() - before).toBe(2);
    });

    test('PLANTE : getFromLink échoué mémoïsé dans le scope, retenté après', async () => {
        await new Promise(r => setTimeout(r, 50));
        const count = () => app.listFiles.mock.calls.length;

        const before = count();
        await vault.withReadScope(async () => {
            const first = await vault.getFromLink('[[Nulle part]]', false);
            const second = await vault.getFromLink('[[Nulle part]]', false);
            expect(first).toBeNull();
            expect(second).toBeNull();
            // Un seul scan de liste pour les deux résolutions
            expect(count() - before).toBe(1);
        });

        // Hors scope : la résolution retente (2 scans = path puis nom)
        const third = await vault.getFromLink('[[Nulle part]]', false);
        expect(third).toBeNull();
        expect(count() - before).toBe(3);
    });

    test('PLANTE : getFromLink réussi mémoïsé dans le scope (même instance)', async () => {
        await new Promise(r => setTimeout(r, 50));
        const count = () => app.listFiles.mock.calls.length;

        const fakeClasse: any = { name: 'Action 1' };
        vault.files['Actions/Action 1.md'] = fakeClasse;

        const before = count();
        await vault.withReadScope(async () => {
            const a = await vault.getFromLink('[[Actions/Action 1]]', false);
            const b = await vault.getFromLink('[[Actions/Action 1]]', false);
            expect(a).toBe(fakeClasse);
            expect(b).toBe(fakeClasse);
            expect(count() - before).toBe(1);
        });
    });

    test('PLANTE : moveCachedClasse (rename) invalide le snapshot même scope ouvert', async () => {
        let renamed = false;
        app.listFiles = jest.fn(async () => renamed
            ? [makeFile('Actions/Action renommée.md')]
            : [makeFile('Actions/Action 1.md')]);

        const fakeClasse: any = { name: 'Action 1' };
        vault.files['Actions/Action 1.md'] = fakeClasse;

        await vault.withReadScope(async () => {
            const before = await vault.getFromLink('[[Actions/Action 1]]', false);
            expect(before).toBe(fakeClasse);
            expect(app.listFiles).toHaveBeenCalledTimes(1);

            // Le rename survient PENDANT le rendu : le snapshot ne doit plus
            // masquer le fichier sous son nouveau nom
            renamed = true;
            vault.moveCachedClasse('Actions/Action 1.md', 'Actions/Action renommée.md');

            const after = await vault.getFromLink('[[Actions/Action renommée]]', false);
            expect(after).toBe(fakeClasse);
        });
    });

    test('PLANTE : le rendu des items passe dans un scope de lecture', async () => {
        const withReadScope = jest.fn(async (work: () => Promise<void>) => work());
        const mockVault: any = {
            app,
            settings,
            withReadScope,
            conditionManager: { createValidationFunction: () => () => true },
            getDynamicClassFactory: () => null
        };
        const renderer = new DisplayRenderer(mockVault, {}, undefined as any);

        const container = document.createElement('div');
        await renderer.renderDisplayItems(container, []);

        expect(withReadScope).toHaveBeenCalled();
    });
});
