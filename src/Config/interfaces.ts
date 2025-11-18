export interface PropertyConfig {
    type: string;
    name: string;
    classes?: string[];
    icon?: string;
    options?: SelectOption[];
    properties?: { [key: string]: PropertyConfig } | PropertyTableRow[];
    hint?: string;
    defaultValue?: any;
    formula?: string; // Pour FormulaProperty
    display?: string; // Pour mode d'affichage (table, fold, etc.)
    static?: boolean; // Pour rendre une propriété non-modifiable
    unit?: string; // Pour NumberProperty - unité de mesure (€, kg, %, etc.)
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
    filter: 'all' | 'children' | 'parent' | 'siblings' | 'roots';
    filterBy?: { [propertyName: string]: string | string[] | number | boolean }; // Filter by property values
}

export interface TableTotalConfig {
    column: string;
    formula: 'sum' | 'average' | 'avg' | 'count' | 'min' | 'max' | string;
    propertyName?: string; // Property to calculate on (for sum, avg, min, max)
}

export interface DisplayContainer {
    type: 'line' | 'column' | 'custom' | 'tabs' | 'fold' | 'table';
    properties?: string[];
    className?: string;
    title?: string;
    tabs?: TabConfig[]; // Pour le type tabs
    foldTitle?: string; // Pour le type fold
    // Pour le type table
    source?: TableSourceConfig;
    columns?: TableColumnConfig[];
    totals?: TableTotalConfig[];
}

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

export interface ClassConfig {
    className: string;
    classIcon: string;
    parent?: {
        property: string; // Name of the property that defines the parent (FileProperty, ObjectProperty, or MultiFileProperty)
        folder?: string; // Optional subfolder name in parent's folder where this file should be placed
    };
    subClassesProperty?: {
        name: string;
        subClasses: SubClassConfig[];
    };
    properties: { [key: string]: PropertyConfig };
    display?: {
        layout?: 'default' | 'custom';
        containers?: DisplayContainer[];
    };
    data?: DataSourceConfig[]; // Data sources for pre-populating instances
    populate?: PopulateConfig[]; // Properties to prompt for during file creation
}