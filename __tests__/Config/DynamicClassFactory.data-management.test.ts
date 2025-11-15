import { DynamicClassFactory } from '../../src/Config/DynamicClassFactory';
import { Vault } from '../../src/vault/Vault';
import { IApp, IFile } from '../../src/interfaces/IApp';
import path from 'path';
import fs from 'fs';

/**
 * Tests for data management and folder structure
 * Covers createInstanceFromDataObject, loadDataForClass, and folder hierarchy
 */
describe('DynamicClassFactory - Data Management', () => {
    let factory: DynamicClassFactory;
    let vault: Vault;
    let mockApp: IApp;
    let configPath: string;
    let vaultPath: string;
    let dataPath: string;
    let fileStorage: Map<string, string>;

    beforeEach(async () => {
        configPath = path.join(__dirname, '../integration/visual-interface/config');
        vaultPath = path.join(__dirname, '../integration/visual-interface/vault');
        dataPath = path.join(__dirname, '../integration/visual-interface/data');

        fileStorage = new Map<string, string>();

        mockApp = {
            listFiles: jest.fn().mockResolvedValue([]),
            getFile: jest.fn(),
            readFile: jest.fn(),
            writeFile: jest.fn(),
            createFile: jest.fn(),
            createFolder: jest.fn(),
            move: jest.fn(),
            deleteFile: jest.fn(),
            getTemplateContent: jest.fn().mockResolvedValue(''),
            getSettings: jest.fn().mockReturnValue({ phoneFormat: 'FR' }),
            getMetadata: jest.fn().mockResolvedValue({}),
            updateMetadata: jest.fn().mockResolvedValue(undefined),
            sendNotice: jest.fn()
        } as any;

        // Mock getFile to read actual YAML and JSON files
        (mockApp.getFile as jest.Mock).mockImplementation(async (filePath: string) => {
            let fullPath: string;
            
            // Handle config files
            if (filePath.includes('/config/') || filePath.endsWith('.yaml')) {
                fullPath = path.join(configPath, path.basename(filePath));
            }
            // Handle data files
            else if (filePath.includes('/data/') || filePath.endsWith('.json')) {
                const relativePath = filePath.split('/data/')[1] || path.basename(filePath);
                fullPath = path.join(dataPath, relativePath);
            }
            // Handle vault files (check in-memory first)
            else {
                const normalizedPath = filePath.replace(/^\.\/vault\//, '');
                if (fileStorage.has(normalizedPath) || fileStorage.has(`/${normalizedPath}`)) {
                    return {
                        path: filePath,
                        basename: path.basename(filePath, path.extname(filePath)),
                        extension: path.extname(filePath).substring(1),
                        name: path.basename(filePath)
                    } as IFile;
                }
                fullPath = path.join(vaultPath, normalizedPath);
            }

            if (fs.existsSync(fullPath)) {
                return {
                    path: filePath,
                    basename: path.basename(filePath, path.extname(filePath)),
                    extension: path.extname(filePath).substring(1),
                    name: path.basename(filePath)
                } as IFile;
            }
            
            return null;
        });

        // Mock readFile to read actual file contents or from memory
        (mockApp.readFile as jest.Mock).mockImplementation(async (file: IFile) => {
            const normalizedPath = file.path.replace(/^\.\/vault\//, '');
            
            // Check in-memory storage first (for created files)
            if (fileStorage.has(normalizedPath) || fileStorage.has(`/${normalizedPath}`)) {
                return fileStorage.get(normalizedPath) || fileStorage.get(`/${normalizedPath}`)!;
            }
            
            let fullPath: string;
            
            if (file.path.includes('/config/') || file.extension === 'yaml') {
                fullPath = path.join(configPath, path.basename(file.path));
            }
            else if (file.path.includes('/data/') || file.extension === 'json') {
                const relativePath = file.path.split('/data/')[1] || path.basename(file.path);
                fullPath = path.join(dataPath, relativePath);
            }
            else {
                fullPath = path.join(vaultPath, normalizedPath);
            }

            if (fs.existsSync(fullPath)) {
                return fs.readFileSync(fullPath, 'utf-8');
            }
            
            throw new Error(`File not found: ${fullPath}`);
        });

        // Mock writeFile to store in memory
        (mockApp.writeFile as jest.Mock).mockImplementation(async (file: IFile, content: string) => {
            const normalizedPath = file.path.replace(/^\.\/vault\//, '');
            fileStorage.set(normalizedPath, content);
        });

        // Mock createFile and store in memory
        (mockApp.createFile as jest.Mock).mockImplementation(async (filePath: string, content: string) => {
            const normalizedPath = filePath.replace(/^\.\/vault\//, '');
            const file = {
                path: filePath,
                basename: path.basename(filePath, '.md'),
                extension: 'md',
                name: path.basename(filePath)
            } as IFile;
            fileStorage.set(normalizedPath, content);
            return file;
        });

        // Mock getMetadata
        (mockApp.getMetadata as jest.Mock).mockImplementation(async (file: IFile) => {
            const normalizedPath = file.path.replace(/^\.\/vault\//, '');
            const content = fileStorage.get(normalizedPath) || fileStorage.get(`/${normalizedPath}`) || '';
            
            const metadata: any = {};
            const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
            if (frontmatterMatch) {
                const yaml = require('js-yaml');
                Object.assign(metadata, yaml.load(frontmatterMatch[1]));
            }
            return metadata;
        });

        // Mock updateMetadata
        (mockApp.updateMetadata as jest.Mock).mockImplementation(async (file: IFile, metadata: any) => {
            const normalizedPath = file.path.replace(/^\.\/vault\//, '');
            const content = fileStorage.get(normalizedPath) || fileStorage.get(`/${normalizedPath}`) || '';
            
            // Extract body (after frontmatter)
            const bodyMatch = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
            const body = bodyMatch ? bodyMatch[1] : content;
            
            // Rebuild frontmatter
            const yaml = require('js-yaml');
            const newFrontmatter = yaml.dump(metadata);
            const newContent = `---\n${newFrontmatter}---\n${body}`;
            
            fileStorage.set(normalizedPath, newContent);
        });

        vault = new Vault(mockApp, { vaultPath } as any);
        factory = new DynamicClassFactory(configPath, vault);
    });

    afterEach(() => {
        fileStorage.clear();
    });

    describe('createInstanceFromDataObject', () => {
        it('should create a single instance from data object', async () => {
            const lieuData = {
                nom: 'TestVille',
                type: 'Commune',
                code_postal: '75000',
                population: 50000
            };

            const instance = await factory.createInstanceFromDataObject('Lieu', lieuData, vault);

            expect(instance).toBeDefined();
            expect(instance).not.toBeNull();
            expect(instance!.getFile()).toBeDefined();
        });

        it('should create instance with correct file path', async () => {
            const lieuData = {
                nom: 'Paris',
                type: 'Commune',
                code_postal: '75000'
            };

            const instance = await factory.createInstanceFromDataObject('Lieu', lieuData, vault);

            const file = instance!.getFile();
            expect(file!.getPath()).toContain('Paris');
            expect(file!.getPath()).toMatch(/\.md$/);
        });

        it('should store data properties in frontmatter', async () => {
            const lieuData = {
                nom: 'Lyon',
                type: 'Commune',
                code_postal: '69000',
                population: 500000
            };

            const instance = await factory.createInstanceFromDataObject('Lieu', lieuData, vault);
            const file = instance!.getFile()!.file as IFile;
            
            const metadata = await vault.app.getMetadata(file);
            
            expect(metadata.nom).toBe('Lyon');
            expect(metadata.type).toBe('Commune');
            expect(metadata.code_postal).toBe('69000');
            expect(metadata.population).toBe(500000);
            expect(metadata.Classe).toBe('Lieu');
        });

        it('should handle parent-child relationships', async () => {
            const allData = [
                { nom: 'France', type: 'National', parent: null },
                { nom: 'Île-de-France', type: 'Région', parent: 'France' }
            ];

            const regionData = allData[1];
            const instance = await factory.createInstanceFromDataObject('Lieu', regionData, vault, allData);

            const file = instance!.getFile()!.file as IFile;
            const metadata = await vault.app.getMetadata(file);
            
            expect(metadata.parent).toBeDefined();
            expect(metadata.parent).toContain('[[');
            expect(metadata.parent).toContain('France');
        });

        it('should create parent hierarchy recursively', async () => {
            const allData = [
                { nom: 'France', type: 'National', parent: null },
                { nom: 'Île-de-France', type: 'Région', parent: 'France' },
                { nom: 'Paris', type: 'Département', parent: 'Île-de-France' }
            ];

            const deptData = allData[2];
            await factory.createInstanceFromDataObject('Lieu', deptData, vault, allData);

            // Check that files were created (check all possible path formats)
            const allPaths = Array.from(fileStorage.keys());
            
            const parisCreated = allPaths.some(p => p.includes('Paris') && p.endsWith('.md'));
            const regionCreated = allPaths.some(p => p.includes('Île-de-France') && p.endsWith('.md'));
            const franceCreated = allPaths.some(p => p.includes('France') && p.endsWith('.md'));

            expect(parisCreated).toBe(true);
            expect(regionCreated).toBe(true);
            expect(franceCreated).toBe(true);
        });

        it('should not create duplicate instances', async () => {
            const lieuData = {
                nom: 'Marseille',
                type: 'Commune',
                code_postal: '13000'
            };

            const instance1 = await factory.createInstanceFromDataObject('Lieu', lieuData, vault);
            const instance2 = await factory.createInstanceFromDataObject('Lieu', lieuData, vault);

            // Both should reference the same file
            expect(instance1!.getFile()!.getPath()).toBe(instance2!.getFile()!.getPath());
        });
    });

    describe('folder structure creation', () => {
        it('should create proper folder hierarchy for nested entities', async () => {
            const data = {
                nom: 'Nice',
                type: 'Commune',
                parent: 'Alpes-Maritimes'
            };

            const parentData = {
                nom: 'Alpes-Maritimes',
                type: 'Département',
                parent: 'Provence-Alpes-Côte d\'Azur'
            };

            const grandParentData = {
                nom: 'Provence-Alpes-Côte d\'Azur',
                type: 'Région',
                parent: 'France'
            };

            const franceData = {
                nom: 'France',
                type: 'National',
                parent: null
            };

            const allData = [franceData, grandParentData, parentData, data];

            await factory.createInstanceFromDataObject('Lieu', data, vault, allData);

            // Verify files were created with proper hierarchy
            const allPaths = Array.from(fileStorage.keys());
            const niceCreated = allPaths.some(p => p.includes('Nice') && p.endsWith('Nice.md'));
            const alpesMaritimesCreated = allPaths.some(p => p.includes('Alpes-Maritimes') && p.endsWith('.md'));
            const provenceCreated = allPaths.some(p => p.includes('Provence-Alpes') && p.endsWith('.md'));
            
            expect(niceCreated).toBe(true);
            expect(alpesMaritimesCreated).toBe(true);
            expect(provenceCreated).toBe(true);
        });

        it('should handle special characters in folder names', async () => {
            const data = {
                nom: 'Saint-Étienne',
                type: 'Commune',
                code_postal: '42000'
            };

            const instance = await factory.createInstanceFromDataObject('Lieu', data, vault);

            const filePath = instance!.getFile()!.getPath();
            expect(filePath).toContain('Saint-Étienne');
        });

        it('should create files with minimal valid frontmatter', async () => {
            const data = {
                nom: 'Toulouse',
                type: 'Commune'
            };

            await factory.createInstanceFromDataObject('Lieu', data, vault);

            const files = Array.from(fileStorage.entries());
            const toulouseFile = files.find(([path]) => path.includes('Toulouse'));
            
            expect(toulouseFile).toBeDefined();
            
            const content = toulouseFile![1];
            expect(content).toContain('---');
            // YAML may quote strings, so check for both formats
            expect(content).toMatch(/Classe:\s*"?Lieu"?/);
            expect(content).toMatch(/nom:\s*"?Toulouse"?/);
            expect(content).toContain('# Toulouse');
        });

        it('should not create empty frontmatter blocks', async () => {
            const data = {
                nom: 'Bordeaux',
                type: 'Commune'
            };

            await factory.createInstanceFromDataObject('Lieu', data, vault);

            const files = Array.from(fileStorage.entries());
            const bordeauxFile = files.find(([path]) => path.includes('Bordeaux'));
            
            const content = bordeauxFile![1];
            
            // Should not have triple dashes or empty frontmatter
            expect(content).not.toMatch(/---\s*\n---\s*\n---/);
            expect(content.match(/---/g)?.length).toBe(2); // Only opening and closing
        });
    });

    describe('data loading from JSON', () => {
        it('should load all data from geo.json', async () => {
            const configManager = (factory as any).configManager;
            const data = await configManager.loadClassData('Lieu');

            expect(data).toBeDefined();
            expect(Array.isArray(data)).toBe(true);
            expect(data.length).toBeGreaterThan(0);
        });

        it('should parse data with correct structure', async () => {
            const configManager = (factory as any).configManager;
            const data = await configManager.loadClassData('Lieu');

            const firstItem = data[0];
            expect(firstItem).toHaveProperty('nom');
            expect(firstItem).toHaveProperty('type');
        });

        it('should preserve all data fields', async () => {
            const configManager = (factory as any).configManager;
            const data = await configManager.loadClassData('Lieu');

            const itemWithAllFields = data.find((item: any) => 
                item.code_postal && item.population && item.code_insee
            );

            expect(itemWithAllFields).toBeDefined();
            expect(itemWithAllFields.code_postal).toBeDefined();
            expect(itemWithAllFields.population).toBeDefined();
            expect(itemWithAllFields.code_insee).toBeDefined();
        });

        it('should handle hierarchical parent references', async () => {
            const configManager = (factory as any).configManager;
            const data = await configManager.loadClassData('Lieu');

            const itemsWithParents = data.filter((item: any) => item.parent);
            expect(itemsWithParents.length).toBeGreaterThan(0);

            for (const item of itemsWithParents) {
                expect(typeof item.parent).toBe('string');
                // Verify parent exists in data
                const parentExists = data.some((d: any) => d.nom === item.parent);
                expect(parentExists).toBe(true);
            }
        });
    });

    describe('parent instance resolution', () => {
        it('should find existing parent in vault', async () => {
            // Create parent first
            const parentData = {
                nom: 'TestRegion',
                type: 'Région',
                parent: null
            };

            await factory.createInstanceFromDataObject('Lieu', parentData, vault);

            // Create child
            const childData = {
                nom: 'TestDept',
                type: 'Département',
                parent: 'TestRegion'
            };

            const instance = await factory.createInstanceFromDataObject('Lieu', childData, vault, [parentData, childData]);

            const file = instance!.getFile()!.file as IFile;
            const metadata = await vault.app.getMetadata(file);
            
            expect(metadata.parent).toBeDefined();
            expect(metadata.parent).toContain('TestRegion');
        });

        it('should create missing parent from allData', async () => {
            const allData = [
                { nom: 'ParentCity', type: 'Commune', parent: null },
                { nom: 'ChildCity', type: 'Commune', parent: 'ParentCity' }
            ];

            // Create child without creating parent first
            const instance = await factory.createInstanceFromDataObject('Lieu', allData[1], vault, allData);

            // Verify both were created
            const allPaths = Array.from(fileStorage.keys());
            const childExists = allPaths.some(p => p.includes('ChildCity') && p.endsWith('.md'));
            const parentExists = allPaths.some(p => p.includes('ParentCity') && p.endsWith('.md'));

            expect(childExists).toBe(true);
            expect(parentExists).toBe(true);
        });

        it('should handle null parent correctly', async () => {
            const data = {
                nom: 'RootEntity',
                type: 'National',
                parent: null
            };

            const instance = await factory.createInstanceFromDataObject('Lieu', data, vault);

            const file = instance!.getFile()!.file as IFile;
            const metadata = await vault.app.getMetadata(file);
            
            expect(metadata.parent).toBeUndefined();
        });
    });

    describe('metadata management', () => {
        it('should always add Classe property', async () => {
            const data = {
                nom: 'TestLieu',
                type: 'Commune'
            };

            await factory.createInstanceFromDataObject('Lieu', data, vault);

            const files = Array.from(fileStorage.entries());
            const testFile = files.find(([path]) => path.includes('TestLieu'));
            
            const content = testFile![1];
            // YAML may quote strings
            expect(content).toMatch(/Classe:\s*"?Lieu"?/);
        });

        it('should only include defined properties in frontmatter', async () => {
            const data = {
                nom: 'TestCity',
                type: 'Commune',
                code_postal: '12345',
                undefinedProperty: 'should not appear'
            };

            await factory.createInstanceFromDataObject('Lieu', data, vault);

            const files = Array.from(fileStorage.entries());
            const testFile = files.find(([path]) => path.includes('TestCity'));
            const content = testFile![1];
            
            // YAML may quote strings
            expect(content).toMatch(/nom:\s*"?TestCity"?/);
            expect(content).toMatch(/type:\s*"?Commune"?/);
            expect(content).toMatch(/code_postal:/);
            expect(content).not.toContain('undefinedProperty');
        });

        it('should save parent link as wikilink', async () => {
            const allData = [
                { nom: 'Parent', type: 'Région', parent: null },
                { nom: 'Child', type: 'Département', parent: 'Parent' }
            ];

            await factory.createInstanceFromDataObject('Lieu', allData[1], vault, allData);

            const files = Array.from(fileStorage.entries());
            const childFile = files.find(([path]) => path.includes('Child'));
            const content = childFile![1];
            
            // Parent link should be a wikilink, may be quoted by YAML
            expect(content).toMatch(/parent:\s*"?\[\[.*Parent.*\]\]"?/);
        });
    });
});
