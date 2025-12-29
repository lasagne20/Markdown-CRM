/**
 * @jest-environment jsdom
 * 
 * Test qui reproduit le problème exact rapporté par l'utilisateur :
 * "j'ai un pb quand je créer un nv objet alors qu'il n'y en a pas (et que la prop existe pas dans le fichier) ça m'écrase les propriété existantes"
 */

import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { Property } from '../../src/properties/Property';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { File } from '../../src/vault/File';

jest.mock('../../src/vault/Utils', () => ({
    setIcon: jest.fn()
}));

describe('ObjectProperty - BUG REPRODUCTION: Overwriting existing properties when creating first object', () => {
    let mockVault: jest.Mocked<Vault>;
    let objectProperty: ObjectProperty;
    let mockApp: any;
    let mockFile: any;
    let testClasse: Classe;
    let updateCallbackSpy: jest.SpyInstance;

    beforeEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();

        mockApp = {
            getMetadata: jest.fn(),
            updateMetadata: jest.fn(),
            setIcon: jest.fn()
        };

        mockVault = {
            app: mockApp,
            getFromLink: jest.fn(),
            getProcessManager: jest.fn().mockReturnValue({
                runProcesses: jest.fn()
            })
        } as any;

        mockFile = {
            getPath: jest.fn().mockReturnValue('/test/mon-document.md'),
            getName: jest.fn().mockReturnValue('mon-document.md')
        };

        // Mock des propriétés pour l'ObjectProperty
        const mockTextProperty = Object.create(Property.prototype);
        Object.assign(mockTextProperty, {
            name: 'nom',
            type: 'text',
            getDefaultValue: jest.fn().mockReturnValue(''),
            fillDisplay: jest.fn().mockReturnValue(document.createElement('input'))
        });

        const mockNumberProperty = Object.create(Property.prototype);
        Object.assign(mockNumberProperty, {
            name: 'prix',
            type: 'number',
            getDefaultValue: jest.fn().mockReturnValue(0),
            fillDisplay: jest.fn().mockReturnValue(document.createElement('input'))
        });

        objectProperty = new ObjectProperty('projets', mockVault, {
            'nom': mockTextProperty,
            'prix': mockNumberProperty
        });

        // Création d'une instance de Classe avec monitoring des appels
        testClasse = new Classe(mockVault);
        (testClasse as any).file = mockFile;
        
        // Spy sur updatePropertyValue pour surveiller les appels
        updateCallbackSpy = jest.spyOn(testClasse, 'updatePropertyValue');
    });

    test('REPRODUCTION: Creating first object in non-existent property should not overwrite other properties', async () => {
        /**
         * ⚠️ SCÉNARIO DU BUG:
         * 1. Un fichier existe avec des propriétés: { titre: "Mon Doc", description: "...", statut: "actif" }
         * 2. La propriété 'projets' n'existe PAS encore dans le fichier (undefined)
         * 3. L'utilisateur clique sur le bouton "+" pour créer un premier objet
         * 4. BUG: Au lieu d'avoir { titre: "Mon Doc", description: "...", statut: "actif", projets: [{...}] }
         *    On se retrouve avec juste: { projets: [{...}] } - les autres propriétés disparaissent !
         */
        
        // 📄 ÉTAT INITIAL : Un fichier avec plusieurs propriétés importantes
        const initialMetadata = {
            titre: 'Mon Document Important',
            description: 'Une description très importante',
            statut: 'En cours',
            tags: ['urgent', 'client-vip'],
            dateCreation: '2023-12-01'
        };
        
        // Mock que getMetadata retourne l'état initial
        mockApp.getMetadata.mockResolvedValue({ ...initialMetadata });
        
        // Mock updateMetadata pour capturer ce qui est écrit
        let finalMetadata: any = null;
        mockApp.updateMetadata.mockImplementation(async (file: any, metadata: any) => {
            finalMetadata = { ...metadata }; // Capture ce qui est sauvé
        });

        // 🔍 REPRODUCTION DU PROBLÈME : Simulation de l'interface utilisateur
        
        // 1. L'ObjectProperty crée son interface via fillDisplay
        const container = objectProperty.fillDisplay(undefined, async (newProjectsArray) => {
            // Cette callback est fournie par l'interface et appelle updatePropertyValue
            await testClasse.updatePropertyValue('projets', newProjectsArray);
        });
        
        document.body.appendChild(container);
        
        // 2. L'utilisateur clique sur le bouton "+" pour créer un premier objet
        const addButton = container.querySelector('.metadata-add-button') as HTMLButtonElement;
        expect(addButton).not.toBeNull();
        
        // 3. Simulation du clic (déclenche addProperty)
        await addButton.click();
        
        // 4. Attendre que toutes les opérations asynchrones soient terminées
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 🔍 VÉRIFICATION : Le bug est-il présent ?
        
        // Vérifier que updatePropertyValue a bien été appelé
        expect(updateCallbackSpy).toHaveBeenCalledTimes(1);
        expect(updateCallbackSpy).toHaveBeenCalledWith('projets', [
            { nom: '', prix: 0 }
        ]);
        
        // Vérifier que updateMetadata a été appelé 
        expect(mockApp.updateMetadata).toHaveBeenCalledTimes(1);
        
        // ❌ LE BUG : Si finalMetadata ne contient pas toutes les propriétés initiales
        expect(finalMetadata).not.toBeNull();
        
        // 🎯 TEST DU BUG : Ces propriétés DOIVENT être préservées
        expect(finalMetadata.titre).toBe('Mon Document Important');
        expect(finalMetadata.description).toBe('Une description très importante');
        expect(finalMetadata.statut).toBe('En cours');
        expect(finalMetadata.tags).toEqual(['urgent', 'client-vip']);
        expect(finalMetadata.dateCreation).toBe('2023-12-01');
        
        // ET la nouvelle propriété doit être présente
        expect(finalMetadata.projets).toEqual([
            { nom: '', prix: 0 }
        ]);
        
        // Si ce test échoue, c'est qu'il y a bien le bug d'écrasement !
    });

    test('CONTROL: Verify that getMetadata is called before updatePropertyValue', async () => {
        // Test de contrôle pour s'assurer que notre setup fonctionne
        const initialMetadata = {
            existingProp: 'existing value'
        };
        
        mockApp.getMetadata.mockResolvedValue({ ...initialMetadata });
        
        // Appel direct de updatePropertyValue
        await testClasse.updatePropertyValue('newProp', 'new value');
        
        // Vérifier les appels
        expect(mockApp.getMetadata).toHaveBeenCalled();
        expect(mockApp.updateMetadata).toHaveBeenCalledWith(
            mockFile,
            {
                existingProp: 'existing value',
                newProp: 'new value'
            }
        );
    });

    test('EDGE CASE: What happens when metadata is null/undefined', async () => {
        // Edge case: fichier sans metadata
        mockApp.getMetadata.mockResolvedValue(null);
        
        const container = objectProperty.fillDisplay(undefined, async (newProjectsArray) => {
            await testClasse.updatePropertyValue('projets', newProjectsArray);
        });
        
        document.body.appendChild(container);
        
        const addButton = container.querySelector('.metadata-add-button') as HTMLButtonElement;
        await addButton.click();
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Même avec metadata null, on ne doit pas avoir d'erreur
        expect(mockApp.updateMetadata).toHaveBeenCalled();
    });
});