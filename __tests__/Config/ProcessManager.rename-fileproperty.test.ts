import { ProcessManager } from '../../src/Config/ProcessManager';
import { Vault } from '../../src/vault/Vault';
import { FileProperty } from '../../src/properties/FileProperty';

describe('ProcessManager - FileProperty in Rename Templates', () => {
    let mockVault: any;
    let processManager: ProcessManager;

    beforeEach(() => {
        mockVault = {
            app: {
                getMetadata: jest.fn(),
                updateMetadata: jest.fn(),
                listFiles: jest.fn().mockResolvedValue([]),
                getSettings: jest.fn().mockReturnValue({}),
                moveFile: jest.fn().mockResolvedValue(undefined)
            },
            readLinkFile: jest.fn((link, returnPath = false) => {
                // Match the actual Vault.readLinkFile implementation
                const match = link.match(/^\[\[(.*?)(?:\|([^\]]+?))?\]\]$/);
                if (match) {
                    const fileName = match[1]?.trim();
                    const alias = match[2]?.trim();
                    if (returnPath) {
                        return /\.[^\/\\]+$/.test(fileName) ? fileName : `${fileName}.md`;
                    } else {
                        return alias ? alias : fileName.split("/").pop()?.replace(".md","") || "";
                    }
                }
                return link.trim();
            }),
            getDynamicClassFactory: jest.fn().mockReturnValue({
                getConfigManager: jest.fn().mockReturnValue({
                    getConfig: jest.fn().mockReturnValue({
                        classes: {
                            Action: {
                                properties: {
                                    clients: { type: 'object' },
                                    date: { type: 'date' },
                                    etat: { type: 'text' }
                                },
                                rename: '{date} - Action {clients[0].client} - {current}'
                            }
                        }
                    })
                })
            })
        };

        processManager = new ProcessManager(mockVault as Vault);
    });

    it('should clean FileProperty link format in array placeholders before sanitizing filename', async () => {
        const mockFile = {
            path: 'France/OCC/Actions/test3855.md',
            basename: 'test3855',
            name: 'test3855.md',
            parent: {
                path: 'France/OCC/Actions'
            },
            getMetadata: jest.fn().mockResolvedValue({
                classe: 'Action',
                clients: [
                    { client: '[[France/OCC/OCC.md|OCC]]' }
                ],
                etat: 'Piste',
                date: '2025-12-17'
            })
        } as any;

        mockVault.app.getMetadata.mockResolvedValue({
            classe: 'Action',
            clients: [
                { client: '[[France/OCC/OCC.md|OCC]]' }
            ],
            etat: 'Piste',
            date: '2025-12-17'
        });

        const result = await (processManager as any).generateFileName(
            '{date} - Action {clients[0].client} - {current}',
            {
                getFile: () => mockFile,
                getMetadata: () => ({
                    classe: 'Action',
                    clients: [
                        { client: '[[France/OCC/OCC.md|OCC]]' }
                    ],
                    etat: 'Piste',
                    date: '2025-12-17'
                }),
                getProperty: (name: string) => {
                    if (name === 'date') {
                        return {
                            getPretty: (value: string) => value
                        };
                    }
                    return undefined;
                }
            }
        );

        // Should NOT contain [[ ]] / | characters
        // Should be: "2025-12-17 - Action OCC - test3855"
        expect(result).toBe('2025-12-17 - Action OCC - test3855');
        expect(result).not.toContain('[[');
        expect(result).not.toContain(']]');
        expect(result).not.toContain('|');
        expect(result).not.toContain('/');
    });

    it('should handle simple FileProperty link format', async () => {
        const mockFile = {
            path: 'Actions/test.md',
            basename: 'test',
            name: 'test.md',
            parent: {
                path: 'Actions'
            },
            getMetadata: jest.fn().mockResolvedValue({
                classe: 'Action',
                client: '[[Acme Corporation]]',
                date: '2025-12-17'
            })
        } as any;

        mockVault.app.getMetadata.mockResolvedValue({
            classe: 'Action',
            client: '[[Acme Corporation]]',
            date: '2025-12-17'
        });

        const result = await (processManager as any).generateFileName(
            '{date} - {client} - {current}',
            {
                getFile: () => mockFile,
                getMetadata: () => ({
                    classe: 'Action',
                    client: '[[Acme Corporation]]',
                    date: '2025-12-17'
                }),
                getProperty: (name: string) => {
                    if (name === 'date') {
                        return {
                            getPretty: (value: string) => value
                        };
                    }
                    if (name === 'client') {
                        return new FileProperty('client', mockVault, ['Client']);
                    }
                    return undefined;
                }
            }
        );

        // Should use getPretty for FileProperty
        expect(result).toBe('2025-12-17 - Acme Corporation - test');
    });

    it('should handle FileProperty with path and alias in simple placeholders', async () => {
        const mockFile = {
            path: 'Actions/test.md',
            basename: 'test',
            name: 'test.md',
            parent: {
                path: 'Actions'
            },
            getMetadata: jest.fn().mockResolvedValue({
                classe: 'Action',
                client: '[[path/to/Client Name.md|Client Name]]',
                date: '2025-12-17'
            })
        } as any;

        mockVault.app.getMetadata.mockResolvedValue({
            classe: 'Action',
            client: '[[path/to/Client Name.md|Client Name]]',
            date: '2025-12-17'
        });

        const result = await (processManager as any).generateFileName(
            '{date} - {client}',
            {
                getFile: () => mockFile,
                getMetadata: () => ({
                    classe: 'Action',
                    client: '[[path/to/Client Name.md|Client Name]]',
                    date: '2025-12-17'
                }),
                getProperty: (name: string) => {
                    if (name === 'date') {
                        return {
                            getPretty: (value: string) => value
                        };
                    }
                    if (name === 'client') {
                        return new FileProperty('client', mockVault, ['Client']);
                    }
                    return undefined;
                }
            }
        );

        // Should extract alias via getPretty
        expect(result).toBe('2025-12-17 - Client Name');
    });
});
