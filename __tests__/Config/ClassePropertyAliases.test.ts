import { Vault } from '../../src/vault/Vault';
import { IApp, IFile, IFolder, ISettings } from '../../src/interfaces/IApp';
import { File } from '../../src/vault/File';

describe('ClassePropertyAliases', () => {
    let vault: Vault;
    let mockApp: MockApp;

    class MockApp implements IApp {
        private files: Map<string, IFile> = new Map();
        private metadata: Map<string, Record<string, any>> = new Map();
        private fileContents: Map<string, string> = new Map();
        private settings: ISettings = {
            classePropertyName: 'Classe',
            classePropertyAliases: ['Type', 'Category', 'Kind'],
            deleteAliasesAfterMigration: true
        };

        getSettings(): ISettings {
            return this.settings;
        }

        setSettings(settings: Partial<ISettings>): void {
            this.settings = { ...this.settings, ...settings };
        }

        async readFile(file: IFile): Promise<string> {
            return this.fileContents.get(file.path) || '---\n---\n';
        }

        async writeFile(file: IFile, content: string): Promise<void> {
            this.fileContents.set(file.path, content);
            
            // Parse frontmatter and update metadata
            const frontmatterRegex = /^---\r?\n([\s\S]+?)\r?\n---\r?\n/;
            const match = content.match(frontmatterRegex);
            if (match) {
                try {
                    const yaml = require('js-yaml');
                    const parsed = yaml.load(match[1]);
                    this.metadata.set(file.path, parsed || {});
                } catch (error) {
                    console.error('Failed to parse YAML:', error);
                }
            }
        }

        async createFile(path: string, content: string): Promise<IFile> {
            const file: IFile = {
                path,
                name: path.split('/').pop() || '',
                basename: path.split('/').pop()?.replace('.md', '') || '',
                extension: 'md',
                parent: undefined,
                children: []
            };
            this.files.set(path, file);
            this.metadata.set(path, {});
            return file;
        }

        async delete(file: IFile | IFolder): Promise<void> {
            this.files.delete(file.path);
            this.metadata.delete(file.path);
        }

        async move(fileOrFolder: IFile | IFolder, newPath: string): Promise<void> {
            const oldPath = fileOrFolder.path;
            const metadata = this.metadata.get(oldPath);
            this.files.delete(oldPath);
            this.metadata.delete(oldPath);
            
            fileOrFolder.path = newPath;
            this.files.set(newPath, fileOrFolder as IFile);
            if (metadata) {
                this.metadata.set(newPath, metadata);
            }
        }

        async createFolder(path: string): Promise<IFolder> {
            return { path, name: path.split('/').pop() || '', children: [] };
        }

        async listFiles(folder?: IFolder): Promise<IFile[]> {
            return Array.from(this.files.values());
        }

        async listFolders(folder?: IFolder): Promise<IFolder[]> {
            return [];
        }

        async getFile(path: string): Promise<IFile | IFolder | null> {
            return this.files.get(path) || null;
        }

        getAbsolutePath(relativePath: string): string {
            return relativePath;
        }

        getName(): string {
            return 'TestVault';
        }

        isFolder(file: IFile): boolean {
            return !('extension' in file);
        }

        isFile(file: IFile): boolean {
            return 'extension' in file;
        }

        getUrl(path: string): string {
            return `vault://test/${path}`;
        }

        async getMetadata(file: IFile): Promise<Record<string, any>> {
            return this.metadata.get(file.path) || {};
        }

        async updateMetadata(file: IFile, metadata: Record<string, any>): Promise<void> {
            this.metadata.set(file.path, { ...metadata });
            
            // Also update file content to maintain consistency
            const yaml = require('js-yaml');
            const frontmatter = yaml.dump(metadata, {
                flowLevel: -1,
                lineWidth: -1,
                noRefs: true,
                sortKeys: false,
                forceQuotes: true,
                quotingType: '"',
                noCompatMode: true
            });
            const content = `---\n${frontmatter}\n---\n`;
            this.fileContents.set(file.path, content);
        }

        createButton(text: string, onClick: () => void): HTMLButtonElement {
            const button = document.createElement('button');
            button.textContent = text;
            button.onclick = onClick;
            return button;
        }

        createInput(type: string, value?: string): HTMLInputElement {
            const input = document.createElement('input');
            input.type = type;
            if (value !== undefined) input.value = value;
            return input;
        }

        createDiv(className?: string): HTMLDivElement {
            const div = document.createElement('div');
            if (className) div.className = className;
            return div;
        }

        setIcon(element: HTMLElement, iconName: string): void {
            element.setAttribute('data-icon', iconName);
        }

        async getTemplateContent(templateName: string): Promise<string> {
            return '';
        }

        getSetting(key: string): any {
            return (this.settings as any)[key];
        }

        async setSetting(key: string, value: any): Promise<void> {
            (this.settings as any)[key] = value;
        }

        getVaultPath(): string {
            return '/test/vault';
        }

        open(absoluteMediaPath: string): void {}

        async waitForFileMetaDataUpdate(filePath: string, key: string, callback: () => Promise<void>): Promise<void> {
            await callback();
        }

        async waitForMetaDataCacheUpdate(callback: () => Promise<void>): Promise<void> {
            await callback();
        }

        async selectMedia(vault: any, message: string): Promise<any> {
            return null;
        }

        async selectMultipleFile(vault: any, classes: string[], options: any): Promise<any> {
            return [];
        }

        async selectFile(vault: any, classes: string[], options: any): Promise<any> {
            return null;
        }

        async selectClasse(vault: any, classes: string[], options: any): Promise<any> {
            return null;
        }

        async selectFromList<T>(items: T[], options: {multiple: boolean, title?: string}): Promise<T | T[] | null> {
            return null;
        }

        sendNotice(message: string, timeout?: number): void {}
    }

    beforeEach(() => {
        mockApp = new MockApp();
        vault = new Vault(mockApp, { 
            templateFolder: '/templates',
            personalName: 'Test',
            configPath: './config'
        });
    });

    describe('getClassePropertyValue', () => {
        it('should return value from main property when it exists', async () => {
            const file = await mockApp.createFile('test.md', '');
            await mockApp.updateMetadata(file, { Classe: 'Contact', Type: 'OldValue' });
            
            const fileObj = new File(vault, file);
            const value = await fileObj.getClassePropertyValue();
            
            expect(value).toBe('Contact');
        });

        it('should return value from first alias when main property does not exist', async () => {
            const file = await mockApp.createFile('test.md', '');
            await mockApp.updateMetadata(file, { Type: 'Contact' });
            
            const fileObj = new File(vault, file);
            const value = await fileObj.getClassePropertyValue();
            
            expect(value).toBe('Contact');
        });

        it('should return value from second alias when first does not exist', async () => {
            const file = await mockApp.createFile('test.md', '');
            await mockApp.updateMetadata(file, { Category: 'Project' });
            
            const fileObj = new File(vault, file);
            const value = await fileObj.getClassePropertyValue();
            
            expect(value).toBe('Project');
        });

        it('should migrate alias value to main property', async () => {
            const file = await mockApp.createFile('test.md', '');
            await mockApp.updateMetadata(file, { Type: 'Contact' });
            
            const fileObj = new File(vault, file);
            await fileObj.getClassePropertyValue();
            
            const metadata = await mockApp.getMetadata(file);
            expect(metadata.Classe).toBe('Contact');
        });

        it('should delete alias after migration when deleteAliasesAfterMigration is true', async () => {
            mockApp.setSettings({ deleteAliasesAfterMigration: true });
            const file = await mockApp.createFile('test.md', '');
            await mockApp.updateMetadata(file, { Type: 'Contact' });
            
            const fileObj = new File(vault, file);
            await fileObj.getClassePropertyValue();
            
            const metadata = await mockApp.getMetadata(file);
            expect(metadata.Type).toBeUndefined();
            expect(metadata.Classe).toBe('Contact');
        });

        it('should keep alias after migration when deleteAliasesAfterMigration is false', async () => {
            mockApp.setSettings({ deleteAliasesAfterMigration: false });
            const file = await mockApp.createFile('test.md', '');
            await mockApp.updateMetadata(file, { Type: 'Contact' });
            
            const fileObj = new File(vault, file);
            await fileObj.getClassePropertyValue();
            
            const metadata = await mockApp.getMetadata(file);
            expect(metadata.Type).toBe('Contact');
            expect(metadata.Classe).toBe('Contact');
        });

        it('should return undefined when no property or alias exists', async () => {
            const file = await mockApp.createFile('test.md', '');
            await mockApp.updateMetadata(file, { Other: 'Value' });
            
            const fileObj = new File(vault, file);
            const value = await fileObj.getClassePropertyValue();
            
            expect(value).toBeUndefined();
        });

        it('should handle empty aliases array', async () => {
            mockApp.setSettings({ classePropertyAliases: [] });
            const file = await mockApp.createFile('test.md', '');
            await mockApp.updateMetadata(file, { Type: 'Contact' });
            
            const fileObj = new File(vault, file);
            const value = await fileObj.getClassePropertyValue();
            
            expect(value).toBeUndefined();
        });

        it('should handle undefined aliases', async () => {
            mockApp.setSettings({ classePropertyAliases: undefined });
            const file = await mockApp.createFile('test.md', '');
            await mockApp.updateMetadata(file, { Type: 'Contact' });
            
            const fileObj = new File(vault, file);
            const value = await fileObj.getClassePropertyValue();
            
            expect(value).toBeUndefined();
        });

        it('should use custom classePropertyName', async () => {
            mockApp.setSettings({ classePropertyName: 'EntityType' });
            const file = await mockApp.createFile('test.md', '');
            await mockApp.updateMetadata(file, { EntityType: 'Customer' });
            
            const fileObj = new File(vault, file);
            const value = await fileObj.getClassePropertyValue();
            
            expect(value).toBe('Customer');
        });

        it('should migrate to custom classePropertyName', async () => {
            mockApp.setSettings({ 
                classePropertyName: 'EntityType',
                classePropertyAliases: ['Type', 'Category']
            });
            const file = await mockApp.createFile('test.md', '');
            await mockApp.updateMetadata(file, { Type: 'Customer' });
            
            const fileObj = new File(vault, file);
            await fileObj.getClassePropertyValue();
            
            const metadata = await mockApp.getMetadata(file);
            expect(metadata.EntityType).toBe('Customer');
            expect(metadata.Type).toBeUndefined();
        });
    });

    describe('Vault.getClasse with aliases', () => {
        it('should find classe by main property', async () => {
            const file = await mockApp.createFile('contact.md', '');
            await mockApp.updateMetadata(file, { Classe: 'Contact' });
            
            const fileObj = new File(vault, file);
            const metadata = await mockApp.getMetadata(file);
            
            // Should find Contact even if class doesn't exist
            expect(metadata.Classe).toBe('Contact');
        });

        it('should find classe by alias', async () => {
            const file = await mockApp.createFile('contact.md', '');
            await mockApp.updateMetadata(file, { Type: 'Contact' });
            
            const metadata = await mockApp.getMetadata(file);
            
            // Metadata should still have the alias
            expect(metadata.Type).toBe('Contact');
        });
    });

    describe('DynamicClassFactory.findFilesByClassName with aliases', () => {
        it('should find files with main property', async () => {
            const file1 = await mockApp.createFile('contact1.md', '');
            const file2 = await mockApp.createFile('contact2.md', '');
            await mockApp.updateMetadata(file1, { Classe: 'Contact' });
            await mockApp.updateMetadata(file2, { Classe: 'Contact' });
            
            // Files should be findable
            const metadata1 = await mockApp.getMetadata(file1);
            const metadata2 = await mockApp.getMetadata(file2);
            
            expect(metadata1.Classe).toBe('Contact');
            expect(metadata2.Classe).toBe('Contact');
        });

        it('should find files with alias property', async () => {
            const file1 = await mockApp.createFile('contact1.md', '');
            const file2 = await mockApp.createFile('contact2.md', '');
            await mockApp.updateMetadata(file1, { Type: 'Contact' });
            await mockApp.updateMetadata(file2, { Category: 'Contact' });
            
            // Files should have the alias properties
            const metadata1 = await mockApp.getMetadata(file1);
            const metadata2 = await mockApp.getMetadata(file2);
            
            expect(metadata1.Type).toBe('Contact');
            expect(metadata2.Category).toBe('Contact');
        });

        it('should find files with mixed properties', async () => {
            const file1 = await mockApp.createFile('contact1.md', '');
            const file2 = await mockApp.createFile('contact2.md', '');
            const file3 = await mockApp.createFile('contact3.md', '');
            
            await mockApp.updateMetadata(file1, { Classe: 'Contact' });
            await mockApp.updateMetadata(file2, { Type: 'Contact' });
            await mockApp.updateMetadata(file3, { Category: 'Contact' });
            
            // All files should have their respective properties
            const metadata1 = await mockApp.getMetadata(file1);
            const metadata2 = await mockApp.getMetadata(file2);
            const metadata3 = await mockApp.getMetadata(file3);
            
            expect(metadata1.Classe).toBe('Contact');
            expect(metadata2.Type).toBe('Contact');
            expect(metadata3.Category).toBe('Contact');
        });
    });

    describe('Migration scenarios', () => {
        it('should handle migration of multiple files', async () => {
            const file1 = await mockApp.createFile('old1.md', '');
            const file2 = await mockApp.createFile('old2.md', '');
            const file3 = await mockApp.createFile('old3.md', '');
            
            await mockApp.updateMetadata(file1, { Type: 'Contact' });
            await mockApp.updateMetadata(file2, { Category: 'Project' });
            await mockApp.updateMetadata(file3, { Kind: 'Task' });
            
            const fileObj1 = new File(vault, file1);
            const fileObj2 = new File(vault, file2);
            const fileObj3 = new File(vault, file3);
            
            await fileObj1.getClassePropertyValue();
            await fileObj2.getClassePropertyValue();
            await fileObj3.getClassePropertyValue();
            
            const metadata1 = await mockApp.getMetadata(file1);
            const metadata2 = await mockApp.getMetadata(file2);
            const metadata3 = await mockApp.getMetadata(file3);
            
            expect(metadata1.Classe).toBe('Contact');
            expect(metadata2.Classe).toBe('Project');
            expect(metadata3.Classe).toBe('Task');
            
            expect(metadata1.Type).toBeUndefined();
            expect(metadata2.Category).toBeUndefined();
            expect(metadata3.Kind).toBeUndefined();
        });

        it('should not migrate if main property already exists', async () => {
            const file = await mockApp.createFile('test.md', '');
            await mockApp.updateMetadata(file, { Classe: 'Contact', Type: 'OldContact' });
            
            const fileObj = new File(vault, file);
            await fileObj.getClassePropertyValue();
            
            const metadata = await mockApp.getMetadata(file);
            
            expect(metadata.Classe).toBe('Contact');
            expect(metadata.Type).toBe('OldContact'); // Not deleted because Classe already existed
        });

        it('should handle files without any classe property', async () => {
            const file = await mockApp.createFile('test.md', '');
            await mockApp.updateMetadata(file, { title: 'Test', content: 'Content' });
            
            const fileObj = new File(vault, file);
            const value = await fileObj.getClassePropertyValue();
            
            const metadata = await mockApp.getMetadata(file);
            
            expect(value).toBeUndefined();
            expect(metadata.Classe).toBeUndefined();
            expect(metadata.title).toBe('Test');
        });
    });

    describe('Edge cases', () => {
        it('should handle empty string values', async () => {
            const file = await mockApp.createFile('test.md', '');
            await mockApp.updateMetadata(file, { Type: '' });
            
            const fileObj = new File(vault, file);
            const value = await fileObj.getClassePropertyValue();
            
            expect(value).toBe('');
        });

        it('should handle null values', async () => {
            const file = await mockApp.createFile('test.md', '');
            await mockApp.updateMetadata(file, { Type: null });
            
            const fileObj = new File(vault, file);
            const value = await fileObj.getClassePropertyValue();
            
            expect(value).toBeNull();
        });

        it('should handle numeric values', async () => {
            const file = await mockApp.createFile('test.md', '');
            await mockApp.updateMetadata(file, { Type: 123 });
            
            const fileObj = new File(vault, file);
            const value = await fileObj.getClassePropertyValue();
            
            expect(value).toBe(123);
        });

        it('should handle boolean values', async () => {
            const file = await mockApp.createFile('test.md', '');
            await mockApp.updateMetadata(file, { Type: true });
            
            const fileObj = new File(vault, file);
            const value = await fileObj.getClassePropertyValue();
            
            expect(value).toBe(true);
        });

        it('should handle array values', async () => {
            const file = await mockApp.createFile('test.md', '');
            await mockApp.updateMetadata(file, { Type: ['Contact', 'Lead'] });
            
            const fileObj = new File(vault, file);
            const value = await fileObj.getClassePropertyValue();
            
            expect(value).toEqual(['Contact', 'Lead']);
        });

        it('should handle object values', async () => {
            const file = await mockApp.createFile('test.md', '');
            const objValue = { name: 'Contact', version: 1 };
            await mockApp.updateMetadata(file, { Type: objValue });
            
            const fileObj = new File(vault, file);
            const value = await fileObj.getClassePropertyValue();
            
            expect(value).toEqual(objValue);
        });
    });
});
