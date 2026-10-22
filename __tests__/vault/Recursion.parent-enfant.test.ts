/**
 * @jest-environment jsdom
 *
 * Regression : "cliquer sur le parent dans l'enfant declenche une
 * recursion infinie de dossiers" (SOCLE/D - X/SOCLE/D - X/... observe
 * 17 niveaux dans le vault).
 *
 * Reproduit le scenario reel : ouvrir l'enfant (resolution de ses liens),
 * puis cliquer le lien Parent (resolution du parent). On borne le nombre
 * de moves : s'il explose, la recursion est prouvee.
 */

import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { File } from '../../src/vault/File';
import { FileProperty } from '../../src/properties/FileProperty';
import { ObjectProperty } from '../../src/properties/ObjectProperty';

const PARENT_PATH = 'I - Impulsion/MOD/EOL/EOLI/SOCLE/SOCLE.md';
const GRANDPARENT_PATH = 'I - Impulsion/MOD/EOL/EOLI/EOLI.md';
const CHILD_PATH = 'D - I-MOD-EOL-EOLI-SOCLE-D.md';

// Limite au-dela de laquelle on considere qu'il y a recursion
const MAX_MOVES = 20;

describe('Recursion parent/enfant - rangement des fichiers', () => {
    let vault: Vault;
    let fs: Map<string, string>;           // path -> contenu (seule la cle compte ici)
    let folders: Set<string>;              // dossiers reels (le move de dossier les deplace avec leur contenu)
    let metadata: Map<string, any>;        // path -> frontmatter
    let moveCount: number;

    const relocate = (oldPrefix: string, newPrefix: string): void => {
        for (const key of Array.from(fs.keys())) {
            if (key.startsWith(oldPrefix + '/')) {
                fs.set(newPrefix + key.substring(oldPrefix.length), fs.get(key)!);
                fs.delete(key);
                const m = metadata.get(key);
                if (m) {
                    metadata.delete(key);
                    metadata.set(newPrefix + key.substring(oldPrefix.length), m);
                }
            }
        }
        for (const folder of Array.from(folders)) {
            if (folder.startsWith(oldPrefix + '/')) {
                folders.add(newPrefix + folder.substring(oldPrefix.length));
                folders.delete(folder);
            }
        }
    };

    beforeEach(() => {
        fs = new Map();
        folders = new Set([
            'I - Impulsion/MOD/EOL/EOLI/SOCLE',
            'I - Impulsion/MOD/EOL/EOLI'
        ]);
        metadata = new Map();
        moveCount = 0;

        // Systeme de fichiers virtuel avec l'etat reel observe dans le vault
        fs.set(PARENT_PATH, 'SOCLE');
        fs.set(GRANDPARENT_PATH, 'EOLI');
        fs.set(CHILD_PATH, 'D - X');  // l enfant vient d etre cree a la racine

        metadata.set(PARENT_PATH, {
            Classe: 'Assemblage',
            Parent: `[[${GRANDPARENT_PATH}|EOLI]]`,
            Pieces: [{ Piece: '[[D - I-MOD-EOL-EOLI-SOCLE-D]]', Nombre: 1 }]
        });
        metadata.set(GRANDPARENT_PATH, {
            Classe: 'Assemblage',
            Parent: '[[I - Impulsion/MOD/EOL/EOL.md|EOL]]'
        });
        metadata.set(CHILD_PATH, {
            Classe: 'Piece',
            Parent: `[[${PARENT_PATH}|SOCLE]]`
        });

        const mockApp: any = {
            getSettings: () => ({ classePropertyName: 'Classe', classePropertyAliases: [], templateFolder: 'Outils/Obsidian/Templates' }),
            listFiles: () => Array.from(fs.keys()).filter((p) => p.endsWith('.md')).map((p) => ({
                path: p,
                name: p.split('/').pop()!,
                basename: p.split('/').pop()!.replace('.md', ''),
                extension: 'md'
            })),
            getFile: (p: string) => {
                if (fs.has(p)) {
                    return { path: p, name: p.split('/').pop()!, basename: p.split('/').pop()!.replace('.md', ''), extension: 'md' };
                }
                if (folders.has(p)) {
                    return { path: p, name: p.split('/').pop()!, children: [] };
                }
                return null;
            },
            isFolder: (f: any) => !!f?.path && folders.has(f.path),
            isFile: (f: any) => typeof f?.path === 'string' && fs.has(f.path),
            getMetadata: (f: any) => Promise.resolve(metadata.get(f.path) || {}),
            getAbsolutePath: (p: string) => p,
            getResourceUrl: (p: string) => p,
            setIcon: () => {},
            createFolder: (p: string) => {
                folders.add(p);
                return Promise.resolve({ path: p, name: p.split('/').pop() });
            },
            // Compteur de moves : la sentinelle anti-recursion
            move: (f: any, newPath: string) => {
                moveCount++;
                if (moveCount > MAX_MOVES) {
                    throw new Error(`RECURSION INFINIE : plus de ${MAX_MOVES} moves`);
                }
                const oldPath = f.path ?? f;
                if ('children' in f && folders.has(oldPath)) {
                    // Move de dossier entier : deplace le sous-arbre
                    folders.delete(oldPath);
                    folders.add(newPath);
                    relocate(oldPath, newPath);
                    f.path = newPath;
                    return Promise.resolve();
                }
                if (!fs.has(oldPath)) {
                    throw new Error(`move d un fichier inexistant: ${oldPath}`);
                }
                fs.delete(oldPath);
                const m = metadata.get(oldPath);
                metadata.delete(oldPath);
                fs.set(newPath, 'moved');
                if (m) {
                    metadata.set(newPath, m);
                }
                f.path = newPath;
                f.name = newPath.split('/').pop();
                return Promise.resolve();
            },
            waitForFileMetaDataUpdate: (_p: string, _k: string, cb: () => Promise<void>) => cb()
        };

        vault = new Vault(mockApp, {
            classePropertyName: 'Classe',
            classePropertyAliases: [],
            templateFolder: 'Outils/Obsidian/Templates'
        });
        vault.getDynamicClassFactory = () => null;
        (Vault as any).dynamicClassFactory = null;

        // Classes statiques reproduisant les configs FreecadClasse/Assemblage
        const parentProp = new FileProperty('Parent', vault, ['Assemblage', 'Famille'], {});
        const pieceProp = new FileProperty('Piece', vault, ['Piece', 'Assemblage'], {});
        const piecesProp = new ObjectProperty('Pieces', vault, { Piece: pieceProp }, { display: 'table' });

        class Piece extends Classe {
            static className = 'Piece';
            static parentPropertyName = 'Parent';
            constructor(v: any, f?: File) {
                super(v, f);
                this.properties = [parentProp];
            }
        }
        class Assemblage extends Classe {
            static className = 'Assemblage';
            static parentPropertyName = 'Parent';
            constructor(v: any, f?: File) {
                super(v, f);
                this.properties = [parentProp, piecesProp];
            }
        }

        (Vault as any).classes = { Piece, Assemblage };
    });

    afterEach(() => {
        (Vault as any).classes = {};
    });

    it('ouvrir l enfant puis cliquer le parent ne doit pas bouger les fichiers en boucle', async () => {
        // 1. Ouvrir l enfant : son display resolve ses liens (Pieces du parent, refresh missing...)
        const child = await vault.getFromLink(`[[${CHILD_PATH}]]`);
        expect(child).toBeTruthy();

        // 2. Cliquer sur le lien Parent dans l enfant : resolution du parent
        const parent = await vault.getFromLink(`[[${PARENT_PATH}|SOCLE]]`);
        expect(parent).toBeTruthy();

        // 3. Verifications de placement : aucun dossier imbrique, parent non deplace
        expect(moveCount).toBeLessThanOrEqual(MAX_MOVES);
        expect(fs.has(PARENT_PATH)).toBe(true);  // le parent n a pas bouge
        expect(fs.has(CHILD_PATH)).toBe(false);   // l enfant a ete range
        expect(fs.has('I - Impulsion/MOD/EOL/EOLI/SOCLE/D - I-MOD-EOL-EOLI-SOCLE-D.md')).toBe(true);

        // Aucun dossier dedie pour l enfant (il n a pas de propres enfants)
        const dedicatedFolders = Array.from(fs.keys()).filter(
            (p) => p.includes('/D - I-MOD-EOL-EOLI-SOCLE-D/') && p !== 'I - Impulsion/MOD/EOL/EOLI/SOCLE/D - I-MOD-EOL-EOLI-SOCLE-D.md'
        );
        expect(dedicatedFolders).toEqual([]);
    });

    it('findChildren ne doit jamais retourner un ancetre comme enfant (etat corrompu)', async () => {
        // Etat corrompu reel observe dans le vault : le parent a ete aspire
        // dans le dossier dedie de l enfant (zigzag D - X/SOCLE/...)
        const CORRUPTED_PARENT = 'I - Impulsion/MOD/EOL/EOLI/SOCLE/D - I-MOD-EOL-EOLI-SOCLE-D/SOCLE/SOCLE.md';
        const CORRUPTED_CHILD = 'I - Impulsion/MOD/EOL/EOLI/SOCLE/D - I-MOD-EOL-EOLI-SOCLE-D/D - I-MOD-EOL-EOLI-SOCLE-D.md';

        const parentMetadata = metadata.get(PARENT_PATH);
        const childMetadata = metadata.get(CHILD_PATH);
        fs.delete(PARENT_PATH);
        fs.delete(CHILD_PATH);
        fs.set(CORRUPTED_PARENT, 'SOCLE (aspiré)');
        fs.set(CORRUPTED_CHILD, 'D - X (au fond)');
        metadata.delete(PARENT_PATH);
        metadata.delete(CHILD_PATH);
        metadata.set(CORRUPTED_PARENT, parentMetadata);
        metadata.set(CORRUPTED_CHILD, childMetadata);
        folders.add('I - Impulsion/MOD/EOL/EOLI/SOCLE/D - I-MOD-EOL-EOLI-SOCLE-D');
        folders.add('I - Impulsion/MOD/EOL/EOLI/SOCLE/D - I-MOD-EOL-EOLI-SOCLE-D/SOCLE');

        // Resolution SANS onCreate : on observe la detection pure de findChildren,
        // sans les moves que declencherait la cascade onCreate (qui masquerait le bug)
        const child = await (vault as any).createClasse({
            path: CORRUPTED_CHILD,
            name: 'D - I-MOD-EOL-EOLI-SOCLE-D.md',
            basename: 'D - I-MOD-EOL-EOLI-SOCLE-D',
            extension: 'md'
        }, false);
        expect(child).toBeTruthy();

        // Le parent (ancetre de l enfant) ne doit jamais compter comme enfant :
        // c est la graine du ping-pong mutuel qui creuse le zigzag a chaque clic
        const children = await (child as any).findChildren();
        const childBasenames = children.map((c: any) => c.getName());
        expect(childBasenames).not.toContain("SOCLE");
    });

    it('resoudre un lien a l affichage ne doit rien deplacer (pas de ratelier)', async () => {
        // Scenario : afficher l enfant (resolution de ses liens) plusieurs fois.
        // Si chaque resolution declenche des moves (onCreate en cascade via
        // findChildren -> createClasse), l arborescence se degrade a chaque fois.
        await vault.getFromLink(`[[${CHILD_PATH}]]`);
        const snapshotAfterFirst = Array.from(fs.keys()).sort().join('|');
        const movesAfterFirst = moveCount;

        await vault.getFromLink(`[[${CHILD_PATH}]]`);
        await vault.getFromLink(`[[I - Impulsion/MOD/EOL/EOLI/SOCLE/SOCLE|SOCLE]]`);
        await vault.getFromLink(`[[${CHILD_PATH}]]`);

        // Aucun move supplementaire apres la premiere resolution : l affichage
        // est idempotent, il ne range pas les fichiers
        expect(moveCount).toBe(movesAfterFirst);
        expect(Array.from(fs.keys()).sort().join('|')).toBe(snapshotAfterFirst);
    });
});
