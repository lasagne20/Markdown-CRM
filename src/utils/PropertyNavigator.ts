import { Vault } from '../vault/Vault';
import { Classe } from '../vault/Classe';
import { Property } from '../properties/Property';

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
    private properties?: { [key: string]: Property };
    private updateCallback?: (propertyName: string, value: any) => Promise<void>;

    constructor(vault: Vault, context?: any, properties?: { [key: string]: Property }, updateCallback?: (propertyName: string, value: any) => Promise<void>) {
        this.vault = vault;
        this.context = context;
        this.properties = properties;
        this.updateCallback = updateCallback;
    }

    /**
     * Get nested property using dot notation with support for linked classes
     * @param obj - The object to navigate (can be plain object or Classe instance)
     * @param path - The property path (e.g., "user.profile.name" or "clients[0].institution.lieu")
     * @returns The property value
     */
    async getNestedProperty(obj: any, path: string): Promise<any> {
        // Handle filter syntax for Classe instances: array.filter(property=value).targetProperty
        if (obj && obj.getPropertyValue && typeof obj.getPropertyValue === 'function') {
            const filterMatch = path.match(/^([^.]+)\.filter\(([^=]+)=([^)]+)\)\.(.+)$/);
            if (filterMatch) {
                const [, arrayProperty, filterProperty, filterValue, targetProperty] = filterMatch;
                
                // Get the array
                const arrayValue = await obj.getPropertyValue(arrayProperty);
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

                // Extract target property from filtered items (now async)
                const targetValues = await Promise.all(filteredItems.map(async (item) => {
                    // Support nested target properties (e.g., "contact.nom")
                    if (targetProperty.includes('.')) {
                        return await this.navigateNestedProperty(item, targetProperty.split('.'));
                    } else {
                        return item[targetProperty];
                    }
                }));
                
                const filteredTargetValues = targetValues.filter(value => value !== undefined && value !== null);

                if (filteredTargetValues.length === 0) {
                    return undefined;
                }

                // Return the array of values for formulas to process
                return filteredTargetValues;
            }
        }
        
        // Handle array indexing with nested property (e.g., "clients[0].institution.lieu")
        const arrayWithPropertyMatch = path.match(/^(\w+)\[(\d+)\]\.(.+)$/);
        if (arrayWithPropertyMatch) {
            const [, arrayName, indexStr, nestedPath] = arrayWithPropertyMatch;
            const index = parseInt(indexStr, 10);
            
            // Get the array value (use getPropertyValue for Classe, direct access for objects)
            let arrayValue;
            if (obj && obj.getPropertyValue && typeof obj.getPropertyValue === 'function') {
                arrayValue = await obj.getPropertyValue(arrayName);
            } else {
                arrayValue = obj[arrayName];
            }
            
            if (Array.isArray(arrayValue) && index >= 0 && index < arrayValue.length) {
                const element = arrayValue[index];
                return await this.navigateNestedProperty(element, nestedPath.split('.'));
            }
            return undefined;
        }
        
        // Handle simple array indexing without nested path (e.g., "clients[0]")
        const simpleArrayMatch = path.match(/^(\w+)\[(\d+)\]$/);
        if (simpleArrayMatch) {
            const [, arrayName, indexStr] = simpleArrayMatch;
            const index = parseInt(indexStr, 10);
            
            // Get the array value (use getPropertyValue for Classe, direct access for objects)
            let arrayValue;
            if (obj && obj.getPropertyValue && typeof obj.getPropertyValue === 'function') {
                arrayValue = await obj.getPropertyValue(arrayName);
            } else {
                arrayValue = obj[arrayName];
            }
            
            if (Array.isArray(arrayValue) && index >= 0 && index < arrayValue.length) {
                return arrayValue[index];
            }
            return undefined;
        }
        
        // Regular dot notation navigation
        const parts = path.split('.');
        
        // Get first value (use getPropertyValue for Classe, direct access for objects)
        let firstValue;
        if (obj && obj.getPropertyValue && typeof obj.getPropertyValue === 'function') {
            firstValue = await obj.getPropertyValue(parts[0]);
        } else {
            firstValue = obj[parts[0]];
        }
        
        return await this.navigateNestedProperty(firstValue, parts.slice(1));
    }

    /**
     * Navigate through nested properties with link resolution support
     */
    async navigateNestedProperty(currentValue: any, parts: string[]): Promise<any> {
        if (parts.length === 0) {
            return currentValue;
        }

        if (currentValue === null || currentValue === undefined) {
            return undefined;
        }

        // Check if current value is a link to another class (format: [[ClassName]])
        if (typeof currentValue === 'string' && currentValue.match(/^\[\[.+\]\]$/)) {
            try {
                const linkedClasse = await this.vault.getFromLink(currentValue);
                if (linkedClasse) {
                    // Continue navigation with the linked class
                    const remainingPath = parts.join('.');
                    return await this.getNestedProperty(linkedClasse, remainingPath);
                } else {
                    return undefined;
                }
            } catch (error) {
                console.warn(`Error loading linked class from ${currentValue}:`, error);
                return undefined;
            }
        }

        const [nextPart, ...remainingParts] = parts;

        // Check if nextPart contains array indexing (e.g., "clients[0]")
        const arrayMatch = nextPart.match(/^(\w+)\[(\d+)\]$/);
        if (arrayMatch) {
            const [, arrayName, indexStr] = arrayMatch;
            const index = parseInt(indexStr, 10);
            
            // Get the array
            let arrayValue;
            if (currentValue && typeof currentValue === 'object' && currentValue.hasOwnProperty(arrayName)) {
                arrayValue = currentValue[arrayName];
            } else {
                return undefined;
            }
            
            if (Array.isArray(arrayValue) && index >= 0 && index < arrayValue.length) {
                const element = arrayValue[index];
                return await this.navigateNestedProperty(element, remainingParts);
            }
            return undefined;
        }

        // Handle arrays
        if (Array.isArray(currentValue)) {
            // For arrays, we try to get the property from each element
            // This is used for cases like "partenariats.montant" where partenariats is an array
            const values = await Promise.all(currentValue.map(async (item) => {
                if (typeof item === 'object' && item !== null && item.hasOwnProperty(nextPart)) {
                    return await this.navigateNestedProperty(item[nextPart], remainingParts);
                }
                return undefined;
            }));
            
            const filteredValues = values.filter(val => val !== undefined);

            if (filteredValues.length === 0) {
                return undefined;
            } else if (filteredValues.length === 1) {
                return filteredValues[0];
            } else {
                // Multiple values - we should not automatically unwrap multi-element arrays
                // This preserves the original behavior where arrays with multiple elements
                // should use explicit filter() syntax
                return undefined;
            }
        }

        // Handle objects
        if (typeof currentValue === 'object' && currentValue.hasOwnProperty(nextPart)) {
            return await this.navigateNestedProperty(currentValue[nextPart], remainingParts);
        }

        return undefined;
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

    /**
     * Get property display for a complex path (e.g., animations[0].date)
     * Returns the actual property display widget if available
     */
    async getPropertyDisplayForPath(path: string, title?: string): Promise<HTMLElement | null> {
        if (!this.properties) {
            console.warn('PropertyNavigator: properties not provided, cannot get property display');
            return null;
        }

        // Parse pattern: propertyName[index].subProperty or propertyName.subProperty
        const arrayMatch = path.match(/^(\w+)\[(\d+)\]\.(\w+)$/);
        const objectMatch = path.match(/^(\w+)\.(\w+)$/);
        
        if (arrayMatch) {
            const [, propertyName, indexStr, subPropertyName] = arrayMatch;
            const index = parseInt(indexStr, 10);
            
            console.log(`🔍 Getting display for ${path}: property=${propertyName}, index=${index}, subProperty=${subPropertyName}`);
            
            // Get the ObjectProperty
            const objectProperty = this.properties[propertyName];
            if (!objectProperty || objectProperty.type !== 'object') {
                console.warn(`❌ Property ${propertyName} not found or not an object property`);
                return null;
            }
            
            // Get the sub-property definition
            const subProperty = (objectProperty as any).properties?.[subPropertyName];
            if (!subProperty) {
                console.warn(`❌ Sub-property ${subPropertyName} not found in ${propertyName}`);
                return null;
            }
            
            console.log(`✅ Found sub-property ${subPropertyName}, type: ${subProperty.type}`);
            
            // Get the array value
            let arrayValue: any[];
            if (this.context.getPropertyValue) {
                arrayValue = await this.context.getPropertyValue(propertyName);
            } else {
                arrayValue = this.context[propertyName];
            }
            
            console.log(`📊 Array value for ${propertyName}:`, arrayValue);
            
            if (!Array.isArray(arrayValue)) {
                console.warn(`❌ ${propertyName} is not an array:`, arrayValue);
                return null;
            }
            
            if (index < 0 || index >= arrayValue.length) {
                console.warn(`❌ Index ${index} out of bounds for ${propertyName} (length: ${arrayValue.length})`);
                return null;
            }
            
            // Get the value for this specific index
            const itemValue = arrayValue[index];
            const value = itemValue?.[subPropertyName];
            
            console.log(`📦 Value at ${propertyName}[${index}].${subPropertyName}:`, value);
            
            // Create update callback
            const updateFn = async (newValue: any) => {
                if (!Array.isArray(arrayValue)) return;
                
                console.log(`💾 Updating ${propertyName}[${index}].${subPropertyName} to:`, newValue);
                arrayValue[index][subPropertyName] = newValue;
                
                if (this.updateCallback) {
                    await this.updateCallback(propertyName, arrayValue);
                } else if (this.context.updatePropertyValue) {
                    await this.context.updatePropertyValue(propertyName, arrayValue);
                }
            };
            
            // Use the sub-property's fillDisplay method to get the actual property widget
            const display = subProperty.fillDisplay(value, updateFn);
            console.log(`🎨 Created display for ${subPropertyName}:`, display);
            
            // Wrap with title if provided
            if (title) {
                const wrapper = document.createElement('div');
                wrapper.className = 'metadata-property';
                
                const titleElement = document.createElement('div');
                titleElement.className = 'metadata-property-key';
                titleElement.textContent = title;
                wrapper.appendChild(titleElement);
                
                const valueWrapper = document.createElement('div');
                valueWrapper.className = 'metadata-property-value';
                valueWrapper.appendChild(display);
                wrapper.appendChild(valueWrapper);
                
                return wrapper;
            }
            
            return display;
        }
        
        if (objectMatch) {
            const [, propertyName, subPropertyName] = objectMatch;
            
            // Similar logic for nested object properties (non-array)
            const property = this.properties[propertyName];
            if (!property || property.type !== 'object') {
                return null;
            }
            
            const subProperty = (property as any).properties?.[subPropertyName];
            if (!subProperty) {
                return null;
            }
            
            // Get the object value
            let objectValue: any;
            if (this.context.getPropertyValue) {
                objectValue = await this.context.getPropertyValue(propertyName);
            } else {
                objectValue = this.context[propertyName];
            }
            
            if (!objectValue || typeof objectValue !== 'object') {
                return null;
            }
            
            const value = objectValue[subPropertyName];
            
            // Create update callback
            const updateFn = async (newValue: any) => {
                objectValue[subPropertyName] = newValue;
                
                if (this.updateCallback) {
                    await this.updateCallback(propertyName, objectValue);
                } else if (this.context.updatePropertyValue) {
                    await this.context.updatePropertyValue(propertyName, objectValue);
                }
            };
            
            const display = subProperty.fillDisplay(value, updateFn);
            
            if (title) {
                const wrapper = document.createElement('div');
                wrapper.className = 'metadata-property';
                
                const titleElement = document.createElement('div');
                titleElement.className = 'metadata-property-key';
                titleElement.textContent = title;
                wrapper.appendChild(titleElement);
                
                const valueWrapper = document.createElement('div');
                valueWrapper.className = 'metadata-property-value';
                valueWrapper.appendChild(display);
                wrapper.appendChild(valueWrapper);
                
                return wrapper;
            }
            
            return display;
        }
        
        return null;
    }
}
