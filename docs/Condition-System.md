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

### RelatedClass Condition

Special condition that filters instances based on related class instances that match conditions:

- **relatedClass**: Filters instances based on their relationships with instances of another class
  - `relatedClass` (required): Name of the related class to check (e.g., 'Action')
  - `linkDirection` (required): Direction of the relationship
    - `incoming`: Related class has properties pointing TO this instance (e.g., Action.participants → Person)
    - `outgoing`: This instance has properties pointing TO related class (e.g., Person.projects → Action)
  - `linkProperty` (optional): Specific property to check (if omitted, checks all file/multifile properties)
  - `matchMode` (optional): Match requirement mode (default: 'any')
    - `any`: At least one related instance must match the conditions
    - `all`: All related instances must match the conditions
  - `conditions` (required): Array of conditions to apply on related instances
  
**Example**: Find persons who appear in actions in a specific location:
```yaml
properties:
  persons_in_actions:
    type: MultiFileProperty
    title: Persons in Local Actions
    icon: 👥
    classes:
      - Person
    conditions:
      - conditionType: relatedClass
        relatedClass: Action
        linkDirection: incoming  # Actions that reference this person
        linkProperty: participants  # Optional: only check this property
        matchMode: any  # At least one action must match
        conditions:
          - property: location
            type: equals
            value: $current  # Actions in current location
```

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

### RelatedClass Condition Examples

#### Example 1: Incoming Links (Find by Referencing Class)

Filter persons who appear in actions in the current location:

```yaml
properties:
  local_participants:
    type: MultiFileProperty
    title: Participants in Local Actions
    icon: 👥
    classes:
      - Person
    conditions:
      - conditionType: relatedClass
        relatedClass: Action
        linkDirection: incoming  # Actions reference these persons
        conditions:
          - property: location
            type: equals
            value: $current  # Current location
```

#### Example 2: Outgoing Links (Find by Referenced Class)

Filter persons who have projects in a specific status:

```yaml
properties:
  persons_with_active_projects:
    type: MultiFileProperty
    title: Persons with Active Projects
    icon: 👤
    classes:
      - Person
    conditions:
      - conditionType: relatedClass
        relatedClass: Action
        linkDirection: outgoing  # Person references actions
        linkProperty: projects  # Only check this property
        conditions:
          - property: status
            type: equals
            value: Active
```

#### Example 3: All Must Match

Filter communes where ALL actions meet criteria:

```yaml
properties:
  fully_compliant_communes:
    type: MultiFileProperty
    title: Fully Compliant Communes
    icon: 🏘️
    classes:
      - Commune
    conditions:
      - conditionType: relatedClass
        relatedClass: Action
        linkDirection: incoming
        matchMode: all  # ALL actions must match
        conditions:
          - property: compliance
            type: equals
            value: Complete
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

### RelatedClass Conditions

```typescript
import { RelatedClassCondition } from './Config/ConditionManager';

const conditions: Condition[] = [
    {
        conditionType: 'relatedClass',
        relatedClass: 'Action',
        linkDirection: 'incoming',  // or 'outgoing'
        linkProperty: 'participants',  // optional
        matchMode: 'any',  // or 'all', optional (default: 'any')
        conditions: [
            {
                property: 'location',
                type: 'equals',
                value: '$current'  // Use current document
            },
            {
                property: 'status',
                type: 'equals',
                value: 'Active'
            }
        ]
    }
];

// Requires vault to be provided to ConditionManager
const conditionManager = new ConditionManager(vault);
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
   - Checks nested properties inside `ObjectProperty` types
   - Returns `true` if ANY property contains a link to the current document

3. Current document injection:
   - `currentDocument` is injected at runtime when calling `createValidationFunction()`
   - Allows conditions to be defined statically in YAML
   - Document context is provided when the validation function is actually used

### RelatedClass Behavior

1. **Link Direction**:
   - `incoming`: Finds instances of the related class that have properties pointing to the current instance
     - Example: Find all Actions where `participants` includes this Person
   - `outgoing`: Finds instances of the related class that the current instance's properties point to
     - Example: Find all Actions referenced in this Person's `projects` property

2. **Link Property Discovery**:
   - If `linkProperty` is specified: Only checks that specific property
   - If not specified: Checks all `FileProperty`, `MultiFileProperty`, and nested properties in `ObjectProperty`
   
3. **Match Mode**:
   - `any` (default): Returns true if at least one related instance matches all conditions
   - `all`: Returns true only if ALL related instances match all conditions
   
4. **Condition Evaluation**:
   - Nested conditions are evaluated on the related instances (not the source instance)
   - Supports all condition types including `$current` value references
   - Requires vault access to discover class instances

5. **Performance**:
   - Uses `vault.getClassInstances()` to find all instances of the related class
   - Checks each instance for links in the specified direction
   - Evaluates conditions only on instances that have valid links

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
