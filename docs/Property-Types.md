# Property Types Reference

Markdown CRM provides 20+ built-in property types to model any business domain. Each property type handles validation, rendering, and storage automatically.

## Quick Reference

| Category | Property Types |
|----------|---------------|
| 🔑 **Identifiers** | IdProperty |
| 📝 **Text & Strings** | TextProperty, NameProperty, EmailProperty, PhoneProperty, LinkProperty, AdressProperty |
| 🔢 **Numbers** | NumberProperty, RatingProperty, FormulaProperty |
| 📅 **Dates & Times** | DateProperty, TimeProperty, RangeDateProperty |
| ✅ **Selection** | BooleanProperty, SelectProperty, MultiSelectProperty |
| 📁 **Files & Media** | FileProperty, MultiFileProperty, MediaProperty, MultiMediaProperty, 3DModelProperty |
| 🔗 **Relations** | ClasseProperty, ObjectProperty, SubClassProperty |
| 🎨 **Layout** | HeaderProperty |

---

## 📝 Text & String Properties

### TextProperty
Basic single-line text input.

```yaml
company:
  type: TextProperty
  title: Company Name
  required: true
  placeholder: "Company name"
```

**Features:**
- Wikilink support `[[Link to other file]]`
- Optional placeholder text
- Min/max length validation
- Required field validation

**Use Cases:** Names, titles, company names, short descriptions

---

### NameProperty
Special text field for person names with formatting.

```yaml
fullName:
  type: NameProperty
  title: Full Name
  required: true
```

**Features:**
- Auto-capitalization
- Name validation patterns
- Special character handling

**Use Cases:** Person names, author names, contact names

---

### EmailProperty
Email addresses with validation.

```yaml
email:
  type: EmailProperty
  title: Email Address
  required: true
```

**Features:**
- RFC 5322 email validation
- Automatic lowercase conversion
- Clickable mailto links in UI

**Use Cases:** Contact emails, support addresses, account emails

---

### PhoneProperty
Phone numbers with international format support.

```yaml
phone:
  type: PhoneProperty
  title: Phone Number
  format: "international" # or "national", "e164"
```

**Features:**
- International format validation
- Auto-formatting
- Clickable tel links in UI
- Country code support

**Use Cases:** Contact phones, support lines, mobile numbers

---

### LinkProperty
URLs with validation and display.

```yaml
website:
  type: LinkProperty
  title: Website
  placeholder: "https://example.com"
```

**Features:**
- URL validation
- Clickable links
- Protocol enforcement (http/https)
- Preview support

**Use Cases:** Websites, documentation links, resource URLs

---

### AdressProperty
Physical addresses with structured format.

```yaml
address:
  type: AdressProperty
  title: Address
```

**Features:**
- Multi-line address storage
- Structured fields (street, city, state, zip, country)
- Map link generation

**Use Cases:** Office addresses, shipping addresses, locations

---

## 🔑 Identifier Properties

### IdProperty
Unique UUID identifier with automatic generation.

```yaml
id:
  type: IdProperty
  title: Unique ID
  static: true  # Default: true (read-only)
```

**Features:**
- Automatic UUID v4 generation on first access
- RFC 4122 compliant format
- Read-only by default to prevent modification
- Validates existing UUIDs
- Persists to metadata automatically
- Browser and Node.js compatible

**Behavior:**
- Generates UUID only if property value is missing or empty
- Once generated, UUID is saved and never changes
- Format: `550e8400-e29b-41d4-a716-446655440000`

**Use Cases:** Unique record IDs, external API references, tracking codes, immutable identifiers

**Example:**
```yaml
# In your class configuration (e.g., config/Customer.yaml)
properties:
  id:
    type: IdProperty
    title: Customer ID
    icon: 🔑
    static: true  # Prevents accidental modification
```

