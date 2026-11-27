/**
 * @jest-environment jsdom
 *
 * Bug 5 (Tier 1) : MultiFileProperty.addProperty et
 * MultiMediaProperty.addProperty poussaient directement dans le tableau
 * `values` passé par l'appelant — qui peut être le tableau VIVANT du cache
 * de métadonnées (le reste du fichier se protège explicitement par des
 * copies profondes pour ne pas rendre la détection de changement aveugle).
 *
 * Contrat attendu : le tableau passé n'est PAS muté ; update() reçoit une
 * copie profonde augmentée des nouveaux liens.
 */

import { MultiFileProperty } from '../../src/properties/MultiFileProperty';
import { MultiMediaProperty } from '../../src/properties/MultiMediaProperty';

describe('addProperty ne doit pas muter le tableau vivant des valeurs', () => {
    const makeVault = (selectResult: any) => ({
        app: {
            selectMultipleFile: jest.fn().mockResolvedValue(selectResult),
            sendNotice: jest.fn(),
            getSettings: jest.fn().mockReturnValue({}),
            setIcon: jest.fn(),
        },
        getExtendedClasses: jest.fn().mockResolvedValue(['Personne']),
        moveCachedClasse: jest.fn(),
    } as any);

    it('MultiFileProperty : copie profonde, tableau vivant intact', async () => {
        const vault = makeVault([
            { getLink: () => '[[Personnes/Anne|Anne]]' },
            { getLink: () => '[[Personnes/Bob|Bob]]' },
        ]);
        const prop = new MultiFileProperty('contacts', vault, ['Personne'], {});
        jest.spyOn(prop, 'reloadObjects').mockResolvedValue(undefined);

        const liveValues = ['[[Personnes/Zoe|Zoe]]'];
        const update = jest.fn().mockResolvedValue(undefined);
        const container = document.createElement('div');

        await prop.addProperty(liveValues as any, update, container);

        // Le tableau vivant n'a pas été muté
        expect(liveValues).toEqual(['[[Personnes/Zoe|Zoe]]']);
        // update a reçu une copie complète
        expect(update).toHaveBeenCalledWith([
            '[[Personnes/Zoe|Zoe]]',
            '[[Personnes/Anne|Anne]]',
            '[[Personnes/Bob|Bob]]',
        ]);
    });

    it('MultiMediaProperty : copie profonde, tableau vivant intact', async () => {
        (globalThis as any).selectMedia = jest.fn().mockResolvedValue({
            path: 'Medias/facture.pdf',
            name: 'facture.pdf',
        });
        const vault = makeVault([]);
        const prop = new MultiMediaProperty('factures', vault, ['Media'], {});
        jest.spyOn(prop, 'reloadObjects').mockResolvedValue(undefined);

        const liveValues = ['[[Medias/ancien.jpg|ancien.jpg]]'];
        const update = jest.fn().mockResolvedValue(undefined);
        const container = document.createElement('div');

        await prop.addProperty(liveValues as any, update, container);

        expect(liveValues).toEqual(['[[Medias/ancien.jpg|ancien.jpg]]']);
        expect(update).toHaveBeenCalledWith([
            '[[Medias/ancien.jpg|ancien.jpg]]',
            '[[Medias/facture.pdf|facture.pdf]]',
        ]);
    });
});
