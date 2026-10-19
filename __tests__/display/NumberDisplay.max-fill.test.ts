/**
 * @jest-environment jsdom
 *
 * Bug : le contour coloré (fill du cercle SVG) ne suit ni le pourcentage ni le max.
 *
 * Dans fromConfig, le max résolu n'était transmis au NumberDisplay QUE pour la
 * formule percent (et en passant maxValue brut, ex. le montant du partenariat,
 * alors que la valeur percent est déjà 0-100 -> fill quasi nul). Pour toutes les
 * autres formules (count avec max: 30, etc.), max était undefined et le fill
 * retombait sur value/100.
 *
 * Comportement attendu :
 * - percent : value déjà 0-100 -> fill = value/100 (max = 100)
 * - autres formules avec max résolu -> fill = value/max
 * - sans max -> mode pourcentage par défaut (value/100)
 */

import { NumberDisplay } from '../../src/display/NumberDisplay';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { NumberDisplayItem } from '../../src/Config/interfaces';
import { mockApp } from '../utils/mocks';

describe('NumberDisplay.fromConfig - transmission du max au cercle (fill)', () => {
    let vault: Vault;
    let context: Classe;

    beforeEach(() => {
        const app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);
        context = new Classe(vault);
    });

    test('PLANTE : count avec max numérique doit transmettre max au display', async () => {
        const files: any[] = Array.from({ length: 12 }, () => ({ getVault: () => vault }));
        const getFilesForTable = jest.fn().mockResolvedValue(files);

        const item: NumberDisplayItem = {
            type: 'number',
            source: { class: 'Action' },
            formula: 'count',
            title: "Nombre d'actions",
            max: 30
        };

        const display = await NumberDisplay.fromConfig(item, vault, context, getFilesForTable);

        expect(display.options.value).toBe(12);
        // Le max résolu doit être transmis pour que le fill soit value/max
        expect(display.options.max).toBe(30);
    });

    test('PLANTE : percent doit garder le mode pourcentage (max 100), pas le montant brut', async () => {
        const getFilesForTable = jest.fn().mockResolvedValue([]);
        // Le contexte (Partenariat) a un montant de 5000 -> max: "montant"
        (context as any).getPropertyValue = jest.fn().mockResolvedValue(5000);

        const item: NumberDisplayItem = {
            type: 'number',
            source: { class: 'Action' },
            formula: 'percent',
            propertyName: 'partenariats.filter(partenariat=$current).montant',
            title: 'Pourcentage du montant total',
            max: 'montant'
        };

        const display = await NumberDisplay.fromConfig(item, vault, context, getFilesForTable);

        // La valeur percent est déjà 0-100 : le fill doit être value/100.
        // Passer le montant brut (5000) rendrait le contour quasi vide.
        expect(display.options.max).toBe(100);
    });

    test('PLANTE : le stroke-dashoffset suit value/max (contour rempli à 40%)', async () => {
        // 12 actions sur un max de 30 -> fill = 0.4
        const files: any[] = Array.from({ length: 12 }, () => ({ getVault: () => vault }));
        const getFilesForTable = jest.fn().mockResolvedValue(files);

        const item: NumberDisplayItem = {
            type: 'number',
            source: { class: 'Action' },
            formula: 'count',
            title: "Nombre d'actions",
            max: 30
        };

        const display = await NumberDisplay.fromConfig(item, vault, context, getFilesForTable);

        const svg = display.container.querySelector('svg');
        const circles = svg?.querySelectorAll('circle');
        const progressCircle = circles?.[1];
        const offset = parseFloat(progressCircle?.getAttribute('stroke-dashoffset') || '0');

        // displaySize = 96, strokeWidth = 10 -> radius = 41 -> circumference = 2*PI*41
        // fill = 12/30 = 0.4 -> offset = circumference * (1 - 0.4) = circumference * 0.6
        const circumference = 2 * Math.PI * 41;
        expect(offset).toBeCloseTo(circumference * 0.6, 0);
    });

    test('sans max : le fill reste en mode pourcentage (value/100)', async () => {
        const files: any[] = Array.from({ length: 12 }, () => ({ getVault: () => vault }));
        const getFilesForTable = jest.fn().mockResolvedValue(files);

        const item: NumberDisplayItem = {
            type: 'number',
            source: { class: 'Action' },
            formula: 'count',
            title: "Nombre d'actions"
            // pas de max
        };

        const display = await NumberDisplay.fromConfig(item, vault, context, getFilesForTable);

        expect(display.options.value).toBe(12);
        expect(display.options.max).toBeUndefined();

        const svg = display.container.querySelector('svg');
        const circles = svg?.querySelectorAll('circle');
        const progressCircle = circles?.[1];
        const offset = parseFloat(progressCircle?.getAttribute('stroke-dashoffset') || '0');

        // fill = 12/100 = 0.12 -> offset = circumference * 0.88
        const circumference = 2 * Math.PI * 41;
        expect(offset).toBeCloseTo(circumference * 0.88, 0);
    });
});
