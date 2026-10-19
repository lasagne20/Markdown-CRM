/**
 * @jest-environment jsdom
 *
 * Test reproduisant le bug de rangement de Maxilien Dely :
 * Une Personne avec parents multiples ['postes', 'lieu'] (folder "Pers").
 * - postes : ObjectProperty { institution (FileProperty), poste (Text) }
 * - lieu : FileProperty (lieu de résidence)
 *
 * Scénario observé : le fichier a été rangé dans France/MECENAT/Pers/
 * (selon le parent lieu = MECENAT) alors que postes.institution pointe
 * vers CIEMCEO Maintenance. L'ajout du poste n'a jamais re-rangé le fichier
 * vers le dossier de l'institution : France/MECENAT/Instits/CIEMCEO Maintenance/Pers/
 */

import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { FileProperty } from '../../src/properties/FileProperty';
import { TextProperty } from '../../src/properties/TextProperty';
import { File } from '../../src/vault/File';

class Personne extends Classe {
    static override parentPropertyNames = ['postes', 'lieu'];
    static override parentFolderName = 'Pers';
    async override onCreate() {}
    async override onUpdate() {}
    async override onDelete() {}
}

function makeIFile(path: string) {
    const parts = path.split('/');
    const name = parts[parts.length - 1];
    const basename = name.replace(/\.md$/, '');
    return { path, name, basename, extension: 'md', parent: { path: parts.slice(0, -1).join('/') } };
}

