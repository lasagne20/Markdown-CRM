/**
 * @jest-environment jsdom
 * 
 * Test qui reproduit et corrige le problème d'écrasement des propriétés existantes
 * quand on crée un nouvel objet ObjectProperty sur une propriété qui n'existait pas.
 */

import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { Property } from '../../src/properties/Property';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { File } from '../../src/vault/File';

// Mock des dépendances
jest.mock('../../src/vault/Utils', () => ({
    setIcon: jest.fn()
}));

describe('ObjectProperty - New Object Creation Without Overwriting Existing Properties', () => {
    let mockVault: jest.Mocked<Vault>;
    let objectProperty: ObjectProperty;
    let mockTextProperty: any;
    let mockNumberProperty: any;
    let mockApp: any;
    let mockFile: any;
    let testClasse: Classe;

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';
        jest.clearAllMocks();

        // Mock de l'app
        mockApp = {
            getMetadata: jest.fn(),
            updateMetadata: jest.fn(),
            setIcon: jest.fn()
        };

        // Mock du vault
        mockVault = {
            app: mockApp,
            getFromLink: jest.fn()
        } as any;

        // Mock du file
        mockFile = {
            getPath: jest.fn().mockReturnValue('/test/file.md'),
            getName: jest.fn().mockReturnValue('file.md')
        };

        // Mock des propriétés simples
        mockTextProperty = Object.create(Property.prototype);
        Object.assign(mockTextProperty, {
            name: 'nom',
            type: 'text',
            getDefaultValue: jest.fn().mockReturnValue(''),
            fillDisplay: jest.fn().mockReturnValue(document.createElement('input'))
        });

        mockNumberProperty = Object.create(Property.prototype);
        Object.assign(mockNumberProperty, {
            name: 'montant',
            type: 'number',
            getDefaultValue: jest.fn().mockReturnValue(0),
            fillDisplay: jest.fn().mockReturnValue(document.createElement('input'))
        });

        // Configuration de l'ObjectProperty
        objectProperty = new ObjectProperty('projets', mockVault, {
            'nom': mockTextProperty,
            'montant': mockNumberProperty
        });

        // Création d'une instance de test de Classe  
        testClasse = new Classe(mockVault);
        (testClasse as any).file = mockFile;
    });

    test('should not overwrite existing file properties - reproduce the bug', async () => {
        /**
         * CONTEXTE RÉEL: 
         * - Un fichier a déjà des propriétés (titre: "Mon Document", description: "Une description", etc.)
         * - La propriété 'projets' ObjectProperty n'existe PAS encore dans le fichier
         * - L'utilisateur clique sur le bouton "+" pour créer le premier objet dans 'projets'
         * 
         * PROBLÈME ATTENDU:
         * - Après la création, le fichier devrait avoir : {titre: "Mon Document", description: "Une description", projets: [{nom: "", montant: 0}]}
         * - Mais actuellement, il se peut que les propriétés existantes soient écrasées
         */

        // Simule un fichier avec des propriétés existantes
        const existingMetadata = {
            titre: 'Mon Document',
            description: 'Une description importante',
            tag: ['tag1', 'tag2'],
            dateCreation: '2023-12-01'
        };
        
        mockApp.getMetadata.mockResolvedValue({ ...existingMetadata });

        // Simule la callback update complète via Classe.updatePropertyValue
        // C'est la vraie chaîne d'appel dans l'application
        const updateCallback = async (newProjectsValue: any) => {
            await testClasse.updatePropertyValue('projets', newProjectsValue);
        };

        const container = document.createElement('div');

        // 🔍 CAS PROBLÉMATIQUE: values=undefined (la propriété 'projets' n'existe pas encore)
        await objectProperty.addProperty(undefined, updateCallback, container);

        // Vérifications - Ce qui devrait se passer
        expect(mockApp.updateMetadata).toHaveBeenCalledTimes(1);
        
        const updateCall = mockApp.updateMetadata.mock.calls[0];
        const updatedMetadata = updateCall[1];

        // Le fichier DOIT conserver toutes ses propriétés existantes
        expect(updatedMetadata.titre).toBe('Mon Document');
        expect(updatedMetadata.description).toBe('Une description importante');
        expect(updatedMetadata.tag).toEqual(['tag1', 'tag2']);
        expect(updatedMetadata.dateCreation).toBe('2023-12-01');

        // ET avoir la nouvelle propriété projets
        expect(updatedMetadata.projets).toEqual([
            { nom: '', montant: 0 }
        ]);

        // Si ce test échoue, c'est qu'il y a le bug d'écrasement !
    });

    test('should preserve existing objects when adding to non-empty array', async () => {
        const existingMetadata = {
            titre: 'Mon Document', 
            projets: [
                { nom: 'Projet 1', montant: 1000 },
                { nom: 'Projet 2', montant: 2000 }
            ]
        };

        mockApp.getMetadata.mockResolvedValue({ ...existingMetadata });

        const updateCallback = async (newProjectsValue: any) => {
            await testClasse.updatePropertyValue('projets', newProjectsValue);
        };

        const container = document.createElement('div');

        await objectProperty.addProperty(existingMetadata.projets, updateCallback, container);

        const updateCall = mockApp.updateMetadata.mock.calls[0];
        const updatedMetadata = updateCall[1];

        // Les propriétés existantes doivent être préservées
        expect(updatedMetadata.titre).toBe('Mon Document');
        
        // L'array projets doit avoir le nouvel objet
        expect(updatedMetadata.projets).toEqual([
            { nom: 'Projet 1', montant: 1000 },
            { nom: 'Projet 2', montant: 2000 },
            { nom: '', montant: 0 }
        ]);
    });

    test('should handle null values parameter correctly', async () => {
        const existingMetadata = {
            titre: 'Mon Document',
            description: 'Une description'
        };

        mockApp.getMetadata.mockResolvedValue({ ...existingMetadata });

        const updateCallback = async (newProjectsValue: any) => {
            await testClasse.updatePropertyValue('projets', newProjectsValue);
        };

        const container = document.createElement('div');

        // Test avec null explicite
        await objectProperty.addProperty(null, updateCallback, container);

        const updateCall = mockApp.updateMetadata.mock.calls[0];
        const updatedMetadata = updateCall[1];

        // Les propriétés existantes doivent être préservées
        expect(updatedMetadata.titre).toBe('Mon Document');
        expect(updatedMetadata.description).toBe('Une description');
        expect(updatedMetadata.projets).toEqual([
            { nom: '', montant: 0 }
        ]);
    });
});