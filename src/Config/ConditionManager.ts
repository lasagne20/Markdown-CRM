import { Classe } from '../vault/Classe';
import { Property } from '../properties/Property';

/**
 * Condition types for type-safe condition evaluation
 */
export type ConditionType = 
    | 'equals' 
    | 'notEquals' 
    | 'equalsAny' 
    | 'notEqualsAny' 
    | 'contains' 
    | 'notContains' 
    | 'greaterThan' 
    | 'lessThan' 
    | 'greaterThanOrEqual' 
    | 'lessThanOrEqual' 
    | 'isEmpty' 
    | 'isNotEmpty';

/**
 * Base condition interface
 */
interface BaseCondition {
    property: string;
    type: ConditionType;
}

/**
 * Specific condition interfaces for each type
 */
export interface EqualsCondition extends BaseCondition {
    type: 'equals';
    value: any;
}

export interface NotEqualsCondition extends BaseCondition {
    type: 'notEquals';
    value: any;
}

export interface EqualsAnyCondition extends BaseCondition {
    type: 'equalsAny';
    values: any[];
}

export interface NotEqualsAnyCondition extends BaseCondition {
    type: 'notEqualsAny';
    values: any[];
}

export interface ContainsCondition extends BaseCondition {
    type: 'contains';
    value: string;
}

export interface NotContainsCondition extends BaseCondition {
    type: 'notContains';
    value: string;
}

export interface GreaterThanCondition extends BaseCondition {
    type: 'greaterThan';
    value: number;
}

export interface LessThanCondition extends BaseCondition {
    type: 'lessThan';
    value: number;
}

export interface GreaterThanOrEqualCondition extends BaseCondition {
    type: 'greaterThanOrEqual';
    value: number;
}

export interface LessThanOrEqualCondition extends BaseCondition {
    type: 'lessThanOrEqual';
    value: number;
}

export interface IsEmptyCondition extends BaseCondition {
    type: 'isEmpty';
}

export interface IsNotEmptyCondition extends BaseCondition {
    type: 'isNotEmpty';
}

/**
 * Direct link condition - Check if the instance has a direct link with the current document
 * This checks if any property of the instance links to the current document
 */
export interface DirectLinkCondition {
    conditionType: 'directLink';
    currentDocument?: Classe; // The current document to compare with (injected at runtime)
    linkProperty?: string; // Optional: specific property to check (if not provided, checks all FileProperty/MultiFileProperty)
}

/**
 * Property condition - Standard condition on instance property (default)
 */
export type PropertyCondition = 
    | EqualsCondition 
    | NotEqualsCondition 
    | EqualsAnyCondition 
    | NotEqualsAnyCondition 
    | ContainsCondition 
    | NotContainsCondition 
    | GreaterThanCondition 
    | LessThanCondition 
    | GreaterThanOrEqualCondition 
    | LessThanOrEqualCondition 
    | IsEmptyCondition 
    | IsNotEmptyCondition;

/**
 * Union type for all possible conditions
 */
export type Condition = 
    | PropertyCondition
    | DirectLinkCondition;

/**
 * ConditionManager handles evaluation of conditions against classe instances
 */
