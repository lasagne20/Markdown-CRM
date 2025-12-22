import { Classe } from '../vault/Classe';
import { RangeDateProperty } from '../properties/RangeDateProperty';

/**
 * TemplateEngine handles template string replacement with property values
 * Supports various placeholder formats:
 * - {propertyName} - Simple property access
 * - {current} - Current filename (for rename operations)
 * - {property.nested} - Nested object properties
 * - {array[0].property} - Array element access with nested properties
 */
export class TemplateEngine {
    /**
     * Process a template string by replacing placeholders with values from metadata
     * @param template Template string with {placeholder} syntax
     * @param metadata Metadata object containing the values
     * @param currentValue Optional current value (e.g., current filename) for {current} placeholder
     * @returns Processed string with all placeholders replaced, or null if any required value is missing
     */
    public static async processTemplate(
        template: string,
        metadata: Record<string, any>,
        currentValue?: string
    ): Promise<string | null> {
        console.log(`🎨 Processing template: "${template}"`);
        console.log(`📊 Metadata:`, metadata);
        
        let result = template;

        // Find all placeholders in the template
        const placeholderRegex = /\{([^}]+)\}/g;

        // Replace placeholders
        for (const match of Array.from(template.matchAll(placeholderRegex))) {
            const placeholder = match[1];
            let value: any;

            if (placeholder === 'current') {
                if (currentValue === undefined) {
                    console.log(`  ❌ {current} used but no currentValue provided`);
                    return null;
                }

                // Clean current value from previous template applications
                value = this.cleanCurrentValue(currentValue, template);
                console.log(`  🔄 {${placeholder}} = "${value}" (current value)`);
            } else if (placeholder.includes('[') && placeholder.includes(']')) {
                // Handle array access (e.g., "clients[0].client")
                value = this.getArrayPropertyValue(metadata, placeholder);
                console.log(`  📦 {${placeholder}} = "${value}" (array property)`);
            } else if (placeholder.includes('.')) {
                // Handle nested properties (e.g., "postes.poste")
                value = this.getNestedPropertyValue(metadata, placeholder);
                console.log(`  📦 {${placeholder}} = "${value}" (nested property)`);
            } else {
                // Simple property
                value = metadata[placeholder];
                console.log(`  📝 {${placeholder}} = "${value}" (simple property)`);
            }

            // If any required value is missing or empty, abort processing
            if (value === undefined || value === null || value === '') {
                console.log(`  ❌ Missing or empty value for {${placeholder}}, aborting`);
                return null;
            }

            // Convert value to string
            const stringValue = this.valueToString(value);
            result = result.replace(`{${placeholder}}`, stringValue);
            console.log(`  ✅ Replaced {${placeholder}} with "${stringValue}"`);
        }

