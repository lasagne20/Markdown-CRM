# File Cache Refresh Issue

## Problem Description

When a new file is added to the Obsidian vault, tables using `smartFilter: 'children'` do not automatically refresh to show the new file. The user must manually refresh the view to see the new child file appear in the table.

## Root Cause

The issue stems from potential caching at multiple levels:

1. **Obsidian API Cache**: `this.app.listFiles()` may return cached file lists
2. **File.children Property**: The `file.children` property from Obsidian's file object may be cached
3. **No Event Listeners**: The plugin doesn't listen to Obsidian's file creation/modification/deletion events

### Code Flow

```
DisplayRenderer.getFilesForTable()
  → smartFilter: 'children'
    → currentInstance.findChildren()
      → Mode 1: this.file.children (CACHED by Obsidian)
      → Mode 2: this.vault.listFiles()
        → this.app.listFiles() (CACHED by Obsidian)
```

## Current Workaround

The code has been modified to:

1. **Force Mode 2**: `Classe.findChildren()` now always uses filesystem scan instead of the cached `file.children` property
2. **Documentation**: Added comments explaining the caching behavior

See:
- [src/vault/Classe.ts](../src/vault/Classe.ts#L323-L362) - `findChildren()` method with `forceRefresh = true`
- [src/vault/Vault.ts](../src/vault/Vault.ts#L119-L135) - `listFiles()` method documentation

## Proper Solution

### 1. Listen to Obsidian File Events

The plugin should register event listeners for file operations:

```typescript
// In main plugin file or Vault.ts
this.registerEvent(
    this.app.vault.on('create', async (file) => {
        console.log('File created:', file.path);
        // Invalidate cache or trigger refresh
        this.app.needDisplayRefresh?.();
    })
);

this.registerEvent(
    this.app.vault.on('delete', async (file) => {
        console.log('File deleted:', file.path);
        // Invalidate cache or trigger refresh
        this.app.needDisplayRefresh?.();
    })
);

this.registerEvent(
    this.app.vault.on('rename', async (file, oldPath) => {
        console.log('File renamed:', oldPath, '->', file.path);
        // Invalidate cache or trigger refresh
        this.app.needDisplayRefresh?.();
    })
);
```

### 2. Implement Cache Invalidation

Add a method to clear cached file lists:

```typescript
// In Vault.ts
private fileListCache: IFile[] | null = null;
private cacheTimestamp: number = 0;
private cacheTTL: number = 5000; // 5 seconds

async listFiles(forceRefresh: boolean = false): Promise<IFile[]> {
    const now = Date.now();
    
    // Use cache if available and not expired
    if (!forceRefresh && this.fileListCache && (now - this.cacheTimestamp) < this.cacheTTL) {
        return this.fileListCache;
    }
    
    // Fetch fresh data
    let files = await this.app.listFiles();
    const filtered: IFile[] = [];
    
    for (const file of files) {
        const fileInstance = new File(this, file);
        const classeValue = await fileInstance.getClassePropertyValue();
        if (classeValue) {
            filtered.push(file);
        }
    }
    
    // Update cache
    this.fileListCache = filtered;
    this.cacheTimestamp = now;
    
    return filtered;
}

invalidateFileListCache(): void {
    this.fileListCache = null;
    this.cacheTimestamp = 0;
}
```

### 3. Call Refresh on File Events

```typescript
// When file is created/deleted/renamed
this.vault.invalidateFileListCache();
this.app.needDisplayRefresh?.();
```

## Testing

See [__tests__/display/DynamicTable.findChildren-refresh.test.ts](../__tests__/display/DynamicTable.findChildren-refresh.test.ts) for:

1. **BUG Test**: Demonstrates the caching issue
2. **SOLUTION Test**: Shows how fresh data fixes the problem

## Impact

- **Performance**: Mode 2 (filesystem scan) is slightly slower than Mode 1 (using cached `file.children`)
- **Correctness**: Tables now show fresh data, but Obsidian's `app.listFiles()` may still cache results
- **User Experience**: User may still need to manually refresh in some cases until event listeners are implemented

## Recommended Actions

1. ✅ **Immediate** (DONE): Force Mode 2 in `findChildren()` to avoid stale `file.children`
2. ⏳ **Short-term**: Implement event listeners for file create/delete/rename
3. ⏳ **Medium-term**: Add cache invalidation mechanism with TTL
4. ⏳ **Long-term**: Consider using Obsidian's MetadataCache API for more efficient file tracking

## Related Code

- [DisplayRenderer.ts#L369-L373](../src/display/DisplayRenderer.ts#L369-L373) - smartFilter: 'children' handler
- [Classe.ts#L323-L430](../src/vault/Classe.ts#L323-L430) - `findChildren()` implementation
- [Vault.ts#L119-L135](../src/vault/Vault.ts#L119-L135) - `listFiles()` implementation
- [ProcessManager.ts#L291-L292](../src/Config/ProcessManager.ts#L291-L292) - Example of `needDisplayRefresh()` usage
