import { Classe } from '../../src/vault/Classe';
import { Vault } from '../../src/vault/Vault';
import { File } from '../../src/vault/File';
import { FileProperty } from '../../src/properties/FileProperty';
import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { MultiFileProperty } from '../../src/properties/MultiFileProperty';
import { TextProperty } from '../../src/properties/TextProperty';
import { Property } from '../../src/properties/Property';

// Mock implementations
class TestableClasse extends Classe {
    static parentPropertyName?: string;

    static create(vault: Vault): Classe {
        return new TestableClasse(vault);
    }

    async onCreate(): Promise<void> {}
    async onUpdate(): Promise<void> {}
    async onDelete(): Promise<void> {}

    // Public wrappers for protected methods (for testing)
    public testGetParentProperty() {
        return this.getParentProperty();
    }

    public async testGetParentFile() {
        return await this.getParentFile();
    }

    public async testUpdateParentFolder() {
        return await this.updateParentFolder();
    }

    public async testFindChildren() {
        return await this.findChildren();
    }

    public async testMoveChildrenToFolder(targetFolderPath: string) {
        return await this.moveChildrenToFolder(targetFolderPath);
    }
}

// Mock File class with necessary methods
class MockFile {
    public updateMetadataSpy: jest.Mock;

    constructor(
        public name: string,
        public path: string,
        public basename: string,
        public extension: string = 'md',
        public parent: { path: string } = { path: '' }
    ) {
        this.updateMetadataSpy = jest.fn();
    }

    getPath(): string {
        return this.path;
    }

    getName(withExtension: boolean = true): string {
        return withExtension ? this.name : this.basename;
    }

    getFolderPath(): string {
        return this.parent.path;
    }

    async updateMetadata(propertyName: string, value: any): Promise<void> {
        this.updateMetadataSpy(propertyName, value);
    }

    async move(folderPath: string, fileName: string): Promise<void> {
        this.path = `${folderPath}/${fileName}`;
        this.parent = { path: folderPath };
    }
}

// Mock implementations for external dependencies
const mockApp = {
    createDiv: jest.fn((className?: string) => {
        const div = document.createElement('div');
        if (className) div.className = className;
        return div;
    }),
    setIcon: jest.fn(),
    getMetadata: jest.fn(),
    updateMetadata: jest.fn(),
    getTemplateContent: jest.fn(),
    createFolder: jest.fn().mockResolvedValue(undefined),
    fileExists: jest.fn(),
    getAbstractFileByPath: jest.fn(),
    getFile: jest.fn(),
    renameFile: jest.fn((file, newPath) => {
        // Update the file path when renamed
        if (file && typeof file === 'object' && 'path' in file) {
            file.path = newPath;
            const lastSlash = newPath.lastIndexOf('/');
            if (lastSlash >= 0) {
                file.parent = { path: newPath.substring(0, lastSlash) };
                file.name = newPath.substring(lastSlash + 1);
                const dotIndex = file.name.lastIndexOf('.');
                file.basename = dotIndex > 0 ? file.name.substring(0, dotIndex) : file.name;
            }
        }
        return Promise.resolve();
    }),
    readFile: jest.fn().mockResolvedValue('---\nexisting: value\n---\nBody content'),
    writeFile: jest.fn().mockResolvedValue(undefined),
    waitForFileMetaDataUpdate: jest.fn().mockResolvedValue(undefined),
    listFiles: jest.fn().mockResolvedValue([])
};

const mockVault = {
    app: mockApp,
    getFromLink: jest.fn(),
    createClasse: jest.fn()
} as unknown as Vault;

