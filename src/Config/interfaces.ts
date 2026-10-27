import { Condition } from './ConditionManager';

export interface PropertyConfig {
    type: string;
    title?: string; // Display name for the property
    classes?: string[];
    icon?: string;
    options?: any[];
    properties?: { [key: string]: PropertyConfig } | PropertyTableRow[];
    hint?: string;
    defaultValue?: any;
    formula?: string; // Pour FormulaProperty
    display?: 'object' | 'table' | 'tabs'; // Pour ObjectProperty - mode d'affichage simple
    displayContainer?: DisplayContainer; // Pour ObjectProperty - configuration avancée personnalisée
    static?: boolean; // Pour rendre une propriété non-modifiable
    unit?: string; // Pour NumberProperty - unité de mesure (€, kg, %, etc.)
    aliases?: string[]; // Old property names for automatic migration
    tooltip?: string; // Tooltip text to display on icon hover
    conditions?: Condition[]; // Conditions for filtering FileProperty and MultiFileProperty selections
    allowMove?: boolean; // Pour ObjectProperty - activer/désactiver le drag-and-drop (default: true)
    appendFirst?: boolean; // Pour ObjectProperty - ajouter les nouveaux items en premier (default: false)
    derivedFrom?: string; // Pour RangeDateProperty - chemin des dates dérivées (ex: "animations.date") : range min-max calculé, readonly quand résolu
}

export interface PropertyTableRow {
    name: string;
    type: string;
    icon?: string;
    default?: any;
    classes?: string;
    options?: string;
    formula?: string;
    display?: string;
}

export interface SelectOption {
    name: string;
    color: string;
    aliases?: string[];
}

export interface TabConfig {
    name: string;
    properties: string[];
}

export interface TableColumnConfig {
    name: string;
    propertyName?: string;
    sort?: 'asc' | 'desc'; // Direction du tri par défaut (le tri est toujours activé)
}

export interface TableSourceConfig {
    class: string; // Peut être "ClassName" ou "ClassName.propertyName" pour les ObjectProperty
    smartFilter?: 'all' | 'children' | 'parent' | 'siblings' | 'roots';
    conditions?: Condition[];
}

export interface TableTotalConfig {
    column: string;
    formula: 'sum' | 'average' | 'avg' | 'count' | 'countDistinct' | 'min' | 'max' | string;
    propertyName?: string; // Property to calculate on (for sum, avg, min, max)
}

// Base interface for all display items
interface BaseDisplayItem {
    type: 'property' | 'button' | 'line' | 'column' | 'tabs' | 'fold' | 'table' | 'number' | 'map';
    conditions?: Condition[]; // Conditions that must all be true for this item to be displayed
}

// Property display item
export interface PropertyDisplayItem extends BaseDisplayItem {
    type: 'property';
    name: string;
    title?: string; // Custom display title
    static?: boolean;
    display?: string; // Display mode for ObjectProperty: "object", "table", or "list"
    appendFirst?: boolean; // Pour ObjectProperty - afficher les items dans l'ordre inverse (newest first)
}

// Button display item
export interface ButtonDisplayItem extends BaseDisplayItem {
    type: 'button';
    label: string;
    process: string;
    icon?: string;
    className?: string;
}

// Container display items (line, column)
export interface ContainerDisplayItem extends BaseDisplayItem {
    type: 'line' | 'column';
    className?: string;
    title?: string;
    items: DisplayItem[];
}

// Tabs display item
export interface TabsDisplayItem extends BaseDisplayItem {
    type: 'tabs';
    className?: string;
    title?: string;
    tabs: Array<{
        name: string;
        items: DisplayItem[];
    }>;
}

// Fold display item
export interface FoldDisplayItem extends BaseDisplayItem {
    type: 'fold';
    title: string;
    className?: string;
    items: DisplayItem[];
}

// Table display item
export interface TableDisplayItem extends BaseDisplayItem {
    type: 'table';
    title?: string;
    className?: string;
    source: TableSourceConfig;
    columns?: TableColumnConfig[];
    totals?: TableTotalConfig[];
}

// Number display item (circular progress with number)
export interface NumberDisplayItem extends BaseDisplayItem {
    type: 'number';
    title?: string;
    className?: string;
    
    // Data source with filtering (like tables)
    source: TableSourceConfig; // Source class and smart filter
    formula: 'sum' | 'average' | 'avg' | 'count' | 'countDistinct' | 'min' | 'max' | 'percent'; // Required for calculation
    propertyName?: string; // Property to calculate on (for sum, avg, min, max, percent)
    
    // Display options
    unit?: string; // Unit to display (ex: %) - defaults to '%' for percent formula
    label?: string; // Label below the circle
    size?: number; // Size in px (default: 96)
    color?: string; // Fill color (default: var(--interactive-accent))
    max?: number | string | MaxCalculationConfig; // Maximum value: number, property name (e.g., "budget" or "items[0].total"), or calculation config
    display?: 'ring' | 'plain' | 'bar'; // Visual variant: ring (default), plain (big number without circle), bar (horizontal progress bar)
    prefix?: string; // Text before the number (e.g. "≈ ")
    suffix?: string; // Text after the number and unit (e.g. " HT")
    thousandsSeparator?: string; // Thousands separator, default: " " (space); set "" to disable
}

