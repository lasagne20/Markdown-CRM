# Map Widget Configuration

The Map widget provides interactive geographical visualization of your data with markers, custom colors, and boundary polygons. Built on Leaflet, it allows you to display your class instances on an interactive map with rich popups and automatic geocoding.

## Table of Contents

- [Basic Structure](#basic-structure)
- [Configuration Options](#configuration-options)
  - [Source Configuration](#source-configuration)
  - [Coordinates Configuration](#coordinates-configuration)
  - [Marker Configuration](#marker-configuration)
  - [Map Display Options](#map-display-options)
  - [Boundary Configuration](#boundary-configuration)
  - [Geocoding](#geocoding)
- [Complete Examples](#complete-examples)
- [DynamicMap API](#dynamicmap-api)

## Basic Structure

The map widget is defined as a display item in your class YAML configuration:

```yaml
display:
  items:
    - type: map
      title: "Carte des lieux"
      source:
        class: Lieu
      coordinates:
        latitude: latitude
        longitude: longitude
      marker:
        properties: ['nom', 'type']
```

## Configuration Options

### Source Configuration

Defines which data to display on the map. Uses the same filtering system as tables and number displays.

```yaml
source:
  class: Entreprise              # Class name to display
  smartFilter: all               # Optional: 'all', 'children', 'parent', 'siblings', 'roots'
  conditions:                    # Optional: filter conditions
    - property: statut
      operator: equals
      value: Actif
```

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `class` | string | ✅ | Name of the class to display |
| `smartFilter` | string | ❌ | Filter type: `all`, `children`, `parent`, `siblings`, `roots` |
| `conditions` | array | ❌ | Array of condition objects for filtering |

### Coordinates Configuration

Specifies how to get location data for each instance. You can use direct coordinates or addresses for geocoding.

**Option 1: Direct Coordinates**

```yaml
coordinates:
  latitude: latitude    # Property name containing latitude
  longitude: longitude  # Property name containing longitude
```

**Option 2: Address (with Geocoding)**

```yaml
coordinates:
  address: adresse     # Property name containing the address
geocoding:
  enabled: true        # Enable automatic geocoding
```

**Option 3: Mixed (Fallback)**

```yaml
coordinates:
  latitude: latitude
  longitude: longitude
  address: adresse     # Used if lat/lng are missing
geocoding:
  enabled: true
```

**Special Placeholder: `{fileName}`**

The address property supports a special `{fileName}` placeholder that will be replaced with the note's filename:

```yaml
# In your note's frontmatter:
adresse: "{fileName}, 31000 Toulouse, France"
# If the file is named "Acme Corp.md", this becomes:
# "Acme Corp, 31000 Toulouse, France"
```

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `latitude` | string | ❌* | Name of the property containing latitude |
| `longitude` | string | ❌* | Name of the property containing longitude |
| `address` | string | ❌* | Name of the property containing the address |

*At least one of `latitude`/`longitude` pair or `address` must be specified.

### Marker Configuration

Customizes how markers appear on the map, including which properties to display and coloring.

```yaml
marker:
  properties: ['nom', 'secteur', 'ville']  # Properties to show in popup
  colorProperty: type                      # Property for marker color
```

You can also specify custom labels for properties:

```yaml
marker:
  properties:
    - property: nom
      label: "Nom de l'entreprise"
    - property: secteur
    - ville  # No custom label, uses property name
  colorProperty: type
```

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `properties` | array | ❌ | List of properties to display in marker popup (string or object with property/label) |
| `colorProperty` | string | ❌ | Property name to use for marker coloring |

**Marker Popup Behavior:**
- First property is displayed as a **bold, clickable title** that opens the note
- Remaining properties are shown as a list: `label: value`
- File/link properties are automatically made clickable
- If no properties are specified, only the filename is shown

### Map Display Options

Customize the map's appearance and default view.

```yaml
center: [46.603354, 1.888334]  # Default center [latitude, longitude]
zoom: 6                        # Default zoom level (1-18)
height: "500px"                # Map height
width: "100%"                  # Map width
className: "custom-map"        # CSS class for styling
title: "Carte des entreprises" # Title displayed above the map
```

**Properties:**

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `center` | array | ❌ | `[46.603354, 1.888334]` | Default map center `[lat, lng]` |
| `zoom` | number | ❌ | `6` | Default zoom level (1-18) |
| `height` | string | ❌ | `"400px"` | CSS height value |
| `width` | string | ❌ | `"100%"` | CSS width value |
| `className` | string | ❌ | - | Custom CSS class |
| `title` | string | ❌ | - | Widget title |

### Boundary Configuration

Display geographical boundaries/polygons around locations (e.g., city limits, territories).

```yaml
boundary:
  enabled: true              # Show boundary polygon
  fillColor: "#3388ff"       # Fill color
  fillOpacity: 0.1           # Fill opacity (0-1)
  color: "#0066cc"           # Border color
  weight: 2                  # Border width in pixels
  opacity: 0.8               # Border opacity (0-1)
  dashArray: "5, 10"         # Optional: dashed line pattern
```

**Data Source:**

Boundaries are loaded from `data/geo.json` in your vault. The system automatically matches boundaries by:
1. Property `nom` (name)
2. Property `code_insee` (INSEE code for French communes)
3. Property `code_postal` (postal code)

**GeoJSON Format:**

```json
{
  "type": "Feature",
  "properties": {
    "nom": "Paris",
    "code_insee": "75056",
    "code_postal": "75001"
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[2.224122, 48.815573], ...]]
  }
}
```

Supports both `Polygon` and `MultiPolygon` geometry types.

**Properties:**

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `enabled` | boolean | ✅ | - | Enable boundary display |
| `fillColor` | string | ❌ | `"#3388ff"` | Polygon fill color (hex) |
| `fillOpacity` | number | ❌ | `0.2` | Fill opacity (0-1) |
| `color` | string | ❌ | `"#3388ff"` | Border color (hex) |
| `weight` | number | ❌ | `3` | Border width in pixels |
| `opacity` | number | ❌ | `1` | Border opacity (0-1) |
| `dashArray` | string | ❌ | - | Dash pattern (e.g., `"5, 10"`) |

### Geocoding

Enable automatic geocoding to convert addresses to coordinates using OpenStreetMap Nominatim.

```yaml
geocoding:
  enabled: true
```

**How it works:**
1. If a file has `latitude` and `longitude` properties, they are used directly
2. If coordinates are missing, the `address` property is geocoded
3. Results are cached during the session to minimize API calls
4. The `{fileName}` placeholder is replaced before geocoding

**Rate Limiting:**

The Nominatim API has usage limits. The system automatically:
- Adds a 1-second delay between geocoding requests
- Skips files without valid addresses
- Caches results to avoid repeated requests

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `enabled` | boolean | ✅ | Enable automatic geocoding |

## Complete Examples

### Example 1: Business Locations Map

Display all businesses on a map with color-coded markers by sector:

```yaml
# Entreprise.yaml
display:
  items:
    - type: map
      title: "Carte des entreprises"
      source:
        class: Entreprise
        smartFilter: all
      coordinates:
        address: adresse
      marker:
        properties:
          - property: nom
            label: "Entreprise"
          - secteur
          - ville
        colorProperty: secteur
      geocoding:
        enabled: true
      height: "600px"
      zoom: 6
      className: "business-map"
```

### Example 2: City Map with Boundaries

Display cities with their administrative boundaries:

```yaml
# Lieu.yaml
display:
  items:
    - type: map
      title: "Villes de France"
      source:
        class: Lieu
        conditions:
          - property: type
            operator: equals
            value: Ville
      coordinates:
        latitude: latitude
        longitude: longitude
      marker:
        properties: ['nom', 'population', 'departement']
      boundary:
        enabled: true
        fillColor: "#3388ff"
        fillOpacity: 0.1
        color: "#0066cc"
        weight: 2
        opacity: 0.8
      center: [46.603354, 1.888334]
      zoom: 6
      height: "500px"
```

### Example 3: Address with Filename Placeholder

When you have notes named after companies and want to geocode them:

```yaml
# Entreprise.yaml - Configuration
display:
  items:
    - type: map
      source:
        class: Entreprise
      coordinates:
        address: adresse
      geocoding:
        enabled: true
```

```yaml
# Acme Corp.md - Note frontmatter
---
adresse: "{fileName}, 123 Rue de la Paix, 75002 Paris, France"
secteur: Technologie
---
```

The `{fileName}` is replaced with "Acme Corp" before geocoding, giving:
"Acme Corp, 123 Rue de la Paix, 75002 Paris, France"

### Example 4: Mixed Coordinates

Prefer direct coordinates but fall back to geocoding:

```yaml
display:
  items:
    - type: map
      title: "Locations"
      source:
        class: Lieu
      coordinates:
        latitude: latitude
        longitude: longitude
        address: adresse  # Used as fallback
      marker:
        properties: ['nom']
      geocoding:
        enabled: true
```

### Example 5: Filter and Display Specific Locations

Show only active clients in a specific region:

```yaml
display:
  items:
    - type: map
      title: "Clients Actifs - Région Sud"
      source:
        class: Client
        conditions:
          - property: statut
            operator: equals
            value: Actif
          - property: region
            operator: equals
            value: Sud
      coordinates:
        address: adresse
      marker:
        properties: ['nom', 'contact', 'telephone']
        colorProperty: typeClient
      geocoding:
        enabled: true
      zoom: 8
```

## DynamicMap API

The `DynamicMap` class provides a programmatic interface for creating and manipulating maps.

### Constructor

```typescript
new DynamicMap(vault: Vault, parent: HTMLElement, options?: DynamicMapOptions)
```

**Options:**

```typescript
interface DynamicMapOptions {
  markers?: DynamicMapMarker[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  width?: string;
}
```

### Methods

#### `addMarkers(points)`

Add markers to the map.

```typescript
map.addMarkers([
  {
    id: 'marker1',
    latitude: 48.8566,
    longitude: 2.3522,
    file: 'Paris.md',
    properties: [
      { label: 'Nom', value: 'Paris', isFile: false },
      { label: 'Population', value: '2.2M', isFile: false }
    ],
    color: '#e74c3c'
  }
]);
```

**Marker Object:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | ✅ | Unique marker identifier |
| `latitude` | number | ✅ | Latitude coordinate |
| `longitude` | number | ✅ | Longitude coordinate |
| `file` | string | ✅ | Path to the note file |
| `properties` | array | ❌ | Array of `{label, value, isFile}` objects |
| `color` | string | ❌ | Marker color (hex) |

#### `addPolygon(coords, style)`

Add a polygon/boundary to the map.

```typescript
map.addPolygon(
  [
    [48.9005, 2.3199],
    [48.9020, 2.3851],
    [48.8984, 2.3949],
    [48.9005, 2.3199]  // Close the polygon
  ],
  {
    fillColor: '#3388ff',
    fillOpacity: 0.1,
    color: '#0066cc',
    weight: 2,
    opacity: 0.8
  }
);
```

**Style Options:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `fillColor` | string | `"#3388ff"` | Fill color |
| `fillOpacity` | number | `0.2` | Fill opacity (0-1) |
| `color` | string | `"#3388ff"` | Border color |
| `weight` | number | `3` | Border width |
| `opacity` | number | `1` | Border opacity (0-1) |
| `dashArray` | string | - | Dash pattern |

#### `fitBoundsToFeatures()`

Automatically adjust the map view to show all markers and polygons.

```typescript
map.fitBoundsToFeatures();
```

#### `getElement()`

Get the map's HTML container element.

```typescript
const container = map.getElement();
container.style.border = '2px solid #ccc';
```

### Example Usage

```typescript
import { DynamicMap } from './display/DynamicMap';

const container = document.getElementById('map-container');
const map = new DynamicMap(vault, container, {
  center: [48.8566, 2.3522],
  zoom: 12,
  height: '500px'
});

// Add markers
map.addMarkers([
  {
    id: '1',
    latitude: 48.8566,
    longitude: 2.3522,
    file: 'Paris.md',
    properties: [
      { label: 'City', value: 'Paris', isFile: false }
    ],
    color: '#e74c3c'
  }
]);

// Add boundary
map.addPolygon([[48.9, 2.3], [48.9, 2.4], [48.8, 2.4], [48.8, 2.3]], {
  fillColor: '#3388ff',
  fillOpacity: 0.1
});

// Fit view
map.fitBoundsToFeatures();
```

## Tips and Best Practices

### Performance

- **Limit markers**: For large datasets (>100 markers), consider filtering with conditions
- **Geocoding cache**: The system caches geocoding results during the session
- **Coordinate precision**: 6 decimal places is sufficient (~0.1m accuracy)

### Styling

- **Custom CSS**: Use `className` to apply custom styles
- **Marker colors**: Use `colorProperty` with a Select property for automatic color-coding
- **Responsive height**: Use relative units or viewport heights for responsive maps

### Data Organization

- **Separate coordinates**: Store latitude/longitude in dedicated properties for direct access
- **Structured addresses**: Use consistent address formats for better geocoding results
- **GeoJSON data**: Place boundary data in `data/geo.json` with proper structure

### Troubleshooting

**Markers not appearing:**
- Check that coordinates are numbers, not strings
- Verify the source class and filters are correct
- Check browser console for errors

**Geocoding not working:**
- Ensure `geocoding.enabled: true` is set
- Verify addresses are properly formatted
- Check for rate limiting (max 1 request/second)

**Boundaries not showing:**
- Verify `data/geo.json` exists and is properly formatted
- Check that boundary properties match (nom, code_insee, or code_postal)
- Ensure `boundary.enabled: true`

## See Also

- [Display Configuration](Display-Configuration.md) - General display system
- [Condition System](Condition-System.md) - Filtering data sources
- [Table Display](Display-Configuration.md#table---dynamic-data-table) - Related data display widget
