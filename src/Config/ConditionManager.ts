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
    not?: boolean;  // NOT operator for individual conditions
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
 * Condition group for hierarchical condition evaluation with logical operators
 */
export interface ConditionGroup {
    operator?: 'AND' | 'OR';     // Default: AND
    not?: boolean;               // NOT operator applied to entire group
    conditions?: Condition[];     // Simple conditions in this group
    groups?: ConditionGroup[];   // Nested condition groups
}

/**
 * Root condition configuration supporting both legacy and new hierarchical format
 */
export interface ConditionConfig {
    operator?: 'AND' | 'OR';     // Root operator (default: AND)
    not?: boolean;               // NOT operator applied to entire config
    conditions?: Condition[];     // Legacy format support
    groups?: ConditionGroup[];   // New hierarchical format
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
 * Undirect link condition - Check if other files reference this instance, then filter those referencing files
 * This is useful to filter instances based on their "children" or referencing documents
 * Example: Find communes that have actions with a specific partnership
 */
export interface UndirectLinkCondition {
    conditionType: 'undirectLink';
    referencingFiles?: Classe[]; // Pool of files to search through (injected at runtime)
    filterCondition?: PropertyCondition; // Condition to apply on the referencing files
    linkProperty?: string; // Optional: specific property to check in referencing files
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
    | DirectLinkCondition
    | UndirectLinkCondition;

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
            const result = await this.evaluateDirectLinkCondition(condition, instance, currentDocument);
            return (condition as any).not ? !result : result;
        }

        // Check if this is an UndirectLinkCondition
        if ('conditionType' in condition && condition.conditionType === 'undirectLink') {
            const result = await this.evaluateUndirectLinkCondition(condition, instance, currentDocument);
            return (condition as any).not ? !result : result;
        }

        // Otherwise, it's a PropertyCondition
        const propertyCondition = condition as PropertyCondition;
        const propertyValue = await this.getPropertyValue(instance, propertyCondition.property);
        const resolveValue = this.createResolveFunction(currentDocument);

        let result: boolean;

        switch (propertyCondition.type) {
            case 'equals':
                result = this.isCurrentValue(propertyCondition.value) && currentDocument
                    ? this.handleCurrentComparison(propertyValue, currentDocument)
                    : this.compareValues(propertyValue, resolveValue(propertyCondition.value));
                break;

            case 'notEquals':
                result = this.isCurrentValue(propertyCondition.value) && currentDocument
                    ? !this.handleCurrentComparison(propertyValue, currentDocument)
                    : !this.compareValues(propertyValue, resolveValue(propertyCondition.value));
                break;

            case 'equalsAny':
                if (!Array.isArray(propertyCondition.values) || propertyCondition.values.length === 0) {
                    console.warn(`equalsAny condition requires non-empty 'values' array`);
                    result = false;
                    break;
                }
                result = propertyCondition.values.some(value =>
                    this.isCurrentValue(value) && currentDocument
                        ? this.handleCurrentComparison(propertyValue, currentDocument)
                        : this.compareValues(propertyValue, resolveValue(value))
                );
                break;

            case 'notEqualsAny':
                if (!Array.isArray(propertyCondition.values) || propertyCondition.values.length === 0) {
                    console.warn(`notEqualsAny condition requires non-empty 'values' array`);
                    result = true; // If no values to exclude, everything is allowed
                    break;
                }
                result = !propertyCondition.values.some(value =>
                    this.isCurrentValue(value) && currentDocument
                        ? this.handleCurrentComparison(propertyValue, currentDocument)
                        : this.compareValues(propertyValue, resolveValue(value))
                );
                break;

            case 'contains':
                result = this.handleContainsLogic(propertyValue, propertyCondition.value, currentDocument);
                break;

            case 'notContains':
                result = this.handleContainsLogic(propertyValue, propertyCondition.value, currentDocument, true);
                break;

            case 'greaterThan':
                const gtValueProperty = this.toNumericValueSmart(instance, propertyCondition.property, propertyValue);
                const gtValueCondition = this.toNumericValueSmart(instance, propertyCondition.property, propertyCondition.value);
                result = gtValueProperty !== null && gtValueCondition !== null && gtValueProperty > gtValueCondition;
                break;

            case 'lessThan':
                const ltValueProperty = this.toNumericValueSmart(instance, propertyCondition.property, propertyValue);
                const ltValueCondition = this.toNumericValueSmart(instance, propertyCondition.property, propertyCondition.value);
                result = ltValueProperty !== null && ltValueCondition !== null && ltValueProperty < ltValueCondition;
                break;

            case 'greaterThanOrEqual':
                const gteValueProperty = this.toNumericValueSmart(instance, propertyCondition.property, propertyValue);
                const gteValueCondition = this.toNumericValueSmart(instance, propertyCondition.property, propertyCondition.value);
                result = gteValueProperty !== null && gteValueCondition !== null && gteValueProperty >= gteValueCondition;
                break;

            case 'lessThanOrEqual':
                const lteValueProperty = this.toNumericValueSmart(instance, propertyCondition.property, propertyValue);
                const lteValueCondition = this.toNumericValueSmart(instance, propertyCondition.property, propertyCondition.value);
                result = lteValueProperty !== null && lteValueCondition !== null && lteValueProperty <= lteValueCondition;
                break;

            case 'isEmpty':
                result = propertyValue === null || propertyValue === undefined || propertyValue === '' || 
                       (Array.isArray(propertyValue) && propertyValue.length === 0);
                break;

            case 'isNotEmpty':
                result = propertyValue !== null && propertyValue !== undefined && propertyValue !== '' &&
                       (!Array.isArray(propertyValue) || propertyValue.length > 0);
                break;

            default:
                console.warn(`Unknown condition type: ${(propertyCondition as any).type}`);
                result = false;
                break;
        }

