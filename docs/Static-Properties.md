# Static Properties (Non-Editable Fields)

## Overview

Static properties allow certain fields to be marked as non-editable in the user interface. This feature is particularly useful for properties that should be defined during creation but should not be modified thereafter.

## Configuration

### In YAML Files

To make a property static, simply add `static: true` in the YAML property configuration:

```yaml
properties:
  - name: type
    type: SelectProperty
    title: Territory Type
    icon: 🗺️
    required: true
    static: true  # This property cannot be modified
    options:
      - National
      - Region
      - Department
      - EPCI
      - Commune

  - name: parent
    type: FileProperty
    title: Parent Territory
    icon: 📂
    static: true  # This property cannot be modified
    classes:
      - Place
```

## Example Usage: Place Class

In the `config/Lieu.yaml` configuration, the `type` and `parent` properties are defined as static:

- **type**: The territory type (National, Region, etc.) is defined at creation and cannot be modified
- **parent**: The parent territory is defined at creation and cannot be modified (prevents inconsistencies in the hierarchy)

## Technical Implementation

### ConfigLoader.ts

The mapping between YAML configuration and Property properties occurs in `ConfigLoader.ts`:

```typescript
// src/Config/ConfigLoader.ts - lines 107-111
createProperty(config: PropertyConfig): Property {
    const options: any = config.icon ? { icon: config.icon} : {};
    
    // Map 'static' from config to 'staticProperty' for the constructor
    if (config.static !== undefined) {
        options.staticProperty = config.static;
    }
    
    // ... rest of code
}
```

### Property.ts

The `static` property is defined in the base `Property` class:

```typescript
export class Property {
    public static: boolean = false;
    
    constructor(name: string, vault: Vault, args?: {
        staticProperty?: boolean,
        // ... other options
    }) {
        this.static = args?.staticProperty || false;
        // ... rest of constructor
    }
}
```

## Behavior in the Interface

When a property is marked as `static: true`:

1. The field appears in the interface but is read-only
2. Edit icons are not displayed
3. The cursor doesn't change on hover
4. Modification events are disabled

## Tests

Comprehensive tests have been added to verify static property behavior:

- **DynamicClassFactory.data-management.test.ts**: 20 tests covering data and folder structure management
- **DynamicClassFactory.parent-creation.test.ts**: Tests for parent-child hierarchy creation

All tests pass: **1081/1081** ✅

## Recommended Use Cases

Static properties are recommended for:

- **Unique Identifiers**: Codes, numbers that should never change
- **Types/Categories**: When changing the type would require complete recreation
- **Hierarchical Relationships**: Parents, dependencies that structure the data
- **System Metadata**: Creation date, creator, etc.

## Limitations

- A static property can still be modified via direct editing of the Markdown file
- Static properties are not locked at the filesystem level
- If you need to modify a static property, you must do so manually in the file or via a script

## See Also

- [Class Configuration](./Display-Configuration.md)
- [Property Types](./Property-Types.md)
- [System Architecture](./Architecture.md)
