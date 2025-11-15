import { File } from '../../src/vault/File';
import { Vault } from '../../src/vault/Vault';

describe('File - YAML Frontmatter with forceQuotes', () => {
    let file: File;
    let mockVault: Vault;
    let mockApp: any;
    let mockFile: any;

    beforeEach(() => {
        mockFile = {
            path: 'test/file.md',
            basename: 'file',
            extension: 'md',
            name: 'file.md'
        };

        mockApp = {
            readFile: jest.fn(),
            writeFile: jest.fn(),
            getFile: jest.fn().mockResolvedValue(mockFile),
            createFile: jest.fn(),
            getMetadata: jest.fn(),
            updateMetadata: jest.fn(),
            listFiles: jest.fn().mockResolvedValue([]),
            waitForFileMetaDataUpdate: jest.fn().mockResolvedValue(undefined),
            setIcon: jest.fn(),
            getUrl: jest.fn(),
            selectFile: jest.fn(),
            open: jest.fn()
        };

        mockVault = new Vault(mockApp, { vaultPath: './test-vault' } as any);
        file = new File(mockVault, mockFile);
    });

    describe('updateMetadata with links', () => {
        it('should properly quote Obsidian links to avoid YAML flow format', async () => {
            const initialContent = `---
nom: Montreuil
type: Commune
parent:
---

# Montreuil
`;

            mockApp.readFile.mockResolvedValue(initialContent);

            let writtenContent = '';
            mockApp.writeFile.mockImplementation(async (f: any, content: string) => {
                writtenContent = content;
            });

            await file.updateMetadata('parent', '[[Métropole du Grand Paris]]');

            // Verify the link is properly quoted
            expect(writtenContent).toContain('parent: "[[Métropole du Grand Paris]]"');
            // Should not contain the problematic >- format
            expect(writtenContent).not.toContain('>-');
            expect(writtenContent).not.toContain('parent:\n  -');
        });

        it('should handle multi-file properties as arrays', async () => {
            const initialContent = `---
nom: Paris
contacts: []
---

# Paris
`;

            mockApp.readFile.mockResolvedValue(initialContent);

            let writtenContent = '';
            mockApp.writeFile.mockImplementation(async (f: any, content: string) => {
                writtenContent = content;
            });

            await file.updateMetadata('contacts', ['[[Marie Dupont]]', '[[Sophie Bernard]]']);

            // Verify array format is correct
            expect(writtenContent).toContain('contacts:');
            expect(writtenContent).toContain('"[[Marie Dupont]]"');
            expect(writtenContent).toContain('"[[Sophie Bernard]]"');
            // Should use multi-line array format
            expect(writtenContent).toMatch(/contacts:\s*\n\s*-\s*".*"/);
        });

        it('should handle empty strings correctly', async () => {
            const initialContent = `---
nom: Test
description:
---

# Test
`;

            mockApp.readFile.mockResolvedValue(initialContent);

            let writtenContent = '';
            mockApp.writeFile.mockImplementation(async (f: any, content: string) => {
                writtenContent = content;
            });

            await file.updateMetadata('description', '');

            expect(writtenContent).toContain('description: ""');
        });

        it('should handle special characters in strings', async () => {
            const initialContent = `---
nom: Test
---

# Test
`;

            mockApp.readFile.mockResolvedValue(initialContent);

            let writtenContent = '';
            mockApp.writeFile.mockImplementation(async (f: any, content: string) => {
                writtenContent = content;
            });

            const specialText = 'Text with: colons, [brackets], and "quotes"';
            await file.updateMetadata('description', specialText);

            // Should be properly quoted
            expect(writtenContent).toContain('description: "');
        });

        it('should preserve other frontmatter properties', async () => {
            const initialContent = `---
nom: Montreuil
type: Commune
code_insee: "93048"
population: 109914
---

# Montreuil
`;

            mockApp.readFile.mockResolvedValue(initialContent);

            let writtenContent = '';
            mockApp.writeFile.mockImplementation(async (f: any, content: string) => {
                writtenContent = content;
            });

            await file.updateMetadata('parent', '[[Métropole du Grand Paris]]');

            // All original properties should be preserved
            expect(writtenContent).toContain('nom: "Montreuil"');
            expect(writtenContent).toContain('type: "Commune"');
            expect(writtenContent).toContain('code_insee: "93048"');
            expect(writtenContent).toContain('population: 109914');
            expect(writtenContent).toContain('parent: "[[Métropole du Grand Paris]]"');
        });
    });

    describe('saveFrontmatter with forceQuotes', () => {
        it('should use forceQuotes option when saving', async () => {
            const initialContent = `---
nom: Test
---

# Test
`;

            mockApp.readFile.mockResolvedValue(initialContent);

            let writtenContent = '';
            mockApp.writeFile.mockImplementation(async (f: any, content: string) => {
                writtenContent = content;
            });

            await file.saveFrontmatter({
                nom: 'Montreuil',
                parent: '[[Métropole du Grand Paris]]',
                contacts: ['[[Marie Dupont]]']
            });

            // All strings should be quoted
            expect(writtenContent).toContain('nom: "Montreuil"');
            expect(writtenContent).toContain('parent: "[[Métropole du Grand Paris]]"');
            expect(writtenContent).toContain('"[[Marie Dupont]]"');
        });

        it('should handle complex nested structures', async () => {
            const initialContent = `---
---

# Test
`;

            mockApp.readFile.mockResolvedValue(initialContent);

            let writtenContent = '';
            mockApp.writeFile.mockImplementation(async (f: any, content: string) => {
                writtenContent = content;
            });

            await file.saveFrontmatter({
                nom: 'Test',
                metadata: {
                    created: '2024-01-01',
                    author: '[[John Doe]]'
                },
                tags: ['important', 'review']
            });

            expect(writtenContent).toContain('nom: "Test"');
            expect(writtenContent).toContain('created: "2024-01-01"');
            expect(writtenContent).toContain('"[[John Doe]]"');
        });
    });

    describe('formatFrontmatter', () => {
        it('should use consistent YAML options', () => {
            const frontmatter = {
                nom: 'Montreuil',
                parent: '[[Métropole du Grand Paris]]',
                contacts: ['[[Marie Dupont]]', '[[Sophie Bernard]]']
            };

            const formatted = file.formatFrontmatter(frontmatter);

            // Should be properly formatted with quotes
            expect(formatted).toContain('nom: "Montreuil"');
            expect(formatted).toContain('parent: "[[Métropole du Grand Paris]]"');
            expect(formatted).toContain('"[[Marie Dupont]]"');
            expect(formatted).toContain('"[[Sophie Bernard]]"');
            // Should not use flow format
            expect(formatted).not.toContain('>-');
        });
    });
});