        // Apply NOT if specified on the condition
        // Apply NOT if specified on the condition
        return propertyCondition.not ? !result : result;
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
     * Evaluate an UndirectLinkCondition
     * Checks if other files reference this instance, then filters those referencing files
     * @param condition The undirect link condition
     * @param instance The current instance to find references to
     * @param currentDocument The current document context (for nested conditions)
     */
    private async evaluateUndirectLinkCondition(condition: UndirectLinkCondition, instance: Classe, currentDocument?: Classe): Promise<boolean> {
        if (!condition.referencingFiles || condition.referencingFiles.length === 0) {
            console.warn('UndirectLinkCondition requires referencingFiles to be provided');
            return false;
        }
        
        const instanceFileName = instance.getName();
        const instanceFilePath = instance.getPath() || '';

        // Find all files that reference this instance
        const referencingFiles: Classe[] = [];
        
        for (const file of condition.referencingFiles) {
            let hasReference = false;

            // If a specific property is specified, only check that property
            if (condition.linkProperty) {
                const propertyValue = await this.getPropertyValue(file, condition.linkProperty);
                if (this.hasLinkToDocument(propertyValue, instanceFileName, instanceFilePath)) {
                    hasReference = true;
                }
            } else {
                // Otherwise, check all FileProperty and MultiFileProperty in the file
                const properties = file.getAllProperties();
                for (const [propertyName, property] of Object.entries(properties)) {
                    // Check if this is a FileProperty or MultiFileProperty
                    if (property.type === 'file' || property.type === 'multiFile') {
                        const propertyValue = await property.read(file);
                        if (this.hasLinkToDocument(propertyValue, instanceFileName, instanceFilePath)) {
                            hasReference = true;
                            break;
                        }
                    }
                }
            }

            if (hasReference) {
                referencingFiles.push(file);
            }
        }

        // If no files reference this instance, return false
        if (referencingFiles.length === 0) {
            return false;
        }

        // If no filter condition is specified, return true (there are referencing files)
        if (!condition.filterCondition) {
            return true;
        }

        // Apply the filter condition to the referencing files
        for (const referencingFile of referencingFiles) {
            const conditionResult = await this.evaluateCondition(condition.filterCondition, referencingFile, currentDocument);
            if (conditionResult) {
                return true; // At least one referencing file matches the filter condition
            }
        }

        return false; // No referencing files match the filter condition
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
     * Smart numeric conversion that uses date conversion for DateProperty, number conversion for others
     * Combines the logic of both toNumber and toDateNumber based on property type
     */
    private toNumericValueSmart(instance: Classe, propertyName: string, value: any): number | null {
        try {
            const property = instance.getProperty(propertyName);
            const isDateProperty = property && property.type === 'date';
            
            if (isDateProperty) {
                // Date conversion logic
                // Already a number (timestamp)
                if (typeof value === 'number') {
                    return value;
                }

                // Date object
                if (value instanceof Date) {
                    return value.getTime();
                }

                // String conversion for dates
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
            } else {
                // Regular number conversion logic
                if (typeof value === 'number') {
                    return value;
                }
                if (typeof value === 'string') {
                    const num = parseFloat(value);
                    return isNaN(num) ? null : num;
                }
                return null;
            }
        } catch (error) {
            // Fallback to regular number conversion if property lookup fails
            if (typeof value === 'number') {
                return value;
            }
            if (typeof value === 'string') {
                const num = parseFloat(value);
                return isNaN(num) ? null : num;
            }
            return null;
        }
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

            // Check if it's an UndirectLinkCondition
            if (config.conditionType === 'undirectLink') {
                return {
                    conditionType: 'undirectLink',
                    linkProperty: config.linkProperty,
                    filterCondition: config.filterCondition,
                    // referencingFiles will be injected at runtime
                } as any as UndirectLinkCondition;
            }

            // Otherwise, it's a PropertyCondition
            return config as Condition;
        });
    }

    /**
     * Evaluate hierarchical condition configuration
     * @param conditionConfig The condition configuration (supports groups, operators, and backward compatibility)
     * @param instance The Classe instance to test
     * @param currentDocument The current document context
     */
    async evaluateConditionConfig(conditionConfig: ConditionConfig, instance: Classe, currentDocument?: Classe): Promise<boolean> {
        // Handle backward compatibility: if it's just an array of conditions
        if (Array.isArray(conditionConfig)) {
            return await this.evaluateConditions(conditionConfig, instance, currentDocument);
        }

        // Handle single condition
        if (this.isCondition(conditionConfig)) {
            return await this.evaluateCondition(conditionConfig as Condition, instance, currentDocument);
        }

        // Handle condition group
        if (this.isConditionGroup(conditionConfig)) {
            return await this.evaluateConditionGroup(conditionConfig as ConditionGroup, instance, currentDocument);
        }

        // If none of the above, treat as an AND group of conditions
        if (conditionConfig.conditions) {
            const group: ConditionGroup = {
                operator: 'AND',
                conditions: conditionConfig.conditions,
                groups: conditionConfig.groups
            };
            return await this.evaluateConditionGroup(group, instance, currentDocument);
        }

        return true; // Default to true if no valid conditions
    }

    /**
     * Evaluate a condition group with AND/OR logic and nested groups
     * @param group The condition group to evaluate
     * @param instance The Classe instance to test
     * @param currentDocument The current document context
     */
    async evaluateConditionGroup(group: ConditionGroup, instance: Classe, currentDocument?: Classe): Promise<boolean> {
        const { operator = 'AND', conditions = [], groups = [], not = false } = group;
        
        const results: boolean[] = [];

        // Evaluate direct conditions
        for (const condition of conditions) {
            const result = await this.evaluateCondition(condition, instance, currentDocument);
            results.push(result);
        }

        // Evaluate nested groups
        for (const nestedGroup of groups) {
            const result = await this.evaluateConditionGroup(nestedGroup, instance, currentDocument);
            results.push(result);
        }

        // If no conditions or groups, return true
        if (results.length === 0) {
            return !not; // Apply NOT if specified
        }

        // Apply operator logic
        let finalResult: boolean;
        if (operator === 'OR') {
            finalResult = results.some(result => result);
        } else { // AND
            finalResult = results.every(result => result);
        }

        // Apply NOT if specified
        return not ? !finalResult : finalResult;
    }

    /**
     * Check if an object is a single condition
     */
    private isCondition(obj: any): boolean {
        return obj && (
            obj.property !== undefined || 
            obj.conditionType === 'directLink' ||
            obj.conditionType === 'undirectLink' ||
            obj.type !== undefined // Condition type (equals, greaterThan, etc.)
        );
    }

    /**
     * Check if an object is a condition group
     */
    private isConditionGroup(obj: any): boolean {
        return obj && (
            obj.operator !== undefined ||
            obj.conditions !== undefined ||
            obj.groups !== undefined
        );
    }

    /**
     * Create a validation function for hierarchical conditions
     * @param conditionConfig The condition configuration
     * @param currentDocument Optional current document for context
     */
    createHierarchicalValidationFunction(conditionConfig: ConditionConfig, currentDocument?: Classe): (instance: Classe) => Promise<boolean> {
        return async (instance: Classe): Promise<boolean> => {
            return await this.evaluateConditionConfig(conditionConfig, instance, currentDocument);
        };
    }

    /**
     * Inject referencingFiles into UndirectLinkConditions recursively
     * This method should be called before evaluating conditions that contain UndirectLinkCondition
     * @param conditions Array of conditions to process
     * @param referencingFiles Pool of files to search through for undirect links
     */
    injectReferencingFiles(conditions: Condition[], referencingFiles: Classe[]): Condition[] {
        return conditions.map(condition => {
            if ('conditionType' in condition && condition.conditionType === 'undirectLink') {
                return {
                    ...condition,
                    referencingFiles: referencingFiles
                } as UndirectLinkCondition;
            }
            return condition;
        });
    }

    /**
     * Inject referencingFiles into condition groups recursively
     * @param conditionConfig The condition configuration
     * @param referencingFiles Pool of files to search through for undirect links
     */
    injectReferencingFilesInConfig(conditionConfig: ConditionConfig, referencingFiles: Classe[]): ConditionConfig {
        const result = { ...conditionConfig };

        if (result.conditions) {
            result.conditions = this.injectReferencingFiles(result.conditions, referencingFiles);
        }

        if (result.groups) {
            result.groups = result.groups.map(group => {
                const updatedGroup = { ...group };
                if (updatedGroup.conditions) {
                    updatedGroup.conditions = this.injectReferencingFiles(updatedGroup.conditions, referencingFiles);
                }
                if (updatedGroup.groups) {
                    updatedGroup.groups = updatedGroup.groups.map(nestedGroup => 
                        this.injectReferencingFilesInConfig(nestedGroup as ConditionConfig, referencingFiles) as ConditionGroup
                    );
                }
                return updatedGroup;
            });
        }

        return result;
    }
}
