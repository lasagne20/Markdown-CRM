import { ClassConfigManager } from '../../src/Config/ClassConfigManager';
import { ConfigLoader } from '../../src/Config/ConfigLoader';

// Mock ConfigLoader
jest.mock('../../src/Config/ConfigLoader');

describe('ClassConfigManager', () => {
    let configManager: ClassConfigManager;
    let mockConfigLoader: jest.Mocked<ConfigLoader>;
    let mockApp: any;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockApp = {
            getVaultPath: jest.fn(() => '/test/vault'),
            getName: jest.fn(() => 'TestVault')
        };

        // Create mock config loader with correct methods
        mockConfigLoader = {
            loadClassConfig: jest.fn(),
            getAllClassNames: jest.fn()
        } as any;

        // Mock the constructor
        (ConfigLoader as jest.MockedClass<typeof ConfigLoader>).mockImplementation(() => mockConfigLoader);
        
        configManager = new ClassConfigManager('./test-config', mockApp);
    });

    describe('constructor', () => {
        it('should create instance with config loader', () => {
            expect(ConfigLoader).toHaveBeenCalledWith('./test-config', mockApp);
        });
    });

    describe('createDynamicClasse', () => {
        it('should create dynamic class from config', async () => {
            const mockConfig = {
                className: 'TestClass',
                classIcon: 'test-icon',
                properties: {},
                displayContainer: {
                    template: 'default',
                    components: []
                }
            };

            mockConfigLoader.loadClassConfig.mockResolvedValue(mockConfig);
            
            const DynamicClass = await configManager.createDynamicClasse('TestClass');
            
            expect(mockConfigLoader.loadClassConfig).toHaveBeenCalledWith('TestClass');
            expect(DynamicClass).toBeDefined();
            
            // Test instance creation
            const mockVault = { app: mockApp } as any;
            const mockFile = { path: 'test.md' } as any;
            const instance = new DynamicClass(mockVault, mockFile);
            
            expect(instance.name).toBe('TestClass');
            expect(instance.icon).toBe('test-icon');
        });

        it('should return cached class if already loaded', async () => {
            const mockConfig = {
                className: 'TestClass',
                classIcon: 'test-icon',
                properties: {},
                displayContainer: {
                    template: 'default',
                    components: []
                }
            };

            mockConfigLoader.loadClassConfig.mockResolvedValue(mockConfig);
            
            // First call
            const firstClass = await configManager.createDynamicClasse('TestClass');
            
            // Second call - should return cached version
            jest.clearAllMocks();
            const secondClass = await configManager.createDynamicClasse('TestClass');
            
            expect(firstClass).toBe(secondClass);
            expect(mockConfigLoader.loadClassConfig).not.toHaveBeenCalled();
        });

        it('should handle config loading errors', async () => {
            const error = new Error('Config not found');
            mockConfigLoader.loadClassConfig.mockRejectedValue(error);
            
            await expect(configManager.createDynamicClasse('NonExistentClass'))
                .rejects.toThrow('Config not found');
        });
    });

    describe('getClassConfig', () => {
        it('should delegate to config loader', async () => {
            const mockConfig = {
                className: 'TestClass',
                classIcon: 'test-icon',
                properties: {},
                displayContainer: { template: 'default' }
            };
            
            mockConfigLoader.loadClassConfig.mockResolvedValue(mockConfig);
            
            const result = await configManager.getClassConfig('TestClass');
            
            expect(mockConfigLoader.loadClassConfig).toHaveBeenCalledWith('TestClass');
            expect(result).toBe(mockConfig);
        });
    });

    describe('getAvailableClasses', () => {
        it('should call getAllClassNames method', async () => {
            // Mock the getAllClassNames method on configLoader
            (mockConfigLoader as any).getAllClassNames = jest.fn().mockResolvedValue(['TestClass']);
            
            const result = await configManager.getAvailableClasses();
            
            expect(result).toEqual(['TestClass']);
        });
    });

    describe('clearCache', () => {
        it('should clear loaded classes cache', () => {
            // Add something to cache first
            (configManager as any).loadedClasses.set('TestClass', class {});
            
            expect((configManager as any).loadedClasses.size).toBe(1);
            
            configManager.clearCache();
            
            expect((configManager as any).loadedClasses.size).toBe(0);
        });
    });
});