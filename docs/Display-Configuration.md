# Display Configuration

The display configuration allows you to completely customize the presentation of class properties in the interface. You can organize your properties into sections, tabs, and collapsible areas.

## Table of Contents

- [Basic Structure](#basic-structure)
- [Container Types](#container-types)
  - [Line - Horizontal Layout](#line---horizontal-layout)
  - [Column - Vertical Layout](#column---vertical-layout)
  - [Tabs - Tabbed Interface](#tabs---tabbed-interface)
  - [Fold - Collapsible Section](#fold---collapsible-section)
- [Complete Examples](#complete-examples)

## Basic Structure

The display configuration goes in the `display` section of the class YAML configuration file:

```yaml
display:
  containers:
    - type: line | column | tabs | fold
      title: "Section Title"
      className: "custom-css-class"
      properties:
        - property1
        - property2
```

### Common Properties

All containers share these base properties:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | string | ✅ | Container type (`line`, `column`, `tabs`, `fold`) |
| `title` | string | ❌ | Title displayed above the container |
| `className` | string | ❌ | Custom CSS class for styling |
| `properties` | string[] | ❌* | List of property names to display |

*Required except for `tabs` type which uses `tabs` instead

## Container Types

### Line - Horizontal Layout

Displays properties on a single horizontal line, ideal for short information.

```yaml
- type: line
  title: "Basic Information"
  properties:
    - name
    - email
    - phone
```

**Result:**
```
┌──────────────────────────────────────┐
│ Basic Information                    │
├──────────────────────────────────────┤
│ [Name]  [Email]  [Phone]            │
└──────────────────────────────────────┘
```

**Best for:**
- Key identifiers (ID, code, reference)
- Status indicators
- Quick metadata
- Fields with short values

### Column - Vertical Layout

Displays properties in a vertical column, perfect for wider fields.

```yaml
- type: column
  title: "Contact Details"
  properties:
    - address
    - city
    - postal_code
    - country
```

**Result:**
```
┌──────────────────────────────────────┐
│ Contact Details                      │
├──────────────────────────────────────┤
│ Address: [________________]          │
│ City: [________________]             │
│ Postal Code: [________________]      │
│ Country: [________________]          │
└──────────────────────────────────────┘
```

**Best for:**
- Address fields
- Long text descriptions
- Multiple related fields
- Forms requiring vertical space

### Tabs - Tabbed Interface

Organizes properties into clickable tabs to save vertical space.

```yaml
- type: tabs
  title: "Complete Profile"
  tabs:
    - title: "General"
      properties:
        - name
        - email
        - phone
        
    - title: "Address"
      properties:
        - street
        - city
        - country
        
    - title: "Professional"
      properties:
        - company
        - job_title
        - department
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
  collapsed: true  # Optional: starts collapsed
  properties:
    - advanced_setting_1
    - advanced_setting_2
    - debug_mode
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
│ Debug Mode: [✓]                      │
└──────────────────────────────────────┘
```

**Best for:**
- Optional/advanced fields
- Infrequently used information
- Technical details
- Keeping interface clean

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
  - name: name
    type: NameProperty
    title: Full Name
    required: true
    
  - name: email
    type: EmailProperty
    title: Email
    required: true
    
  - name: phone
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
1. Ensure using `tabs` array, not `properties`
2. Each tab needs `title` and `properties`
3. Check for proper nesting

## Performance Considerations

- **Light containers**: `line` and `column` render quickly
- **Heavy containers**: `tabs` with many tabs may slow down
- **Nested containers**: Limit nesting depth to 2-3 levels
- **Property count**: Keep total visible properties under 50

## See Also

- [Property Types](./Property-Types.md) - All available property types
- [Static Properties](./Static-Properties.md) - Non-editable fields
- [Architecture](./Architecture.md) - System design
- [Data Loading](./Data-Loading.md) - Loading data from JSON
