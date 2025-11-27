# YAML Configuration Format

This document explains the YAML configuration format used for defining classes in Markdown CRM.

## Table of Contents

- [Property Naming System](#property-naming-system)
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

# 2. Parent configuration (if applicable)
parent:
  property: parentField
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
