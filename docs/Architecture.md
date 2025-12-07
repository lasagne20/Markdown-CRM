# System Architecture

A deep dive into how Markdown CRM works under the hood.

## 🏗️ High-Level Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Admin Interface                       │
│          (FakeApp.js - Browser-based UI)                │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  Config Layer                            │
│  ┌─────────────────┐  ┌──────────────────────────────┐ │
│  │ ConfigLoader    │  │ ClassConfigManager           │ │
│  │ (YAML → Config) │  │ (Config Registry)            │ │
│  └─────────────────┘  └──────────────────────────────┘ │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │         DynamicClassFactory                       │  │
│  │         (Runtime Class Generation)                │  │
│  └──────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  Property System                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Text     │ │ Number   │ │ Date     │ │ File     │  │
│  │ Property │ │ Property │ │ Property │ │ Property │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                      ... 20+ types ...                   │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                   Vault System                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Vault        │  │ Classe       │  │ Data         │  │
│  │ (Root)       │  │ (Class Type) │  │ (Instance)   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │                File (Markdown + YAML)             │  │
│  │  - parseYamlFrontmatter() - Read metadata        │  │
│  │  - updateMetadata() - Write metadata             │  │
│  │  - getBody() - Get content                       │  │
│  └──────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              File System (Plain Text)                    │
│                                                          │
│  vault/                                                  │
│  ├── Contacts/                                           │
│  │   ├── John Doe.md                                    │
│  │   └── Jane Smith.md                                  │
│  ├── Companies/                                          │
│  │   └── Acme Corp.md                                   │
│  └── Projects/                                           │
│      └── Website Redesign.md                            │
│                                                          │
│  config/                                                 │
│  ├── Contact.yaml                                        │
│  ├── Company.yaml                                        │
│  └── Project.yaml                                        │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Core Components

### 1. Configuration System

#### ConfigLoader
**Purpose:** Loads class definitions from YAML files and instantiates Property objects.

**Key Methods:**
```typescript
loadConfig(configPath: string): ClassConfig
  → Reads YAML file
  → Parses property definitions
  → Instantiates Property classes
  → Returns ClassConfig object
```

**Example:**
```yaml
# config/Contact.yaml
name: Contact
icon: 👤
properties:
  - name: fullName
    type: TextProperty
    required: true
```
↓
```typescript
{
  name: 'Contact',
  icon: '👤',
  properties: [
    new TextProperty('fullName', { required: true })
  ]
}
```

---

#### ClassConfigManager
**Purpose:** Central registry for all class configurations.

**Key Methods:**
```typescript
registerConfig(config: ClassConfig): void
  → Stores config in registry
  → Makes available to DynamicClassFactory

getConfig(className: string): ClassConfig | undefined
  → Retrieves config by name

getAllConfigs(): ClassConfig[]
  → Returns all registered configs
```

**Usage:**
```typescript
const manager = ClassConfigManager.getInstance();
manager.registerConfig(contactConfig);
manager.registerConfig(companyConfig);

const config = manager.getConfig('Contact');
```

---

#### DynamicClassFactory
**Purpose:** Generates class constructors at runtime from ClassConfig definitions.

**How It Works:**
1. Takes ClassConfig with property definitions
2. Creates constructor function dynamically
3. Assigns properties to prototype
4. Returns instantiable class

**Key Code:**
```typescript
export class DynamicClassFactory {
  static createClass(config: ClassConfig): any {
    // Create constructor
    const DynamicClass = function(data: any) {
      config.properties.forEach(prop => {
        this[prop.name] = prop.parseValue(data[prop.name]);
      });
    };

    // Add methods
    DynamicClass.prototype.validate = function() {
      return config.properties.every(prop => 
        prop.validateValue(this[prop.name])
      );
    };

    return DynamicClass;
  }
}
```

**Result:**
```typescript
const ContactClass = DynamicClassFactory.createClass(contactConfig);
const john = new ContactClass({ fullName: 'John Doe' });
```

---

### 2. Property System

#### Property Base Class
**Purpose:** Abstract base for all property types with common interface.

**Key Methods:**
```typescript
abstract validateValue(value: any): boolean
  → Validates data meets property requirements
  
abstract formatValue(value: any): string
  → Formats value for display in UI
  
abstract parseValue(input: any): any
  → Parses input from YAML/user input
  
formatYamlValue(value: any): any
  → Formats value for YAML serialization
```

