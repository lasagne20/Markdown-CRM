import { ProcessManager } from '../../src/Config/ProcessManager';
import { Classe } from '../../src/vault/Classe';
import { File } from '../../src/vault/File';

describe('ProcessManager - RenameFileAction with ObjectProperty placeholders', () => {
    let processManager: ProcessManager;
    let mockVault: any;
    let mockInstance: Classe;
    let mockFile: File;

    beforeEach(() => {
        // Mock Vault
        mockVault = {
            app: {
                getSettings: jest.fn().mockReturnValue({
                    classePropertyName: 'Classe'
                }),
                getMetadata: jest.fn().mockImplementation((file: any) => {
                    // Return metadata from the file mock
                    if (file && file.getMetadata) {
                        return file.getMetadata();
                    }
                    return Promise.resolve({});
                }),
                updateMetadata: jest.fn().mockResolvedValue(undefined),
                getFile: jest.fn().mockResolvedValue(null),
                move: jest.fn().mockResolvedValue(undefined),
                isFolder: jest.fn().mockReturnValue(false),
                createDiv: jest.fn((className?: string) => {
                    const div = document.createElement('div');
                    if (className) div.className = className;
                    return div;
                }),
                setIcon: jest.fn((element: HTMLElement, icon: string) => {
                    element.setAttribute('data-icon', icon);
                }),
                needDisplayRefresh: jest.fn()
            },
            getClasseFromName: jest.fn(),
            createFile: jest.fn(),
            getFromFile: jest.fn(),
            getFromLink: jest.fn(),
            updateFileFromData: jest.fn().mockResolvedValue(undefined),
            getDynamicClassFactory: jest.fn().mockReturnValue({
                getClass: jest.fn(),
                getClassConfig: jest.fn(),
                getConfigManager: jest.fn().mockReturnValue({
                    loadClassData: jest.fn().mockResolvedValue([])
                })
            })
        };

        // Mock File
        mockFile = {
            updateMetadata: jest.fn(),
            getMetadata: jest.fn().mockResolvedValue({
                Classe: 'Contrat',
                nom: 'Contrat-ABC',
                clients: [
                    { client: 'Acme Corp' },
                    { client: 'Tech Industries' }
                ]
            }),
            getClassePropertyValue: jest.fn().mockResolvedValue('Contrat'),
            path: 'Contrats/Contrat-ABC.md',
            basename: 'Contrat-ABC',
            getPath: jest.fn().mockReturnValue('Contrats/Contrat-ABC.md'),
            getFile: jest.fn().mockReturnValue({
                path: 'Contrats/Contrat-ABC.md'
            })
        } as any;

        // Mock Classe instance
        mockInstance = new Classe(mockVault, mockFile);

        processManager = new ProcessManager(mockVault);
    });

    describe('ObjectProperty array placeholder', () => {
        it('should rename file using {clients[0].client} placeholder', async () => {
            const classConfig = {
                className: 'Contrat',
                classIcon: '📄',
                properties: {},
                process: [
                    {
                        name: 'RenameContractProcess',
                        triggers: ['onUpdate' as const],
                        conditions: [], // No conditions - always execute
                        actions: [
                            {
                                type: 'RenameFileAction' as const,
                                template: '{clients[0].client} - {current}'
                            }
                        ]
                    }
                ]
            };

            mockVault.getDynamicClassFactory().getClassConfig.mockResolvedValue(classConfig);

            // Execute the process
            await processManager.runProcesses('Contrat', mockInstance, 'onUpdate');

            // Verify move was called with the correct new path
            expect(mockVault.app.move).toHaveBeenCalledWith(
                expect.anything(),
                'Contrats/Acme Corp - Contrat-ABC.md'
            );
        });

        it('should handle nested object property {clients[1].client}', async () => {
            const classConfig = {
                className: 'Contrat',
                classIcon: '📄',
                properties: {},
                process: [
                    {
                        name: 'RenameContractProcess',
                        triggers: ['onUpdate' as const],
                        conditions: [],
                        actions: [
                            {
                                type: 'RenameFileAction' as const,
                                template: '{clients[1].client} - {nom}'
                            }
                        ]
                    }
                ]
            };

            mockVault.getDynamicClassFactory().getClassConfig.mockResolvedValue(classConfig);

            await processManager.runProcesses('Contrat', mockInstance, 'onUpdate');

            expect(mockVault.app.move).toHaveBeenCalledWith(
                expect.anything(),
                'Contrats/Tech Industries - Contrat-ABC.md'
            );
        });

        it('should handle multiple array placeholders', async () => {
            // Add more complex metadata
            mockFile.getMetadata = jest.fn().mockResolvedValue({
                Classe: 'Contrat',
                nom: 'ABC123',
                clients: [
                    { client: 'Acme Corp', contact: 'John' },
                    { client: 'Tech Industries', contact: 'Jane' }
                ]
            });

            const classConfig = {
                className: 'Contrat',
                classIcon: '📄',
                properties: {},
                process: [
                    {
                        name: 'RenameContractProcess',
                        triggers: ['onUpdate' as const],
                        conditions: [],
                        actions: [
                            {
                                type: 'RenameFileAction' as const,
                                template: '{clients[0].client} - {clients[0].contact} - {nom}'
                            }
                        ]
                    }
                ]
            };

            mockVault.getDynamicClassFactory().getClassConfig.mockResolvedValue(classConfig);

            await processManager.runProcesses('Contrat', mockInstance, 'onUpdate');

            expect(mockVault.app.move).toHaveBeenCalledWith(
                expect.anything(),
                'Contrats/Acme Corp - John - ABC123.md'
            );
        });

        it('should return null when array index is out of bounds', async () => {
            mockFile.getMetadata = jest.fn().mockResolvedValue({
                Classe: 'Contrat',
                nom: 'ABC123',
                clients: [
                    { client: 'Acme Corp' }
                ]
            });

            const classConfig = {
                className: 'Contrat',
                classIcon: '📄',
                properties: {},
                process: [
                    {
                        name: 'RenameContractProcess',
                        triggers: ['onUpdate' as const],
                        conditions: [],
                        actions: [
                            {
                                type: 'RenameFileAction' as const,
                                template: '{clients[5].client} - {nom}'
                            }
                        ]
                    }
                ]
            };

            mockVault.getDynamicClassFactory().getClassConfig.mockResolvedValue(classConfig);

            await processManager.runProcesses('Contrat', mockInstance, 'onUpdate');

            // Should not attempt to rename when placeholder value is missing
            expect(mockVault.app.move).not.toHaveBeenCalled();
        });

        it('should handle {current} with array placeholder prefix', async () => {
            // Create a new mock file for this test with different basename
            const testFile = {
                ...mockFile,
                basename: 'Acme Corp - Old Name',
                path: 'Contrats/Acme Corp - Old Name.md',
                getPath: jest.fn().mockReturnValue('Contrats/Acme Corp - Old Name.md'),
                getFile: jest.fn().mockReturnValue({
                    path: 'Contrats/Acme Corp - Old Name.md'
                })
            } as any;

            // Create new instance with the test file
            const testInstance = new Classe(mockVault, testFile);

            const classConfig = {
                className: 'Contrat',
                classIcon: '📄',
                properties: {},
                process: [
                    {
                        name: 'RenameContractProcess',
                        triggers: ['onUpdate' as const],
                        conditions: [],
                        actions: [
                            {
                                type: 'RenameFileAction' as const,
                                template: '{clients[0].client} - {current}'
                            }
                        ]
                    }
                ]
            };

            mockVault.getDynamicClassFactory().getClassConfig.mockResolvedValue(classConfig);

            await processManager.runProcesses('Contrat', testInstance, 'onUpdate');

            // Should clean "Acme Corp - " from "Acme Corp - Old Name" → "Old Name"
            // Then rebuild as "Acme Corp - Old Name" → same name, no rename needed
            expect(mockVault.app.move).not.toHaveBeenCalled();
        });
    });
});
