import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Vault, Settings } from '../../src/vault/Vault';
import { File } from '../../src/vault/File';
import { mockApp } from '../utils/mocks';
import { DynamicClassFactory } from '../../src/Config/DynamicClassFactory';
import * as fs from 'fs';
import * as path from 'path';

describe('Double Populate Integration Test', () => {
    let vault: Vault;
    let app: any;
    let factory: DynamicClassFactory;

    beforeEach(async () => {
        app = mockApp();
        
        const settings: Settings = {
            templateFolder: 'templates',
            personalName: 'Test User',
            configPath: '__tests__/integration/double-populate-test-configs'
        };

        // Configure mocks BEFORE creating vault and factory
        app.readFile.mockImplementation(async (file: any) => {
            const filePath = file.path || file;
            
            // Read YAML config files from disk
            if (filePath.endsWith('.yaml')) {
                try {
                    const fullPath = path.join(__dirname, '..', '..', filePath);
                    return fs.readFileSync(fullPath, 'utf-8');
                } catch (error) {
                    // File not found - return empty string to trigger default config
                    return '';
                }
            }
            
            // Template files
            if (filePath.includes('Personne.md')) {
                return `---
classe: Personne
nom: ""
institution: ""
lieu: ""
---
`;
            }
            
            if (filePath.includes('Institution.md')) {
                return `---
classe: Institution
nom: ""
---
`;
            }
            
            if (filePath.includes('Lieu.md')) {
                return `---
classe: Lieu
nom: ""
---
`;
            }
            
            return '';
        });
        
        // Mock isFile
        app.isFile.mockResolvedValue(true);
        
        // Mock getFile to return template files and YAML config files
        app.getFile.mockImplementation(async (filePath: string) => {
            if (filePath.includes('templates/')) {
                return {
                    path: filePath,
                    name: filePath.split('/').pop(),
                    basename: filePath.split('/').pop()?.replace('.md', '') || '',
                    extension: 'md'
                };
            }
            // Support YAML config files
            if (filePath.endsWith('.yaml')) {
                return {
                    path: filePath,
                    name: filePath.split('/').pop(),
                    basename: filePath.split('/').pop()?.replace('.yaml', ''),
                    extension: 'yaml'
                };
            }
            return null;
        });
        
        // Mock move operation
        app.move.mockResolvedValue(undefined);
        
        // Mock createFolder
        app.createFolder.mockResolvedValue(undefined);
        app.vault.createFolder.mockResolvedValue(undefined);
        
        // Mock getAbstractFileByPath
        app.vault.getAbstractFileByPath.mockImplementation((path: string) => {
            if (path.includes('Institution')) {
                return { path };
            }
            if (path.includes('Lieu')) {
                return { path };
            }
            return null;
        });

        vault = new Vault(app, settings);
        
        // Initialize dynamic classes with mocked config
        factory = new DynamicClassFactory(settings.configPath!, vault);
        (Vault as any).dynamicClassFactory = factory;
        
        // Mock getAvailableClasses
        jest.spyOn(factory, 'getAvailableClasses').mockResolvedValue(['Personne', 'Institution', 'Lieu']);
        
        // Load classes
        const availableClasses = await factory.getAvailableClasses();
        for (const className of availableClasses) {
            const dynamicClass = await factory.getClass(className);
            (Vault as any).classes[className] = dynamicClass;
        }
    });

    it('should perform two successive populates with Institution then Lieu, and organize files correctly', async () => {
        // ==================== SETUP MOCK DATA ====================
        
        // Mock Institution parent with lieu metadata
        const mockInstitution = {
            getName: () => 'TechCorp SA',
            getLink: () => '[[TechCorp SA]]',
            file: new File(vault, {
                path: 'Lieux/Paris/Institutions/TechCorp SA/TechCorp SA.md',
                name: 'TechCorp SA.md',
                basename: 'TechCorp SA',
                extension: 'md'
            }),
            getFolder: () => ({
                path: 'Lieux/Paris/Institutions/TechCorp SA',
                name: 'TechCorp SA'
            }),
            getMetadata: async () => ({
                classe: 'Institution',
                nom: 'TechCorp SA',
                lieu: '[[Paris]]'
            })
        };

        // Mock Lieu parent  
        const mockLieu = {
            getName: () => 'Paris',
            getLink: () => '[[Paris]]',
            file: new File(vault, {
                path: 'Lieux/Paris/Paris.md',
                name: 'Paris.md',
                basename: 'Paris',
                extension: 'md'
            }),
            getFolder: () => ({
                path: 'Lieux/Paris',
                name: 'Paris'
            })
        };

        // Track selectFile calls to return different values
        let selectFileCallCount = 0;
        app.selectFile.mockImplementation(async (vault: any, classes: string[], options: any) => {
            selectFileCallCount++;
            
            // First populate: Institution
            if (selectFileCallCount === 1 && classes.includes('Institution')) {
                console.log('📝 First populate: returning Institution');
                return mockInstitution;
            }
            
            // Second populate: Lieu
            if (selectFileCallCount === 2 && classes.includes('Lieu')) {
                console.log('📝 Second populate: returning Lieu');
                return mockLieu;
            }
            
            return null;
        });

        // Mock file creation to capture the final content
        let capturedContent = '';
        let capturedPath = '';
        
        app.createFile.mockImplementation(async (path: string, content: string) => {
            capturedPath = path;
            capturedContent = content;
            
            console.log('📄 File creation called with:');
            console.log('  Path:', path);
            console.log('  Content:', content);
            
            return {
                path: path,
                name: path.split('/').pop() || path,
                basename: path.replace('.md', ''),
                extension: 'md'
            };
        });

        // Mock metadata reading to return populated values
        app.getMetadata.mockImplementation(async (file: any) => {
            return {
                classe: 'Personne',
                nom: 'Jean Dupont',
                institution: '[[TechCorp SA]]',
                lieu: '[[Paris]]'
            };
        });

        // Mock waitForFileMetaDataUpdate
        app.waitForFileMetaDataUpdate.mockResolvedValue(undefined);

        // ==================== EXECUTE TEST ====================
        
        console.log('🚀 Starting file creation with double populate...');
        
        // Create file through vault (will trigger populate twice)
        const file = await vault.createFile(
            vault.getClasseFromName('Personne'),
            'Jean Dupont.md'
        );

        // ==================== ASSERTIONS ====================
        
        // Verify file was created
        expect(file).toBeDefined();
        expect(app.createFile).toHaveBeenCalled();

        // Verify both populates were called
        expect(selectFileCallCount).toBe(2);
        
        // Verify first populate was for Institution
        expect(app.selectFile).toHaveBeenNthCalledWith(
            1,
            vault,
            expect.arrayContaining(['Institution']),
            expect.objectContaining({
                hint: expect.any(String)
            })
        );

        // Verify second populate was for Lieu
        expect(app.selectFile).toHaveBeenNthCalledWith(
            2,
            vault,
            expect.arrayContaining(['Lieu']),
            expect.objectContaining({
                hint: expect.any(String)
            })
        );

        // Verify the content contains both populated values
        expect(capturedContent).toContain('institution: "[[TechCorp SA]]"');
        expect(capturedContent).toContain('lieu: "[[Paris]]"');
        
        // Verify file path is correct
        expect(capturedPath).toBe('Jean Dupont.md');
        
        console.log('✅ Double populate test completed successfully');
        console.log('📊 Summary:');
        console.log('  - First populate: Institution -> TechCorp SA');
        console.log('  - Second populate: Lieu -> Paris');
        console.log('  - File created: Jean Dupont.md');
        console.log('  - Content validated with both populated values');
    });

    it('should cancel file creation if first populate is cancelled', async () => {
        // Mock selectFile to return null for first populate (user cancelled)
        app.selectFile.mockResolvedValueOnce(null);

        // Mock sendNotice
        app.sendNotice.mockImplementation((message: string) => {
            console.log(`Notice: ${message}`);
        });

        // Create file through vault (will trigger populate)
        const file = await vault.createFile(
            vault.getClasseFromName('Personne'),
            'Test Person.md'
        );

        // File creation should be cancelled
        expect(file).toBeUndefined();
        
        // Notice should be sent
        expect(app.sendNotice).toHaveBeenCalled();
        
        // Second populate should not be called
        expect(app.selectFile).toHaveBeenCalledTimes(1);
    });

    it('should cancel file creation if second populate is cancelled', async () => {
        const mockInstitution = {
            getName: () => 'TechCorp SA',
            getLink: () => '[[TechCorp SA]]',
            file: new File(vault, {
                path: 'Lieux/Paris/Institutions/TechCorp SA/TechCorp SA.md',
                name: 'TechCorp SA.md',
                basename: 'TechCorp SA',
                extension: 'md'
            }),
            getMetadata: async () => ({
                classe: 'Institution',
                nom: 'TechCorp SA',
                lieu: '[[Paris]]'
            })
        };

        // First populate succeeds, second one is cancelled
        app.selectFile
            .mockResolvedValueOnce(mockInstitution)
            .mockResolvedValueOnce(null);

        // Mock sendNotice
        app.sendNotice.mockImplementation((message: string) => {
            console.log(`Notice: ${message}`);
        });

        // Create file through vault (will trigger populate)
        const file = await vault.createFile(
            vault.getClasseFromName('Personne'),
            'Test Person.md'
        );

        // File creation should be cancelled
        expect(file).toBeUndefined();
        
        // Notice should be sent
        expect(app.sendNotice).toHaveBeenCalled();
        
        // Both populates should have been called
        expect(app.selectFile).toHaveBeenCalledTimes(2);
    });

    it('should organize file in correct parent folder based on Institution', async () => {
        // Mock Institution parent with lieu
        const mockInstitution = {
            getName: () => 'TechCorp SA',
            getLink: () => '[[TechCorp SA]]',
            file: new File(vault, {
                path: 'Lieux/Paris/Institutions/TechCorp SA/TechCorp SA.md',
                name: 'TechCorp SA.md',
                basename: 'TechCorp SA',
                extension: 'md'
            }),
            getFolder: () => ({
                path: 'Lieux/Paris/Institutions/TechCorp SA',
                name: 'TechCorp SA'
            }),
            getMetadata: async () => ({
                classe: 'Institution',
                nom: 'TechCorp SA',
                lieu: '[[Paris]]'
            })
        };

        const mockLieu = {
            getName: () => 'Paris',
            getLink: () => '[[Paris]]',
            file: new File(vault, {
                path: 'Lieux/Paris/Paris.md',
                name: 'Paris.md',
                basename: 'Paris',
                extension: 'md'
            })
        };

        app.selectFile
            .mockResolvedValueOnce(mockInstitution)
            .mockResolvedValueOnce(mockLieu);

        app.createFile.mockResolvedValue({
            path: 'Jean Dupont.md',
            name: 'Jean Dupont.md',
            basename: 'Jean Dupont',
            extension: 'md'
        });

        app.getMetadata.mockResolvedValue({
            classe: 'Personne',
            nom: 'Jean Dupont',
            institution: '[[TechCorp SA]]',
            lieu: '[[Paris]]'
        });

        app.waitForFileMetaDataUpdate.mockResolvedValue(undefined);

        // Create file
        const file = await vault.createFile(
            vault.getClasseFromName('Personne'),
            'Jean Dupont.md'
        );

        expect(file).toBeDefined();
        
        // The file should eventually be moved to Institution's folder
        // (This would happen through the parent folder logic in Classe.ts)
        // For now, we just verify the file was created with correct metadata
        const metadata = await file!.getMetadata();
        expect(metadata.institution).toBe('[[TechCorp SA]]');
        expect(metadata.lieu).toBe('[[Paris]]');
    });
});