**Lifecycle:**
```
User Input → parseValue() → Internal Storage
           ↓
    validateValue() → Boolean
           ↓
Internal Storage → formatValue() → UI Display
           ↓
Internal Storage → formatYamlValue() → YAML File
```

---

#### Property Examples

**TextProperty:**
```typescript
export class TextProperty extends Property {
  validateValue(value: any): boolean {
    if (this.required && !value) return false;
    if (this.minLength && value.length < this.minLength) return false;
    return true;
  }

  formatValue(value: string): string {
    return value || '';
  }

  parseValue(input: any): string {
    return String(input || '');
  }
}
```

**NumberProperty:**
```typescript
export class NumberProperty extends Property {
  validateValue(value: any): boolean {
    if (typeof value !== 'number') return false;
    if (this.min !== undefined && value < this.min) return false;
    if (this.max !== undefined && value > this.max) return false;
    return true;
  }

  formatValue(value: number): string {
    const formatted = value.toFixed(this.decimals || 0);
    return this.unit ? `${formatted} ${this.unit}` : formatted;
  }

  parseValue(input: any): number {
    return parseFloat(input) || 0;
  }
}
```

**MultiSelectProperty:**
```typescript
export class MultiSelectProperty extends Property {
  validateValue(value: any[]): boolean {
    if (!Array.isArray(value)) return false;
    return value.every(v => 
      this.options.some(opt => opt.name === v)
    );
  }

  formatValue(value: string[]): string {
    return value.map(v => {
      const opt = this.options.find(o => o.name === v);
      return `<span class="tag" style="color: ${opt?.color}">${v}</span>`;
    }).join(' ');
  }

  parseValue(input: any): string[] {
    return Array.isArray(input) ? input : [input];
  }

  formatYamlValue(value: string[]): string[] {
    return value; // Keep as array in YAML
  }
}
```

---

### 3. Vault System

#### Vault
**Purpose:** Root container managing the entire data vault.

**Key Responsibilities:**
- Load all classes from config/
- Initialize class instances
- Provide query interface
- Manage file operations

**Key Methods:**
```typescript
loadClasses(): void
  → Scans config/ directory
  → Loads all .yaml configs
  → Registers with ClassConfigManager

getClasse(name: string): Classe
  → Returns Classe instance by name

getAllClasses(): Classe[]
  → Returns all available classes

query(className: string, filter: Function): Data[]
  → Queries instances with filter
```

---

#### Classe
**Purpose:** Represents a class type (like "Contact" or "Company").

**Key Responsibilities:**
- Manage all instances of this class
- Create new instances
- Validate instance data
- Handle file I/O for this class
- Manage parent-child relationships and automatic folder organization

**Key Methods:**
```typescript
createInstance(data: any): Data
  → Creates new Data instance
  → Validates against schema
  → Saves to file

getInstances(): Data[]
  → Returns all instances

getInstance(name: string): Data | undefined
  → Gets specific instance

deleteInstance(name: string): void
  → Deletes instance and file

getParentProperty(): Promise<Property | undefined>
  → Returns first parent property with valid value
  → For multi-parent: tries each in priority order
  → Validates parent file exists

updateParentFolder(oldMetadata, oldParentProperty): Promise<void>
  → Determines if file needs to move based on parent changes
  → Creates parent folder structure automatically
  → Moves file to new location if parent changed
```

**Storage:**
```
vault/Contacts/
├── John Doe.md
├── Jane Smith.md
└── Bob Johnson.md

Each file = one Data instance
```

**Parent-Child Organization:**
When a class has parent relationships configured, files are automatically organized in parent-specific folders:

```yaml
# Config with parent relationship
parent:
  property: company  # Files organized by company value
  folder: Employees  # Optional subfolder name
```

File structure with parent organization:
```
vault/Contacts/
├── ACME Corp/
│   └── Employees/
│       ├── John Doe.md
│       └── Jane Smith.md
└── TechCo/
    └── Employees/
        └── Bob Johnson.md
```

**Multi-Parent Fallback:**
For complex hierarchies, multiple parent properties can be configured with fallback priority:

```yaml
parent:
  properties: [position, company]  # Try position first, fall back to company
```

The system tries each parent property in order and uses the first one with a valid value and existing parent file.

---

#### Data
**Purpose:** Represents a single instance (one record).

