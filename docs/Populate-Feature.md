# Populate Feature - Interactive File Creation

## Overview

The **Populate** feature enables interactive file creation by prompting users to fill in specific properties during file creation. This feature significantly improves the user experience by guiding essential data entry.

## Configuration

### Enabling in YAML Configuration

To enable populate on a class, add a `populate` section in the class's YAML configuration file:

```yaml
# Person class configuration
name: Person
icon: 👤

# Populate section - defines properties to fill during creation
populate:
  - property: institution
    title: "Choose an institution"
    required: true

  - property: status
    title: "Choose a status"
    required: false

properties:
  - name: institution
    type: FileProperty
    title: Institution
    classes:
      - Institution
    
  - name: status
    type: SelectProperty
    title: Status
    options:
      - "Active"
      - "Inactive"
      - "On Leave"
      - "Left"
```

### Configuration Options

Each entry in the `populate` section can have the following options:

| Option | Type | Description |
|--------|------|-------------|
| `property` | string | **Required.** Name of the property to fill (must match a property defined in `properties`) |
| `title` | string | **Required.** Title displayed in the selection popup |
| `required` | boolean | **Optional.** If `true`, user must fill this property. If `false` or absent, user can cancel without blocking creation |

## Supported Property Types

The populate system currently supports the following property types:

### 1. FileProperty

Allows selecting an existing file of a specific class.

**Configuration:**
```yaml
populate:
  - property: institution
    title: "Choose an institution"
    required: true

properties:
  - name: institution
    type: FileProperty
    classes:
      - Institution
```

**Behavior:** 
- Opens a file selection popup filtered by class
- Returns a wikilink to the selected file (e.g., `[[TechCorp Solutions]]`)

### 2. SelectProperty

Allows choosing a single value from a list of options.

**Configuration:**
```yaml
populate:
  - property: status
    title: "Choose a status"

properties:
  - name: status
    type: SelectProperty
    options:
      - "Active"
      - "Inactive"
      - "On Leave"
      - "Left"
```

**Behavior:**
- Displays a list of choices
- Returns the selected value

### 3. MultiSelectProperty

Allows choosing multiple values from a list of options.

**Configuration:**
```yaml
populate:
  - property: skills
    title: "Select skills"

properties:
  - name: skills
    type: MultiSelectProperty
    options:
      - "Management"
      - "Technical"
      - "Communication"
      - "Sales"
```

**Behavior:**
- Displays a list with multiple selection
- Returns an array of values (e.g., `["Management", "Technical"]`)

### 4. BooleanProperty

Allows choosing between Yes/No (true/false).

**Configuration:**
```yaml
populate:
  - property: active
    title: "Is the person active?"

properties:
  - name: active
    type: BooleanProperty
```

**Behavior:**
- Displays a binary choice (Yes/No)
- Returns `true` or `false`

## Creation Flow with Populate

### 1. Trigger

Populate automatically triggers during file creation via:
- `vault.createFile(ClassType, 'filename.md')`
- Keyboard shortcuts (e.g., Ctrl+P to create a person)
- Visual interface ("Create" button)

### 2. Execution Sequence

```
┌─────────────────────────────────────┐
│  User triggers creation             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Load class configuration           │
│  Check for `populate` section       │
└──────────────┬──────────────────────┘
               │
               ▼
     ┌─────────────────┐
     │  Populate found? │
     └────┬─────────┬───┘
          │Yes      │No
          ▼         ▼
  ┌───────────┐   ┌──────────────┐
  │  Popups   │   │  Direct      │
  │  for each │   │  creation    │
  │  property │   │  with        │
  │           │   │  template    │
  └─────┬─────┘   └──────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│  Inject values into template        │
│  frontmatter                        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Create file with values            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Move to parent folder              │
│  (if configured)                    │
└─────────────────────────────────────┘
```

### 3. Cancellation Handling

- **Required property (`required: true`)**:
  - If user cancels → file creation is **cancelled**
  - Notification message appears: "Creation cancelled: required field not filled"
  - No file is created

- **Optional property (`required: false` or absent)**:
  - If user cancels → creation **continues**
  - Property keeps its default value from template
  - Other populate properties are still prompted

## Value Injection

Values entered by the user are **injected directly into the template frontmatter** before file creation.

### Template Example

**Initial template** (`templates/Person.md`):
```markdown
---
Class: Person
lastName: ""
firstName: ""
institution: ""
status: Active
skills: []
---

# {{firstName}} {{lastName}}

Information about the person...
```

### After Populate

If user selects:
- Institution: `TechCorp Solutions`
- Status: `On Leave`

**Created file**:
```markdown
---
Class: Person
lastName: ""
firstName: ""
institution: [[TechCorp Solutions]]
status: On Leave
skills: []
---

# {{firstName}} {{lastName}}

Information about the person...
```

## Technical Implementation

### Architecture

