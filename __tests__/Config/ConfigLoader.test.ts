import { ConfigLoader } from '../../src/Config/ConfigLoader';

describe('ConfigLoader', () => {
    let configLoader: ConfigLoader;
    let mockApp: any;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockApp = {
            vault: {
                adapter: {
                    fs: {
                        readFileSync: jest.fn()
                    }
                }
            },
            getVaultPath: jest.fn(() => '/test/vault'),
            getName: jest.fn(() => 'TestVault')
        };
        
        configLoader = new ConfigLoader('./test-config', mockApp);
    });

    describe('constructor', () => {
        it('should create instance with config path and app', () => {
            expect(configLoader).toBeInstanceOf(ConfigLoader);
        });
    });

    describe('loadClassConfig', () => {
        it('should throw error when no app provided', async () => {
            const loaderWithoutApp = new ConfigLoader('./test-config');
            
            await expect(loaderWithoutApp.loadClassConfig('TestClass'))
                .rejects.toThrow('Configuration not found for class: TestClass');
        });

        it('should handle config loading errors', async () => {
            await expect(configLoader.loadClassConfig('NonExistent'))
                .rejects.toThrow('Configuration not found for class: NonExistent');
        });
    });
});