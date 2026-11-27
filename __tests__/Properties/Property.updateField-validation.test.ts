/**
 * @jest-environment jsdom
 *
 * Bug 1 (Tier 1) : updateField contournait validate() —
 * `toSave = validated !== '' ? validated : input.value` sauvegardait la
 * valeur BRUTE non validée dès que validate() renvoyait '' (cas invalide).
 * Une saisie invalide (email cassé, URL impossible, nombre non numérique)
 * devait donc être rejetée, pas persistée telle quelle.
 *
 * Contrat attendu :
 *   - saisie non vide dont la validation échoue → RIEN n'est sauvegardé,
 *     le champ revient à l'affichage de la valeur précédente ;
 *   - saisie valide → sauvegardée (valeur validée) ;
 *   - champ vidé → update('') (vider un champ reste légitime).
 */

import { EmailProperty } from '../../src/properties/EmailProperty';
import { LinkProperty } from '../../src/properties/LinkProperty';
import { NumberProperty } from '../../src/properties/NumberProperty';

const makeVault = () => ({
    app: {
        sendNotice: jest.fn(),
        getSettings: jest.fn().mockReturnValue({}),
        setIcon: jest.fn(),
    },
} as any);

const makeField = (value: string) => {
    const input = document.createElement('input');
    input.value = value;
    const link = document.createElement('div');
    link.classList.add('field-link');
    link.textContent = 'ancienne.valeur@exemple.fr';
    link.style.display = 'none';
    input.style.display = 'block';
    return { input, link };
};

describe('updateField ne doit pas persister une saisie invalide', () => {
    it('Email invalide : update() n\'est pas appelé et le champ revient à l\'affichage', async () => {
        const prop = new EmailProperty('email', makeVault(), {});
        const { input, link } = makeField('pas-un-email');
        const update = jest.fn().mockResolvedValue(undefined);

        await prop.updateField(update, input, link as any);

        expect(update).not.toHaveBeenCalled();
        expect(link.style.display).toBe('block');
        expect(input.style.display).toBe('none');
    });

    it('Email valide : update() reçoit la valeur validée', async () => {
        const prop = new EmailProperty('email', makeVault(), {});
        const { input, link } = makeField('contact@example.fr');
        const update = jest.fn().mockResolvedValue(undefined);

        await prop.updateField(update, input, link as any);

        expect(update).toHaveBeenCalledWith('contact@example.fr');
        expect(link.style.display).toBe('block');
    });

    it('Link invalide ("abc") : rejeté, rien n\'est sauvegardé', async () => {
        const prop = new LinkProperty('lien', makeVault(), {});
        const { input, link } = makeField('abc');
        const update = jest.fn().mockResolvedValue(undefined);

        await prop.updateField(update, input, link as any);

        expect(update).not.toHaveBeenCalled();
    });

    it('Number invalide ("abc") : rejeté, rien n\'est sauvegardé', async () => {
        const prop = new NumberProperty('tarif', makeVault(), '€');
        const { input, link } = makeField('abc');
        const update = jest.fn().mockResolvedValue(undefined);

        await prop.updateField(update, input, link as any);

        expect(update).not.toHaveBeenCalled();
        expect(link.style.display).toBe('block');
    });

    it('Number valide ("12,5" accepté tel quel ou "12" validé) : sauvegardé', async () => {
        const prop = new NumberProperty('tarif', makeVault(), '€');
        const { input, link } = makeField('12');
        const update = jest.fn().mockResolvedValue(undefined);

        await prop.updateField(update, input, link as any);

        expect(update).toHaveBeenCalledWith('12');
        expect(link.textContent).toContain('12');
    });

    it('Champ vidé : update(\'\') est appelé (vider reste légitime)', async () => {
        const prop = new EmailProperty('email', makeVault(), {});
        const { input, link } = makeField('');
        const update = jest.fn().mockResolvedValue(undefined);

        await prop.updateField(update, input, link as any);

        expect(update).toHaveBeenCalledWith('');
    });
});