```
Vault (One per application)
    │
    └── PopulateManager (Singleton per Vault instance)
        │
        ├── configCache: Map<className, ClassConfig>
        │
        ├── getClassConfig(className)
        │   └── Load from DynamicClassFactory + cache
        │
        ├── populateProperties(classNameOrConfig)
        │   └── Loop through populate[]
        │       └── populateProperty(populateConfig)
        │           ├── Find propertyConfig
        │           ├── Route by type
        │           └── Return value
        │
        ├── mergeWithDefaults(classNameOrConfig, values)
        │   └── Merge populated values with default values
        │
        ├── populateFileProperty()
        │   └── app.selectFile(classes)
        │
        ├── populateSelectProperty()
        │   └── app.selectFromList(options)
        │
        ├── populateMultiSelectProperty()
        │   └── app.selectFromList(options, multiple)
        │
        └── populateBooleanProperty()
            └── app.selectFromList(["Yes", "No"])
```

### Involved Classes

#### PopulateManager (`src/Config/PopulateManager.ts`)

**Architecture**: Singleton per Vault instance (v2.0+)

Main class managing the populate process. Each Vault has its own PopulateManager instance with a configuration cache to optimize performance.

**Main methods:**
```typescript
async populateProperties(classNameOrConfig: string | ClassConfig): Promise<{ [key: string]: any } | null>
```
- Accepts either a class name (string) or ClassConfig object
- When string: loads config from cache or DynamicClassFactory
- When ClassConfig: uses directly (useful for tests)
- Iterates through all properties to populate
- Returns an object with entered values or `null` if cancelled

```typescript
async mergeWithDefaults(classNameOrConfig: string | ClassConfig, values: { [key: string]: any }): Promise<{ [key: string]: any }>
```
- Merges populated values with default property values
- Ensures all properties have appropriate values

```typescript
private async getClassConfig(className: string): Promise<ClassConfig | null>
```
- Loads configuration from cache or DynamicClassFactory
- Caches result for performance

```typescript
private async populateProperty(classConfig: ClassConfig, populateConfig: PopulateConfig): Promise<any>
```
- Handles popup for a specific property
- Routes to appropriate handler based on type

**Performance optimization**: Configuration caching reduces repeated loads from disk

#### Vault (`src/vault/Vault.ts`)

The `createFile()` method integrates populate using the singleton PopulateManager:

```typescript
async createFile(classeType: typeof Classe, name?: string, args?: any): Promise<Data | undefined> {
    // 1. Get PopulateManager singleton for this Vault
    const populateManager = this.getPopulateManager();
    
    // 2. Try to populate properties (will check if populate is configured)
    const values = await populateManager.populateProperties(classeType.name);
    
    if (values === null) {
        // User cancelled - send notice and abort file creation
        this.app.sendNotice('Création annulée : champ requis non rempli');
        return undefined;
    }
    
    // 3. Merge populated values with default values
    const populatedValues = await populateManager.mergeWithDefaults(classeType.name, values);
    
    // 4. Read template
    let templateContent = await this.app.readFile(templateFile);
    
    // 5. Inject values into frontmatter
    if (Object.keys(populatedValues).length > 0) {
        // Parse frontmatter as YAML
        const frontmatterMatch = templateContent.match(/^---\n([\s\S]*?)\n---/);
        let frontmatterObj = yaml.load(frontmatterMatch[1]) || {};
        
        // Merge populated values
        for (const [propName, value] of Object.entries(populatedValues)) {
            frontmatterObj[propName] = value;
        }
        
        // Serialize back to YAML
        const newFrontmatter = yaml.dump(frontmatterObj, {
            flowLevel: -1,
            lineWidth: -1,
            noRefs: true,
            sortKeys: false,
            forceQuotes: true,
            quotingType: '"'
        });
        
        // Reconstruct template
        templateContent = `---\n${newFrontmatter}---` + templateContent.substring(frontmatterMatch[0].length);
    }
    
    // 6. Create file with modified template
    await this.app.createFile(newFilePath, templateContent);
}
```

**Key improvements in v2.0:**
- ✅ Uses singleton PopulateManager (one per Vault)
- ✅ Configuration caching for better performance
- ✅ Cleaner separation of concerns
- ✅ Notice sent from Vault (not PopulateManager)

### TypeScript Interfaces

```typescript
// Interface for populate configuration
interface PopulateConfig {
    property: string;      // Property name
    title: string;         // Popup title
    required?: boolean;    // If required (default: false)
}

// ClassConfig extension
interface ClassConfig {
    className: string;
    classIcon?: string;
    populate?: PopulateConfig[];  // Populate section
    properties: { [key: string]: PropertyConfig };
    // ... other fields
}
```

## Tests

The feature is covered by unit and integration tests:

### Unit Tests (`__tests__/Config/PopulateManager.test.ts`)

- ✅ 30 unit tests covering all property types
- Required/optional property validation tests
- Value conversion tests
- Error handling tests

### Integration Tests (`__tests__/integration/populate-integration.test.ts`)

- ✅ 5 end-to-end integration tests
- Creation with populated values test
- Cancellation on required field test
- Continuation on optional field test
- Execution order test
- Test without populate configuration

## Usage Examples

### Example 1: Creating a Person