describe('Classe - Rangement avec parents multiples postes/lieu (bug Maxilien Dely)', () => {
    let vault: any;
    let mockApp: any;
    let metadataStore: Record<string, any>;

    const mecenantPath = 'France/MECENAT/MECENAT.md';
    const ciemceoPath = 'France/MECENAT/Instits/CIEMCEO Maintenance/CIEMCEO Maintenance.md';
    // Le fichier est resté là (rangé selon le lieu) alors qu'il devrait être
    // dans France/MECENAT/Instits/CIEMCEO Maintenance/Pers/
    const personPath = 'France/MECENAT/Pers/Maxilien Dely.md';

    let iMecenat: ReturnType<typeof makeIFile>;
    let iCiemceo: ReturnType<typeof makeIFile>;
    let iPerson: ReturnType<typeof makeIFile>;

    beforeEach(() => {
        jest.clearAllMocks();
        iMecenat = makeIFile(mecenantPath);
        iCiemceo = makeIFile(ciemceoPath);
        iPerson = makeIFile(personPath);

        // Etat initial : la personne a un lieu (MECENAT) mais pas encore de poste
        metadataStore = {
            [personPath]: {
                classe: 'Personne',
                lieu: `[[MECENAT]]`,
                postes: [],
            },
        };

        mockApp = {
            getMetadata: jest.fn((ifile: any) =>
                Promise.resolve(metadataStore[ifile.path] ?? null)
            ),
            updateMetadata: jest.fn((ifile: any, data: any) => {
                metadataStore[ifile.path] = data;
                return Promise.resolve();
            }),
            getFile: jest.fn().mockResolvedValue(null),
            move: jest.fn((ifile: any, newPath: string) => {
                // Simule le deplacement : deplace les metadonnees et met a jour le path
                const oldPath = ifile.path;
                const fileName = oldPath.split('/').pop();
                const destPath = newPath.endsWith('.md') ? newPath : `${newPath}/${fileName}`;
                if (metadataStore[oldPath] !== undefined) {
                    metadataStore[destPath] = metadataStore[oldPath];
                    delete metadataStore[oldPath];
                }
                ifile.path = destPath;
                return Promise.resolve();
            }),
            createFolder: jest.fn().mockResolvedValue(undefined),
            listFiles: jest.fn().mockResolvedValue([]),
            isFolder: jest.fn().mockReturnValue(false),
            getSettings: jest.fn().mockReturnValue({ classePropertyName: 'classe' }),
            setIcon: jest.fn(),
            createDiv: jest.fn(() => document.createElement('div')),
        };

        vault = {
            app: mockApp,
            getFromLink: jest.fn().mockImplementation(async (link: string) => {
                if (typeof link === 'string' && link.includes('CIEMCEO')) {
                    return { getFile: () => new File(vault, iCiemceo as any) };
                }
                if (typeof link === 'string' && link.includes('MECENAT')) {
                    return { getFile: () => new File(vault, iMecenat as any) };
                }
                return undefined;
            }),
            listFiles: jest.fn().mockResolvedValue([]),
            getProcessManager: jest.fn().mockReturnValue({ runProcesses: jest.fn() }),
            createClasse: jest.fn(),
        } as any;
    });

    const buildPersonne = () => {
        const person = new Personne(vault, iPerson as any);

        const institutionProp = new FileProperty('institution', vault, ['Institution', 'Lieu'], {});
        const posteProp = new TextProperty('poste', vault, {});
        const postesProp = new ObjectProperty('postes', vault, {
            institution: institutionProp,
            poste: posteProp,
        }, {});
        const lieuProp = new FileProperty('lieu', vault, ['Lieu'], {});

        person.addProperty(postesProp);
        person.addProperty(lieuProp);
        return person;
    };

    test('getParentProperty doit privilégier postes sur lieu quand les deux sont remplis', async () => {
        const person = buildPersonne();

        // Les deux parents remplis : postes -> CIEMCEO, lieu -> MECENAT
        metadataStore[personPath] = {
            classe: 'Personne',
            lieu: `[[MECENAT]]`,
            postes: [{ institution: `[[CIEMCEO Maintenance]]`, poste: 'Directeur' }],
        };

        const parentProp = await (person as any).getParentProperty();
        expect(parentProp).toBeDefined();
        // postes est EN PREMIER dans parentPropertyNames : il doit gagner
        expect(parentProp?.name).toBe('postes');
    });

    test('PLANTE (bug) : ajouter un poste doit re-ranger le fichier vers le dossier de l\'institution', async () => {
        const person = buildPersonne();

        // Etat initial : personne rangee selon lieu (MECENAT), postes vide
        // Le fichier est dans France/MECENAT/Pers/

        // L'utilisateur ajoute un poste avec l'institution CIEMCEO (via l'UI)
        await person.updatePropertyValue('postes', [
            { institution: `[[CIEMCEO Maintenance]]`, poste: 'Directeur' },
        ]);

        // Le parent doit maintenant etre postes -> CIEMCEO
        const parentProp = await (person as any).getParentProperty();
        expect(parentProp?.name).toBe('postes');

        // Le fichier doit avoir ete deplace vers le dossier Pers de l'institution
        expect(mockApp.move).toHaveBeenCalled();
        const moveCalls = mockApp.move.mock.calls as any[];
        const targetPaths = moveCalls.map(c => c[1] as string);
        // Au moins un move vers CIEMCEO Maintenance/Pers
        const goodMove = targetPaths.some(p =>
            p.includes('CIEMCEO Maintenance') && p.includes('Pers')
        );
        expect(goodMove).toBe(true);
    });

    test('updateParentFolder direct range bien selon postes quand les deux parents existent', async () => {
        const person = buildPersonne();

        // Les deux remplis des le depart (le fichier est mal range dans MECENAT/Pers)
        metadataStore[personPath] = {
            classe: 'Personne',
            lieu: `[[MECENAT]]`,
            postes: [{ institution: `[[CIEMCEO Maintenance]]`, poste: 'Directeur' }],
        };

        // onUpdate appelle updateParentFolder() sans arguments
        await (person as any).updateParentFolder();

        expect(mockApp.move).toHaveBeenCalled();
        const moveCalls = mockApp.move.mock.calls as any[];
        const targetPaths = moveCalls.map(c => c[1] as string);
        const goodMove = targetPaths.some(p =>
            p.includes('CIEMCEO Maintenance') && p.includes('Pers')
        );
        expect(goodMove).toBe(true);
    });

    test('PLANTE (bug) : le menu "Rafraichir l\'objet" (classe.update()) doit ranger le fichier selon le parent', async () => {
        const person = buildPersonne();

        // Fichier mal range : postes (CIEMCEO) rempli mais fichier dans MECENAT/Pers
        // (importe/deplace manuellement, jamais passe par l'UI)
        metadataStore[personPath] = {
            classe: 'Personne',
            lieu: `[[MECENAT]]`,
            postes: [{ institution: `[[CIEMCEO Maintenance]]`, poste: 'Directeur' }],
        };

        // Ce que fait le menu contextuel "Rafraichir l'objet" (main.ts du plugin)
        await person.update();

        // Le fichier doit avoir ete deplace vers CIEMCEO Maintenance/Pers
        expect(mockApp.move).toHaveBeenCalled();
        const moveCalls = mockApp.move.mock.calls as any[];
        const targetPaths = moveCalls.map(c => c[1] as string);
        const goodMove = targetPaths.some(p =>
            p.includes('CIEMCEO Maintenance') && p.includes('Pers')
        );
        expect(goodMove).toBe(true);
    });
});
