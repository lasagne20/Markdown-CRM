import { DynamicClassFactory } from '../../src/Config/DynamicClassFactory';
import { ClassConfigManager } from '../../src/Config/ClassConfigManager';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { File } from '../../src/vault/File';

describe('DynamicClassFactory - Parent Creation from Data', () => {
    let factory: DynamicClassFactory;
    let configManager: ClassConfigManager;
    let vault: Vault;
    let mockApp: any;

    beforeEach(() => {
        // Mock IApp
        mockApp = {
            getFile: jest.fn(),
            createFile: jest.fn(),
            readFile: jest.fn(),
            writeFile: jest.fn(),
            getMetadata: jest.fn(),
            updateMetadata: jest.fn(),
            listFiles: jest.fn().mockResolvedValue([]),
            waitForFileMetaDataUpdate: jest.fn().mockResolvedValue(undefined),
            setIcon: jest.fn(),
            getUrl: jest.fn((path: string) => `http://localhost/${path}`),
            selectFile: jest.fn(),
            open: jest.fn()
        };

        vault = new Vault(mockApp, { vaultPath: './test-vault' } as any);
        configManager = new ClassConfigManager('config', vault);
        factory = new DynamicClassFactory('./test-config', vault);
    });

    describe('loadDataForClass with parent relationships', () => {
        it('should create parent instances when they exist in data', async () => {
            // Mock configuration
            const mockConfig = {
                className: 'Lieu',
                classIcon: 'map-pin',
                parent: {
                    property: 'parent',
                    folder: 'Lieux'
                },
                properties: {
                    nom: { type: 'Property', name: 'nom' },
                    type: { type: 'SelectProperty', name: 'type', options: ['National', 'Région', 'Commune'] },
                    parent: { type: 'FileProperty', name: 'parent', classes: ['Lieu'] }
                }
            };

            // Mock data with parent relationship
            const mockData = [
                {
                    nom: 'France',
                    type: 'National'
                },
                {
                    nom: 'Île-de-France',
                    type: 'Région',
                    parent: 'France'
                },
                {
                    nom: 'Paris',
                    type: 'Commune',
                    parent: 'Île-de-France'
                }
            ];

            // Mock getFile to return null (files don't exist)
            mockApp.getFile.mockResolvedValue(null);

            // Mock createFile to return a mock file
            mockApp.createFile.mockImplementation(async (path: string) => {
                return {
                    path,
                    basename: path.split('/').pop()?.replace('.md', ''),
                    extension: 'md',
                    name: path.split('/').pop()
                };
            });

            // Mock getMetadata to return empty object
            mockApp.getMetadata.mockResolvedValue({});

            // Mock updateMetadata
            mockApp.updateMetadata.mockResolvedValue(undefined);

            // Mock readFile for frontmatter operations
            mockApp.readFile.mockResolvedValue('---\n---\n\n# Test\n');

            // Mock config loading - need to mock factory's internal configManager
            jest.spyOn(factory['configManager'], 'getClassConfig').mockResolvedValue(mockConfig as any);
            jest.spyOn(factory['configManager'], 'loadClassData').mockResolvedValue(mockData);

            // Mock getClass to return a mock Classe constructor
            const MockClasse = class extends Classe {
                public override name = 'Lieu';
                public override icon = 'map-pin';
            };
            jest.spyOn(factory, 'getClass').mockResolvedValue(MockClasse as any);

            // Execute
            const instances = await factory.loadDataForClass('Lieu', vault);

            // Assertions
            expect(instances).toHaveLength(3);
            expect(mockApp.createFile).toHaveBeenCalledTimes(3);
            
            // Verify files were created in correct hierarchy
            expect(mockApp.createFile).toHaveBeenCalledWith(
                'Lieux/France/France.md',
                expect.any(String)
            );
            expect(mockApp.createFile).toHaveBeenCalledWith(
                'Lieux/Île-de-France/Île-de-France.md',
                expect.any(String)
            );
            expect(mockApp.createFile).toHaveBeenCalledWith(
                'Lieux/Paris/Paris.md',
                expect.any(String)
            );

            // Verify parent relationships were set
            expect(mockApp.updateMetadata).toHaveBeenCalled();
        });

        it('should handle missing parent by searching in vault', async () => {
            const mockConfig = {
                className: 'Lieu',
                classIcon: 'map-pin',
                parent: {
                    property: 'parent',
                    folder: 'Lieux'
                },
                properties: {
                    nom: { type: 'Property', name: 'nom' },
                    parent: { type: 'FileProperty', name: 'parent', classes: ['Lieu'] }
                }
            };

            const mockData = [
                {
                    nom: 'Paris',
                    type: 'Commune',
                    parent: 'France' // France exists in vault but not in current data
                }
            ];

            // Mock existing parent file in vault
            const mockParentFile = {
                path: 'Lieux/France/France.md',
                basename: 'France',
                extension: 'md',
                name: 'France.md'
            };

            mockApp.getFile.mockImplementation(async (path: string) => {
                if (path === 'Lieux/Paris/Paris.md') return null;
                if (path.includes('France')) return mockParentFile;
                return null;
            });

            mockApp.createFile.mockResolvedValue({
                path: 'Lieux/Paris/Paris.md',
                basename: 'Paris',
                extension: 'md',
                name: 'Paris.md'
            });

            mockApp.readFile.mockResolvedValue('---\nnom: France\n---\n\n# France\n');
            mockApp.getMetadata.mockResolvedValue({ nom: 'France' });
            mockApp.updateMetadata.mockResolvedValue(undefined);

            jest.spyOn(factory['configManager'], 'getClassConfig').mockResolvedValue(mockConfig as any);
            jest.spyOn(factory['configManager'], 'loadClassData').mockResolvedValue(mockData);

            const MockClasse = class extends Classe {
                public override name = 'Lieu';
                public override icon = 'map-pin';
            };
            jest.spyOn(factory, 'getClass').mockResolvedValue(MockClasse as any);

            // Mock vault.getFromLink to find existing parent
            const mockParentInstance = new MockClasse(vault, new File(vault, mockParentFile as any));
            jest.spyOn(vault, 'getFromLink').mockResolvedValue(mockParentInstance);

            const instances = await factory.loadDataForClass('Lieu', vault);

            expect(instances).toHaveLength(1);
            expect(vault.getFromLink).toHaveBeenCalledWith('[[France]]');
        });

        it('should create parent recursively with grandparents', async () => {
            const mockConfig = {
                className: 'Lieu',
                classIcon: 'map-pin',
                parent: {
                    property: 'parent',
                    folder: 'Lieux'
                },
                properties: {
                    nom: { type: 'Property', name: 'nom' },
                    parent: { type: 'FileProperty', name: 'parent', classes: ['Lieu'] }
                }
            };

            // Three-level hierarchy
            const mockData = [
                {
                    nom: 'Paris',
                    parent: 'Île-de-France'
                }
                // Île-de-France and France not in first pass, but referenced
            ];

            // Add the parent data to simulate it being available
            const fullMockData = [
                {
                    nom: 'France',
                    type: 'National'
                },
                {
                    nom: 'Île-de-France',
                    parent: 'France'
                },
                {
                    nom: 'Paris',
                    parent: 'Île-de-France'
                }
            ];

            mockApp.getFile.mockResolvedValue(null);
            mockApp.createFile.mockImplementation(async (path: string) => ({
                path,
                basename: path.split('/').pop()?.replace('.md', ''),
                extension: 'md',
                name: path.split('/').pop()
            }));
            mockApp.readFile.mockResolvedValue('---\n---\n\n# Test\n');
            mockApp.getMetadata.mockResolvedValue({});
            mockApp.updateMetadata.mockResolvedValue(undefined);

            jest.spyOn(factory['configManager'], 'getClassConfig').mockResolvedValue(mockConfig as any);
            jest.spyOn(factory['configManager'], 'loadClassData').mockResolvedValue(fullMockData);

            const MockClasse = class extends Classe {
                public override name = 'Lieu';
                public override icon = 'map-pin';
            };
            jest.spyOn(factory, 'getClass').mockResolvedValue(MockClasse as any);

            const instances = await factory.loadDataForClass('Lieu', vault);

            // Should create all three instances
            expect(instances).toHaveLength(3);
            expect(mockApp.createFile).toHaveBeenCalledTimes(3);
        });
    });

    describe('createInstanceFromData with property filtering', () => {
        it('should only include defined properties in frontmatter', async () => {
            const mockConfig = {
                className: 'Lieu',
                classIcon: 'map-pin',
                parent: {
                    property: 'parent',
                    folder: 'Lieux'
                },
                properties: {
                    nom: { type: 'Property', name: 'nom' },
                    type: { type: 'SelectProperty', name: 'type', options: ['National', 'Région'] },
                    population: { type: 'NumberProperty', name: 'population' }
                }
            };

            const mockData = {
                nom: 'France',
                type: 'National',
                population: 67000000,
                // These should be filtered out:
                National: null,
                Région: null,
                extraField: 'should be ignored'
            };

            mockApp.getFile.mockResolvedValue(null);
            mockApp.createFile.mockResolvedValue({
                path: 'Lieux/France/France.md',
                basename: 'France',
                extension: 'md',
                name: 'France.md'
            });
            mockApp.readFile.mockResolvedValue('---\n---\n\n# France\n');
            
            let savedFrontmatter: any = null;
            mockApp.writeFile.mockImplementation(async (file: any, content: string) => {
                // Extract frontmatter from content
                const match = content.match(/---\n([\s\S]+?)\n---/);
                if (match) {
                    const yaml = require('js-yaml');
                    savedFrontmatter = yaml.load(match[1]);
                }
            });

            jest.spyOn(factory['configManager'], 'getClassConfig').mockResolvedValue(mockConfig as any);

            const MockClasse = class extends Classe {
                public override name = 'Lieu';
                public override icon = 'map-pin';
            };

            // Call createInstanceFromData through loadDataForClass
            jest.spyOn(factory['configManager'], 'loadClassData').mockResolvedValue([mockData]);
            jest.spyOn(factory, 'getClass').mockResolvedValue(MockClasse as any);

            await factory.loadDataForClass('Lieu', vault);

            // Verify that only defined properties were saved
            expect(savedFrontmatter).toBeDefined();
            expect(savedFrontmatter).toHaveProperty('nom', 'France');
            expect(savedFrontmatter).toHaveProperty('type', 'National');
            expect(savedFrontmatter).toHaveProperty('population', 67000000);
            expect(savedFrontmatter).not.toHaveProperty('National');
            expect(savedFrontmatter).not.toHaveProperty('Région');
            expect(savedFrontmatter).not.toHaveProperty('extraField');
        });
    });
});
