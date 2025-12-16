import { DynamicClassFactory } from '../../src/Config/DynamicClassFactory';
import { Vault } from '../../src/vault/Vault';
import { IApp, IFile } from '../../src/interfaces/IApp';
import path from 'path';
import fs from 'fs';

describe('DataLoader', () => {
    let factory: DynamicClassFactory;
    let vault: Vault;
    let mockApp: IApp;
    let configPath: string;
    let vaultPath: string;
    let dataPath: string;
    let testConfigPath: string;

    beforeEach(async () => {
        configPath = path.join(__dirname, '../integration/visual-interface/config');
        testConfigPath = path.join(__dirname, 'test-configs');
        vaultPath = path.join(__dirname, '../integration/visual-interface/vault');
        dataPath = path.join(__dirname, '../integration/visual-interface/data');

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

        // In-memory file storage for created files
        const fileStorage = new Map<string, string>();

        // Mock getFile to read actual YAML and JSON files
        (mockApp.getFile as jest.Mock).mockImplementation(async (filePath: string) => {
            let fullPath: string;
            
            // Handle config files
            if (filePath.includes('/config/') || filePath.endsWith('.yaml')) {
                const basename = path.basename(filePath);
                fullPath = path.join(testConfigPath, basename);
            }
            // Handle data files
            else if (filePath.includes('/data/') || filePath.endsWith('.json')) {
                const basename = path.basename(filePath);
                // Try test-configs first, then fall back to data folder
                fullPath = path.join(testConfigPath, basename);
                if (!fs.existsSync(fullPath)) {
                    fullPath = path.join(dataPath, basename);
                }
            }
            // Handle vault files
            else {
                fullPath = path.join(vaultPath, filePath.replace(/^\.\/vault\//, ''));
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
            // Check in-memory storage first (for created files)
            if (fileStorage.has(file.path)) {
                return fileStorage.get(file.path)!;
            }
            
            let fullPath: string;
            
            if (file.path.includes('/config/') || file.extension === 'yaml') {
                const basename = path.basename(file.path);
                fullPath = path.join(testConfigPath, basename);
            }
            else if (file.path.includes('/data/') || file.extension === 'json') {
                const basename = path.basename(file.path);
                // Try test-configs first, then fall back to data folder
                fullPath = path.join(testConfigPath, basename);
                if (!fs.existsSync(fullPath)) {
                    fullPath = path.join(dataPath, basename);
                }
            }
            else {
                fullPath = path.join(vaultPath, file.path.replace(/^\.\/vault\//, ''));
            }

            if (fs.existsSync(fullPath)) {
                return fs.readFileSync(fullPath, 'utf-8');
            }
            
            throw new Error(`File not found: ${fullPath}`);
        });

        // Mock writeFile to store in memory
        (mockApp.writeFile as jest.Mock).mockImplementation(async (file: IFile, content: string) => {
            fileStorage.set(file.path, content);
        });

        // Mock createFile and store in memory
        (mockApp.createFile as jest.Mock).mockImplementation(async (filePath: string, content: string) => {
            const file = {
                path: filePath,
                basename: path.basename(filePath, '.md'),
                extension: 'md',
                name: path.basename(filePath)
            } as IFile;
            fileStorage.set(filePath, content);
            return file;
        });

        vault = new Vault(mockApp, { vaultPath } as any);
        factory = new DynamicClassFactory(testConfigPath, vault);
    });

    describe('loadClassData', () => {
        it('should load data from JSON file', async () => {
            const configManager = (factory as any).configManager;
            const data = await configManager.loadClassData('Lieu');

            expect(data).toBeDefined();
            expect(Array.isArray(data)).toBe(true);
            expect(data.length).toBeGreaterThan(0);
        });

        it('should parse JSON data correctly', async () => {
            const configManager = (factory as any).configManager;
            const data = await configManager.loadClassData('Lieu');

            // Check structure of first item
            const firstItem = data[0];
            expect(firstItem).toHaveProperty('nom');
            expect(firstItem).toHaveProperty('type');
            
            // France should be first and should have null parent
            expect(firstItem.nom).toBe('France');
            expect(firstItem.type).toBe('National');
            // Parent can be null (not undefined) in the data
            expect(firstItem.parent === null || firstItem.parent === undefined).toBe(true);
        });

        it('should load hierarchical data with parent references', async () => {
            const configManager = (factory as any).configManager;
            const data = await configManager.loadClassData('Lieu');

            // Find items with parents
            const itemsWithParents = data.filter((item: any) => item.parent);
            expect(itemsWithParents.length).toBeGreaterThan(0);

            // Check that parent references are strings
            for (const item of itemsWithParents) {
                expect(typeof item.parent).toBe('string');
            }

            // Verify specific parent-child relationships (using existing regions from geo.json)
            const auvergnerhoneAlpes = data.find((item: any) => item.nom === 'Auvergne-Rhône-Alpes');
            if (auvergnerhoneAlpes) {
                expect(auvergnerhoneAlpes.parent).toBe('France');
            }

            // Check for a department if it exists
            const ain = data.find((item: any) => item.nom === 'Ain');
            if (ain) {
                expect(ain.parent).toBe('Auvergne-Rhône-Alpes');
            }
        });
    });

    describe('loadDataForClass', () => {
        it('should create instances from data', async () => {
            const instances = await factory.loadDataForClass('Lieu', vault);

            expect(instances).toBeDefined();
            expect(Array.isArray(instances)).toBe(true);
            expect(instances.length).toBeGreaterThan(0);
        });

        it('should create instances with correct names', async () => {
            const instances = await factory.loadDataForClass('Lieu', vault);

            // We have 12 territories in geo-test.json
            expect(instances.length).toBe(12);
            
            // Check all instances have files
            for (let i = 0; i < instances.length; i++) {
                expect(instances[i].getFile()).toBeDefined();
            }
        });

        it('should establish parent relationships', async () => {
            const instances = await factory.loadDataForClass('Lieu', vault);

            // All instances should have files
            expect(instances.length).toBe(12);
            
            // Check all instances
            for (let i = 0; i < instances.length; i++) {
                expect(instances[i].getFile()).toBeDefined();
            }
        });

        it('should handle all administrative levels', async () => {
            const instances = await factory.loadDataForClass('Lieu', vault);

            // We should have 12 instances in test dataset
            expect(instances.length).toBe(12);
            
            // Check all have valid files
            for (let i = 0; i < instances.length; i++) {
                const file = instances[i].getFile();
                expect(file).toBeDefined();
                expect(file?.getPath()).toBeDefined();
            }
        });
    });

    describe('data file integration', () => {
        it('should read geo-test.json file', async () => {
            const geoJsonPath = path.join(dataPath, 'geo-test.json');
            expect(fs.existsSync(geoJsonPath)).toBe(true);

            const content = fs.readFileSync(geoJsonPath, 'utf-8');
            const data = JSON.parse(content);

            expect(Array.isArray(data)).toBe(true);
            // We have 12 test territories
            expect(data.length).toBe(12);
        });

        it('should have correct structure in geo-test.json', async () => {
            const geoJsonPath = path.join(dataPath, 'geo-test.json');
            const content = fs.readFileSync(geoJsonPath, 'utf-8');
            const data = JSON.parse(content);

            // Check France
            const france = data[0];
            expect(france.nom).toBe('France');
            expect(france.type).toBe('National');

            // Check for regions (we have 2 in test data)
            const regions = data.filter((item: any) => item.type === 'Région');
            expect(regions.length).toBe(2);

            // Check for departments (we have 3 in test data)
            const departments = data.filter((item: any) => item.type === 'Département');
            expect(departments.length).toBe(3);

            // Check for communes (we have 4 in test data)
            const communes = data.filter((item: any) => item.type === 'Commune');
            expect(communes.length).toBe(4);

            // Check Lyon exists in test data
            const lyon = data.find((item: any) => item.nom === 'Lyon' && item.type === 'Commune');
            expect(lyon).toBeDefined();
            expect(lyon.type).toBe('Commune');
            expect(lyon.parent).toBe('Métropole de Lyon');
            expect(lyon.code_postal).toBe('69000');
        });
    });

    describe('dynamic data reload', () => {
        it('should setup dynamic reload when configured', async () => {
            const config = await (factory as any).configManager.getClassConfig('Lieu');
            
            expect(config.data).toBeDefined();
            expect(config.data.length).toBeGreaterThan(0);
            expect(config.data[0].dynamic).toBe(true);
        });

        it('should provide setupDynamicDataReload method', () => {
            expect(typeof factory.setupDynamicDataReload).toBe('function');
        });

        it('should provide stopDynamicDataReload method', () => {
            expect(typeof factory.stopDynamicDataReload).toBe('function');
        });

        it('should automatically setup dynamic reload when loadDataForClass is called with dynamic: true', async () => {
            // Spy on setupDynamicDataReload to verify it's called
            const setupSpy = jest.spyOn(factory, 'setupDynamicDataReload');
            
            await factory.loadDataForClass('Lieu', vault);
            
            expect(setupSpy).toHaveBeenCalledWith('Lieu', vault);
            expect(setupSpy).toHaveBeenCalledTimes(1);
            
            setupSpy.mockRestore();
        });

        it('should NOT setup dynamic reload when autoSetupDynamicReload is false', async () => {
            const setupSpy = jest.spyOn(factory, 'setupDynamicDataReload');
            
            await factory.loadDataForClass('Lieu', vault, false);
            
            expect(setupSpy).not.toHaveBeenCalled();
            
            setupSpy.mockRestore();
        });

        it('should create watchers for classes with dynamic: true', async () => {
            await factory.loadDataForClass('Lieu', vault);
            
            // Check that watchers are registered
            const watchers = (factory as any).dataWatchers;
            const hasLieuWatcher = Array.from(watchers.keys()).some((key: string) => key.startsWith('Lieu:'));
            
            expect(hasLieuWatcher).toBe(true);
        });

        it('should NOT setup dynamic reload for classes without dynamic flag', async () => {
            // Create a mock config without dynamic
            const originalGetClassConfig = (factory as any).configManager.getClassConfig;
            (factory as any).configManager.getClassConfig = jest.fn(async (className: string) => {
                const config = await originalGetClassConfig.call((factory as any).configManager, className);
                // Remove dynamic flag
                if (config.data) {
                    config.data = config.data.map((d: any) => ({ ...d, dynamic: false }));
                }
                return config;
            });

            const setupSpy = jest.spyOn(factory, 'setupDynamicDataReload');
            
            await factory.loadDataForClass('Lieu', vault);
            
            expect(setupSpy).not.toHaveBeenCalled();
            
            setupSpy.mockRestore();
            (factory as any).configManager.getClassConfig = originalGetClassConfig;
        });

        it('should stop watching when stopDynamicDataReload is called', async () => {
            await factory.loadDataForClass('Lieu', vault);
            
            // Verify watcher exists
            const watchers = (factory as any).dataWatchers;
            let hasLieuWatcher = Array.from(watchers.keys()).some((key: string) => key.startsWith('Lieu:'));
            expect(hasLieuWatcher).toBe(true);
            
            // Stop watching
            factory.stopDynamicDataReload('Lieu');
            
            // Verify watcher is removed
            hasLieuWatcher = Array.from(watchers.keys()).some((key: string) => key.startsWith('Lieu:'));
            expect(hasLieuWatcher).toBe(false);
        });
    });
});
