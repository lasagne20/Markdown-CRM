import { File, Folder } from '../../src/vault/File';
import { Vault } from '../../src/vault/Vault';
import { IFile } from '../../src/interfaces/IApp';
import * as jsYaml from 'js-yaml';

// Mock UUID
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid-1234')
}));

// Mock js-yaml
jest.mock('js-yaml');
const mockJsYaml = jsYaml as jest.Mocked<typeof jsYaml>;

// Mock implementations
const mockApp = {
    getFile: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    renameFile: jest.fn(),
    move: jest.fn(),
    getMetadata: jest.fn(),
    updateMetadata: jest.fn(),
    waitForFileMetaDataUpdate: jest.fn()
};

const mockVault = {
    app: mockApp,
    getFromLink: jest.fn()
} as unknown as Vault;

let mockIFile: IFile;

describe('Folder', () => {
    it('should create Folder instance', () => {
        const folder = new Folder();
        expect(folder).toBeInstanceOf(Folder);
    });
});

describe('File', () => {
    let file: File;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Recreate mockIFile for each test to avoid mutations
        mockIFile = {
            name: 'test.md',
            path: 'folder/test.md',
            basename: 'test',
            extension: 'md'
        };
        
        file = new File(mockVault, mockIFile);
        
        // Reset mock implementations
        mockJsYaml.load.mockReturnValue({ testKey: 'testValue' });
        mockJsYaml.dump.mockReturnValue('testKey: testValue\n');
    });

    describe('Constructor', () => {
        it('should create File instance with correct properties', () => {
            expect(file).toBeInstanceOf(File);
            expect(file.name).toBe('test.md');
            expect(file.path).toBe('folder/test.md');
            expect(file.basename).toBe('test');
            expect(file.extension).toBe('md');
            expect(file.vault).toBe(mockVault);
        });

        it('should initialize lock as false', () => {
            expect(file['lock']).toBe(false);
        });

        it('should set linkRegex correctly', () => {
            expect(file.linkRegex).toEqual(/^"?\[\[(.*?)\]\]"?$/);
        });
    });

    describe('Path methods', () => {
        it('should get folder path', () => {
            expect(file.getFolderPath()).toBe('folder');
        });

        it('should get folder path for root file', () => {
            const rootFile = new File(mockVault, { ...mockIFile, path: 'root.md' });
            expect(rootFile.getFolderPath()).toBe('');
        });

        it('should get file object', () => {
            expect(file.getFile()).toBe(mockIFile);
        });

        it('should get path', () => {
            expect(file.getPath()).toBe('folder/test.md');
        });

        it('should get link format', () => {
            expect(file.getLink()).toBe('[[folder/test.md|test]]');
        });
    });

    describe('Name methods', () => {
        it('should get name with extension by default', () => {
            expect(file.getName()).toBe('test.md');
        });

        it('should get name without extension when md=false', () => {
            expect(file.getName(false)).toBe('test');
        });

        it('should get name with extension when md=true', () => {
            expect(file.getName(true)).toBe('test.md');
        });
    });

    describe('Folder file methods', () => {
        it('should detect folder file', () => {
            const folderFile = new File(mockVault, {
                ...mockIFile,
                name: 'folder.md',
                path: 'parent/folder/folder.md'
            });
            expect(folderFile.isFolderFile()).toBe(true);
        });

        it('should not detect regular file as folder file', () => {
            expect(file.isFolderFile()).toBe(false);
        });

        it('should get folder file path for folder file', () => {
            const folderFile = new File(mockVault, {
                ...mockIFile,
                name: 'folder.md',
                path: 'parent/folder/folder.md'
            });
            expect(folderFile.getFolderFilePath()).toBe('parent/folder');
        });

        it('should get folder file path for regular file', () => {
            expect(file.getFolderFilePath()).toBe('folder/test');
        });

        it('should get parent folder path for folder file', () => {
            const folderFile = new File(mockVault, {
                ...mockIFile,
                name: 'folder.md',
                path: 'parent/folder/folder.md'
            });
            expect(folderFile.getParentFolderPath()).toBe('parent');
        });

        it('should get parent folder path for regular file', () => {
            expect(file.getParentFolderPath()).toBe('folder');
        });
    });

    describe('Move operations', () => {
        beforeEach(() => {
            file['lock'] = false;
        });

        it('should move file to target folder', async () => {
            mockApp.getFile.mockResolvedValue(null); // No existing file
            
            await file.move('target/folder', 'newname.md');
            
            expect(mockApp.move).toHaveBeenCalledWith(
                mockIFile,
                'target/folder/newname.md'
            );
        });

        it('should move file with original name when no target name provided', async () => {
            mockApp.getFile.mockResolvedValue(null);
            
            await file.move('target/folder');
            
            expect(mockApp.move).toHaveBeenCalledWith(
                mockIFile,
                'target/folder/test.md'
            );
        });

        it('should not move when target file exists', async () => {
            mockApp.getFile.mockResolvedValue({ path: 'target/folder/test.md' });
            
            await file.move('target/folder');
            
            expect(mockApp.move).not.toHaveBeenCalled();
        });

        it('should handle move errors gracefully', async () => {
            mockApp.getFile.mockResolvedValue(null);
            mockApp.move.mockRejectedValue(new Error('Move failed'));
            
            await expect(file.move('target/folder')).resolves.not.toThrow();
        });

        it('should wait for lock to be released', async () => {
            file['lock'] = true;
            
            // Simulate lock being released after 200ms
            setTimeout(() => {
                file['lock'] = false;
            }, 200);
            
            mockApp.getFile.mockResolvedValue(null);
            
            await file.move('target/folder');
            
            expect(mockApp.move).toHaveBeenCalled();
        });

        it('should move folder file correctly (only the .md file)', async () => {
            const folderFileData = {
                ...mockIFile,
                name: 'folder.md',
                path: 'parent/folder/folder.md'
            };
            const folderFile = new File(mockVault, folderFileData);
            
            mockApp.getFile.mockResolvedValueOnce(null); // No target file exists
            
            await folderFile.move('target');
            
            // File.move() now only moves the .md file, not the folder
            // The parent-child recursion system in Classe handles moving children
            expect(mockApp.move).toHaveBeenCalledWith(
                folderFileData,
                'target/folder.md'
            );
        });
    });

    describe('Metadata operations', () => {
        it('should get metadata', async () => {
            const expectedMetadata = { key: 'value' };
            mockApp.getMetadata.mockResolvedValue(expectedMetadata);
            
            const metadata = await file.getMetadata();
            expect(metadata).toBe(expectedMetadata);
            expect(mockApp.getMetadata).toHaveBeenCalledWith(mockIFile);
        });

        it('should get metadata value', async () => {
            mockApp.getMetadata.mockResolvedValue({ testKey: 'testValue' });
            
            const value = await file.getMetadataValue('testKey');
            expect(value).toBe('testValue');
        });

        it('should return undefined for non-existent metadata key', async () => {
            mockApp.getMetadata.mockResolvedValue({ otherKey: 'value' });
            
            const value = await file.getMetadataValue('nonExistent');
            expect(value).toBeUndefined();
        });

        it('should return undefined when no metadata', async () => {
            mockApp.getMetadata.mockResolvedValue(null);
            
            const value = await file.getMetadataValue('anyKey');
            expect(value).toBeUndefined();
        });

        it('should get all properties from metadata', () => {
            file.getMetadata = jest.fn().mockReturnValue({ prop1: 'value1', prop2: 'value2' });
            
            const properties = file.getAllProperties();
            expect(properties).toEqual({
                prop1: { name: 'prop1' },
                prop2: { name: 'prop2' }
            });
        });

        it('should return empty object when no metadata for getAllProperties', () => {
            file.getMetadata = jest.fn().mockReturnValue(null);
            
            const properties = file.getAllProperties();
            expect(properties).toEqual({});
        });
    });

    describe('Update metadata', () => {
        beforeEach(() => {
            mockApp.getMetadata.mockResolvedValue({ existing: 'value' });
            file['lock'] = false;
        });

        it('should update metadata successfully', async () => {
            await file.updateMetadata('newKey', 'newValue');
            
            expect(mockApp.updateMetadata).toHaveBeenCalledWith(
                mockIFile,
                { existing: 'value', newKey: 'newValue' }
            );
        });

        it('should wait for lock before updating', async () => {
            file['lock'] = true;
            
            // Release lock after 100ms
            setTimeout(() => {
                file['lock'] = false;
            }, 100);
            
            await file.updateMetadata('key', 'value');
            
            expect(mockApp.updateMetadata).toHaveBeenCalled();
        });

        it('should skip update when value unchanged', async () => {
            mockApp.getMetadata.mockResolvedValue({ existing: 'same-value' });
            
            await file.updateMetadata('existing', 'same-value');
            
            expect(mockApp.updateMetadata).not.toHaveBeenCalled();
        });

        it('should handle null metadata', async () => {
            mockApp.getMetadata.mockResolvedValue(null);
            
            await file.updateMetadata('key', 'value');
            
            expect(mockApp.updateMetadata).not.toHaveBeenCalled();
        });
    });

    describe('Remove metadata', () => {
        it('should remove metadata key', async () => {
            mockApp.getMetadata.mockResolvedValue({ key1: 'value1', key2: 'value2' });
            
            await file.removeMetadata('key1');
            
            expect(mockApp.updateMetadata).toHaveBeenCalledWith(
                mockIFile,
                { key2: 'value2' }
            );
        });

        it('should handle removing from null metadata', async () => {
            mockApp.getMetadata.mockResolvedValue(null);
            
            await file.removeMetadata('key1');
            
            expect(mockApp.updateMetadata).not.toHaveBeenCalled();
        });
    });

    describe('External references', () => {
        it('should get from link through vault', async () => {
            const expectedResult = { path: 'linked/file.md' };
            (mockVault.getFromLink as jest.Mock).mockResolvedValue(expectedResult);
            
            const result = await file.getFromLink('[[linked/file]]');
            
            expect(mockVault.getFromLink).toHaveBeenCalledWith('[[linked/file]]');
            expect(result).toBe(expectedResult);
        });
    });

    describe('External references', () => {
        it('should get from link through vault', async () => {
            const expectedResult = { path: 'linked/file.md' };
            (mockVault.getFromLink as jest.Mock).mockResolvedValue(expectedResult);
            
            const result = await file.getFromLink('[[linked/file]]');
            
            expect(mockVault.getFromLink).toHaveBeenCalledWith('[[linked/file]]');
            expect(result).toBe(expectedResult);
        });
    });

    describe('Error handling and edge cases', () => {
        it('should handle concurrent metadata updates', async () => {
            file['lock'] = false;
            mockApp.getMetadata.mockResolvedValue({ existing: 'value' });
            
            // Start two concurrent updates
            const update1 = file.updateMetadata('key1', 'value1');
            const update2 = file.updateMetadata('key2', 'value2');
            
            await Promise.all([update1, update2]);
            
            // Both should complete without throwing
            expect(mockApp.updateMetadata).toHaveBeenCalled();
        });

        it('should handle very long file paths', () => {
            const longPath = 'a/'.repeat(100) + 'file.md';
            const longFile = new File(mockVault, {
                ...mockIFile,
                path: longPath
            });
            
            expect(longFile.getPath()).toBe(longPath);
        });

        it('should handle special characters in file names', () => {
            const specialFile = new File(mockVault, {
                ...mockIFile,
                name: 'test@#$%^&*()_+{}|:<>?.md',
                path: 'folder/test@#$%^&*()_+{}|:<>?.md'
            });
            
            expect(specialFile.getName()).toBe('test@#$%^&*()_+{}|:<>?.md');
            expect(specialFile.getName(false)).toBe('test@#$%^&*()_+{}|:<>?');
        });
    });
});