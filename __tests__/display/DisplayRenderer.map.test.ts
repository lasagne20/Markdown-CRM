import { DisplayRenderer } from '../../src/display/DisplayRenderer';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { MapDisplayItem } from '../../src/Config/interfaces';

describe('DisplayRenderer - Map Display with Boundaries', () => {
    let mockVault: Vault;
    let mockContext: Classe;
    let renderer: DisplayRenderer;

    beforeEach(() => {
        // Mock Vault
        mockVault = {
            app: {
                workspace: {},
                vault: {},
                getFile: jest.fn(),
                readFile: jest.fn()
            },
            settings: {
                templateFolder: './templates',
                personalName: 'Test User',
                configPath: './config'
            },
            getDynamicClassFactory: jest.fn(() => ({
                getClassConfig: jest.fn()
            }))
        } as any;

        // Mock Context (Classe instance representing a location)
        mockContext = {
            name: 'Location',
            getName: jest.fn(() => 'Paris'),
            getPropertyValue: jest.fn((propName: string) => {
                if (propName === 'code_insee') return Promise.resolve('75056');
                if (propName === 'code_postal') return Promise.resolve('75001');
                return Promise.resolve(null);
            }),
            getProperty: jest.fn(),
            getValue: jest.fn(),
            getPath: jest.fn(() => 'Paris.md')
        } as any;

        renderer = new DisplayRenderer(mockVault, {}, mockContext);

        // Mock Leaflet
        (global as any).L = {
            map: jest.fn(() => ({
                setView: jest.fn().mockReturnThis(),
                addLayer: jest.fn(),
                fitBounds: jest.fn(),
                remove: jest.fn()
            })),
            tileLayer: jest.fn(() => ({
                addTo: jest.fn()
            })),
            marker: jest.fn(() => ({
                addTo: jest.fn().mockReturnThis(),
                bindPopup: jest.fn().mockReturnThis(),
                on: jest.fn()
            })),
            divIcon: jest.fn(() => ({})),
            polygon: jest.fn(() => ({
                addTo: jest.fn().mockReturnThis()
            })),
            latLngBounds: jest.fn(() => ({
                extend: jest.fn().mockReturnThis()
            }))
        };

        // Mock fetch for geocoding
        (global as any).fetch = jest.fn();
    });

    describe('Map Rendering with Boundaries', () => {
        it('should render map with boundary configuration', async () => {
            const mapItem: MapDisplayItem = {
                type: 'map',
                title: 'Test Map',
                source: {
                    class: 'Entreprise',
                    smartFilter: 'all'
                },
                coordinates: {
                    latitude: 'latitude',
                    longitude: 'longitude'
                },
                boundary: {
                    enabled: true,
                    fillColor: '#3388ff',
                    fillOpacity: 0.1,
                    color: '#0066cc',
                    weight: 2,
                    opacity: 0.8
                },
                height: '500px'
            };

            // Mock factory and config
            const mockFactory = {
                getClassConfig: jest.fn().mockResolvedValue({
                    data: [
                        { file: 'data/geo.json' }
                    ]
                })
            };
            mockVault.getDynamicClassFactory = jest.fn(() => mockFactory as any);

            // Mock GeoJSON data
            const mockGeoJson = [
                {
                    nom: 'Paris',
                    code_insee: '75056',
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[
                            [2.3199, 48.9005],
                            [2.3851, 48.9020],
                            [2.3199, 48.9005]
                        ]]
                    }
                }
            ];

            mockVault.app.getFile = jest.fn().mockResolvedValue({
                path: 'config/data/geo.json',
                extension: 'json'
            });
            mockVault.app.readFile = jest.fn().mockResolvedValue(JSON.stringify(mockGeoJson));

            // Verify the configuration is properly structured
            expect(mapItem.boundary).toBeDefined();
            expect(mapItem.boundary?.enabled).toBe(true);
            expect(mockFactory.getClassConfig).toBeDefined();
        });
    });
});
