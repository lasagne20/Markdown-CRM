import { ProcessManager } from '../../src/Config/ProcessManager';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';

describe('ProcessManager - CreateFileAction with placeholders', () => {
    let mockVault: any;
    let processManager: ProcessManager;
    let mockFactory: any;
    let mockPopulateManager: any;

    beforeEach(() => {
        mockFactory = {
            getClass: jest.fn()
        };

        mockPopulateManager = {
            populate: jest.fn()
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
            getFromLink: jest.fn(),
            getPopulateManager: jest.fn().mockReturnValue(mockPopulateManager)
        };

        processManager = new ProcessManager(mockVault as Vault);
    });

    describe('Placeholder support', () => {
        it('should replace {current} placeholder with current instance link', async () => {
            const mockClassConstructor = class extends Classe {
                static className = 'Personne';
            };
            
            const mockCurrentFile = {
                path: 'Institutions/Global Corp/Global Corp.md',
                basename: 'Global Corp',
                getPath: () => 'Institutions/Global Corp/Global Corp.md'
            };

            const mockInstance = new Classe(mockVault, mockCurrentFile as any);
            
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
                            institution: '{current}',
                            statut: 'Actif'
                        }
                    }
                ]
            };

            await processManager.execute(process, mockInstance);

            // Vault.createFile should be called with processed properties in args
            expect(mockVault.createFile).toHaveBeenCalledWith(
                mockClassConstructor,
                'New Person',
                {
                    properties: {
                        institution: 'Global Corp',
                        statut: 'Actif'
                    }
                }
            );
        });

        it('should replace property placeholders with property values', async () => {
            const mockClassConstructor = class extends Classe {
                static className = 'Personne';
            };
            
            const mockInstance = new Classe(mockVault, { path: 'test.md', basename: 'test' } as any);
            // Mock getMetadata for TemplateEngine
            mockInstance.getMetadata = jest.fn().mockResolvedValue({ nom: 'ACME Corp' });
            
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
                            company: '{nom}',
                            statut: 'Actif'
                        }
                    }
                ]
            };

            await processManager.execute(process, mockInstance);

            // TemplateEngine should read from metadata
            expect(mockInstance.getMetadata).toHaveBeenCalled();
            // Vault.createFile should be called with processed properties
            expect(mockVault.createFile).toHaveBeenCalledWith(
                mockClassConstructor,
                'New Person',
                {
                    properties: {
                        company: 'ACME Corp',
                        statut: 'Actif'
                    }
                }
            );
        });

        it('should populate properties before reading placeholder values', async () => {
            const mockClassConstructor = class extends Classe {
                static className = 'Personne';
            };
            
            const mockInstance = new Classe(mockVault, { path: 'test.md', basename: 'test' } as any);
            // Mock getMetadata for TemplateEngine
            mockInstance.getMetadata = jest.fn().mockResolvedValue({ institution: '[[Global Corp]]' });
            
            mockFactory.getClass.mockResolvedValue(mockClassConstructor);
            mockVault.createFile.mockResolvedValue({ path: 'test.md' });
            mockPopulateManager.populate.mockResolvedValue(undefined);

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
                            company: '{institution}',
                            statut: 'Actif'
                        }
                    }
                ]
            };

            await processManager.execute(process, mockInstance);

            // TemplateEngine should read from metadata
            expect(mockInstance.getMetadata).toHaveBeenCalled();
            // Link should be cleaned by TemplateEngine
            expect(mockVault.createFile).toHaveBeenCalledWith(
                mockClassConstructor,
                'New Person',
                {
                    properties: {
                        company: 'Global Corp',
                        statut: 'Actif'
                    }
                }
            );
        });
    });
});