        console.log(`✨ Final result: "${result}"`);
        return result;
    }

    /**
     * Process a template from a Classe instance
     * @param template Template string
     * @param instance Classe instance to get metadata from
     * @param currentValue Optional current value for {current} placeholder
     * @returns Processed template or null if processing failed
     */
    public static async processTemplateFromInstance(
        template: string,
        instance: Classe,
        currentValue?: string
    ): Promise<string | null> {
        console.log(`🎨 Processing template from instance: "${template}"`);
        
        const originalTemplate = template.trim();
        let result = template;

        // Only treat as direct property expression if it contains {placeholders} already
        // or if it's explicitly "current" or matches array/nested notation
        if (!template.includes('{') && this.isPropertyAccessPattern(template)) {
            console.log(`📝 Direct property expression detected: "${template}"`);            
            result = `{${template}}`;
        }

        // Find all placeholders in the template
        const placeholderRegex = /\{([^}]+)\}/g;

        // Get metadata for fallback
        const metadata = await instance.getMetadata();
        console.log(`📊 Metadata:`, metadata);

        // Replace placeholders
        for (const match of Array.from(result.matchAll(placeholderRegex))) {
            const placeholder = match[1];
            let value: any;

            if (placeholder === 'current') {
                if (currentValue === undefined) {
                    console.log(`  ❌ {current} used but no currentValue provided`);
                    return null;
                }

                // If original template is ONLY "current" or "{current}", return full link
                // This is typically for FileProperty assignments
                if (originalTemplate === 'current' || originalTemplate === '{current}') {
                    const file = instance.getFile();
                    if (file) {
                        value = `[[${file.path}|${currentValue}]]`;
                        console.log(`  🔗 {${placeholder}} = "${value}" (current as full link)`);
                    } else {
                        value = currentValue;
                        console.log(`  🔄 {${placeholder}} = "${value}" (current value, no file)`);
                    }
                } else {
                    // Part of a larger template - clean current value from previous template applications
                    value = this.cleanCurrentValue(currentValue, originalTemplate);
                    console.log(`  🔄 {${placeholder}} = "${value}" (current value)`);
                }
            } else if (placeholder.includes('[') || placeholder.includes('.')) {
                // For complex paths, use metadata directly
                if (placeholder.includes('[') && placeholder.includes(']')) {
                    value = this.getArrayPropertyValue(metadata, placeholder);
                    console.log(`  📦 {${placeholder}} = "${value}" (array property)`);
                } else {
                    value = this.getNestedPropertyValue(metadata, placeholder);
                    console.log(`  📦 {${placeholder}} = "${value}" (nested property)`);
                }

                // Clean Obsidian links in array/nested values
                if (typeof value === 'string') {
                    const cleanedValue = this.cleanObsidianLink(value);
                    if (cleanedValue !== value) {
                        console.log(`  🧹 Cleaned link: "${value}" → "${cleanedValue}"`);
                        value = cleanedValue;
                    }

                    // Extract start date from daterange
                    const extractedDate = RangeDateProperty.extractStartDateFromRange(value);
                    if (extractedDate !== value) {
                        console.log(`  📅 Extracted start date: "${value}" → "${extractedDate}"`);
                        value = extractedDate;
                    }
                }
            } else {
                // Simple property - check if it's a date-related property
                const property = instance.getProperty(placeholder);
                if (property && typeof property.getPretty === 'function') {
                    // Skip getPretty for date properties to preserve raw format (YYYY-MM-DD or YYYY-MM-DD/YYYY-MM-DD)
                    const isDateProperty = property.constructor.name === 'DateProperty' || 
                                          property.constructor.name === 'RangeDateProperty';
                    
                    if (!isDateProperty) {
                        // Use getPretty for non-date properties
                        const rawValue = metadata[placeholder];
                        if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
                            value = property.getPretty(rawValue);
                            console.log(`  ✨ {${placeholder}} = "${value}" (via getPretty)`);
                        } else {
                            value = rawValue;
                            console.log(`  📝 {${placeholder}} = "${value}" (raw value)`);
                        }
                    } else {
                        // For date properties, use raw value to preserve YYYY-MM-DD format
                        value = metadata[placeholder];
                        console.log(`  📅 {${placeholder}} = "${value}" (date property - raw format)`);
                    }
                } else {
                    // Fallback to metadata value
                    value = metadata[placeholder];
                    console.log(`  📝 {${placeholder}} = "${value}" (metadata)`);
                }

                // Clean Obsidian links and extract daterange for simple properties too
                if (typeof value === 'string') {
                    const cleanedValue = this.cleanObsidianLink(value);
                    if (cleanedValue !== value) {
                        console.log(`  🧹 Cleaned link: "${value}" → "${cleanedValue}"`);
                        value = cleanedValue;
                    }

                    const extractedDate = RangeDateProperty.extractStartDateFromRange(value);
                    if (extractedDate !== value) {
                        console.log(`  📅 Extracted start date: "${value}" → "${extractedDate}"`);
                        value = extractedDate;
                    }
                }
            }

            // If any required value is missing or empty, abort processing
            if (value === undefined || value === null || value === '') {
                console.log(`  ❌ Missing or empty value for {${placeholder}}, aborting`);
                return null;
            }

            // Convert value to string
            const stringValue = this.valueToString(value);
            result = result.replace(`{${placeholder}}`, stringValue);
            console.log(`  ✅ Replaced {${placeholder}} with "${stringValue}"`);
        }

        console.log(`✨ Final result: "${result}"`);
        return result;
    }

    /**
     * Clean the current value from previous template applications
     * This removes parts of the template that were already applied to avoid duplication
     */
    private static cleanCurrentValue(currentValue: string, template: string): string {
        let cleanedValue = currentValue;

        // Find position of {current} in template
        const currentIndex = template.indexOf('{current}');

        if (currentIndex > 0) {
            // {current} has content BEFORE it - remove all matching prefixes iteratively
            const prefixTemplate = template.substring(0, currentIndex);

            // Convert template placeholders to regex patterns that match any value
            const regexPattern = prefixTemplate
                .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
                .replace(/\\\{[^}]+\\\}/g, '.+?'); // Replace {prop} with .+? (non-greedy any)

            let previousValue = '';
            const regex = new RegExp(regexPattern, 'g');
            
            // Keep cleaning until no more matches are found
            while (previousValue !== cleanedValue) {
                previousValue = cleanedValue;
                // Remove ALL occurrences of the pattern, not just at the start
                const newValue = cleanedValue.replace(regex, '').trim();
                if (newValue !== cleanedValue && newValue !== previousValue) {
                    cleanedValue = newValue;
                    console.log(`  🧹 Cleaned {current}: pattern "${prefixTemplate}" matched`);
                    console.log(`    "${previousValue}" → "${cleanedValue}"`);
                } else {
                    break;
                }
            }
        } else if (currentIndex === 0) {
            // {current} is at the START - remove all matching suffixes iteratively
            const suffixIndex = template.indexOf('}', currentIndex) + 1;
            if (suffixIndex < template.length) {
                const suffixTemplate = template.substring(suffixIndex);

                // Convert template placeholders to regex patterns
                const regexPattern = suffixTemplate
                    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
                    .replace(/\\\{[^}]+\\\}/g, '.+?'); // Replace {prop} with .+? (non-greedy any)

                let previousValue = '';
                const regex = new RegExp(regexPattern, 'g');
                
                // Keep cleaning until no more matches are found
                while (previousValue !== cleanedValue) {
                    previousValue = cleanedValue;
                    const newValue = cleanedValue.replace(regex, '').trim();
                    if (newValue !== cleanedValue && newValue !== previousValue) {
                        cleanedValue = newValue;
                        console.log(`  🧹 Cleaned {current} at start: pattern "${suffixTemplate}" matched`);
                        console.log(`    "${previousValue}" → "${cleanedValue}"`);
                    } else {
                        break;
                    }
                }
            }
        }

        return cleanedValue;
    }

    /**
     * Get array property value with index notation
     * Examples: "clients[0].client", "items[2].name"
     */
    private static getArrayPropertyValue(metadata: Record<string, any>, path: string): any {
        // Parse array notation: "clients[0].client" -> ["clients", "0", "client"]
        // Match pattern: propertyName[index].nestedProperty or propertyName[index]
        const arrayMatch = path.match(/^([^\[]+)\[(\d+)\](.*)$/);
        
        if (!arrayMatch) {
            return undefined;
        }

        const [, arrayName, indexStr, rest] = arrayMatch;
        const index = parseInt(indexStr, 10);

        // Get the array
        let value = metadata[arrayName];
        
        if (!Array.isArray(value)) {
            return undefined;
        }

        // Check bounds
        if (index < 0 || index >= value.length) {
            return undefined;
        }

        // Get the array element
        value = value[index];

        // If there's a nested path after the array index (e.g., ".client")
        if (rest && rest.startsWith('.')) {
            const nestedPath = rest.substring(1); // Remove leading dot
            return this.getNestedPropertyValue(value, nestedPath);
        }

        return value;
    }

    /**
     * Get nested property value using dot notation
     */
    private static getNestedPropertyValue(metadata: Record<string, any>, path: string): any {
        const parts = path.split('.');
        let value: any = metadata;

        for (const part of parts) {
            if (value && typeof value === 'object' && part in value) {
                value = value[part];
            } else {
                return undefined;
            }
        }

        return value;
    }

    /**
     * Convert a value to string for template replacement
     */
    private static valueToString(value: any): string {
        if (value instanceof Date) {
            return value.toISOString().split('T')[0]; // YYYY-MM-DD
        }
        return String(value);
    }

    /**
     * Check if a string looks like a property access pattern
     * Only matches: "current", array notation like "array[0]", or nested like "prop.nested"
     * Does NOT match simple strings that look like values (no special chars)
     */
    private static isPropertyAccessPattern(value: string): boolean {
        // Must be "current" keyword or contain array/dot notation
        return value === 'current' || 
               value.includes('[') || 
               value.includes('.');
    }

    /**
     * Clean Obsidian link format from a value
     * Extracts the display name from [[path/to/file.md|Display Name]] or [[File Name]]
     */
    private static cleanObsidianLink(value: string): string {
        if (typeof value !== 'string') {
            return value;
        }

        // Match [[file|alias]] or [[file]]
        const match = value.match(/^\[\[(.*?)(?:\|([^\]]+?))?\]\]$/);
        if (match) {
            const fileName = match[1]?.trim();
            const alias = match[2]?.trim();
            // Return alias if present, otherwise extract filename from path
            return alias ? alias : fileName.split("/").pop()?.replace(".md","") || fileName;
        }

        return value;
    }
}