export class ConditionManager {
    /**
     * Evaluate a single condition against an instance
     * @param currentDocument The current document context (used for DirectLinkCondition and 'current' value)
     */
    async evaluateCondition(condition: Condition, instance: Classe, currentDocument?: Classe): Promise<boolean> {
        // Check if this is a DirectLinkCondition
        if ('conditionType' in condition && condition.conditionType === 'directLink') {
            return await this.evaluateDirectLinkCondition(condition, instance, currentDocument);
        }

        // Otherwise, it's a PropertyCondition
        const propertyCondition = condition as PropertyCondition;
        const propertyValue = await this.getPropertyValue(instance, propertyCondition.property);
        const resolveValue = this.createResolveFunction(currentDocument);

        switch (propertyCondition.type) {
            case 'equals':
                return this.isCurrentValue(propertyCondition.value) && currentDocument
                    ? this.handleCurrentComparison(propertyValue, currentDocument)
                    : this.compareValues(propertyValue, resolveValue(propertyCondition.value));

            case 'notEquals':
                return this.isCurrentValue(propertyCondition.value) && currentDocument
                    ? !this.handleCurrentComparison(propertyValue, currentDocument)
                    : !this.compareValues(propertyValue, resolveValue(propertyCondition.value));

            case 'equalsAny':
                if (!Array.isArray(propertyCondition.values) || propertyCondition.values.length === 0) {
                    console.warn(`equalsAny condition requires non-empty 'values' array`);
                    return false;
                }
                return propertyCondition.values.some(value =>
                    this.isCurrentValue(value) && currentDocument
                        ? this.handleCurrentComparison(propertyValue, currentDocument)
                        : this.compareValues(propertyValue, resolveValue(value))
                );

            case 'notEqualsAny':
                if (!Array.isArray(propertyCondition.values) || propertyCondition.values.length === 0) {
                    console.warn(`notEqualsAny condition requires non-empty 'values' array`);
                    return true; // If no values to exclude, everything is allowed
                }
                return !propertyCondition.values.some(value =>
                    this.isCurrentValue(value) && currentDocument
                        ? this.handleCurrentComparison(propertyValue, currentDocument)
                        : this.compareValues(propertyValue, resolveValue(value))
                );

            case 'contains':
                return this.handleContainsLogic(propertyValue, propertyCondition.value, currentDocument);

            case 'notContains':
                return this.handleContainsLogic(propertyValue, propertyCondition.value, currentDocument, true);

            case 'greaterThan':
                const gtValueProperty = this.toDateNumber(propertyValue);
                const gtValueCondition = this.toDateNumber(propertyCondition.value);
                return gtValueProperty !== null && gtValueCondition !== null && gtValueProperty > gtValueCondition;

            case 'lessThan':
                const ltValueProperty = this.toDateNumber(propertyValue);
                const ltValueCondition = this.toDateNumber(propertyCondition.value);
                return ltValueProperty !== null && ltValueCondition !== null && ltValueProperty < ltValueCondition;

            case 'greaterThanOrEqual':
                const gteValueProperty = this.toDateNumber(propertyValue);
                const gteValueCondition = this.toDateNumber(propertyCondition.value);
                return gteValueProperty !== null && gteValueCondition !== null && gteValueProperty >= gteValueCondition;

            case 'lessThanOrEqual':
                const lteValueProperty = this.toDateNumber(propertyValue);
                const lteValueCondition = this.toDateNumber(propertyCondition.value);
                return lteValueProperty !== null && lteValueCondition !== null && lteValueProperty <= lteValueCondition;

            case 'isEmpty':
                return propertyValue === null || propertyValue === undefined || propertyValue === '' || 
                       (Array.isArray(propertyValue) && propertyValue.length === 0);

            case 'isNotEmpty':
                return propertyValue !== null && propertyValue !== undefined && propertyValue !== '' &&
                       (!Array.isArray(propertyValue) || propertyValue.length > 0);

            default:
                console.warn(`Unknown condition type: ${(propertyCondition as any).type}`);
                return false;
        }
    }

    /**
     * Check if a value is 'current' or '$current'
     */
    private isCurrentValue(value: any): boolean {
        return value === 'current' || value === '$current';
    }

    /**
     * Handle comparison when value is 'current' or '$current'
     */
    private handleCurrentComparison(propertyValue: any, currentDocument: Classe): boolean {
        const currentFileName = currentDocument.getName();
        const currentFilePath = currentDocument.getPath() || '';
        return this.hasLinkToDocument(propertyValue, currentFileName, currentFilePath);
    }

    /**
     * Create a resolve function for transforming values
     */
    private createResolveFunction(currentDocument?: Classe): (value: any) => any {
        return (value: any): any => {
            if (this.isCurrentValue(value)) {
                if (!currentDocument) {
                    console.warn(`Condition uses "${value}" but no currentDocument was provided`);
                    return value; // Return as-is, will fail the condition
                }
                // Use the file name, not the class name
                const file = currentDocument.getFile();
                if (file && file.getName) {
                    const fileName = file.getName(false); // false = without .md extension
                    return `[[${fileName}]]`;
                } else if (currentDocument.getPath) {
                    const path = currentDocument.getPath();
                    if (path) {
                        // Extract filename from path without extension
                        const fileName = path.split('/').pop()?.replace(/\.md$/, '') || path;
                        return `[[${fileName}]]`;
                    }
                }
                // Fallback to class name if file info not available
                return `[[${currentDocument.getName()}]]`;
            }
            return value;
        };
    }

