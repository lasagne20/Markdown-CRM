/**
 * @jest-environment jsdom
 *
 * Optimisation du chargement des pages :
 *
 * 1. Onglets paresseux (lazy: true) : seul l'onglet actif est rendu
 *    immédiatement ; les autres sont rendus EN ARRIÈRE-PLAN (séquentiel,
 *    avec yield entre chaque) pour ne pas bloquer l'affichage de la page.
 *    Sans le flag : comportement inchangé (tout est rendu d'un coup).
 *
 * 2. Cache des sources : deux items de la même page avec la même source
 *    (classe + conditions + fichier courant) partagent le même scan au lieu
 *    de rescanner tout le vault chacun leur tour.
 *
 * 3. Cache des entrées geo.json : parsé une seule fois par session
 *    (au lieu de chaque rendu de carte), clearGeoCache pour invalider.
 */

import { DisplayRenderer } from '../../src/display/DisplayRenderer';
import { DynamicMap } from '../../src/display/DynamicMap';

describe('Optimisations de chargement', () => {
    let mockVault: any;
    let mockContext: any;
    let renderer: DisplayRenderer;
    let container: HTMLElement;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);

        mockVault = {
            app: {
                workspace: {},
                vault: {},
                getFile: jest.fn(async (p: string) => ({ path: p, extension: 'json' })),
                readFile: jest.fn(async () => JSON.stringify([{ nom: 'X', latitude: 45, longitude: 5 }]))
            },
            settings: {
                templateFolder: './templates',
                personalName: 'Test',
                configPath: './config'
            },
            conditionManager: {
                createValidationFunction: jest.fn(() => () => true)
            },
            getDynamicClassFactory: jest.fn(() => ({
                getClassConfig: jest.fn(async (name: string) =>
                    name === 'Lieu'
                        ? { data: [{ file: 'data/geo.json' }] }
                        : { parent: { folder: 'Actions' } }
                ),
                getAllInstancesForClass: jest.fn(async () => [])
            }))
        } as any;

        mockContext = {
            getName: jest.fn(() => 'Test'),
            getPropertyValue: jest.fn(async () => null),
            getProperty: jest.fn(),
            getPath: jest.fn(() => 'Test.md')
        } as any;

        renderer = new DisplayRenderer(mockVault, {}, mockContext);
        DynamicMap.clearGeoCache();
    });

    afterEach(() => {
        document.body.removeChild(container);
        DynamicMap.clearGeoCache();
    });

    describe('Onglets paresseux (lazy: true)', () => {
        const tabsItem = {
            type: 'tabs',
            lazy: true,
            tabs: [
                { name: 'A', items: [{ type: 'line', items: [] }] },
                { name: 'B', items: [{ type: 'line', items: [] }] },
                { name: 'C', items: [{ type: 'line', items: [] }] }
            ]
        };

        test('PLANTE : seul le premier onglet est rendu au retour, les autres en arrière-plan', async () => {
            const el = await (renderer as any).renderTabs(tabsItem);
            container.appendChild(el);

            const contents = el.querySelectorAll('.tab-content');
            expect(contents.length).toBe(3);

            // Onglet actif : rendu. Les autres : placeholder, pas de contenu.
            expect((contents[0] as HTMLElement).querySelector('.metadata-container-wrapper')).toBeTruthy();
            expect((contents[0] as HTMLElement).querySelector('.tab-loading-placeholder')).toBeNull();
            expect((contents[1] as HTMLElement).querySelector('.metadata-container-wrapper')).toBeNull();
            expect((contents[1] as HTMLElement).querySelector('.tab-loading-placeholder')).toBeTruthy();
            expect((contents[2] as HTMLElement).querySelector('.metadata-container-wrapper')).toBeNull();
            expect((contents[2] as HTMLElement).querySelector('.tab-loading-placeholder')).toBeTruthy();

            // Laisse le rendu en arrière-plan se terminer
            await new Promise(r => setTimeout(r, 100));

            // Tous les onglets ont maintenant leur contenu, plus de placeholder
            contents.forEach((c: Element) => {
                expect((c as HTMLElement).querySelector('.metadata-container-wrapper')).toBeTruthy();
                expect((c as HTMLElement).querySelector('.tab-loading-placeholder')).toBeNull();
            });
        });

        test('sans lazy: tout est rendu d\'un coup (comportement inchangé)', async () => {
            const eagerItem = { ...tabsItem, lazy: undefined };

            const el = await (renderer as any).renderTabs(eagerItem);
            container.appendChild(el);

            const contents = el.querySelectorAll('.tab-content');
            expect(contents.length).toBe(3);
            contents.forEach((c: Element) => {
                expect((c as HTMLElement).querySelector('.metadata-container-wrapper')).toBeTruthy();
                expect((c as HTMLElement).querySelector('.tab-loading-placeholder')).toBeNull();
            });
        });
    });

    describe('Cache des sources (getFilesForTable)', () => {
        test('PLANTE : deux sources identiques ne déclenchent qu\'un seul scan', async () => {
            const instances = [
                { getName: () => 'A1', getPath: () => 'A1.md', getPropertyValue: async () => null, getProperty: () => null },
                { getName: () => 'A2', getPath: () => 'A2.md', getPropertyValue: async () => null, getProperty: () => null }
            ];
            const factory = {
                getClassConfig: async () => ({ parent: { folder: 'Actions' } }),
                getAllInstancesForClass: jest.fn(async () => instances)
            };
            mockVault.getDynamicClassFactory = () => factory;

            const files1 = await (renderer as any).getFilesForTable({ class: 'Action' }, mockContext);
            const files2 = await (renderer as any).getFilesForTable({ class: 'Action' }, mockContext);

            expect(factory.getAllInstancesForClass).toHaveBeenCalledTimes(1);
            expect(files1.length).toBe(2);
            expect(files2.length).toBe(2);
        });

        test('des sources différentes (conditions) rescannent', async () => {
            const factory = {
                getClassConfig: async () => ({ parent: { folder: 'Actions' } }),
                getAllInstancesForClass: jest.fn(async () => [])
            };
            mockVault.getDynamicClassFactory = () => factory;

            await (renderer as any).getFilesForTable({ class: 'Action' }, mockContext);
            await (renderer as any).getFilesForTable(
                { class: 'Action', conditions: [{ property: 'etat', type: 'equals', value: 'Annulé' }] },
                mockContext
            );

            expect(factory.getAllInstancesForClass).toHaveBeenCalledTimes(2);
        });
    });

    describe('Cache des entrées geo.json (DynamicMap)', () => {
        test('PLANTE : geo.json lu et parsé une seule fois, clearGeoCache invalide', async () => {
            const entries1 = await DynamicMap.loadGeoEntries(mockVault);
            const entries2 = await DynamicMap.loadGeoEntries(mockVault);

            expect(mockVault.app.readFile).toHaveBeenCalledTimes(1);
            expect(entries1.length).toBe(1);
            expect(entries2).toBe(entries1); // même tableau en cache

            DynamicMap.clearGeoCache();
            await DynamicMap.loadGeoEntries(mockVault);
            expect(mockVault.app.readFile).toHaveBeenCalledTimes(2);
        });
    });
});
