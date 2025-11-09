# Property Types Reference

Markdown CRM provides 20+ built-in property types to model any business domain. Each property type handles validation, rendering, and storage automatically.

## 📝 Text & String Properties

### TextProperty
Basic single-line text input.

```yaml
- name: company
  type: TextProperty
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
- name: fullName
  type: NameProperty
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
- name: email
  type: EmailProperty
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
- name: phone
  type: PhoneProperty
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
- name: website
  type: LinkProperty
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
- name: address
  type: AdressProperty
```

**Features:**
- Multi-line address storage
- Structured fields (street, city, state, zip, country)
- Map link generation

**Use Cases:** Office addresses, shipping addresses, locations

---

## 🔢 Number & Calculation Properties

### NumberProperty
Numeric values with units and validation.

```yaml
- name: price
  type: NumberProperty
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
- name: satisfaction
  type: RatingProperty
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
- name: total
  type: FormulaProperty
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
- name: birthday
  type: DateProperty
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
- name: meetingTime
  type: TimeProperty
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
- name: projectTimeline
  type: RangeDateProperty
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
- name: isActive
  type: BooleanProperty
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
- name: status
  type: SelectProperty
  options:
    - name: Active
      color: green
    - name: Inactive
      color: gray
    - name: Pending
      color: yellow
```

**Features:**
- Dropdown UI
- Color-coded options
- Custom option objects
- Validation against options

**Use Cases:** Status fields, categories, priorities

---

### MultiSelectProperty
Multiple selections from predefined options (tags).

```yaml
- name: tags
  type: MultiSelectProperty
  options: [Client, Partner, Vendor, VIP, Inactive]
```

**Features:**
- Tag-style UI
- Color-coded tags
- Array storage
- Search/filter support

**Use Cases:** Tags, categories, skills, features

---

## 🔗 Relationship Properties

### ClasseProperty
Link to another class instance (one-to-one).

```yaml
- name: assignedTo
  type: ClasseProperty
  linkClass: Contact
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
- name: addresses
  type: SubClassProperty
  linkClass: Address
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
- name: teamMembers
  type: MultiFileProperty
  linkClass: Contact
```

**Features:**
- Array of wikilinks
- Autocomplete support
- Bidirectional tracking
- Batch operations

**Use Cases:** Team members, related projects, attached documents

---

## 📦 Complex & Media Properties

### ObjectProperty
Nested object with multiple fields.

```yaml
- name: socialMedia
  type: ObjectProperty
  display: inline # or "block"
  properties:
    - name: linkedin
      type: LinkProperty
    - name: twitter
      type: TextProperty
    - name: github
      type: LinkProperty
```

**Features:**
- Nested structure
- Inline or block display
- Reusable property definitions
- Validation of nested fields

**Use Cases:** Addresses, social profiles, structured metadata

---

### FileProperty
Single file attachment.

```yaml
- name: resume
  type: FileProperty
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
- name: documents
  type: MultiFileProperty
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
- name: profilePhoto
  type: MediaProperty
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
- name: productPhotos
  type: MultiMediaProperty
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
- name: productModel
  type: 3DModelProperty
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
- name: personalInfo
  type: HeaderProperty
  level: 2 # h1, h2, h3, etc.
```

**Features:**
- Visual grouping
- No data storage
- Hierarchical levels
- Collapsible sections

**Use Cases:** Form organization, visual separation, grouping

---

## 🛠️ Property Configuration Options

All properties support these common options:

```yaml
- name: fieldName
  type: PropertyType
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
