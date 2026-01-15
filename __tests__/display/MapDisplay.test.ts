import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DynamicMap } from '../../src/display/DynamicMap';
import { DisplayRenderer } from '../../src/display/DisplayRenderer';
import { MapDisplayItem } from '../../src/Config/interfaces';

// Mock Leaflet
(global as any).L = {
    map: jest.fn(() => ({
        setView: jest.fn(() => ({
            tileLayer: jest.fn(),
            addTo: jest.fn()
        })),
        remove: jest.fn(),
        invalidateSize: jest.fn(),
        fitBounds: jest.fn(),
        eachLayer: jest.fn()
    })),
    tileLayer: jest.fn(() => ({
        addTo: jest.fn()
    })),
    marker: jest.fn(() => ({
        addTo: jest.fn(() => ({
            bindPopup: jest.fn()
        })),
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

// Mock fetch for geocoding
(global as any).fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
            { lat: '48.8566', lon: '2.3522' }
        ])
    })
);

describe('Map Display Widget', () => {
    let mockVault: any;
    let mockProperties: any;
    let mockContext: any;

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

        mockProperties = {};

        mockContext = {
            getPropertyValue: jest.fn(),
            getName: () => 'Test Company',
            getPath: () => 'Test Company.md'
        };
    });

    it('should create map display item with coordinates', async () => {
        const mapItem: MapDisplayItem = {
            type: 'map',
            title: 'Test Map',
            source: {
                class: 'Entreprise'
            },
            coordinates: {
                latitude: 'latitude',
                longitude: 'longitude'
            },
            marker: {
                properties: ['nom']
            },
            height: '400px'
        };

        const renderer = new DisplayRenderer(mockVault, mockProperties, mockContext);
        
        // Mock getFilesForTable method
        // @ts-ignore
        (renderer as any).getFilesForTable = jest.fn().mockResolvedValue([mockContext] as any);
        
        // Mock property values
        mockContext.getPropertyValue.mockImplementation((prop: string) => {
            if (prop === 'latitude') return 48.8566;
            if (prop === 'longitude') return 2.3522;
            if (prop === 'nom') return 'Test Company';
            return undefined;
        });

        const result = await (renderer as any).renderMap(mapItem);
        
        expect(result).toBeTruthy();
        expect(result.classList.contains('crm-map-display')).toBe(true);
        expect(result.querySelector('h3')?.textContent).toBe('Test Map');
    });

    it('should create DynamicMap instance', () => {
        const parent = document.createElement('div');
        const options = {
            height: '400px',
            markers: []
        };

        const map = new DynamicMap(mockVault, parent, options);
        
        expect(map).toBeInstanceOf(DynamicMap);
        expect(map.getElement()).toBeTruthy();
    });
});