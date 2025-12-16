# Process System

The Process System allows you to automate actions based on lifecycle events and property changes in your classes. Processes are configured in YAML and executed automatically when specific conditions are met.

## Overview

The Process System consists of three main components:

1. **ProcessManager**: Manages and executes processes (singleton per Vault)
2. **ConditionManager**: Evaluates conditions to determine if a process should run
3. **Process Configuration**: YAML-based configuration defining triggers, conditions, and actions

## Configuration

Processes are defined in your class YAML configuration files under the `process` key:

```yaml
className: Personne
classIcon: 👤
properties:
  # ... property definitions
process:
  - name: ClassChangeProcess
    description: Updates the class based on the relation property
    triggers:
      - onPropertyChange
    conditions:
      - property: relation
        type: equals
        value: Salarié
    actions:
      - type: UpdateClassAction
        newClass: Salarié
```

## Triggers

Processes can be triggered by the following lifecycle events:

| Trigger | Description | When it fires |
|---------|-------------|---------------|
| `onCreate` | File creation | After a new file is created |
| `onUpdate` | File update | After file metadata is updated |
| `onDelete` | File deletion | Before a file is deleted |
| `onPropertyChange` | Property change | After a specific property value changes |

**Default behavior**: If no triggers are specified, the process defaults to `onUpdate`.

### Property Change Trigger

When using `onPropertyChange`, the process runs whenever any property value changes. You can use conditions to filter for specific properties:

```yaml
triggers:
  - onPropertyChange
conditions:
  - property: status
    type: equals
    value: Active
```

## Conditions

Conditions determine whether a process should execute. All conditions must be met (AND logic) for the process to run.

### Condition Types

#### Equality Conditions

**equals**: Exact match (case-insensitive for strings)
```yaml
conditions:
  - property: status
    type: equals
    value: Active
```

**notEquals**: Does not match
```yaml
conditions:
  - property: status
    type: notEquals
    value: Archived
```

**equalsAny**: Matches any value in the list
```yaml
conditions:
  - property: status
    type: equalsAny
    values:
      - Active
      - Pending
      - Approved
```

**notEqualsAny**: Does not match any value in the list
```yaml
conditions:
  - property: status
    type: notEqualsAny
    values:
      - Deleted
      - Archived
```

#### String Conditions

**contains**: Property value contains the substring (case-insensitive)
```yaml
conditions:
  - property: description
    type: contains
    value: urgent
```

**notContains**: Property value does not contain the substring
```yaml
conditions:
  - property: description
    type: notContains
    value: draft
```

#### Numeric Conditions

**greaterThan**: Value is greater than the specified number
```yaml
conditions:
  - property: age
    type: greaterThan
    value: 18
```

**lessThan**: Value is less than the specified number
```yaml
conditions:
  - property: age
    type: lessThan
    value: 65
```

**greaterThanOrEqual**: Value is greater than or equal to
```yaml
conditions:
  - property: score
    type: greaterThanOrEqual
    value: 80
```

**lessThanOrEqual**: Value is less than or equal to
```yaml
conditions:
  - property: score
    type: lessThanOrEqual
    value: 100
```

#### Empty Conditions

**isEmpty**: Property has no value (null, undefined, or empty string)
```yaml
conditions:
  - property: description
    type: isEmpty
```

**isNotEmpty**: Property has a value
```yaml
conditions:
  - property: email
    type: isNotEmpty
```

### Multiple Conditions

All conditions must be satisfied (AND logic):

```yaml
conditions:
  - property: status
    type: equals
    value: Active
  - property: priority
    type: greaterThan
    value: 5
  - property: assignee
    type: isNotEmpty
```

## Actions

Actions define what happens when a process is triggered and its conditions are met. Multiple actions can be specified and will execute in order.

### UpdateClassAction

Changes the class of the current instance by updating the Classe metadata property.

```yaml
actions:
  - type: UpdateClassAction
    newClass: Salarié
```