describe('Classe - Parent-Child Relationships', () => {
    let childClasse: TestableClasse;
    let parentFile: MockFile;
    let childFile: MockFile;
    let parentProperty: FileProperty;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup parent file
        parentFile = new MockFile(
            'parent.md',
            '/vault/parent.md',
            'parent',
            'md',
            { path: '/vault' }
        );

        // Setup child file
        childFile = new MockFile(
            'child.md',
            '/vault/child.md',
            'child',
            'md',
            { path: '/vault' }
        );

        // Setup child classe
        childClasse = new TestableClasse(mockVault);
        childClasse.setFile(childFile as unknown as File);

        // Setup parent property
        parentProperty = new FileProperty('parent', mockVault, [], {});
        childClasse.addProperty(parentProperty);

        // Configure parent property name
        TestableClasse.parentPropertyName = 'parent';

        // Default mock responses
        mockApp.getMetadata.mockResolvedValue({});
        mockApp.fileExists.mockResolvedValue(true);
        mockApp.getFile.mockResolvedValue(null); // By default, folder doesn't exist
        mockApp.getAbstractFileByPath.mockImplementation((path: string) => {
            if (path === '/vault/parent.md') return parentFile;
            if (path === '/vault/child.md') return childFile;
            return null;
        });

        // Mock getFromLink to return a classe with the parent file
        (mockVault.getFromLink as jest.Mock).mockImplementation(async (link: string) => {
            // Extract file name from link (remove [[ and ]])
            const fileName = link.replace(/\[\[|\]\]/g, '');
            if (fileName === 'parent') {
                const parentClasse = new TestableClasse(mockVault);
                parentClasse.setFile(parentFile as unknown as File);
                return parentClasse;
            }
            if (fileName === 'child') {
                const childClasseRef = new TestableClasse(mockVault);
                childClasseRef.setFile(childFile as unknown as File);
                return childClasseRef;
            }
            return null;
        });
    });

    describe('getParentProperty', () => {
        it('should return the parent property when configured', () => {
            const property = childClasse.testGetParentProperty();
            expect(property).toBe(parentProperty);
            expect(property?.name).toBe('parent');
        });

        it('should return undefined when no parent property configured', () => {
            TestableClasse.parentPropertyName = undefined;
            const property = childClasse.testGetParentProperty();
            expect(property).toBeUndefined();
        });

        it('should return undefined when parent property does not exist', () => {
            TestableClasse.parentPropertyName = 'nonExistentProperty';
            const property = childClasse.testGetParentProperty();
            expect(property).toBeUndefined();
        });
    });

    describe('getParentFile', () => {
        it('should return parent file from FileProperty', async () => {
            mockApp.getMetadata.mockResolvedValue({
                parent: '[[parent]]'
            });
            mockApp.getAbstractFileByPath.mockReturnValue(parentFile);

            const parent = await childClasse.testGetParentFile();
            expect(parent?.['file']).toBe(parentFile); // Compare inner file object
        });

        it('should return undefined when no parent property configured', async () => {
            TestableClasse.parentPropertyName = undefined;
            const parent = await childClasse.testGetParentFile();
            expect(parent).toBeUndefined();
        });

        it('should return undefined when parent property has no value', async () => {
            mockApp.getMetadata.mockResolvedValue({
                parent: null
            });

            const parent = await childClasse.testGetParentFile();
            expect(parent).toBeUndefined();
        });

        it('should return parent file from ObjectProperty', async () => {
            // Replace FileProperty with ObjectProperty
            childClasse = new TestableClasse(mockVault);
            childClasse.setFile(childFile as unknown as File);
            
            const fileProperty = new FileProperty('link', mockVault, [], {});
            const objectProperty = new ObjectProperty('parent', mockVault, { link: fileProperty }, {});
            childClasse.addProperty(objectProperty);

            mockApp.getMetadata.mockResolvedValue({
                parent: [{ link: '[[parent]]' }]
            });
            mockApp.getAbstractFileByPath.mockReturnValue(parentFile);

            const parent = await childClasse.testGetParentFile();
            expect(parent?.['file']).toBe(parentFile); // Compare inner file object
        });

        it('should return parent file from MultiFileProperty', async () => {
            // Replace FileProperty with MultiFileProperty
            childClasse = new TestableClasse(mockVault);
            childClasse.setFile(childFile as unknown as File);
            
            const multiFileProperty = new MultiFileProperty('parent', mockVault, [], {});
            childClasse.addProperty(multiFileProperty);

            mockApp.getMetadata.mockResolvedValue({
                parent: ['[[parent]]']
            });
            mockApp.getAbstractFileByPath.mockReturnValue(parentFile);

            const parent = await childClasse.testGetParentFile();
            expect(parent?.['file']).toBe(parentFile); // Compare inner file object
        });
    });

    describe('updateParentFolder', () => {
        beforeEach(() => {
            mockApp.getMetadata.mockResolvedValue({
                parent: '[[parent]]'
            });
        });

        it('should create parent folder and move files when parent folder does not exist', async () => {
            mockApp.getFile.mockResolvedValue(null); // Folder doesn't exist

            await childClasse.testUpdateParentFolder();

            // Should create parent folder
            expect(mockApp.createFolder).toHaveBeenCalledWith('/vault/parent');

            // Should move parent file into its folder
            expect(parentFile.path).toBe('/vault/parent/parent.md');

            // Should move child file into parent folder
            expect(childFile.path).toBe('/vault/parent/child.md');
        });

        it('should only move child when parent folder already exists', async () => {
            // Parent folder exists
            parentFile.path = '/vault/parent/parent.md';
            parentFile.parent = { path: '/vault/parent' };
            
            // Mock getFile calls in order:
            // 1. File.move checks if target file exists (should be null to allow move)
            // 2. updateParentFolder reloads the moved file
            mockApp.getFile
                .mockResolvedValueOnce(null)         // Target doesn't exist (allows move)
                .mockResolvedValueOnce(childFile);   // Reload moved file

            const originalParentPath = parentFile.path;
            await childClasse.testUpdateParentFolder();

            // Should NOT create folder (already exists)
            expect(mockApp.createFolder).not.toHaveBeenCalled();

            // Parent should stay in place
            expect(parentFile.path).toBe(originalParentPath);

            // Check that renameFile was called
            expect(mockApp.renameFile).toHaveBeenCalledWith(childFile, '/vault/parent/child.md');
            
            // Check childFile was actually updated by renameFile mock
            expect(childFile.path).toBe('/vault/parent/child.md');

            // Should move child file into parent folder (check internal file)
            const internalChildFile = childClasse.getFile()?.['file'];
            expect(internalChildFile.path).toBe('/vault/parent/child.md');
        });

        it('should not do anything when child already in parent folder', async () => {
            // Setup: child already in correct location
            parentFile.path = '/vault/parent/parent.md';
            parentFile.parent = { path: '/vault/parent' };
            childFile.path = '/vault/parent/child.md';
            childFile.parent = { path: '/vault/parent' };
            
            const mockFolder = { path: '/vault/parent' };
            mockApp.getFile.mockResolvedValue(mockFolder); // Folder exists

            const parentMoveSpy = jest.spyOn(parentFile, 'move');
            const childMoveSpy = jest.spyOn(childFile, 'move');

            await childClasse.testUpdateParentFolder();

            // No moves should occur
            expect(parentMoveSpy).not.toHaveBeenCalled();
            expect(childMoveSpy).not.toHaveBeenCalled();
            expect(mockApp.createFolder).not.toHaveBeenCalled();
        });

        it('should handle missing parent file gracefully', async () => {
            (mockVault.getFromLink as jest.Mock).mockResolvedValue(null);

            await expect(childClasse.testUpdateParentFolder()).resolves.not.toThrow();
            expect(mockApp.createFolder).not.toHaveBeenCalled();
        });

        it('should handle no parent property gracefully', async () => {
            TestableClasse.parentPropertyName = undefined;

            await expect(childClasse.testUpdateParentFolder()).resolves.not.toThrow();
            expect(mockApp.createFolder).not.toHaveBeenCalled();
        });

        it('should handle no file set gracefully', async () => {
            const classeWithoutFile = new TestableClasse(mockVault);
            TestableClasse.parentPropertyName = 'parent';

            await expect(classeWithoutFile.testUpdateParentFolder()).resolves.not.toThrow();
            expect(mockApp.createFolder).not.toHaveBeenCalled();
        });
    });

    describe('updatePropertyValue', () => {
        it('should update metadata and trigger parent folder update', async () => {
            mockApp.getMetadata.mockResolvedValue({ parent: '[[parent]]' });
            mockApp.getFile.mockResolvedValue(null); // Folder doesn't exist

            await childClasse.updatePropertyValue('parent', '[[parent]]');

            // Should update metadata via app.writeFile (not spy on MockFile anymore)
            expect(mockApp.writeFile).toHaveBeenCalled();

            // Should trigger parent folder update (verify by checking createFolder was called)
            expect(mockApp.createFolder).toHaveBeenCalledWith('/vault/parent');
        });

        it('should update metadata but not trigger parent folder update for other properties', async () => {
            mockApp.getMetadata.mockResolvedValue({});

            const updateParentFolderSpy = jest.spyOn(childClasse, 'testUpdateParentFolder');

            await childClasse.updatePropertyValue('otherProperty', 'someValue');

            // Should update metadata via app.writeFile
            expect(mockApp.writeFile).toHaveBeenCalled();

            // Should NOT trigger parent folder update
            expect(updateParentFolderSpy).not.toHaveBeenCalled();
        });

        it('should handle no file gracefully', async () => {
            const classeWithoutFile = new TestableClasse(mockVault);
            await expect(classeWithoutFile.updatePropertyValue('prop', 'value')).resolves.not.toThrow();
            expect(childFile.updateMetadataSpy).not.toHaveBeenCalled();
        });
    });

    describe('setFile with parent property', () => {
        it('should trigger parent folder update when parent property is set', async () => {
            const newClasse = new TestableClasse(mockVault);
            TestableClasse.parentPropertyName = 'parent';
            
            const newFile = new MockFile('newchild.md', '/vault/newchild.md', 'newchild');
            const testParentFile = new MockFile('parent.md', '/vault/parent.md', 'parent');
            
            // Add parent property and set file
            const prop = new FileProperty('parent', mockVault, [], {});
            newClasse.addProperty(prop);
            newClasse.setFile(newFile as unknown as File);
            
            mockApp.getMetadata.mockResolvedValue({
                parent: '[[parent]]'
            });
            mockApp.getFile.mockResolvedValue(null);
            mockApp.getAbstractFileByPath.mockReturnValue(testParentFile);

            // Mock getFromLink for this test
            (mockVault.getFromLink as jest.Mock).mockImplementation(async (link: string) => {
                const fileName = link.replace(/\[\[|\]\]/g, '');
                if (fileName === 'parent') {
                    const parentClasse = new TestableClasse(mockVault);
                    parentClasse.setFile(testParentFile as unknown as File);
                    return parentClasse;
                }
                return null;
            });

            // Update parent property - this should trigger updateParentFolder
            await newClasse.updatePropertyValue('parent', '[[parent]]');

            // Give async operation time to complete
            await new Promise(resolve => setTimeout(resolve, 50));

            // Should trigger parent folder update (verify by checking createFolder was called)
            expect(mockApp.createFolder).toHaveBeenCalledWith('/vault/parent');
        });

        it('should not trigger parent folder update when no parent property configured', async () => {
            const newClasse = new TestableClasse(mockVault);
            TestableClasse.parentPropertyName = undefined;
            
            const newFile = new MockFile('newchild.md', '/vault/newchild.md', 'newchild');
            
            const updateParentFolderSpy = jest.spyOn(newClasse, 'testUpdateParentFolder');

            newClasse.setFile(newFile as unknown as File);

            // Give async operation time to complete
            await new Promise(resolve => setTimeout(resolve, 10));

            // Should NOT trigger parent folder update
            expect(updateParentFolderSpy).not.toHaveBeenCalled();
        });
    });

    describe('Integration: Complete parent-child workflow', () => {
        it('should organize child into parent folder on initial setup', async () => {
            // Create a fresh child classe
            const newChild = new TestableClasse(mockVault);
            TestableClasse.parentPropertyName = 'parent';
            
            const newChildFile = new MockFile('task.md', '/vault/task.md', 'task', 'md', { path: '/vault' });
            const newParentFile = new MockFile('project.md', '/vault/project.md', 'project', 'md', { path: '/vault' });
            
            // Setup mocks
            mockApp.getMetadata.mockResolvedValue({
                parent: '[[project]]'
            });
            mockApp.fileExists.mockResolvedValue(false);
            mockApp.getAbstractFileByPath.mockImplementation((path: string) => {
                if (path.includes('project')) return newParentFile;
                return null;
            });

            // Mock getFromLink for this test
            (mockVault.getFromLink as jest.Mock).mockImplementation(async (link: string) => {
                const fileName = link.replace(/\[\[|\]\]/g, '');
                if (fileName === 'project') {
                    const projectClasse = new TestableClasse(mockVault);
                    projectClasse.setFile(newParentFile as unknown as File);
                    return projectClasse;
                }
                return null;
            });

            // Add parent property
            const prop = new FileProperty('parent', mockVault, [], {});
            newChild.addProperty(prop);

            // Set file (should trigger organization)
            newChild.setFile(newChildFile as unknown as File);
            
            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 10));

            // Manually trigger update for test
            await newChild.testUpdateParentFolder();

            // Verify folder structure created
            expect(mockApp.createFolder).toHaveBeenCalledWith('/vault/project');
            expect(newParentFile.path).toBe('/vault/project/project.md');
            expect(newChildFile.path).toBe('/vault/project/task.md');
        });

        it('should reorganize child when parent property changes', async () => {
            // Initial setup: child under parent1
            const childFile = new MockFile('task.md', '/vault/parent1/task.md', 'task', 'md', { path: '/vault/parent1' });
            const parent1File = new MockFile('parent1.md', '/vault/parent1/parent1.md', 'parent1', 'md', { path: '/vault/parent1' });
            const parent2File = new MockFile('parent2.md', '/vault/parent2/parent2.md', 'parent2', 'md', { path: '/vault/parent2' });

            const child = new TestableClasse(mockVault);
            TestableClasse.parentPropertyName = 'parent';
            child.setFile(childFile as unknown as File);
            
            const prop = new FileProperty('parent', mockVault, [], {});
            child.addProperty(prop);

            // Mock: initially points to parent1
            mockApp.getMetadata.mockResolvedValue({
                parent: '[[parent1]]'
            });
            mockApp.fileExists.mockResolvedValue(true);
            mockApp.getAbstractFileByPath.mockImplementation((path: string) => {
                if (path.includes('parent1')) return parent1File;
                if (path.includes('parent2')) return parent2File;
                return null;
            });

            // Mock getFromLink for parent switching
            (mockVault.getFromLink as jest.Mock).mockImplementation(async (link: string) => {
                const fileName = link.replace(/\[\[|\]\]/g, '');
                if (fileName === 'parent1') {
                    const p1Classe = new TestableClasse(mockVault);
                    p1Classe.setFile(parent1File as unknown as File);
                    return p1Classe;
                }
                if (fileName === 'parent2') {
                    const p2Classe = new TestableClasse(mockVault);
                    p2Classe.setFile(parent2File as unknown as File);
                    return p2Classe;
                }
                return null;
            });

            // Change parent to parent2
            mockApp.getMetadata.mockResolvedValue({
                parent: '[[parent2]]'
            });

            await child.updatePropertyValue('parent', '[[parent2]]');

            // Should move to new parent folder
            expect(childFile.path).toBe('/vault/parent2/task.md');
        });
    });

    describe('Edge cases', () => {
        it('should handle circular parent references', async () => {
            // This is a scenario where parent points to child (circular)
            mockApp.getMetadata.mockResolvedValue({
                parent: '[[child]]'
            });
            mockApp.getAbstractFileByPath.mockImplementation((path: string) => {
                if (path.includes('child')) return childFile;
                return null;
            });

            // Should not throw error
            await expect(childClasse.testUpdateParentFolder()).resolves.not.toThrow();
        });

        it('should handle parent file in subdirectory', async () => {
            const deepParentFile = new MockFile(
                'parent.md',
                '/vault/projects/archive/parent.md',
                'parent',
                'md',
                { path: '/vault/projects/archive' }
            );

            mockApp.getMetadata.mockResolvedValue({
                parent: '[[parent]]'
            });
            mockApp.getFile.mockResolvedValue(null);
            mockApp.getAbstractFileByPath.mockReturnValue(deepParentFile);

            // Mock getFromLink for deep parent
            (mockVault.getFromLink as jest.Mock).mockImplementation(async (link: string) => {
                const fileName = link.replace(/\[\[|\]\]/g, '');
                if (fileName === 'parent') {
                    const parentClasse = new TestableClasse(mockVault);
                    parentClasse.setFile(deepParentFile as unknown as File);
                    return parentClasse;
                }
                return null;
            });

            await childClasse.testUpdateParentFolder();

            // Should create folder at parent location
            expect(mockApp.createFolder).toHaveBeenCalledWith('/vault/projects/archive/parent');
            expect(deepParentFile.path).toBe('/vault/projects/archive/parent/parent.md');
            expect(childFile.path).toBe('/vault/projects/archive/parent/child.md');
        });

        it('should handle special characters in parent name', async () => {
            const specialParentFile = new MockFile(
                'parent (special).md',
                '/vault/parent (special).md',
                'parent (special)',
                'md',
                { path: '/vault' }
            );

            mockApp.getMetadata.mockResolvedValue({
                parent: '[[parent (special)]]'
            });
            mockApp.getFile.mockResolvedValue(null);
            mockApp.getAbstractFileByPath.mockReturnValue(specialParentFile);

            // Mock getFromLink for special char parent
            (mockVault.getFromLink as jest.Mock).mockImplementation(async (link: string) => {
                const fileName = link.replace(/\[\[|\]\]/g, '');
                if (fileName === 'parent (special)') {
                    const parentClasse = new TestableClasse(mockVault);
                    parentClasse.setFile(specialParentFile as unknown as File);
                    return parentClasse;
                }
                return null;
            });

            await childClasse.testUpdateParentFolder();

            expect(mockApp.createFolder).toHaveBeenCalledWith('/vault/parent (special)');
        });
    });

    describe('updateParentFolder with children recursion', () => {
        let grandChildFile: MockFile;
        let greatGrandChildFile: MockFile;

        beforeEach(() => {
            // Setup parent, child, and grandchild hierarchy
            parentFile = new MockFile(
                'parent.md',
                '/vault/parent.md',
                'parent',
                'md',
                { path: '/vault' }
            );

            childFile = new MockFile(
                'child.md',
                '/vault/child.md',
                'child',
                'md',
                { path: '/vault' }
            );

            grandChildFile = new MockFile(
                'grandchild.md',
                '/vault/grandchild.md',
                'grandchild',
                'md',
                { path: '/vault' }
            );

            greatGrandChildFile = new MockFile(
                'greatgrandchild.md',
                '/vault/greatgrandchild.md',
                'greatgrandchild',
                'md',
                { path: '/vault' }
            );

            childClasse = new TestableClasse(mockVault);
            childClasse.setFile(childFile as unknown as File);
            childClasse.addProperty(parentProperty);

            // Mock default responses
            mockApp.getMetadata.mockResolvedValue({});
            mockApp.fileExists.mockResolvedValue(true);
            mockApp.getFile.mockResolvedValue(null);
            mockApp.listFiles.mockResolvedValue([]);
            
            // Set parent property name
            TestableClasse.parentPropertyName = 'parent';
        });

        it('should move parent with its children when parent is moved', async () => {
            // Setup: child has grandchild
            mockApp.getMetadata.mockImplementation((file: any) => {
                if (file.path === '/vault/child.md') {
                    return Promise.resolve({ parent: '[[parent]]' });
                }
                if (file.path === '/vault/grandchild.md') {
                    return Promise.resolve({ parent: '[[child]]' });
                }
                return Promise.resolve({});
            });

            // Mock listFiles to return all files
            mockApp.listFiles.mockResolvedValue([
                parentFile,
                childFile,
                grandChildFile
            ]);

            // Mock getAbstractFileByPath
            mockApp.getAbstractFileByPath.mockImplementation((path: string) => {
                if (path === '/vault/parent.md') return parentFile;
                if (path === '/vault/child.md') return childFile;
                if (path === '/vault/grandchild.md') return grandChildFile;
                return null;
            });

            // Mock getFromLink for parent and child
            (mockVault.getFromLink as jest.Mock).mockImplementation(async (link: string) => {
                const fileName = link.replace(/\[\[|\]\]/g, '');
                if (fileName === 'parent') {
                    const parentClasse = new TestableClasse(mockVault);
                    parentClasse.setFile(parentFile as unknown as File);
                    return parentClasse;
                }
                if (fileName === 'child') {
                    const childClasseInstance = new TestableClasse(mockVault);
                    childClasseInstance.setFile(childFile as unknown as File);
                    return childClasseInstance;
                }
                return null;
            });

            // Mock createClasse for findChildren
            (mockVault.createClasse as jest.Mock).mockImplementation(async (file: any) => {
                const classe = new TestableClasse(mockVault);
                // Add FileProperty 'parent' to all classes for findChildren to work
                const parentProp = new FileProperty('parent', mockVault, []);
                classe.addProperty(parentProp);
                classe.setFile(file as unknown as File);
                return classe;
            });

            // Mock getFile for folder checks and file reloads
            mockApp.getFile.mockResolvedValue(null);

            await childClasse.testUpdateParentFolder();

            // Parent should be moved to its dedicated folder
            expect(parentFile.path).toBe('/vault/parent/parent.md');
            
            // Child has a grandchild, so it should be in its own subfolder
            expect(childFile.path).toBe('/vault/parent/child/child.md');
            
            // Grandchild should be moved with child into child's folder
            expect(grandChildFile.path).toBe('/vault/parent/child/grandchild.md');
        });

        it('should handle multi-level hierarchy (3 generations)', async () => {
            // Setup: parent -> child -> grandchild -> greatgrandchild
            mockApp.getMetadata.mockImplementation((file: any) => {
                // Use basename instead of full path to handle file moves
                const basename = file.basename || file.path.split('/').pop()?.replace('.md', '');
                
                if (basename === 'child') {
                    return Promise.resolve({ parent: '[[parent]]' });
                }
                if (basename === 'grandchild') {
                    return Promise.resolve({ parent: '[[child]]' });
                }
                if (basename === 'greatgrandchild') {
                    return Promise.resolve({ parent: '[[grandchild]]' });
                }
                return Promise.resolve({});
            });

            mockApp.listFiles.mockResolvedValue([
                parentFile,
                childFile,
                grandChildFile,
                greatGrandChildFile
            ]);

            mockApp.getAbstractFileByPath.mockImplementation((path: string) => {
                if (path === '/vault/parent.md') return parentFile;
                if (path === '/vault/child.md') return childFile;
                if (path === '/vault/grandchild.md') return grandChildFile;
                if (path === '/vault/greatgrandchild.md') return greatGrandChildFile;
                return null;
            });

            (mockVault.getFromLink as jest.Mock).mockImplementation(async (link: string) => {
                const fileName = link.replace(/\[\[|\]\]/g, '');
                if (fileName === 'parent') {
                    const parentClasse = new TestableClasse(mockVault);
                    parentClasse.setFile(parentFile as unknown as File);
                    return parentClasse;
                }
                if (fileName === 'child') {
                    const childClasseInstance = new TestableClasse(mockVault);
                    childClasseInstance.setFile(childFile as unknown as File);
                    return childClasseInstance;
                }
                if (fileName === 'grandchild') {
                    const grandChildClasse = new TestableClasse(mockVault);
                    grandChildClasse.setFile(grandChildFile as unknown as File);
                    return grandChildClasse;
                }
                return null;
            });

            // Mock createClasse for findChildren
            (mockVault.createClasse as jest.Mock).mockImplementation(async (file: any) => {
                const classe = new TestableClasse(mockVault);
                // Add FileProperty 'parent' to all classes for findChildren to work
                const parentProp = new FileProperty('parent', mockVault, []);
                classe.addProperty(parentProp);
                classe.setFile(file as unknown as File);
                return classe;
            });

            mockApp.getFile.mockImplementation(async (path: string) => {
                if (path === parentFile.path) return parentFile;
                if (path === childFile.path) return childFile;
                if (path === grandChildFile.path) return grandChildFile;
                if (path === greatGrandChildFile.path) return greatGrandChildFile;
                return null;
            });

            await childClasse.testUpdateParentFolder();

            // All files should be in hierarchical folder structure
            expect(parentFile.path).toBe('/vault/parent/parent.md');
            // Child has grandchild, so needs its own folder
            expect(childFile.path).toBe('/vault/parent/child/child.md');
            // Grandchild has greatgrandchild, so it also needs its own folder
            expect(grandChildFile.path).toBe('/vault/parent/child/grandchild/grandchild.md');
            // Greatgrandchild is in grandchild's folder
            expect(greatGrandChildFile.path).toBe('/vault/parent/child/grandchild/greatgrandchild.md');
        });

        it('should move children only when parent is already in dedicated folder', async () => {
            // Parent already in its folder
            parentFile.path = '/vault/parent/parent.md';
            parentFile.parent = { path: '/vault/parent' };

            mockApp.getMetadata.mockImplementation((file: any) => {
                if (file.path === '/vault/child.md') {
                    return Promise.resolve({ parent: '[[parent]]' });
                }
                if (file.path === '/vault/grandchild.md') {
                    return Promise.resolve({ parent: '[[child]]' });
                }
                return Promise.resolve({});
            });

            mockApp.listFiles.mockResolvedValue([
                parentFile,
                childFile,
                grandChildFile
            ]);

            mockApp.getAbstractFileByPath.mockImplementation((path: string) => {
                if (path === '/vault/parent/parent.md') return parentFile;
                if (path === '/vault/child.md') return childFile;
                if (path === '/vault/grandchild.md') return grandChildFile;
                return null;
            });

            (mockVault.getFromLink as jest.Mock).mockImplementation(async (link: string) => {
                const fileName = link.replace(/\[\[|\]\]/g, '');
                if (fileName === 'parent') {
                    const parentClasse = new TestableClasse(mockVault);
                    parentClasse.setFile(parentFile as unknown as File);
                    return parentClasse;
                }
                if (fileName === 'child') {
                    const childClasseInstance = new TestableClasse(mockVault);
                    childClasseInstance.setFile(childFile as unknown as File);
                    return childClasseInstance;
                }
                return null;
            });

            // Mock createClasse for findChildren
            (mockVault.createClasse as jest.Mock).mockImplementation(async (file: any) => {
                const classe = new TestableClasse(mockVault);
                // Add FileProperty 'parent' to all classes for findChildren to work
                const parentProp = new FileProperty('parent', mockVault, []);
                classe.addProperty(parentProp);
                classe.setFile(file as unknown as File);
                return classe;
            });

            // Mock for file existence checks and reloads
            mockApp.getFile.mockImplementation(async (path: string) => {
                // Return the file object after it's been moved/renamed
                if (path === childFile.path) return childFile;
                if (path === grandChildFile.path) return grandChildFile;
                // For folder existence checks, return null (folder doesn't exist yet)
                return null;
            });

            await childClasse.testUpdateParentFolder();

            // Parent should stay in place
            expect(parentFile.path).toBe('/vault/parent/parent.md');
            
            // Child has grandchild, so should be in its own subfolder
            expect(childFile.path).toBe('/vault/parent/child/child.md');
            // Grandchild has no children, stays in child's folder
            expect(grandChildFile.path).toBe('/vault/parent/child/grandchild.md');
        });

        it('should not move children that are already in the correct location', async () => {
            // All files already in correct hierarchical location
            parentFile.path = '/vault/parent/parent.md';
            parentFile.parent = { path: '/vault/parent' };
            // Child has grandchild, so it's in its own folder
            childFile.path = '/vault/parent/child/child.md';
            childFile.parent = { path: '/vault/parent/child' };
            // Grandchild has no children, stays in child's folder
            grandChildFile.path = '/vault/parent/child/grandchild.md';
            grandChildFile.parent = { path: '/vault/parent/child' };

            mockApp.getMetadata.mockImplementation((file: any) => {
                if (file.path === '/vault/parent/child/child.md') {
                    return Promise.resolve({ parent: '[[parent]]' });
                }
                if (file.path === '/vault/parent/child/grandchild.md') {
                    return Promise.resolve({ parent: '[[child]]' });
                }
                return Promise.resolve({});
            });

            mockApp.listFiles.mockResolvedValue([
                parentFile,
                childFile,
                grandChildFile
            ]);

            mockApp.getAbstractFileByPath.mockImplementation((path: string) => {
                if (path === '/vault/parent/parent.md') return parentFile;
                if (path === '/vault/parent/child/child.md') return childFile;
                if (path === '/vault/parent/child/grandchild.md') return grandChildFile;
                return null;
            });

            (mockVault.getFromLink as jest.Mock).mockImplementation(async (link: string) => {
                const fileName = link.replace(/\[\[|\]\]/g, '');
                if (fileName === 'parent') {
                    const parentClasse = new TestableClasse(mockVault);
                    parentClasse.setFile(parentFile as unknown as File);
                    return parentClasse;
                }
                if (fileName === 'child') {
                    const childClasseInstance = new TestableClasse(mockVault);
                    childClasseInstance.setFile(childFile as unknown as File);
                    return childClasseInstance;
                }
                return null;
            });

            // Mock createClasse for findChildren
            (mockVault.createClasse as jest.Mock).mockImplementation(async (file: any) => {
                const classe = new TestableClasse(mockVault);
                // Add FileProperty 'parent' to all classes for findChildren to work
                const parentProp = new FileProperty('parent', mockVault, []);
                classe.addProperty(parentProp);
                classe.setFile(file as unknown as File);
                return classe;
            });

            mockApp.getFile.mockResolvedValue(null);

            await childClasse.testUpdateParentFolder();

            // renameFile should not be called since everything is already in place
            expect(mockApp.renameFile).not.toHaveBeenCalled();
        });

        it('should move folder file and its children when parent changes', async () => {
            // Scenario: Thomas Martin.md is in "Université Paris Tech/Thomas Martin/" folder
            // It has a child "Site Web.md" in the same folder
            // When we change parent to "TechCorp Solutions", both files should move to "TechCorp Solutions/Thomas Martin/"
            
            const universiteFolderFile = {
                name: 'Université Paris Tech.md',
                basename: 'Université Paris Tech',
                path: '/vault/Institutions/Université Paris Tech/Université Paris Tech.md',
                extension: 'md'
            };

            const thomasMartinFile = {
                name: 'Thomas Martin.md',
                basename: 'Thomas Martin',
                path: '/vault/Institutions/Université Paris Tech/Thomas Martin/Thomas Martin.md',
                extension: 'md'
            };

            const siteWebFile = {
                name: 'Site Web.md',
                basename: 'Site Web',
                path: '/vault/Institutions/Université Paris Tech/Thomas Martin/Site Web.md',
                extension: 'md'
            };

            const techCorpFile = {
                name: 'TechCorp Solutions.md',
                basename: 'TechCorp Solutions',
                path: '/vault/Institutions/TechCorp Solutions/TechCorp Solutions.md',
                extension: 'md'
            };

            // Thomas Martin has TechCorp as parent (we're changing from Université to TechCorp)
            mockApp.getMetadata.mockImplementation((file: any) => {
                if (file.path === thomasMartinFile.path) {
                    return Promise.resolve({ parent: '[[TechCorp Solutions]]' });
                }
                if (file.path === siteWebFile.path) {
                    return Promise.resolve({ parent: '[[Thomas Martin]]' });
                }
                return Promise.resolve({});
            });

            // listFiles returns all files in the vault
            mockApp.listFiles.mockResolvedValue([
                universiteFolderFile,
                techCorpFile,
                thomasMartinFile,
                siteWebFile
            ]);

            // getAbstractFileByPath returns files by path
            mockApp.getAbstractFileByPath.mockImplementation((path: string) => {
                if (path === thomasMartinFile.path) return thomasMartinFile;
                if (path === siteWebFile.path) return siteWebFile;
                if (path === techCorpFile.path) return techCorpFile;
                return null;
            });

            // getFromLink resolves parent
            (mockVault.getFromLink as jest.Mock).mockImplementation(async (link: string) => {
                const fileName = link.replace(/\[\[|\]\]/g, '');
                if (fileName === 'TechCorp Solutions') {
                    const techCorpClasse = new TestableClasse(mockVault);
                    techCorpClasse.setFile(techCorpFile as unknown as File);
                    return techCorpClasse;
                }
                if (fileName === 'Thomas Martin') {
                    const thomasClasse = new TestableClasse(mockVault);
                    thomasClasse.setFile(thomasMartinFile as unknown as File);
                    return thomasClasse;
                }
                return null;
            });

            // createClasse for findChildren
            (mockVault.createClasse as jest.Mock).mockImplementation(async (file: any) => {
                const classe = new TestableClasse(mockVault);
                classe.setFile(file as unknown as File);
                const parentProp = new FileProperty('parent', mockVault, []);
                classe.addProperty(parentProp);
                return classe;
            });

            // getFile returns null for non-existent paths, files for reload after move
            mockApp.getFile.mockImplementation(async (path: string) => {
                // Return files after they've been moved
                if (path === thomasMartinFile.path) return thomasMartinFile;
                if (path === siteWebFile.path) return siteWebFile;
                // TechCorp already has its folder
                if (path === '/vault/Institutions/TechCorp Solutions') {
                    return { path: '/vault/Institutions/TechCorp Solutions' };
                }
                // For folder existence checks, return null
                return null;
            });

            // Create Thomas Martin classe
            const thomasClasse = new TestableClasse(mockVault);
            
            // Configure parent property
            TestableClasse.parentPropertyName = 'parent';
            const parentProperty = new FileProperty('parent', mockVault, ['Institution']);
            thomasClasse.addProperty(parentProperty);
            
            thomasClasse.setFile(thomasMartinFile as unknown as File);

            // Trigger parent folder update
            await thomasClasse.testUpdateParentFolder();

            // Verify Thomas Martin.md was moved to TechCorp Solutions/Thomas Martin/
            const thomasMoveCalls = (mockApp.renameFile as jest.Mock).mock.calls.filter(
                call => call[0].path === thomasMartinFile.path
            );
            expect(thomasMoveCalls.length).toBeGreaterThan(0);
            expect(thomasMoveCalls[0][1]).toBe('/vault/Institutions/TechCorp Solutions/Thomas Martin/Thomas Martin.md');

            // Verify Site Web.md was also moved to TechCorp Solutions/Thomas Martin/
            const siteWebMoveCalls = (mockApp.renameFile as jest.Mock).mock.calls.filter(
                call => call[0].path === siteWebFile.path
            );
            expect(siteWebMoveCalls.length).toBeGreaterThan(0);
            expect(siteWebMoveCalls[0][1]).toBe('/vault/Institutions/TechCorp Solutions/Thomas Martin/Site Web.md');
        });

        it('should only consider FileProperty types as parent references, not other link properties', async () => {
            // Setup parent file
            const parentFile = {
                name: 'John Doe.md',
                path: '/vault/Contacts/John Doe.md',
                basename: 'John Doe',
                extension: 'md',
                getFolderPath: () => '/vault/Contacts',
                getName: (withExt = true) => withExt ? 'John Doe.md' : 'John Doe',
                getPath: () => '/vault/Contacts/John Doe.md',
            };

            // Setup child file with BOTH a FileProperty parent AND a non-FileProperty link
            const childFile = {
                name: 'Project Alpha.md',
                path: '/vault/Projects/Project Alpha.md',
                basename: 'Project Alpha',
                extension: 'md',
                getFolderPath: () => '/vault/Projects',
                getName: (withExt = true) => withExt ? 'Project Alpha.md' : 'Project Alpha',
                getPath: () => '/vault/Projects/Project Alpha.md',
            };

            // Setup another file that references parent in a non-FileProperty field
            const otherFile = {
                name: 'Meeting Notes.md',
                path: '/vault/Notes/Meeting Notes.md',
                basename: 'Meeting Notes',
                extension: 'md',
                getFolderPath: () => '/vault/Notes',
                getName: (withExt = true) => withExt ? 'Meeting Notes.md' : 'Meeting Notes',
                getPath: () => '/vault/Notes/Meeting Notes.md',
            };

            mockApp.listFiles.mockResolvedValue([parentFile, childFile, otherFile]);

            // Parent has no parent property
            mockApp.getMetadata.mockImplementation(async (file: any) => {
                if (file.path === parentFile.path) {
                    return { name: 'John Doe' };
                }
                // Child has a FileProperty 'responsible' pointing to parent
                if (file.path === childFile.path) {
                    return {
                        name: 'Project Alpha',
                        responsible: '[[John Doe]]', // FileProperty
                        description: 'Project managed by [[John Doe]]', // TextProperty with link - should NOT count
                    };
                }
                // Other file has only non-FileProperty references
                if (file.path === otherFile.path) {
                    return {
                        name: 'Meeting Notes',
                        attendees: '[[John Doe]]', // MultiSelectProperty or TextProperty - NOT a FileProperty
                        description: 'Met with [[John Doe]]', // TextProperty - should NOT count
                    };
                }
                return {};
            });

            // Mock createClasse to return proper instances
            (mockVault.createClasse as jest.Mock).mockImplementation(async (file: any) => {
                const classe = new TestableClasse(mockVault);
                
                if (file.path === childFile.path) {
                    // Child has a FileProperty 'responsible'
                    const responsibleProp = new FileProperty('responsible', mockVault, ['Contact']);
                    classe.addProperty(responsibleProp);
                    
                    // And a TextProperty 'description' (which also contains a link but is NOT a FileProperty)
                    const descriptionProp = new TextProperty('description', mockVault);
                    classe.addProperty(descriptionProp);
                } else if (file.path === otherFile.path) {
                    // Other file has only TextProperty (no FileProperty)
                    const attendeesProp = new TextProperty('attendees', mockVault);
                    classe.addProperty(attendeesProp);
                    
                    const descriptionProp = new TextProperty('description', mockVault);
                    classe.addProperty(descriptionProp);
                }
                
                classe.setFile(file as unknown as File);
                return classe;
            });

            // Create parent classe
            const parentClasse = new TestableClasse(mockVault);
            parentClasse.setFile(parentFile as unknown as File);

            // Find children
            const children = await parentClasse.testFindChildren();

            // Should only find childFile (via FileProperty 'responsible')
            // Should NOT find otherFile (only has TextProperty references)
            expect(children.length).toBe(1);
            expect(children[0].getFile()?.getPath()).toBe(childFile.path);
        });
    });
});