When a new record is created, the ID is automatically generated and persisted:
```yaml
---
id: 3f8c4a2e-9b1d-4c7e-a5f2-8d6e1b9c4a7f
name: John Doe
---
```

---

## 🔢 Number & Calculation Properties

### NumberProperty
Numeric values with units and validation.

```yaml
price:
  type: NumberProperty
  title: Price
  unit: "$"
  min: 0
  max: 1000000
  decimals: 2
```

**Features:**
- Min/max validation
- Decimal precision control
- Unit display ($, €, %, etc.)
- Thousand separators

**Use Cases:** Prices, quantities, scores, measurements

---

### RatingProperty
Star ratings or numeric ratings.

```yaml
satisfaction:
  type: RatingProperty
  title: Satisfaction
  max: 5
  style: stars # or "numbers"
```

**Features:**
- Visual star display
- Custom max value
- Half-star support
- Color coding

**Use Cases:** Customer satisfaction, priority levels, quality scores

---

### FormulaProperty
Calculated fields based on other properties.

```yaml
total:
  type: FormulaProperty
  title: Total
  formula: "price * quantity * (1 - discount/100)"
  decimals: 2
```

**Features:**
- Mathematical expressions
- Reference other fields
- Auto-recalculation
- Number formatting

**Use Cases:** Totals, percentages, computed metrics

---

## 📅 Date & Time Properties

### DateProperty
Single dates with calendar picker.

```yaml
birthday:
  type: DateProperty
  title: Birthday
  format: "YYYY-MM-DD"
```

**Features:**
- Calendar UI picker
- Multiple format support
- Date validation
- Relative dates (today, yesterday, etc.)

**Use Cases:** Birthdays, deadlines, appointment dates

---

### TimeProperty
Time values (hours and minutes).

```yaml
meetingTime:
  type: TimeProperty
  title: Meeting Time
  format: "24h" # or "12h"
```

**Features:**
- 12/24 hour format
- Time picker UI
- Range validation

**Use Cases:** Meeting times, business hours, schedules

---

### RangeDateProperty
Date ranges (start and end dates).

```yaml
projectTimeline:
  type: RangeDateProperty
  title: Project Timeline
```

**Features:**
- Start and end date validation
- Duration calculation
- Calendar range picker
- Overlap detection

**Use Cases:** Project timelines, vacation periods, campaigns

---

## ☑️ Selection Properties

### BooleanProperty
True/false checkboxes.

```yaml
isActive:
  type: BooleanProperty
  title: Is Active
  default: true
```

**Features:**
- Checkbox UI
- Yes/No toggle
- Default values

**Use Cases:** Active status, flags, feature toggles

---

### SelectProperty
Single selection from predefined options.

```yaml
status:
  type: SelectProperty
  title: Status
  options:
    - name: Active
      color: green
    - name: Inactive
      color: gray
    - name: Pending
      color: yellow
```

**With Aliases (for backward compatibility):**

```yaml
department:
  type: SelectProperty
  title: Department
  options:
    - "Management" : ["management", "mgmt", "manager"]
    - "Technique" : ["technique", "tech"]
    - "Communication"
```

When reading values, aliases are automatically normalized to their canonical name (e.g., `"management"` → `"Management"`).

**Features:**
- Dropdown UI
- Color-coded options
- Custom option objects
- Aliases for backward compatibility with legacy data
- Validation against options
- Automatic normalization of alias values

**Use Cases:** Status fields, categories, priorities, department assignments

---

### MultiSelectProperty
Multiple selections from predefined options (tags).

```yaml
tags:
  type: MultiSelectProperty
  title: Tags
  options: [Client, Partner, Vendor, VIP, Inactive]
```

**With Aliases (for backward compatibility):**

```yaml
competences:
  type: MultiSelectProperty
  title: Competences
  options:
    - "Management" : ["management"]
    - "Technique" : ["tech", "technique"]
    - "Communication" : ["com", "comm"]
    - "Marketing" : ["mkt", "marketing"]
```

