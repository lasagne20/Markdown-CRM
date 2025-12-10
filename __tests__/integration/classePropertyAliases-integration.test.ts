import { Vault } from '../../src/vault/Vault';
import { IApp, IFile, IFolder, ISettings } from '../../src/interfaces/IApp';
import { File } from '../../src/vault/File';
import { DynamicClassFactory } from '../../src/Config/DynamicClassFactory';
import * as path from 'path';
import * as fs from 'fs';

describe('ClassePropertyAliases Integration Tests', () => {
    let vault: Vault;
    let mockApp: MockApp;
    let tempDir: string;

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
            await this.writeFile(file, content);
            return file;
        }

        async delete(file: IFile | IFolder): Promise<void> {
            this.files.delete(file.path);
            this.metadata.delete(file.path);
            this.fileContents.delete(file.path);
        }

        async move(fileOrFolder: IFile | IFolder, newPath: string): Promise<void> {
            const oldPath = fileOrFolder.path;
            const metadata = this.metadata.get(oldPath);
            const content = this.fileContents.get(oldPath);
            
            this.files.delete(oldPath);
            this.metadata.delete(oldPath);
            this.fileContents.delete(oldPath);
            
            fileOrFolder.path = newPath;
            fileOrFolder.name = newPath.split('/').pop() || '';
            (fileOrFolder as IFile).basename = newPath.split('/').pop()?.replace('.md', '') || '';
            
            this.files.set(newPath, fileOrFolder as IFile);
            if (metadata) this.metadata.set(newPath, metadata);
            if (content) this.fileContents.set(newPath, content);
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

    describe('End-to-end migration scenario', () => {
        it('should migrate files from Type to Classe automatically when accessed via getClassePropertyValue', async () => {
            // Create files with old property name
            const contact1 = await mockApp.createFile('contacts/john.md', 
                '---\nType: "Contact"\nnom: "John Doe"\n---\n');
            const contact2 = await mockApp.createFile('contacts/jane.md',
                '---\nCategory: "Contact"\nnom: "Jane Smith"\n---\n');
            const contact3 = await mockApp.createFile('contacts/bob.md',
                '---\nClasse: "Contact"\nnom: "Bob Wilson"\n---\n');

            // Access files through File.getClassePropertyValue - triggers migration
            const file1 = new File(vault, contact1);
            const file2 = new File(vault, contact2);
            const file3 = new File(vault, contact3);
            
            const value1 = await file1.getClassePropertyValue();
            const value2 = await file2.getClassePropertyValue();
            const value3 = await file3.getClassePropertyValue();

            expect(value1).toBe('Contact');
            expect(value2).toBe('Contact');
            expect(value3).toBe('Contact');

            // Check that all files are now using Classe property
            const metadata1 = await mockApp.getMetadata(contact1);
            const metadata2 = await mockApp.getMetadata(contact2);
            const metadata3 = await mockApp.getMetadata(contact3);

            expect(metadata1.Classe).toBe('Contact');
            expect(metadata2.Classe).toBe('Contact');
            expect(metadata3.Classe).toBe('Contact');

            // Check that old properties are deleted
            expect(metadata1.Type).toBeUndefined();
            expect(metadata2.Category).toBeUndefined();
        });

        it('should handle mixed files during search and migration', async () => {
            // Create multiple files with different property names
            await mockApp.createFile('vault/contact1.md', '---\nType: "Contact"\n---\n');
            await mockApp.createFile('vault/contact2.md', '---\nCategory: "Contact"\n---\n');
            await mockApp.createFile('vault/contact3.md', '---\nClasse: "Contact"\n---\n');
            await mockApp.createFile('vault/project1.md', '---\nKind: "Project"\n---\n');
            await mockApp.createFile('vault/project2.md', '---\nClasse: "Project"\n---\n');

            // List all files
            const allFiles = await mockApp.listFiles();

            // Access each file to trigger migration
            for (const file of allFiles) {
                const fileObj = new File(vault, file);
                await fileObj.getClassePropertyValue();
            }

            // Verify all files are migrated
            for (const file of allFiles) {
                const metadata = await mockApp.getMetadata(file);
                expect(metadata.Classe).toBeDefined();
                
                // Check old properties are deleted
                expect(metadata.Type).toBeUndefined();
                expect(metadata.Category).toBeUndefined();
                expect(metadata.Kind).toBeUndefined();
            }
        });

        it('should preserve data during migration', async () => {
            const originalContent = '---\nType: "Contact"\nnom: "John Doe"\nemail: "john@example.com"\nage: 30\n---\nSome content here';
            const file = await mockApp.createFile('contact.md', originalContent);

            // Trigger migration
            const fileObj = new File(vault, file);
            await fileObj.getClassePropertyValue();

            // Verify all data is preserved
            const metadata = await mockApp.getMetadata(file);
            expect(metadata.Classe).toBe('Contact');
            expect(metadata.nom).toBe('John Doe');
            expect(metadata.email).toBe('john@example.com');
            expect(metadata.age).toBe(30);

            // Verify content is preserved
            const content = await mockApp.readFile(file);
            expect(content).toContain('Some content here');
        });

        it('should handle migration with deleteAliasesAfterMigration=false', async () => {
            mockApp.setSettings({ deleteAliasesAfterMigration: false });

            const file = await mockApp.createFile('contact.md', '---\nType: "Contact"\n---\n');
            const fileObj = new File(vault, file);
            
            await fileObj.getClassePropertyValue();

            const metadata = await mockApp.getMetadata(file);
            
            // Both properties should exist
            expect(metadata.Classe).toBe('Contact');
            expect(metadata.Type).toBe('Contact');
        });

        it('should work with custom classePropertyName', async () => {
            mockApp.setSettings({ 
                classePropertyName: 'EntityType',
                classePropertyAliases: ['Type', 'Classe']
            });

            const file = await mockApp.createFile('contact.md', '---\nType: "Contact"\n---\n');
            const fileObj = new File(vault, file);
            
            const value = await fileObj.getClassePropertyValue();
            const metadata = await mockApp.getMetadata(file);

            expect(value).toBe('Contact');
            expect(metadata.EntityType).toBe('Contact');
            expect(metadata.Type).toBeUndefined();
        });

        it('should handle files without any classe property', async () => {
            const file = await mockApp.createFile('note.md', '---\ntitle: "My Note"\ncontent: "Some text"\n---\n');
            const fileObj = new File(vault, file);
            
            const value = await fileObj.getClassePropertyValue();
            const metadata = await mockApp.getMetadata(file);

            expect(value).toBeUndefined();
            expect(metadata.Classe).toBeUndefined();
            expect(metadata.title).toBe('My Note');
        });

        it('should prioritize main property over aliases', async () => {
            const file = await mockApp.createFile('contact.md', 
                '---\nClasse: "Contact"\nType: "OldContact"\n---\n');
            const fileObj = new File(vault, file);
            
            const value = await fileObj.getClassePropertyValue();
            const metadata = await mockApp.getMetadata(file);

            // Should use Classe, not Type
            expect(value).toBe('Contact');
            expect(metadata.Classe).toBe('Contact');
            // Type should not be deleted since Classe already existed
            expect(metadata.Type).toBe('OldContact');
        });

        it('should handle incremental migration across multiple access', async () => {
            const file = await mockApp.createFile('contact.md', '---\nType: "Contact"\nnom: "John"\n---\n');
            const fileObj = new File(vault, file);
            
            // First access - triggers migration
            const value1 = await fileObj.getClassePropertyValue();
            expect(value1).toBe('Contact');
            
            let metadata = await mockApp.getMetadata(file);
            expect(metadata.Classe).toBe('Contact');
            expect(metadata.Type).toBeUndefined();

            // Second access - should use migrated property
            const value2 = await fileObj.getClassePropertyValue();
            expect(value2).toBe('Contact');
            
            metadata = await mockApp.getMetadata(file);
            expect(metadata.Classe).toBe('Contact');
        });

        it('should handle concurrent file access safely', async () => {
            const files = await Promise.all([
                mockApp.createFile('contact1.md', '---\nType: "Contact"\n---\n'),
                mockApp.createFile('contact2.md', '---\nCategory: "Contact"\n---\n'),
                mockApp.createFile('contact3.md', '---\nKind: "Contact"\n---\n'),
            ]);

            // Access all files concurrently
            await Promise.all(files.map(async file => {
                const fileObj = new File(vault, file);
                await fileObj.getClassePropertyValue();
            }));

            // Verify all are migrated
            for (const file of files) {
                const metadata = await mockApp.getMetadata(file);
                expect(metadata.Classe).toBe('Contact');
            }
        });
    });

    describe('Real-world migration scenarios', () => {
        it('should migrate a CRM with Type to Classe', async () => {
            // Simulate old CRM structure
            const oldFiles = [
                { path: 'Contacts/John.md', type: 'Contact' },
                { path: 'Contacts/Jane.md', type: 'Contact' },
                { path: 'Companies/ACME.md', type: 'Company' },
                { path: 'Projects/ProjectA.md', type: 'Project' },
            ];

            // Create files with old structure
            for (const { path, type } of oldFiles) {
                await mockApp.createFile(path, `---\nType: "${type}"\n---\n`);
            }

            // Migrate all files
            const allFiles = await mockApp.listFiles();
            for (const file of allFiles) {
                const fileObj = new File(vault, file);
                await fileObj.getClassePropertyValue();
            }

            // Verify migration
            for (let i = 0; i < allFiles.length; i++) {
                const metadata = await mockApp.getMetadata(allFiles[i]);
                expect(metadata.Classe).toBe(oldFiles[i].type);
                expect(metadata.Type).toBeUndefined();
            }
        });

        it('should handle partial migration state', async () => {
            // Some files already migrated, some not
            await mockApp.createFile('old1.md', '---\nType: "Contact"\n---\n');
            await mockApp.createFile('new1.md', '---\nClasse: "Contact"\n---\n');
            await mockApp.createFile('old2.md', '---\nCategory: "Project"\n---\n');
            await mockApp.createFile('new2.md', '---\nClasse: "Project"\n---\n');

            const allFiles = await mockApp.listFiles();
            
            // Access all files
            for (const file of allFiles) {
                const fileObj = new File(vault, file);
                await fileObj.getClassePropertyValue();
            }

            // All should now use Classe
            for (const file of allFiles) {
                const metadata = await mockApp.getMetadata(file);
                expect(metadata.Classe).toBeDefined();
                expect(metadata.Type).toBeUndefined();
                expect(metadata.Category).toBeUndefined();
            }
        });
    });
});
