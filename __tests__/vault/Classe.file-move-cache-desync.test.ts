/**
 * @jest-environment jsdom
 *
 * Non-régression du grippage de l'affichage : "au bout d'un moment,
 * impossible de mettre à jour les properties, il faut relancer Obsidian".
 *
 * Scénario complet reconstitué :
 *
 *  1. BUG LIB (Classe.updateParentFolder) : lorsque la mise à jour d'une
 *     propriété déclenche un déplacement du fichier (changement de parent,
 *     réorganisation "un dossier par objet"), le code faisait :
 *
 *         this.file = new File(this.vault, reloadedFile);
 *
 *     au lieu de this.setFile(...). setFile() est LE point unique qui appelle
 *     vault.moveCachedClasse(oldPath, newPath) pour faire suivre l'entrée du
 *     cache vault.files (contrat documenté dans setFile / moveCachedClasse).
 *     En le court-circuitant, le cache gardait l'instance sous l'ANCIEN chemin
 *     alors que l'instance pointait vers le nouveau → split-brain.
 *
 *  2. GEL DE L'ÉDITION (symptôme utilisateur) : un déplacement du fichier qui
 *     se produit HORS de la lib — renommage du dossier par
 *     FileFolderManager.onFileRenamed 500 ms après le renommage de la note,
 *     glisser-déposer dans l'explorateur, synchronisation… — doit être
 *     signalé à la lib via Vault.handleExternalRename (branché par le plugin
 *     sur l'évènement 'rename' d'Obsidian). Sans signalement, l'instance du
 *     panneau référence un chemin mort : chaque édition échoue ("File not
 *     found" avalé par le handler du widget) et seul un redémarrage d'Obsidian
 *     répare l'affichage.
 *
 * Comportement vérifié (ces tests doivent passer) :
 *   - après un déplacement décidé par la lib, l'entrée du cache vault.files
 *     suit le fichier (invariant moveCachedClasse) ;
 *   - après un déplacement externe signalé, l'édition via l'instance affichée
 *     atteint le fichier réel, où qu'il ait été déplacé entre-temps.
 */

import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { FileProperty } from '../../src/properties/FileProperty';
import { TextProperty } from '../../src/properties/TextProperty';
import { File } from '../../src/vault/File';

