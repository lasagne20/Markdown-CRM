/**
 * @jest-environment jsdom
 *
 * Bug : dans DateProperty.createFieldDate, le picker flatpickr déclenche
 * onChange (sélection) PUIS onClose (fermeture). Le handler onClose faisait
 * `input.value = ""` puis updateField -> update("") : une DEUXIÈME écriture
 * concurrente qui vidait la date, mutait le tableau `values` partagé de
 * l'ObjectProperty (re-rendu de l'onglet avec date vide) et faisait
 * retomber la date dérivée sur l'ancienne valeur. Résultat visible :
 * "date pas mise à jour" / "retard au premier coup", de façon erratique
 * (course entre les deux écritures).
 *
 * Fix attendu :
 * - onClose ne vide PAS l'input : il update avec la valeur réelle de l'input
 * - une valeur identique ne déclenche qu'un seul update (onChange puis onClose)
 * - vider manuellement l'input puis fermer update bien avec "" (clear volontaire)
 */

import { DateProperty } from "../../src/properties/DateProperty";

// Mock flatpickr completely
jest.mock('flatpickr', () => {
    const mockInstance = {
        destroy: jest.fn(),
        setDate: jest.fn(),
        clear: jest.fn()
    };

    const mockFlatpickr = jest.fn((element, options) => {
        (element as any).flatpickrOptions = options;
        (element as any).flatpickrInstance = mockInstance;
        return mockInstance;
    });

    return mockFlatpickr;
});

// Mock French locale
jest.mock('flatpickr/dist/l10n/fr.js', () => ({
    French: { locale: 'fr' }
}));

// Mock all dependencies
jest.mock('../../src/vault/Classe', () => ({}));
jest.mock('../../src/vault/File', () => ({}));
jest.mock('../../src/vault/Vault', () => ({}));
jest.mock('../../src/vault/Utils', () => ({
    setIcon: jest.fn((element: HTMLElement, iconName: string) => {
        element.setAttribute('data-icon', iconName);
        element.textContent = `[${iconName}]`;
    })
}));

describe("DateProperty - flatpickr close ne vide pas la date", () => {
    let mockUpdate: jest.Mock;
    let mockVault: any;
    let property: DateProperty;
    let input: HTMLInputElement;
    let options: any;

    beforeEach(() => {
        mockUpdate = jest.fn().mockResolvedValue(undefined);
        document.body.innerHTML = '';

        mockVault = {
            app: {
                vault: { getFiles: jest.fn(() => []) },
                setIcon: jest.fn()
            }
        };

        property = new DateProperty("date", mockVault, [], { icon: "calendar" });
        const link = document.createElement("div");
        input = property.createFieldDate("2026-03-26", mockUpdate, link as any) as HTMLInputElement;
        options = (input as any).flatpickrOptions;
    });

    test("PLANTE : sélectionner une date puis fermer le picker n'écrit jamais une date vide", async () => {
        // L'utilisateur sélectionne le 21 novembre 2026
        await options.onChange([new Date(2026, 10, 21)]);
        // Le picker se ferme (closeOnSelect par défaut)
        await options.onClose();

        expect(mockUpdate).toHaveBeenCalledWith('2026-11-21');
        expect(mockUpdate).not.toHaveBeenCalledWith('');
    });

    test("PLANTE : onChange puis onClose ne déclenchent qu'un seul update (pas de double écriture)", async () => {
        await options.onChange([new Date(2026, 10, 21)]);
        await options.onClose();

        expect(mockUpdate).toHaveBeenCalledTimes(1);
        expect(mockUpdate).toHaveBeenCalledWith('2026-11-21');
    });

    test("vider manuellement l'input puis fermer update bien avec \"\" (clear volontaire)", async () => {
        input.value = "";
        await options.onClose();

        expect(mockUpdate).toHaveBeenCalledWith('');
    });
});
