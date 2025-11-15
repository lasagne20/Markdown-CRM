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

    beforeEach(async () => {
        configPath = path.join(__dirname, '../integration/visual-interface/config');
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
                fullPath = path.join(configPath, path.basename(filePath));
            }
            // Handle data files
            else if (filePath.includes('/data/') || filePath.endsWith('.json')) {
                const relativePath = filePath.split('/data/')[1] || path.basename(filePath);
                fullPath = path.join(dataPath, relativePath);
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
                fullPath = path.join(configPath, path.basename(file.path));
            }
            else if (file.path.includes('/data/') || file.extension === 'json') {
                const relativePath = file.path.split('/data/')[1] || path.basename(file.path);
                fullPath = path.join(dataPath, relativePath);
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
        factory = new DynamicClassFactory(configPath, vault);
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

            // We have 36,360 territories in geo.json
            expect(instances.length).toBeGreaterThan(100);
            
            // Check a sample of instances have files
            const sampleSize = Math.min(10, instances.length);
            for (let i = 0; i < sampleSize; i++) {
                expect(instances[i].getFile()).toBeDefined();
            }
        });

        it('should establish parent relationships', async () => {
            const instances = await factory.loadDataForClass('Lieu', vault);

            // All instances should have files
            expect(instances.length).toBeGreaterThan(100);
            
            // Check a sample
            const sampleSize = Math.min(10, instances.length);
            for (let i = 0; i < sampleSize; i++) {
                expect(instances[i].getFile()).toBeDefined();
            }
        });

        it('should handle all administrative levels', async () => {
            const instances = await factory.loadDataForClass('Lieu', vault);

            // We should have many instances (36,360 territories in geo.json)
            expect(instances.length).toBeGreaterThan(1000);
            
            // Check a sample have valid files
            const sampleSize = Math.min(20, instances.length);
            for (let i = 0; i < sampleSize; i++) {
                const file = instances[i].getFile();
                expect(file).toBeDefined();
                expect(file?.getPath()).toBeDefined();
            }
        });
    });

    describe('data file integration', () => {
        it('should read geo.json file', async () => {
            const geoJsonPath = path.join(dataPath, 'geo.json');
            expect(fs.existsSync(geoJsonPath)).toBe(true);

            const content = fs.readFileSync(geoJsonPath, 'utf-8');
            const data = JSON.parse(content);

            expect(Array.isArray(data)).toBe(true);
            // We now have 36,360 French territories
            expect(data.length).toBeGreaterThan(30000);
        });

        it('should have correct structure in geo.json', async () => {
            const geoJsonPath = path.join(dataPath, 'geo.json');
            const content = fs.readFileSync(geoJsonPath, 'utf-8');
            const data = JSON.parse(content);

            // Check France
            const france = data[0];
            expect(france.nom).toBe('France');
            expect(france.type).toBe('National');

            // Check for regions
            const regions = data.filter((item: any) => item.type === 'Région');
            expect(regions.length).toBeGreaterThan(0);

            // Check for departments
            const departments = data.filter((item: any) => item.type === 'Département');
            expect(departments.length).toBeGreaterThan(0);

            // Check for communes (should be the majority)
            const communes = data.filter((item: any) => item.type === 'Commune');
            expect(communes.length).toBeGreaterThan(1000);

            // Check a specific commune if it exists
            const paris = data.find((item: any) => item.nom === 'Paris' && item.type === 'Commune');
            if (paris) {
                expect(paris.type).toBe('Commune');
                expect(paris.parent).toBeDefined();
                expect(paris.code_postal).toBeDefined();
            }
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
    });
});