**Key Responsibilities:**
- Store property values
- Provide getters/setters
- Validate changes
- Sync with file

**Key Methods:**
```typescript
getProperty(name: string): any
  → Gets property value

setProperty(name: string, value: any): void
  → Sets property value
  → Validates value
  → Marks as dirty

save(): void
  → Persists to file
  → Updates YAML frontmatter
  
validate(): boolean
  → Validates all properties
  → Returns success status
```

**Example:**
```typescript
const contact = classe.getInstance('John Doe');
contact.setProperty('email', 'john@example.com');
contact.setProperty('tags', ['Client', 'VIP']);
contact.save();
```

---

#### File
**Purpose:** Low-level file operations for Markdown + YAML files.

**Key Responsibilities:**
- Parse YAML frontmatter
- Update metadata
- Preserve markdown body
- Atomic writes

**Key Methods:**
```typescript
parseYamlFrontmatter(): object
  → Extracts --- ... --- section
  → Parses with js-yaml
  → Returns metadata object

updateMetadata(newData: object): void
  → Merges with existing metadata
  → Serializes to YAML
  → Writes to file atomically

getBody(): string
  → Returns content after frontmatter

setBody(content: string): void
  → Updates markdown content
  → Preserves frontmatter
```

**File Format:**
```markdown
---
fullName: John Doe
email: john@example.com
tags: [Client, VIP]
---

# John Doe

Meeting notes and history...
```

**YAML Parsing:**
```typescript
// Inline arrays
tags: [Client, VIP]
→ ['Client', 'VIP']

// Multi-line arrays
tags:
  - Client
  - VIP
→ ['Client', 'VIP']

// Wikilinks
company: [[Acme Corp]]
→ '[[Acme Corp]]'
```

---

### 4. Parent-Child Hierarchy System

#### Overview
**Purpose:** Automatically organize files in a hierarchical folder structure based on FileProperty relationships.

When a file has a parent relationship (via FileProperty), the system:
1. Creates a dedicated folder for the parent
2. Moves the parent file into its folder
3. Moves child files into the parent's folder
4. Recursively organizes grandchildren into sub-folders

**Key Concept:** Files with children get their own dedicated folder; files without children stay in their parent's folder.

---

#### Folder Structure Rules

```
vault/
├── Institutions/
│   ├── TechCorp Solutions/              ← Parent has children
│   │   ├── TechCorp Solutions.md       ← Parent file
│   │   ├── Thomas Martin/              ← Child with grandchildren
│   │   │   ├── Thomas Martin.md        ← Child file
│   │   │   ├── Site Web Entreprise/    ← Grandchild with great-grandchildren
│   │   │   │   ├── Site Web Entreprise.md
│   │   │   │   ├── Design.md          ← Great-grandchild (no children)
│   │   │   │   └── Dev Backend/        ← Great-grandchild with children
│   │   │   │       ├── Dev Backend.md
│   │   │   │       └── Tests.md        ← Great-great-grandchild
│   │   │   └── Project Alpha.md        ← Grandchild (no children)
│   │   └── Sophie Bernard.md           ← Child (no children)
│   └── Université Paris Tech/
│       └── Université Paris Tech.md    ← Parent (no children)
```

**Rule:** A file gets a dedicated folder **only if** it has at least one child.

---

#### How findChildren() Works

The system detects children using **two complementary methods**:

**Method 1: Folder-Based Detection** (Primary)
- Check if file is located in parent's dedicated folder
- Fast and reliable for organized vaults
- Works even for files without classe definitions

**Method 2: FileProperty Detection** (Fallback)
- Check if file has a FileProperty pointing to parent
- Catches children not yet moved to correct folder
- Ensures only FileProperty relationships count (not TextProperty links)

**Algorithm:**
```typescript
protected async findChildren(): Promise<Classe[]> {
  for (const file of allFiles) {
    const isInDedicatedFolder = fileFolder.startsWith(dedicatedFolderPath);
    
    if (isInDedicatedFolder) {
      // File is in our folder - verify it's a FileProperty relationship
      if (hasFilePropertyPointingToUs || classeCreationFailed) {
        isChild = true; // Trust folder structure
      }
    } else {
      // File is elsewhere - check if it SHOULD be here
      if (hasFilePropertyPointingToUs) {
        isChild = true; // Child needs to be moved
      }
    }
  }
}
```

