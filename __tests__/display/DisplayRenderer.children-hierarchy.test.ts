/**
 * @jest-environment jsdom
 */

import { DisplayRenderer } from '../../src/display/DisplayRenderer';
import { Classe } from '../../src/vault/Classe';
import { Vault } from '../../src/vault/Vault';
import { mockApp } from '../utils/mocks';

describe('DisplayRenderer - Children Hierarchy Fix', () => {
    let vault: Vault;
    let displayRenderer: DisplayRenderer;
    let mockParentInstance: Classe;
    let mockChild1: Classe;
    let mockChild2: Classe;
    let mockUnrelatedFile: Classe;

    beforeEach(() => {
        const app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);
        
        // Create mock parent instance
        mockParentInstance = {
            getName: jest.fn().mockReturnValue('Parent'),
            getPath: jest.fn().mockReturnValue('Parent.md'),
            getClassName: jest.fn().mockReturnValue('ParentClass'),
            findChildren: jest.fn(),
            getFile: jest.fn().mockReturnValue({
                getName: () => 'Parent',
                getPath: () => 'Parent.md',
                getFolderPath: () => '',
                children: []
            })
        } as any;

        // Create mock hierarchical children (should be included)
        mockChild1 = {
            getName: jest.fn().mockReturnValue('Child1'),
            getPath: jest.fn().mockReturnValue('Parent/Child1.md'),
            getClassName: jest.fn().mockReturnValue('ChildClass'),
            name: 'ChildClass',
            getFile: jest.fn().mockReturnValue({
                getName: () => 'Child1',
                getPath: () => 'Parent/Child1.md',
                getFolderPath: () => 'Parent'
            })
        } as any;

        mockChild2 = {
            getName: jest.fn().mockReturnValue('Child2'),
            getPath: jest.fn().mockReturnValue('Parent/Child2.md'),
            getClassName: jest.fn().mockReturnValue('ChildClass'),
            name: 'ChildClass',
            getFile: jest.fn().mockReturnValue({
                getName: () => 'Child2',
                getPath: () => 'Parent/Child2.md',
                getFolderPath: () => 'Parent'
            })
        } as any;

        // Create mock non-hierarchical file (should be filtered out)
        mockUnrelatedFile = {
            getName: jest.fn().mockReturnValue('Unrelated'),
            getPath: jest.fn().mockReturnValue('SomeOtherFolder/Unrelated.md'),
            getClassName: jest.fn().mockReturnValue('ChildClass'),
            name: 'ChildClass',
            getFile: jest.fn().mockReturnValue({
                getName: () => 'Unrelated',
                getPath: () => 'SomeOtherFolder/Unrelated.md',
                getFolderPath: () => 'SomeOtherFolder'
            })
        } as any;

        displayRenderer = new DisplayRenderer(vault, {}, mockParentInstance);
    });

    test('BEFORE FIX: findChildren would return all files including non-hierarchical ones', async () => {
        // Simulate the original bug: findChildren returns ALL files
        (mockParentInstance.findChildren as jest.Mock).mockResolvedValue([
            mockChild1,     // ✅ Hierarchical child
            mockChild2,     // ✅ Hierarchical child
            mockUnrelatedFile // ❌ Non-hierarchical file (should be filtered)
        ]);

        const allFiles = await mockParentInstance.findChildren();
        
        // Original bug: all 3 files returned
        expect(allFiles).toHaveLength(3);
        expect(allFiles).toContain(mockUnrelatedFile);
    });

    test('AFTER FIX: getFilesForTable with children filter should only return hierarchical children', async () => {
        // Setup mocks
        const mockFactory = {
            getAllInstancesForClass: jest.fn()
        };
        vault.getDynamicClassFactory = jest.fn().mockReturnValue(mockFactory);
        vault.conditionManager = {
            createValidationFunction: jest.fn().mockReturnValue(async () => true)
        } as any;

        // Mock findChildren to return ALL files (original behavior)
        (mockParentInstance.findChildren as jest.Mock).mockResolvedValue([
            mockChild1,     // ✅ Should be kept (Parent/Child1.md)
            mockChild2,     // ✅ Should be kept (Parent/Child2.md)  
            mockUnrelatedFile // ❌ Should be filtered out (SomeOtherFolder/Unrelated.md)
        ]);

        // Test our fix
        const filteredChildren = await (displayRenderer as any).getFilesForTable({
            class: 'ChildClass',
            smartFilter: 'children'
        }, mockParentInstance);

        // After fix: only hierarchical children should be returned
        expect(filteredChildren).toHaveLength(2);
        expect(filteredChildren).toContain(mockChild1);
        expect(filteredChildren).toContain(mockChild2);
        expect(filteredChildren).not.toContain(mockUnrelatedFile);
    });

    test('filterHierarchicalChildren method works correctly', async () => {
        const allFiles = [mockChild1, mockChild2, mockUnrelatedFile];
        
        // Test the filter method directly
        const hierarchicalChildren = (displayRenderer as any).filterHierarchicalChildren(mockParentInstance, allFiles);
        
        expect(hierarchicalChildren).toHaveLength(2);
        expect(hierarchicalChildren).toContain(mockChild1);
        expect(hierarchicalChildren).toContain(mockChild2);
        expect(hierarchicalChildren).not.toContain(mockUnrelatedFile);
    });
});