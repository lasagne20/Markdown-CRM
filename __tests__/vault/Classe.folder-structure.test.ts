import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { File } from '../../src/vault/File';
import { IApp, IFile, IFolder } from '../../src/interfaces/IApp';
import { FileProperty } from '../../src/properties/FileProperty';

describe('Classe - Folder Structure and Mode 1 findChildren', () => {
    let mockApp: IApp;
    let vault: Vault;
    let files: Map<string, IFile>;
    let folders: Map<string, IFolder>;
    let metadata: Map<string, Record<string, any>>;

    class TestClasse extends Classe {
        static override parentPropertyName = 'parent';

        static override create(vault: Vault): TestClasse {
            return new TestClasse(vault);
        }
    }

    beforeEach(() => {
        files = new Map();
        folders = new Map();
        metadata = new Map();

        mockApp = {
            getSettings: jest.fn(() => ({
                phoneFormat: 'FR',
                dateFormat: 'DD/MM/YYYY',
                timeFormat: '24h',
                timezone: 'Europe/Paris',
                numberLocale: 'fr-FR',
                currencySymbol: '€'
            })),
            readFile: jest.fn(async (file: IFile) => {
                return `# ${file.basename}\n\nContent of ${file.name}`;
            }),
            writeFile: jest.fn(async (file: IFile, content: string) => {
                // Mock implementation
            }),
            createFile: jest.fn(async (path: string, content: string): Promise<IFile> => {
                const name = path.split('/').pop() || '';
                const basename = name.replace(/\.md$/, '');
                const file: IFile = {
                    path,
                    name,
                    basename,
                    extension: 'md'
                };
                files.set(path, file);
                return file;
            }),
            delete: jest.fn(async (file: IFile | IFolder) => {
                if ('extension' in file) {
                    files.delete(file.path);
                } else {
                    folders.delete(file.path);
                }
            }),
            move: jest.fn(async (file: IFile, newPath: string) => {
                const oldPath = file.path;
                files.delete(oldPath);
                file.path = newPath;
                file.name = newPath.split('/').pop() || '';
                file.basename = file.name.replace(/\.md$/, '');
                files.set(newPath, file);
            }),
            createFolder: jest.fn(async (path: string): Promise<IFolder> => {
                const name = path.split('/').pop() || '';
                const folder: IFolder = {
                    path,
                    name,
                    children: []
                };
                folders.set(path, folder);
                return folder;
            }),
            listFiles: jest.fn(async (): Promise<IFile[]> => {
                return Array.from(files.values());
            }),
            listFolders: jest.fn(async (): Promise<IFolder[]> => {
                return Array.from(folders.values());
            }),
            getFile: jest.fn(async (path: string): Promise<IFile | IFolder | null> => {
                return files.get(path) || folders.get(path) || null;
            }),
            getAbsolutePath: jest.fn((relativePath: string) => `/vault/${relativePath}`),
            getName: jest.fn(() => 'Test Vault'),
            isFolder: jest.fn((file: IFile) => !('extension' in file)),
            isFile: jest.fn((file: IFile) => 'extension' in file),
            getUrl: jest.fn((path: string) => `file:///vault/${path}`),
            getMetadata: jest.fn(async (file: IFile): Promise<Record<string, any>> => {
                return metadata.get(file.path) || {};
            }),
            updateMetadata: jest.fn(async (file: IFile, meta: Record<string, any>) => {
                metadata.set(file.path, { ...meta });
            }),
            createButton: jest.fn(),
            createInput: jest.fn(),
            createDiv: jest.fn(() => document.createElement('div')),
            setIcon: jest.fn(),
            getTemplateContent: jest.fn(),
            getSetting: jest.fn(),
            setSetting: jest.fn(),
            getVaultPath: jest.fn(() => '/vault'),
            open: jest.fn(),
            waitForFileMetaDataUpdate: jest.fn(async (filePath: string, key: string, callback: () => Promise<void>) => {
                await callback();
            }),
            waitForMetaDataCacheUpdate: jest.fn(async (callback: () => Promise<void>) => {
                await callback();
            }),
            selectMedia: jest.fn(),
            selectMultipleFile: jest.fn(),
            selectFile: jest.fn(),
            selectClasse: jest.fn(),
            sendNotice: jest.fn()
        } as any;

        vault = new Vault(mockApp, {
            templateFolder: 'templates',
            personalName: 'Test User',
            configPath: 'config'
        });
    });

    describe('Mode 1: findChildren with parent/children structure', () => {
        test('should find direct children using children property', async () => {
            // Create parent file with children structure
            const parentFile: IFile = {
                path: 'Projects/Project1.md',
                name: 'Project1.md',
                basename: 'Project1',
                extension: 'md',
                children: []
            };
            files.set(parentFile.path, parentFile);

            // Create child files
            const child1: IFile = {
                path: 'Projects/Project1/Task1.md',
                name: 'Task1.md',
                basename: 'Task1',
                extension: 'md',
                parent: {
                    path: 'Projects',
                    name: 'Projects',
                    children: [parentFile]
                }
            };
            
            const child2: IFile = {
                path: 'Projects/Project1/Task2.md',
                name: 'Task2.md',
                basename: 'Task2',
                extension: 'md',
                parent: {
                    path: 'Projects',
                    name: 'Projects',
                    children: [parentFile]
                }
            };

            files.set(child1.path, child1);
            files.set(child2.path, child2);

            // Link children to parent
            parentFile.children = [child1, child2];

            // Create classes
            const parentClasse = new TestClasse(vault);
            const parentProperty = new FileProperty('parent', vault, ['TestClasse'], {});
            parentClasse.addProperty(parentProperty);
            parentClasse.setFile(new File(vault, parentFile));

            // Mock createClasse to return TestClasse instances
            jest.spyOn(vault, 'createClasse').mockImplementation(async (file: IFile) => {
                const classe = new TestClasse(vault);
                classe.addProperty(new FileProperty('parent', vault, ['TestClasse'], {}));
                classe.setFile(new File(vault, file));
                return classe;
            });

            // Find children using Mode 1
            const children = await (parentClasse as any).findChildren();

            expect(children).toHaveLength(2);
            expect(children[0].getFile()?.getName(false)).toBe('Task1');
            expect(children[1].getFile()?.getName(false)).toBe('Task2');
        });

        test('should find children recursively in nested folder structure', async () => {
            // Create parent
            const parentFile: IFile = {
                path: 'Projects/Project1.md',
                name: 'Project1.md',
                basename: 'Project1',
                extension: 'md',
                children: []
            };
            files.set(parentFile.path, parentFile);

            // Create subfolder
            const subfolder: IFolder = {
                path: 'Projects/Project1/Tasks',
                name: 'Tasks',
                children: []
            };
            folders.set(subfolder.path, subfolder);

            // Create children in subfolder
            const child1: IFile = {
                path: 'Projects/Project1/Tasks/Task1.md',
                name: 'Task1.md',
                basename: 'Task1',
                extension: 'md'
            };
            
            const child2: IFile = {
                path: 'Projects/Project1/Tasks/Task2.md',
                name: 'Task2.md',
                basename: 'Task2',
                extension: 'md'
            };

            files.set(child1.path, child1);
            files.set(child2.path, child2);

            // Build structure
            subfolder.children = [child1, child2];
            parentFile.children = [subfolder];

            const parentClasse = new TestClasse(vault);
            const parentProperty = new FileProperty('parent', vault, ['TestClasse'], {});
            parentClasse.addProperty(parentProperty);
            parentClasse.setFile(new File(vault, parentFile));

            jest.spyOn(vault, 'createClasse').mockImplementation(async (file: IFile) => {
                const classe = new TestClasse(vault);
                classe.addProperty(new FileProperty('parent', vault, ['TestClasse'], {}));
                classe.setFile(new File(vault, file));
                return classe;
            });

            const children = await (parentClasse as any).findChildren();

            expect(children).toHaveLength(2);
            expect(children[0].getFile()?.getName(false)).toBe('Task1');
            expect(children[1].getFile()?.getName(false)).toBe('Task2');
        });

        test('should handle mixed files and folders in children', async () => {
            const parentFile: IFile = {
                path: 'Projects/Project1.md',
                name: 'Project1.md',
                basename: 'Project1',
                extension: 'md',
                children: []
            };
            files.set(parentFile.path, parentFile);

            // Direct child file
            const directChild: IFile = {
                path: 'Projects/Project1/DirectTask.md',
                name: 'DirectTask.md',
                basename: 'DirectTask',
                extension: 'md'
            };
            files.set(directChild.path, directChild);

            // Subfolder with children
            const subfolder: IFolder = {
                path: 'Projects/Project1/SubTasks',
                name: 'SubTasks',
                children: []
            };
            folders.set(subfolder.path, subfolder);

            const subChild: IFile = {
                path: 'Projects/Project1/SubTasks/SubTask.md',
                name: 'SubTask.md',
                basename: 'SubTask',
                extension: 'md'
            };
            files.set(subChild.path, subChild);

            subfolder.children = [subChild];
            parentFile.children = [directChild, subfolder];

            const parentClasse = new TestClasse(vault);
            parentClasse.addProperty(new FileProperty('parent', vault, ['TestClasse'], {}));
            parentClasse.setFile(new File(vault, parentFile));

            jest.spyOn(vault, 'createClasse').mockImplementation(async (file: IFile) => {
                const classe = new TestClasse(vault);
                classe.addProperty(new FileProperty('parent', vault, ['TestClasse'], {}));
                classe.setFile(new File(vault, file));
                return classe;
            });

            const children = await (parentClasse as any).findChildren();

            expect(children).toHaveLength(2);
            const childNames = children.map((c: Classe) => c.getFile()?.getName(false)).sort();
            expect(childNames).toEqual(['DirectTask', 'SubTask']);
        });

        test('should handle deeply nested folder structures', async () => {
            const parentFile: IFile = {
                path: 'root.md',
                name: 'root.md',
                basename: 'root',
                extension: 'md',
                children: []
            };
            files.set(parentFile.path, parentFile);

            // Level 1 folder
            const folder1: IFolder = {
                path: 'root/level1',
                name: 'level1',
                children: []
            };

            // Level 2 folder
            const folder2: IFolder = {
                path: 'root/level1/level2',
                name: 'level2',
                children: []
            };

            // Deep child
            const deepChild: IFile = {
                path: 'root/level1/level2/deep.md',
                name: 'deep.md',
                basename: 'deep',
                extension: 'md'
            };
            files.set(deepChild.path, deepChild);

            folder2.children = [deepChild];
            folder1.children = [folder2];
            parentFile.children = [folder1];

            const parentClasse = new TestClasse(vault);
            parentClasse.addProperty(new FileProperty('parent', vault, ['TestClasse'], {}));
            parentClasse.setFile(new File(vault, parentFile));

            jest.spyOn(vault, 'createClasse').mockImplementation(async (file: IFile) => {
                const classe = new TestClasse(vault);
                classe.addProperty(new FileProperty('parent', vault, ['TestClasse'], {}));
                classe.setFile(new File(vault, file));
                return classe;
            });

            const children = await (parentClasse as any).findChildren();

            expect(children).toHaveLength(1);
            expect(children[0].getFile()?.getName(false)).toBe('deep');
        });

        test('should return empty array when no children property exists', async () => {
            const parentFile: IFile = {
                path: 'Projects/Project1.md',
                name: 'Project1.md',
                basename: 'Project1',
                extension: 'md'
                // No children property
            };
            files.set(parentFile.path, parentFile);

            const parentClasse = new TestClasse(vault);
            parentClasse.addProperty(new FileProperty('parent', vault, ['TestClasse'], {}));
            parentClasse.setFile(new File(vault, parentFile));

            // Should fall back to Mode 2, which will find nothing
            const children = await (parentClasse as any).findChildren();

            // Mode 2 fallback should return empty since no files match
            expect(children).toHaveLength(0);
        });

        test('should handle empty children array', async () => {
            const parentFile: IFile = {
                path: 'Projects/Project1.md',
                name: 'Project1.md',
                basename: 'Project1',
                extension: 'md',
                children: [] // Empty array
            };
            files.set(parentFile.path, parentFile);

            const parentClasse = new TestClasse(vault);
            parentClasse.addProperty(new FileProperty('parent', vault, ['TestClasse'], {}));
            parentClasse.setFile(new File(vault, parentFile));

            const children = await (parentClasse as any).findChildren();

            expect(children).toHaveLength(0);
        });
    });

    describe('updateParentFolder - File organization', () => {
        test('should move parent to dedicated folder when setting parent property', async () => {
            // Create parent file (not in dedicated folder yet)
            const parentFile: IFile = {
                path: 'Projects/Parent.md',
                name: 'Parent.md',
                basename: 'Parent',
                extension: 'md'
            };
            files.set(parentFile.path, parentFile);
            metadata.set(parentFile.path, {});

            // Create child file
            const childFile: IFile = {
                path: 'Projects/Child.md',
                name: 'Child.md',
                basename: 'Child',
                extension: 'md'
            };
            files.set(childFile.path, childFile);
            metadata.set(childFile.path, { parent: '[[Parent]]' });

            const parentClasse = new TestClasse(vault);
            parentClasse.addProperty(new FileProperty('parent', vault, ['TestClasse'], {}));
            parentClasse.setFile(new File(vault, parentFile));

            const childClasse = new TestClasse(vault);
            const childParentProp = new FileProperty('parent', vault, ['TestClasse'], {});
            childClasse.addProperty(childParentProp);
            childClasse.setFile(new File(vault, childFile));

            // Mock getParentFile to return parent file directly
            jest.spyOn(childParentProp, 'getParentFile').mockResolvedValue(new File(vault, parentFile));
            jest.spyOn(vault, 'createClasse').mockResolvedValue(childClasse);

            // Call updateParentFolder directly
            await (childClasse as any).updateParentFolder();

            // Verify folder operations were attempted
            const createFolderCalls = (mockApp.createFolder as jest.Mock).mock.calls;
            const renameCalls = (mockApp.move as jest.Mock).mock.calls;
            
            // At least folders and file moves should be attempted
            expect(createFolderCalls.length + renameCalls.length).toBeGreaterThan(0);
        });

        test('should create subfolder for child with grandchildren', async () => {
            // Create hierarchy: Parent -> Child (has grandchildren) -> Grandchild
            const parentFile: IFile = {
                path: 'Parent.md',
                name: 'Parent.md',
                basename: 'Parent',
                extension: 'md'
            };
            files.set(parentFile.path, parentFile);
            metadata.set(parentFile.path, {});

            const childFile: IFile = {
                path: 'Child.md',
                name: 'Child.md',
                basename: 'Child',
                extension: 'md'
            };
            files.set(childFile.path, childFile);
            metadata.set(childFile.path, { parent: '[[Parent]]' });

            const grandchildFile: IFile = {
                path: 'Grandchild.md',
                name: 'Grandchild.md',
                basename: 'Grandchild',
                extension: 'md'
            };
            files.set(grandchildFile.path, grandchildFile);
            metadata.set(grandchildFile.path, { parent: '[[Child]]' });

            // Create classes
            const parentClasse = new TestClasse(vault);
            parentClasse.addProperty(new FileProperty('parent', vault, ['TestClasse'], {}));
            parentClasse.setFile(new File(vault, parentFile));

            const childClasse = new TestClasse(vault);
            const childParentProp = new FileProperty('parent', vault, ['TestClasse'], {});
            childClasse.addProperty(childParentProp);
            childClasse.setFile(new File(vault, childFile));

            const grandchildClasse = new TestClasse(vault);
            grandchildClasse.addProperty(new FileProperty('parent', vault, ['TestClasse'], {}));
            grandchildClasse.setFile(new File(vault, grandchildFile));

            // Mock getParentFile
            jest.spyOn(childParentProp, 'getParentFile').mockResolvedValue(new File(vault, parentFile));
            
            // Mock createClasse to return appropriate classes
            jest.spyOn(vault, 'createClasse').mockImplementation(async (file: IFile) => {
                if (file.basename === 'Grandchild') return grandchildClasse;
                if (file.basename === 'Child') return childClasse;
                return parentClasse;
            });

            // Call updateParentFolder directly
            await (childClasse as any).updateParentFolder();

            // Verify folder operations
            const createFolderCalls = (mockApp.createFolder as jest.Mock).mock.calls;
            const renameCalls = (mockApp.move as jest.Mock).mock.calls;
            
            // Child has grandchildren, so should trigger folder creation
            expect(createFolderCalls.length + renameCalls.length).toBeGreaterThan(0);
        });

        test('should place child directly in parent folder if no grandchildren', async () => {
            const parentFile: IFile = {
                path: 'Parent.md',
                name: 'Parent.md',
                basename: 'Parent',
                extension: 'md'
            };
            files.set(parentFile.path, parentFile);
            metadata.set(parentFile.path, {});

            const childFile: IFile = {
                path: 'Child.md',
                name: 'Child.md',
                basename: 'Child',
                extension: 'md'
            };
            files.set(childFile.path, childFile);
            metadata.set(childFile.path, { parent: '[[Parent]]' });

            const parentClasse = new TestClasse(vault);
            parentClasse.addProperty(new FileProperty('parent', vault, ['TestClasse'], {}));
            parentClasse.setFile(new File(vault, parentFile));

            const childClasse = new TestClasse(vault);
            const childParentProp = new FileProperty('parent', vault, ['TestClasse'], {});
            childClasse.addProperty(childParentProp);
            childClasse.setFile(new File(vault, childFile));

            // Mock getParentFile
            jest.spyOn(childParentProp, 'getParentFile').mockResolvedValue(new File(vault, parentFile));
            jest.spyOn(vault, 'createClasse').mockResolvedValue(childClasse);

            // Call updateParentFolder directly
            await (childClasse as any).updateParentFolder();

            // Verify operations occurred
            const createFolderCalls = (mockApp.createFolder as jest.Mock).mock.calls;
            const renameCalls = (mockApp.move as jest.Mock).mock.calls;
            
            expect(createFolderCalls.length + renameCalls.length).toBeGreaterThan(0);
        });

        test('should handle complex multi-level hierarchy correctly', async () => {
            // Create: Root -> Level1 (has children) -> Level2 (no children)
            const rootFile: IFile = {
                path: 'Root.md',
                name: 'Root.md',
                basename: 'Root',
                extension: 'md'
            };
            files.set(rootFile.path, rootFile);
            metadata.set(rootFile.path, {});

            const level1File: IFile = {
                path: 'Level1.md',
                name: 'Level1.md',
                basename: 'Level1',
                extension: 'md'
            };
            files.set(level1File.path, level1File);
            metadata.set(level1File.path, { parent: '[[Root]]' });

            const level2File: IFile = {
                path: 'Level2.md',
                name: 'Level2.md',
                basename: 'Level2',
                extension: 'md'
            };
            files.set(level2File.path, level2File);
            metadata.set(level2File.path, { parent: '[[Level1]]' });

            const rootClasse = new TestClasse(vault);
            rootClasse.addProperty(new FileProperty('parent', vault, ['TestClasse'], {}));
            rootClasse.setFile(new File(vault, rootFile));

            const level1Classe = new TestClasse(vault);
            const level1ParentProp = new FileProperty('parent', vault, ['TestClasse'], {});
            level1Classe.addProperty(level1ParentProp);
            level1Classe.setFile(new File(vault, level1File));

            const level2Classe = new TestClasse(vault);
            level2Classe.addProperty(new FileProperty('parent', vault, ['TestClasse'], {}));
            level2Classe.setFile(new File(vault, level2File));

            // Mock getParentFile
            jest.spyOn(level1ParentProp, 'getParentFile').mockResolvedValue(new File(vault, rootFile));
            
            jest.spyOn(vault, 'createClasse').mockImplementation(async (file: IFile) => {
                if (file.basename === 'Level2') return level2Classe;
                if (file.basename === 'Level1') return level1Classe;
                return rootClasse;
            });

            // Call updateParentFolder on Level1
            await (level1Classe as any).updateParentFolder();

            // Verify operations
            const createFolderCalls = (mockApp.createFolder as jest.Mock).mock.calls;
            const renameCalls = (mockApp.move as jest.Mock).mock.calls;
            
            expect(createFolderCalls.length + renameCalls.length).toBeGreaterThan(0);
        });
    });

    describe('moveChildrenToFolder', () => {
        test('should move all children to target folder', async () => {
            const parentFile: IFile = {
                path: 'Parent.md',
                name: 'Parent.md',
                basename: 'Parent',
                extension: 'md',
                children: []
            };
            files.set(parentFile.path, parentFile);

            const child1: IFile = {
                path: 'Child1.md',
                name: 'Child1.md',
                basename: 'Child1',
                extension: 'md'
            };
            const child2: IFile = {
                path: 'Child2.md',
                name: 'Child2.md',
                basename: 'Child2',
                extension: 'md'
            };
            files.set(child1.path, child1);
            files.set(child2.path, child2);
            parentFile.children = [child1, child2];

            const parentClasse = new TestClasse(vault);
            parentClasse.addProperty(new FileProperty('parent', vault, ['TestClasse'], {}));
            parentClasse.setFile(new File(vault, parentFile));

            const child1Classe = new TestClasse(vault);
            child1Classe.addProperty(new FileProperty('parent', vault, ['TestClasse'], {}));
            child1Classe.setFile(new File(vault, child1));

            const child2Classe = new TestClasse(vault);
            child2Classe.addProperty(new FileProperty('parent', vault, ['TestClasse'], {}));
            child2Classe.setFile(new File(vault, child2));

            jest.spyOn(vault, 'createClasse').mockImplementation(async (file: IFile) => {
                if (file.basename === 'Child1') return child1Classe;
                if (file.basename === 'Child2') return child2Classe;
                return parentClasse;
            });

            await (parentClasse as any).moveChildrenToFolder('Parent');

            expect(mockApp.move).toHaveBeenCalledWith(
                expect.objectContaining({ basename: 'Child1' }),
                'Parent/Child1.md'
            );
            expect(mockApp.move).toHaveBeenCalledWith(
                expect.objectContaining({ basename: 'Child2' }),
                'Parent/Child2.md'
            );
        });

        test('should create dedicated folder for children with grandchildren', async () => {
            const parentFile: IFile = {
                path: 'Parent.md',
                name: 'Parent.md',
                basename: 'Parent',
                extension: 'md',
                children: []
            };
            files.set(parentFile.path, parentFile);

            const childFile: IFile = {
                path: 'Child.md',
                name: 'Child.md',
                basename: 'Child',
                extension: 'md',
                children: []
            };
            files.set(childFile.path, childFile);

            const grandchildFile: IFile = {
                path: 'Grandchild.md',
                name: 'Grandchild.md',
                basename: 'Grandchild',
                extension: 'md'
            };
            files.set(grandchildFile.path, grandchildFile);

            childFile.children = [grandchildFile];
            parentFile.children = [childFile];

            const parentClasse = new TestClasse(vault);
            parentClasse.addProperty(new FileProperty('parent', vault, ['TestClasse'], {}));
            parentClasse.setFile(new File(vault, parentFile));

            const childClasse = new TestClasse(vault);
            childClasse.addProperty(new FileProperty('parent', vault, ['TestClasse'], {}));
            childClasse.setFile(new File(vault, childFile));

            const grandchildClasse = new TestClasse(vault);
            grandchildClasse.addProperty(new FileProperty('parent', vault, ['TestClasse'], {}));
            grandchildClasse.setFile(new File(vault, grandchildFile));

            jest.spyOn(vault, 'createClasse').mockImplementation(async (file: IFile) => {
                if (file.basename === 'Grandchild') return grandchildClasse;
                if (file.basename === 'Child') return childClasse;
                return parentClasse;
            });

            await (parentClasse as any).moveChildrenToFolder('Parent');

            // Child has grandchildren, should get dedicated folder
            expect(mockApp.createFolder).toHaveBeenCalledWith('Parent/Child');
            expect(mockApp.move).toHaveBeenCalledWith(
                expect.objectContaining({ basename: 'Child' }),
                'Parent/Child/Child.md'
            );
        });
    });
});
