/**
 * @jest-environment jsdom
 *
 * Options de formatage du NumberDisplay :
 *   prefix              -> texte avant le nombre
 *   suffix              -> texte après le nombre et l'unité
 *   thousandsSeparator  -> sépare les milliers (ex: " " -> "1 234 567")
 *
 * Ordre d'affichage : prefix + nombre formaté + unit + suffix
 */

import { NumberDisplay } from '../../src/display/NumberDisplay';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { NumberDisplayItem } from '../../src/Config/interfaces';
import { mockApp } from '../utils/mocks';

describe('NumberDisplay - prefix, suffix et séparateur de milliers', () => {
    describe('Séparateur de milliers', () => {
        test('thousandsSeparator formate le nombre par groupes de 3', () => {
            const display = new NumberDisplay({
                value: 1234567,
                display: 'plain',
                thousandsSeparator: ' '
            });

            const valueEl = display.container.querySelector('.crm-number-display-value');
            expect(valueEl?.textContent).toBe('1 234 567');
        });

        test('PLANTE : sans thousandsSeparator le nombre reste brut', async () => {
            const display = new NumberDisplay({
                value: 1234567,
                display: 'plain'
            });

            const valueEl = display.container.querySelector('.crm-number-display-value');
            expect(valueEl?.textContent).toBe('1234567');
        });

        test('les décimales sont préservées avec le séparateur', () => {
            const display = new NumberDisplay({
                value: 1234567.89,
                display: 'plain',
                thousandsSeparator: ' '
            });

            const valueEl = display.container.querySelector('.crm-number-display-value');
            expect(valueEl?.textContent).toBe('1 234 567.89');
        });

        test('les petits nombres ne sont pas modifiés', () => {
            const display = new NumberDisplay({
                value: 999,
                display: 'plain',
                thousandsSeparator: ' '
            });

            const valueEl = display.container.querySelector('.crm-number-display-value');
            expect(valueEl?.textContent).toBe('999');
        });

        test('le séparateur fonctionne aussi sur le ring (texte du SVG)', () => {
            const display = new NumberDisplay({
                value: 45000,
                unit: '€',
                thousandsSeparator: ' '
            });

            const svg = display.container.querySelector('svg');
            const text = svg?.querySelector('text');
            expect(text?.textContent).toBe('45 000€');
        });
    });

    describe('Prefix et suffix', () => {
        test('prefix et suffix encadrent nombre et unité', () => {
            const display = new NumberDisplay({
                value: 1500,
                unit: '€',
                display: 'plain',
                prefix: '≈ ',
                suffix: ' HT'
            });

            const valueEl = display.container.querySelector('.crm-number-display-value');
            expect(valueEl?.textContent).toBe('≈ 1500€ HT');
        });

        test('prefix + séparateur + suffix ensemble', () => {
            const display = new NumberDisplay({
                value: 1234567,
                unit: '€',
                display: 'plain',
                prefix: '≈ ',
                suffix: ' HT',
                thousandsSeparator: ' '
            });

            const valueEl = display.container.querySelector('.crm-number-display-value');
            expect(valueEl?.textContent).toBe('≈ 1 234 567€ HT');
        });

        test('sans prefix/suffix le rendu est inchangé', () => {
            const display = new NumberDisplay({
                value: 42,
                unit: '%'
            });

            const svg = display.container.querySelector('svg');
            const text = svg?.querySelector('text');
            expect(text?.textContent).toBe('42%');
        });
    });

    describe('fromConfig transmet les options', () => {
        test('prefix, suffix et thousandsSeparator passent du YAML au display', async () => {
            const app = mockApp();
            const vault = new Vault(app, { vaultPath: './test-vault' } as any);
            const context = new Classe(vault);
            const getFilesForTable = jest.fn().mockResolvedValue([]);

            const item: NumberDisplayItem = {
                type: 'number',
                source: { class: 'Action' },
                formula: 'count',
                display: 'plain',
                prefix: '≈ ',
                suffix: ' actions',
                thousandsSeparator: ' ',
                title: "Nombre d'actions"
            };

            const display = await NumberDisplay.fromConfig(item, vault, context, getFilesForTable);

            expect((display.options as any).prefix).toBe('≈ ');
            expect((display.options as any).suffix).toBe(' actions');
            expect((display.options as any).thousandsSeparator).toBe(' ');
            // files vide -> value = 0
            const valueEl = display.container.querySelector('.crm-number-display-value');
            expect(valueEl?.textContent).toBe('≈ 0 actions');
        });
    });
});
