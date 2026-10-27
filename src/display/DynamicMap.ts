// @ts-nocheck
// Note: leaflet functionality disabled due to missing types
// @ts-ignore - Leaflet types not available  
declare var L: any;

import { Vault } from '../vault/Vault';
import { Classe } from '../vault/Classe';
import { MapDisplayItem } from '../Config/interfaces';
import { PropertyNavigator } from '../utils/PropertyNavigator';

export interface DynamicMapMarker {
    lat: number;
    lng: number;
    title?: string;
    description?: string;
}

export interface DynamicMapOptions {
    markers?: DynamicMapMarker[];
    center?: [number, number];
    zoom?: number;
    height?: string;
    width?: string;
}

export class DynamicMap {
    private map: L.Map;
    private container: HTMLDivElement;
    private vault: Vault;

    /**
     * Create a DynamicMap from a MapDisplayItem configuration
     */
    static async fromConfig(
        item: MapDisplayItem,
        vault: Vault,
        parent: HTMLElement,
        files: Classe[],
        context?: Classe
    ): Promise<DynamicMap> {
        const propertyNavigator = new PropertyNavigator(vault, context);

        // Load geo.json entries once (coordinate source for locationProperty
        // resolution and boundary display)
        const geoEntries = await DynamicMap.loadGeoEntries(vault, item);

        // Convert files to markers
        const markers = await DynamicMap.convertFilesToMarkers(files, item, vault, propertyNavigator, geoEntries);
        
        // Create map options
        const mapOptions = {
            markers,
            center: item.center,
            zoom: item.zoom,
            height: item.height,
            width: item.width
        };
        
        // Create map instance
        const map = new DynamicMap(vault, parent, mapOptions);
        
        // Add markers
        if (markers.length > 0) {
            map.addMarkers(markers);
        }
        
        // Add boundary if configured and context is available
        if (item.boundary?.enabled && context) {
            await map.loadAndAddBoundary(item, context, geoEntries);
        }
        
        // Fit bounds if no center specified
        if (!item.center && markers.length > 0) {
            setTimeout(() => map.fitBoundsToFeatures(), 100);
        }
        
        return map;
    }

    /**
     * Load the geo.json entries used as the coordinate source. Sources: the
     * explicit `coordinates.geoFile` item option, then the `data` sources of
     * the Lieu class config containing "geo.json".
     */
    static async loadGeoEntries(vault: Vault, item?: MapDisplayItem): Promise<any[]> {
        const sources: string[] = [];
        if (item?.coordinates?.geoFile) {
            sources.push(item.coordinates.geoFile);
        }
        try {
            const factory = vault.getDynamicClassFactory?.();
            const config = factory ? await factory.getClassConfig?.('Lieu') : null;
            for (const dataSource of config?.data ?? []) {
                if (dataSource.file && dataSource.file.includes('geo.json') && !sources.includes(dataSource.file)) {
                    sources.push(dataSource.file);
                }
            }
        } catch (error) {
            console.warn('Error reading Lieu class config for geo data:', error);
        }

        for (const source of sources) {
            try {
                const configPath = vault.settings?.configPath || './config';
                const file = await vault.app.getFile(`${configPath}/${source}`);
                if (!file) {
                    console.warn(`Geo data file not found: ${configPath}/${source}`);
                    continue;
                }
                if (!('extension' in file)) {
                    console.warn(`Geo data path is a folder, not a file: ${configPath}/${source}`);
                    continue;
                }
                const fileContent = await vault.app.readFile(file);
                const data = JSON.parse(fileContent);
                if (Array.isArray(data)) {
                    return data;
                }
                if (data.features) {
                    // GeoJSON FeatureCollection: flatten properties + geometry
                    return data.features.map((f: any) => ({
                        ...f.properties,
                        geometry: f.geometry
                    }));
                }
            } catch (error) {
                console.warn(`Error loading geo data from ${source}:`, error);
            }
        }
        return [];
    }