    /**
     * Handle contains/notContains logic with proper current value support
     */
    private handleContainsLogic(propertyValue: any, conditionValue: any, currentDocument?: Classe, negate: boolean = false): boolean {
        const resolveValue = this.createResolveFunction(currentDocument);
        const resolvedValue = resolveValue(conditionValue);

        if (typeof propertyValue === 'string') {
            if (this.isCurrentValue(conditionValue) && currentDocument) {
                const result = this.handleCurrentComparison(propertyValue, currentDocument);
                return negate ? !result : result;
            }
            const result = propertyValue.includes(resolvedValue);
            return negate ? !result : result;
        }

        if (Array.isArray(propertyValue)) {
            if (this.isCurrentValue(conditionValue) && currentDocument) {
                // For arrays, check each element individually if they're strings with links
                if (propertyValue.every(item => typeof item === 'string')) {
                    const result = this.handleCurrentComparison(propertyValue, currentDocument);
                    return negate ? !result : result;
                } else {
                    // For complex objects, use JSON.stringify and hasLinkToDocument on the JSON string
                    const jsonStr = JSON.stringify(propertyValue);
                    const result = this.handleCurrentComparison(jsonStr, currentDocument);
                    return negate ? !result : result;
                }
            }
            const jsonStr = JSON.stringify(propertyValue);
            const result = jsonStr.includes(resolvedValue);
            return negate ? !result : result;
        }

        // For objects or other complex types
        if (propertyValue && typeof propertyValue === 'object') {
            if (this.isCurrentValue(conditionValue) && currentDocument) {
                const jsonStr = JSON.stringify(propertyValue);
                const result = this.handleCurrentComparison(jsonStr, currentDocument);
                return negate ? !result : result;
            }
            const jsonStr = JSON.stringify(propertyValue);
            const result = jsonStr.includes(resolvedValue);
            return negate ? !result : result;
        }

        return negate ? true : false;
    }