**Why Two Methods?**
- **Folder detection** handles files without classe definitions (e.g., images, documents)
- **FileProperty detection** finds children before they're moved to correct location
- Combined approach ensures complete hierarchy preservation

---

#### updateParentFolder() Workflow

When a file's parent changes (or is set for the first time):

```
1. Get parent file via getParentFile()
   ↓
2. Check if parent has dedicated folder
   - If NO: Create folder, move parent into it
   - If YES: Use existing folder
   ↓
3. Find this file's children via findChildren()
   ↓
4. Determine target location for this file:
   - Has children? → Create dedicated folder: parent/thisFile/
   - No children? → Put directly in: parent/
   ↓
5. Move this file to target location
   ↓
6. Call moveChildrenToFolder(targetLocation)
   ↓
7. For each child:
   - Find child's children (grandchildren)
   - If has grandchildren: Create child/grandchild/
   - If no grandchildren: Put in child/
   - Recursively call moveChildrenToFolder()
```

**Example:**

```
Initial state:
/vault/Thomas Martin.md (parent: TechCorp)
/vault/Site Web.md (parent: Thomas Martin)
/vault/Design.md (parent: Site Web)

After updateParentFolder() on Thomas Martin:
/vault/TechCorp/TechCorp.md
/vault/TechCorp/Thomas Martin/Thomas Martin.md
/vault/TechCorp/Thomas Martin/Site Web/Site Web.md
/vault/TechCorp/Thomas Martin/Site Web/Design.md
```

---

#### Key Methods

**getParentProperty()**
```typescript
protected getParentProperty(): Property | undefined
```
Returns the FileProperty configured as parent for this class.

**getParentFile()**
```typescript
protected async getParentFile(): Promise<File | undefined>
```
Resolves the parent file from the parent property value.
- Handles FileProperty, MultiFileProperty, and ObjectProperty
- Returns undefined if no parent configured

**findChildren()**
```typescript
protected async findChildren(): Promise<Classe[]>
```
Finds all children of this file using dual detection:
1. Files in dedicated folder (fast)
2. Files with FileProperty pointing here (complete)

Returns array of child Classe instances.

**moveChildrenToFolder()**
```typescript
protected async moveChildrenToFolder(targetFolderPath: string): Promise<void>
```
Recursively moves children to target folder:
- Creates dedicated sub-folders for children with grandchildren
- Moves childless files directly into target
- Handles unlimited nesting depth

**updateParentFolder()**
```typescript
protected async updateParentFolder(): Promise<void>
```
Main orchestrator - called when parent property changes:
- Ensures parent has dedicated folder
- Moves this file to correct location
- Recursively organizes all descendants

---

#### Automatic Triggers

The hierarchy system updates automatically when:

1. **Parent property is set/changed**
   ```typescript
   await classe.updatePropertyValue('parent', '[[New Parent]]');
   // → Triggers updateParentFolder()
   ```

2. **Metadata is updated with new parent**
   ```typescript
   await classe.updateMetadata({ parent: '[[New Parent]]' });
   // → Detects parent change, triggers updateParentFolder()
   ```

3. **Property value changes via setPropertyValue()**
   ```typescript
   await classe.setPropertyValue('parent', '[[New Parent]]');
   // → Triggers updateParentFolder()
   ```

**Note:** `setFile()` does **not** trigger `updateParentFolder()` to avoid recursive issues. Only explicit property changes trigger reorganization.

---

#### Edge Cases Handled

**Circular References**
```typescript
// File A → parent: File B
// File B → parent: File A
// Result: No infinite loop, both files stay in place
```

**Files Without Classe Definitions**
```typescript
// Images, PDFs, etc. in dedicated folders
// Detected via folder location, not FileProperty
// Preserved during hierarchy updates
```

**Multi-Level Moves**
```typescript
// Moving parent automatically moves all descendants
// Grandchildren, great-grandchildren, etc. all follow
// Folder structure maintained recursively
```

**Partial Hierarchies**
```typescript
// Child exists but parent doesn't
// getParentFile() returns undefined
// updateParentFolder() does nothing (graceful)
```

**Mixed Property Types**
```typescript
// Only FileProperty counts as parent
// TextProperty with [[links]] ignored
// Prevents false positives from descriptions/notes
```

---

#### Performance Considerations

**Lazy Child Detection**
- `findChildren()` only called when needed
- Results not cached (files may move)
- O(n) where n = total files in vault