// Map display item (interactive map with markers)
export interface MapDisplayItem extends BaseDisplayItem {
    type: 'map';
    title?: string;
    className?: string;
    
    // Data source with filtering (like tables and numbers)
    source: TableSourceConfig;
    
    // Configuration des coordonnées
    coordinates: {
        latitude?: string;      // nom de la propriété latitude
        longitude?: string;     // nom de la propriété longitude  
        address?: string;       // nom de la propriété adresse (alternative, supports {fileName} placeholder)
        locationProperty?: string;  // chemin vers un Lieu (ex: "clients[0].client") — coords lues dans les données geo.json, remonte via .parent si le Lieu n'en a pas
        geoFile?: string;       // fichier de données geo (par défaut: data/geo.json du config de la classe Lieu)
    };
    
    // Configuration du marqueur
    marker?: {
        properties?: (string | { property: string; label?: string })[]; // liste des propriétés à afficher (string ou objet avec label)
        colorProperty?: string; // propriété pour la couleur
    };
    
    // Configuration de la map
    center?: [number, number];
    zoom?: number;
    height?: string;
    width?: string;
    
    // Contour du lieu courant
    boundary?: {
        enabled: boolean;           // afficher le contour du lieu
        property?: string;          // propriété contenant les coordonnées (par défaut: utilise data/geo.json)
        fillColor?: string;         // couleur de remplissage
        fillOpacity?: number;       // opacité du remplissage (0-1)
        color?: string;             // couleur du contour
        weight?: number;            // épaisseur du contour
        opacity?: number;           // opacité du contour (0-1)
        dashArray?: string;         // style de trait (ex: "5, 10" pour pointillé)
    };
    
    // Géocodage
    geocoding?: {
        enabled: boolean;       // activer le géocodage automatique pour les adresses
    };
}

// Configuration for calculating max value dynamically
export interface MaxCalculationConfig {
    source: TableSourceConfig; // Source for max calculation (can be different from main source)
    formula: 'sum' | 'average' | 'avg' | 'count' | 'countDistinct' | 'min' | 'max' | 'percent'; // Formula for max calculation
    propertyName?: string; // Property to calculate on
}

// Union type for all display items
export type DisplayItem = 
    | PropertyDisplayItem 
    | ButtonDisplayItem 
    | ContainerDisplayItem 
    | TabsDisplayItem 
    | FoldDisplayItem 
    | TableDisplayItem
    | NumberDisplayItem
    | MapDisplayItem;

export interface DisplayConfig {
    items?: DisplayItem[]; // Legacy format
    containers?: DisplayItem[]; // New format with containers array
}

// Alias for backward compatibility
export type DisplayContainer = DisplayConfig;

export interface SubClassConfig {
    name: string;
    icon?: string;
    properties?: { [key: string]: PropertyConfig };
}

export interface DataSourceConfig {
    file: string; // Path to JSON file relative to config directory
    dynamic?: boolean; // If true, watch for file changes and reload data automatically
}

export interface PopulateConfig {
    property: string; // Name of the property to populate
    title: string; // Title/prompt to show to the user
    required?: boolean; // If true, user cannot skip this field
    fallback?: PopulateConfig; // Alternative populate config if this one is not filled
}

export interface ProcessConfig {
    name: string;
    description?: string;
    triggers?: ('onCreate' | 'onUpdate' | 'onDelete' | 'onPropertyChange')[];
    conditions: any[]; // Conditions from ConditionManager
    actions: any[]; // Actions from ProcessManager
}

export interface SearchChipConfig {
    name: string;          // Property name to display as a chip
    color?: string;        // CSS color for the icon+value (SelectProperty chips use the option color by default)
}

export interface SearchConfig {
    properties?: (string | SearchChipConfig)[];  // Properties highlighted as chips in search results
    sort?: string;                              // Property used to sort results when the query is empty
    sortDirection?: 'asc' | 'desc';
    titleTemplate?: string;                     // Rename template (e.g. "{animations[0].date} - Action - {current}"): the prefix before {current} is stripped from the displayed title
}

export interface ClassConfig {
    className: string;
    classIcon: string;
    extend?: string; // Name of the parent class to extend from
    parent?: {
        property: string; // Name of the property that defines the parent (FileProperty, ObjectProperty, or MultiFileProperty)
        folder?: string; // Optional subfolder name in parent's folder where this file should be placed
    };
    parents?: Array<{ // Support multiple parents with fallback
        property: string;
        folder?: string;
    }>;
    folder?: string; // Subfolder in vault for this class
    subClassesProperty?: {
        name: string;
        subClasses: SubClassConfig[];
    };
    properties: { [key: string]: PropertyConfig };
    display?: DisplayConfig;
    data?: DataSourceConfig[]; // Data sources for pre-populating instances
    populate?: PopulateConfig[]; // Properties to prompt for during file creation
    process?: ProcessConfig[]; // Automated processes to run on triggers
    rename?: string; // Template for renaming files (e.g., "{date} - {client} - {current}")
    search?: SearchConfig; // Search modal customization (chips, sort, title)
}