When reading values, aliases are automatically normalized to their canonical name and duplicates are removed (e.g., `["management", "Management"]` → `["Management"]`).

**Features:**
- Tag-style UI
- Color-coded tags
- Array storage
- Aliases for backward compatibility with legacy data
- Automatic normalization and deduplication of alias values
- Search/filter support

**Use Cases:** Tags, categories, skills, features, competencies

---

## 🔗 Relationship Properties

### ClasseProperty
Link to another class instance (one-to-one).

```yaml
assignedTo:
  type: ClasseProperty
  title: Assigned To
  classes: [Contact]
```

**Features:**
- Wikilink storage `[[Contact Name]]`
- Autocomplete from class
- Bidirectional linking
- Type validation

**Use Cases:** Assigned user, primary contact, parent record

---

### SubClassProperty
Embed child records inline (one-to-many composition).

```yaml
addresses:
  type: SubClassProperty
  title: Addresses
  classes: [Address]
```

**Features:**
- Embedded records
- Full CRUD operations
- Cascading deletes
- Inline editing

**Use Cases:** Order items, address list, phone numbers

---

### MultiFileProperty
Link to multiple files/records (many-to-many).

```yaml
teamMembers:
  type: MultiFileProperty
  title: Team Members
  classes: [Contact]
```

**Features:**
- Array of wikilinks
- Autocomplete support
- Bidirectional tracking
- Batch operations
- Can be used as parent property for automatic folder organization

**Use Cases:** Team members, related projects, attached documents

**Note:** When used in `parent.property` or `parent.properties` configuration, files are automatically organized into folders based on the linked record's name.

---

## 📦 Complex & Media Properties

### ObjectProperty
Nested object with multiple fields.

```yaml
socialMedia:
  type: ObjectProperty
  title: Social Media
  display: tabs # Simple modes: "object" (default), "table", or "tabs"
  allowMove: true # Enable/disable drag-and-drop reordering (default: true)
  appendFirst: false # Add new items at beginning instead of end (default: false)
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

**For advanced custom layouts, use `displayContainer` instead:**

```yaml
workHistory:
  type: ObjectProperty
  title: Work History
  displayContainer:  # Advanced custom layout
    items:
      - type: line
        items:
          - type: property
            name: company
          - type: property
            name: position
      - type: property
        name: description
  properties:
    company:
      type: TextProperty
    position:
      type: TextProperty
    description:
      type: TextProperty
```

**Display Modes (`display` property):**
- `"object"` (default): Displays each item as a row with all properties in a grid
- `"table"`: Displays items in a table format with columns
- `"tabs"`: Displays each item in a separate tab with properties in a grid
  - Tab labels show the first property value
  - Delete button in top-left of each tab
  - "+" button in a dedicated tab to add new items
  - Click tabs to navigate between items

**Custom Layout (`displayContainer` property):**
- Full control over layout with DisplayContainer configuration
- See [Display Configuration](Display-Configuration.md) for details
- **Note:** When `displayContainer` is specified, it overrides the `display` setting

**Options:**
- `display`: Simple display mode - `"object"` (default), `"table"`, or `"tabs"`
- `displayContainer`: Advanced custom layout configuration (DisplayContainer object)
- `allowMove`: Enable drag-and-drop reordering of items (default: `true`) - works in object mode
- `appendFirst`: Add new items at the beginning of the list (default: `false`)
- `tooltip`: Help text shown on hover

**Features:**
- Nested structure
- Multiple display modes (object, table, tabs, or custom)
- Drag-and-drop reordering (when `allowMove: true` in object mode)
- Tab navigation (in tabs mode)
- Custom layouts (with displayContainer)
- Reusable property definitions
- Validation of nested fields
- Can be used as parent property for automatic folder organization

**Use Cases:** Addresses, social profiles, structured metadata, work history

**Note:** When used in `parent.property` or `parent.properties` configuration, files are automatically organized into folders based on the nested property value.

---

### FileProperty
Single file attachment.

```yaml
resume:
  type: FileProperty
  title: Resume
  accept: ".pdf,.doc,.docx"
