/**
 * @jest-environment jsdom
 * 
 * Test simple pour reproduire le problème exact de l'utilisateur:
 * "j'ai un pb quand je créer un nv objet alors qu'il n'y en a pas (et que la prop existe pas dans le fichier) ça m'écrase les propriété existantes"
 */

import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { Property } from '../../src/properties/Property';
import { Vault } from '../../src/vault/Vault';
import { File } from '../../src/vault/File';

jest.mock('../../src/vault/Utils', () => ({
    setIcon: jest.fn()
}));

describe('ObjectProperty - SIMPLE BUG REPRODUCTION', () => {
    let mockVault: jest.Mocked<Vault>;
    let mockApp: any;
    let mockIFile: any;

    beforeEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();

        mockApp = {
            getMetadata: jest.fn(),
            updateMetadata: jest.fn(),
            setIcon: jest.fn()
        };

        mockIFile = {
            getPath: () => '/test/document.md',
            getName: () => 'document.md'
        };

        mockVault = {
            app: mockApp,
            getFromLink: jest.fn(),
            getProcessManager: jest.fn().mockReturnValue({
                runProcesses: jest.fn()
            })
        } as any;
    });

    test('SIMPLE CASE: File.updateMetadata preserves other properties when updating single property', async () => {
        /**
         * Test direct de File.updateMetadata pour voir s'il préserve bien les autres propriétés
         */
        
        const file = new File(mockVault, mockIFile);
        
        // État initial du fichier avec plusieurs propriétés
        const initialMetadata = {
            titre: 'Document Important',
            description: 'Une description très importante',
            statut: 'En cours',
            tags: ['urgent', 'client-vip']
        };
        
        mockApp.getMetadata.mockResolvedValue({ ...initialMetadata });
        
        // L'utilisateur ajoute une nouvelle propriété via File.updateMetadata
        await file.updateMetadata('projets', [{ nom: 'Nouveau Projet', prix: 1000 }]);
        
        // Vérifier ce qui a été sauvé
        expect(mockApp.updateMetadata).toHaveBeenCalledTimes(1);
        const updateCall = mockApp.updateMetadata.mock.calls[0];
        const savedMetadata = updateCall[1];
        
        // ✅ Les propriétés existantes DOIVENT être préservées
        expect(savedMetadata.titre).toBe('Document Important');
        expect(savedMetadata.description).toBe('Une description très importante');
        expect(savedMetadata.statut).toBe('En cours');
        expect(savedMetadata.tags).toEqual(['urgent', 'client-vip']);
        
        // ✅ La nouvelle propriété DOIT être ajoutée
        expect(savedMetadata.projets).toEqual([{ nom: 'Nouveau Projet', prix: 1000 }]);
    });

    test('EDGE CASE: What if getMetadata returns null?', async () => {
        /**
         * Test du cas où getMetadata retourne null
         * Ceci pourrait causer un écrasement complet
         */
        
        const file = new File(mockVault, mockIFile);
        
        // getMetadata retourne null (fichier sans metadata)
        mockApp.getMetadata.mockResolvedValue(null);
        
        // Tenter d'ajouter une propriété
        await file.updateMetadata('projets', [{ nom: 'Nouveau Projet' }]);
        
        // Dans ce cas, updateMetadata devrait ne rien faire (return early)
        // Car il ne peut pas modifier un fichier sans metadata
        expect(mockApp.updateMetadata).not.toHaveBeenCalled();
    });

    test('EDGE CASE: What if getMetadata returns empty object?', async () => {
        /**
         * Test du cas où getMetadata retourne un objet vide
         */
        

        const file = new File(mockVault, mockIFile);
        
        // getMetadata retourne un objet vide
        mockApp.getMetadata.mockResolvedValue({});
        
        // Ajouter une propriété
        await file.updateMetadata('projets', [{ nom: 'Nouveau Projet' }]);
        
        // Ceci devrait marcher et créer juste la propriété
        expect(mockApp.updateMetadata).toHaveBeenCalledWith(
            mockIFile,
            { projets: [{ nom: 'Nouveau Projet' }] }
        );
    });

    test('COMPLEX: Test the exact user scenario with ObjectProperty UI', async () => {
        /**
         * Test complet du scénario utilisateur :
         * 1. Fichier avec propriétés existantes
         * 2. ObjectProperty n'existe pas encore (undefined)
         * 3. Utilisateur clique sur + pour créer premier objet
         * 4. Vérifier que rien n'est écrasé
         */
        
        const mockTextProperty = Object.create(Property.prototype);
        Object.assign(mockTextProperty, {
            name: 'nom',
            type: 'text',
            getDefaultValue: jest.fn().mockReturnValue(''),
            fillDisplay: jest.fn().mockReturnValue(document.createElement('input'))
        });

        const objectProperty = new ObjectProperty('projets', mockVault, {
            'nom': mockTextProperty
        });
        
        // État initial : fichier avec propriétés mais sans 'projets'
        const initialMetadata = {
            titre: 'Mon Document',
            description: 'Description importante',
            statut: 'Actif'
        };
        
        mockApp.getMetadata.mockResolvedValue({ ...initialMetadata });
        
        let capturedMetadata: any = null;
        mockApp.updateMetadata.mockImplementation(async (file: any, metadata: any) => {
            capturedMetadata = { ...metadata };
        });
        
        // Simulation de l'interface utilisateur
        const container = objectProperty.fillDisplay(undefined, async (newValues) => {
            // Cette callback simule ce qui se passe dans l'interface réelle
            // Elle devrait appeler quelque chose qui préserve les propriétés existantes
            
            // PROBLÈME POTENTIEL : Si cette callback ne fait que savegarder 'projets' 
            // sans prendre en compte les autres propriétés, on aura l'écrasement !
            
            // Version problématique (qui écrase) :
            // await mockApp.updateMetadata(mockIFile, { projets: newValues });
            
            // Version correcte (qui préserve) :
            const currentMetadata = await mockApp.getMetadata(mockIFile);
            await mockApp.updateMetadata(mockIFile, {
                ...currentMetadata,
                projets: newValues
            });
        });
        
        // Simulation du clic sur le bouton +
        const addButton = container.querySelector('.metadata-add-button') as HTMLButtonElement;
        await addButton.click();
        
        // Vérification
        expect(capturedMetadata).not.toBeNull();
        expect(capturedMetadata.titre).toBe('Mon Document');
        expect(capturedMetadata.description).toBe('Description importante');
        expect(capturedMetadata.statut).toBe('Actif');
        expect(capturedMetadata.projets).toEqual([{ nom: '' }]);
    });
});