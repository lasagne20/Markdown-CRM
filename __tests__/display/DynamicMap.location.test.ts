/**
 * @jest-environment jsdom
 *
 * Carte dynamique : résolution des coordonnées via locationProperty.
 *
 * Les actions n'ont pas de latitude/longitude propres : leur position est
 * celle de leur commune (clients[0].client), résolue depuis les données
 * geo.json du Lieu. Le client peut être directement une commune ou une
 * institution dont le parent est la commune (chaîne .parent).
 *
 * Attendu :
 * - locationProperty -> nom du Lieu -> coords de l'entrée geo.json
 * - si l'entrée n'a pas de coords (institution), remonter via .parent
 * - action sans client résolvable -> pas de marqueur
 * - boundary.property ("lieu" du partenariat) -> contour geo.json du Lieu lié
 * - marker.properties supporte _fileName (titre du popup)
 */

import { DynamicMap } from '../../src/display/DynamicMap';

// geo.json de test : ordre correct latitude/longitude + geometry départment
const geoEntries = [
    {
        nom: '38 - Isère', type: 'Département', code: '38',
        latitude: 45.268, longitude: 5.574,
        geometry: {
            type: 'Polygon',
            coordinates: [[[5.0, 45.0], [6.0, 45.0], [6.0, 45.6], [5.0, 45.0]]]
        }
    },
    { nom: '26700 - Pierrelatte', type: 'Commune', latitude: 44.3764, longitude: 4.6989 },
    { nom: '05200 - Les Orres', type: 'Commune', latitude: 44.5717, longitude: 6.2345 }
];

interface FakeClasse {
    getName(): string;
    getPath(): string;
    getClassName(): string;
    getPropertyValue(prop: string): Promise<any>;
    getProperty(prop: string): any;
    getParent?(): Promise<any>;
    [key: string]: any;
}

function fakeClasse(name: string, className: string, metadata: Record<string, any> = {}, extra: Record<string, any> = {}): FakeClasse {
    return {
        getName: () => name,
        getPath: () => `Test/${name}.md`,
        getClassName: () => className,
        getPropertyValue: async (prop: string) => metadata[prop],
        getProperty: () => null,
        ...extra
    };
}

