import { TemplateEngine } from '../../src/Config/TemplateEngine';
import { Classe } from '../../src/vault/Classe';
import { FileProperty } from '../../src/properties/FileProperty';

describe('TemplateEngine - FileProperty Integration', () => {
    it('should use FileProperty.getPretty to format link values in templates', async () => {
        // Mock Vault with readLinkFile implementation
        const mockVault = {
            app: {
                getMetadata: jest.fn().mockResolvedValue({
                    client: '[[Acme Corporation]]',
                    projet: 'Project Alpha',
                    responsable: '[[John Doe]]'
                }),
                getSettings: jest.fn().mockReturnValue({})
            },
            readLinkFile: jest.fn((link, returnPath = false) => {
                // Simulate FileProperty.getPretty behavior
                const match = link.match(/\[\[([^\]]+)\]\]/);
                if (match) {
                    return returnPath ? `path/to/${match[1]}.md` : match[1];
                }
                return link;
            })
        } as any;

        // Mock file
        const mockFile = {
            basename: 'TestFile',
            getMetadata: jest.fn().mockResolvedValue({
                client: '[[Acme Corporation]]',
                projet: 'Project Alpha',
                responsable: '[[John Doe]]'
            })
        } as any;

        // Create instance
        const instance = new Classe(mockVault, mockFile);

        // Add FileProperty for 'client'
        const clientProperty = new FileProperty('client', mockVault, ['Client']);
        instance.addProperty(clientProperty);

        // Add FileProperty for 'responsable'
        const responsableProperty = new FileProperty('responsable', mockVault, ['Personne']);
        instance.addProperty(responsableProperty);

        // Process template
        const result = await TemplateEngine.processTemplateFromInstance(
            '{client} - {projet} - {responsable}',
            instance
        );

        // Verify getPretty was used for FileProperty values
        expect(mockVault.readLinkFile).toHaveBeenCalledWith('[[Acme Corporation]]');
        expect(mockVault.readLinkFile).toHaveBeenCalledWith('[[John Doe]]');
        
        // Result should have clean names without [[ ]]
        expect(result).toBe('Acme Corporation - Project Alpha - John Doe');
    });

    it('should work with complex template including FileProperty and nested properties', async () => {
        const mockVault = {
            app: {
                getMetadata: jest.fn().mockResolvedValue({
                    client: '[[Big Corp]]',
                    nom: 'Contract 2025',
                    montant: 50000,
                    details: {
                        statut: 'En cours',
                        date: '2025-01-15'
                    }
                }),
                getSettings: jest.fn().mockReturnValue({})
            },
            readLinkFile: jest.fn((link) => {
                const match = link.match(/\[\[([^\]]+)\]\]/);
                return match ? match[1] : link;
            })
        } as any;

        const mockFile = {
            basename: 'Contract2025',
            getMetadata: jest.fn().mockResolvedValue({
                client: '[[Big Corp]]',
                nom: 'Contract 2025',
                montant: 50000,
                details: {
                    statut: 'En cours',
                    date: '2025-01-15'
                }
            })
        } as any;

        const instance = new Classe(mockVault, mockFile);

        // Add FileProperty
        const clientProperty = new FileProperty('client', mockVault, ['Client']);
        instance.addProperty(clientProperty);

        // Template with mix of FileProperty, simple property and nested property
        const result = await TemplateEngine.processTemplateFromInstance(
            '{client} - {nom} - {details.statut}',
            instance
        );

        expect(result).toBe('Big Corp - Contract 2025 - En cours');
    });

    it('should handle empty FileProperty values gracefully', async () => {
        const mockVault = {
            app: {
                getMetadata: jest.fn().mockResolvedValue({
                    client: '',
                    nom: 'Test'
                }),
                getSettings: jest.fn().mockReturnValue({})
            },
            readLinkFile: jest.fn()
        } as any;

        const mockFile = {
            basename: 'TestFile',
            getMetadata: jest.fn().mockResolvedValue({
                client: '',
                nom: 'Test'
            })
        } as any;

        const instance = new Classe(mockVault, mockFile);
        const clientProperty = new FileProperty('client', mockVault, ['Client']);
        instance.addProperty(clientProperty);

        const result = await TemplateEngine.processTemplateFromInstance(
            '{client} - {nom}',
            instance
        );

        // Should return null when FileProperty value is empty
        expect(result).toBeNull();
    });

    it('should work with array of FileProperty values', async () => {
        const mockVault = {
            app: {
                getMetadata: jest.fn().mockResolvedValue({
                    clients: [
                        { client: '[[Client A]]' },
                        { client: '[[Client B]]' }
                    ],
                    nom: 'Multi-Client Project'
                }),
                getSettings: jest.fn().mockReturnValue({})
            },
            readLinkFile: jest.fn((link) => {
                const match = link.match(/\[\[([^\]]+)\]\]/);
                return match ? match[1] : link;
            })
        } as any;

        const mockFile = {
            basename: 'Project',
            getMetadata: jest.fn().mockResolvedValue({
                clients: [
                    { client: '[[Client A]]' },
                    { client: '[[Client B]]' }
                ],
                nom: 'Multi-Client Project'
            })
        } as any;

        const instance = new Classe(mockVault, mockFile);

        // Note: Array access doesn't use getPretty (uses metadata directly)
        // This is expected behavior for complex nested paths
        const result = await TemplateEngine.processTemplateFromInstance(
            '{clients[0].client} - {nom}',
            instance
        );

        // Array values come from metadata, not through getPretty
        expect(result).toBe('[[Client A]] - Multi-Client Project');
    });

    it('should handle complex Obsidian link format with path and alias', async () => {
        const mockVault = {
            app: {
                getMetadata: jest.fn().mockResolvedValue({
                    client: '[[path/.../Acme Corporation.md|Acme Corporation]]',
                    projet: 'Project Alpha'
                }),
                getSettings: jest.fn().mockReturnValue({})
            },
            readLinkFile: jest.fn((link, returnPath = false) => {
                // This should match the actual Vault.readLinkFile implementation
                // Match [[file|alias]] or [[file]]
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
            })
        } as any;

        const mockFile = {
            basename: 'TestFile',
            getMetadata: jest.fn().mockResolvedValue({
                client: '[[path/.../Acme Corporation.md|Acme Corporation]]',
                projet: 'Project Alpha'
            })
        } as any;

        const instance = new Classe(mockVault, mockFile);

        // Add FileProperty for 'client'
        const clientProperty = new FileProperty('client', mockVault, ['Client']);
        instance.addProperty(clientProperty);

        // Process template
        const result = await TemplateEngine.processTemplateFromInstance(
            '{client} - {projet}',
            instance
        );

        // Verify readLinkFile was called
        expect(mockVault.readLinkFile).toHaveBeenCalledWith('[[path/.../Acme Corporation.md|Acme Corporation]]');
        
        // Result should use the alias part (Acme Corporation)
        expect(result).toBe('Acme Corporation - Project Alpha');
    });

    it('should handle various Obsidian link formats correctly', async () => {
        const mockVault = {
            app: {
                getMetadata: jest.fn().mockResolvedValue({}),
                getSettings: jest.fn().mockReturnValue({})
            },
            readLinkFile: jest.fn((link, returnPath = false) => {
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
            })
        } as any;

        // Test various formats
        expect(mockVault.readLinkFile('[[Simple Link]]')).toBe('Simple Link');
        expect(mockVault.readLinkFile('[[File.md]]')).toBe('File');
        expect(mockVault.readLinkFile('[[File|Alias]]')).toBe('Alias');
        expect(mockVault.readLinkFile('[[path/to/File.md|Display Name]]')).toBe('Display Name');
        expect(mockVault.readLinkFile('[[path/.../Acme Corporation.md|Clean Name]]')).toBe('Clean Name');
        
        // Test path mode
        expect(mockVault.readLinkFile('[[File]]', true)).toBe('File.md');
        expect(mockVault.readLinkFile('[[File.md]]', true)).toBe('File.md');
        expect(mockVault.readLinkFile('[[path/to/File.md|Alias]]', true)).toBe('path/to/File.md');
    });
});