**Configuration** (`config/Person.yaml`):
```yaml
populate:
  - property: institution
    title: "Choose an institution"
    required: true
  - property: status
    title: "Choose a status"
```

**User flow:**
1. User presses `Ctrl+P`
2. Enters name: "John Smith"
3. Clicks "Create"
4. **Popup 1**: "Choose an institution (required)"
   - Selects "TechCorp Solutions"
5. **Popup 2**: "Choose a status"
   - Selects "Active"
6. File created in `Institutions/TechCorp Solutions/People/John Smith.md`

### Example 2: Creating a Project

**Configuration** (`config/Project.yaml`):
```yaml
populate:
  - property: owner
    title: "Choose an owner"
    required: true
  - property: priority
    title: "Set priority"
  - property: tags
    title: "Add tags"
```

**Behavior:**
- Prompts to select an owner (Person file)
- Prompts to choose priority (Low/Medium/High)
- Prompts to select multiple tags

### Example 3: Optional Populate Only

**Configuration**:
```yaml
populate:
  - property: description
    title: "Add a short description"
    # required not specified = optional
```

**Behavior:**
- User can cancel without blocking creation
- File is created with default value

## Best Practices

### ✅ Do

1. **Limit the number of populate properties**
   - Maximum 3-4 properties to avoid overwhelming users
   - Prefer essential properties

2. **Use `required: true` judiciously**
   - Only for truly mandatory properties
   - E.g., institution for a person

3. **Provide clear titles**
   ```yaml
   title: "Choose an institution" # ✅ Clear
   title: "Institution"           # ❌ Too vague
   ```

4. **Logical order**
   - Place properties in a natural entry order
   - E.g., first institution, then status

5. **Default values in template**
   - Always provide a sensible default value
   ```yaml
   status: Active  # ✅ Default value
   status: ""      # ❌ Empty
   ```

### ❌ Don't

1. **Too many populate properties**
   - ❌ More than 5 properties → degraded user experience

2. **Non-essential properties as `required`**
   - ❌ Forcing entry of notes or description

3. **Populate on calculated properties**
   - ❌ Don't use populate on FormulaProperty

4. **Forgetting property configuration**
   ```yaml
   populate:
     - property: institution
       title: "..."
   
   # ❌ ERROR: 'institution' property not defined in properties
   properties: []
   ```

## Troubleshooting

### Populate doesn't trigger

**Possible causes:**
1. The `populate` section is empty or malformed
2. Class name is incorrect (check `Object.defineProperty` in `ClassConfigManager`)
3. Config file not copied to the correct folder

**Solutions:**
```bash
# Rebuild to copy configs
npm run build

# Verify config is present
cat __tests__/integration/visual-interface/js/config/Person.yaml
```

### Error "Property not found in class config"

**Cause:** Property name in `populate` doesn't match a defined property.

**Solution:**
```yaml
populate:
  - property: institution  # Must match exactly
    title: "..."

properties:
  - name: institution      # ✅ Same name
```

### Values are not injected

**Cause:** Template has no frontmatter or incorrect format.

**Solution:**
```markdown
---
Class: Person
institution: ""  # ✅ Property present in frontmatter
---
```

### Cancellation doesn't work correctly

**Cause:** Property is marked `required: true` but mock returns `null`.

**Solution:** Check logic in `PopulateManager.populateProperties()`:
```typescript
if (value === null && populateConfig.required) {
    this.app.sendNotice('Creation cancelled: required field not filled');
    return null; // ✅ Cancels creation
}
```

## Future Enhancements

### Planned Features

1. **Support for additional types**
   - DateProperty with date picker
   - NumberProperty with slider
   - TextProperty with multi-line input

2. **Advanced validation**
   - Regex validation for TextProperty
   - Range validation for NumberProperty
   - Custom validation via functions

3. **Conditional populate**
   ```yaml
   populate:
     - property: institution
       title: "..."
     - property: position
       title: "..."
       condition: "institution != null"  # Only if institution filled
   ```

4. **Dynamic default values**
   ```yaml
   populate:
     - property: creationDate
       title: "..."
       defaultValue: "{{today}}"  # Dynamic value
   ```

5. **Populate templates**
   - Define reusable populate "profiles"
   - E.g., "Internal Person" vs "External Person"

## Resources

- **Source code**: `src/Config/PopulateManager.ts`
- **Unit tests**: `__tests__/Config/PopulateManager.test.ts`
- **Integration tests**: `__tests__/integration/populate-integration.test.ts`
- **Config example**: `__tests__/integration/visual-interface/config/Person.yaml`

## Contributing

To add support for a new property type:

1. Add a handler in `PopulateManager`:
   ```typescript
   private async populateMyCustomProperty(
       propertyConfig: PropertyConfig,
       title: string
   ): Promise<any> {
       // Popup logic
       return await this.app.selectSomething(...);
   }
   ```

2. Route in `populateProperty()`:
   ```typescript
   case 'MyCustomProperty':
       return this.populateMyCustomProperty(propertyConfig, title);
   ```

3. Add unit tests

4. Update this documentation