**Parameters:**
- `newClass` (required): Name of the new class to assign

**Example use case**: Automatically promote a Person to Employee when their relation changes:

```yaml
process:
  - name: PromoteToEmployee
    triggers:
      - onPropertyChange
    conditions:
      - property: relation
        type: equals
        value: Salarié
    actions:
      - type: UpdateClassAction
        newClass: Salarié
```

### CreateFileAction

Creates a new file of a specified class with optional properties and parent relationship.

```yaml
actions:
  - type: CreateFileAction
    className: Tache
    name: Follow-up Task
    properties:
      priority: High
      status: Todo
    parent: assignedTo
```

**Parameters:**
- `className` (required): Name of the class to create
- `name` (optional): Name for the new file (defaults to "New {className}")
- `properties` (optional): Object with property names and values to set
- `parent` (optional): Property name to use as parent (creates child relationship)

**Example use case**: Automatically create a task when a project is marked as active:

```yaml
process:
  - name: CreateActivationTask
    triggers:
      - onPropertyChange
    conditions:
      - property: status
        type: equals
        value: Active
    actions:
      - type: CreateFileAction
        className: Tache
        name: Project Activation Tasks
        properties:
          description: Setup tasks for the newly activated project
          priority: High
        parent: project
```

## Complete Examples

### Example 1: Status-Based Classification

Automatically change class based on employment status:

```yaml
className: Personne
properties:
  nom:
    type: NameProperty
  relation:
    type: SelectProperty
    options:
      - Client
      - Salarié
      - Partenaire
process:
  - name: UpdateClassOnRelationChange
    description: Changes class when relation property is updated
    triggers:
      - onPropertyChange
    conditions:
      - property: relation
        type: equals
        value: Salarié
    actions:
      - type: UpdateClassAction
        newClass: Salarié
```

### Example 2: Automatic Task Creation

Create a task when a document needs review:

```yaml
className: Document
properties:
  title:
    type: NameProperty
  needsReview:
    type: BooleanProperty
  reviewer:
    type: FileProperty
    classes:
      - Personne
process:
  - name: CreateReviewTask
    description: Creates a task when document needs review
    triggers:
      - onCreate
      - onPropertyChange
    conditions:
      - property: needsReview
        type: equals
        value: true
      - property: reviewer
        type: isNotEmpty
    actions:
      - type: CreateFileAction
        className: Tache
        name: Review Document
        properties:
          type: Review
          priority: High
        parent: reviewer
```

### Example 3: Multi-Action Process

Create multiple related items on project creation:

```yaml
className: Projet
properties:
  nom:
    type: NameProperty
  status:
    type: SelectProperty
process:
  - name: InitializeProject
    description: Sets up project structure
    triggers:
      - onCreate
    conditions:
      - property: status
        type: equals
        value: Active
    actions:
      - type: CreateFileAction
        className: Tache
        name: Project Kickoff
        properties:
          priority: High
      - type: CreateFileAction
        className: Document
        name: Project Plan
        properties:
          type: Planning
```

## Architecture

### Performance Optimization

The ProcessManager is implemented as a singleton per Vault with configuration caching:

- **Single Instance**: One ProcessManager instance per Vault, reused for all classes
- **Configuration Cache**: Class configurations are loaded once and cached in memory
- **Cache Management**: Use `clearCache(className?)` to invalidate cache if needed

### Execution Flow

1. **Trigger**: Lifecycle event occurs (onCreate, onUpdate, etc.)
2. **Load Config**: ProcessManager loads class configuration (from cache if available)
3. **Filter Processes**: Only processes matching the trigger are considered
4. **Evaluate Conditions**: ConditionManager checks if all conditions are met
5. **Execute Actions**: Actions run sequentially if conditions pass
6. **Error Handling**: Process failures are logged but don't stop subsequent processes

### Error Handling

The system uses graceful error handling:

- Individual process failures don't affect other processes
- Action failures are logged with descriptive error messages
- Missing properties or files are handled safely
- Console logging provides visibility into process execution

## Best Practices

### 1. Use Descriptive Names

Give your processes clear, descriptive names:

```yaml
process:
  - name: PromoteToEmployeeOnHiring
    # Better than just "Process1"
```

### 2. Add Descriptions

Document what your process does:

```yaml
process:
  - name: AutoArchive
    description: Archives projects older than 1 year with completed status
```

### 3. Be Specific with Conditions

Use multiple conditions to avoid unintended triggers:

```yaml
conditions:
  - property: status
    type: equals
    value: Completed
  - property: endDate
    type: isNotEmpty
  - property: archived
    type: equals
    value: false
```

### 4. Consider Trigger Timing

Choose appropriate triggers:
- Use `onCreate` for initialization
- Use `onPropertyChange` for responsive updates
- Use `onUpdate` for validation or cleanup
- Use `onDelete` for cascade operations

### 5. Test Thoroughly

Test your processes with various scenarios:
- Property values that meet conditions
- Property values that don't meet conditions
- Missing properties
- Edge cases (empty values, special characters)

### 6. Avoid Infinite Loops

Be careful with actions that might re-trigger the same process:

```yaml
# ⚠️ WARNING: This could loop infinitely
process:
  - name: BadExample
    triggers:
      - onPropertyChange
    conditions:
      - property: status
        type: equals
        value: Active
    actions:
      - type: UpdateClassAction  # This triggers onUpdate/onPropertyChange
        newClass: ActiveClass     # which might trigger this process again
```

To avoid loops:
- Use specific conditions to prevent re-triggering
- Avoid updating the same property that triggers the process
- Use `onCreate` trigger when appropriate instead of `onPropertyChange`

## API Reference

### ProcessManager

```typescript
class ProcessManager {
  constructor(vault: Vault);
  
  // Run processes for a class instance
  async runProcesses(
    className: string,
    instance: Classe,
    trigger: ProcessTrigger,
    changedProperty?: string
  ): Promise<void>;
  
  // Clear configuration cache
  clearCache(className?: string): void;
}
```

### ConditionManager

```typescript
class ConditionManager {
  // Evaluate single condition
  async evaluateCondition(
    condition: Condition,
    instance: Classe
  ): Promise<boolean>;
  
  // Evaluate multiple conditions (AND logic)
  async evaluateConditions(
    conditions: Condition[],
    instance: Classe
  ): Promise<boolean>;
}
```

## Future Enhancements

Potential future additions to the process system:

- **OR Logic**: Support for conditions joined with OR instead of just AND
- **Nested Conditions**: Ability to create complex condition groups
- **More Actions**: Additional action types (UpdatePropertyAction, DeleteFileAction, NotificationAction)
- **Process Priority**: Control execution order of processes
- **Async Actions**: Support for long-running background actions
- **Process Hooks**: Custom code execution at process lifecycle events
- **Process History**: Track process execution history
- **Conditional Actions**: Actions with their own conditions

## Troubleshooting

### Process not running

Check these common issues:

1. **Trigger mismatch**: Verify the trigger matches the event
2. **Conditions not met**: Check if all conditions are satisfied
3. **Configuration errors**: Validate YAML syntax
4. **Cache issues**: Try clearing the ProcessManager cache
5. **Console logs**: Check browser console for error messages

### Actions not executing

Verify:

1. **Class exists**: Ensure target classes are defined (for CreateFileAction)
2. **Properties exist**: Check property names match configuration
3. **File access**: Verify permissions and file system access
4. **Parent references**: Ensure parent properties have valid values

## See Also

- [YAML Configuration Format](./YAML-Configuration-Format.md)
- [Property Types](./Property-Types.md)
- [Auto-Rename Feature](./Auto-Rename.md)
- [Architecture Overview](./Architecture.md)
