/**
 * @jest-environment jsdom
 *
 * Bug 7 (Tier 1) : le clic sur un lien de popup de la carte appelait
 * `this.vault.open(filePath)` — or Vault n'a PAS de méthode open (c'est
 * `vault.app.open`, utilisé correctement partout ailleurs : DynamicTable,
 * TimelineDisplay…). Le clic sur un marqueur ne faisait donc jamais rien.
 *
 * Contrat attendu : le clic sur le lien d'une popup ouvre le fichier via
 * app.open.
 */

import { DynamicMap } from '../../src/display/DynamicMap';

describe('DynamicMap - ouverture du fichier depuis la popup', () => {
    let mockVault: any;
    let container: HTMLElement;

    beforeEach(() => {
        mockVault = {
            app: {
                open: jest.fn(),
            },
        };
        container = document.createElement('div');
        document.body.appendChild(container);

        (global as any).L = {
            map: jest.fn(() => ({
                setView: jest.fn().mockReturnThis(),
                addLayer: jest.fn(),
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
    });

    afterEach(() => {
        document.body.removeChild(container);
    });

    it('le clic sur le lien de la popup appelle app.open avec le chemin du fichier', () => {
        const map = new DynamicMap(mockVault, container, {});
        map.addMarkers([
            {
                id: 'marker1',
                latitude: 48.85,
                longitude: 2.35,
                file: 'Institutions/Demo/Demo.md',
                properties: [],
                color: '#e74c3c'
            } as any
        ]);

        // Récupère le contenu passé à bindPopup
        const markerObj = (global as any).L.marker.mock.results[0].value;
        const content = markerObj.bindPopup.mock.calls[0][0] as HTMLElement;
        expect(content).toBeTruthy();

        const anchor = content.querySelector('a.map-marker-link') as HTMLElement;
        expect(anchor).toBeTruthy();

        anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

        expect(mockVault.app.open).toHaveBeenCalledWith('Institutions/Demo/Demo.md');
    });
});