**Batch Moves**
- Multiple children moved in sequence
- Each child triggers own recursive move
- Could optimize with move queue (future)

**File System Calls**
- Each move = fs.rename() operation
- Atomic at OS level
- No risk of partial moves

**Metadata Reads**
- One getMetadata() call per file
- Required to check FileProperty values
- Could cache if performance issue

---

#### Testing

**Test Coverage:**
- 30 dedicated parent-child tests
- All edge cases covered
- Integration tests with real file moves

**Key Test Scenarios:**
```typescript
// Basic parent-child
it('should move child to parent folder', async () => {
  await child.updateParentFolder();
  expect(childFile.path).toBe('/vault/parent/child.md');
});

// Multi-level hierarchy
it('should handle 3+ generations', async () => {
  // parent → child → grandchild → greatgrandchild
  await child.updateParentFolder();
  expect(grandchildFile.path).toBe('/vault/parent/child/grandchild/grandchild.md');
  expect(greatGrandchildFile.path).toBe('/vault/parent/child/grandchild/greatgrandchild.md');
});

// FileProperty-only detection
it('should only consider FileProperty as parent', async () => {
  const children = await parent.findChildren();
  // File with FileProperty → included
  // File with TextProperty link → excluded
  expect(children.length).toBe(1);
});

// Folder-based detection
it('should detect children in dedicated folder', async () => {
  // File without classe definition but in folder
  const children = await parent.findChildren();
  expect(children).toContainFile('image.png');
});
```

---

#### Configuration

**Enable parent-child for a class:**
```typescript
// In Classe subclass
export class Projet extends Classe {
  static parentPropertyName = 'institution'; // Name of parent FileProperty
}
```

**In YAML config:**
```yaml
# config/Projet.yaml
name: Projet
parent_property: institution  # Maps to parentPropertyName
properties:
  - name: institution
    type: FileProperty
    classes: [Institution]
```

---

#### Future Enhancements

**Potential Improvements:**
- Batch move queue for better performance
- Configurable folder naming patterns
- Option to keep flat structure (disable hierarchy)
- Visual folder tree in admin UI
- Drag-and-drop folder reorganization

**API Extensions:**
```typescript
// Get full hierarchy path
getHierarchyPath(): string[]
  → ['Institution', 'Person', 'Project']

// Get all descendants (not just children)
getAllDescendants(): Classe[]
  → [child1, child2, grandchild1, grandchild2, ...]

// Move entire hierarchy
moveHierarchy(newParent: File): void
  → Moves this file and all descendants
```

---

## 🔄 Data Flow Examples

### Creating a New Record

```
1. User Input (Admin UI)
   ↓
2. Data.createInstance({ fullName: 'John Doe', email: 'john@example.com' })
   ↓
3. Property Validation
   - TextProperty validates fullName
   - EmailProperty validates email
   ↓
4. Data Instance Created
   ↓
5. File.create('vault/Contacts/John Doe.md')
   ↓
6. YAML Serialization
   ---
   fullName: John Doe
   email: john@example.com
   ---
   ↓
7. File Written to Disk
   ✅ vault/Contacts/John Doe.md
```

---

### Updating a Property

```
1. User Edits Field (Admin UI)
   ↓
2. data.setProperty('email', 'newemail@example.com')
   ↓
3. EmailProperty.validateValue('newemail@example.com')
   → returns true
   ↓
4. Value Stored in Memory
   ↓
5. data.save()
   ↓
6. File.updateMetadata({ email: 'newemail@example.com' })
   ↓
7. Parse Existing File
   - Extract frontmatter
   - Preserve body
   ↓
8. Merge Metadata
   { ...existingData, email: 'newemail@example.com' }
   ↓
9. Serialize with js-yaml dump()
   ↓
10. Atomic Write
    - Write to temp file
    - Rename to original
    ✅ Changes saved
```

---

### Loading All Records

```
1. Vault Initialization
   ↓
2. Scan config/ directory
   - Find Contact.yaml, Company.yaml, etc.
   ↓
3. ConfigLoader for each file
   - Parse YAML
   - Instantiate Properties
   - Create ClassConfig
   ↓
4. Register with ClassConfigManager
   ↓
5. Scan vault/ directory
   - Find all .md files
   - Group by subfolder (class name)
   ↓
6. For each .md file:
   - File.parseYamlFrontmatter()
   - Extract metadata
   - Match to ClassConfig
   - Create Data instance
   ↓
7. Store in Classe.instances[]
   ↓
8. Return to Admin UI
   ✅ All records loaded
```