```

**Features:**
- File upload
- Type validation
- Size limits
- Path storage

**Use Cases:** Documents, contracts, attachments

---

### MultiFileProperty
Multiple file attachments.

```yaml
documents:
  type: MultiFileProperty
  title: Documents
  accept: ".pdf,.doc,.docx"
  maxFiles: 10
```

**Features:**
- Multiple uploads
- File list display
- Individual delete
- Total size limits

**Use Cases:** Project documents, image galleries, attachments

---

### MediaProperty
Single image/video with preview.

```yaml
profilePhoto:
  type: MediaProperty
  title: Profile Photo
  accept: "image/*"
```

**Features:**
- Image preview
- Video playback
- Thumbnail generation
- Responsive display

**Use Cases:** Profile photos, product images, video content

---

### MultiMediaProperty
Multiple images/videos with gallery.

```yaml
productPhotos:
  type: MultiMediaProperty
  title: Product Photos
  accept: "image/*"
  maxFiles: 20
```

**Features:**
- Gallery UI
- Drag-drop upload
- Preview grid
- Lightbox display

**Use Cases:** Product galleries, event photos, project media

---

### 3DModelProperty
3D models with viewer.

```yaml
productModel:
  type: 3DModelProperty
  title: Product Model
  accept: ".obj,.fbx,.gltf"
```

**Features:**
- 3D model viewer
- Rotation controls
- Zoom support
- Format validation

**Use Cases:** Product visualization, architectural models, CAD files

---

### HeaderProperty
Visual section headers (non-data).

```yaml
personalInfo:
  type: HeaderProperty
  title: Personal Information
  level: 2 # h1, h2, h3, etc.
```

**Features:**
- Visual grouping
- No data storage
- Hierarchical levels
- Collapsible sections

**Use Cases:** Form organization, visual separation, grouping

---

## 🔑 Property Naming System

**Important:** Properties use a two-part naming system:

1. **Property Key** (YAML object key): The internal name used in metadata
   - Written as the YAML object key (e.g., `nom:`, `email:`, `prenom:`)
   - Used for storing/reading values in file frontmatter
   - Should be concise and technical (camelCase recommended)

2. **Display Title** (`title` field): The label shown in the user interface
   - Defined with the `title:` field in the property config
   - Can be localized and user-friendly
   - Can contain spaces and special characters

**Example:**
```yaml
properties:
  nom:                    # ← Property key (used in metadata)
    type: Property
    title: Nom complet    # ← Display title (shown in UI)
    icon: 📝
  
  prenom:
    type: TextProperty
    title: Prénom
    icon: 👤
```

In the file's frontmatter:
```yaml
---
nom: Dupont             # ← Uses property key
prenom: Marie
---
```

In the UI, users see "Nom complet" and "Prénom" (the display titles).

## 🛠️ Property Configuration Options

All properties support these common options:

```yaml
fieldName:
  type: PropertyType
  title: Display Name      # Display name shown in UI
  required: true           # Field must have a value
  default: "value"         # Default value when creating
  placeholder: "hint"      # UI placeholder text
  help: "Description"      # Help text displayed in UI
  readonly: false          # Prevent editing
  hidden: false            # Hide from UI
  validation:              # Custom validation rules
    pattern: "regex"
    message: "Error text"
