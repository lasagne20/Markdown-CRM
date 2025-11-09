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
```

**Storage:**
```
vault/Contacts/
├── John Doe.md
├── Jane Smith.md
└── Bob Johnson.md

Each file = one Data instance
```

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

## 📚 Further Reading

- **[Property Types](Property-Types.md)** - Complete property reference
- **[API Reference](API-Reference.md)** - Full API documentation
- **[Testing Guide](Testing.md)** - How to write tests
- **[Custom Properties](Custom-Properties.md)** - Create your own types

---

**Next:** [API Reference](API-Reference.md) - Complete method documentation