---

## 🧪 Testing Architecture

### Test Structure

```
__tests__/
├── Properties/           # Property type tests
│   ├── TextProperty.test.ts
│   ├── NumberProperty.test.ts
│   └── ... (one per type)
│
├── Config/              # Configuration system tests
│   ├── ConfigLoader.test.ts
│   ├── ClassConfigManager.test.ts
│   └── DynamicClassFactory.test.ts
│
├── vault/               # Core vault tests
│   ├── Vault.test.ts
│   ├── Classe.test.ts
│   ├── Data.test.ts
│   └── File.test.ts
│
└── integration/         # End-to-end tests
    └── visual-interface/
```

### Test Coverage

- **942 passing tests** across all modules
- **95%+ code coverage** (lines, branches, functions)
- **Property validation tests** for every field type
- **Integration tests** for complete workflows
- **Edge case handling** (empty values, malformed data, etc.)

### Key Test Patterns

**Property Validation:**
```typescript
describe('EmailProperty', () => {
  it('should validate correct email', () => {
    expect(emailProp.validateValue('test@example.com')).toBe(true);
  });

  it('should reject invalid email', () => {
    expect(emailProp.validateValue('invalid')).toBe(false);
  });
});
```

**File Operations:**
```typescript
describe('File', () => {
  it('should parse YAML frontmatter', () => {
    const file = new File(testPath);
    const metadata = file.parseYamlFrontmatter();
    expect(metadata.fullName).toBe('John Doe');
  });

  it('should update metadata atomically', () => {
    const file = new File(testPath);
    file.updateMetadata({ email: 'new@example.com' });
    
    // Verify file written correctly
    const newFile = new File(testPath);
    expect(newFile.parseYamlFrontmatter().email).toBe('new@example.com');
  });
});
```

**Integration:**
```typescript
describe('End-to-End', () => {
  it('should create, update, and delete record', () => {
    const vault = new Vault();
    const contact = vault.getClasse('Contact').createInstance({
      fullName: 'Test User',
      email: 'test@example.com'
    });
    
    expect(contact.getProperty('fullName')).toBe('Test User');
    
    contact.setProperty('email', 'updated@example.com');
    contact.save();
    
    const reloaded = vault.getClasse('Contact').getInstance('Test User');
    expect(reloaded.getProperty('email')).toBe('updated@example.com');
    
    vault.getClasse('Contact').deleteInstance('Test User');
    expect(vault.getClasse('Contact').getInstance('Test User')).toBeUndefined();
  });
});
```

---

## 🔐 Data Integrity

### Atomic Writes

All file operations use atomic writes to prevent corruption:

```typescript
updateMetadata(newData: object): void {
  const tempPath = `${this.path}.tmp`;
  
  // 1. Write to temp file
  fs.writeFileSync(tempPath, this.serialize(newData));
  
  // 2. Rename (atomic operation)
  fs.renameSync(tempPath, this.path);
  
  // If step 2 fails, original file is untouched
}
```

### Validation Pipeline

Every write goes through validation:

```
User Input
  ↓
Property.parseValue() - Convert to internal format
  ↓
Property.validateValue() - Check constraints
  ↓
[FAIL] → Throw ValidationError
  ↓
[PASS] → Store in memory
  ↓
Data.validate() - Validate all properties
  ↓
[FAIL] → Rollback, return error
  ↓
[PASS] → File.updateMetadata()
  ↓
✅ Data written
```

### Error Handling

```typescript
try {
  data.setProperty('email', userInput);
  data.save();
} catch (error) {
  if (error instanceof ValidationError) {
    // Show user-friendly error
    console.error(`Invalid email: ${error.message}`);
  } else if (error instanceof FileSystemError) {
    // Handle file system issues
    console.error(`Could not save: ${error.message}`);
  } else {
    // Unexpected error
    throw error;
  }
}
```

---

## 🚀 Performance Considerations

### Lazy Loading

Classes and instances loaded on-demand:

```typescript
class Vault {
  private classCache = new Map<string, Classe>();
  
  getClasse(name: string): Classe {
    if (!this.classCache.has(name)) {
      this.classCache.set(name, this.loadClasse(name));
    }
    return this.classCache.get(name);
  }
}
```

