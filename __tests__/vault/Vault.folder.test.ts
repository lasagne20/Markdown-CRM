import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { ClassConfig } from '../../src/Config/interfaces';

describe('Vault - Class folder configuration', () => {
    let mockApp: any;
    let mockSettings: any;
    let vault: Vault;
    let mockFactory: any;

    beforeEach(() => {
        mockSettings = {
            templateFolder: 'templates',
            classePropertyName: 'Classe',
            configPath: 'config'
        };

        mockApp = {
            getSettings: jest.fn(() => mockSettings),
            getFile: jest.fn(),
            createFile: jest.fn(),
            createFolder: jest.fn(),
            isFile: jest.fn(),
            isFolder: jest.fn(() => false),
            readFile: jest.fn(),
            getMetadata: jest.fn().mockResolvedValue({}),
            waitForFileMetaDataUpdate: jest.fn((path, prop, callback) => callback()),
            setIcon: jest.fn()
        };

        mockFactory = {
            getClassConfig: jest.fn()
        };

        vault = new Vault(mockApp, mockSettings);
        vault.getDynamicClassFactory = jest.fn(() => mockFactory);
    });

    it('should create file in configured folder when class has folder and no parent', async () => {
        const classConfig: ClassConfig = {
            className: 'Document',
            classIcon: 'file',
            folder: 'Documents',
            properties: {}
        };

        mockFactory.getClassConfig.mockResolvedValue(classConfig);
        mockApp.getFile.mockResolvedValueOnce(null); // folder check
        mockApp.getFile.mockResolvedValueOnce(null); // template check

        const mockFile = {
            path: 'Documents/test.md',
            extension: 'md'
        };
        mockApp.createFile.mockResolvedValue(mockFile);

        class TestClass extends Classe {
            static className = 'Document';
        }

        await vault.createFile(TestClass, 'test');

        expect(mockApp.createFolder).toHaveBeenCalledWith('Documents');
        expect(mockApp.createFile).toHaveBeenCalledWith(
            'Documents/test.md',
            expect.any(String)
        );
    });

    it('should create file at root when class has no folder configured and no parent', async () => {
        const classConfig: ClassConfig = {
            className: 'Note',
            classIcon: 'file',
            properties: {}
        };

        mockFactory.getClassConfig.mockResolvedValue(classConfig);
        mockApp.getFile.mockResolvedValue(null);

        const mockFile = {
            path: 'test.md',
            extension: 'md'
        };
        mockApp.createFile.mockResolvedValue(mockFile);

        class TestClass extends Classe {
            static className = 'Note';
        }

        await vault.createFile(TestClass, 'test');

        expect(mockApp.createFile).toHaveBeenCalledWith('test.md', expect.any(String));
        expect(mockApp.createFolder).not.toHaveBeenCalled();
    });

    it('should not use folder config when parent is provided', async () => {
        const classConfig: ClassConfig = {
            className: 'SubDocument',
            classIcon: 'file',
            folder: 'Documents',
            properties: {}
        };

        mockFactory.getClassConfig.mockResolvedValue(classConfig);
        mockApp.getFile.mockResolvedValue(null);

        const mockFile = {
            path: 'test.md',
            extension: 'md'
        };
        mockApp.createFile.mockResolvedValue(mockFile);

        const mockParent = {
            file: {
                path: 'Parent/parent.md',
                getFolderPath: () => 'Parent'
            }
        } as any;

        class TestClass extends Classe {
            static className = 'SubDocument';
        }

        await vault.createFile(TestClass, 'test', { parent: mockParent });

        expect(mockApp.createFile).toHaveBeenCalledWith('test.md', expect.any(String));
        expect(mockApp.createFolder).not.toHaveBeenCalled();
    });

    it('should handle nested folder paths', async () => {
        const classConfig: ClassConfig = {
            className: 'Report',
            classIcon: 'file',
            folder: 'Admin/Reports/2026',
            properties: {}
        };

        mockFactory.getClassConfig.mockResolvedValue(classConfig);
        mockApp.getFile.mockResolvedValueOnce(null);
        mockApp.getFile.mockResolvedValueOnce(null);

        const mockFile = {
            path: 'Admin/Reports/2026/test.md',
            extension: 'md'
        };
        mockApp.createFile.mockResolvedValue(mockFile);

        class TestClass extends Classe {
            static className = 'Report';
        }

        await vault.createFile(TestClass, 'test');

        expect(mockApp.createFolder).toHaveBeenCalledWith('Admin/Reports/2026');
        expect(mockApp.createFile).toHaveBeenCalledWith(
            'Admin/Reports/2026/test.md',
            expect.any(String)
        );
    });

    it('should not create folder if it already exists', async () => {
        const classConfig: ClassConfig = {
            className: 'Document',
            classIcon: 'file',
            folder: 'Documents',
            properties: {}
        };

        mockFactory.getClassConfig.mockResolvedValue(classConfig);

        const mockFolder = { path: 'Documents', children: [] };
        mockApp.getFile.mockResolvedValueOnce(mockFolder);
        mockApp.getFile.mockResolvedValueOnce(null);

        const mockFile = {
            path: 'Documents/test.md',
            extension: 'md'
        };
        mockApp.createFile.mockResolvedValue(mockFile);

        class TestClass extends Classe {
            static className = 'Document';
        }

        await vault.createFile(TestClass, 'test');

        expect(mockApp.createFolder).not.toHaveBeenCalled();
        expect(mockApp.createFile).toHaveBeenCalledWith(
            'Documents/test.md',
            expect.any(String)
        );
    });

    it('should handle errors when loading class config gracefully', async () => {
        mockFactory.getClassConfig.mockRejectedValue(new Error('Config not found'));
        mockApp.getFile.mockResolvedValue(null);

        const mockFile = {
            path: 'test.md',
            extension: 'md'
        };
        mockApp.createFile.mockResolvedValue(mockFile);

        class TestClass extends Classe {
            static className = 'ErrorClass';
        }

        await vault.createFile(TestClass, 'test');

        expect(mockApp.createFile).toHaveBeenCalledWith('test.md', expect.any(String));
    });
});
