/**
 * @jest-environment jsdom
 *
 * Bug 4 (Tier 1) : ObjectProperty.addProperty enveloppait handleIconClick
 * dans `await new Promise(resolve => ...)` qui ne se résolvait QUE si un
 * fichier était sélectionné. Une annulation du sélecteur laissait donc la
 * promesse pendante à vie : le bouton "+" restait bloqué et aucune ligne
 * n'était ajoutée jusqu'au re-rendu.
 *
 * Contrat attendu : une annulation termine addProperty proprement — pas
 * d'ajout de ligne, pas d'update, le tableau vivant n'est pas modifié.
 */

import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { FileProperty } from '../../src/properties/FileProperty';
import { TextProperty } from '../../src/properties/TextProperty';

describe('ObjectProperty.addProperty - annulation du sélecteur', () => {
    const makeVault = (selectFileResult: any) => ({
        app: {
            selectFile: jest.fn().mockResolvedValue(selectFileResult),
            sendNotice: jest.fn(),
            getSettings: jest.fn().mockReturnValue({}),
            setIcon: jest.fn(),
            getUrl: jest.fn().mockImplementation((p: string) => `obsidian://open/${p}`),
        },
        getExtendedClasses: jest.fn().mockResolvedValue(['Institution']),
        readLinkFile: jest.fn().mockImplementation((link: string) => link),
        getFromLink: jest.fn().mockResolvedValue(null),
        moveCachedClasse: jest.fn(),
    } as any);

    it('annulation (selectFile → null) : addProperty se termine, rien n\'est ajouté', async () => {
        const vault = makeVault(null);
        const clientProp = new FileProperty('client', vault, ['Institution'], {});
        const noteProp = new TextProperty('note', vault, {});
        const obj = new ObjectProperty('clients', vault, { client: clientProp, note: noteProp }, {});

        const container = document.createElement('div');
        const liveValues: any[] = [];
        const update = jest.fn().mockResolvedValue(undefined);

        // Avant le fix : cet await ne revient jamais (promesse pendante) et
        // le test échoue par timeout. Après : retour immédiat.
        await obj.addProperty(liveValues, update, container);

        expect(update).not.toHaveBeenCalled();
        expect(liveValues).toEqual([]);
        expect(vault.app.selectFile).toHaveBeenCalled();
    });

    it('sélection effective : la ligne est ajoutée avec le lien du fichier', async () => {
        const selected = {
            getLink: () => '[[Institutions/Demo/Demo|Demo]]',
        };
        const vault = makeVault(selected);
        const clientProp = new FileProperty('client', vault, ['Institution'], {});
        const noteProp = new TextProperty('note', vault, {});
        const obj = new ObjectProperty('clients', vault, { client: clientProp, note: noteProp }, {});

        const container = document.createElement('div');
        const liveValues: any[] = [];
        const update = jest.fn().mockResolvedValue(undefined);

        await obj.addProperty(liveValues, update, container);

        expect(update).toHaveBeenCalledTimes(1);
        const saved = update.mock.calls[0][0];
        expect(saved).toHaveLength(1);
        expect(saved[0].client).toBe('[[Institutions/Demo/Demo|Demo]]');
        expect(liveValues).toEqual([]); // le tableau vivant n'est pas muté
    });
});
