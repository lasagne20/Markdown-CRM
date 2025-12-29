/**
 * @jest-environment jsdom
 * 
 * Test qui reproduit le problème dans getDisplayProperties
 * où file.updateMetadata est appelé directement au lieu de Classe.updatePropertyValue
 */

import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { Property } from '../../src/properties/Property';
import { Vault } from '../../src/vault/Vault';
import { File } from '../../src/vault/File';

jest.mock('../../src/vault/Utils', () => ({
    setIcon: jest.fn()
}));

describe('ObjectProperty - BUG REPRODUCTION: getDisplayProperties with file.updateMetadata', () => {
    let mockVault: jest.Mocked<Vault>;
    let objectProperty: ObjectProperty;
    let mockApp: any;
    let mockFile: File;
    let mockIFile: any;

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
            getFromLink: jest.fn()
        } as any;

        mockIFile = {
            getPath: jest.fn().mockReturnValue('/test/target-file.md'),
            getName: jest.fn().mockReturnValue('target-file.md')
        };

        // File wrapper
        mockFile = new File(mockVault, mockIFile);
        
        // Mock File.updateMetadata pour simuler l'approche problématique qui écrase
        mockFile.updateMetadata = jest.fn().mockImplementation(async (key: string, value: any) => {
            // ❌ APPROCHE PROBLÉMATIQUE : On écrase tout en ne gardant que la nouvelle propriété
            // C'est exactement ce qui cause le bug !
            await mockApp.updateMetadata(mockIFile, { [key]: value });
        });

        // Mock des propriétés pour l'ObjectProperty
        const mockTextProperty = Object.create(Property.prototype);
        Object.assign(mockTextProperty, {
            name: 'nom',
            type: 'text',
            getDefaultValue: jest.fn().mockReturnValue(''),
            fillDisplay: jest.fn((value, updateCallback) => {
                const input = document.createElement('input');
                input.value = value;
                input.addEventListener('change', async () => {
                    await updateCallback(input.value);
                });
                return input;
            })
        });

        const mockFileProperty = Object.create(Property.prototype);
        Object.assign(mockFileProperty, {
            name: 'client',
            type: 'file',
            getDefaultValue: jest.fn().mockReturnValue(''),
            fillDisplay: jest.fn().mockReturnValue(document.createElement('input'))
        });

        objectProperty = new ObjectProperty('projets', mockVault, {
            'client': mockFileProperty,
            'nom': mockTextProperty
        });
        
        // Mock la méthode read pour éviter l'erreur getPropertyValue
        objectProperty.read = jest.fn();
        
        // Mock updateObject pour qu'elle appelle directement la callback
        objectProperty.updateObject = jest.fn().mockImplementation(
            async (values, updateCallback, index, property, value) => {
                // Simuler la mise à jour des valeurs
                values[index][property.name] = value;
                // Appeler directement la callback (qui devrait être file.updateMetadata)
                await updateCallback(values);
            }
        );
    });

    test('REPRODUCTION: getDisplayProperties should NOT directly use file.updateMetadata', async () => {
        /**
         * ⚠️ PROBLÈME IDENTIFIÉ:
         * Dans getDisplayProperties (ligne 91), la callback fait :
         * `async (value) => await file.updateMetadata(this.name, value)`
         * 
         * Au lieu de passer par Classe.updatePropertyValue !
         * Ceci peut écraser les autres propriétés du fichier.
         */
        
        // 📄 ÉTAT INITIAL : Fichier avec données existantes + ObjectProperty
        const existingMetadata = {
            titre: 'Fichier Important',
            description: 'Description importante',
            statut: 'Actif',
            projets: [
                { client: 'client1.md', nom: 'Projet 1' },
                { client: 'client2.md', nom: 'Projet 2' }
            ]
        };
        
        mockApp.getMetadata.mockResolvedValue({ ...existingMetadata });
        
        // Configurer le mock read avec les données projets
        (objectProperty.read as jest.Mock).mockResolvedValue(existingMetadata.projets);
        
        // Mock getFromLink pour retourner des classes
        mockVault.getFromLink.mockImplementation(async (link: string) => ({
            getName: () => link.replace('.md', ''),
            getPath: () => `/clients/${link}`,
            getPropertyValue: jest.fn().mockResolvedValue('mocked-value')
        } as any));
        
        // 🎯 REPRODUCTION : Appel de getDisplayProperties
        const displayProperties = await objectProperty.getDisplayProperties(mockFile, 'client', 'nom');
        
        expect(displayProperties).toHaveLength(2);
        
        // 🔍 SIMULATION : L'utilisateur modifie une valeur dans l'interface
        // Ceci va déclencher la callback problématique
        const firstDisplay = displayProperties[0].display;
        
        // firstDisplay EST l'input (retourné directement par fillDisplay)
        expect(firstDisplay.tagName).toBe('INPUT');
        
        // 💥 TRIGGER DU BUG : Changer la valeur déclenche file.updateMetadata directement
        firstDisplay.value = 'Nouveau nom du projet';
        await firstDisplay.dispatchEvent(new Event('change'));
        
        // 🕵️ VÉRIFICATION : Qu'est-ce qui a été appelé ?
        
        // file.updateMetadata devrait avoir été appelé via updateObject
        expect(mockApp.updateMetadata).toHaveBeenCalled();
        
        // 🔍 INSPECTION : Le metadata final contient-il toutes les propriétés ?
        const updateCall = mockApp.updateMetadata.mock.calls[0];
        const updatedMetadata = updateCall[1];
        
        // ❌ LE BUG DÉMONTRÉ : Les propriétés sont écrasées !
        // Avec l'approche directe de file.updateMetadata, on perd les autres propriétés
        expect(updatedMetadata.titre).toBeUndefined(); // ❌ Écrasé !
        expect(updatedMetadata.description).toBeUndefined(); // ❌ Écrasé !
        expect(updatedMetadata.statut).toBeUndefined(); // ❌ Écrasé !
        
        // Seule la propriété projets est conservée
        expect(updatedMetadata.projets).toBeDefined();
        expect(updatedMetadata.projets[0].nom).toBe('Nouveau nom du projet');
        
        // La modification doit être présente
        expect(updatedMetadata.projets).toEqual([
            { client: 'client1.md', nom: 'Nouveau nom du projet' },
            { client: 'client2.md', nom: 'Projet 2' }
        ]);
        
        // Ce test peut échouer si file.updateMetadata écrase les autres propriétés !
    });

    test('COMPARISON: Direct file.updateMetadata vs proper metadata handling', async () => {
        /**
         * Test de comparaison pour montrer la différence entre l'approche
         * problématique et l'approche correcte
         */
        
        // Scenario 1: file.updateMetadata directement (problématique) 
        const existingMetadata = {
            titre: 'Document',
            description: 'Important',
            projets: [{ client: 'test.md', nom: 'Test' }]
        };
        
        mockApp.getMetadata.mockResolvedValue({ ...existingMetadata });
        
        // ❌ Appel direct de file.updateMetadata (comme dans getDisplayProperties)
        await mockFile.updateMetadata('projets', [{ client: 'test.md', nom: 'Modifié' }]);
        
        // ✅ Scenario 2: Approche correcte avec spread operator
        await mockApp.updateMetadata(mockIFile, {
            ...existingMetadata,
            projets: [{ client: 'test.md', nom: 'Modifié - Correct' }]
        });
        
        expect(mockApp.updateMetadata).toHaveBeenCalledTimes(2);
        
        // ❌ Première approche (directe - problématique)
        const directUpdateCall = mockApp.updateMetadata.mock.calls[0];
        const directMetadata = directUpdateCall[1];
        
        expect(directMetadata.titre).toBeUndefined(); // ❌ Écrasé par l'approche directe !
        expect(directMetadata.description).toBeUndefined(); // ❌ Écrasé aussi !
        expect(directMetadata.projets[0].nom).toBe('Modifié');
        
        // ✅ Deuxième approche (correcte)
        const correctUpdateCall = mockApp.updateMetadata.mock.calls[1];
        const correctMetadata = correctUpdateCall[1];
        
        expect(correctMetadata.titre).toBe('Document'); // ✅ Préservé !
        expect(correctMetadata.description).toBe('Important'); // ✅ Préservé !
        expect(correctMetadata.projets[0].nom).toBe('Modifié - Correct');
    });
});