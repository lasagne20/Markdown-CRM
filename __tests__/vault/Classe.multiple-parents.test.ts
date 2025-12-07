/**
 * @jest-environment jsdom
 */

import { Classe } from '../../src/vault/Classe';
import { Vault } from '../../src/vault/Vault';
import { File } from '../../src/vault/File';
import { Property } from '../../src/properties/Property';
import { FileProperty } from '../../src/properties/FileProperty';
import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { IFile } from '../../src/interfaces/IApp';

describe('Classe - Multiple Parents with Fallback', () => {
    let vault: Vault;
    let mockApp: any;
    let mockFile: IFile;
    let file: File;

    beforeEach(() => {
        // Mock app
        mockApp = {
            getFile: jest.fn(),
            readFile: jest.fn(),
            getMetadata: jest.fn().mockResolvedValue({}),
            updateMetadata: jest.fn(),
            listFiles: jest.fn().mockResolvedValue([]),
            createFile: jest.fn(),
            move: jest.fn(),
            getSettings: jest.fn().mockReturnValue({
                classePropertyName: 'classe'
            })
        };

        // Mock IFile
        mockFile = {
            path: '/test/file.md',
            name: 'file.md',
            basename: 'file',
            extension: 'md'
        };

        vault = new Vault(mockApp, { configPath: './config', templateFolder: 'templates', personalName: 'Test User' });
        file = new File(vault, mockFile);
    });

    describe('Static property configuration', () => {
        test('should support single parentPropertyName (legacy)', () => {
            class TestClasse extends Classe {
                static override parentPropertyName = 'institution';
            }

            const instance = new TestClasse(vault, file);
            expect(TestClasse.parentPropertyName).toBe('institution');
            expect(TestClasse.parentPropertyNames).toBeUndefined();
        });

        test('should support multiple parentPropertyNames (new)', () => {
            class TestClasse extends Classe {
                static override parentPropertyNames = ['postes', 'institution'];
            }

            const instance = new TestClasse(vault, file);
            expect(TestClasse.parentPropertyNames).toEqual(['postes', 'institution']);
        });

        test('should support parentFolderName', () => {
            class TestClasse extends Classe {
                static override parentPropertyNames = ['postes', 'institution'];
                static override parentFolderName = 'Personnes';
            }

            const instance = new TestClasse(vault, file);
            expect(TestClasse.parentFolderName).toBe('Personnes');
        });
    });

    describe('getParentProperty with single parent', () => {
        test('should return parent property when parentPropertyName is set', async () => {
            class TestClasse extends Classe {
                static override parentPropertyName = 'institution';
                static override Properties = {
                    institution: new FileProperty('institution', vault, ['Institution'])
                };
            }

            const instance = new TestClasse(vault, file);
            instance.addProperty(TestClasse.Properties.institution);

            const parentProp = await (instance as any).getParentProperty();
            expect(parentProp).toBeDefined();
            expect(parentProp?.name).toBe('institution');
        });

        test('should return undefined when parentPropertyName is not set', async () => {
            class TestClasse extends Classe {
                // No parent configuration
            }

            const instance = new TestClasse(vault, file);
            const parentProp = await (instance as any).getParentProperty();
            expect(parentProp).toBeUndefined();
        });

        test('should return undefined when property does not exist', async () => {
            class TestClasse extends Classe {
                static override parentPropertyName = 'nonexistent';
            }

            const instance = new TestClasse(vault, file);
            const parentProp = await (instance as any).getParentProperty();
            expect(parentProp).toBeUndefined();
        });
    });

    describe('getParentProperty with multiple parents (fallback)', () => {
        test('should return first available parent property', async () => {
            class TestClasse extends Classe {
                static override parentPropertyNames = ['postes', 'institution'];
                static override Properties = {
                    postes: new ObjectProperty('postes', vault, {
                        institution: new FileProperty('institution', vault, ['Institution'])
                    }),
                    institution: new FileProperty('institution', vault, ['Institution'])
                };
            }

            // Mock getParentFile to return a valid file for postes
            const mockFile = new File(vault, { path: '/test.md', name: 'test.md', basename: 'test', extension: 'md' });
            TestClasse.Properties.postes.getParentFile = jest.fn().mockResolvedValue(mockFile);

            const instance = new TestClasse(vault, file);
            instance.addProperty(TestClasse.Properties.postes);
            instance.addProperty(TestClasse.Properties.institution);
            
            // Mock getMetadata to return dummy values
            mockApp.getMetadata.mockResolvedValue({ postes: {}, institution: '' });

            const parentProp = await (instance as any).getParentProperty();
            expect(parentProp).toBeDefined();
            expect(parentProp?.name).toBe('postes'); // First in the list
        });

        test('should fallback to second parent when first is not available', async () => {
            class TestClasse extends Classe {
                static override parentPropertyNames = ['postes', 'institution'];
                static override Properties = {
                    institution: new FileProperty('institution', vault, ['Institution'])
                };
            }

            // Mock getParentFile to return a valid file for institution
            const mockFile = new File(vault, { path: '/test.md', name: 'test.md', basename: 'test', extension: 'md' });
            TestClasse.Properties.institution.getParentFile = jest.fn().mockResolvedValue(mockFile);

            const instance = new TestClasse(vault, file);
            // Only add institution, not postes
            instance.addProperty(TestClasse.Properties.institution);
            
            // Mock getMetadata to return dummy value
            mockApp.getMetadata.mockResolvedValue({ institution: '[[test]]' });

            const parentProp = await (instance as any).getParentProperty();
            expect(parentProp).toBeDefined();
            expect(parentProp?.name).toBe('institution'); // Fallback to second
        });

        test('should return undefined when no parent properties are available', async () => {
            class TestClasse extends Classe {
                static override parentPropertyNames = ['postes', 'institution'];
            }

            const instance = new TestClasse(vault, file);
            // No properties added

            const parentProp = await (instance as any).getParentProperty();
            expect(parentProp).toBeUndefined();
        });

        test('should handle empty parentPropertyNames array', async () => {
            class TestClasse extends Classe {
                static override parentPropertyNames = [];
            }

            const instance = new TestClasse(vault, file);
            const parentProp = await (instance as any).getParentProperty();
            expect(parentProp).toBeUndefined();
        });
    });

    describe('getParentFile with multiple parents (fallback)', () => {
        let mockInstitutionFile: IFile;
        let institutionFile: File;

        beforeEach(() => {
            mockInstitutionFile = {
                path: '/Institutions/TechCorp/TechCorp.md',
                name: 'TechCorp.md',
                basename: 'TechCorp',
                extension: 'md'
            };
            institutionFile = new File(vault, mockInstitutionFile);
        });

        test('should return parent file from first parent property with value', async () => {
            // Mock metadata with postes value
            mockApp.getMetadata.mockResolvedValue({
                postes: {
                    institution: '[[Institutions/TechCorp/TechCorp]]'
                }
            });

            class TestClasse extends Classe {
                static override parentPropertyNames = ['postes', 'institution'];
                static override Properties = {
                    postes: new ObjectProperty('postes', vault, { institution: new FileProperty('institution', vault, ['Institution']) }),
                    institution: new FileProperty('institution', vault, ['Institution'])
                };
            }

            // Mock getParentFile for ObjectProperty
            const mockGetParentFile = jest.fn().mockResolvedValue(institutionFile);
            TestClasse.Properties.postes.getParentFile = mockGetParentFile;

            const instance = new TestClasse(vault, file);
            instance.addProperty(TestClasse.Properties.postes);
            instance.addProperty(TestClasse.Properties.institution);

            const parentFile = await (instance as any).getParentFile();
            
            expect(mockGetParentFile).toHaveBeenCalled();
            expect(parentFile).toBe(institutionFile);
        });

        test('should fallback to second parent when first has no value', async () => {
            // Mock metadata with empty postes but institution value
            mockApp.getMetadata.mockResolvedValue({
                postes: {},
                institution: '[[Institutions/TechCorp/TechCorp]]'
            });

            class TestClasse extends Classe {
                static override parentPropertyNames = ['postes', 'institution'];
                static override Properties = {
                    postes: new ObjectProperty('postes', vault, { institution: new FileProperty('institution', vault, ['Institution']) }),
                    institution: new FileProperty('institution', vault, ['Institution'])
                };
            }

            // Mock getParentFile - postes returns null, institution returns file
            const postesGetParentFile = jest.fn().mockResolvedValue(null);
            const institutionGetParentFile = jest.fn().mockResolvedValue(institutionFile);
            
            TestClasse.Properties.postes.getParentFile = postesGetParentFile;
            TestClasse.Properties.institution.getParentFile = institutionGetParentFile;

            const instance = new TestClasse(vault, file);
            instance.addProperty(TestClasse.Properties.postes);
            instance.addProperty(TestClasse.Properties.institution);

            const parentFile = await (instance as any).getParentFile();
            
            expect(postesGetParentFile).toHaveBeenCalled();
            expect(institutionGetParentFile).toHaveBeenCalled();
            expect(parentFile).toBe(institutionFile);
        });

        test('should return undefined when all parents have no value', async () => {
            // Mock metadata with no parent values
            mockApp.getMetadata.mockResolvedValue({
                postes: {},
                institution: ''
            });

            class TestClasse extends Classe {
                static override parentPropertyNames = ['postes', 'institution'];
                static override Properties = {
                    postes: new ObjectProperty('postes', vault, { institution: new FileProperty('institution', vault, ['Institution']) }),
                    institution: new FileProperty('institution', vault, ['Institution'])
                };
            }

            const instance = new TestClasse(vault, file);
            instance.addProperty(TestClasse.Properties.postes);
            instance.addProperty(TestClasse.Properties.institution);

            const parentFile = await (instance as any).getParentFile();
            
            expect(parentFile).toBeUndefined();
        });

        test('should handle missing getParentFile method gracefully', async () => {
            mockApp.getMetadata.mockResolvedValue({
                postes: { institution: '[[TechCorp]]' }
            });

            class TestClasse extends Classe {
                static override parentPropertyNames = ['postes'];
                static override Properties = {
                    postes: new Property('postes', vault) // Property without getParentFile
                };
            }

            const instance = new TestClasse(vault, file);
            instance.addProperty(TestClasse.Properties.postes);

            const parentFile = await (instance as any).getParentFile();
            
            expect(parentFile).toBeUndefined();
        });
    });

    describe('Integration with legacy single parent', () => {
        test('should work with legacy single parent configuration', async () => {
            mockApp.getMetadata.mockResolvedValue({
                institution: '[[Institutions/TechCorp/TechCorp]]'
            });

            const mockInstitutionFile: IFile = {
                path: '/Institutions/TechCorp/TechCorp.md',
                name: 'TechCorp.md',
                basename: 'TechCorp',
                extension: 'md'
            };
            const institutionFile = new File(vault, mockInstitutionFile);

            class TestClasse extends Classe {
                static override parentPropertyName = 'institution'; // Legacy single parent
                static override Properties = {
                    institution: new FileProperty('institution', vault, ['Institution'])
                };
            }

            const mockGetParentFile = jest.fn().mockResolvedValue(institutionFile);
            TestClasse.Properties.institution.getParentFile = mockGetParentFile;

            const instance = new TestClasse(vault, file);
            instance.addProperty(TestClasse.Properties.institution);

            const parentProp = await (instance as any).getParentProperty();
            expect(parentProp?.name).toBe('institution');

            const parentFile = await (instance as any).getParentFile();
            expect(parentFile).toBe(institutionFile);
        });

        test('should prefer parentPropertyNames over parentPropertyName when both exist', async () => {
            class TestClasse extends Classe {
                static override parentPropertyName = 'oldParent';
                static override parentPropertyNames = ['newParent1', 'newParent2'];
                static override Properties = {
                    newParent1: new FileProperty('newParent1', vault, ['Test']),
                    oldParent: new FileProperty('oldParent', vault, ['Test'])
                };
            }

            // Mock getParentFile to return a valid file for newParent1
            const mockFile = new File(vault, { path: '/test.md', name: 'test.md', basename: 'test', extension: 'md' });
            TestClasse.Properties.newParent1.getParentFile = jest.fn().mockResolvedValue(mockFile);

            const instance = new TestClasse(vault, file);
            instance.addProperty(TestClasse.Properties.newParent1);
            instance.addProperty(TestClasse.Properties.oldParent);
            
            // Mock getMetadata to return dummy values
            mockApp.getMetadata.mockResolvedValue({ newParent1: '[[test]]', oldParent: '' });

            const parentProp = await (instance as any).getParentProperty();
            expect(parentProp?.name).toBe('newParent1'); // Should use new format
        });
    });

    describe('Real-world scenario: Personne with postes and institution', () => {
        test('should use postes as parent when filled', async () => {
            mockApp.getMetadata.mockResolvedValue({
                postes: {
                    institution: '[[Institutions/TechCorp/TechCorp]]',
                    poste: 'CEO'
                },
                institution: '[[Institutions/AnotherCorp/AnotherCorp]]'
            });

            const techCorpFile: IFile = {
                path: '/Institutions/TechCorp/TechCorp.md',
                name: 'TechCorp.md',
                basename: 'TechCorp',
                extension: 'md'
            };

            class Personne extends Classe {
                static override parentPropertyNames = ['postes', 'institution'];
                static override parentFolderName = 'Personnes';
                static override Properties = {
                    postes: new ObjectProperty('postes', vault, {
                        institution: new FileProperty('institution', vault, ['Institution']),
                        poste: new Property('poste', vault)
                    }),
                    institution: new FileProperty('institution', vault, ['Institution'])
                };
            }

            const postesGetParentFile = jest.fn().mockResolvedValue(new File(vault, techCorpFile));
            Personne.Properties.postes.getParentFile = postesGetParentFile;

            const instance = new Personne(vault, file);
            instance.addProperty(Personne.Properties.postes);
            instance.addProperty(Personne.Properties.institution);

            const parentFile = await (instance as any).getParentFile();
            
            expect(postesGetParentFile).toHaveBeenCalled();
            expect(parentFile?.getPath()).toBe('/Institutions/TechCorp/TechCorp.md');
        });

        test('should fallback to institution when postes is empty', async () => {
            mockApp.getMetadata.mockResolvedValue({
                postes: {}, // Empty postes
                institution: '[[Institutions/TechCorp/TechCorp]]'
            });

            const techCorpFile: IFile = {
                path: '/Institutions/TechCorp/TechCorp.md',
                name: 'TechCorp.md',
                basename: 'TechCorp',
                extension: 'md'
            };

            class Personne extends Classe {
                static override parentPropertyNames = ['postes', 'institution'];
                static override Properties = {
                    postes: new ObjectProperty('postes', vault, {
                        institution: new FileProperty('institution', vault, ['Institution'])
                    }),
                    institution: new FileProperty('institution', vault, ['Institution'])
                };
            }

            const postesGetParentFile = jest.fn().mockResolvedValue(null);
            const institutionGetParentFile = jest.fn().mockResolvedValue(new File(vault, techCorpFile));
            
            Personne.Properties.postes.getParentFile = postesGetParentFile;
            Personne.Properties.institution.getParentFile = institutionGetParentFile;

            const instance = new Personne(vault, file);
            instance.addProperty(Personne.Properties.postes);
            instance.addProperty(Personne.Properties.institution);

            const parentFile = await (instance as any).getParentFile();
            
            expect(institutionGetParentFile).toHaveBeenCalled();
            expect(parentFile?.getPath()).toBe('/Institutions/TechCorp/TechCorp.md');
        });
    });
});