describe('DynamicMap - locationProperty (coords depuis geo.json)', () => {
    let mockVault: any;
    let container: HTMLElement;
    let fakesByName: Record<string, FakeClasse>;
    let L: any;

    beforeEach(() => {
        DynamicMap.clearGeoCache();
        container = document.createElement('div');
        document.body.appendChild(container);

        const communePierrelatte = fakeClasse('26700 - Pierrelatte', 'Commune');
        const communeOrres = fakeClasse('05200 - Les Orres', 'Commune');
        const institution = fakeClasse('Ecole des Orres', 'Institution', {}, {
            getParent: async () => communeOrres
        });

        fakesByName = {
            '26700 - Pierrelatte': communePierrelatte,
            '05200 - Les Orres': communeOrres,
            'Ecole des Orres': institution
        };

        mockVault = {
            app: {
                getFile: async (path: string) =>
                    path.endsWith('geo.json') ? { path, extension: 'json' } : null,
                readFile: async () => JSON.stringify(geoEntries)
            },
            settings: { configPath: 'config' },
            getDynamicClassFactory: () => ({
                getClassConfig: async (name: string) =>
                    name === 'Lieu' ? { data: [{ file: 'data/geo.json' }] } : null
            }),
            getFromLink: async (link: string) => fakesByName[link.replace(/\[\[|\]\]/g, '')],
            open: jest.fn()
        };

        L = {
            map: jest.fn(() => ({
                setView: jest.fn().mockReturnThis(),
                addLayer: jest.fn(),
                eachLayer: jest.fn(),
                invalidateSize: jest.fn(),
                fitBounds: jest.fn(),
                remove: jest.fn()
            })),
            tileLayer: jest.fn(() => ({ addTo: jest.fn() })),
            marker: jest.fn(() => ({
                addTo: jest.fn().mockReturnThis(),
                bindPopup: jest.fn().mockReturnThis(),
                on: jest.fn()
            })),
            divIcon: jest.fn(() => ({})),
            polygon: jest.fn(() => ({ addTo: jest.fn().mockReturnThis() })),
            latLngBounds: jest.fn(() => ({
                extend: jest.fn().mockReturnThis(),
                isValid: jest.fn(() => true)
            }))
        };
        (global as any).L = L;
    });

    afterEach(() => {
        document.body.removeChild(container);
        DynamicMap.clearGeoCache();
        delete (global as any).L;
    });

    const baseItem: any = {
        type: 'map',
        title: 'Actions',
        source: { class: 'Action' },
        coordinates: { locationProperty: 'clients[0].client' },
        center: [45, 5],
        marker: { properties: [{ property: '_fileName' }] }
    };

    test("PLANTE : marqueur positionné sur la commune du client (coords geo.json)", async () => {
        const action = fakeClasse('Fête de la science', 'Action', {
            clients: [{ client: '[[26700 - Pierrelatte]]' }]
        });

        await DynamicMap.fromConfig(baseItem, mockVault, container, [action], undefined);

        expect(L.marker).toHaveBeenCalledWith(
            [44.3764, 4.6989],
            expect.any(Object)
        );
    });

    test("PLANTE : client institution sans coords -> remonte au parent commune", async () => {
        const action = fakeClasse('Action école', 'Action', {
            clients: [{ client: '[[Ecole des Orres]]' }]
        });

        await DynamicMap.fromConfig(baseItem, mockVault, container, [action], undefined);

        expect(L.marker).toHaveBeenCalledWith(
            [44.5717, 6.2345],
            expect.any(Object)
        );
    });

    test("PLANTE : action sans client résolvable -> pas de marqueur", async () => {
        const actionSansClient = fakeClasse('Action perdue', 'Action', { clients: [] });
        const actionSansCommune = fakeClasse('Action introuvable', 'Action', {
            clients: [{ client: '[[Nulle part]]' }]
        });

        await DynamicMap.fromConfig(baseItem, mockVault, container, [actionSansClient, actionSansCommune], undefined);

        expect(L.marker).not.toHaveBeenCalled();
    });

    test("PLANTE : boundary.property pointe vers le Lieu lié -> contour geo.json", async () => {
        fakesByName['38 - Isère'] = fakeClasse('38 - Isère', 'Département');
        const partenariat = fakeClasse('Partenariat TE38', 'Partenariat', {
            lieu: '[[38 - Isère]]'
        });
        const action = fakeClasse('Action TE38', 'Action', {
            clients: [{ client: '[[26700 - Pierrelatte]]' }]
        });

        const item = {
            ...baseItem,
            boundary: { enabled: true, property: 'lieu' }
        };

        await DynamicMap.fromConfig(item, mockVault, container, [action], partenariat);

        // geometry geo.json [lng, lat] convertie en [lat, lng] pour Leaflet
        expect(L.polygon).toHaveBeenCalledWith(
            [[45.0, 5.0], [45.0, 6.0], [45.6, 6.0], [45.0, 5.0]],
            expect.any(Object)
        );
    });

    test("PLANTE : _fileName résolu comme propriété de popup (titre cliquable)", async () => {
        const action = fakeClasse('Fête de la science', 'Action', {
            clients: [{ client: '[[26700 - Pierrelatte]]' }]
        });

        const map = await DynamicMap.fromConfig(baseItem, mockVault, container, [action], undefined);

        // Le popup doit contenir le nom du fichier comme titre
        const markerMock = L.marker.mock.results[0].value;
        expect(markerMock.bindPopup).toHaveBeenCalled();
        const popupHtml: string = (markerMock.bindPopup.mock.calls[0][0] as HTMLElement).innerHTML;
        expect(popupHtml).toContain('Fête de la science');
        expect(popupHtml).toContain('data-file="Test/Fête de la science.md"');
    });

    test("PLANTE : marqueurs en point coloré (dot), pas en pin géant", async () => {
        const action = fakeClasse('Fête de la science', 'Action', {
            clients: [{ client: '[[26700 - Pierrelatte]]' }]
        });

        await DynamicMap.fromConfig(baseItem, mockVault, container, [action], undefined);

        expect(L.divIcon).toHaveBeenCalledWith(
            expect.objectContaining({ iconSize: [22, 22] })
        );
    });

    test("PLANTE : popup avec lignes labellisées et liens cliquables vers les fichiers liés", async () => {
        const action = fakeClasse('Fête de la science', 'Action', {
            date: '2025-10-05',
            etat: 'Confirmée',
            clients: [{ client: '[[26700 - Pierrelatte]]', nombre: '80' }],
            partenariats: [{ partenariat: '[[Partenariat TE38]]', montant: '1560' }]
        });

        const item = {
            ...baseItem,
            marker: {
                properties: [
                    { property: '_fileName' },
                    { property: 'date', label: 'Date' },
                    { property: 'etat', label: 'État' },
                    { property: 'clients[0].client', label: 'Commune' },
                    { property: 'partenariats[0].montant', label: 'Montant' }
                ],
                colorProperty: 'etat'
            }
        };

        await DynamicMap.fromConfig(item, mockVault, container, [action], undefined);

        const markerMock = L.marker.mock.results[0].value;
        const popupHtml: string = (markerMock.bindPopup.mock.calls[0][0] as HTMLElement).innerHTML;
        // Lignes labellisées
        expect(popupHtml).toContain('Date');
        expect(popupHtml).toContain('2025-10-05');
        expect(popupHtml).toContain('État');
        expect(popupHtml).toContain('Confirmée');
        // La commune est un lien cliquable
        expect(popupHtml).toContain('Commune');
        expect(popupHtml).toContain('data-file="26700 - Pierrelatte.md"');
        expect(popupHtml).toContain('Montant');
        expect(popupHtml).toContain('1560');
    });

    test("PLANTE : coordinates.geoFile + boundary.geoFile chargent uniquement les fichiers légers", async () => {
        const partenariat = fakeClasse('Partenariat TE38', 'Partenariat', {
            lieu: '[[38 - Isère]]'
        });
        fakesByName['38 - Isère'] = fakeClasse('38 - Isère', 'Département');
        const action = fakeClasse('Fête de la science', 'Action', {
            clients: [{ client: '[[26700 - Pierrelatte]]' }]
        });

        const readPaths: string[] = [];
        (mockVault as any).app.getFile = async (p: string) => {
            readPaths.push(p);
            return p.endsWith('.json') ? { path: p, extension: 'json' } : null;
        };
        (mockVault as any).app.readFile = async (f: any) => {
            if (f.path.includes('geo-communes')) {
                return JSON.stringify(geoEntries.filter((e: any) => e.latitude !== undefined));
            }
            if (f.path.includes('geo-contours')) {
                return JSON.stringify([{
                    nom: '38 - Isère', type: 'Département', code: '38',
                    geometry: { type: 'Polygon', coordinates: [[[5.0, 45.0], [6.0, 45.0], [6.0, 45.6], [5.0, 45.0]]] }
                }]);
            }
            return '[]';
        };

        const item = {
            ...baseItem,
            coordinates: { ...baseItem.coordinates, geoFile: 'data/geo-communes.json' },
            boundary: { enabled: true, property: 'lieu', geoFile: 'data/geo-contours.json' }
        };

        await DynamicMap.fromConfig(item, mockVault, container, [action], partenariat);

        // Les deux fichiers légers sont lus...
        expect(readPaths.some(p => p.includes('geo-communes'))).toBe(true);
        expect(readPaths.some(p => p.includes('geo-contours'))).toBe(true);
        // ...et PAS le gros geo.json combiné
        expect(readPaths.some(p => p.endsWith('geo.json'))).toBe(false);

        // Marqueurs depuis les coordonnées communes, contour depuis les contours
        expect(L.marker).toHaveBeenCalledWith([44.3764, 4.6989], expect.any(Object));
        expect(L.polygon).toHaveBeenCalledWith(
            [[45.0, 5.0], [45.0, 6.0], [45.6, 6.0], [45.0, 5.0]],
            expect.any(Object)
        );
    });

    test("PLANTE : popup affiche les wikilinks nettoyés (sans [[...]]) et les tableaux joints", async () => {
        const action = fakeClasse('Fête de la science', 'Action', {
            date: '2025-10-05',
            etat: 'Facturée',
            clients: [{ client: '[[26700 - Pierrelatte]]' }],
            partenariats: [{ partenariat: '[[Partenariat TE38]]', montant: '600' }]
        });

        const item = {
            ...baseItem,
            marker: {
                properties: [
                    { property: '_fileName' },
                    { property: 'clients[0].client', label: 'Commune' },
                    { property: 'partenariats.filter(partenariat=$current).montant', label: 'Montant' }
                ],
                colorProperty: 'etat'
            }
        };

        await DynamicMap.fromConfig(item, mockVault, container, [action], undefined);

        const markerMock = L.marker.mock.results[0].value;
        const popupHtml: string = (markerMock.bindPopup.mock.calls[0][0] as HTMLElement).innerHTML;
        // Wikilink affiché nettoyé
        expect(popupHtml).toContain('26700 - Pierrelatte');
        expect(popupHtml).not.toContain('[[26700 - Pierrelatte]]');
        // Résultat de filter() (tableau) joint, pas de JSON brut
        expect(popupHtml).toContain('600');
        expect(popupHtml).not.toContain('["600"]');
    });

    test("PLANTE : les liens du popup sont cliquables (délégation, vault.open au clic)", async () => {
        const action = fakeClasse('Fête de la science', 'Action', {
            clients: [{ client: '[[26700 - Pierrelatte]]' }]
        });

        const item = {
            ...baseItem,
            marker: {
                properties: [
                    { property: '_fileName' },
                    { property: 'clients[0].client', label: 'Commune' }
                ]
            }
        };
        await DynamicMap.fromConfig(item, mockVault, container, [action], undefined);

        // bindPopup reçoit un element (délégation d'evenements), pas une string
        const markerMock = L.marker.mock.results[0].value;
        const popupArg = markerMock.bindPopup.mock.calls[0][0];
        expect(popupArg).toBeInstanceOf(HTMLElement);

        // Clic sur le lien du titre -> ouverture du fichier
        const content = popupArg as HTMLElement;
        const titleLink = content.querySelector('.map-marker-link') as HTMLElement;
        expect(titleLink).toBeTruthy();
        titleLink.click();
        expect(mockVault.open).toHaveBeenCalled();

        // Clic sur le lien de la commune liée -> ouverture du fichier lié
        const propertyLink = content.querySelector('.map-property-link') as HTMLElement;
        expect(propertyLink).toBeTruthy();
        propertyLink.click();
        expect(mockVault.open).toHaveBeenCalledWith('26700 - Pierrelatte.md');
    });

    test("PLANTE : invalidateSize appelé quand le conteneur prend une taille réelle (onglet affiché)", async () => {
        const resizeCallbacks: Array<() => void> = [];
        class FakeResizeObserver {
            constructor(callback: () => void) { resizeCallbacks.push(callback); }
            observe() {}
            disconnect() {}
        }
        (global as any).ResizeObserver = FakeResizeObserver;

        try {
            const action = fakeClasse('Fête de la science', 'Action', {
                clients: [{ client: '[[26700 - Pierrelatte]]' }]
            });

            await DynamicMap.fromConfig(baseItem, mockVault, container, [action], undefined);

            // La carte est initialisée cachée : pas encore d'invalidateSize
            const mapMock = L.map.mock.results[0].value;
            expect(mapMock.invalidateSize).not.toHaveBeenCalled();

            // L'onglet devient visible -> le conteneur prend une taille réelle
            // -> ResizeObserver déclenche invalidateSize (plus besoin de
            // passer la souris sur la carte)
            expect(resizeCallbacks.length).toBeGreaterThan(0);
            resizeCallbacks[0]();
            expect(mapMock.invalidateSize).toHaveBeenCalled();
        } finally {
            delete (global as any).ResizeObserver;
        }
    });

    test("PLANTE : contour MultiPolygon -> tous les polygones ajoutés", async () => {
        const partenariat = fakeClasse('Partenariat Corse', 'Partenariat', {
            lieu: '[[20A - Corse-du-Sud]]'
        });
        const action = fakeClasse('Action corse', 'Action', {
            clients: [{ client: '[[26700 - Pierrelatte]]' }]
        });

        fakesByName['20A - Corse-du-Sud'] = fakeClasse('20A - Corse-du-Sud', 'Département');
        (mockVault as any).app.readFile = async () => JSON.stringify([
            ...geoEntries,
            {
                nom: '20A - Corse-du-Sud', type: 'Département', code: '2A',
                geometry: {
                    type: 'MultiPolygon',
                    coordinates: [
                        [[[8.5, 41.5], [8.7, 41.5], [8.7, 41.7], [8.5, 41.5]]],
                        [[[9.0, 41.3], [9.2, 41.3], [9.2, 41.5], [9.0, 41.5]]]
                    ]
                }
            }
        ]);

        const item = {
            ...baseItem,
            boundary: { enabled: true, property: 'lieu' }
        };

        await DynamicMap.fromConfig(item, mockVault, container, [action], partenariat);

        // Les DEUX polygones du MultiPolygon sont dessinés
        expect(L.polygon).toHaveBeenCalledTimes(2);
        expect(L.polygon).toHaveBeenCalledWith(
            [[41.5, 8.5], [41.5, 8.7], [41.7, 8.7], [41.5, 8.5]],
            expect.any(Object)
        );
        expect(L.polygon).toHaveBeenCalledWith(
            [[41.3, 9.0], [41.3, 9.2], [41.5, 9.2], [41.5, 9.0]],
            expect.any(Object)
        );
    });
});
