# Condition System

The Markdown CRM system provides a powerful condition system for filtering instances based on their properties. Conditions can be used to filter file selections in `FileProperty` and `MultiFileProperty`.

## Condition Types

### Property Conditions

Standard conditions that evaluate properties of an instance:

#### Comparison Conditions

- **equals**: Property value equals a specific value
- **notEquals**: Property value does not equal a specific value
- **equalsAny**: Property value equals any value from a list
- **notEqualsAny**: Property value does not equal any value from a list

#### String Conditions

- **contains**: Property value (string or array) contains a specific value
- **notContains**: Property value (string or array) does not contain a specific value

#### Numeric Conditions

- **greaterThan**: Numeric property value is greater than a value
- **lessThan**: Numeric property value is less than a value
- **greaterThanOrEqual**: Numeric property value is greater than or equal to a value
- **lessThanOrEqual**: Numeric property value is less than or equal to a value

#### Emptiness Conditions

- **isEmpty**: Property value is empty (null, undefined, empty string, or empty array)
- **isNotEmpty**: Property value is not empty

### DirectLink Condition

Special condition that checks if an instance has a direct link to the current document:

- **directLink**: Filters instances that reference the current document in their properties
  - `linkProperty` (optional): Specific property to check for the link
  - If not specified, checks all `FileProperty` and `MultiFileProperty` instances

## YAML Configuration

### Basic Property Conditions

```yaml
properties:
  institution:
    type: FileProperty
    title: Active Institution
    icon: 🏢
    classes:
      - Institution
    conditions:
      - property: status
        type: equals
        value: Active
```

### Multiple Conditions (AND Logic)

All conditions must be true for an instance to pass:

```yaml
properties:
  large_active_city:
    type: FileProperty
    title: Large Active City
    icon: 🏙️
    classes:
      - City
    conditions:
      - property: status
        type: equals
        value: Active
      - property: population
        type: greaterThan
        value: 100000
      - property: country
        type: equalsAny
        values:
          - USA
          - Canada
          - UK
```

### DirectLink Condition

Filter instances that link to the current document:

```yaml
properties:
  related_institutions:
    type: MultiFileProperty
    title: Related Institutions
    icon: 🏢
    classes:
      - Institution
    conditions:
      # Only show institutions that have the current document in their contacts
      - conditionType: directLink
        linkProperty: contacts
```

### Mixed Conditions

Combine property conditions with DirectLink:

```yaml
properties:
  active_linked_institutions:
    type: FileProperty
    title: Active Institutions Linked to Me
    icon: 🏢
    classes:
      - Institution
    conditions:
      # Must be active
      - property: status
        type: equals
        value: Active
      # Must have a link to current document
      - conditionType: directLink
```

## Usage Examples

### Example 1: Filter Active Items

```yaml
properties:
  active_contacts:
    type: MultiFileProperty
    title: Active Contacts
    icon: 👤
    classes:
      - Person
    conditions:
      - property: status
        type: notEquals
        value: Inactive
```

### Example 2: Filter by Multiple Values

```yaml
properties:
  specific_locations:
    type: FileProperty
    title: Select Location
    icon: 📍
    classes:
      - Location
    conditions:
      - property: type
        type: equalsAny
        values:
          - City
          - Town
          - Village
```

### Example 3: Filter Non-Empty Values

```yaml
properties:
  contacts_with_email:
    type: MultiFileProperty
    title: Contacts with Email
    icon: 📧
    classes:
      - Person
    conditions:
      - property: email
        type: isNotEmpty
```

### Example 4: Filter by Text Content

```yaml
properties:
  paris_locations:
    type: FileProperty
    title: Paris Locations
    icon: 🗼
    classes:
      - Location
    conditions:
      - property: address
        type: contains
        value: Paris
```

### Example 5: Complex Filtering

