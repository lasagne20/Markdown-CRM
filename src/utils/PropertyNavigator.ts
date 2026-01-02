import { Vault } from '../vault/Vault';
import { Classe } from '../vault/Classe';

/**
 * Utility class for navigating through complex property paths
 * Supports:
 * - Dot notation: "user.profile.name"
 * - Array indexing: "clients[0].name"
 * - Filter expressions: "items.filter(status=active).amount"
 * - Linked classes: resolves [[ClassName]] links
 */
export class PropertyNavigator {
    private vault: Vault;
    private context?: any;

    constructor(vault: Vault, context?: any) {
        this.vault = vault;
        this.context = context;
    }

    /**
     * Get nested property value using dot notation (e.g., "partenariats.montant")
     * Supports array filtering with syntax: "partenariats.filter(property=value).targetProperty"
     * Supports array indexing with syntax: "clients[0].name"
     * Falls back to regular getPropertyValue for simple properties
     */
    async getNestedPropertyValue(file: Classe, propertyPath: string): Promise<any> {
        // If no dots and no array indexing, use regular getPropertyValue
        if (!propertyPath.includes('.') && !propertyPath.includes('[')) {
            return await file.getPropertyValue(propertyPath);
        }
        
        // If has array indexing but no dots, still delegate to getPropertyValue
        // to handle simple cases like "clients[0]"
        if (!propertyPath.includes('.') && propertyPath.includes('[')) {
            return await file.getPropertyValue(propertyPath);
        }

        // Check for filter syntax: array.filter(property=value).targetProperty
        const filterMatch = propertyPath.match(/^([^.]+)\.filter\(([^=]+)=([^)]+)\)\.(.+)$/);
        if (filterMatch) {
            const [, arrayProperty, filterProperty, filterValue, targetProperty] = filterMatch;
            
            // Get the array
            const arrayValue = await file.getPropertyValue(arrayProperty);
            if (!Array.isArray(arrayValue)) {
                return undefined;
            }

            // Filter the array
            const filteredItems = arrayValue.filter((item: any) => {
                if (typeof item !== 'object' || item === null) {
                    return false;
                }
                
                // Handle special $current value for filtering
                if (filterValue === '$current') {
                    // Use context to get the current instance information
                    const currentName = this.context?.getName?.() || '';
                    const currentPath = this.context?.getPath?.() || '';
                    
                    // Support both direct name matching and path matching
                    const itemValue = String(item[filterProperty] || '');
                    return itemValue === currentName || 
                           itemValue === currentPath ||
                           itemValue.includes(`[[${currentName}]]`) ||
                           itemValue.includes(currentName);
                }
                
                // Regular value filtering (case insensitive)
                const itemValue = String(item[filterProperty] || '').toLowerCase();
                const targetValue = String(filterValue).toLowerCase();
                return itemValue === targetValue;
            });

            if (filteredItems.length === 0) {
                return undefined;
            }

            // Extract target property from filtered items
            const targetValues = filteredItems.map(item => {
                // Support nested target properties (e.g., "contact.nom")
                if (targetProperty.includes('.')) {
                    return this.navigateNestedProperty(item, targetProperty.split('.'));
                } else {
                    return item[targetProperty];
                }
            }).filter(value => value !== undefined && value !== null);

            if (targetValues.length === 0) {
                return undefined;
            }

            // Return the array of values for formulas to process
            // Don't aggregate here - let the formula (sum/avg/count/min/max) handle it
            return targetValues;
        }

