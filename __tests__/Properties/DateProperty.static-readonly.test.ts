/**
 * @jest-environment jsdom
 *
 * Mode lecture seule (static) des DateProperty / RangeDateProperty :
 * le clic sur la valeur ne doit PAS ouvrir l'édition, et le quick-select
 * ne doit pas apparaître.
 *
 * Bug : DateProperty.createFieldLink et RangeDateProperty.createFieldLink
 * câblent onclick -> modifyField SANS vérifier static, et
 * DateProperty.createFieldContainerContent crée le quick-select quel que
 * soit le mode. Pour une RangeDateProperty dérivée (derivedFrom:
 * "animations.date"), getDisplay met static = true SEULEMENT pendant le
 * rendu (restauré dans finally) : un garde au moment du clic serait donc
 * contourné. L'état doit être capturé AU RENDU.
 *
 * Fix attendu :
 * - le lien capture isStatic au rendu et ignore le clic si statique
 * - pas de quick-select en mode statique
 * - le comportement éditable reste intact quand la propriété n'est pas
 *   statique / pas dérivée
 */

import { RangeDateProperty } from '../../src/properties/RangeDateProperty';
import { DateProperty } from '../../src/properties/DateProperty';
import { Vault } from '../../src/vault/Vault';
import { mockApp } from '../utils/mocks';

jest.mock('flatpickr', () => {
    const mockInstance = { destroy: jest.fn(), setDate: jest.fn(), clear: jest.fn() };
    const mockFlatpickr = jest.fn((element, options) => {
        (element as any).flatpickrOptions = options;
        return mockInstance;
    });
    return mockFlatpickr;
});

jest.mock('flatpickr/dist/l10n/fr.js', () => ({
    French: { locale: 'fr' }
}));

describe('DateProperty / RangeDateProperty - mode lecture seule (static)', () => {
    let vault: Vault;
    let mockClasse: any;

    beforeEach(() => {
        vault = new Vault(mockApp(), { vaultPath: './test-vault' } as any);
        mockClasse = {
            getPropertyValue: jest.fn().mockResolvedValue('2026-03-26'),
            updatePropertyValue: jest.fn().mockResolvedValue(undefined)
        };
    });

    const clickLink = (display: HTMLElement) => {
        const link = display.querySelector('.field-link') as HTMLElement;
        expect(link).toBeTruthy();
        link.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        return link;
    };

    describe('RangeDateProperty dérivée (derivedFrom résolu)', () => {
        let property: RangeDateProperty;

        beforeEach(() => {
            property = new RangeDateProperty('date', vault, { derivedFrom: 'animations.date' });
            // Isole le rendu : la plage dérivée est résolue
            jest.spyOn(property as any, 'resolveDerivedRange').mockResolvedValue('2026-03-26 to 2026-03-28');
        });

        test('PLANTE : cliquer la date dérivée n\'ouvre pas le mode édition', async () => {
            const display = await property.getDisplay(mockClasse, {}) as HTMLElement;

            const input = display.querySelector('.field-input') as HTMLInputElement;
            expect(input.style.display).toBe('none');

            clickLink(display);

            // Le mode édition ne doit PAS s'ouvrir : l'input reste caché
            expect(input.style.display).toBe('none');
        });

        test('PLANTE : pas de quick-select sur la date dérivée', async () => {
            const display = await property.getDisplay(mockClasse, {}) as HTMLElement;

            const quickSelect = display.querySelector('.quick-select-container');
            expect(quickSelect).toBeNull();
        });
    });

    describe('régressions : comportement éditable conservé', () => {
        test('une RangeDateProperty non dérivée reste éditable au clic', async () => {
            const property = new RangeDateProperty('date', vault, {});
            jest.spyOn(property as any, 'resolveDerivedRange').mockResolvedValue(null);

            const display = await property.getDisplay(mockClasse, {}) as HTMLElement;

            const input = display.querySelector('.field-input') as HTMLInputElement;
            clickLink(display);

            // Le mode édition s'ouvre normalement
            expect(input.style.display).toBe('block');
        });

        test('une DateProperty statique (display static) n\'ouvre pas l\'édition au clic', async () => {
            const property = new DateProperty('date', vault, [], { static: true });
            jest.spyOn(property as any, 'read').mockResolvedValue('2026-03-26');

            const display = await property.getDisplay(mockClasse, {}) as HTMLElement;

            const input = display.querySelector('.field-input') as HTMLInputElement;
            expect(input.style.display).toBe('none');
            expect(display.querySelector('.quick-select-container')).toBeNull();

            clickLink(display);

            expect(input.style.display).toBe('none');
        });
    });
});
