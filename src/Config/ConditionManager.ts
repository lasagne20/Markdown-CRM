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

        // Replace 'current' with current document link if applicable
        const resolveValue = (value: any): any => {
            if (value === 'current') {
                if (!currentDocument) {
                    console.warn('Condition uses "current" but no currentDocument was provided');
                    return 'current'; // Return as-is, will fail the condition
                }
                return `[[${currentDocument.getName()}]]`;
            }
            return value;
        };

        switch (propertyCondition.type) {
            case 'equals':
                return this.compareValues(propertyValue, resolveValue(propertyCondition.value));

            case 'notEquals':
                return !this.compareValues(propertyValue, resolveValue(propertyCondition.value));

            case 'equalsAny':
                return propertyCondition.values.some(value => this.compareValues(propertyValue, resolveValue(value)));

            case 'notEqualsAny':
                return !propertyCondition.values.some(value => this.compareValues(propertyValue, resolveValue(value)));

            case 'contains':
                const containsValue = resolveValue(propertyCondition.value);
                if (typeof propertyValue === 'string') {
                    return propertyValue.includes(containsValue);
                }
                if (Array.isArray(propertyValue)) {
                    // For arrays and objects, use JSON.stringify to search within structure
                    const jsonStr = JSON.stringify(propertyValue);
                    if (propertyCondition.value === 'current' && currentDocument) {
                        // For 'current', check using hasLinkToDocument logic
                        return this.hasLinkToDocument(jsonStr, currentDocument.getName(), currentDocument.getPath() || '');
                    }
                    return jsonStr.includes(containsValue);
                }
                return false;

            case 'notContains':
                const notContainsValue = resolveValue(propertyCondition.value);
                if (typeof propertyValue === 'string') {
                    return !propertyValue.includes(notContainsValue);
                }
                if (Array.isArray(propertyValue)) {
                    const jsonStr = JSON.stringify(propertyValue);
                    if (propertyCondition.value === 'current' && currentDocument) {
                        return !this.hasLinkToDocument(jsonStr, currentDocument.getName(), currentDocument.getPath() || '');
                    }
                    return !jsonStr.includes(notContainsValue);
                }
                return true;

            case 'greaterThan':
                const gtValue = this.toNumber(propertyValue);
                return gtValue !== null && gtValue > propertyCondition.value;

            case 'lessThan':
                const ltValue = this.toNumber(propertyValue);
                return ltValue !== null && ltValue < propertyCondition.value;

            case 'greaterThanOrEqual':
                const gteValue = this.toNumber(propertyValue);
                return gteValue !== null && gteValue >= propertyCondition.value;

            case 'lessThanOrEqual':
                const lteValue = this.toNumber(propertyValue);
                return lteValue !== null && lteValue <= propertyCondition.value;

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

        // Single link (string)
        if (typeof propertyValue === 'string') {
            // Extract the link name from [[LinkName]] or [[path/to/LinkName|DisplayName]]
            const linkMatch = propertyValue.match(/\[\[([^\]|]+)/);
            if (linkMatch) {
                const linkTarget = linkMatch[1];
                // Check if it matches the filename or path
                return linkTarget === fileName || linkTarget === filePath || linkTarget.endsWith('/' + fileName);
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
                        return linkTarget === fileName || linkTarget === filePath || linkTarget.endsWith('/' + fileName);
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

        // Number comparison
        if (typeof value1 === 'number' && typeof value2 === 'number') {
            return value1 === value2;
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
