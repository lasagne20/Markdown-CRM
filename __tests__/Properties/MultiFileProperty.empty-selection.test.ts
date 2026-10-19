/**
 * @jest-environment jsdom
 */

/**
 * Test du flux d'ajout dans un MultiFileProperty imbriqué (ex: actions → financeurs → contacts).
 * 
 * Bug corrigé : quand la sélection fuzzy se termine sans fichier résolu (sélection vide,
 * classe non résolue, ou erreur aval attrapée dans ObsidianApp.selectMultipleFile),
 * addProperty restait silencieux ou bloqué sans jamais appeler update.
 * 
 * Correction :
 * - App.ts (obsidian-CRM) : try/catch autour de getFromFile, resolve([]) garanti
 * - MultiFileProperty.addProperty : early-return explicite avec log si sélection vide
 */

import { MultiFileProperty } from '../../src/properties/MultiFileProperty';
import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { Vault } from '../../src/vault/Vault';
import { mockApp } from '../utils/mocks';

describe('MultiFileProperty.addProperty - sélection fuzzy sans résultat', () => {
    let vault: Vault;
    let app: any;

    beforeEach(() => {
        app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);
        (vault as any).getExtendedClasses = jest.fn().mockResolvedValue(['Personne']);
    });

    const buildNestedStructure = () => {
        // Structure : financeurs (ObjectProperty) → contacts (MultiFileProperty)
        const contactsProperty = new MultiFileProperty('contacts', vault, ['Personne']);
        const financeursProperty = new ObjectProperty('financeurs', vault, {
            financeur: contactsProperty.property,
            contacts: contactsProperty
        });
        return { contactsProperty, financeursProperty };
    };

    test('appelle update et ajoute les liens quand des fichiers valides sont sélectionnés', async () => {
        const { contactsProperty } = buildNestedStructure();

        const values = ['[[Contact1]]'];
        const update = jest.fn();
        const container = document.createElement('div');
        document.body.appendChild(container);

        app.selectMultipleFile.mockResolvedValue([
            { getLink: () => '[[Contact2]]' },
            { getLink: () => '[[Contact3]]' }
        ]);

        await contactsProperty.addProperty(values, update, container);

        expect(app.selectMultipleFile).toHaveBeenCalledWith(
            vault,
            ['Personne'],
            expect.objectContaining({ validationFunction: undefined })
        );
        expect(update).toHaveBeenCalledTimes(1);
        expect(update).toHaveBeenCalledWith(['[[Contact1]]', '[[Contact2]]', '[[Contact3]]']);
    });

    test('ne bloque pas et n\'appelle pas update quand la sélection résout une liste vide', async () => {
        // Cas du bug : getFromFile ne résout pas la classe → ObsidianApp résout []
        const { contactsProperty } = buildNestedStructure();

        const values = ['[[Contact1]]'];
        const update = jest.fn();
        const container = document.createElement('div');
        document.body.appendChild(container);

        app.selectMultipleFile.mockResolvedValue([]);

        // Ne doit ni throw ni rester en attente
        await expect(contactsProperty.addProperty(values, update, container)).resolves.toBeUndefined();

        expect(update).not.toHaveBeenCalled();
        expect(values).toEqual(['[[Contact1]]']); // valeurs inchangées
    });

    test('ne bloque pas quand selectMultipleFile rejette (erreur aval non gérée côté adapter)', async () => {
        // Sécurité supplémentaire : si l'adapter ne résout jamais, addProperty doit lever
        // l'erreur au lieu de rester bloqué silencieusement.
        const { contactsProperty } = buildNestedStructure();

        const values = ['[[Contact1]]'];
        const update = jest.fn();
        const container = document.createElement('div');
        document.body.appendChild(container);

        app.selectMultipleFile.mockRejectedValue(new Error('Modal error'));

        await expect(contactsProperty.addProperty(values, update, container)).rejects.toThrow('Modal error');
        expect(update).not.toHaveBeenCalled();
    });

    test('le conteneur imbriqué dans ObjectProperty recharge après ajout', async () => {
        // Structure complète : financeurs → contacts, comme dans Action.yaml
        const { financeursProperty } = buildNestedStructure();

        const values = [
            { financeur: '[[Institution1]]', contacts: ['[[Contact1]]'] }
        ];
        const update = jest.fn();
        const container = document.createElement('div');
        document.body.appendChild(container);

        const display = financeursProperty.fillDisplay(values, update);
        container.appendChild(display);

        // Le conteneur de contacts imbriqué doit exister dans le DOM
        const contactsContainer = document.querySelector('.metadata-multiFiles-container-contacts') as HTMLDivElement;
        expect(contactsContainer).not.toBeNull();

        app.selectMultipleFile.mockResolvedValue([
            { getLink: () => '[[Contact2]]' }
        ]);

        await financeursProperty.properties['contacts'].addProperty(
            values[0].contacts, update, contactsContainer
        );

        expect(update).toHaveBeenCalled();
        // Le conteneur doit avoir été rechargé avec 2 lignes
        const rows = contactsContainer.querySelectorAll('.metadata-multiFiles-row-inline');
        expect(rows.length).toBe(2);
    });
});
