import { Vault } from '../../src/vault/Vault';
import { IApp, IFile, IFolder, ISettings } from '../../src/interfaces/IApp';
import { File } from '../../src/vault/File';
import { Classe } from '../../src/vault/Classe';

// Mock implementation of IApp for testing
class MockApp implements IApp {
    private files: Map<string, IFile> = new Map();
    private metadata: Map<string, Record<string, any>> = new Map();
    private settings: ISettings = {
        deleteAliasesAfterMigration: true // Default setting
    };

    // Settings
    getSettings(): ISettings {
        return this.settings;
    }

    setSettings(settings: Partial<ISettings>): void {
        this.settings = { ...this.settings, ...settings };
    }

    // File operations
    async readFile(file: IFile): Promise<string> {
        return '';
    }

    async writeFile(file: IFile, content: string): Promise<void> {}

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

    // Folder operations
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

    // Metadata operations
    async getMetadata(file: IFile): Promise<Record<string, any>> {
        return this.metadata.get(file.path) || {};
    }

    async updateMetadata(file: IFile, metadata: Record<string, any>): Promise<void> {
        this.metadata.set(file.path, { ...metadata });
    }

    // UI operations
    createButton(text: string, onClick: () => void): HTMLButtonElement {
        const button = document.createElement('button');
        button.textContent = text;
        button.onclick = onClick;
        return button;
    }

    createInput(type: string, value?: string): HTMLInputElement {
        const input = document.createElement('input');
        input.type = type;
        if (value) input.value = value;
        return input;
    }

    createDiv(className?: string): HTMLDivElement {
        const div = document.createElement('div');
        if (className) div.className = className;
        return div;
    }

    setIcon(element: HTMLElement, iconName: string): void {}

    // Template operations
    async getTemplateContent(templateName: string): Promise<string> {
        return `# {{nom}}\n\n## Informations\n`;
    }

    // Settings
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

    // Utility functions
    async waitForFileMetaDataUpdate(filePath: string, key: string, callback: () => Promise<void>): Promise<void> {
        await callback();
    }

    async waitForMetaDataCacheUpdate(callback: () => Promise<void>): Promise<void> {
        await callback();
    }

    // Utility to select files & media
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

    async selectFromList<T>(items: T[], options: { multiple: boolean; title?: string }): Promise<T | T[] | null> {
        return null;
    }

    sendNotice(message: string, timeout?: number): void {
        console.log(`Notice: ${message}`);
    }
}

