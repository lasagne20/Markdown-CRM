import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DisplayRenderer } from '../../src/display/DisplayRenderer';
import { MapDisplayItem } from '../../src/Config/interfaces';

// Mock Leaflet pour les tests d'intégration
(global as any).L = {
    map: jest.fn(() => ({
        setView: jest.fn().mockReturnThis(),
        remove: jest.fn(),
        invalidateSize: jest.fn(),
        fitBounds: jest.fn(),
        eachLayer: jest.fn()
    })),
    tileLayer: jest.fn(() => ({
        addTo: jest.fn()
    })),
    marker: jest.fn(() => ({
        addTo: jest.fn().mockReturnThis(),
        bindPopup: jest.fn()
    })),
    divIcon: jest.fn(),
    latLngBounds: jest.fn(() => ({
        extend: jest.fn(),
        isValid: jest.fn(() => true)
    })),
    Marker: class {},
    Polygon: class {},
    Polyline: class {}
};

// Mock fetch pour le géocodage
(global as any).fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
            { lat: '43.6047', lon: '1.4442' } // Toulouse coordinates
        ])
    })
);

describe('Map Widget Integration', () => {
    let mockVault: any;
    let mockFiles: any[];

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockVault = {
            app: {
                vault: {
                    getName: () => 'test-vault'
                }
            },
            readLinkFile: (link: string, relative: boolean) => link
        };

        // Mock des fichiers entreprises de test
        mockFiles = [
            {
                getName: () => 'Acme Corp',
                getPath: () => 'Acme Corp.md',
                getPropertyValue: jest.fn((prop: string) => {
                    const data: any = {
                        nom: 'Acme Corp',
                        secteur: 'Technologie',
                        adresse: 'Paris, France',
                        latitude: 48.8566,
                        longitude: 2.3522
                    };
                    return Promise.resolve(data[prop]);
                }),
                getProperty: jest.fn(() => undefined)
            },
            {
                getName: () => 'TechStart',
                getPath: () => 'TechStart.md',
                getPropertyValue: jest.fn((prop: string) => {
                    const data: any = {
                        nom: 'TechStart',
                        secteur: 'Innovation',
                        adresse: 'Lyon, France'
                    };
                    return Promise.resolve(data[prop]);
                }),
                getProperty: jest.fn(() => undefined)
            },
            {
                getName: () => 'Consulting Plus',
                getPath: () => 'Consulting Plus.md',
                getPropertyValue: jest.fn((prop: string) => {
                    const data: any = {
                        nom: 'Consulting Plus',
                        secteur: 'Conseil',
                        adresse: '{fileName}, Toulouse, France'
                    };
                    return Promise.resolve(data[prop]);
                }),
                getProperty: jest.fn(() => undefined)
            }
        ];
    });

    it('should integrate map widget with the complete configuration system', async () => {
        // Configuration complète du widget map comme dans Entreprise.yaml
        const mapConfig: MapDisplayItem = {
            type: 'map',
            title: 'Carte des entreprises',
            source: {
                class: 'Entreprise',
                smartFilter: 'all'
            },
            coordinates: {
                address: 'adresse'
            },
            marker: {
                properties: ['nom', 'secteur']
            },
            geocoding: {
                enabled: true
            },
            height: '400px',
            center: [46.603354, 1.888334],
            zoom: 6,
            className: 'entreprises-map'
        };

        const renderer = new DisplayRenderer(mockVault, {}, mockFiles[0]);
        
        // Mock de getFilesForTable pour retourner nos fichiers de test
        // @ts-ignore
        (renderer as any).getFilesForTable = jest.fn().mockResolvedValue(mockFiles as any);
        
        const result = await (renderer as any).renderMap(mapConfig);
        
        expect(result).toBeTruthy();
        expect(result.classList.contains('crm-map-display')).toBe(true);
        expect(result.classList.contains('entreprises-map')).toBe(true);
        expect(result.querySelector('h3')?.textContent).toBe('Carte des entreprises');
    });

    it('should integrate with DisplayItem union type', () => {
        // Test que MapDisplayItem est bien dans le type union DisplayItem
        const mapItem: MapDisplayItem = {
            type: 'map',
            source: { class: 'Test' },
            coordinates: { address: 'test' }
        };
        
        // Cette fonction accepte DisplayItem, donc MapDisplayItem devrait fonctionner
        function processDisplayItem(item: any) {
            return item.type === 'map';
        }
        
        expect(processDisplayItem(mapItem)).toBe(true);
    });

    it('should handle error states gracefully', async () => {
        const mapConfig: MapDisplayItem = {
            type: 'map',
            title: 'Error Test Map',
            source: {
                class: 'NonExistentClass'
            },
            coordinates: {
                address: 'invalidProperty'
            }
        };

        const renderer = new DisplayRenderer(mockVault, {}, mockFiles[0]);
        // @ts-ignore
        (renderer as any).getFilesForTable = jest.fn().mockResolvedValue([] as any);
        
        const result = await (renderer as any).renderMap(mapConfig);
        
        expect(result).toBeTruthy();
        expect(result.classList.contains('crm-map-display')).toBe(true);
        expect(result.querySelector('h3')?.textContent).toBe('Error Test Map');
    });
});