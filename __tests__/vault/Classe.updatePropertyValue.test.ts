import { Classe } from '../../src/vault/Classe';
import { Vault } from '../../src/vault/Vault';
import { mockApp } from '../utils/mocks';

describe('Classe - updatePropertyValue with object/array values', () => {
    let vault: Vault;
    let app: any;
    let classe: Classe;
    let mockRunProcesses: jest.SpyInstance;

    beforeEach(() => {
        app = mockApp();
        vault = new Vault(app, {
            vaultPath: './test-vault',
            configPath: '__tests__/Config/test-configs'
        } as any);
        classe = new Classe(vault);
        
        // Mock the file
        (classe as any).file = {
            getPath: () => 'test.md',
            getName: () => 'test.md'
        };

        // Spy on the private runProcesses method
        mockRunProcesses = jest.spyOn(classe as any, 'runProcesses').mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should trigger onPropertyChange for primitive value change', async () => {
        // Setup
        app.getMetadata.mockResolvedValue({ name: 'John' });
        app.updateMetadata.mockResolvedValue(undefined);

        // Execute
        await classe.updatePropertyValue('name', 'Jane');

        // Verify
        expect(mockRunProcesses).toHaveBeenCalledWith('onPropertyChange', 'name');
    });

    test('should NOT trigger onPropertyChange when primitive value stays the same', async () => {
        // Setup
        app.getMetadata.mockResolvedValue({ name: 'John' });
        app.updateMetadata.mockResolvedValue(undefined);

        // Execute
        await classe.updatePropertyValue('name', 'John');

        // Verify
        expect(mockRunProcesses).not.toHaveBeenCalledWith('onPropertyChange', 'name');
    });

    test('should trigger onPropertyChange for object value change (currently FAILS)', async () => {
        // Setup - old metadata with object
        const oldObject = { client: 'Acme', amount: 1000 };
        app.getMetadata.mockResolvedValue({ details: oldObject });
        app.updateMetadata.mockResolvedValue(undefined);

        // Execute - update with different object
        const newObject = { client: 'Acme', amount: 2000 };
        await classe.updatePropertyValue('details', newObject);

        // Verify - This should trigger onPropertyChange but currently doesn't
        // because oldValue and value are both references to the same object
        expect(mockRunProcesses).toHaveBeenCalledWith('onPropertyChange', 'details');
    });

    test('should trigger onPropertyChange for array value change (currently FAILS)', async () => {
        // Setup - old metadata with array
        const oldArray = [{ name: 'Item 1' }, { name: 'Item 2' }];
        app.getMetadata.mockResolvedValue({ items: oldArray });
        app.updateMetadata.mockResolvedValue(undefined);

        // Execute - update with different array
        const newArray = [{ name: 'Item 1' }, { name: 'Item 2' }, { name: 'Item 3' }];
        await classe.updatePropertyValue('items', newArray);

        // Verify - This should trigger onPropertyChange but currently doesn't
        expect(mockRunProcesses).toHaveBeenCalledWith('onPropertyChange', 'items');
    });

    test('should trigger onPropertyChange when array item is modified', async () => {
        // Setup
        const existingArray = [{ client: 'Acme' }, { client: 'Tech' }];
        app.getMetadata.mockResolvedValue({ clients: existingArray });
        app.updateMetadata.mockResolvedValue(undefined);

        // Execute - modify array item
        const modifiedArray = [{ client: 'Acme Corp' }, { client: 'Tech' }];
        await classe.updatePropertyValue('clients', modifiedArray);

        // Verify
        expect(mockRunProcesses).toHaveBeenCalledWith('onPropertyChange', 'clients');
    });

    test('should NOT trigger onPropertyChange when object stays identical', async () => {
        // Setup
        app.getMetadata.mockResolvedValue({ details: { status: 'active', count: 5 } });
        app.updateMetadata.mockResolvedValue(undefined);

        // Execute - update with identical object
        await classe.updatePropertyValue('details', { status: 'active', count: 5 });

        // Verify
        expect(mockRunProcesses).not.toHaveBeenCalledWith('onPropertyChange', 'details');
    });

    test('should trigger onPropertyChange when nested object property changes', async () => {
        // Setup
        app.getMetadata.mockResolvedValue({ 
            data: { 
                user: { name: 'John', age: 30 },
                settings: { theme: 'dark' }
            } 
        });
        app.updateMetadata.mockResolvedValue(undefined);

        // Execute
        await classe.updatePropertyValue('data', { 
            user: { name: 'John', age: 31 },
            settings: { theme: 'dark' }
        });

        // Verify
        expect(mockRunProcesses).toHaveBeenCalledWith('onPropertyChange', 'data');
    });
});
