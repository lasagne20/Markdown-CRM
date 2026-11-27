/**
 * @jest-environment jsdom
 *
 * Bug 2 (Tier 1) : SelectProperty.createSelectWidget appelait
 * update(options[0].name) PENDANT le rendu d'un champ vide — écriture
 * silencieuse dans le frontmatter à chaque affichage d'un fichier dont le
 * select est vide.
 *
 * Contrat attendu : le rendu ne persiste RIEN. L'affichage garde la couleur
 * de la première option (comportement visuel inchangé), mais la valeur
 * n'est écrite que si l'utilisateur choisit réellement une option.
 */

import { SelectProperty } from '../../src/properties/SelectProperty';

const makeVault = () => ({
    app: {
        sendNotice: jest.fn(),
        getSettings: jest.fn().mockReturnValue({}),
        setIcon: jest.fn(),
    },
} as any);

describe('SelectProperty : le rendu d\'un champ vide ne doit pas écrire dans les métadonnées', () => {
    const options = [
        { name: 'Piste', color: 'gray' },
        { name: 'Réflexion', color: 'blue' },
    ];

    it('createSelectWidget avec valeur vide : update() n\'est PAS appelé au rendu', () => {
        const prop = new SelectProperty('etat', makeVault(), options as any);
        const update = jest.fn().mockResolvedValue(undefined);

        const el = prop.createSelectWidget('', update);

        expect(update).not.toHaveBeenCalled();
        // L'affichage reste riche : couleur de la première option conservée
        expect(el.style.backgroundColor).toBeTruthy();
        expect(el.options.length).toBe(2);
    });

    it('createSelectWidget avec null : update() n\'est PAS appelé au rendu', () => {
        const prop = new SelectProperty('etat', makeVault(), options as any);
        const update = jest.fn().mockResolvedValue(undefined);

        prop.createSelectWidget(null as any, update);

        expect(update).not.toHaveBeenCalled();
    });

    it('Le choix explicite de l\'utilisateur persiste toujours (onchange)', () => {
        const prop = new SelectProperty('etat', makeVault(), options as any);
        const update = jest.fn().mockResolvedValue(undefined);

        const el = prop.createSelectWidget('', update);
        el.value = 'Réflexion';
        el.dispatchEvent(new Event('change'));

        expect(update).toHaveBeenCalledWith('Réflexion');
    });
});
