/**
 * @jest-environment jsdom
 *
 * Boucle infinie : updateObject -> update (écriture même sans changement)
 * -> reloadObjects -> re-rendu -> un widget re-déclenche updateObject avec la
 * MÊME valeur -> écriture -> ... (cycle CPU + écritures disques sans fin).
 *
 * Fix attendu, deux niveaux :
 * 1. updateObject : quand la valeur recalculée est identique à la valeur
 *    actuelle, on n'appelle NI update NI reloadObjects - il n'y a rien à
 *    faire, et c'est ce qui casse le cycle re-rendu -> update.
 * 2. updatePropertyValue : quand la valeur est inchangée, pas d'écriture
 *    (defense in depth pour les autres chemins).
 */

import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { DateProperty } from '../../src/properties/DateProperty';
import { Classe } from '../../src/vault/Classe';
import { Vault } from '../../src/vault/Vault';
import { mockApp } from '../utils/mocks';

describe('Anti-boucle : updates sans changement', () => {
    let vault: Vault;
    let classe: Classe;
    let animationsProperty: ObjectProperty;
    let dateProperty: DateProperty;
    let metadataStore: Record<string, any>;
    const filePath = 'Test Action.md';

    beforeEach(() => {
        metadataStore = {
            [filePath]: {
                classe: 'Action',
                animations: [{ date: '2026-11-15', etat: 'Confirmée' }]
            }
        };

        const app = {
            ...mockApp(),
            getMetadata: jest.fn((ifile: any) => Promise.resolve(metadataStore[ifile.path] ?? {})),
            updateMetadata: jest.fn((ifile: any, data: any) => {
                metadataStore[ifile.path] = data;
                return Promise.resolve();
            })
        } as any;

        vault = new Vault(app, { vaultPath: './test-vault', configPath: './config' } as any);
        const iFile = {
            path: filePath,
            name: 'Test Action.md',
            basename: 'Test Action',
            extension: 'md',
            parent: { path: '' }
        } as any;

        classe = new Classe(vault, iFile);
        (classe as any).name = 'Action';

        dateProperty = new DateProperty('date', vault, []);
        animationsProperty = new ObjectProperty('animations', vault, { date: dateProperty });
        classe.addProperty(animationsProperty);
    });

    test("PLANTE : updateObject avec une valeur identique n'écrit pas et ne recharge pas", async () => {
        const values = await animationsProperty.read(classe);
        const update = jest.fn().mockImplementation(async (v: any) => classe.updatePropertyValue('animations', v));
        const reloadSpy = jest.spyOn(animationsProperty, 'reloadObjects').mockImplementation();

        // Un widget re-déclenche updateObject avec la valeur DÉJÀ en place
        // (le re-rendu réécrit "2026-11-15" par-dessus "2026-11-15")
        await animationsProperty.updateObject(
            values,
            update,
            0,
            dateProperty,
            '2026-11-15',
            document.createElement('div')
        );

        // Rien à faire : ni écriture ni re-rendu -> la boucle est cassée
        expect(update).not.toHaveBeenCalled();
        expect(reloadSpy).not.toHaveBeenCalled();
    });

    test("updateObject avec une valeur différente fonctionne normalement", async () => {
        const values = await animationsProperty.read(classe);
        const update = jest.fn().mockImplementation(async (v: any) => classe.updatePropertyValue('animations', v));

        await animationsProperty.updateObject(
            values,
            update,
            0,
            dateProperty,
            '2026-11-20',
            document.createElement('div')
        );

        expect(update).toHaveBeenCalled();
        expect(metadataStore[filePath].animations[0].date).toBe('2026-11-20');
    });

    test("PLANTE : updatePropertyValue avec une valeur identique n'écrit pas", async () => {
        const writeSpy = jest.spyOn(classe, 'updateMetadata');
        const notified: string[] = [];
        classe.onPropertyChanged = async (p) => { notified.push(p); };

        // Même valeur que celle déjà en métadonnées
        await classe.updatePropertyValue('animations', [{ date: '2026-11-15', etat: 'Confirmée' }]);

        // Pas d'écriture, pas de notification : rien n'a changé
        expect(writeSpy).not.toHaveBeenCalled();
        expect(notified).toEqual([]);
    });
});
