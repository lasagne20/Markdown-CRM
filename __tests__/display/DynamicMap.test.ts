import { DynamicMap } from '../../src/display/DynamicMap';
import { Vault } from '../../src/vault/Vault';

describe('DynamicMap', () => {
    let mockVault: any;
    let mockContainer: HTMLElement;

    beforeEach(() => {
        // Mock Vault
        mockVault = {
            app: {
                workspace: {},
                vault: {}
            },
            open: jest.fn()
        };

        // Mock container
        mockContainer = document.createElement('div');
        document.body.appendChild(mockContainer);

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
                extend: jest.fn().mockReturnThis(),
                isValid: jest.fn(() => true)
            }))
        };
    });

    afterEach(() => {
        document.body.removeChild(mockContainer);
    });

    describe('Constructor and Initialization', () => {
        it('should create a map instance with default options', () => {
            const map = new DynamicMap(mockVault, mockContainer, {
                markers: [],
                center: [48.8566, 2.3522],
                zoom: 12
            });

            expect((global as any).L.map).toHaveBeenCalledWith(
                expect.any(HTMLElement)
            );
            
            // Verify setView was called with correct parameters
            const mockMap = (global as any).L.map.mock.results[0].value;
            expect(mockMap.setView).toHaveBeenCalledWith([48.8566, 2.3522], 12);
        });

        it('should create a map with custom height and width', () => {
            const map = new DynamicMap(mockVault, mockContainer, {
                markers: [],
                height: '600px',
                width: '100%'
            });

            const mapElement = mockContainer.querySelector('.dynamic-map') as HTMLElement;
            expect(mapElement).toBeTruthy();
            expect(mapElement.style.height).toBe('600px');
            expect(mapElement.style.width).toBe('100%');
        });
    });

    describe('Markers', () => {
        it('should add markers with correct coordinates', () => {
            const markers = [
                {
                    id: 'marker1',
                    latitude: 48.8566,
                    longitude: 2.3522,
                    file: 'test.md',
                    properties: [],
                    color: '#e74c3c'
                }
            ];

            const map = new DynamicMap(mockVault, mockContainer, {});
            map.addMarkers(markers);

            expect((global as any).L.marker).toHaveBeenCalledWith(
                [48.8566, 2.3522],
                expect.any(Object)
            );
        });

        it('should create custom colored markers', () => {
            const markers = [
                {
                    id: 'marker1',
                    latitude: 48.8566,
                    longitude: 2.3522,
                    file: 'test.md',
                    properties: [],
                    color: '#3498db'
                }
            ];

            const map = new DynamicMap(mockVault, mockContainer, {});
            map.addMarkers(markers);

            expect((global as any).L.divIcon).toHaveBeenCalledWith(
                expect.objectContaining({
                    html: expect.stringContaining('#3498db')
                })
            );
        });

        it('should handle markers with properties', () => {
            const markers = [
                {
                    id: 'marker1',
                    latitude: 48.8566,
                    longitude: 2.3522,
                    file: 'test.md',
                    properties: [
                        { label: 'Nom', value: 'Test Location', isFile: false },
                        { label: 'Secteur', value: 'Technology', isFile: false }
                    ],
                    color: '#e74c3c'
                }
            ];

            const map = new DynamicMap(mockVault, mockContainer, {});
            map.addMarkers(markers);

            const marker = (global as any).L.marker.mock.results[0].value;
            expect(marker.bindPopup).toHaveBeenCalled();
        });
    });

    describe('Polygons/Boundaries', () => {
        it('should add a polygon with coordinates', () => {
            const map = new DynamicMap(mockVault, mockContainer, {
                markers: [],
                center: [48.8566, 2.3522],
                zoom: 12
            });

            const coordinates: [number, number][] = [
                [48.9005, 2.3199],
                [48.9020, 2.3851],
                [48.8984, 2.3949],
                [48.8871, 2.3988],
                [48.9005, 2.3199] // Close the polygon
            ];

            map.addPolygon(coordinates, {
                fillColor: '#3388ff',
                fillOpacity: 0.1,
                color: '#0066cc',
                weight: 2,
                opacity: 0.8
            });

            expect((global as any).L.polygon).toHaveBeenCalledWith(
                coordinates,
                expect.objectContaining({
                    fillColor: '#3388ff',
                    fillOpacity: 0.1,
                    color: '#0066cc',
                    weight: 2,
                    opacity: 0.8
                })
            );
        });

        it('should use default polygon styles when not specified', () => {
            const map = new DynamicMap(mockVault, mockContainer, {
                markers: [],
                center: [48.8566, 2.3522],
                zoom: 12
            });

            const coordinates: [number, number][] = [
                [48.9005, 2.3199],
                [48.9020, 2.3851],
                [48.9005, 2.3199]
            ];

            map.addPolygon(coordinates);

            expect((global as any).L.polygon).toHaveBeenCalledWith(
                coordinates,
                expect.objectContaining({
                    fillColor: '#3388ff',
                    fillOpacity: 0.2,
                    color: '#3388ff',
                    weight: 3,
                    opacity: 1
                })
            );
        });
    });

    describe('Auto Bounds Fitting', () => {
        it('should fit bounds to include all markers', () => {
            // Add eachLayer method to mock map
            const mockLayers: any[] = [];
            (global as any).L.map = jest.fn(() => ({
                setView: jest.fn().mockReturnThis(),
                addLayer: jest.fn((layer: any) => {
                    mockLayers.push(layer);
                }),
                fitBounds: jest.fn(),
                remove: jest.fn(),
                eachLayer: jest.fn((callback: any) => {
                    mockLayers.forEach(callback);
                })
            }));
            
            // Mock Marker class
            (global as any).L.Marker = class {
                getLatLng() { return {}; }
            };
            
            const markers = [
                { id: '1', latitude: 48.8566, longitude: 2.3522, file: 'test1.md', properties: [], color: '#e74c3c' },
                { id: '2', latitude: 48.8606, longitude: 2.3376, file: 'test2.md', properties: [], color: '#3498db' },
                { id: '3', latitude: 48.8529, longitude: 2.3499, file: 'test3.md', properties: [], color: '#2ecc71' }
            ];

            const map = new DynamicMap(mockVault, mockContainer, {});
            map.addMarkers(markers);
            map.fitBoundsToFeatures();

            expect((global as any).L.latLngBounds).toHaveBeenCalled();
        });
    });

    describe('Click Handlers', () => {
        it('should handle marker clicks to open files', () => {
            const markers = [
                {
                    id: 'marker1',
                    latitude: 48.8566,
                    longitude: 2.3522,
                    file: 'test.md',
                    properties: [],
                    color: '#e74c3c'
                }
            ];

            const map = new DynamicMap(mockVault, mockContainer, {});
            map.addMarkers(markers);

            const marker = (global as any).L.marker.mock.results[0].value;
            // The actual implementation uses 'popupopen' event, not 'click'
            expect(marker.on).toHaveBeenCalledWith('popupopen', expect.any(Function));
        });
    });
});
