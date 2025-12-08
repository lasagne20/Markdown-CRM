# Auto-Rename Feature

## 📝 Overview

The **autoRename** feature automatically renames files based on their property values. When you update certain properties, the file is automatically renamed according to a template you define, keeping your file names synchronized with your data.

---

## 🎯 Use Cases

- **Consistent naming**: Automatically name files like `2025-01-15 - John Doe.md`
- **Date-based organization**: Include entry dates in filenames
- **Dynamic updates**: File names update when properties change
- **Smart templates**: Combine multiple properties in filenames

---

## 🔧 Configuration

Add the `autoRename` field to your class YAML configuration:

```yaml
name: Person
icon: 👤
autoRename: "{dateEntree} - {nom}"
properties:
  dateEntree:
    type: DateProperty
    title: Date d'entrée
  nom:
    type: TextProperty
    title: Nom
```

### Template Syntax

The template uses **placeholders** in curly braces `{}`:

| Placeholder | Description | Example |
|------------|-------------|---------|
| `{propertyName}` | Value of a property | `{nom}` → "John Doe" |
| `{current}` | Current filename (without extension) | Preserves existing name |
| `{nested.property}` | Nested property value | `{postes.poste}` → "Manager" |

---

## 📋 Examples

### Basic Template
```yaml
autoRename: "{nom}"
```
**Result**: `John Doe.md`

### Date Prefix
```yaml
autoRename: "{dateEntree} - {nom}"
```
**Result**: `2025-01-15 - John Doe.md`

### Preserve Current Name
```yaml
autoRename: "{dateEntree} - {current}"
```
- Initial: `Marie Dupont.md`
- After update: `2025-01-15 - Marie Dupont.md`
- After another update: `2025-01-20 - Marie Dupont.md` (not duplicated!)

### Multiple Properties
```yaml
autoRename: "{code} - {titre} - {status}"
```
**Result**: `PRJ-001 - Website Redesign - Active.md`

### Nested Properties
```yaml
autoRename: "{postes.poste} - {nom}"
properties:
  nom:
    type: TextProperty
    title: Nom
  postes:
    type: ObjectProperty
    title: Postes
    properties:
      poste:
        type: TextProperty
        title: Poste
```
**Result**: `Manager - John Doe.md`

---

## ⚙️ Behavior

### Automatic Renaming
Files are automatically renamed when:
- Properties used in the template are updated via `updateMetadata()`
- Properties are changed through `updatePropertyValue()`

### Smart Updates
The system intelligently handles updates:

✅ **No duplicate values**: When using `{current}`, the old template values are removed before adding new ones

❌ **Before fix**:
```
Initial: "Marie Dupont.md"
Update 1: "2025-01-15 - Marie Dupont.md"
Update 2: "2025-01-20 - 2025-01-15 - Marie Dupont.md" ❌
```

✅ **After fix**:
```
Initial: "Marie Dupont.md"
Update 1: "2025-01-15 - Marie Dupont.md"
Update 2: "2025-01-20 - Marie Dupont.md" ✅
```

### Safety Checks

The system includes several safety mechanisms:

