import { DynamicClassFactory } from '../../src/Config/DynamicClassFactory';
import { ClassConfigManager } from '../../src/Config/ClassConfigManager';
import { Classe } from '../../src/vault/Classe';

// Mock ClassConfigManager
jest.mock('../../src/Config/ClassConfigManager');

describe('DynamicClassFactory', () => {
    let factory: DynamicClassFactory;
    let mockConfigManager: jest.Mocked<ClassConfigManager>;
    let mockApp: any;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockApp = {
            getVaultPath: jest.fn(() => '/test/vault'),
            getName: jest.fn(() => 'TestVault')
        };

        // Create mock config manager with the correct methods
        mockConfigManager = {
            createDynamicClasse: jest.fn(),
            getClassConfig: jest.fn(),
            getAvailableClasses: jest.fn(),
            clearCache: jest.fn()
        } as any;

        // Mock the constructor
        (ClassConfigManager as jest.MockedClass<typeof ClassConfigManager>).mockImplementation(() => mockConfigManager);
        
        factory = new DynamicClassFactory('./test-config', mockApp);
    });

    describe('constructor', () => {
        it('should create instance with config manager', () => {
            expect(ClassConfigManager).toHaveBeenCalledWith('./test-config', mockApp);
        });
    });

    describe('getClass', () => {
        it('should return cached class if already registered', async () => {
            const MockClass = class extends Classe {} as any;
            
            // First call - should call createDynamicClasse
            mockConfigManager.createDynamicClasse.mockResolvedValue(MockClass);
            
            const firstResult = await factory.getClass('TestClass');
            expect(firstResult).toBe(MockClass);
            expect(mockConfigManager.createDynamicClasse).toHaveBeenCalledWith('TestClass');
            
            // Second call - should return cached version
            jest.clearAllMocks();
            const secondResult = await factory.getClass('TestClass');
            expect(secondResult).toBe(MockClass);
            expect(mockConfigManager.createDynamicClasse).not.toHaveBeenCalled();
        });

        it('should create new class if not cached', async () => {
            const MockClass = class extends Classe {} as any;
            mockConfigManager.createDynamicClasse.mockResolvedValue(MockClass);
            
            const result = await factory.getClass('NewClass');
            
            expect(result).toBe(MockClass);
            expect(mockConfigManager.createDynamicClasse).toHaveBeenCalledWith('NewClass');
        });
    });

    describe('createInstance', () => {
        it('should create instance of dynamic class', async () => {
            const mockVault = { app: mockApp } as any;
            const mockFile = { path: 'test.md' } as any;
            
            const MockClass = jest.fn();
            MockClass.mockImplementation(function(this: any, vault: any, file: any) {
                this.vault = vault;
                this.file = file;
                this.displayConfig = undefined;
            });
            
            mockConfigManager.createDynamicClasse.mockResolvedValue(MockClass as any);
            mockConfigManager.getClassConfig.mockResolvedValue({ className: 'TestClass' } as any);
            
            const instance = await factory.createInstance('TestClass', mockApp, mockVault, mockFile);
            
            expect(MockClass).toHaveBeenCalledWith(mockVault, mockFile);
            expect(instance).toBeInstanceOf(MockClass);
        });
    });

    describe('getAvailableClasses', () => {
        it('should delegate to config manager', async () => {
            const mockClasses = ['Class1', 'Class2', 'Class3'];
            mockConfigManager.getAvailableClasses.mockResolvedValue(mockClasses);
            
            const result = await factory.getAvailableClasses();
            
            expect(result).toEqual(mockClasses);
            expect(mockConfigManager.getAvailableClasses).toHaveBeenCalled();
        });
    });

    describe('clearCache', () => {
        it('should clear both config manager and class registry', async () => {
            const MockClass = class extends Classe {} as any;
            mockConfigManager.createDynamicClasse.mockResolvedValue(MockClass);
            
            // Add class to registry
            await factory.getClass('TestClass');
            
            // Clear cache
            factory.clearCache();
            
            expect(mockConfigManager.clearCache).toHaveBeenCalled();
            
            // Should call createDynamicClasse again after clearing
            jest.clearAllMocks();
            await factory.getClass('TestClass');
            expect(mockConfigManager.createDynamicClasse).toHaveBeenCalledWith('TestClass');
        });
    });
});