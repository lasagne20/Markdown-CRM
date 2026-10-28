/**
 * @jest-environment jsdom
 *
 * Boucle infinie par ping-pong des "vides" (reproduit le cas
 * 2024-11-18 - Lycée de vizille.md).
 *
 * Mécanisme : deux chaînes d'update se chevauchent, l'une ré-écrit
 * `date: undefined` (clé absente après JSON.stringify), l'autre
 * `date: ""`. Les deux formes sont sémantiquement identiques mais
 * DIFFERENT en JSON : les gardes no-op (updateObject et
 * updatePropertyValue) les laissent passer à chaque tour, et chaque
 * écriture déclenche le re-rendu qui relance l'autre chaîne. Boucle
 * sans fin d'écritures identiques visuellement.
 *
 * Fix attendu : comparaison canonique où absent ≡ null ≡ "" (les clés
 * vides sont neutralisées). Un ping-pong undefined/"" devient un no-op
 * et casse la boucle ; un vrai changement de valeur reste détecté.
 */

import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { DateProperty } from '../../src/properties/DateProperty';
import { Classe } from '../../src/vault/Classe';
import { Vault } from '../../src/vault/Vault';
import { mockApp } from '../utils/mocks';

describe('Anti-boucle : ping-pong des vides (undefined / "" / absent)', () => {
    let vault: Vault;
    let classe: Classe;
    let animationsProperty: ObjectProperty;
    let dateProperty: DateProperty;
    let metadataStore: Record<string, any>;
    const filePath = 'Test Action.md';

    beforeEach(() => {
        // Animations SANS champ date (état du fichier en bug)
        metadataStore = {
            [filePath]: {
                classe: 'Action',
                animations: [
                    { animation: 'Atelier Energie', temps: 'Matin' },
                    { animation: 'Atelier Energie', etat: 'Disponibilité demandée', temps: 'Matin' }
                ]
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

    test("PLANTE : updateObject avec '' là où la clé est absente -> no-op (pas d'update)", async () => {
        const values = await animationsProperty.read(classe);
        const update = jest.fn().mockImplementation(async (v: any) => classe.updatePropertyValue('animations', v));

        // Le widget date ré-envoie '' sur une animation qui n'a PAS de clé date
        await animationsProperty.updateObject(
            values,
            update,
            0,
            dateProperty,
            '',
            document.createElement('div')
        );

        // Sémantiquement identique (vide <-> absent) : rien à faire
        expect(update).not.toHaveBeenCalled();
    });

    test("PLANTE : updateObject avec undefined là où la clé vaut '' -> no-op", async () => {
        // Le cache a date: "" (écrit par l'autre chaîne), le widget renvoie undefined
        metadataStore[filePath].animations = [{ date: '', animation: 'Atelier Energie' }];

        const values = await animationsProperty.read(classe);
        const update = jest.fn().mockImplementation(async (v: any) => classe.updatePropertyValue('animations', v));

        await animationsProperty.updateObject(
            values,
            update,
            0,
            dateProperty,
            undefined as any,
            document.createElement('div')
        );

        expect(update).not.toHaveBeenCalled();
    });

    test("PLANTE : updatePropertyValue avec {date: undefined} contre cache {date: ''} -> pas d'écriture", async () => {
        metadataStore[filePath].animations = [{ date: '', animation: 'Atelier Energie' }];
        const writeSpy = jest.spyOn(classe, 'updateMetadata');

        // L'autre chaîne renvoie la forme "sans clé" du même vide
        await classe.updatePropertyValue('animations', [{ animation: 'Atelier Energie' }]);

        // Les deux formes du vide sont équivalentes : pas d'écriture, la boucle est cassée
        expect(writeSpy).not.toHaveBeenCalled();
    });

    test("PLANTE : updatePropertyValue avec {date: ''} contre cache {date: null} -> pas d'écriture", async () => {
        metadataStore[filePath].animations = [{ date: null, animation: 'Atelier Energie' }];
        const writeSpy = jest.spyOn(classe, 'updateMetadata');

        await classe.updatePropertyValue('animations', [{ date: '', animation: 'Atelier Energie' }]);

        expect(writeSpy).not.toHaveBeenCalled();
    });

    test("un vrai changement reste détecté (date réelle)", async () => {
        const values = await animationsProperty.read(classe);
        const update = jest.fn().mockImplementation(async (v: any) => classe.updatePropertyValue('animations', v));

        await animationsProperty.updateObject(
            values,
            update,
            0,
            dateProperty,
            '2026-01-15',
            document.createElement('div')
        );

        expect(update).toHaveBeenCalled();
        expect(metadataStore[filePath].animations[0].date).toBe('2026-01-15');
    });

    test("vider une date existante reste un vrai changement", async () => {
        metadataStore[filePath].animations = [{ date: '2026-01-15', animation: 'Atelier Energie' }];
        const writeSpy = jest.spyOn(classe, 'updateMetadata');

        await classe.updatePropertyValue('animations', [{ animation: 'Atelier Energie' }]);

        expect(writeSpy).toHaveBeenCalled();
    });
});
