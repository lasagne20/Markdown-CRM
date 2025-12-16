# YAML Configuration Format

This document explains the YAML configuration format used for defining classes in Markdown CRM.

## Table of Contents

- [Property Naming System](#property-naming-system)
- [Class Inheritance](#class-inheritance)
- [Object-Based Format](#object-based-format)
- [Migration from Array Format](#migration-from-array-format)
- [Complete Examples](#complete-examples)

---

## Property Naming System

**Important:** Markdown CRM uses a two-part naming system for properties:

### 1. Property Key (Metadata Name)

The YAML object key is used as the **internal property name** for storing data in file frontmatter.

```yaml
properties:
  nom:        # ← This is the property key (used in metadata)
    type: Property
```

In the file's frontmatter:
```yaml
---
nom: Dupont  # ← Property key is used here
---
```

**Characteristics:**
- Used for reading/writing metadata
- Should be concise and technical
- Recommended: camelCase (e.g., `firstName`, `emailAddress`)
- Must be unique within a class
- Cannot contain spaces

### 2. Display Title (UI Label)

The `title` field defines the **display name** shown in the user interface.

```yaml
properties:
  nom:
    type: Property
    title: Nom complet  # ← This is the display title (shown in UI)
```

**Characteristics:**
- Used only for UI display
- Can be localized
- Can contain spaces and special characters
- Optional (defaults to property key if not provided)

### Why This Separation?

This design allows:
- **Stable metadata keys**: Properties can be renamed in UI without breaking existing files
- **Localization**: Different display names for different languages while keeping the same metadata keys
- **Clean metadata**: Short, technical keys in YAML frontmatter
- **User-friendly UI**: Long, descriptive labels in the interface

---

## Class Inheritance

**Since December 2025**: Classes can inherit properties and configuration from a parent class using the `extend` keyword.

### Basic Syntax

```yaml
className: ChildClass
classIcon: 👤
extend: ParentClass  # ← Inherits all properties from ParentClass

properties:
  # Child-specific properties
  additionalProperty:
    type: TextProperty
    title: Additional Property
```

### How Inheritance Works

When a class extends another:

1. **Properties are merged**: Child class receives all parent properties
2. **Child properties take precedence**: If a child defines a property with the same key as the parent, the child's definition is used
3. **Configuration inheritance**: If not specified in child, inherits:
   - `autoRename` template
   - `parent` / `parents` configuration
   - `populate` settings
   - `display` configuration

### Example: Employee Extending Person

**Person.yaml** (Parent class):
```yaml
className: Person
classIcon: 👤

properties:
  firstName:
    type: TextProperty
    title: First Name
    required: true
    
  lastName:
    type: TextProperty
    title: Last Name
    required: true
    
  email:
    type: EmailProperty
    title: Email Address
    icon: ✉️
```

**Employee.yaml** (Child class):
```yaml
className: Employee
classIcon: 💼
extend: Person  # ← Inherits firstName, lastName, email

properties:
  employeeId:
    type: IdProperty
    title: Employee ID
    
  department:
    type: TextProperty
    title: Department
    
  salary:
    type: NumberProperty
    title: Salary
    format: currency
```

**Result**: Employee class has 6 properties:
- `firstName`, `lastName`, `email` (inherited from Person)
- `employeeId`, `department`, `salary` (defined in Employee)

### Property Override

A child class can override a parent property to customize it:

```yaml
className: Manager
classIcon: 👔
extend: Employee

properties:
  # Override the department property from Employee
  department:
    type: SelectProperty
    title: Department
    options:
      - Sales
      - Engineering
      - Marketing
      - HR
    required: true
    
  # Add manager-specific properties
  teamSize:
    type: NumberProperty
    title: Team Size
```

### Multi-Level Inheritance

Classes can form inheritance chains:

```yaml
# Base class
className: Entity
properties:
  id:
    type: IdProperty
    title: ID

---

# Middle class
className: Person
extend: Entity  # ← Inherits id
properties:
  name:
    type: TextProperty
    title: Name

---

# Child class
className: Employee
extend: Person  # ← Inherits id from Entity and name from Person
properties:
  salary:
    type: NumberProperty
    title: Salary
```

**Result**: Employee has `id` (from Entity), `name` (from Person), and `salary` (own property)

### Configuration Inheritance Example

Parent class with auto-rename and parent folder:

```yaml
className: Contact
classIcon: 👤
parent:
  property: company
  folder: Contacts

# Auto-rename configuration (implemented via Process System)
process:
  - name: AutoRenameProcess
    triggers: [onCreate, onPropertyChange]
    actions:
      - type: RenameFileAction
        template: "{lastName}, {firstName}"

# Legacy shorthand (still supported, converted to process automatically)
# autoRename: "{lastName}, {firstName}"

properties:
  firstName:
    type: TextProperty
    title: First Name
  lastName:
    type: TextProperty
    title: Last Name
```

Child class inherits configuration:

```yaml
className: VIPContact
classIcon: ⭐
extend: Contact
# ← Automatically inherits parent configuration and processes

properties:
  vipLevel:
    type: SelectProperty
    title: VIP Level
    options:
      - Gold
      - Platinum
      - Diamond
```

To override inherited configuration:

```yaml
className: Freelancer
classIcon: 💻
extend: Contact
autoRename: "{firstName} {lastName} - Freelance"  # ← Overrides parent's autoRename

properties:
  hourlyRate:
    type: NumberProperty
    title: Hourly Rate
```

### Benefits of Inheritance

✅ **Code reuse**: Define common properties once in a base class  
✅ **Consistency**: Ensure related classes share the same base structure  
✅ **Maintainability**: Update properties in parent class, changes apply to all children  
✅ **Flexibility**: Override properties or configuration when needed  
✅ **Organization**: Create class hierarchies that reflect your domain model

### Best Practices

1. **Create base classes** for common entity types (Person, Document, Event, etc.)
2. **Use meaningful names** that clearly show the relationship
3. **Keep inheritance chains shallow** (2-3 levels maximum)
4. **Document your class hierarchy** in your project documentation
5. **Override sparingly** - only when truly needed

---

## Object-Based Format

**Current format** (since November 2025): Properties are defined as YAML objects where the key is the property name.

```yaml
properties:
  propertyKey:
    type: PropertyType
    title: Display Name
    # ... other options
```

### Example: Person Class

```yaml
className: Person
classIcon: 👤

properties:
  nom:
    type: Property
    title: Nom complet
    icon: 📝
    required: true
    
  prenom:
    type: TextProperty
    title: Prénom
    icon: 👤
    
  email:
    type: EmailProperty
    title: Adresse email
    icon: ✉️
    
  telephone:
    type: PhoneProperty
    title: Téléphone
    icon: 📞
    
  dateNaissance:
    type: DateProperty
    title: Date de naissance
    icon: 🎂
    
  institution:
    type: ClasseProperty
    title: Institution
    icon: 🏢
    classes:
      - Institution
```

### Benefits

✅ **Clearer structure**: Property key and configuration are visually separated  
✅ **Easier to read**: YAML objects are more intuitive than arrays  
✅ **Better tooling**: Easier to parse and validate  
✅ **Explicit naming**: Property key is clearly the object key  
✅ **No redundancy**: No need to repeat the name in two places

---

## Migration from Array Format

### Old Format (Deprecated)

```yaml
properties:
  - name: nom
    type: Property
    title: Nom complet
    
  - name: email
    type: EmailProperty
    title: Email
```

### New Format (Current)

```yaml
properties:
  nom:
    type: Property
    title: Nom complet
    
  email:
    type: EmailProperty
    title: Email
```

### Migration Steps

1. **Identify property names**: Look at each `name:` field in the old format
2. **Convert to object key**: Move the name to be the YAML object key
3. **Remove name field**: The `name:` field is no longer needed
4. **Keep title field**: The `title:` field remains for display names

**Before:**
```yaml
properties:
  - name: firstName
    type: TextProperty
    title: First Name
    icon: 👤
    required: true
```

**After:**
```yaml
properties:
  firstName:
    type: TextProperty
    title: First Name
    icon: 👤
    required: true
```

### Automated Migration

If you have many configuration files to migrate, you can use this pattern:

```typescript
// Read old format
const oldConfig = yaml.load(fs.readFileSync('old-config.yaml'));

// Convert properties array to object
const newProperties: { [key: string]: any } = {};
for (const prop of oldConfig.properties) {
  const { name, ...rest } = prop;
  newProperties[name] = rest;
}

// Write new format
const newConfig = {
  ...oldConfig,
  properties: newProperties
};
fs.writeFileSync('new-config.yaml', yaml.dump(newConfig));
```

---

## Complete Examples

### Example 1: Simple Contact Class

```yaml
className: Contact
classIcon: 📇
classDescription: Customer and partner contacts

parent:
  property: company
  folder: Contacts

display:
  containers:
    - type: line
      title: Basic Information
      properties:
        - fullName
        - email
        - phone
    
    - type: column
      title: Details
      properties:
        - company
        - position
        - address

properties:
  fullName:
    type: NameProperty
    title: Full Name
    icon: 👤
    required: true
    
  email:
    type: EmailProperty
    title: Email Address
    icon: ✉️
    required: true
    
  phone:
    type: PhoneProperty
    title: Phone Number
    icon: 📞
    
  company:
    type: ClasseProperty
    title: Company
    icon: 🏢
    classes:
      - Company
    
  position:
    type: TextProperty
    title: Job Title
    icon: 💼
    
  address:
    type: AdressProperty
    title: Address
    icon: 📍
```

### Example 2: Project Management

```yaml
className: Project
classIcon: 📊
classDescription: Project tracking and management

display:
  containers:
    - type: line
      title: Status
      properties:
        - status
        - priority
        - progress
    
    - type: tabs
      title: Details
      tabs:
        - title: Information
          properties:
            - name
            - description
            - client
            - budget
        
        - title: Team
          properties:
            - projectManager
            - teamMembers
            - stakeholders
        
        - title: Schedule
          properties:
            - startDate
            - endDate
            - milestones

properties:
  name:
    type: Property
    title: Project Name
    icon: 📝
    required: true
    
  description:
    type: TextProperty
    title: Description
    icon: 📄
    
  status:
    type: SelectProperty
    title: Status
    icon: 🚦
    options:
      - name: Planning
        color: blue
      - name: In Progress
        color: orange
      - name: On Hold
        color: yellow
      - name: Completed
        color: green
      - name: Cancelled
        color: red
    
  priority:
    type: SelectProperty
    title: Priority
    icon: ⚡
    options: [Low, Medium, High, Critical]
    
  progress:
    type: NumberProperty
    title: Progress
    icon: 📈
    unit: "%"
    min: 0
    max: 100
    
  client:
    type: ClasseProperty
    title: Client
    icon: 🏢
    classes:
      - Company
      - Contact
    
  budget:
    type: NumberProperty
    title: Budget
    icon: 💰
    unit: "€"
    decimals: 2
    
  projectManager:
    type: ClasseProperty
    title: Project Manager
    icon: 👔
    classes:
      - Person
    
  teamMembers:
    type: MultiFileProperty
    title: Team Members
    icon: 👥
    classes:
      - Person
    
  stakeholders:
    type: MultiFileProperty
    title: Stakeholders
    icon: 🤝
    classes:
      - Person
      - Company
    
  startDate:
    type: DateProperty
    title: Start Date
    icon: 📅
    
  endDate:
    type: DateProperty
    title: End Date
    icon: 📅
    
  milestones:
    type: ObjectProperty
    title: Milestones
    icon: 🎯
    display: table
    properties:
      name:
        type: TextProperty
        title: Milestone
      date:
        type: DateProperty
        title: Date
      status:
        type: SelectProperty
        title: Status
        options: [Pending, Completed]
```

### Example 3: Nested Properties with ObjectProperty

```yaml
className: Company
classIcon: 🏢

properties:
  name:
    type: NameProperty
    title: Company Name
    icon: 🏢
    required: true
    
  contact:
    type: ObjectProperty
    title: Contact Information
    icon: 📞
    display: block
    properties:
      email:
        type: EmailProperty
        title: Email
        icon: ✉️
      phone:
        type: PhoneProperty
        title: Phone
        icon: 📞
      website:
        type: LinkProperty
        title: Website
        icon: 🌐
      address:
        type: AdressProperty
        title: Address
        icon: 📍
  
  social:
    type: ObjectProperty
    title: Social Media
    icon: 📱
    display: inline
    properties:
      linkedin:
        type: LinkProperty
        title: LinkedIn
      twitter:
        type: TextProperty
        title: Twitter
      github:
        type: LinkProperty
        title: GitHub
```

---

## Best Practices

### Property Key Naming

✅ **Good property keys:**
- `firstName`, `lastName` (camelCase)
- `email`, `phone` (simple, clear)
- `dateOfBirth`, `startDate` (descriptive)
- `projectManager`, `teamMembers` (meaningful)

❌ **Bad property keys:**
- `first name` (contains space)
- `e`, `p`, `x` (too short, unclear)
- `field1`, `data` (not descriptive)
- `FirstName`, `Last_Name` (inconsistent casing)

### Display Title Guidelines

✅ **Good display titles:**
- "Nom complet" (localized, user-friendly)
- "Date de naissance" (natural language)
- "Adresse email professionnelle" (descriptive)

❌ **Bad display titles:**
- "fld_nm" (technical abbreviation)
- "Data" (too generic)

### Configuration Organization

```yaml
# 1. Class metadata first
className: MyClass
classIcon: 📝
classDescription: Description of the class

# 2. Parent-child relationships (if applicable)
parent:
  # Single parent property
  property: parentField
  
  # OR multiple parent properties with fallback
  properties: [primaryParent, secondaryParent]
  
  # Optional: subfolder within parent
  folder: MyFolder

# 3. Data sources (if applicable)
data:
  - file: data.json
    dynamic: true

# 4. Display configuration
display:
  containers:
    - type: line
      properties: [...]

# 5. Properties last (usually the longest section)
properties:
  field1:
    type: PropertyType
    # ...
```

---

## Parent-Child Relationships

Markdown CRM supports automatic folder organization based on parent-child relationships between files.

### Single Parent Property

Use `parent.property` to specify which property determines the parent file:

```yaml
className: Task
classIcon: ✅

parent:
  property: project  # Tasks are organized under their project

properties:
  name:
    type: Property
    title: Task Name
  
  project:
    type: FileProperty
    title: Project
    classes: [Project]
```

**Result:** When you set a task's project to "Website Redesign", the task file automatically moves to:
```
vault/Projects/Website Redesign/Task Name.md
```

### Multiple Parent Properties with Fallback

Use `parent.properties` (array) to define multiple parent properties with fallback logic:

```yaml
className: Person
classIcon: 👤

parent:
  properties: [postes, institution]  # Try postes first, fallback to institution
  folder: Personnes  # Optional: put persons in a subfolder

properties:
  name:
    type: Property
    title: Full Name
  
  postes:
    type: ObjectProperty
    title: Positions
    properties:
      institution:
        type: FileProperty
        title: Institution
        classes: [Institution]
      role:
        type: Property
        title: Role
  
  institution:
    type: FileProperty
    title: Current Institution
    classes: [Institution]
```

**Fallback Logic:**
1. **First tries `postes`**: If the person has a position with an institution, organizes under that institution
2. **Falls back to `institution`**: If postes is empty, uses the direct institution property
3. **Returns undefined**: If both are empty, file stays in root

**Result:**
- If `postes.institution = "MIT"`: File moves to `vault/Institutions/MIT/Personnes/John Doe.md`
- If `postes` is empty but `institution = "Harvard"`: File moves to `vault/Institutions/Harvard/Personnes/John Doe.md`
- If both empty: File stays in `vault/Personnes/John Doe.md`

### Parent Folder Configuration

Use `parent.folder` to organize children in a subfolder:

```yaml
parent:
  property: company
  folder: Employees  # All employees go in an "Employees" subfolder
```

**Result:**
```
vault/
├── Companies/
│   └── Acme Corp/
│       ├── Acme Corp.md
│       └── Employees/
│           ├── John Doe.md
│           └── Jane Smith.md
```

### How It Works

1. **Automatic Organization**: When you change a parent property, the file automatically moves to the correct folder
2. **Parent Folder Creation**: If the parent doesn't have its own folder yet, one is created automatically
3. **Nested Hierarchy**: Children with their own children get dedicated folders
4. **Clean Structure**: Empty parent properties don't trigger moves

### Best Practices

✅ **Do:**
- Use `parent.properties` for complex hierarchies (e.g., person → position → institution)
- Order fallback properties from most specific to most general
- Use `parent.folder` to group similar children together
- Test parent changes to verify folder structure

❌ **Don't:**
- Create circular parent relationships (A → B → A)
- Use non-File/Object properties as parents
- Mix `property` and `properties` (use one or the other)

---

## Common Patterns

### Required Fields Pattern

```yaml
properties:
  name:
    type: Property
    title: Name
    required: true  # ← Mark essential fields as required
    
  email:
    type: EmailProperty
    title: Email
    required: true
```

### Default Values Pattern

```yaml
properties:
  status:
    type: SelectProperty
    title: Status
    default: Active  # ← Provide sensible defaults
    options: [Active, Inactive, Pending]
    
  priority:
    type: SelectProperty
    title: Priority
    default: Medium
    options: [Low, Medium, High]
```

### Static Properties Pattern

```yaml
properties:
  createdDate:
    type: DateProperty
    title: Created Date
    static: true  # ← Prevent editing after creation
    default: today
    
  id:
    type: TextProperty
    title: ID
    static: true
```

### Validation Pattern

```yaml
properties:
  zipCode:
    type: TextProperty
    title: ZIP Code
    validation:
      pattern: "^\\d{5}$"
      message: "ZIP code must be 5 digits"
    
  age:
    type: NumberProperty
    title: Age
    min: 0
    max: 150
```

---

## Troubleshooting

### Property Not Saving

**Problem:** Property value doesn't persist in frontmatter

**Check:**
1. Ensure property key doesn't contain spaces or special characters
2. Verify property type supports the value you're trying to save
3. Check that property is not marked as `static: true`

### Property Not Displaying

**Problem:** Property doesn't show in UI

**Check:**
1. Verify property is listed in a `display` container
2. Ensure property key matches exactly (case-sensitive)
3. Check that property is not marked as `hidden: true`

### Type Mismatch Errors

**Problem:** "Invalid value for property X"

**Check:**
1. Verify property type matches the data (e.g., DateProperty expects YYYY-MM-DD)
2. Check validation rules (min/max, pattern, options)
3. Ensure referenced classes exist (for ClasseProperty)

---

## See Also

- [Property Types](./Property-Types.md) - All available property types
- [Display Configuration](./Display-Configuration.md) - UI layout options
- [Data Loading](./Data-Loading.md) - Loading data from JSON
- [Static Properties](./Static-Properties.md) - Read-only fields
