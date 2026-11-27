import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { File } from '../../src/vault/File';
import { IApp, IFile, IFolder, ISettings } from '../../src/interfaces/IApp';

/**
 * Regression test: when an onCreate process renames the file
 * (RenameFileAction with normalize, e.g. "jean.dupont" -> "Jean Dupont"),
 * Vault.createFile must return the renamed File. It used to return the
 * pre-onCreate reference, so callers (file suggester, open after create)
 * tried to open a path that no longer existed.
 */
describe('Vault.createFile - fichier renomme pendant onCreate', () => {
    let mockApp: MockApp;
    let vault: Vault;

    class MockApp implements IApp {
        private files: Map<string, IFile> = new Map();
        private metadata: Map<string, Record<string, any>> = new Map();

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
            return '---\n---\n';
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

            // Parse the frontmatter so Classe detection works like in a real vault
            const yaml = require('js-yaml');
            const match = content.match(/^---\r?\n([\s\S]+?)\r?\n---/);
            if (match) {
                this.metadata.set(path, yaml.load(match[1]) || {});
            } else {
                this.metadata.set(path, {});
            }
            // Like ObsidianApp.createFile (toIFile): return a COPY, not the
            // stored object — vault.rename never mutates this reference
            return { ...file };
        }

        async delete(file: IFile | IFolder): Promise<void> {}

        async move(fileOrFolder: IFile | IFolder, newPath: string): Promise<void> {
            const oldPath = fileOrFolder.path;
            const metadata = this.metadata.get(oldPath);
            this.files.delete(oldPath);
            this.metadata.delete(oldPath);

            // Like Obsidian: the renamed file is a NEW object registered at
            // the new path; previously returned copies keep the old path
            const name = newPath.split('/').pop() || '';
            const newFile: IFile = {
                path: newPath,
                name,
                basename: name.replace('.md', ''),
                extension: 'md',
                parent: undefined,
                children: []
            };
            this.files.set(newPath, newFile);
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

    class TestPersonne extends Classe {
        static create(vault: Vault): TestPersonne {
            return new TestPersonne(vault);
        }
    }

    beforeEach(() => {
        mockApp = new MockApp();
        vault = new Vault(mockApp, {
            templateFolder: '/templates',
            personalName: 'Test',
            configPath: './config'
        });

        const classConfig = {
            className: 'TestPersonne',
            classIcon: 'circle-user-round',
            properties: {},
            process: [
                {
                    name: 'NormaliserNomPersonne',
                    triggers: ['onCreate' as const],
                    conditions: [],
                    actions: [
                        {
                            type: 'RenameFileAction' as const,
                            template: '{current}',
                            normalize: true
                        }
                    ]
                }
            ]
        };

        (Vault as any).dynamicClassFactory = {
            getClass: jest.fn().mockResolvedValue(TestPersonne),
            getClassConfig: jest.fn().mockResolvedValue(classConfig),
            getConfigManager: jest.fn().mockReturnValue({
                loadClassData: jest.fn().mockResolvedValue([])
            })
        };
        // Static singleton: reset so it binds to this test's vault/factory
        (Vault as any).processManager = null;
    });

    afterEach(() => {
        (Vault as any).dynamicClassFactory = null;
        (Vault as any).processManager = null;
    });

    it('retourne le fichier renomme quand un process onCreate renomme le fichier', async () => {
        const createdFile = await vault.createFile(TestPersonne, 'jean.dupont');

        expect(createdFile).toBeDefined();
        // Pas de slash initial pour un fichier a la racine
        expect(createdFile?.getPath()).toBe('Jean Dupont.md');

        // Le fichier renomme existe bien au nouveau chemin, l ancien est parti
        expect(await mockApp.getFile('Jean Dupont.md')).not.toBeNull();
        expect(await mockApp.getFile('jean.dupont.md')).toBeNull();

        // Le vault doit aussi resoudre la classe depuis le nouveau chemin
        const classe = await vault.getFromFile(createdFile!);
        expect(classe?.getName()).toBe('Jean Dupont');
    });

    it('retourne le fichier tel quel quand aucun renommage n a lieu', async () => {
        // Remove the rename process from the class config
        (Vault as any).dynamicClassFactory.getClassConfig.mockResolvedValue({
            className: 'TestPersonne',
            properties: {},
            process: []
        });

        const createdFile = await vault.createFile(TestPersonne, 'Jean Dupont');

        expect(createdFile?.getPath()).toBe('Jean Dupont.md');
        expect(await mockApp.getFile('Jean Dupont.md')).not.toBeNull();
    });
});
