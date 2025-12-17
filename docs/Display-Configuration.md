# Display Configuration

The display configuration allows you to completely customize the presentation of class properties in the interface. You can organize your properties into sections, tabs, collapsible areas, buttons, and more using a flexible item-based system.

## Table of Contents

- [Basic Structure](#basic-structure)
- [Display Item Types](#display-item-types)
  - [Property - Display a Property](#property---display-a-property)
  - [Button - Action Trigger](#button---action-trigger)
  - [Line - Horizontal Layout](#line---horizontal-layout)
  - [Column - Vertical Layout](#column---vertical-layout)
  - [Tabs - Tabbed Interface](#tabs---tabbed-interface)
  - [Fold - Collapsible Section](#fold---collapsible-section)
  - [Table - Dynamic Data Table](#table---dynamic-data-table)
- [Complete Examples](#complete-examples)

## Basic Structure

The display configuration goes in the `display` section of the class YAML configuration file:

```yaml
display:
  items:
    - type: property | button | line | column | tabs | fold | table
      # type-specific properties...
```

All items can have an optional `className` for custom styling.

## Display Item Types

### Property - Display a Property

Displays a single property with optional custom title, static mode, and display mode.

```yaml
- type: property
  name: email
  title: "Email Address"  # Optional: custom display title
  static: true            # Optional: display as read-only
  display: table          # Optional: display mode for ObjectProperty ("object", "table", or "list")
  className: "custom-property"  # Optional: CSS class
```

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | string | ✅ | Must be `"property"` |
| `name` | string | ✅ | Property key from properties section |
| `title` | string | ❌ | Custom title override |
| `static` | boolean | ❌ | Display as read-only |
| `display` | string \| DisplayContainer | ❌ | Display mode for ObjectProperty (see below) |
| `className` | string | ❌ | Custom CSS class |

**Note:** The `title`, `static`, and `display` parameters are passed to the property's `getDisplay()` method as arguments. The `display` parameter only affects `ObjectProperty` instances.

**Display Modes for ObjectProperty:**

The `display` parameter can be:
1. **String mode** (legacy, for backward compatibility):
   - `"object"` (default): Each object as a separate card/section
   - `"table"`: Objects in a table format with columns
   
2. **DisplayContainer mode** (advanced, recommended): A full display configuration object that allows complete customization of how each object is rendered. This enables you to use the same powerful display system (line, column, tabs, fold, table, buttons) inside ObjectProperty items.

**Example with DisplayContainer:**
```yaml
- type: property
  name: positions
  display:
    items:
      - type: line
        className: "position-line"
        items:
          - type: property
            name: company
          - type: property
            name: title
      - type: property
        name: description
```

This renders each position object using the custom layout defined in the display configuration.

### Button - Action Trigger

Displays a button that triggers a named process.

```yaml
- type: button
  label: "Convert to Customer"
  process: convertToCustomer  # Name of process defined in process section
  icon: user-plus             # Optional: icon name
  className: "primary-button"  # Optional: CSS class
```

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | string | ✅ | Must be `"button"` |
| `label` | string | ✅ | Button text |
| `process` | string | ✅ | Process name to execute |
| `icon` | string | ❌ | Icon identifier |
| `className` | string | ❌ | Custom CSS class |

### Line - Horizontal Layout

Displays items horizontally, ideal for short information.

```yaml
- type: line
  title: "Basic Information"
  className: "header-line"
  items:
    - type: property
      name: name
    - type: property
      name: email
    - type: property
      name: phone
```

**Result:**
```
┌──────────────────────────────────────┐
│ Basic Information                    │
├──────────────────────────────────────┤
│ [Name]  [Email]  [Phone]            │
└──────────────────────────────────────┘
```

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | string | ✅ | Must be `"line"` |
| `title` | string | ❌ | Title displayed above |
| `items` | array | ✅ | Array of display items |
| `className` | string | ❌ | Custom CSS class |

**Best for:**
- Key identifiers (ID, code, reference)
- Status indicators with action buttons
- Quick metadata
- Fields with short values

### Column - Vertical Layout

Displays items vertically, perfect for wider fields.

```yaml
- type: column
  title: "Contact Details"
  items:
    - type: property
      name: address
    - type: property
      name: city
    - type: property
      name: postal_code
```

**Result:**
```
┌──────────────────────────────────────┐
│ Contact Details                      │
├──────────────────────────────────────┤
│ Address: [________________]          │
│ City: [________________]             │
│ Postal Code: [________________]      │
└──────────────────────────────────────┘
```

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | string | ✅ | Must be `"column"` |
| `title` | string | ❌ | Title displayed above |
| `items` | array | ✅ | Array of display items |
| `className` | string | ❌ | Custom CSS class |

**Best for:**
- Address fields
- Long text descriptions
- Multiple related fields
- Forms requiring vertical space

### Tabs - Tabbed Interface

Organizes items into clickable tabs to save vertical space.

```yaml
- type: tabs
  title: "Complete Profile"
  tabs:
    - name: "General"
      items:
        - type: property
          name: name
        - type: property
          name: email
        - type: property
          name: phone
        
    - name: "Address"
      items:
        - type: property
          name: street
        - type: property
          name: city
        
    - name: "Professional"
      items:
        - type: property
          name: company
        - type: property
          name: job_title
```

**Result:**
```
┌──────────────────────────────────────┐
│ Complete Profile                     │
├──────────────────────────────────────┤
│ [General] [Address] [Professional]   │
├──────────────────────────────────────┤
│ Name: [________________]             │
│ Email: [________________]            │
│ Phone: [________________]            │
└──────────────────────────────────────┘
```

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | string | ✅ | Must be `"tabs"` |
| `title` | string | ❌ | Title displayed above |
| `tabs` | array | ✅ | Array of tab objects |
| `tabs[].name` | string | ✅ | Tab label |
| `tabs[].items` | array | ✅ | Items in this tab |
| `className` | string | ❌ | Custom CSS class |

**Best for:**
- Grouping related properties
- Large number of fields
- Logical information categories
- Progressive disclosure

### Fold - Collapsible Section

A section that can be collapsed/expanded, useful for secondary information.

```yaml
- type: fold
  title: "Advanced Options"
  items:
    - type: property
      name: advanced_setting_1
    - type: property
      name: advanced_setting_2
```

**Result (collapsed):**
```
┌──────────────────────────────────────┐
│ ▶ Advanced Options                   │
└──────────────────────────────────────┘
```

**Result (expanded):**
```
┌──────────────────────────────────────┐
│ ▼ Advanced Options                   │
├──────────────────────────────────────┤
│ Advanced Setting 1: [____]           │
│ Advanced Setting 2: [____]           │
└──────────────────────────────────────┘
```

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | string | ✅ | Must be `"fold"` |
| `title` | string | ✅ | Fold header text |
| `items` | array | ✅ | Items in fold |
| `className` | string | ❌ | Custom CSS class |

**Best for:**
- Optional/advanced fields
- Infrequently used information
- Technical details
- Keeping interface clean

### Table - Dynamic Data Table

Displays related files in an interactive table with filtering, sorting, and totals.

```yaml
- type: table
  title: "Team Members"
  className: "members-table"
  source:
    class: Person
    filter: children  # children | all | parent | siblings | roots
  columns:
    - name: "File"
      propertyName: _fileName
      filter: text
      sort: true
    - name: "Name"
      propertyName: name
      filter: text
      sort: true
    - name: "Role"
      propertyName: role
      filter: select
      sort: true
    - name: "Email"
      propertyName: email
      filter: text
      sort: false
  totals:
    - column: "Total Members"
      formula: count
```

**Configuration Options:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `source.class` | string | ✅ | Class name to query |
| `source.filter` | string | ✅ | Filter type (see below) |
| `source.filterBy` | object | ❌ | Filter by property values (see below) |
| `columns` | array | ✅ | Column definitions |
| `columns[].name` | string | ✅ | Column header text |
| `columns[].propertyName` | string | ✅ | Property to display |
| `columns[].filter` | string/boolean | ❌ | Filter type: `text`, `select`, `false` |
| `columns[].sort` | boolean | ❌ | Enable sorting (default: true) |
| `totals` | array | ❌ | Total calculations |
| `totals[].column` | string | ✅ | Label for total |
| `totals[].formula` | string | ✅ | Formula: `count`, `sum`, `avg`, `min`, `max` |
| `totals[].propertyName` | string | ❌* | Property for calculation |

*Required for `sum`, `avg`, `min`, `max` formulas

**Source Filter Types:**

- `children`: Files that are children of the current file
- `all`: All files of the specified class
- `parent`: Parent file of the current file
- `siblings`: Files at the same level
- `roots`: Top-level files (no parent)

**Property Value Filtering (`filterBy`):**

Filter table results by specific property values. All conditions must match (AND logic).

```yaml
source:
  class: Person
  filter: children
  filterBy:
    statut: "Actif"              # Single value
    type: ["Client", "Partner"]   # Multiple values (OR)
    verified: true                # Boolean
    score: 5                      # Number
```

**Examples:**

```yaml
# Show only active members
source:
  class: Person
  filter: children
  filterBy:
    statut: "Actif"

# Show clients or partners with high priority
source:
  class: Contact
  filter: all
  filterBy:
    type: ["Client", "Partner"]
    priorite: "Haute"

# Show completed projects
source:
  class: Project
  filter: children
  filterBy:
    statut: "Terminé"
    archived: false
```

**Result:**
```
┌─────────────────────────────────────────────────────────────┐
│ Team Members                                                │
├─────────────────────────────────────────────────────────────┤
│ File ▼      │ Name ▼      │ Role ▼      │ Email           │
├─────────────┼─────────────┼─────────────┼─────────────────┤
│ [Filter...] │ [Filter...] │ [All ▼]     │ [Filter...]     │
├─────────────┼─────────────┼─────────────┼─────────────────┤
│ John Doe    │ John Doe    │ Developer   │ john@example.com│
│ Jane Smith  │ Jane Smith  │ Designer    │ jane@example.com│
│ Bob Wilson  │ Bob Wilson  │ Manager     │ bob@example.com │
├─────────────┼─────────────┼─────────────┼─────────────────┤
│ Total Members: 3                                            │
└─────────────────────────────────────────────────────────────┘
```

**Features:**

1. **Interactive Filtering**
   - Text filters: Type to filter
   - Select filters: Dropdown with unique values
   - Filters work in combination

2. **Column Sorting**
   - Click column header to sort
   - Click again to reverse
   - Visual indicators (▲/▼)

3. **Clickable File Names**
   - First column (`_fileName`) is automatically added
   - Clicking navigates to the file

4. **Totals Row**
   - Multiple totals on one row
   - Positioned in respective columns
   - Auto-formats currency (€) for budget/price fields

**Formula Examples:**

```yaml
totals:
  # Count rows
  - column: "Total Projects"
    formula: count
  
  # Sum numeric property
  - column: "Total Budget"
    formula: sum
    propertyName: budget
  
  # Average calculation
  - column: "Average Score"
    formula: avg
    propertyName: score
  
  # Find minimum
  - column: "Min Price"
    formula: min
    propertyName: price
  
  # Find maximum
  - column: "Max Value"
    formula: max
    propertyName: value
```

**Complete Example:**

```yaml
- type: table
  title: "Company Projects"
  className: "projects-table"
  source:
    class: Project
    filter: children
  columns:
    - name: "File"
      propertyName: _fileName
      filter: text
      sort: true
    - name: "Project Name"
      propertyName: name
      filter: text
      sort: true
    - name: "Status"
      propertyName: status
      filter: select
      sort: true
    - name: "Priority"
      propertyName: priority
      filter: select
      sort: true
    - name: "Progress"
      propertyName: completion
      filter: false
      sort: true
    - name: "Budget"
      propertyName: budget
      filter: false
      sort: true
    - name: "Manager"
      propertyName: manager
      filter: text
      sort: true
  totals:
    - column: "Total Projects"
      formula: count
    - column: "Total Budget"
      formula: sum
      propertyName: budget
    - column: "Average Progress"
      formula: avg
      propertyName: completion
```

**Best for:**
- Listing related records
- Project/task management
- Team member directories
- Budget tracking
- Inventory lists
- Any tabular data with relationships

## Complete Examples

### Example 1: Contact Management

```yaml
className: Contact
classIcon: 👤

display:
  containers:
    # Quick identification
    - type: line
      title: "Identity"
      properties:
        - name
        - email
        - phone
    
    # Main information tabs
    - type: tabs
      title: "Details"
      tabs:
        - title: "Personal"
          properties:
            - date_of_birth
            - nationality
            - languages
            
        - title: "Professional"
          properties:
            - company
            - job_title
            - department
            - manager
            
        - title: "Address"
          properties:
            - street
            - city
            - postal_code
            - country
    
    # Secondary information
    - type: fold
      title: "Additional Notes"
      collapsed: true
      properties:
        - notes
        - tags
        - custom_fields

properties:
  name:
    type: NameProperty
    title: Full Name
    required: true
    
  email:
    type: EmailProperty
    title: Email
    required: true
    
  phone:
    type: PhoneProperty
    title: Phone Number
    
  # ... other properties
```

### Example 2: Project Management

```yaml
className: Project
classIcon: 📊

display:
  containers:
    # Project status at a glance
    - type: line
      title: "Status"
      properties:
        - status
        - priority
        - progress
        - deadline
    
    # Core information
    - type: column
      title: "Project Information"
      properties:
        - name
        - description
        - client
        - budget
    
    # Organized details
    - type: tabs
      title: "Details"
      tabs:
        - title: "Team"
          properties:
            - project_manager
            - team_members
            - stakeholders
            
        - title: "Milestones"
          properties:
            - milestones
            - deliverables
            - dependencies
            
        - title: "Resources"
          properties:
            - assigned_resources
            - equipment
            - external_contractors
    
    # Technical details
    - type: fold
      title: "Technical Information"
      collapsed: true
      properties:
        - repository
        - documentation
        - api_keys
        - server_config

properties:
  # ... property definitions
```

### Example 3: Product Catalog

```yaml
className: Product
classIcon: 📦

display:
  containers:
    # Quick product identification
    - type: line
      title: "Product ID"
      properties:
        - sku
        - barcode
        - category
        - status
    
    # Main product info
    - type: column
      title: "Product Information"
      properties:
        - name
        - description
        - price
        - stock_quantity
        - minimum_order
    
    # Detailed specifications
    - type: tabs
      title: "Specifications"
      tabs:
        - title: "Physical"
          properties:
            - dimensions
            - weight
            - material
            - color
            - size
            
        - title: "Supplier"
          properties:
            - supplier
            - supplier_sku
            - lead_time
            - minimum_order_quantity
            
        - title: "Media"
          properties:
            - images
            - videos
            - documents
            - 3d_model
    
    # SEO and marketing
    - type: fold
      title: "Marketing & SEO"
      collapsed: true
      properties:
        - seo_title
        - seo_description
        - keywords
        - marketing_tags

properties:
  # ... property definitions
```

### Example 4: ObjectProperty Display Modes

This example demonstrates the different display modes available for ObjectProperty.

```yaml
className: Company
classIcon: 🏢

display:
  items:
    - type: property
      name: name
    
    # Display contacts as a table (default is "object")
    - type: property
      name: contacts
      title: "Contact List"
      display: table
    
    # Display addresses as objects (default, explicitly set)
    - type: property
      name: addresses
      title: "Company Addresses"
      display: object
    
    # Display notes as a list
    - type: property
      name: notes
      title: "Notes"
      display: list

properties:
  name:
    type: text
    title: Company Name
  
  contacts:
    type: object
    title: Contacts
    properties:
      name:
        type: text
        title: Contact Name
      email:
        type: email
        title: Email
      phone:
        type: phone
        title: Phone
      role:
        type: text
        title: Role
  
  addresses:
    type: object
    title: Addresses
    properties:
      type:
        type: select
        title: Type
        options:
          - name: Headquarters
            color: blue
          - name: Branch
            color: green
      street:
        type: text
        title: Street
      city:
        type: text
        title: City
      country:
        type: text
        title: Country
  
  notes:
    type: object
    title: Notes
    properties:
      date:
        type: date
        title: Date
      content:
        type: text
        title: Content
```

**Display Mode Comparison:**

| Mode | Use Case | Appearance |
|------|----------|------------|
| `object` | Complex items with many fields | Each item in its own card/section |
| `table` | Structured data with consistent fields | Columnar table with headers |
| `list` | Simple items, compact view | Minimal vertical list |

## Nested Containers

Containers can be nested for complex layouts:

```yaml
display:
  containers:
    - type: tabs
      title: "Main Sections"
      tabs:
        - title: "Overview"
          containers:
            - type: line
              properties:
                - id
                - status
            - type: column
              properties:
                - name
                - description
                
        - title: "Details"
          containers:
            - type: fold
              title: "Basic Details"
              properties:
                - field1
                - field2
            - type: fold
              title: "Advanced Details"
              collapsed: true
              properties:
                - field3
                - field4
```

## Styling with CSS Classes

Add custom styling by using `className`:

```yaml
- type: line
  title: "Priority Information"
  className: "priority-section highlight-section"
  properties:
    - priority
    - deadline
```

Then in your CSS:

```css
.priority-section {
  background-color: #fff3cd;
  border-left: 4px solid #ffc107;
  padding: 10px;
}

.highlight-section {
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
```

## Best Practices

### 1. Organize by Usage Frequency
- Put most-used properties in `line` or top `column`
- Use `fold` for rarely accessed fields
- Group related properties in `tabs`

### 2. Progressive Disclosure
```yaml
# Good: Show essential first, details later
- type: line
  properties: [name, status]  # Always visible
  
- type: fold
  collapsed: true
  properties: [details...]  # Hidden by default
```

### 3. Logical Grouping
```yaml
# Good: Related properties together
tabs:
  - title: "Personal"
    properties: [name, age, address]
  - title: "Professional"
    properties: [company, title, salary]
```

### 4. Limit Properties per Container
- **Line**: 3-5 properties max
- **Column**: 5-10 properties max
- **Tab**: 8-15 properties max
- **Fold**: No strict limit, but keep focused

### 5. Meaningful Titles
```yaml
# Good
- title: "Emergency Contact Information"

# Bad
- title: "Section 1"
```

## Common Patterns

### Dashboard Pattern
```yaml
# Quick overview + detailed tabs
containers:
  - type: line
    title: "At a Glance"
    properties: [key_metrics]
    
  - type: tabs
    title: "Detailed Information"
    tabs: [...]
```

### Form Pattern
```yaml
# Vertical forms with sections
containers:
  - type: column
    title: "Required Information"
    properties: [required_fields]
    
  - type: fold
    title: "Optional Information"
    collapsed: true
    properties: [optional_fields]
```

### Wizard Pattern
```yaml
# Step-by-step progression
containers:
  - type: tabs
    title: "Setup Wizard"
    tabs:
      - title: "Step 1: Basic Info"
      - title: "Step 2: Configuration"
      - title: "Step 3: Review"
```

## Troubleshooting

### Property Not Displaying
1. Check property name matches exactly (case-sensitive)
2. Verify property is defined in `properties` section
3. Check for typos in YAML
4. Ensure indentation is correct

### Layout Issues
1. Verify YAML syntax (indentation matters!)
2. Check for missing required fields
3. Ensure `type` is valid
4. Test with simple configuration first

### Tab Not Showing
1. Ensure using `tabs` array with `items`
2. Each tab needs `name` and `items`
3. Check for proper nesting

## Technical Implementation

### getDisplay() Method Signature

Properties receive display configuration as arguments:

```typescript
async getDisplay(
    classe: Classe,
    args?: {
        staticMode?: boolean;  // Display as read-only
        title?: string;        // Custom display title
        displayMode?: string;  // Display mode for ObjectProperty ("object", "table", or "list")
    }
): Promise<HTMLElement>
```

**Example in ClassConfigManager:**

```typescript
// Property item with custom title, static mode, and display mode
{
    type: 'property',
    name: 'contacts',
    title: 'Contact List',
    static: true,
    display: 'table'
}

// Internally calls:
await property.getDisplay(classeInstance, {
    title: 'Contact List',
    staticMode: true,
    displayMode: 'table'
});
```

**Note:** The `displayMode` parameter only affects `ObjectProperty` instances. When provided, it sets the `display` property on the ObjectProperty before rendering, determining how the objects are displayed. It can be:
- A string (`"object"`, `"table"`) for simple display modes
- A DisplayContainer object for advanced custom layouts (see ObjectProperty Custom Display section below)

## ObjectProperty Custom Display

One of the most powerful features is the ability to fully customize how ObjectProperty items are displayed by passing a `DisplayContainer` configuration to the `display` parameter. This allows you to use the same display system (line, column, tabs, fold, table, buttons) to layout the properties within each object.

### Basic Example

Instead of displaying objects in the default "object" or "table" mode, you can define a custom layout:

```yaml
properties:
  - name: positions
    type: ObjectProperty
    properties:
      - name: company
        type: TextProperty
      - name: title
        type: TextProperty
      - name: startDate
        type: DateProperty
      - name: description
        type: TextProperty

display:
  items:
    - name: "Professional Experience"
      items:
        - type: property
          name: positions
          display:
            items:
              - type: line
                className: "position-header"
                items:
                  - type: property
                    name: company
                  - type: property
                    name: title
              - type: property
                name: startDate
              - type: property
                name: description
```

This renders each position with:
- Company and title on a single line
- Start date below
- Description field at the bottom

### Advanced ObjectProperty Layout

You can use any display item type inside an ObjectProperty:

```yaml
- type: property
  name: team_members
  display:
    items:
      - type: tabs
        tabs:
          - label: "Info"
            items:
              - type: line
                items:
                  - type: property
                    name: name
                  - type: property
                    name: role
              - type: property
                name: email
          - label: "Skills"
            items:
              - type: property
                name: skills
              - type: property
                name: experience_level
      - type: fold
        title: "Additional Details"
        items:
          - type: property
            name: bio
          - type: property
            name: notes
```

This creates a complex layout for each team member with:
- Tabbed interface separating Info and Skills
- Line layout for name and role
- Collapsible section for additional details

### Features

**Supported in ObjectProperty custom display:**
- ✅ All layout types (line, column, tabs, fold)
- ✅ Nested layouts
- ✅ Custom CSS classes
- ✅ Property titles and static mode
- ✅ Buttons (can trigger processes with object context)
- ✅ Table display for nested ObjectProperties
- ✅ Drag & drop reordering (if `allowMove: true` on ObjectProperty)
- ✅ Add/delete buttons

**Backward Compatibility:**
The string modes (`"object"`, `"table"`) still work as before:

```yaml
- type: property
  name: contacts
  display: table  # Simple table view
```

### Use Cases

**1. Compact Multi-field Display:**
```yaml
display:
  items:
    - type: line
      items:
        - type: property
          name: code
        - type: property
          name: status
        - type: property
          name: priority
```

**2. Hierarchical Information:**
```yaml
display:
  items:
    - type: property
      name: title
    - type: fold
      title: "Details"
      items:
        - type: property
          name: description
        - type: property
          name: metadata
```

**3. Action-Oriented Display:**
```yaml
display:
  items:
    - type: line
      items:
        - type: property
          name: task_name
        - type: button
          label: "Complete"
          process: markComplete
```

### Display Item Rendering Flow

1. `getDisplay()` is called on the Classe instance
2. Iterates through `display.items` array
3. For each item, calls `renderDisplayItem(item)`
4. Routes to specific renderer based on `item.type`:
   - `property` → `renderProperty()` → calls `property.getDisplay()`
     - For ObjectProperty with DisplayContainer: calls `fillDisplay()` with custom layout
   - `button` → `renderButton()` → creates button with process handler
   - `line`/`column` → `renderContainer()` → recursively renders nested items
   - `tabs` → `renderTabs()` → creates tab interface
   - `fold` → `renderFold()` → creates collapsible section
   - `table` → `renderTable()` → creates DynamicTable instance
5. Returns complete DOM tree

## Performance Considerations

- **Light items**: `property` and `button` render instantly
- **Heavy items**: `tabs` with many tabs may slow down initial render
- **Nested items**: Limit nesting depth to 2-3 levels for optimal performance
- **Property count**: Keep total visible properties under 50
- **Table performance**: Tables with 100+ rows may require pagination

## See Also

- [Property Types](./Property-Types.md) - All available property types
- [Static Properties](./Static-Properties.md) - Non-editable fields
- [Process System](./Process-System.md) - Creating button actions
- [Architecture](./Architecture.md) - System design
- [Data Loading](./Data-Loading.md) - Loading data from JSON