    /**
     * Resolve the coordinates of a file via its location property: the path
     * resolves to a Lieu (commune or institution); its name is looked up in
     * the geo.json entries. If the target has no coordinates (an institution
     * for example), walk up the parent chain by appending `.parent` hops.
     */
    private static async resolveLocationCoords(
        file: Classe,
        locationProperty: string,
        propertyNavigator: PropertyNavigator,
        geoEntries: any[]
    ): Promise<{ lat: number; lng: number } | null> {
        const geoByName = new Map<string, any>();
        for (const entry of geoEntries) {
            if (typeof entry?.latitude === 'number' && typeof entry?.longitude === 'number' && entry.nom) {
                geoByName.set(entry.nom, entry);
            }
        }

        let path = locationProperty;
        for (let hop = 0; hop <= 5; hop++) {
            let value: any;
            try {
                value = await propertyNavigator.getNestedProperty(file, path);
            } catch (error) {
                return null;
            }
            if (value === undefined || value === null || value === '') {
                return null;
            }

            // Extract the target name from a [[link]], a Classe or a plain string
            let name: string | null = null;
            if (typeof value === 'string') {
                const match = value.match(/^\[\[(.+)\]\]$/);
                name = match ? match[1] : value;
            } else if (typeof value.getName === 'function') {
                name = value.getName();
            }
            if (!name) {
                return null;
            }

            const entry = geoByName.get(name);
            if (entry) {
                return { lat: entry.latitude, lng: entry.longitude };
            }

            // No coordinates for this Lieu: walk up to its parent
            path = `${path}.parent`;
        }
        return null;
    }

    /**
     * Convert files to map markers with geocoding support
     */
    private static async convertFilesToMarkers(
        files: Classe[],
        item: MapDisplayItem,
        vault: Vault,
        propertyNavigator: PropertyNavigator,
        geoEntries?: any[]
    ): Promise<any[]> {
        const markers: any[] = [];
        
        // Color mapping for non-SelectProperty values
        const colorMap = new Map<string, string>();
        const defaultColors = [
            '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
            '#1abc9c', '#e67e22', '#34495e', '#16a085', '#c0392b',
            '#2980b9', '#8e44ad', '#27ae60', '#d35400', '#2c3e50'
        ];
        
        for (const file of files) {
            try {
                let lat: number | undefined;
                let lng: number | undefined;
                
                // Try to get coordinates directly from properties
                if (item.coordinates.latitude && item.coordinates.longitude) {
                    const latValue = await file.getPropertyValue(item.coordinates.latitude);
                    const lngValue = await file.getPropertyValue(item.coordinates.longitude);
                    
                    if (typeof latValue === 'number' && typeof lngValue === 'number') {
                        lat = latValue;
                        lng = lngValue;
                    }
                }
                
                // If no direct coordinates, try geocoding from address
                if ((lat === undefined || lng === undefined) && item.coordinates.address) {
                    const addressValue = await file.getPropertyValue(item.coordinates.address);
                    if (addressValue) {
                        // Support {fileName} placeholder in address
                        const finalAddress = String(addressValue).replace('{fileName}', file.getName());
                        
                        if (item.geocoding?.enabled !== false) {
                            const geocoded = await DynamicMap.geocodeAddress(finalAddress);
                            if (geocoded) {
                                lat = geocoded.lat;
                                lng = geocoded.lng;
                            }
                        }
                    }
                }
                
                // If no direct coordinates, resolve the location property: the
                // file's Lieu (commune/institution) with coordinates from geo.json
                if ((lat === undefined || lng === undefined) && item.coordinates.locationProperty && geoEntries && geoEntries.length > 0) {
                    const resolved = await DynamicMap.resolveLocationCoords(
                        file, item.coordinates.locationProperty, propertyNavigator, geoEntries
                    );
                    if (resolved) {
                        lat = resolved.lat;
                        lng = resolved.lng;
                    }
                }

                // Skip if no coordinates found
                if (lat === undefined || lng === undefined) {
                    continue;
                }
                
                // Get properties to display
                const propertiesToDisplay: Array<{ label: string; value: any; isFile: boolean }> = [];
                if (item.marker?.properties && item.marker.properties.length > 0) {
                    for (const propConfig of item.marker.properties) {
                        try {
                            const propPath = typeof propConfig === 'string' ? propConfig : propConfig.property;
                            const label = typeof propConfig === 'object' && propConfig.label ? propConfig.label : propPath;

                            const value = propPath === '_fileName'
                                ? file.getName()
                                : await propertyNavigator.getNestedProperty(file, propPath);
                            if (value !== undefined && value !== null) {
                                const isFile = typeof value === 'string' && (
                                    value.includes('[[') && value.includes(']]') ||
                                    value.endsWith('.md')
                                );
                                
                                propertiesToDisplay.push({
                                    label: label,
                                    value: value,
                                    isFile: isFile
                                });
                            }
                        } catch (error) {
                            const propPath = typeof propConfig === 'string' ? propConfig : propConfig.property;
                            console.warn(`Error getting property ${propPath}:`, error);
                        }
                    }
                }
                    
                // Get color from colorProperty
                let color = '#2c3e50';
                
                if (item.marker?.colorProperty) {
                    const colorValue = await file.getPropertyValue(item.marker.colorProperty);
                    const property = file.getProperty(item.marker.colorProperty);
                    
                    if (property && property.type === 'select') {
                        const selectProp = property as any;
                        if (selectProp.options) {
                            const option = selectProp.options.find((opt: any) => opt.name === colorValue);
                            if (option && option.color) {
                                color = option.color;
                            }
                        }
                    } else if (colorValue !== undefined && colorValue !== null) {
                        const valueKey = String(colorValue);
                        if (!colorMap.has(valueKey)) {
                            const colorIndex = colorMap.size % defaultColors.length;
                            colorMap.set(valueKey, defaultColors[colorIndex]);
                        }
                        color = colorMap.get(valueKey) || '#2c3e50';
                    }
                }
                
                markers.push({
                    id: file.getPath(),
                    latitude: lat,
                    longitude: lng,
                    file: file.getPath(),
                    properties: propertiesToDisplay,
                    color: color
                });
                
            } catch (error) {
                console.warn(`Error processing file for map: ${file.getName()}`, error);
            }
        }
        
        return markers;
    }

