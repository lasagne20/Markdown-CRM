import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { File } from '../../src/vault/File';
import { IApp, IFile, IFolder } from '../../src/interfaces/IApp';
import { FileProperty } from '../../src/properties/FileProperty';

describe('Classe - Parent Folder Configuration', () => {
    let mockApp: IApp;
    let vault: Vault;
    let files: Map<string, IFile>;
    let folders: Map<string, IFolder>;
    let metadata: Map<string, Record<string, any>>;

    class TestClasse extends Classe {
        static override parentPropertyName = 'parent';
        static override parentFolderName = 'Projets'; // Sous-dossier configuré

        static override create(vault: Vault): TestClasse {
            return new TestClasse(vault);
        }
    }

    class TestClasseNoFolder extends Classe {
        static override parentPropertyName = 'parent';
        // Pas de parentFolderName configuré

        static override create(vault: Vault): TestClasseNoFolder {
            return new TestClasseNoFolder(vault);
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
            readFile: jest.fn(async (file: IFile): Promise<string> => {
                const meta = metadata.get(file.path) || {};
                const frontmatter = Object.entries(meta)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join('\n');
                return `---\n${frontmatter}\n---\n\nContent`;
            }),
            writeFile: jest.fn(async (file: IFile, content: string) => {
                // Parse frontmatter from written content and update metadata map
                const match = content.match(/^---\n([\s\S]+?)\n---\n/);
                if (match) {
                    const frontmatterText = match[1];
                    const newMeta: Record<string, any> = {};
                    frontmatterText.split('\n').forEach(line => {
                        const colonIndex = line.indexOf(':');
                        if (colonIndex > 0) {
                            const key = line.substring(0, colonIndex).trim();
                            let value = line.substring(colonIndex + 1).trim();
                            // Remove quotes if present
                            if ((value.startsWith('"') && value.endsWith('"')) || 
                                (value.startsWith("'") && value.endsWith("'"))) {
                                value = value.substring(1, value.length - 1);
                            }
                            newMeta[key] = value;
                        }
                    });
                    metadata.set(file.path, newMeta);
                }
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
            delete: jest.fn(),
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

    describe('With parentFolderName configured', () => {
        test('should place child in specified subfolder when no grandchildren', async () => {
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

            // Call updateParentFolder
            await (childClasse as any).updateParentFolder();

            // Verify subfolder "Projets" was created
            const createFolderCalls = (mockApp.createFolder as jest.Mock).mock.calls;
            expect(createFolderCalls.some((call: any[]) => call[0].endsWith('/Projets'))).toBe(true);
            
            // Verify child was moved to Parent/Projets/Child.md
            const moveCalls = (mockApp.move as jest.Mock).mock.calls;
            expect(moveCalls.some((call: any[]) => 
                call[0].basename === 'Child' && call[1].endsWith('/Projets/Child.md')
            )).toBe(true);
        });

        test('should place child with grandchildren in subfolder with its own folder', async () => {
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
            jest.spyOn(vault, 'createClasse').mockImplementation(async (file: IFile) => {
                if (file.basename === 'Grandchild') return grandchildClasse;
                return childClasse;
            });

            // Call updateParentFolder
            await (childClasse as any).updateParentFolder();

            // Verify subfolder "Projets" was created
            const createFolderCalls = (mockApp.createFolder as jest.Mock).mock.calls;
            expect(createFolderCalls.some((call: any[]) => call[0].endsWith('/Projets'))).toBe(true);
            
            // Verify child got its own folder inside Projets: Parent/Projets/Child
            expect(createFolderCalls.some((call: any[]) => call[0].endsWith('/Projets/Child'))).toBe(true);
            
            // Verify child was moved to Parent/Projets/Child/Child.md
            const moveCalls = (mockApp.move as jest.Mock).mock.calls;
            expect(moveCalls.some((call: any[]) => 
                call[0].basename === 'Child' && call[1].endsWith('/Projets/Child/Child.md')
            )).toBe(true);
        });
    });

    describe('Without parentFolderName configured', () => {
        test('should place child directly in parent folder when no grandchildren', async () => {
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

            const parentClasse = new TestClasseNoFolder(vault);
            parentClasse.addProperty(new FileProperty('parent', vault, ['TestClasseNoFolder'], {}));
            parentClasse.setFile(new File(vault, parentFile));

            const childClasse = new TestClasseNoFolder(vault);
            const childParentProp = new FileProperty('parent', vault, ['TestClasseNoFolder'], {});
            childClasse.addProperty(childParentProp);
            childClasse.setFile(new File(vault, childFile));

            // Mock getParentFile
            jest.spyOn(childParentProp, 'getParentFile').mockResolvedValue(new File(vault, parentFile));
            jest.spyOn(vault, 'createClasse').mockResolvedValue(childClasse);

            // Call updateParentFolder
            await (childClasse as any).updateParentFolder();

            // Verify child was moved directly to Parent/Child.md (no subfolder)
            const moveCalls = (mockApp.move as jest.Mock).mock.calls;
            const childMoveCall = moveCalls.find((call: any[]) => call[0].basename === 'Child');
            expect(childMoveCall).toBeDefined();
            expect(childMoveCall[1]).toMatch(/\/Parent\/Child\.md$/);
        });

        test('should place child with grandchildren in its own folder directly under parent', async () => {
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

            const parentClasse = new TestClasseNoFolder(vault);
            parentClasse.addProperty(new FileProperty('parent', vault, ['TestClasseNoFolder'], {}));
            parentClasse.setFile(new File(vault, parentFile));

            const childClasse = new TestClasseNoFolder(vault);
            const childParentProp = new FileProperty('parent', vault, ['TestClasseNoFolder'], {});
            childClasse.addProperty(childParentProp);
            childClasse.setFile(new File(vault, childFile));

            const grandchildClasse = new TestClasseNoFolder(vault);
            grandchildClasse.addProperty(new FileProperty('parent', vault, ['TestClasseNoFolder'], {}));
            grandchildClasse.setFile(new File(vault, grandchildFile));

            // Mock getParentFile
            jest.spyOn(childParentProp, 'getParentFile').mockResolvedValue(new File(vault, parentFile));
            jest.spyOn(vault, 'createClasse').mockImplementation(async (file: IFile) => {
                if (file.basename === 'Grandchild') return grandchildClasse;
                return childClasse;
            });

            // Call updateParentFolder
            await (childClasse as any).updateParentFolder();

            // Verify child got its own folder directly under parent: Parent/Child
            const createFolderCalls = (mockApp.createFolder as jest.Mock).mock.calls;
            expect(createFolderCalls.some((call: any[]) => call[0].endsWith('/Parent/Child'))).toBe(true);
            
            // Verify child was moved to Parent/Child/Child.md (no Projets subfolder)
            const moveCalls = (mockApp.move as jest.Mock).mock.calls;
            expect(moveCalls.some((call: any[]) => 
                call[0].basename === 'Child' && call[1].endsWith('/Parent/Child/Child.md')
            )).toBe(true);
        });
    });

    describe('updatePropertyValue triggers updateParentFolder', () => {
        test('should call updateParentFolder when parent property changes', async () => {
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
            metadata.set(childFile.path, { parent: '' });

            const childClasse = new TestClasse(vault);
            const childParentProp = new FileProperty('parent', vault, ['TestClasse'], {});
            childClasse.addProperty(childParentProp);
            const childFileWrapper = new File(vault, childFile);
            childClasse.setFile(childFileWrapper);

            // Spy on updateParentFolder
            const updateParentFolderSpy = jest.spyOn(childClasse as any, 'updateParentFolder');

            // Mock getParentFile to return parent
            jest.spyOn(childParentProp, 'getParentFile').mockResolvedValue(new File(vault, parentFile));
            jest.spyOn(vault, 'createClasse').mockResolvedValue(childClasse);

            // Update parent property value via updatePropertyValue (comme le fait l'interface)
            await childClasse.updatePropertyValue('parent', '[[Parent]]');

            // Verify updateParentFolder was called
            expect(updateParentFolderSpy).toHaveBeenCalled();

            // Verify file content was written (metadata update happens via writeFile)
            expect(mockApp.writeFile).toHaveBeenCalled();
            const writeCall = (mockApp.writeFile as jest.Mock).mock.calls[0];
            expect(writeCall[1]).toContain('parent: "[[Parent]]"');

            // Verify child was moved to Parent/Projets/Child.md
            const moveCalls = (mockApp.move as jest.Mock).mock.calls;
            expect(moveCalls.some((call: any[]) => 
                call[0].basename === 'Child' && call[1].includes('/Projets/')
            )).toBe(true);
        });

        test('should not call updateParentFolder when non-parent property changes', async () => {
            const childFile: IFile = {
                path: 'Child.md',
                name: 'Child.md',
                basename: 'Child',
                extension: 'md'
            };
            files.set(childFile.path, childFile);
            metadata.set(childFile.path, { parent: '', status: 'draft' });

            const childClasse = new TestClasse(vault);
            childClasse.addProperty(new FileProperty('parent', vault, ['TestClasse'], {}));
            const childFileWrapper = new File(vault, childFile);
            childClasse.setFile(childFileWrapper);

            // Spy on updateParentFolder
            const updateParentFolderSpy = jest.spyOn(childClasse as any, 'updateParentFolder');

            // Update a different property (not parent)
            await childClasse.updatePropertyValue('status', 'published');

            // Verify updateParentFolder was NOT called
            expect(updateParentFolderSpy).not.toHaveBeenCalled();

            // Verify file content was written (metadata update happens via writeFile)
            expect(mockApp.writeFile).toHaveBeenCalled();
            const writeCall = (mockApp.writeFile as jest.Mock).mock.calls[0];
            expect(writeCall[1]).toContain('status: published');
        });
    });
});