### File Caching

File contents cached after first read:

```typescript
class File {
  private contentCache?: string;
  
  getContent(): string {
    if (!this.contentCache) {
      this.contentCache = fs.readFileSync(this.path, 'utf-8');
    }
    return this.contentCache;
  }
  
  invalidateCache(): void {
    this.contentCache = undefined;
  }
}
```

### Batch Operations

Multiple updates batched into single write:

```typescript
data.beginBatch();
data.setProperty('field1', value1);
data.setProperty('field2', value2);
data.setProperty('field3', value3);
data.commitBatch(); // Single file write
```

---

## � Global Settings System

### ISettings Interface

Markdown CRM provides a centralized settings system through the `ISettings` interface. This allows global configuration of formats, locales, and other application-wide preferences.

#### Settings Structure

```typescript
interface ISettings {
    // Phone number formatting
    phoneFormat?: 'FR' | 'US' | 'INTL' | 'UK' | 'DE' | 'ES' | 'IT' | 'custom';
    phoneCustomFormat?: string;
    
    // Date/Time formatting
    dateFormat?: string;
    timeFormat?: '12h' | '24h';
    timezone?: string;
    
    // Number formatting
    numberLocale?: string;
    currencySymbol?: string;
    
    // Extensible for custom settings
    [key: string]: any;
}
```

#### Accessing Settings

Properties and classes can access global settings via the `IApp` interface:

```typescript
class PhoneProperty extends LinkProperty {
    constructor(name: string, vault: Vault, args: any = {}) {
        super(name, vault, args);
        
        // Get global settings
        const settings = this.vault.app.getSettings();
        
        // Use phoneFormat from settings
        const phoneFormat = settings.phoneFormat || 'FR';
        this.useInternationalFormat = phoneFormat === 'INTL';
        this.countryCode = this.getCountryCode(phoneFormat);
    }
    
    private getCountryCode(format: string): string {
        const map = {
            'FR': '+33',
            'US': '+1',
            'UK': '+44',
            'DE': '+49',
            'ES': '+34',
            'IT': '+39'
        };
        return map[format] || '+33';
    }
}
```

#### Configuration in FakeApp

The browser-based admin interface implements settings through `FakeApp`:

```javascript
class FakeApp {
    constructor(vaultPath, vaultName) {
        this.settings = new Map();
    }
    
    getSettings() {
        return {
            phoneFormat: this.settings.get('phoneFormat') || 'FR',
            dateFormat: this.settings.get('dateFormat') || 'DD/MM/YYYY',
            timeFormat: this.settings.get('timeFormat') || '24h',
            timezone: this.settings.get('timezone') || 'Europe/Paris',
            numberLocale: this.settings.get('numberLocale') || 'fr-FR',
            currencySymbol: this.settings.get('currencySymbol') || '€'
        };
    }
}
```

#### Benefits of Centralized Settings

1. **Consistency**: All properties use the same format preferences
2. **User Preferences**: Settings can be stored per-user or per-vault
3. **Extensibility**: Easy to add new settings without modifying individual properties
4. **Testability**: Mock settings easily in unit tests
5. **Type Safety**: TypeScript interface ensures correct usage

#### Testing with Settings

The test utilities provide a convenient `mockApp()` function with settings support:

```typescript
import { mockApp } from '../utils/mocks';

// Default settings (FR format)
const app = mockApp();

// Custom settings for tests
const usApp = mockApp({
    phoneFormat: 'US',
    timezone: 'America/New_York'
});

const phoneProperty = new PhoneProperty('phone', vault);
// Automatically uses settings from app
```

#### Future Enhancements

The `ISettings` system is designed to be extensible:

- **Theme preferences**: Light/dark mode, custom colors
- **Display options**: Compact/expanded views, column widths
- **Localization**: Language preferences, translation keys
- **Validation rules**: Custom regex patterns, business rules
- **Integration settings**: API keys, webhook URLs

---

## �📚 Further Reading

- **[Property Types](Property-Types.md)** - Complete property reference
- **[API Reference](API-Reference.md)** - Full API documentation
- **[Testing Guide](Testing.md)** - How to write tests
- **[Custom Properties](Custom-Properties.md)** - Create your own types

---

**Next:** [API Reference](API-Reference.md) - Complete method documentation
