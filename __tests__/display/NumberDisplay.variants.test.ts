/**
 * @jest-environment jsdom
 *
 * Tests des variantes visuelles du NumberDisplay :
 *   display: 'plain'  -> gros chiffre sans cercle (ex: montant total)
 *   display: 'bar'    -> barre de progression horizontale
 *   display: 'ring'   -> cercle (défaut, inchangé)
 * Plus l'unité "%" automatique pour la formule percent.
 */

import { NumberDisplay } from '../../src/display/NumberDisplay';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { NumberDisplayItem } from '../../src/Config/interfaces';
import { mockApp } from '../utils/mocks';

describe('NumberDisplay - variantes visuelles (display)', () => {
    describe('variante plain : chiffre sans cercle', () => {
        test('plain n\'affiche pas de SVG, seulement la valeur avec unité', () => {
            const display = new NumberDisplay({
                value: 5000,
                unit: '€',
                display: 'plain'
            });

            expect(display.container.classList.contains('crm-number-display-plain')).toBe(true);
            // Pas de cercle
            expect(display.container.querySelector('svg')).toBeNull();
            // La valeur avec l'unité
            const valueEl = display.container.querySelector('.crm-number-display-value');
            expect(valueEl?.textContent).toBe('5000€');
        });

        test('plain affiche le label sous la valeur', () => {
            const display = new NumberDisplay({
                value: 5000,
                unit: '€',
                label: 'Montant total',
                display: 'plain'
            });

            const labelEl = display.container.querySelector('.crm-number-display-label');
            expect(labelEl?.textContent).toBe('Montant total');
            // Label APRÈS la valeur dans le DOM
            const valueEl = display.container.querySelector('.crm-number-display-value');
            expect(valueEl?.nextElementSibling).toBe(labelEl);
        });

        test('fromConfig transmet display: plain', async () => {
            const app = mockApp();
            const vault = new Vault(app, { vaultPath: './test-vault' } as any);
            const context = new Classe(vault);
            const getFilesForTable = jest.fn().mockResolvedValue([]);

            const item: NumberDisplayItem = {
                type: 'number',
                source: { class: 'Action' },
                formula: 'sum',
                propertyName: 'montant',
                display: 'plain',
                unit: '€',
                title: 'Montant total'
            };

            const display = await NumberDisplay.fromConfig(item, vault, context, getFilesForTable);
            expect((display.options as any).display).toBe('plain');
            expect(display.container.querySelector('svg')).toBeNull();
        });
    });

    describe('variante bar : barre de progression', () => {
        test('bar affiche une barre remplie selon value/max', () => {
            const display = new NumberDisplay({
                value: 12,
                max: 30,
                unit: '',
                display: 'bar'
            });

            expect(display.container.classList.contains('crm-number-display-bar')).toBe(true);
            expect(display.container.querySelector('svg')).toBeNull();

            const valueEl = display.container.querySelector('.crm-number-display-value');
            expect(valueEl?.textContent).toBe('12');

            const fillBar = display.container.querySelector('.crm-number-display-bar-fill') as HTMLElement;
            expect(fillBar).not.toBeNull();
            // fill = 12/30 = 40%
            expect(fillBar.style.width).toBe('40%');
        });

        test('bar clamp le remplissage à 100% quand value dépasse max', () => {
            const display = new NumberDisplay({
                value: 60,
                max: 30,
                display: 'bar'
            });

            const fillBar = display.container.querySelector('.crm-number-display-bar-fill') as HTMLElement;
            expect(fillBar.style.width).toBe('100%');
        });
    });

    describe('variante ring : comportement inchangé', () => {
        test('sans display, le cercle SVG est rendu par défaut', () => {
            const display = new NumberDisplay({ value: 42, unit: '%' });

            expect(display.container.classList.contains('crm-number-display-plain')).toBe(false);
            expect(display.container.classList.contains('crm-number-display-bar')).toBe(false);
            expect(display.container.querySelector('svg')).not.toBeNull();
        });

        test('display: ring explicite rend aussi le cercle', () => {
            const display = new NumberDisplay({ value: 42, display: 'ring' });
            expect(display.container.querySelector('svg')).not.toBeNull();
        });
    });

    describe('unité "%" automatique pour percent', () => {
        test('fromConfig ajoute % automatiquement pour percent sans unit', async () => {
            const app = mockApp();
            const vault = new Vault(app, { vaultPath: './test-vault' } as any);
            const context = new Classe(vault);
            (context as any).getPropertyValue = jest.fn().mockResolvedValue(5000);
            const getFilesForTable = jest.fn().mockResolvedValue([]);

            const item: NumberDisplayItem = {
                type: 'number',
                source: { class: 'Action' },
                formula: 'percent',
                propertyName: 'montant',
                max: 'montant',
                title: 'Pourcentage du montant total'
                // pas de unit dans le YAML
            };

            const display = await NumberDisplay.fromConfig(item, vault, context, getFilesForTable);
            expect(display.options.unit).toBe('%');
        });

        test('fromConfig ne touche pas une unité explicite', async () => {
            const app = mockApp();
            const vault = new Vault(app, { vaultPath: './test-vault' } as any);
            const context = new Classe(vault);
            const getFilesForTable = jest.fn().mockResolvedValue([]);

            const item: NumberDisplayItem = {
                type: 'number',
                source: { class: 'Action' },
                formula: 'count',
                display: 'plain',
                unit: 'actions',
                title: "Nombre d'actions"
            };

            const display = await NumberDisplay.fromConfig(item, vault, context, getFilesForTable);
            expect(display.options.unit).toBe('actions');
        });
    });
});
