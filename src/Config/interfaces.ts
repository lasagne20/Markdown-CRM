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
    display?: string | DisplayConfig; // Pour mode d'affichage - string pour rétrocompat (table, list) ou DisplayConfig pour config avancée
    static?: boolean; // Pour rendre une propriété non-modifiable
    unit?: string; // Pour NumberProperty - unité de mesure (€, kg, %, etc.)
    aliases?: string[]; // Old property names for automatic migration
    tooltip?: string; // Tooltip text to display on icon hover
    conditions?: Condition[]; // Conditions for filtering FileProperty and MultiFileProperty selections
    allowMove?: boolean; // Pour ObjectProperty - activer/désactiver le drag-and-drop (default: true)
    appendFirst?: boolean; // Pour ObjectProperty - ajouter les nouveaux items en premier (default: false)
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
    filter?: 'text' | 'select' | 'multi-select' | false;
    sort?: boolean;
}

export interface TableSourceConfig {
    class: string;
    smartFilter?: 'all' | 'children' | 'parent' | 'siblings' | 'roots';
    conditions?: Condition[];
}

export interface TableTotalConfig {
    column: string;
    formula: 'sum' | 'average' | 'avg' | 'count' | 'min' | 'max' | string;
    propertyName?: string; // Property to calculate on (for sum, avg, min, max)
}

// Base interface for all display items
interface BaseDisplayItem {
    type: 'property' | 'button' | 'line' | 'column' | 'tabs' | 'fold' | 'table';
}

// Property display item
export interface PropertyDisplayItem extends BaseDisplayItem {
    type: 'property';
    name: string;
    title?: string; // Custom display title
    static?: boolean;
    display?: string; // Display mode for ObjectProperty: "object", "table", or "list"
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

// Union type for all display items
export type DisplayItem = 
    | PropertyDisplayItem 
    | ButtonDisplayItem 
    | ContainerDisplayItem 
    | TabsDisplayItem 
    | FoldDisplayItem 
    | TableDisplayItem;

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
}

export interface ProcessConfig {
    name: string;
    description?: string;
    triggers?: ('onCreate' | 'onUpdate' | 'onDelete' | 'onPropertyChange')[];
    conditions: any[]; // Conditions from ConditionManager
    actions: any[]; // Actions from ProcessManager
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
}