        // Regular nested property navigation using dots
        const parts = propertyPath.split('.');
        let currentValue = await file.getPropertyValue(parts[0]);
        return this.navigateNestedProperty(currentValue, parts.slice(1));
    }

    /**
     * Navigate through nested properties
     */
    navigateNestedProperty(currentValue: any, parts: string[]): any {
        if (parts.length === 0) {
            return currentValue;
        }

        if (currentValue === null || currentValue === undefined) {
            return undefined;
        }

        const [nextPart, ...remainingParts] = parts;

        // Handle arrays
        if (Array.isArray(currentValue)) {
            // For arrays, we try to get the property from each element
            // This is used for cases like "partenariats.montant" where partenariats is an array
            const values = currentValue.map(item => {
                if (typeof item === 'object' && item !== null && item.hasOwnProperty(nextPart)) {
                    return this.navigateNestedProperty(item[nextPart], remainingParts);
                }
                return undefined;
            }).filter(val => val !== undefined);

            if (values.length === 0) {
                return undefined;
            } else if (values.length === 1) {
                return values[0];
            } else {
                // Multiple values - we should not automatically unwrap multi-element arrays
                // This preserves the original behavior where arrays with multiple elements
                // should use explicit filter() syntax
                return undefined;
            }
        }

        // Handle objects
        if (typeof currentValue === 'object' && currentValue.hasOwnProperty(nextPart)) {
            return this.navigateNestedProperty(currentValue[nextPart], remainingParts);
        }

        return undefined;
    }

    /**
     * Get nested property using dot notation with support for linked classes
     * @param obj - The object to navigate
     * @param path - The property path (e.g., "user.profile.name" or "clients[0].institution.lieu")
     * @returns The property value
     */
    async getNestedProperty(obj: any, path: string): Promise<any> {
        const parts = path.split('.');
        let current = obj;
        
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            
            if (current === null || current === undefined) {
                return undefined;
            }
            
            // Handle array indexing (e.g., "clients[0]")
            const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
            if (arrayMatch) {
                const [, arrayName, indexStr] = arrayMatch;
                const index = parseInt(indexStr, 10);
                
                if (current[arrayName] && Array.isArray(current[arrayName])) {
                    current = current[arrayName][index];
                } else {
                    return undefined;
                }
            } else {
                // Get property value - try different methods
                if (current.getPropertyValue && typeof current.getPropertyValue === 'function') {
                    // If it's a Classe instance, use getPropertyValue for the rest of the path
                    const remainingPath = parts.slice(i).join('.');
                    current = await current.getPropertyValue(remainingPath);
                    
                    // If we got a value from getPropertyValue, we need to check if there are more parts
                    // But getPropertyValue might have handled the whole path already
                    // So we break here and check for links below
                    break;
                } else {
                    // Simple object property access
                    current = current[part];
                }
            }
            
            // Check if current value is a link to another class (format: [[ClassName]])
            if (typeof current === 'string' && current.match(/^\[\[.+\]\]$/)) {
                try {
                    const linkedClasse = await this.vault.getFromLink(current);
                    if (linkedClasse) {
                        current = linkedClasse;
                        
                        // If there are remaining parts in the path, continue navigation
                        const remainingParts = parts.slice(i + 1);
                        if (remainingParts.length > 0) {
                            const remainingPath = remainingParts.join('.');
                            return await this.getNestedProperty(current, remainingPath);
                        }
                    } else {
                        return undefined;
                    }
                } catch (error) {
                    console.warn(`Error loading linked class from ${current}:`, error);
                    return undefined;
                }
            }
        }
        
        return current;
    }

    /**
     * Evaluate complex property expressions like "animateurs.filter(animateur=$current).tarif"
     * @param propName - The complex property expression
     * @param obj - The current object being evaluated
     * @param parentInstance - The parent Classe instance for context
     * @returns The evaluated property value
     */
    async evaluateComplexProperty(propName: string, obj: any, parentInstance: Classe): Promise<any> {
        // Check if this is a filter expression
        const filterMatch = propName.match(/^(.+?)\.filter\((.+?)\)(?:\.(.+))?$/);
        
        if (filterMatch) {
            const [, baseProperty, filterCondition, targetProperty] = filterMatch;
            
            // Get the base property value from the current object
            const baseValue = obj[baseProperty];
            
            if (!Array.isArray(baseValue)) {
                console.warn(`Property ${baseProperty} is not an array, cannot apply filter`);
                return undefined;
            }
            
            // Parse the filter condition (e.g., "animateur=$current")
            const conditionMatch = filterCondition.match(/^(\w+)=\$current$/);
            if (conditionMatch) {
                const [, conditionProperty] = conditionMatch;
                const currentName = parentInstance.getName();
                
                // Filter the array based on the condition
                const filteredItems = baseValue.filter(item => {
                    if (typeof item === 'object' && item !== null) {
                        return item[conditionProperty] === currentName;
                    }
                    return false;
                });
                
                // If there's a target property, extract it from filtered items
                if (targetProperty && filteredItems.length > 0) {
                    const result = filteredItems.map(item => item[targetProperty]);
                    // Return first value if only one match, otherwise return array
                    return result.length === 1 ? result[0] : result;
                }
                
                // Return the filtered items
                return filteredItems.length === 1 ? filteredItems[0] : filteredItems;
            }
            
            // If condition doesn't match expected pattern, return undefined
            console.warn(`Unsupported filter condition: ${filterCondition}`);
            return undefined;
        }
        
        // For other complex expressions, fall back to basic navigation
        return await this.getNestedProperty(obj, propName);
    }
}
