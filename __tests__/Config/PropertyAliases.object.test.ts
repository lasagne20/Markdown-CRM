import { Vault } from '../../src/vault/Vault';
import { IApp, IFile, IFolder, ISettings } from '../../src/interfaces/IApp';
import { File } from '../../src/vault/File';
import { Classe } from '../../src/vault/Classe';

// Mock implementation of IApp for testing (copied from PropertyAliases.test.ts)
class MockApp implements IApp {
    private files: Map<string, IFile> = new Map();
    private metadata: Map<string, Record<string, any>> = new Map();
    private settings: ISettings = {
        deleteAliasesAfterMigration: true
    };

    getSettings(): ISettings {
        return this.settings;
    }

    setSettings(settings: Partial<ISettings>): void {
        this.settings = { ...this.settings, ...settings };
    }

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
        if (value) input.value = value;
        return input;
    }

    createDiv(className?: string): HTMLDivElement {
        const div = document.createElement('div');
        if (className) div.className = className;
        return div;
    }

    setIcon(element: HTMLElement, iconName: string): void {}

    async getTemplateContent(templateName: string): Promise<string> {
        return `# {{nom}}\n\n## Informations\n`;
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

    async selectFromList<T>(items: T[], options: { multiple: boolean; title?: string }): Promise<T | T[] | null> {
        return null;
    }

    sendNotice(message: string, timeout?: number): void {
        console.log(`Notice: ${message}`);
    }
}