// ---------------------------------------------------------------------------
// Classe minimale avec parent configuré sur "postes" (comme Personne.yaml
// avec parent.property: postes)
// ---------------------------------------------------------------------------
class Personne extends Classe {
    static parentPropertyName = 'postes';
    async onCreate() {}
    async onUpdate() {}
    async onDelete() {}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeIFile(path: string) {
    const parts = path.split('/');
    const name = parts[parts.length - 1];
    const basename = name.replace(/\.md$/, '');
    const parent = { path: parts.slice(0, -1).join('/') };
    return { path, name, basename, extension: 'md', parent };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('Gel des properties après déplacement de fichier (cache désynchronisé)', () => {
    let vault: jest.Mocked<Vault>;
    let mockApp: any;

    // Métadonnées : simule le magasin Obsidian (frontmatter par chemin)
    let metadataStore: Record<string, any>;
    // Chemins "existants" pour le vault : simule l'état du disque
    let filesOnDisk: Set<string>;

    const instAPath = 'OCC/InstA/InstA.md';
    const instBPath = 'OCC/InstB/InstB.md';
    const personPath = 'OCC/InstA/Pers/Martin.md';

    let iInstA: ReturnType<typeof makeIFile>;
    let iInstB: ReturnType<typeof makeIFile>;
    let iPerson: ReturnType<typeof makeIFile>;

    const buildPerson = (): Personne => {
        const person = new Personne(vault, iPerson as any);

        const institutionProp = new FileProperty('institution', vault, ['Institution'], {});
        const posteProp = new TextProperty('poste', vault, {});
        const postesProp = new ObjectProperty('postes', vault, {
            institution: institutionProp,
            poste: posteProp,
        }, {});

        // Résout le parent selon le wikilink présent dans la valeur
        jest.spyOn(institutionProp, 'getParentFile').mockImplementation(async (link: any) => {
            const s = typeof link === 'string' ? link : JSON.stringify(link ?? '');
            if (s.includes('InstA')) return new File(vault, iInstA as any);
            if (s.includes('InstB')) return new File(vault, iInstB as any);
            return undefined;
        });

        person.addProperty(postesProp);
        return person;
    };

    beforeEach(() => {
        jest.clearAllMocks();

        iInstA = makeIFile(instAPath);
        iInstB = makeIFile(instBPath);
        iPerson = makeIFile(personPath);

        metadataStore = {
            [instAPath]: { classe: 'Institution', nom: 'InstA' },
            [instBPath]: { classe: 'Institution', nom: 'InstB' },
            [personPath]: {
                classe: 'Personne',
                nom: 'Martin',
                postes: [{ institution: `[[${instAPath}|InstA]]`, poste: 'Dev' }],
            },
        };

        filesOnDisk = new Set([instAPath, instBPath, personPath]);

        mockApp = {
            getMetadata: jest.fn((ifile: any) =>
                Promise.resolve(metadataStore[ifile.path] ?? null)),
            updateMetadata: jest.fn((ifile: any, data: any) => {
                // Fidèle au plugin (App.ts) : jette "File not found" si le
                // chemin référencé n'existe plus dans le vault
                if (!filesOnDisk.has(ifile.path)) {
                    throw new Error(`File not found: ${ifile.path}`);
                }
                metadataStore[ifile.path] = data;
                return Promise.resolve();
            }),
            move: jest.fn(async (ifile: any, newPath: string) => {
                // Déplace l'entrée du magasin + du disque simulé
                const data = metadataStore[ifile.path];
                delete metadataStore[ifile.path];
                filesOnDisk.delete(ifile.path);
                metadataStore[newPath] = data;
                filesOnDisk.add(newPath);
                ifile.path = newPath;
            }),
            getFile: jest.fn((path: string) =>
                filesOnDisk.has(path) ? makeIFile(path) : null),
            isFolder: jest.fn().mockReturnValue(false),
            createFolder: jest.fn().mockResolvedValue(undefined),
            listFiles: jest.fn().mockResolvedValue([]),
            getSettings: jest.fn().mockReturnValue({ classePropertyName: 'classe' }),
            setIcon: jest.fn(),
            createDiv: jest.fn((c?: string) => {
                const d = document.createElement('div');
                if (c) d.className = c;
                return d;
            }),
        };

        vault = {
            app: mockApp,
            getFromLink: jest.fn(),
            files: {},
            listFiles: jest.fn().mockResolvedValue([]),
            // Sémantique de Vault.moveCachedClasse : l'entrée du cache suit
            // l'instance lors d'un déplacement de fichier
            moveCachedClasse: (oldPath: string, newPath: string) => {
                const cached = (vault as any).files[oldPath];
                if (cached) {
                    delete (vault as any).files[oldPath];
                    (vault as any).files[newPath] = cached;
                }
            },
            // Champs du read scope du Vault réel, utilisés par
            // handleExternalRename
            listFilesSnapshot: null,
            linkResolutionSnapshot: new Map(),
        } as any;
    });

    it("le cache vault.files doit suivre le fichier déplacé par updateParentFolder (bypass de setFile → split-brain)", async () => {
        const person = buildPerson();

        // Vault.createClasse met l'instance en cache sous son chemin actuel
        vault.files[personPath] = person;

        // L'utilisateur change l'institution : updatePropertyValue →
        // updateMetadata → updateParentFolder déplace le fichier vers le
        // dossier du nouveau parent (InstB)
        const newPostes = [{ institution: `[[${instBPath}|InstB]]`, poste: 'Dev' }];
        await person.updatePropertyValue('postes', newPostes);

        const newPath = 'OCC/InstB/Martin.md';

        // Le déplacement a bien eu lieu et l'instance pointe vers le nouveau chemin
        expect(mockApp.move).toHaveBeenCalled();
        expect(person.getFile()?.getPath()).toBe(newPath);

        // Invariant documenté dans Classe.setFile / Vault.moveCachedClasse :
        // « a stale cache entry would cause the next getFromFile(newPath) to
        //   create a second instance for this same file (split-brain) ».
        // updateParentFolder court-circuite setFile → l'invariant est cassé.
        expect(vault.files[newPath]).toBe(person);
        expect(vault.files[personPath]).toBeUndefined();
    });

    it("une édition après un déplacement externe signalé via handleExternalRename atteint le fichier réel (sans signalement, l'affichage gèle jusqu'au redémarrage)", async () => {
        const person = buildPerson();

        // L'instance est en cache et affichée dans le panneau du plugin
        vault.files[personPath] = person;

        // Déplacement EXTERNE, invisible pour la lib : c'est ce que fait
        // FileFolderManager.onFileRenamed quand il renomme le dossier d'une
        // folder-note 500 ms après que RenameFileAction a renommé la note
        // (Obsidian déplace alors le .md dans le dossier renommé). On reste
        // dans le périmètre du parent (renommage d'un sous-dossier) : la
        // lib n'a pas de raison de re-trier le fichier elle-même.
        const realPath = 'OCC/InstA/Personnes/Martin.md';
        await mockApp.move(makeIFile(personPath), realPath);

        // SANS signalement, l'édition suivante échoue : l'instance référence
        // le chemin fantôme et le plugin jette "File not found" (vérifié en
        // amont de ce fix par le scénario "gel de l'édition"). Le plugin doit
        // donc signaler le déplacement via l'évènement rename d'Obsidian :
        Vault.prototype.handleExternalRename.call(vault, personPath, makeIFile(realPath));

        // Le cache suit l'instance (invariant moveCachedClasse)
        expect(vault.files[realPath]).toBe(person);
        expect(vault.files[personPath]).toBeUndefined();

        // L'utilisateur édite une propriété depuis le panneau affiché :
        // l'édition atteint désormais le fichier réel, où qu'il soit.
        let editError: any = null;
        try {
            await person.updatePropertyValue('nom', 'Dubois');
        } catch (e) {
            editError = e;
        }

        expect(editError).toBeNull();
        expect(metadataStore[realPath]?.nom).toBe('Dubois');
    });
});
