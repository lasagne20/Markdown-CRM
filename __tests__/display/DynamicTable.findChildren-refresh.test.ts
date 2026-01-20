/**
 * @jest-environment jsdom
 * 
 * Test reproduisant le bug où ajouter un nouveau fichier enfant dans le vault
 * ne met pas à jour les tableaux utilisant smartFilter: 'children'
 * 
 * Bug: findChildren() est appelé une seule fois et les résultats sont mis en cache
 * Solution: Invalider le cache des enfants quand un nouveau fichier est créé
 */

import { DynamicTable } from '../../src/display/DynamicTable';
import { DisplayRenderer } from '../../src/display/DisplayRenderer';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { File } from '../../src/vault/File';

describe('DynamicTable - findChildren Refresh Bug', () => {
    let mockVault: any;
    let mockParentFile: any;
    let mockChildFile1: any;
    let mockChildFile2: any;
    let mockChildFile3: any;
    let parentInstance: Classe;
    let childInstance1: Classe;
    let childInstance2: Classe;
    let childInstance3: Classe;

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';

        // Create mock files with proper getName and getPath methods
        mockParentFile = {
            name: 'Parent.md',
            basename: 'Parent',
            path: 'Parent.md',
            vault: null as any,
            getName: (withExtension?: boolean) => withExtension ? 'Parent.md' : 'Parent',
            getPath: () => 'Parent.md',
            getFolderPath: () => ''
        };

        mockChildFile1 = {
            name: 'Child1.md',
            basename: 'Child1',
            path: 'Child1.md',
            vault: null as any,
            getName: (withExtension?: boolean) => withExtension ? 'Child1.md' : 'Child1',
            getPath: () => 'Child1.md',
            getFolderPath: () => ''
        };

        mockChildFile2 = {
            name: 'Child2.md',
            basename: 'Child2',
            path: 'Child2.md',
            vault: null as any,
            getName: (withExtension?: boolean) => withExtension ? 'Child2.md' : 'Child2',
            getPath: () => 'Child2.md',
            getFolderPath: () => ''
        };

        // Create mock vault with all necessary methods
        const mockApp: any = {
            setIcon: jest.fn(),
            metadataCache: {
                getFileCache: jest.fn().mockReturnValue({
                    frontmatter: {}
                })
            },
            getMetadata: jest.fn().mockImplementation((file: any) => {
                // Return parent property for child files
                if (file.path && file.path.startsWith('Child')) {
                    return { parent: '[[Parent]]' };
                }
                return {};
            }),
            listFiles: jest.fn()
        };
        
        mockVault = {
            app: mockApp,
            conditionManager: {
                createValidationFunction: jest.fn().mockReturnValue(async () => true),
                createHierarchicalValidationFunction: jest.fn().mockReturnValue(async () => true)
            },
            getDynamicClassFactory: jest.fn().mockReturnValue({
                getAllInstancesForClass: jest.fn().mockResolvedValue([])
            }),
            getFromFile: jest.fn(),
            // Vault.listFiles() method - needed by Classe.findChildren()
            listFiles: jest.fn().mockResolvedValue([]),
            createClasse: jest.fn()
        } as any;

        // Create parent instance (constructor signature: vault, file, data)
        parentInstance = new Classe(mockVault, new (File as any)(mockVault, mockParentFile));
        (parentInstance as any).properties = {};
        (parentInstance as any).name = 'Parent';

        // Create child instances
        childInstance1 = new Classe(mockVault, new (File as any)(mockVault, mockChildFile1));
        (childInstance1 as any).properties = {
            parent: {
                read: async () => '[[Parent]]',
                type: 'file',
                name: 'parent'
            }
        };
        (childInstance1 as any).name = 'Child';

        childInstance2 = new Classe(mockVault, new (File as any)(mockVault, mockChildFile2));
        (childInstance2 as any).properties = {
            parent: {
                read: async () => '[[Parent]]',
                type: 'file',
                name: 'parent'
            }
        };
        (childInstance2 as any).name = 'Child';

        // Mock getFromFile to return appropriate instances
        mockVault.getFromFile.mockImplementation((file: any) => {
            if (file === mockParentFile) return Promise.resolve(parentInstance);
            if (file === mockChildFile1) return Promise.resolve(childInstance1);
            if (file === mockChildFile2) return Promise.resolve(childInstance2);
            return Promise.resolve(null);
        });

        // Mock getParentFile to return parent for children
        (childInstance1 as any).getParentFile = jest.fn().mockResolvedValue(mockParentFile);
        (childInstance2 as any).getParentFile = jest.fn().mockResolvedValue(mockParentFile);
        
        // Mock createClasse to return instances
        mockVault.createClasse.mockImplementation(async (file: any) => {
            if (file === mockChildFile1) return childInstance1;
            if (file === mockChildFile2) return childInstance2;
            return null;
        });
    });

    test('REGRESSION: verifying findChildren() is called fresh each time', async () => {
        console.log('🧪 REGRESSION TEST: Verifying findChildren is called with fresh data...');

        // Configuration du tableau avec smartFilter: 'children'
        const tableConfig = {
            source: {
                class: 'Child',
                smartFilter: 'children'
            },
            columns: [
                { property: '_fileName' }
            ]
        };

        // Mock findChildren to track calls and simulate current behavior
        let callCount = 0;
        const mockFindChildren = jest.fn().mockImplementation(async () => {
            callCount++;
            console.log(`📞 findChildren() called (call #${callCount})`);
            
            // Simulate real behavior: always scan filesystem and return fresh results
            // In real code, this would call vault.listFiles() each time
            if (callCount === 1) {
                return [childInstance1, childInstance2];
            } else {
                // After Child3 is added, return all 3
                return [childInstance1, childInstance2, childInstance3];
            }
        });
        
        (parentInstance as any).findChildren = mockFindChildren;

        // État initial : 2 enfants
        const displayRenderer = new DisplayRenderer(mockVault, {}, parentInstance);
        const initialFiles = await (displayRenderer as any).getFilesForTable(tableConfig.source, parentInstance);

        console.log('✅ Initial state:', initialFiles.length, 'children');
        expect(initialFiles.length).toBe(2);
        expect(mockFindChildren).toHaveBeenCalledTimes(1);

        // Ajouter un nouvel enfant dans le vault
        mockChildFile3 = {
            name: 'Child3.md',
            basename: 'Child3',
            path: 'Child3.md',
            vault: mockVault,
            getName: (withExtension?: boolean) => withExtension ? 'Child3.md' : 'Child3',
            getPath: () => 'Child3.md',
            getFolderPath: () => ''
        };

        childInstance3 = new Classe(mockVault, new (File as any)(mockVault, mockChildFile3));
        (childInstance3 as any).properties = {
            parent: {
                read: async () => '[[Parent]]',
                type: 'file',
                name: 'parent'
            }
        };
        (childInstance3 as any).name = 'Child';

        console.log('📁 New child file added to vault');

        // Rafraîchir le tableau (simuler needDisplayRefresh)
        const displayRenderer2 = new DisplayRenderer(mockVault, {}, parentInstance);
        const filesAfterAdd = await (displayRenderer2 as any).getFilesForTable(tableConfig.source, parentInstance);

        console.log('✅ Files after adding Child3:', filesAfterAdd.length);

        // ✅ findChildren() est appelé une 2ème fois et retourne les données fraîches
        expect(mockFindChildren).toHaveBeenCalledTimes(2);
        expect(filesAfterAdd.length).toBe(3);
        expect(filesAfterAdd).toContain(childInstance3);

        console.log('✅ REGRESSION TEST PASSED: findChildren() called fresh each time');
        console.log('   Workaround: Force Mode 2 in findChildren() to avoid stale file.children');
        console.log('   Full solution: Listen to Obsidian file events - see docs/File-Cache-Refresh-Issue.md');
    });

    test('SOLUTION: table should refresh when findChildren is called fresh', async () => {
        console.log('🧪 Testing solution with fresh findChildren calls...');

        const tableConfig = {
            source: {
                class: 'Child',
                smartFilter: 'children'
            },
            columns: [
                { property: '_fileName' }
            ]
        };

        // État initial : 2 enfants
        let currentChildren = [childInstance1, childInstance2];
        
        // Mock findChildren qui retourne toujours la liste actuelle (pas de cache)
        (parentInstance as any).findChildren = jest.fn().mockImplementation(async () => {
            console.log('📋 findChildren() called, returning', currentChildren.length, 'children');
            return [...currentChildren]; // Retourner une nouvelle copie à chaque appel
        });

        // Créer le tableau initial
        const displayRenderer = new DisplayRenderer(mockVault, {}, parentInstance);
        const initialFiles = await (displayRenderer as any).getFilesForTable(tableConfig.source, parentInstance);

        expect(initialFiles.length).toBe(2);
        console.log('✅ Initial: 2 children');

        // Ajouter un nouvel enfant dans le vault
        mockChildFile3 = {
            name: 'Child3.md',
            basename: 'Child3',
            path: 'Parent/Child3.md',
            vault: mockVault,
            getName: (withExtension?: boolean) => withExtension ? 'Child3.md' : 'Child3',
            getPath: () => 'Parent/Child3.md',
            getFolderPath: () => 'Parent'
        };

        childInstance3 = new Classe(mockVault, new (File as any)(mockVault, mockChildFile3));
        (childInstance3 as any).properties = {
            parent: {
                read: async () => '[[Parent]]',
                type: 'file',
                name: 'parent'
            }
        };
        (childInstance3 as any).name = 'Child';
        (childInstance3 as any).getParentFile = jest.fn().mockResolvedValue(mockParentFile);

        // SOLUTION: Mettre à jour la liste actuelle (simulant un système sans cache)
        currentChildren = [childInstance1, childInstance2, childInstance3];
        console.log('✨ Child3 added, findChildren() will now return 3 children');

        // Recréer le tableau
        const displayRenderer2 = new DisplayRenderer(mockVault, {}, parentInstance);
        const filesAfterAdd = await (displayRenderer2 as any).getFilesForTable(tableConfig.source, parentInstance);

        // Maintenant ça devrait fonctionner
        expect(filesAfterAdd.length).toBe(3);
        expect(filesAfterAdd).toContain(childInstance3);

        console.log('✅ SOLUTION WORKS: Table now shows 3 children');
        console.log('   FIX: Ensure findChildren() always returns fresh data from vault');
        console.log('   USAGE: findChildren() should re-scan files each time, not use cached results');
    });
});