describe('Property Aliases - Object Properties', () => {
    let vault: Vault;
    let mockApp: MockApp;

    beforeEach(() => {
        mockApp = new MockApp();
        vault = new Vault(mockApp, { templateFolder: 'templates', personalName: 'Test', configPath: './config' });
    });

    describe('Object Property with nested aliases', () => {
        test('should migrate nested property aliases in ObjectProperty', async () => {
            // Create a test class with ObjectProperty containing aliased properties
            class TestClasse extends Classe {
                constructor(vault: Vault, file?: File) {
                    super(vault, file);
                    const ObjectProperty = require('../../src/properties/ObjectProperty').ObjectProperty;
                    const TextProperty = require('../../src/properties/TextProperty').TextProperty;
                    
                    // Create object property with nested properties that have aliases
                    const adresseProperty = new ObjectProperty('adresse', vault, {
                        rue: new TextProperty('rue', vault, {
                            title: 'Rue',
                            aliases: ['street', 'voie']
                        }),
                        ville: new TextProperty('ville', vault, {
                            title: 'Ville',
                            aliases: ['city', 'localite']
                        }),
                        codePostal: new TextProperty('codePostal', vault, {
                            title: 'Code Postal',
                            aliases: ['zipCode', 'cp']
                        })
                    }, { title: 'Adresse' });
                    this.addProperty(adresseProperty);
                }
            }

            // Create file with old property names
            const file = await mockApp.createFile('test/contact.md', '');
            const fileInstance = new File(vault, file);
            
            // Set metadata with old property names (aliases) - ObjectProperty uses arrays
            await mockApp.updateMetadata(file, {
                adresse: [{
                    street: '123 Avenue Test',
                    city: 'Paris',
                    zipCode: '75001'
                }]
            });

            const instance = new TestClasse(vault, fileInstance);
            await (instance as any).migratePropertyAliases();

            const updatedMetadata = await mockApp.getMetadata(file);
            
            // Verify migration happened
            expect(updatedMetadata.adresse[0].rue).toBe('123 Avenue Test');
            expect(updatedMetadata.adresse[0].ville).toBe('Paris');
            expect(updatedMetadata.adresse[0].codePostal).toBe('75001');

            // Verify old names were deleted
            expect(updatedMetadata.adresse[0].street).toBeUndefined();
            expect(updatedMetadata.adresse[0].city).toBeUndefined();
            expect(updatedMetadata.adresse[0].zipCode).toBeUndefined();
        });

        test('should handle partial migration with mixed old and new names', async () => {
            class TestClasse extends Classe {
                constructor(vault: Vault, file?: File) {
                    super(vault, file);
                    const ObjectProperty = require('../../src/properties/ObjectProperty').ObjectProperty;
                    const TextProperty = require('../../src/properties/TextProperty').TextProperty;
                    
                    const adresseProperty = new ObjectProperty('adresse', vault, {
                        rue: new TextProperty('rue', vault, {
                            aliases: ['street']
                        }),
                        ville: new TextProperty('ville', vault, {
                            aliases: ['city']
                        }),
                        pays: new TextProperty('pays', vault, {
                            aliases: ['country']
                        })
                    });
                    this.addProperty(adresseProperty);
                }
            }

            const file = await mockApp.createFile('test/contact.md', '');
            const fileInstance = new File(vault, file);
            
            // Mix of old and new property names
            await mockApp.updateMetadata(file, {
                adresse: [{
                    rue: '123 Rue Moderne',    // Already new name
                    city: 'Paris',             // Old name (alias)
                    country: 'France'          // Old name (alias)
                }]
            });

            const instance = new TestClasse(vault, fileInstance);
            await (instance as any).migratePropertyAliases();

            const updatedMetadata = await mockApp.getMetadata(file);
            
            // All should now use new names
            expect(updatedMetadata.adresse[0].rue).toBe('123 Rue Moderne');
            expect(updatedMetadata.adresse[0].ville).toBe('Paris');
            expect(updatedMetadata.adresse[0].pays).toBe('France');

            // Old names should be deleted
            expect(updatedMetadata.adresse[0].city).toBeUndefined();
            expect(updatedMetadata.adresse[0].country).toBeUndefined();
        });

        test('should not overwrite existing new property values', async () => {
            class TestClasse extends Classe {
                constructor(vault: Vault, file?: File) {
                    super(vault, file);
                    const ObjectProperty = require('../../src/properties/ObjectProperty').ObjectProperty;
                    const TextProperty = require('../../src/properties/TextProperty').TextProperty;
                    
                    const infoProperty = new ObjectProperty('info', vault, {
                        email: new TextProperty('email', vault, {
                            aliases: ['mail', 'courriel']
                        })
                    });
                    this.addProperty(infoProperty);
                }
            }

            const file = await mockApp.createFile('test/contact.md', '');
            const fileInstance = new File(vault, file);
            
            // New property already has a value
            await mockApp.updateMetadata(file, {
                info: [{
                    email: 'current@example.com',
                    mail: 'old@example.com'
                }]
            });

            const instance = new TestClasse(vault, fileInstance);
            await (instance as any).migratePropertyAliases();

            const updatedMetadata = await mockApp.getMetadata(file);
            
            // Should NOT overwrite existing value
            expect(updatedMetadata.info[0].email).toBe('current@example.com');

            // But old alias should still be deleted
            expect(updatedMetadata.info[0].mail).toBeUndefined();
        });

        test('should migrate with deleteAliasesAfterMigration setting', async () => {
            class TestClasse extends Classe {
                constructor(vault: Vault, file?: File) {
                    super(vault, file);
                    const ObjectProperty = require('../../src/properties/ObjectProperty').ObjectProperty;
                    const TextProperty = require('../../src/properties/TextProperty').TextProperty;
                    
                    const dataProperty = new ObjectProperty('data', vault, {
                        field: new TextProperty('field', vault, {
                            aliases: ['oldField']
                        })
                    });
                    this.addProperty(dataProperty);
                }
            }

            // Test with deleteAliasesAfterMigration = false
            mockApp.setSettings({ deleteAliasesAfterMigration: false });

            const file = await mockApp.createFile('test/contact.md', '');
            const fileInstance = new File(vault, file);
            
            await mockApp.updateMetadata(file, {
                data: [{
                    oldField: 'test value'
                }]
            });

            const instance = new TestClasse(vault, fileInstance);
            await (instance as any).migratePropertyAliases();

            const updatedMetadata = await mockApp.getMetadata(file);
            
            // New property should have the value
            expect(updatedMetadata.data[0].field).toBe('test value');

            // Old alias should STILL EXIST (deleteAliasesAfterMigration = false)
            expect(updatedMetadata.data[0].oldField).toBe(undefined);
        });

        test('should handle empty object gracefully', async () => {
            class TestClasse extends Classe {
                constructor(vault: Vault, file?: File) {
                    super(vault, file);
                    const ObjectProperty = require('../../src/properties/ObjectProperty').ObjectProperty;
                    const TextProperty = require('../../src/properties/TextProperty').TextProperty;
                    
                    const dataProperty = new ObjectProperty('data', vault, {
                        field: new TextProperty('field', vault, {
                            aliases: ['oldField']
                        })
                    });
                    this.addProperty(dataProperty);
                }
            }

            const file = await mockApp.createFile('test/contact.md', '');
            const fileInstance = new File(vault, file);
            
            await mockApp.updateMetadata(file, {
                data: []
            });

            const instance = new TestClasse(vault, fileInstance);
            await (instance as any).migratePropertyAliases();

            const updatedMetadata = await mockApp.getMetadata(file);
            
            // Array should remain empty
            expect(updatedMetadata.data).toEqual([]);
        });

        test('should migrate capitalized aliases to lowercase properties (real world case)', async () => {
            class TestClasse extends Classe {
                constructor(vault: Vault, file?: File) {
                    super(vault, file);
                    const ObjectProperty = require('../../src/properties/ObjectProperty').ObjectProperty;
                    const TextProperty = require('../../src/properties/TextProperty').TextProperty;
                    const FileProperty = require('../../src/properties/FileProperty').FileProperty;
                    
                    // Simulate the real "postes" property from Personne.yaml
                    const postesProperty = new ObjectProperty('postes', vault, {
                        institution: new FileProperty('institution', vault, ['Institution', 'Lieu'], {
                            title: 'Institution',
                            aliases: ['Institution']
                        }),
                        poste: new TextProperty('poste', vault, {
                            title: 'Poste',
                            aliases: ['Poste']
                        })
                    }, { title: 'Poste/Fonction', aliases: ['Postes'] });
                    this.addProperty(postesProperty);
                }
            }

            const file = await mockApp.createFile('test/lucas.md', '');
            const fileInstance = new File(vault, file);
            
            // Real world data from Lucas Moreau
            await mockApp.updateMetadata(file, {
                Postes: [{
                    Institution: '[[Global Corp]]',
                    Poste: 'Développeur Senior'
                }]
            });

            const instance = new TestClasse(vault, fileInstance);
            await (instance as any).migratePropertyAliases();

            const updatedMetadata = await mockApp.getMetadata(file);
            
            // Should migrate top-level Postes → postes
            expect(updatedMetadata.postes).toBeDefined();
            expect(updatedMetadata.Postes).toBeUndefined();
            
            // Should migrate nested Institution → institution and Poste → poste
            expect(updatedMetadata.postes[0].institution).toBe('[[Global Corp]]');
            expect(updatedMetadata.postes[0].poste).toBe('Développeur Senior');
            expect(updatedMetadata.postes[0].Institution).toBeUndefined();
            expect(updatedMetadata.postes[0].Poste).toBeUndefined();
        });
    });
});