    /**
     * Evaluate a DirectLinkCondition
     * Checks if the instance has a direct link to the current document
     * @param currentDocument The current document to check links against
     */
    private async evaluateDirectLinkCondition(condition: DirectLinkCondition, instance: Classe, currentDocument?: Classe): Promise<boolean> {
        if (!currentDocument) {
            console.warn('DirectLinkCondition requires currentDocument to be provided');
            return false;
        }
        
        const currentFileName = currentDocument.getName();
        const currentFilePath = currentDocument.getPath() || '';

        // If a specific property is specified, only check that property
        if (condition.linkProperty) {
            const propertyValue = await this.getPropertyValue(instance, condition.linkProperty);
            return this.hasLinkToDocument(propertyValue, currentFileName, currentFilePath);
        }

        // Otherwise, check all FileProperty and MultiFileProperty in the instance
        const properties = instance.getAllProperties();
        for (const [propertyName, property] of Object.entries(properties)) {
            // Check if this is a FileProperty or MultiFileProperty
            if (property.type === 'file' || property.type === 'multiFile') {
                const propertyValue = await property.read(instance);
                if (this.hasLinkToDocument(propertyValue, currentFileName, currentFilePath)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Check if a property value contains a link to the specified document
     */
    private hasLinkToDocument(propertyValue: any, fileName: string, filePath: string): boolean {
        if (!propertyValue) {
            return false;
        }

        // Extract the base filename from the path (without extension)
        const getFileBaseName = (path: string): string => {
            const parts = path.split('/');
            const fileWithExt = parts[parts.length - 1];
            return fileWithExt.replace(/\.md$/, '');
        };

        // Normalize by removing spaces for comparison
        const normalize = (str: string): string => str.replace(/\s+/g, '');

        const fileBaseName = filePath ? getFileBaseName(filePath) : fileName;
        const normalizedFileName = normalize(fileName);
        const normalizedFileBaseName = normalize(fileBaseName);

        const matchesLink = (linkTarget: string): boolean => {
            const normalizedLinkTarget = normalize(linkTarget);
            
            // Direct match
            if (linkTarget === fileName || linkTarget === filePath || linkTarget.endsWith('/' + fileName)) {
                return true;
            }
            
            // Normalized match (handles spaces: "Partenariat 1" vs "Partenariat1")
            if (normalizedLinkTarget === normalizedFileName || normalizedLinkTarget === normalizedFileBaseName) {
                return true;
            }
            
            // Check if link ends with the filename (with path)
            if (linkTarget.endsWith('/' + fileName)) {
                return true;
            }
            
            return false;
        };

        // Single link (string)
        if (typeof propertyValue === 'string') {
            // Extract the link name from [[LinkName]] or [[path/to/LinkName|DisplayName]]
            const linkMatch = propertyValue.match(/\[\[([^\]|]+)/);
            if (linkMatch) {
                const linkTarget = linkMatch[1];
                return matchesLink(linkTarget);
            }
            return false;
        }

        // Array of links
        if (Array.isArray(propertyValue)) {
            return propertyValue.some(link => {
                if (typeof link === 'string') {
                    const linkMatch = link.match(/\[\[([^\]|]+)/);
                    if (linkMatch) {
                        const linkTarget = linkMatch[1];
                        return matchesLink(linkTarget);
                    }
                }
                return false;
            });
        }

        return false;
    }

    /**
     * Evaluate multiple conditions with AND logic
     * @param currentDocument The current document context (used for DirectLinkCondition)
     */
    async evaluateConditions(conditions: Condition[], instance: Classe, currentDocument?: Classe): Promise<boolean> {
        if (!conditions || conditions.length === 0) {
            return true; // No conditions means always true
        }

        // All conditions must be true (AND logic)
        for (const condition of conditions) {
            const result = await this.evaluateCondition(condition, instance, currentDocument);
            if (!result) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get property value from instance
     */
    private async getPropertyValue(instance: Classe, propertyName: string): Promise<any> {
        try {
            const property = instance.getProperty(propertyName);
            if (!property) {
                console.warn(`Property ${propertyName} not found on instance`);
                return null;
            }

            return await property.read(instance);
        } catch (error) {
            console.error(`Error reading property ${propertyName}:`, error);
            return null;
        }
    }

    /**
     * Compare two values with proper type handling
     */
    private compareValues(value1: any, value2: any): boolean {
        // Handle null/undefined
        if (value1 === null || value1 === undefined) {
            return value2 === null || value2 === undefined;
        }

        // String comparison (case-insensitive)
        if (typeof value1 === 'string' && typeof value2 === 'string') {
            return value1.toLowerCase() === value2.toLowerCase();
        }

        // Number comparison (with type coercion for string numbers)
        const num1 = this.toNumber(value1);
        const num2 = this.toNumber(value2);
        if (num1 !== null && num2 !== null) {
            return num1 === num2;
        }

        // Boolean comparison
        if (typeof value1 === 'boolean' && typeof value2 === 'boolean') {
            return value1 === value2;
        }

        // Array comparison (shallow)
        if (Array.isArray(value1) && Array.isArray(value2)) {
            if (value1.length !== value2.length) return false;
            return value1.every((val, index) => this.compareValues(val, value2[index]));
        }

        // Default: use strict equality
        return value1 === value2;
    }

    /**
     * Convert value to number if possible
     */
    private toNumber(value: any): number | null {
        if (typeof value === 'number') {
            return value;
        }
        if (typeof value === 'string') {
            const num = parseFloat(value);
            return isNaN(num) ? null : num;
        }
        return null;
    }

    /**
     * Convert value to date number (timestamp) for date comparisons
     * Supports various input formats:
     * - Year only: "2024" -> timestamp for January 1st, 2024
     * - Date string: "2024-12-31" -> timestamp for that date
     * - Timestamp: 1735689600000 -> returned as-is
     * - Date object: new Date() -> converted to timestamp
     */
    private toDateNumber(value: any): number | null {
        // Already a number (timestamp)
        if (typeof value === 'number') {
            return value;
        }

        // Date object
        if (value instanceof Date) {
            return value.getTime();
        }

        // String conversion
        if (typeof value === 'string') {
            // Year only: "2024"
            if (/^\d{4}$/.test(value)) {
                const year = parseInt(value, 10);
                return new Date(year, 0, 1).getTime(); // January 1st of that year
            }

            // Date format: "2024-12-31"
            if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(value)) {
                const date = new Date(value);
                return isNaN(date.getTime()) ? null : date.getTime();
            }

            // ISO date format or other date strings
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                return date.getTime();
            }

            // Fallback: try parsing as number
            const num = parseFloat(value);
            return isNaN(num) ? null : num;
        }

        return null;
    }

    /**
     * Create a validation function that can be used to filter files
     * This function evaluates conditions against a Classe instance
     * 
     * @param conditions Array of conditions to evaluate
     * @param currentDocument Optional current document for DirectLinkCondition evaluation and 'current' value resolution
     * @returns An async function that takes a Classe and returns true if it passes all conditions
     */
    createValidationFunction(conditions: Condition[], currentDocument?: Classe): (instance: Classe) => Promise<boolean> {
        return async (instance: Classe): Promise<boolean> => {
            return await this.evaluateConditions(conditions, instance, currentDocument);
        };
    }

    /**
     * Parse conditions from YAML config format
     * Converts plain objects to typed Condition objects
     */
    static parseConditions(conditionsConfig: any[]): Condition[] {
        return conditionsConfig.map(config => {
            // Check if it's a DirectLinkCondition (special marker in YAML)
            if (config.conditionType === 'directLink') {
                return {
                    conditionType: 'directLink',
                    linkProperty: config.linkProperty,
                    // currentDocument will be injected at runtime
                } as any as DirectLinkCondition;
            }

            // Otherwise, it's a PropertyCondition
            return config as Condition;
        });
    }
}