```yaml
properties:
  qualified_institutions:
    type: MultiFileProperty
    title: Qualified Institutions
    icon: 🏛️
    classes:
      - Institution
    conditions:
      # Must be active
      - property: status
        type: equals
        value: Active
      # Must have employees
      - property: employee_count
        type: greaterThan
        value: 10
      # Must not be in specific categories
      - property: category
        type: notEqualsAny
        values:
          - Archived
          - Suspended
      # Must have a description
      - property: description
        type: isNotEmpty
      # Must link to current document
      - conditionType: directLink
        linkProperty: partners
```

## TypeScript/JavaScript Usage

### Creating a Validation Function

```typescript
import { ConditionManager, Condition } from './Config/ConditionManager';

const conditions: Condition[] = [
    {
        property: 'status',
        type: 'equals',
        value: 'Active'
    },
    {
        property: 'population',
        type: 'greaterThan',
        value: 50000
    }
];

const conditionManager = new ConditionManager();
const validationFunction = conditionManager.createValidationFunction(conditions);

// Use with instances
const passes = await validationFunction(instanceToTest);
```

### DirectLink with Current Document

```typescript
import { DirectLinkCondition } from './Config/ConditionManager';

const currentDocument: Classe = /* current document instance */;

const conditions: Condition[] = [
    {
        property: 'status',
        type: 'equals',
        value: 'Active'
    },
    {
        conditionType: 'directLink',
        linkProperty: 'related_contacts'
        // currentDocument will be injected at runtime
    }
];

// Pass currentDocument when creating validation function
const validationFunction = conditionManager.createValidationFunction(
    conditions,
    currentDocument
);
```

### Parsing YAML Conditions

```typescript
import { ConditionManager } from './Config/ConditionManager';

// Parse conditions from YAML config
const yamlConditions = [
    { property: 'status', type: 'equals', value: 'Active' },
    { conditionType: 'directLink', linkProperty: 'contacts' }
];

const parsedConditions = ConditionManager.parseConditions(yamlConditions);
```

## Implementation Details

### Evaluation Logic

- All conditions use **AND logic**: an instance must satisfy ALL conditions to pass
- Conditions are evaluated sequentially
- If any condition fails, evaluation stops and returns `false`
- Empty condition arrays always return `true`

### Type Handling

- **String comparisons**: Case-insensitive
- **Numeric comparisons**: Automatic conversion from strings to numbers
- **Array handling**: For `contains` and multi-value properties
- **Link normalization**: Removes `[[` and `]]` brackets for comparison

### DirectLink Behavior

1. If `linkProperty` is specified:
   - Only checks that specific property
   - Property must be a `FileProperty` or `MultiFileProperty`

2. If `linkProperty` is not specified:
   - Checks ALL `FileProperty` and `MultiFileProperty` instances
   - Returns `true` if ANY property contains a link to the current document

3. Current document injection:
   - `currentDocument` is injected at runtime when calling `createValidationFunction()`
   - Allows conditions to be defined statically in YAML
   - Document context is provided when the validation function is actually used

## Best Practices

1. **Order conditions by specificity**: Put faster conditions first (e.g., simple equality before complex checks)

2. **Use appropriate condition types**: 
   - Use `equalsAny` instead of multiple `equals` conditions
   - Use `isEmpty`/`isNotEmpty` for existence checks

3. **Combine with DirectLink carefully**: DirectLink can be expensive, combine with other filters first

4. **Test conditions**: Always test your conditions with sample data to ensure they work as expected

5. **Document complex conditions**: Add comments in YAML for complex filtering logic

## Error Handling

- Unknown condition types log a warning and return `false`
- Property read errors log an error and return `null` for the property value
- Type conversion errors (e.g., non-numeric values with numeric comparisons) return `null`

## Performance Considerations

- Conditions are evaluated lazily (short-circuit on first failure)
- DirectLink conditions check all file properties if no specific property is given
- Consider the number of instances being filtered and complexity of conditions
- Cache validation functions when possible instead of recreating them
