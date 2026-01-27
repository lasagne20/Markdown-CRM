/**
 * Test pour la fonctionnalité fallback dans PopulateManager
 * Valide que si un populate n'est pas rempli, le fallback est utilisé
 */

import { PopulateManager } from '../../src/Config/PopulateManager';
import { ClassConfig, PopulateConfig } from '../../src/Config/interfaces';

// Mock vault et app
const mockApp = {
    selectFile: jest.fn(),
    selectFromList: jest.fn(),
    sendNotice: jest.fn()
};

const mockVault = {
    app: mockApp,
    getDynamicClassFactory: jest.fn(() => null),
    getExtendedClasses: jest.fn((classes: string[]) => Promise.resolve(classes))
} as any;

describe('PopulateManager - Fallback functionality', () => {
    let populateManager: PopulateManager;

    beforeEach(() => {
        populateManager = new PopulateManager(mockVault);
        jest.clearAllMocks();
    });

    it('should use primary property when value is provided', async () => {
        const classConfig: ClassConfig = {
            className: 'TestClass',
            classIcon: 'test',
            properties: {
                institution: {
                    type: 'SelectProperty',
                    options: ['Institution A', 'Institution B']
                },
                autreInstitution: {
                    type: 'SelectProperty',
                    options: ['Institution C', 'Institution D']
                }
            },
            populate: [
                {
                    property: 'institution',
                    title: 'Institution principale',
                    fallback: {
                        property: 'autreInstitution',
                        title: 'Autre institution'
                    }
                }
            ]
        };

        // User selects from primary property
        mockApp.selectFromList.mockResolvedValueOnce('Institution A');

        const result = await populateManager.populateProperties(classConfig);

        expect(result).toEqual({
            institution: 'Institution A'
        });

        // Should only have called selectFromList once (for primary property)
        expect(mockApp.selectFromList).toHaveBeenCalledTimes(1);
        expect(mockApp.selectFromList).toHaveBeenCalledWith(
            ['Institution A', 'Institution B'],
            expect.objectContaining({ title: 'Institution principale' })
        );
    });

    it('should use fallback when primary property is cancelled (null)', async () => {
        const classConfig: ClassConfig = {
            className: 'TestClass',
            classIcon: 'test',
            properties: {
                institution: {
                    type: 'SelectProperty',
                    options: ['Institution A', 'Institution B']
                },
                autreInstitution: {
                    type: 'SelectProperty',
                    options: ['Institution C', 'Institution D']
                }
            },
            populate: [
                {
                    property: 'institution',
                    title: 'Institution principale',
                    fallback: {
                        property: 'autreInstitution',
                        title: 'Autre institution'
                    }
                }
            ]
        };

        // User cancels primary, selects fallback
        mockApp.selectFromList
            .mockResolvedValueOnce(null) // Primary cancelled
            .mockResolvedValueOnce('Institution C'); // Fallback selected

        const result = await populateManager.populateProperties(classConfig);

        expect(result).toEqual({
            autreInstitution: 'Institution C'
        });

        // Should have called selectFromList twice
        expect(mockApp.selectFromList).toHaveBeenCalledTimes(2);
        expect(mockApp.selectFromList).toHaveBeenNthCalledWith(1,
            ['Institution A', 'Institution B'],
            expect.objectContaining({ title: 'Institution principale' })
        );
        expect(mockApp.selectFromList).toHaveBeenNthCalledWith(2,
            ['Institution C', 'Institution D'],
            expect.objectContaining({ title: 'Autre institution' })
        );
    });

    it('should chain multiple fallbacks', async () => {
        const classConfig: ClassConfig = {
            className: 'TestClass',
            classIcon: 'test',
            properties: {
                institution: {
                    type: 'SelectProperty',
                    options: ['Institution A']
                },
                autreInstitution: {
                    type: 'SelectProperty',
                    options: ['Institution B']
                },
                institutionSecondaire: {
                    type: 'SelectProperty',
                    options: ['Institution C']
                }
            },
            populate: [
                {
                    property: 'institution',
                    title: 'Institution principale',
                    fallback: {
                        property: 'autreInstitution',
                        title: 'Autre institution',
                        fallback: {
                            property: 'institutionSecondaire',
                            title: 'Institution de secours'
                        }
                    }
                }
            ]
        };

        // User cancels first two, selects third
        mockApp.selectFromList
            .mockResolvedValueOnce(null) // Primary cancelled
            .mockResolvedValueOnce(null) // First fallback cancelled
            .mockResolvedValueOnce('Institution C'); // Second fallback selected

        const result = await populateManager.populateProperties(classConfig);

        expect(result).toEqual({
            institutionSecondaire: 'Institution C'
        });

        expect(mockApp.selectFromList).toHaveBeenCalledTimes(3);
    });

    it('should return null when all fallbacks are cancelled', async () => {
        const classConfig: ClassConfig = {
            className: 'TestClass',
            classIcon: 'test',
            properties: {
                institution: {
                    type: 'SelectProperty',
                    options: ['Institution A']
                },
                autreInstitution: {
                    type: 'SelectProperty',
                    options: ['Institution B']
                }
            },
            populate: [
                {
                    property: 'institution',
                    title: 'Institution principale',
                    fallback: {
                        property: 'autreInstitution',
                        title: 'Autre institution'
                    }
                }
            ]
        };

        // User cancels both
        mockApp.selectFromList
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null);

        const result = await populateManager.populateProperties(classConfig);

        // No values populated
        expect(result).toEqual({});
    });

    it('should work with FileProperty fallback', async () => {
        const mockFile = {
            getLink: jest.fn(() => '[[Institution A]]')
        };

        const classConfig: ClassConfig = {
            className: 'TestClass',
            classIcon: 'test',
            properties: {
                institution: {
                    type: 'FileProperty',
                    classes: ['Institution']
                },
                autreInstitution: {
                    type: 'FileProperty',
                    classes: ['Institution']
                }
            },
            populate: [
                {
                    property: 'institution',
                    title: 'Institution principale',
                    fallback: {
                        property: 'autreInstitution',
                        title: 'Autre institution'
                    }
                }
            ]
        };

        // User cancels primary, selects fallback
        mockApp.selectFile
            .mockResolvedValueOnce(null) // Primary cancelled
            .mockResolvedValueOnce(mockFile); // Fallback selected

        const result = await populateManager.populateProperties(classConfig);

        expect(result).toEqual({
            autreInstitution: '[[Institution A]]'
        });
    });

    it('should handle required field with fallback', async () => {
        const classConfig: ClassConfig = {
            className: 'TestClass',
            classIcon: 'test',
            properties: {
                institution: {
                    type: 'SelectProperty',
                    options: ['Institution A']
                },
                autreInstitution: {
                    type: 'SelectProperty',
                    options: ['Institution B']
                }
            },
            populate: [
                {
                    property: 'institution',
                    title: 'Institution principale',
                    required: true,
                    fallback: {
                        property: 'autreInstitution',
                        title: 'Autre institution'
                    }
                }
            ]
        };

        // User cancels both - should return null for entire populate
        mockApp.selectFromList
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null);

        const result = await populateManager.populateProperties(classConfig);

        // Required field not provided, should signal cancellation
        expect(result).toBeNull();
    });

    it('should satisfy required field with fallback value', async () => {
        const classConfig: ClassConfig = {
            className: 'TestClass',
            classIcon: 'test',
            properties: {
                institution: {
                    type: 'SelectProperty',
                    options: ['Institution A']
                },
                autreInstitution: {
                    type: 'SelectProperty',
                    options: ['Institution B']
                }
            },
            populate: [
                {
                    property: 'institution',
                    title: 'Institution principale',
                    required: true,
                    fallback: {
                        property: 'autreInstitution',
                        title: 'Autre institution'
                    }
                }
            ]
        };

        // User cancels primary but fills fallback
        mockApp.selectFromList
            .mockResolvedValueOnce(null) // Primary cancelled
            .mockResolvedValueOnce('Institution B'); // Fallback filled

        const result = await populateManager.populateProperties(classConfig);

        // Fallback satisfies required constraint
        expect(result).toEqual({
            autreInstitution: 'Institution B'
        });
    });

    it('should work with mixed property types in fallback chain', async () => {
        const mockFile = {
            getLink: jest.fn(() => '[[Institution X]]')
        };

        const classConfig: ClassConfig = {
            className: 'TestClass',
            classIcon: 'test',
            properties: {
                institution: {
                    type: 'SelectProperty',
                    options: ['Institution A', 'Institution B']
                },
                fichierInstitution: {
                    type: 'FileProperty',
                    classes: ['Institution']
                }
            },
            populate: [
                {
                    property: 'institution',
                    title: 'Sélectionner une institution',
                    fallback: {
                        property: 'fichierInstitution',
                        title: 'Ou choisir un fichier institution'
                    }
                }
            ]
        };

        // User cancels SelectProperty, uses FileProperty fallback
        mockApp.selectFromList.mockResolvedValueOnce(null);
        mockApp.selectFile.mockResolvedValueOnce(mockFile);

        const result = await populateManager.populateProperties(classConfig);

        expect(result).toEqual({
            fichierInstitution: '[[Institution X]]'
        });

        expect(mockApp.selectFromList).toHaveBeenCalledTimes(1);
        expect(mockApp.selectFile).toHaveBeenCalledTimes(1);
    });
});
