/**
 * Le cache d'instances du Vault (this.files, indexé par chemin) doit suivre
 * le fichier quand il est renommé/déplacé. Sinon, après un rename (ex: process
 * de titre "{animations[0].date} - Action - {current}"), l'instance reste
 * cachée sous l'ancien chemin et le prochain getFromFile(nouveau chemin)
 * crée une DEUXIÈME instance pour le même fichier : les widgets de la page
 * sont branchés sur une instance (avec handlers de re-rendu), les autres
 * flux (pseudo-refresh, getFromFile) sur l'autre -> les propriétés calculées
 * ne se rafraîchissent plus (notify sans effet).
 *
 * Classe.setFile est le point unique par lequel le File d'une instance change
 * de chemin (RenameFileAction, updateParentFolder) : il doit resynchroniser
 * le cache du Vault.
 */

import { Classe } from '../../src/vault/Classe';
import { Vault } from '../../src/vault/Vault';
import { File } from '../../src/vault/File';
import { mockApp } from '../utils/mocks';

describe('Classe.setFile - synchronisation du cache du Vault sur rename', () => {
    const makeIFile = (path: string) => ({
        path,
        name: path.split('/').pop(),
        basename: path.split('/').pop()?.replace('.md', ''),
        extension: 'md',
        parent: { path: path.substring(0, path.lastIndexOf('/')) }
    } as any);

    test('PLANTE : setFile avec un nouveau chemin déplace l\'entrée du cache du Vault', () => {
        const app = { ...mockApp() } as any;
        const vault = new Vault(app, { vaultPath: './test-vault', configPath: './config' } as any);

        const oldPath = 'Actions/2026-11-07 - Action - test.md';
        const newPath = 'Actions/2026-11-21 - Action - test.md';

        const classe = new Classe(vault, new File(vault, makeIFile(oldPath)));
        // Simule l'état produit par createClasse (instance cachée par chemin)
        (vault as any).files[oldPath] = classe;
        expect((vault as any).files[oldPath]).toBe(classe);

        // Le fichier est renommé : l'instance reçoit le File au nouveau chemin
        classe.setFile(new File(vault, makeIFile(newPath)));

        const files = (vault as any).files;
        expect(files[newPath]).toBe(classe);
        expect(files[oldPath]).toBeUndefined();
    });

    test('setFile avec le même chemin ne touche pas au cache', () => {
        const app = { ...mockApp() } as any;
        const vault = new Vault(app, { vaultPath: './test-vault', configPath: './config' } as any);

        const path = 'Actions/2026-11-07 - Action - test.md';
        const classe = new Classe(vault, new File(vault, makeIFile(path)));
        (vault as any).files[path] = classe;

        classe.setFile(new File(vault, makeIFile(path)));

        expect((vault as any).files[path]).toBe(classe);
    });
});
