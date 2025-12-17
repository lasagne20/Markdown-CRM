import { PopulateManager } from '../../src/Config/PopulateManager';
import { Vault } from '../../src/vault/Vault';
import { ClassConfig } from '../../src/Config/interfaces';

describe('PopulateManager - Skip existing properties', () => {
    let mockVault: any;
    let populateManager: PopulateManager;
    let mockClasse: any;

    beforeEach(() => {
        mockClasse = {
            getLink: jest.fn().mockReturnValue('[[Global Corp]]')
        };

        mockVault = {
            app: {
                selectFile: jest.fn().mockResolvedValue(mockClasse),
                selectFromList: jest.fn().mockResolvedValue('Actif'),
                getSettings: jest.fn().mockReturnValue({}),
                sendNotice: jest.fn()
            },
            getDynamicClassFactory: jest.fn().mockReturnValue(null),
            getExtendedClasses: jest.fn().mockImplementation((classes) => Promise.resolve(classes))
        };

        populateManager = new PopulateManager(mockVault as Vault);
    });

    it('should skip properties already provided in existingProperties', async () => {
        const classConfig: ClassConfig = {
            className: 'Personne',
            classIcon: '👤',
            properties: {
                institution: {
                    type: 'FileProperty',
                    classes: ['Institution']
                },
                statut: {
                    type: 'SelectProperty',
                    options: ['Actif', 'Inactif']
                },
                role: {
                    type: 'SelectProperty',
                    options: ['Admin', 'User']
                }
            },
            populate: [
                {
                    property: 'institution',
                    title: 'Institution',
                    required: false
                },
                {
                    property: 'statut',
                    title: 'Statut',
                    required: false
                },
                {
                    property: 'role',
                    title: 'Role',
                    required: false
                }
            ]
        };

        // Mock selectFile and selectFromList to track calls
        mockClasse.getLink.mockReturnValue('[[Global Corp]]');
        mockVault.app.selectFromList.mockResolvedValue('User');

        // Provide institution and statut in existingProperties
        const existingProperties = {
            institution: '[[ACME Corp]]',
            statut: 'Actif'
        };

        const result = await populateManager.populateProperties(classConfig, existingProperties);

        // Should only prompt for 'role' (not institution or statut)
        expect(mockVault.app.selectFile).not.toHaveBeenCalled(); // institution already provided
        expect(mockVault.app.selectFromList).toHaveBeenCalledTimes(1); // only for 'role'
        expect(mockVault.app.selectFromList).toHaveBeenCalledWith(
            ['Admin', 'User'],
            {
                multiple: false,
                title: 'Role'
            }
        );

        // Result should only contain the newly populated property
        expect(result).toEqual({
            role: 'User'
        });
    });

    it('should populate all properties when existingProperties is not provided', async () => {
        const classConfig: ClassConfig = {
            className: 'Personne',
            classIcon: '👤',
            properties: {
                institution: {
                    type: 'FileProperty',
                    classes: ['Institution']
                },
                statut: {
                    type: 'SelectProperty',
                    options: ['Actif', 'Inactif']
                }
            },
            populate: [
                {
                    property: 'institution',
                    title: 'Institution',
                    required: false
                },
                {
                    property: 'statut',
                    title: 'Statut',
                    required: false
                }
            ]
        };

        mockClasse.getLink.mockReturnValue('[[Global Corp]]');
        mockVault.app.selectFromList.mockResolvedValue('Actif');

        const result = await populateManager.populateProperties(classConfig);

        // Should prompt for both properties
        expect(mockVault.app.selectFile).toHaveBeenCalledTimes(1);
        expect(mockVault.app.selectFromList).toHaveBeenCalledTimes(1);

        expect(result).toEqual({
            institution: '[[Global Corp]]',
            statut: 'Actif'
        });
    });

    it('should populate all properties when existingProperties is empty', async () => {
        const classConfig: ClassConfig = {
            className: 'Personne',
            classIcon: '👤',
            properties: {
                institution: {
                    type: 'FileProperty',
                    classes: ['Institution']
                },
                statut: {
                    type: 'SelectProperty',
                    options: ['Actif', 'Inactif']
                }
            },
            populate: [
                {
                    property: 'institution',
                    title: 'Institution',
                    required: false
                },
                {
                    property: 'statut',
                    title: 'Statut',
                    required: false
                }
            ]
        };

        mockClasse.getLink.mockReturnValue('[[Global Corp]]');
        mockVault.app.selectFromList.mockResolvedValue('Actif');

        const result = await populateManager.populateProperties(classConfig, {});

        // Should prompt for both properties
        expect(mockVault.app.selectFile).toHaveBeenCalledTimes(1);
        expect(mockVault.app.selectFromList).toHaveBeenCalledTimes(1);

        expect(result).toEqual({
            institution: '[[Global Corp]]',
            statut: 'Actif'
        });
    });

    it('should skip required property if already provided', async () => {
        const classConfig: ClassConfig = {
            className: 'Personne',
            classIcon: '👤',
            properties: {
                institution: {
                    type: 'FileProperty',
                    classes: ['Institution']
                },
                statut: {
                    type: 'SelectProperty',
                    options: ['Actif', 'Inactif']
                }
            },
            populate: [
                {
                    property: 'institution',
                    title: 'Institution',
                    required: true // Required but already provided
                },
                {
                    property: 'statut',
                    title: 'Statut',
                    required: false
                }
            ]
        };

        mockVault.app.selectFromList.mockResolvedValue('Actif');

        const existingProperties = {
            institution: '[[Pre-filled Institution]]'
        };

        const result = await populateManager.populateProperties(classConfig, existingProperties);

        // Should NOT prompt for institution (even though it's required)
        expect(mockVault.app.selectFile).not.toHaveBeenCalled();
        // Should prompt for statut
        expect(mockVault.app.selectFromList).toHaveBeenCalledTimes(1);

        expect(result).toEqual({
            statut: 'Actif'
        });
    });

    it('should return null if user cancels a required property that is not provided', async () => {
        const classConfig: ClassConfig = {
            className: 'Personne',
            classIcon: '👤',
            properties: {
                institution: {
                    type: 'FileProperty',
                    classes: ['Institution']
                }
            },
            populate: [
                {
                    property: 'institution',
                    title: 'Institution',
                    required: true
                }
            ]
        };

        // User cancels selection
        mockVault.app.selectFile.mockResolvedValue(null);

        const result = await populateManager.populateProperties(classConfig);

        expect(result).toBeNull();
    });

    it('should continue if user cancels a non-required property', async () => {
        const classConfig: ClassConfig = {
            className: 'Personne',
            classIcon: '👤',
            properties: {
                institution: {
                    type: 'FileProperty',
                    classes: ['Institution']
                },
                statut: {
                    type: 'SelectProperty',
                    options: ['Actif', 'Inactif']
                }
            },
            populate: [
                {
                    property: 'institution',
                    title: 'Institution',
                    required: false
                },
                {
                    property: 'statut',
                    title: 'Statut',
                    required: false
                }
            ]
        };

        mockVault.app.selectFile.mockResolvedValue(null); // User cancels
        mockVault.app.selectFromList.mockResolvedValue('Actif');

        const result = await populateManager.populateProperties(classConfig);

        // Should continue and return statut
        expect(result).toEqual({
            statut: 'Actif'
        });
    });
});