describe('Property Aliases Migration', () => {
    let mockApp: MockApp;
    let vault: Vault;

    beforeEach(() => {
        mockApp = new MockApp();
        vault = new Vault(mockApp, { templateFolder: 'templates', personalName: 'Test', configPath: './config' });
    });

    describe('Basic alias migration', () => {
        test('should migrate old property name to new one', async () => {
            // Create a test class with an aliased property
            class TestClasse extends Classe {
                constructor(vault: Vault, file?: File) {
                    super(vault, file);
                    // Add property with alias
                    const Property = require('../../src/properties/Property').Property;
                    this.addProperty(new Property('dateEntree', vault, {
                        aliases: ['date_entree', 'dateDebut']
                    }));
                }
            }

            // Create a file with old property name
            const file = await mockApp.createFile('test/Marie Dupont.md', '---\ndate_entree: "2025-01-15"\nstatus: "Actif"\n---\n');
            const fileInstance = new File(vault, file);
            
            // Set metadata with old property name
            await mockApp.updateMetadata(file, {
                date_entree: '2025-01-15',
                status: 'Actif'
            });

            const instance = new TestClasse(vault, fileInstance);
            await instance.onCreate();

            // Check that the new property name has the value
            const metadata = await mockApp.getMetadata(file);
            expect(metadata.dateEntree).toBe('2025-01-15');
            expect(metadata.date_entree).toBeUndefined(); // Old name should be deleted
        });

        test('should preserve new property value when both old and new exist', async () => {
            // Create a test class with an aliased property
            class TestClasse extends Classe {
                constructor(vault: Vault, file?: File) {
                    super(vault, file);
                    const Property = require('../../src/properties/Property').Property;
                    this.addProperty(new Property('dateEntree', vault, {
                        aliases: ['date_entree']
                    }));
                }
            }

            const file = await mockApp.createFile('test/Test.md', '');
            const fileInstance = new File(vault, file);
            
            // Set both old and new property names
            await mockApp.updateMetadata(file, {
                date_entree: '2025-01-15',
                dateEntree: '2025-02-20' // New value should be kept
            });

            const instance = new TestClasse(vault, fileInstance);
            await instance.onCreate();

            const metadata = await mockApp.getMetadata(file);
            expect(metadata.dateEntree).toBe('2025-02-20'); // New value preserved
        });

        test('should respect deleteAliasesAfterMigration setting', async () => {
            // Disable deletion
            mockApp.setSettings({ deleteAliasesAfterMigration: false });

            class TestClasse extends Classe {
                constructor(vault: Vault, file?: File) {
                    super(vault, file);
                    const Property = require('../../src/properties/Property').Property;
                    this.addProperty(new Property('dateEntree', vault, {
                        aliases: ['date_entree']
                    }));
                }
            }

            const file = await mockApp.createFile('test/Test.md', '');
            const fileInstance = new File(vault, file);
            
            await mockApp.updateMetadata(file, {
                date_entree: '2025-01-15'
            });

            const instance = new TestClasse(vault, fileInstance);
            await instance.onCreate();

            const metadata = await mockApp.getMetadata(file);
            expect(metadata.dateEntree).toBe('2025-01-15');
            expect(metadata.date_entree).toBe('2025-01-15'); // Old name should still exist
        });
    });

    describe('Multiple aliases', () => {
        test('should handle multiple aliases for the same property', async () => {
            // Set deleteAliasesAfterMigration to true
            mockApp.setSettings({ deleteAliasesAfterMigration: true });

            class TestClasse extends Classe {
                constructor(vault: Vault, file?: File) {
                    super(vault, file);
                    const Property = require('../../src/properties/Property').Property;
                    this.addProperty(new Property('statut', vault, {
                        aliases: ['status', 'etat']
                    }));
                }
            }

            const file = await mockApp.createFile('test/Test.md', '');
            const fileInstance = new File(vault, file);
            
            // Only one old alias exists
            await mockApp.updateMetadata(file, {
                status: 'Actif'
            });

            const instance = new TestClasse(vault, fileInstance);
            await instance.onCreate();

            const metadata = await mockApp.getMetadata(file);
            expect(metadata.statut).toBe('Actif');
            expect(metadata.status).toBeUndefined();
            expect(metadata.etat).toBeUndefined();
        });

        test('should migrate first alias found when multiple old names exist', async () => {
            class TestClasse extends Classe {
                constructor(vault: Vault, file?: File) {
                    super(vault, file);
                    const Property = require('../../src/properties/Property').Property;
                    this.addProperty(new Property('statut', vault, {
                        aliases: ['status', 'etat']
                    }));
                }
            }

            const file = await mockApp.createFile('test/Test.md', '');
            const fileInstance = new File(vault, file);
            
            // Both aliases exist
            await mockApp.updateMetadata(file, {
                status: 'Actif',
                etat: 'Inactif'
            });

            const instance = new TestClasse(vault, fileInstance);
            await instance.onCreate();

            const metadata = await mockApp.getMetadata(file);
            // First alias in the array wins
            expect(metadata.statut).toBe('Actif');
        });
    });

    describe('Edge cases', () => {
        test('should handle property with no aliases', async () => {
            class TestClasse extends Classe {
                constructor(vault: Vault, file?: File) {
                    super(vault, file);
                    const Property = require('../../src/properties/Property').Property;
                    this.addProperty(new Property('nom', vault)); // No aliases
                }
            }

            const file = await mockApp.createFile('test/Test.md', '');
            const fileInstance = new File(vault, file);
            
            await mockApp.updateMetadata(file, {
                nom: 'Test'
            });

            const instance = new TestClasse(vault, fileInstance);
            await instance.onCreate();

            const metadata = await mockApp.getMetadata(file);
            expect(metadata.nom).toBe('Test');
        });

        test('should handle empty aliases array', async () => {
            class TestClasse extends Classe {
                constructor(vault: Vault, file?: File) {
                    super(vault, file);
                    const Property = require('../../src/properties/Property').Property;
                    this.addProperty(new Property('nom', vault, { aliases: [] }));
                }
            }

            const file = await mockApp.createFile('test/Test.md', '');
            const fileInstance = new File(vault, file);
            
            await mockApp.updateMetadata(file, {
                nom: 'Test'
            });

            const instance = new TestClasse(vault, fileInstance);
            await instance.onCreate();

            const metadata = await mockApp.getMetadata(file);
            expect(metadata.nom).toBe('Test');
        });

        test('should not migrate when old property does not exist', async () => {
            class TestClasse extends Classe {
                constructor(vault: Vault, file?: File) {
                    super(vault, file);
                    const Property = require('../../src/properties/Property').Property;
                    this.addProperty(new Property('dateEntree', vault, {
                        aliases: ['date_entree']
                    }));
                }
            }

            const file = await mockApp.createFile('test/Test.md', '');
            const fileInstance = new File(vault, file);
            
            // No old property in metadata
            await mockApp.updateMetadata(file, {
                nom: 'Test'
            });

            const instance = new TestClasse(vault, fileInstance);
            await instance.onCreate();

            const metadata = await mockApp.getMetadata(file);
            expect(metadata.dateEntree).toBeUndefined();
            expect(metadata.date_entree).toBeUndefined();
        });

        test('should handle migration with empty new property value', async () => {
            class TestClasse extends Classe {
                constructor(vault: Vault, file?: File) {
                    super(vault, file);
                    const Property = require('../../src/properties/Property').Property;
                    this.addProperty(new Property('dateEntree', vault, {
                        aliases: ['date_entree']
                    }));
                }
            }

            const file = await mockApp.createFile('test/Test.md', '');
            const fileInstance = new File(vault, file);
            
            // New property is empty string, old has value
            await mockApp.updateMetadata(file, {
                date_entree: '2025-01-15',
                dateEntree: ''
            });

            const instance = new TestClasse(vault, fileInstance);
            await instance.onCreate();

            const metadata = await mockApp.getMetadata(file);
            // Should migrate because empty string is considered "no value"
            expect(metadata.dateEntree).toBe('2025-01-15');
        });
    });
});
