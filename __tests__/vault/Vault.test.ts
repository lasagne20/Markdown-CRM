import { Vault } from '../../src/vault/Vault';

// Mock DynamicClassFactory pour éviter les erreurs
jest.mock('../../src/Config/DynamicClassFactory', () => ({
    DynamicClassFactory: jest.fn().mockImplementation(() => ({
        getAvailableClasses: jest.fn().mockResolvedValue([]),
        getClass: jest.fn()
    }))
}));

describe('Vault', () => {
    let vault: Vault;
    let mockApp: any;
    let mockSettings: any;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Create mock app
        mockApp = {
            getVaultPath: jest.fn(() => '/test/path'),
            getName: jest.fn(() => 'TestVault'),
            listFiles: jest.fn(() => Promise.resolve([])),
            listFolders: jest.fn(() => Promise.resolve([])),
            getMetadata: jest.fn(),
            sendNotice: jest.fn()
        };

        // Create mock settings
        mockSettings = {
            templateFolder: 'Templates',
            personalName: 'TestUser',
            configPath: './test-config'
        };
        
        // Create vault instance
        vault = new Vault(mockApp, mockSettings);
    });

    describe('constructor', () => {
        it('should create vault instance with app and settings', () => {
            expect(vault).toBeInstanceOf(Vault);
            expect(vault.app).toBe(mockApp);
            expect(vault.settings).toBe(mockSettings);
        });
    });

    describe('getPath', () => {
        it('should return vault path from app', () => {
            const path = vault.getPath();
            expect(path).toBe('/test/path');
            expect(mockApp.getVaultPath).toHaveBeenCalled();
        });
    });

    describe('getName', () => {
        it('should return vault name from app', () => {
            const name = vault.getName();
            expect(name).toBe('TestVault');
            expect(mockApp.getName).toHaveBeenCalled();
        });
    });

    describe('getPersonalName', () => {
        it('should return personal name from settings', () => {
            const personalName = vault.getPersonalName();
            expect(personalName).toBe('TestUser');
        });
    });

    describe('readLinkFile', () => {
        it('should parse wikilinks correctly', () => {
            expect(vault.readLinkFile('[[test]]')).toBe('test');
            expect(vault.readLinkFile('[[test|alias]]')).toBe('alias');
            expect(vault.readLinkFile('[[folder/test]]')).toBe('test');
        });

        it('should return path when path=true', () => {
            expect(vault.readLinkFile('[[test]]', true)).toBe('test.md');
            expect(vault.readLinkFile('[[test.pdf]]', true)).toBe('test.pdf');
        });

        it('should handle invalid input', () => {
            expect(vault.readLinkFile('')).toBe('');
            expect(vault.readLinkFile(null as any)).toBe('');
            expect(vault.readLinkFile('invalid')).toBe('invalid');
        });
    });

    describe('getDynamicClassFactory', () => {
        it('should return dynamic class factory', () => {
            const factory = vault.getDynamicClassFactory();
            expect(factory).toBeDefined();
        });
    });

    describe('getClasseFromName', () => {
        beforeEach(() => {
            // Initialize static classes property
            (Vault as any).classes = {};
        });

        it('should return undefined for non-existent class', () => {
            const classe = vault.getClasseFromName('NonExistent');
            expect(classe).toBeUndefined();
        });
    });
});