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

export interface DisplayContainer {
    type: 'line' | 'column' | 'custom' | 'tabs' | 'fold';
    properties?: string[];
    className?: string;
    title?: string;
    tabs?: TabConfig[]; // Pour le type tabs
    foldTitle?: string; // Pour le type fold
}

export interface SubClassConfig {
    name: string;
    icon?: string;
    properties?: { [key: string]: PropertyConfig };
}

export interface ClassConfig {
    className: string;
    classIcon: string;
    parentProperty?: PropertyConfig;
    subClassesProperty?: {
        name: string;
        subClasses: SubClassConfig[];
    };
    properties: { [key: string]: PropertyConfig };
    display?: {
        layout?: 'default' | 'custom';
        containers?: DisplayContainer[];
    };
}