    /**
     * Geocode address using OpenStreetMap Nominatim API
     */
    private static async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
        try {
            const encodedAddress = encodeURIComponent(address);
            const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`;
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Markdown-CRM-Map-Widget/1.0'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Geocoding failed: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && data.length > 0) {
                const result = data[0];
                return {
                    lat: parseFloat(result.lat),
                    lng: parseFloat(result.lon)
                };
            }
            
            return null;
        } catch (error) {
            console.warn(`Geocoding failed for address "${address}":`, error);
            return null;
        }
    }

    constructor(
        vault: Vault,
        parent: HTMLElement,
        options: DynamicMapOptions = {}
    ) {
        this.vault = vault;
        // Use standard createElement instead of createDiv
        this.container = document.createElement('div');
        parent.appendChild(this.container);
        this.container.className = "dynamic-map";
        this.container.style.height = options.height ?? "800px";
        this.container.style.width = options.width ?? "100%";
        this.container.style.marginTop = "1em";
        this.initializeMap(options);
    }

    private initializeMap(options: DynamicMapOptions) {
        if (this.map) {
            this.map.remove();
        }
        const center = options.center ?? [46.603354, 1.888334];
        const zoom = options.zoom ?? 6;
        this.map = L.map(this.container).setView(center, zoom);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(this.map);

 

        // Invalidate map size whenever the container is shown
        const observer = new MutationObserver(() => {
            if (this.container.offsetParent !== null) {
            this.map?.invalidateSize();
            }
        });
        observer.observe(this.container, { attributes: true, attributeFilter: ['style', 'class'] });

        // Initial invalidate in case it's already visible
        setTimeout(() => {
            this.map?.invalidateSize();
        }, 3000);

        // Invalidate map size on first mousemove
        const handleFirstMouseMove = () => {
            this.map?.invalidateSize();
            this.container.removeEventListener('mousemove', handleFirstMouseMove);
        };
        this.container.addEventListener('mousemove', handleFirstMouseMove);
    }

    public getElement(): HTMLElement {
        return this.container;
    }

    public addMarkers(points: {
        id: string;
        longitude: number;
        latitude: number;
        file: string;
        properties?: Array<{ label: string; value: any; isFile: boolean }>;
        color?: string;
    }[]) {
        if (!this.map) return;
        points.forEach(point => {
            if (point.latitude === undefined || point.longitude === undefined) {
                return;
            }
            const marker = L.marker([point.latitude, point.longitude], {
                icon: L.divIcon({
                    className: "crm-map-marker",
                    html: `
                        <div style="
                            width: 22px; height: 22px; border-radius: 50%;
                            background-color: ${point.color ?? '#2c3e50'};
                            border: 2px solid rgba(255, 255, 255, 0.9);
                            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
                        "></div>
                    `,
                    iconSize: [22, 22],
                    iconAnchor: [11, 11],
                    popupAnchor: [0, -12],
                })
            }).addTo(this.map!);

            // Build popup content from properties
            let popupContent = '';
            if (point.properties && point.properties.length > 0) {
                // First property as title (clickable link to main file)
                const firstProp = point.properties[0];
                popupContent += `<div style="margin-bottom: 8px; border-bottom: 1px solid var(--background-modifier-border, #ddd); padding-bottom: 6px;"><strong><a href="#" class="map-marker-link" data-file="${point.file}" style="color: ${point.color ?? '#2c3e50'}; text-decoration: none; font-weight: bold; font-size: 1.1em;">${this.formatValue(firstProp.value)}</a></strong></div>`;

                // Remaining properties as a labelled grid
                if (point.properties.length > 1) {
                    popupContent += '<div style="font-size: 0.95em; display: grid; grid-template-columns: auto auto; gap: 4px 12px; align-items: baseline;">';
                    for (let i = 1; i < point.properties.length; i++) {
                        const prop = point.properties[i];
                        popupContent += `<span style="color: var(--text-muted, #666);">${prop.label}</span>`;

                        // If it's a file property, make it clickable
                        if (prop.isFile) {
                            const filePath = this.extractFilePath(prop.value);
                            popupContent += `<span><a href="#" class="map-property-link" data-file="${filePath}" style="color: ${point.color ?? '#2c3e50'}; text-decoration: underline;">${this.formatValue(prop.value)}</a></span>`;
                        } else {
                            popupContent += `<span>${this.formatValue(prop.value)}</span>`;
                        }
                    }
                    popupContent += '</div>';
                }
            } else {
                // Fallback: just file name
                const fileName = point.file.split('/').pop()?.replace('.md', '') || point.file;
                popupContent = `<strong><a href="#" class="map-marker-link" data-file="${point.file}" style="color: ${point.color ?? '#2c3e50'}; text-decoration: none; font-weight: bold;">${fileName}</a></strong>`;
            }
            
            const popup = marker.bindPopup(popupContent);
            
            // Add click handlers to open files using vault.open()
            marker.on('popupopen', () => {
                // Main file link
                const mainLink = popup.getElement()?.querySelector('.map-marker-link');
                if (mainLink) {
                    mainLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        const filePath = (e.target as HTMLElement).getAttribute('data-file');
                        if (filePath && this.vault.open) {
                            this.vault.open(filePath);
                        }
                    });
                }
                
                // Property file links
                const propertyLinks = popup.getElement()?.querySelectorAll('.map-property-link');
                if (propertyLinks) {
                    propertyLinks.forEach(link => {
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            const filePath = (e.target as HTMLElement).getAttribute('data-file');
                            if (filePath && this.vault.open) {
                                this.vault.open(filePath);
                            }
                        });
                    });
                }
            });
        });
        
    }

    private extractFilePath(value: string): string {
        // Extract file path from [[FileName]] format
        const match = value.match(/\[\[([^\]]+)\]\]/);
        if (match) {
            return match[1] + '.md';
        }
        // Already a .md file
        if (value.endsWith('.md')) {
            return value;
        }
        return value;
    }

    private formatValue(value: any): string {
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    }

    /**
     * Load and add boundary polygon to the map
     */
    private async loadAndAddBoundary(item: MapDisplayItem, context: Classe, geoEntries?: any[]): Promise<void> {
        try {
            // A contour can be made of several rings (MultiPolygon: islands...)
            let boundaryRings: [number, number][][] | null = null;
            let boundaryTarget: Classe | null = context;

            // Try to get boundary from property
            if (item.boundary!.property) {
                const coords = await context.getPropertyValue(item.boundary!.property);
                if (coords && Array.isArray(coords)) {
                    // Legacy: direct coordinate array (single ring)
                    boundaryRings = [coords];
                } else if (typeof coords === 'string' && coords.match(/^\[\[.+\]\]$/)) {
                    // Property pointing to a Lieu (e.g. the partenariat's "lieu"):
                    // display that Lieu's geo.json contour instead of the context's
                    try {
                        const lieu = await this.vault.getFromLink(coords);
                        if (lieu) {
                            boundaryTarget = lieu;
                        }
                    } catch (error) {
                        console.warn(`Error resolving boundary lieu ${coords}:`, error);
                    }
                }
            }

            // Load the contour from the geo.json data
            if (!boundaryRings && boundaryTarget && geoEntries && geoEntries.length > 0) {
                boundaryRings = await this.findBoundaryForContext(geoEntries, boundaryTarget);
            }

            // Add polygons to map if coordinates found
            if (boundaryRings && boundaryRings.length > 0) {
                for (const ring of boundaryRings) {
                    this.addPolygon(ring, {
                        fillColor: item.boundary!.fillColor,
                        fillOpacity: item.boundary!.fillOpacity,
                        color: item.boundary!.color,
                        weight: item.boundary!.weight,
                        opacity: item.boundary!.opacity,
                        dashArray: item.boundary!.dashArray
                    });
                }
            }
        } catch (error) {
            console.warn('Error adding boundary to map:', error);
        }
    }

    /**
     * Find boundary coordinates for context from GeoJSON data.
     * Returns ALL rings of the contour (a MultiPolygon draws every polygon,
     * e.g. islands), each ring as [lat, lng] pairs for Leaflet.
     */
    private async findBoundaryForContext(geoData: any, context: Classe): Promise<[number, number][][] | null> {
        // [lng, lat] GeoJSON ring -> [lat, lng] Leaflet ring
        const toLeafletRing = (ring: number[][]): [number, number][] =>
            ring.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
        // geometry -> list of outer rings
        const geometryToRings = (geometry: any): [number, number][][] | null => {
            if (!geometry?.coordinates) return null;
            if (geometry.type === 'Polygon') {
                return [toLeafletRing(geometry.coordinates[0])];
            }
            if (geometry.type === 'MultiPolygon') {
                // One ring per polygon: no island left behind
                return geometry.coordinates.map((poly: number[][][]) => toLeafletRing(poly[0]));
            }
            return null;
        };

        try {
            // Support both FeatureCollection format and array format
            let features = geoData;
            if (geoData.features) {
                features = geoData.features;
            } else if (!Array.isArray(geoData)) {
                features = [geoData];
            }

            // Try to match by nom, code_insee, or code_postal.
            // Codes are only compared when the target actually has one:
            // `undefined === undefined` would otherwise match any entry
            // without codes (e.g. the first département with a geometry).
            const contextNom = context.getName();
            const codeInsee = await context.getPropertyValue?.('code_insee');
            const codePostal = await context.getPropertyValue?.('code_postal');
            const matchesEntry = (nom: any, insee: any, postal: any): boolean =>
                (nom !== undefined && nom === contextNom) ||
                (codeInsee !== undefined && insee === codeInsee) ||
                (codePostal !== undefined && postal === codePostal);

            for (const item of features) {
                // For array format, check direct properties
                if (matchesEntry(item.nom, item.code_insee, item.code_postal)) {
                    const rings = geometryToRings(item.geometry);
                    if (rings) {
                        return rings;
                    }
                }

                // For FeatureCollection format
                if (item.properties) {
                    const props = item.properties;
                    if (matchesEntry(props.nom ?? props.name, props.code_insee, props.postal_code ?? props.code_postal)) {
                        const rings = geometryToRings(item.geometry);
                        if (rings) {
                            return rings;
                        }
                    }
                }
            }

            return null;
        } catch (error) {
            console.warn('Error finding boundary for context:', error);
            return null;
        }
    }

    public addPolygon(
        coords: [number, number][],
        options?: {
            fillColor?: string;
            fillOpacity?: number;
            color?: string;
            weight?: number;
            opacity?: number;
            dashArray?: string;
        }
    ) {
        if (!this.map) return;
        const polygon = L.polygon(coords, {
            fillColor: options?.fillColor ?? "#3388ff",
            fillOpacity: options?.fillOpacity ?? 0.2,
            color: options?.color ?? "#3388ff",
            weight: options?.weight ?? 3,
            opacity: options?.opacity ?? 1.0,
            dashArray: options?.dashArray ?? undefined,
        }).addTo(this.map);
        return polygon;
    }

    public fitBoundsToFeatures() {
        if (!this.map) return;
        const bounds = L.latLngBounds([]);

        this.map.eachLayer((layer: any) => {
            // Markers
            if (layer instanceof L.Marker && typeof layer.getLatLng === "function") {
                const latlng = layer.getLatLng();
                if (latlng && typeof latlng.lat === "number" && typeof latlng.lng === "number") {
                    bounds.extend(latlng);
                }
            }
            // Polygons/Polylines
            if ((layer instanceof L.Polygon || layer instanceof L.Polyline) && typeof (layer as any).getBounds === "function") {
                const layerBounds = (layer as L.Polygon).getBounds();
                if (layerBounds && layerBounds.isValid && layerBounds.isValid()) {
                    bounds.extend(layerBounds);
                }
            }
        });

        if (bounds.isValid()) {
            this.map.fitBounds(bounds, { animate: true, padding: [20, 20], maxZoom: 9 });
        }
    }

    public destroy() {
        if (this.map) {
            this.map.remove();
        }
        this.container.remove();
    }
}