```

---

## 📊 Property Comparison Table

| Property | Best For | Storage Format | Validation |
|----------|----------|----------------|------------|
| TextProperty | Short text | String | Length, pattern |
| NameProperty | Person names | String | Name format |
| EmailProperty | Emails | String | Email format |
| PhoneProperty | Phone numbers | String | Phone format |
| LinkProperty | URLs | String | URL format |
| NumberProperty | Numeric values | Number | Min/max, decimals |
| DateProperty | Single dates | YYYY-MM-DD | Date format |
| RangeDateProperty | Date ranges | Array [start, end] | Start < end |
| BooleanProperty | Yes/No | Boolean | None |
| SelectProperty | Single choice | String | In options |
| MultiSelectProperty | Multiple choices | Array | All in options |
| ClasseProperty | One relation | String (wikilink) | Class exists |
| MultiFileProperty | Many relations | Array (wikilinks) | Class exists |
| ObjectProperty | Nested data | Object | Nested validation |
| FileProperty | Single file | String (path) | File type |
| MultiFileProperty | Multiple files | Array (paths) | File types |
| MediaProperty | Single image/video | String (path) | Media type |
| MultiMediaProperty | Multiple media | Array (paths) | Media types |
| 3DModelProperty | 3D models | String (path) | Model format |
| FormulaProperty | Calculated | Number | Formula valid |
| RatingProperty | Ratings | Number | Min/max |

---

## 🎯 Choosing the Right Property

### Text Data
- **Short text (< 100 chars)** → TextProperty
- **Person name** → NameProperty
- **Email address** → EmailProperty
- **Phone number** → PhoneProperty
- **URL** → LinkProperty
- **Multi-line text** → Use Markdown body

### Numbers
- **Currency/money** → NumberProperty with unit: "$"
- **Percentage** → NumberProperty with unit: "%"
- **Quantity** → NumberProperty
- **Rating/score** → RatingProperty
- **Calculated** → FormulaProperty

### Dates
- **Single date** → DateProperty
- **Time only** → TimeProperty
- **Date range** → RangeDateProperty
- **Duration** → Use RangeDateProperty with formula

### Choices
- **Yes/No** → BooleanProperty
- **One option** → SelectProperty
- **Multiple options** → MultiSelectProperty
- **Dynamic options** → Use ClasseProperty

### Relationships
- **One record** → ClasseProperty
- **Multiple records** → MultiFileProperty
- **Nested data** → SubClassProperty
- **Structured data** → ObjectProperty

### Files & Media
- **One document** → FileProperty
- **Multiple documents** → MultiFileProperty
- **One image** → MediaProperty
- **Image gallery** → MultiMediaProperty
- **3D model** → 3DModelProperty

---

## 💡 Best Practices

### Property Naming
✅ **Good:** `email`, `fullName`, `companyWebsite`, `assignedTo`  
❌ **Bad:** `e`, `name1`, `data`, `field`

Use camelCase, be descriptive, avoid abbreviations.

### Required vs Optional
- Mark essential fields as `required: true`
- Keep optional fields for non-critical data
- Use `default` values when sensible

### Validation
- Add `min`/`max` to prevent invalid data
- Use `pattern` for custom validation
- Provide clear error messages

### Performance
- Avoid too many FormulaProperty fields
- Use SelectProperty instead of TextProperty for limited options
- Limit MultiFileProperty to reasonable counts

### User Experience
- Add `placeholder` text for guidance
- Use `help` text for complex fields
- Group related fields with HeaderProperty
- Use ObjectProperty for logical grouping

---

## 🔧 Custom Properties

Need a property type we don't provide? Create your own!

```typescript
import { Property } from '../properties/Property';

export class CustomProperty extends Property {
    validateValue(value: any): boolean {
        // Your validation logic
        return true;
    }

    formatValue(value: any): string {
        // How to display in UI
        return String(value);
    }

    parseValue(input: string): any {
        // How to parse from YAML
        return input;
    }
}
```

See [Custom Properties Guide](Custom-Properties.md) for full tutorial.

---

**Next Steps:**
- [Understanding Classes](Understanding-Classes.md) - How to define data models
- [Creating Records](Creating-Records.md) - Add data to your CRM
- [Validation Rules](Validation.md) - Ensure data quality