1. **Collision detection**: Won't rename if target file already exists
2. **Skip if correct**: No operation if filename is already correct
3. **Missing values**: Won't rename if required properties are empty/undefined
4. **File sanitization**: Replaces invalid characters (`/`, `:`, `*`, `?`, `<`, `>`, `"`, `\`, `|`) with `-`

---

## 🔍 Template Processing

### How Templates Work

1. **Property collection**: Gather values for all placeholders (except `{current}`)
2. **Current cleaning**: If `{current}` is used, remove old template pattern from current filename
3. **Replacement**: Replace all placeholders with actual values
4. **Sanitization**: Clean the filename of invalid characters
5. **Collision check**: Verify target path is available
6. **Rename**: Move file to new path

### Current Placeholder Cleaning

When using `{current}`, the system extracts the "clean" part of the filename:

**Template**: `{dateEntree} - {current}`

**Current filename**: `2025-01-10 - Marie Dupont`

**Process**:
1. Detect pattern before `{current}`: `{dateEntree} - `
2. Convert to regex: `.+? - ` (matches any date)
3. Extract remainder: `Marie Dupont`
4. Build new name: `2025-01-15 - Marie Dupont`

---

## 🎨 Advanced Patterns

### Conditional Naming
```yaml
# Template adjusts based on which properties have values
autoRename: "{code} - {titre}"
```
- If `code` is empty: rename fails (safety)
- If `titre` is empty: rename fails (safety)

### Complex Hierarchies
```yaml
autoRename: "{parent.nom} - {dateCreation} - {titre}"
```
Combine parent properties with current properties.

### Status Indicators
```yaml
autoRename: "[{priorite}] {titre} - {status}"
```
**Result**: `[HIGH] Fix Login Bug - In Progress.md`

---

## 📊 Logging

The feature includes detailed console logging for debugging:

```
🔄 handleAutoRename called for vault/Person/OldName.md
📋 autoRename template: {dateEntree} - {current}
🔍 Handling autoRename for file: vault/Person/OldName.md
🎨 Generating filename from template: "{dateEntree} - {current}"
📊 Metadata: { dateEntree: '2025-01-15', nom: 'Marie Dupont' }
  📝 {dateEntree} = "2025-01-15" (simple property)
  ✅ Replaced {dateEntree} with "2025-01-15"
  🧹 Cleaned {current}: pattern "{dateEntree} - " matched
    "2025-01-10 - Marie Dupont" → "Marie Dupont"
  🔄 {current} = "Marie Dupont" (current filename)
  ✅ Replaced {current} with "Marie Dupont"
🎯 Filename before sanitization: "2025-01-15 - Marie Dupont"
✨ Final sanitized filename: "2025-01-15 - Marie Dupont"
📝 Generated new file name: 2025-01-15 - Marie Dupont
📂 Current: "2025-01-10 - Marie Dupont" → New: "2025-01-15 - Marie Dupont"
🎯 Target path: vault/Person/2025-01-15 - Marie Dupont.md
🔄 Moving file: vault/Person/2025-01-10 - Marie Dupont.md → vault/Person/2025-01-15 - Marie Dupont.md
✅ File moved successfully
```

---

## ⚠️ Important Notes

### Empty Template
```yaml
autoRename: ""  # Treated as "not configured"
```
Empty strings are ignored (same as omitting the field).

### Missing Properties
If a property in the template is undefined, empty, or null, the rename operation is **aborted** for safety.

### File Collisions
If the target filename already exists (and it's a different file), the rename is **skipped** with a warning:
```
❌ Cannot rename: file already exists at vault/Person/John Doe.md
```

### Character Sanitization
Invalid filename characters are automatically replaced:
- `/` → `-`
- `:` → `-`
- `*` → `-`
- `?` → `-`
- `<` → `-`
- `>` → `-`
- `"` → `-`
- `\` → `-`
- `|` → `-`

**Example**: `What is this?` → `What is this-.md`

---

## 🧪 Testing

The feature includes comprehensive test coverage:

### Unit Tests (`Classe.auto-rename.test.ts`)
- Basic renaming with single/multiple properties
- `{current}` placeholder functionality
- Edge cases (empty values, undefined, sanitization)
- ObjectProperty support (nested properties)
- File collision handling
- Integration with `updateMetadata()` and `updatePropertyValue()`
- **Anti-recursion test**: Verifies `{current}` cleaning works correctly

### Configuration Tests (`ClassConfigManager.auto-rename.test.ts`)
- YAML configuration loading
- Complex templates with `{current}`
- Nested property templates
- Integration with dynamic class creation
- Empty string handling
- Parent configuration compatibility

**Total**: 24 passing tests

---

## 🚀 Migration Guide

### Enabling autoRename

1. **Update your class YAML**:
```yaml
name: YourClass
autoRename: "{property1} - {property2}"
properties:
  property1:
    type: TextProperty
  property2:
    type: DateProperty
```

2. **Rebuild your plugin**:
```bash
npm run build
```

3. **Reload Obsidian**: Restart or reload the plugin

### Updating Existing Files

Existing files won't be automatically renamed. To trigger renaming:
1. Open the file in Obsidian
2. Edit one of the properties used in the template
3. The file will rename automatically on save

---

## 🔗 Related Features

- **[Property Types](./Property-Types.md)** - Available property types for templates
- **[YAML Configuration](./YAML-Configuration-Format.md)** - Configuration file format
- **[Display Configuration](./Display-Configuration.md)** - How classes are displayed

---

## 💡 Tips & Best Practices

### Choose Stable Properties
Use properties that don't change frequently to avoid constant renaming.

### Include Dates
Date prefixes help with chronological sorting:
```yaml
autoRename: "{dateCreation} - {titre}"
```

### Use {current} Wisely
Perfect for adding prefixes while keeping the original name:
```yaml
autoRename: "{status} - {current}"
```

### Test Your Template
Create a test file and update properties to verify the template works as expected.

### Backup First
Before deploying to production, test on a copy of your vault.

---

## 📞 Support

If you encounter issues with autoRename:

1. Check the console logs (Ctrl+Shift+I in Obsidian)
2. Verify your YAML syntax is correct
3. Ensure properties used in template exist in the class
4. Check for special characters in property values

For bugs or feature requests, please open an issue on the GitHub repository.
