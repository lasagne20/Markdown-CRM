import * as L from "leaflet";



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
    getElement(): any {
      throw new Error('Method not implemented.');
    }
    private map: L.Map;
    private container: HTMLDivElement;
    private vault: any; // Replace with actual type if available
 
    constructor(
        vault: any,
        parent: HTMLElement,
        options: DynamicMapOptions = {}
    ) {
        this.vault = vault;
        this.container = parent.createDiv();
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

        (options.markers ?? []).forEach(({ lat, lng, title, description }) => {
            L.marker([lat, lng])
                .addTo(this.map!)
                .bindPopup(
                    `<strong>${title ?? ""}</strong><br>${description ?? ""}`
                );
        });

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

    public addMarkers(points: {
        id: string;
        longitude: number;
        latitude: number;
        file: string;
        label: string;
        color?: string;
        link?: string;
    }[]) {
        if (!this.map) return;
        points.forEach(point => {
            if (point.latitude === undefined || point.longitude === undefined) {
                return;
            }
            const marker = L.marker([point.latitude, point.longitude], {
                icon: L.divIcon({
                    className: "custom-lucide-marker",
                    html: `
                        <span style="display: flex; align-items: center; justify-content: center; width: 28px; height: 34px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="34" viewBox="0 0 24 34" fill="none">
                                <path d="M12 2C7.03 2 3 6.03 3 11c0 7.25 8.25 19 8.25 19s8.25-11.75 8.25-19c0-4.97-4.03-9-9-9zm0 13.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z" fill="${point.color ?? '#2c3e50'}"/>
                            </svg>
                        </span>
                    `,
                    iconSize: [28, 34],
                    iconAnchor: [14, 34],
                    popupAnchor: [0, -34],
                })
            }).addTo(this.map!);
        
            let popupContent = `<strong>${point.label}</strong>`;
            if (point.link) {
                popupContent += `<br><a href="obsidian://open?vault=${this.vault.app.vault.getName()}&file=${encodeURIComponent(this.vault.readLinkFile(point.link, true))}" target="_blank">Lien</a>`;
            }
            marker.bindPopup(popupContent);
        });
        
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

        this.map.eachLayer(layer => {
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