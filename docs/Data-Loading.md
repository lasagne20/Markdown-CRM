# Data Loading from JSON

The Markdown CRM system allows you to automatically load data from JSON files to pre-populate class instances.

## Configuration

### 1. Add a Data Source in the YAML File

In your class configuration file (e.g., `Lieu.yaml`), add a `data` section:

```yaml
className: Place
classIcon: map-pin

parent:
  property: parent
  folder: Places

data:
  - file: geo.json
    dynamic: true  # Optional: enables automatic reloading

properties:
  name:
    type: NameProperty
    title: Name
    # ... other property configuration
```

### 2. Create the JSON File

Create a JSON file in the `data/` folder (relative to the configuration folder):

**Example: `data/geo.json`**

```json
[
  {
    "name": "France",
    "type": "National",
    "code_insee": "FR",
    "population": 67500000,
    "area": 551695,
    "website": "https://www.gouvernement.fr",
    "description": "French Republic"
  },
  {
    "name": "Île-de-France",
    "type": "Region",
    "parent": "France",
    "code_insee": "11",
    "population": 12271794,
    "area": 12011,
    "website": "https://www.iledefrance.fr",
    "description": "Most populous region in France"
  }
]
```

## How It Works

### Data Loading Process

1. **Reading the JSON file**: The system reads the file specified in `data[].file`
2. **Property mapping**: JSON fields are automatically mapped to class properties based on names
3. **File creation**: For each JSON object, a Markdown file is created (if it doesn't exist)
4. **Hierarchy management**: If a `parent` field exists, the parent-child relationship is established

### Hierarchy Handling

If your JSON data contains hierarchical relationships:

```json
{
  "name": "Paris",
  "type": "Department",
  "parent": "Île-de-France"
}
```

The system will:
1. Search for or create the parent file (`Île-de-France.md`)
2. Place the child file (`Paris.md`) in the appropriate folder structure
3. Update the frontmatter with the parent relationship

## Dynamic Reloading

When `dynamic: true` is set in the configuration, the system automatically monitors the JSON file and reloads data when it's modified.

```yaml
data:
  - file: geo.json
    dynamic: true
```

This is useful during development or when the data source is regularly updated.

## Practical Use Case: French Territories

### Configuration

```yaml
className: Place
classIcon: 🗺️

data:
  - file: territoires-francais.json
    dynamic: true

properties:
  name:
    type: NameProperty
    title: Territory Name
    
  type:
    type: SelectProperty
    title: Type
    static: true
    options:
      - National
      - Region
      - Department
      - EPCI
      - Commune
      
  parent:
    type: FileProperty
    title: Parent Territory
    static: true
    classes:
      - Place
```

### Updating Existing Files

When reloading data:
- Existing Markdown files are detected and not overwritten
- Only frontmatter (YAML properties) is updated
- File content (outside frontmatter) is not modified
- Missing files are created

## Field Mapping

### Automatic Mapping

Property keys in JSON must match property keys in the class configuration:

**YAML Configuration:**
```yaml
properties:
  name:
    type: NameProperty
    title: Name
  population:
    type: NumberProperty
    title: Population
  code_insee:
    type: TextProperty
    title: INSEE Code
```

**JSON:**
```json
{
  "name": "Paris",
  "population": 2161000,
  "code_insee": "75056"
}
```

### Special Fields

Some fields have special behavior:

| Field | Behavior |
|-------|----------|
| `name` | Used as the filename (slugified) |
| `parent` | Creates parent-child relationship |
| `type` | Can determine subfolder placement |

## Advanced Examples

### Example 1: Complex Hierarchy

```json
[
  {
    "name": "France",
    "type": "National",
    "code": "FR"
  },
  {
    "name": "Île-de-France",
    "type": "Region",
    "parent": "France",
    "code": "11"
  },
  {
    "name": "Paris",
    "type": "Department",
    "parent": "Île-de-France",
    "code": "75"
  },
  {
    "name": "Grand Paris",
    "type": "EPCI",
    "parent": "Paris",
    "code": "200054781"
  }
]
```

This creates the following structure:
```
vault/
└── Places/
    └── France/
        └── Île-de-France/
            └── Paris/
                └── Grand Paris.md
```

### Example 2: Real Dataset - French Territories

The system can handle large datasets. For example, loading **36,360 French territories**:

```typescript
const dataLoader = new DataLoader(vault);
await dataLoader.loadFromConfig('Lieu');

// Result: 
// - 1 National territory (France)
// - 18 Regions
// - 101 Departments
// - 1,258 EPCI (Intercommunal groupings)
// - 34,982 Communes
```

### Example 3: Incremental Updates

```typescript
// Initial load
await dataLoader.loadData('Places', 'initial-data.json');

// Later: load additional data
await dataLoader.loadData('Places', 'new-territories.json');

// Only new territories are created
// Existing ones are preserved
```

## Implementation Details

### DataLoader Class

```typescript
export class DataLoader {
  constructor(private vault: Vault) {}
  
  async loadFromConfig(className: string): Promise<void> {
    const config = this.vault.getClassConfig(className);
    
    for (const dataSource of config.data || []) {
      await this.loadData(className, dataSource.file);
    }
  }
  
  async loadData(className: string, jsonFile: string): Promise<File[]> {
    const data = await this.readJSON(jsonFile);
    const files: File[] = [];
    
    for (const item of data) {
      const file = await this.createOrUpdateFile(className, item);
      files.push(file);
    }
    
    return files;
  }
  
  private async createOrUpdateFile(
    className: string, 
    data: any
  ): Promise<File> {
    const classe = this.vault.getClass(className);
    const fileName = this.sanitizeFileName(data.name);
    
    // Check if file exists
    const existing = await classe.getFile(fileName);
    
    if (existing) {
      // Update only frontmatter
      await existing.updateFrontmatter(data);
      return existing;
    }
    
    // Create new file
    return await classe.createFile(fileName, data);
  }
}
```

## Best Practices

✅ **Unique names**: Ensure each object has a unique `name` field  
✅ **Valid JSON**: Validate your JSON before loading  
✅ **Incremental loading**: Load data in stages for large datasets  
✅ **Dynamic reloading**: Use `dynamic: true` during development  
✅ **Backup first**: Always backup your vault before bulk loading  

⚠️ **Error handling**: The system will skip invalid entries and log errors  
⚠️ **Performance**: Loading thousands of files may take time  
⚠️ **Filename conflicts**: Duplicate names will overwrite (first wins)  

## Troubleshooting

### Data Not Loading

1. Check JSON file path is correct (relative to config folder)
2. Verify JSON syntax is valid
3. Ensure property names match between JSON and YAML
4. Check console for error messages

### Files Not Created

1. Verify vault folder exists and is writable
2. Check class configuration is valid
3. Ensure `name` field exists in JSON objects
4. Review file permissions

### Parent-Child Issues

1. Verify parent names match exactly (case-sensitive)
2. Ensure parents are defined before children in JSON
3. Check parent class matches (if using `classes` filter)
4. Review folder structure configuration

## Performance Considerations

### Large Datasets

For datasets with thousands of entries:

- **Batch processing**: Load data in chunks
- **Async operations**: Files are created asynchronously
- **Progress tracking**: Monitor loading progress
- **Memory usage**: JSON is loaded into memory entirely

**Example timing:**
- 100 files: ~0.5s
- 1,000 files: ~3s
- 10,000 files: ~25s
- 36,360 files: ~90s

### Optimization Tips

```typescript
// Load data with progress tracking
const total = jsonData.length;
let loaded = 0;

for (const item of jsonData) {
  await dataLoader.createFile(item);
  loaded++;
  
  if (loaded % 100 === 0) {
    console.log(`Progress: ${loaded}/${total} (${Math.round(loaded/total*100)}%)`);
  }
}
```

## Testing

The data loading system includes comprehensive tests:

```bash
# Run data loading tests
npm test -- DataLoader

# Run all tests
npm test
```

Key test files:
- `__tests__/Config/DataLoader.test.ts` - Core data loading
- `__tests__/Config/DynamicClassFactory.data-management.test.ts` - File management
- `__tests__/vault/Classe.folder-structure.test.ts` - Folder hierarchy

## See Also

- [Class Configuration](./Display-Configuration.md)
- [Property Types](./Property-Types.md)
- [System Architecture](./Architecture.md)
- [Static Properties](./Static-Properties.md)
