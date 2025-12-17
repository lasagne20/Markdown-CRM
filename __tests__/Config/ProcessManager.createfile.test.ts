import { ProcessManager } from '../../src/Config/ProcessManager';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { DynamicClassFactory } from '../../src/Config/DynamicClassFactory';

describe('ProcessManager - CreateFileAction', () => {
    let mockVault: any;
    let processManager: ProcessManager;
    let mockFactory: any;

    beforeEach(() => {
        mockFactory = {
            getClass: jest.fn()
        };

        mockVault = {
            app: {
                getMetadata: jest.fn(),
                updateMetadata: jest.fn(),
                createFile: jest.fn(),
                getSettings: jest.fn().mockReturnValue({}),
                open: jest.fn()
            },
            getDynamicClassFactory: jest.fn().mockReturnValue(mockFactory),
            createFile: jest.fn(),
            getFromFile: jest.fn(),
            getFromLink: jest.fn()
        };

        processManager = new ProcessManager(mockVault as Vault);
    });

    it('should create a new file using DynamicClassFactory.getClass', async () => {
        const mockClassConstructor = class extends Classe {
            static className = 'Personne';
        };
        
        mockFactory.getClass.mockResolvedValue(mockClassConstructor);
        mockVault.createFile.mockResolvedValue({ path: 'test.md' });
        mockVault.getFromFile.mockResolvedValue({
            updatePropertyValue: jest.fn()
        });

        const process = {
            name: 'CreatePersonProcess',
            triggers: [],
            conditions: [],
            actions: [
                {
                    type: 'CreateFileAction' as const,
                    className: 'Personne',
                    name: 'New Person',
                    properties: {
                        statut: 'Actif'
                    }
                }
            ]
        };

        const mockInstance = new Classe(mockVault, { path: 'test.md' } as any);

        await processManager.execute(process, mockInstance);

        expect(mockFactory.getClass).toHaveBeenCalledWith('Personne');
        expect(mockVault.createFile).toHaveBeenCalledWith(
            mockClassConstructor,
            'New Person',
            {
                properties: {
                    statut: 'Actif'
                }
            }
        );
    });

    it('should pass properties to Vault.createFile', async () => {
        const mockClassConstructor = class extends Classe {
            static className = 'Personne';
        };
        
        mockFactory.getClass.mockResolvedValue(mockClassConstructor);
        mockVault.createFile.mockResolvedValue({ path: 'test.md' });

        const process = {
            name: 'CreatePersonProcess',
            triggers: [],
            conditions: [],
            actions: [
                {
                    type: 'CreateFileAction' as const,
                    className: 'Personne',
                    name: 'New Person',
                    properties: {
                        statut: 'Actif',
                        institution: 'Test Corp'
                    }
                }
            ]
        };

        const mockInstance = new Classe(mockVault, { path: 'test.md' } as any);

        await processManager.execute(process, mockInstance);

        // Properties should be passed to Vault.createFile via args
        expect(mockVault.createFile).toHaveBeenCalledWith(
            mockClassConstructor,
            'New Person',
            {
                properties: {
                    statut: 'Actif',
                    institution: 'Test Corp'
                }
            }
        );
    });

    it('should open the newly created file', async () => {
        const mockClassConstructor = class extends Classe {
            static className = 'Personne';
        };
        
        const mockFile = { path: 'test.md' };
        
        mockFactory.getClass.mockResolvedValue(mockClassConstructor);
        mockVault.createFile.mockResolvedValue(mockFile);
        mockVault.getFromFile.mockResolvedValue({
            updatePropertyValue: jest.fn()
        });

        const process = {
            name: 'CreatePersonProcess',
            triggers: [],
            conditions: [],
            actions: [
                {
                    type: 'CreateFileAction' as const,
                    className: 'Personne',
                    name: 'New Person'
                }
            ]
        };

        const mockInstance = new Classe(mockVault, { path: 'test.md' } as any);

        await processManager.execute(process, mockInstance);

        expect(mockVault.app.open).toHaveBeenCalledWith('test.md');
    });

    it('should throw error if class not found', async () => {
        mockFactory.getClass.mockResolvedValue(null);

        const process = {
            name: 'CreatePersonProcess',
            triggers: [],
            conditions: [],
            actions: [
                {
                    type: 'CreateFileAction' as const,
                    className: 'NonExistentClass',
                    name: 'Test'
                }
            ]
        };

        const mockInstance = new Classe(mockVault, { path: 'test.md' } as any);

        await expect(processManager.execute(process, mockInstance)).rejects.toThrow('Class NonExistentClass not found');
    });
});
