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
    let mockClasse: any; // ✅ Classe mock for fixed tests

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

        // File wrapper (kept for COMPARISON test)
        mockFile = new File(mockVault, mockIFile);
        
        // Mock File.updateMetadata pour simuler l'approche problématique qui écrase
        mockFile.updateMetadata = jest.fn().mockImplementation(async (key: string, value: any) => {
            // ❌ APPROCHE PROBLÉMATIQUE : On écrase tout en ne gardant que la nouvelle propriété
            // C'est exactement ce qui causait le bug !
            await mockApp.updateMetadata(mockIFile, { [key]: value });
        });

        // ✅ Classe mock — delegates via updatePropertyValue
        mockClasse = {
            updatePropertyValue: jest.fn().mockResolvedValue(undefined),
            getVault: jest.fn().mockReturnValue(mockVault),
        };

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

    test('FIX CONFIRMED: getDisplayProperties uses classe.updatePropertyValue, not app.updateMetadata directly', async () => {
        /**
         * ✅ CORRECTION APPLIQUÉE:
         * getDisplayProperties attend désormais un Classe (plus un File).
         * La callback fait maintenant :
         * `async (value) => await classe.updatePropertyValue(this.name, value)`
         * 
         * Ainsi toute la logique Classe.updateMetadata (dont updateParentFolder) est respectée.
         */
        
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
        
        // ✅ Appel avec mockClasse (Classe-compatible)
        const displayProperties = await objectProperty.getDisplayProperties(mockClasse, 'client', 'nom');
        
        expect(displayProperties).toHaveLength(2);
        
        // L'utilisateur modifie une valeur dans l'interface
        const firstDisplay = displayProperties[0].display;
        expect(firstDisplay.tagName).toBe('INPUT');
        
        firstDisplay.value = 'Nouveau nom du projet';
        await firstDisplay.dispatchEvent(new Event('change'));
        
        // ✅ FIX: classe.updatePropertyValue est appelé
        expect(mockClasse.updatePropertyValue).toHaveBeenCalledWith(
            'projets',
            expect.arrayContaining([expect.objectContaining({ nom: 'Nouveau nom du projet' })])
        );
        
        // ✅ FIX: app.updateMetadata n'est PAS appelé directement
        expect(mockApp.updateMetadata).not.toHaveBeenCalled();
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

describe('ObjectProperty - FIX: getDisplayProperties should use Classe.updatePropertyValue', () => {
    let mockVault: jest.Mocked<Vault>;
    let objectProperty: ObjectProperty;
    let mockApp: any;
    let mockClasse: any;

    beforeEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();

        mockApp = {
            getMetadata: jest.fn(),
            updateMetadata: jest.fn(),
            setIcon: jest.fn()
        };

        mockVault = { app: mockApp, getFromLink: jest.fn() } as any;

        // ✅ A Classe mock — has updatePropertyValue, NOT updateMetadata
        mockClasse = {
            updatePropertyValue: jest.fn().mockResolvedValue(undefined),
            getVault: jest.fn().mockReturnValue(mockVault),
            // Intentionally omit updateMetadata to prove it's never called
        };

        const mockTextProperty = Object.create(Property.prototype);
        Object.assign(mockTextProperty, {
            name: 'nom',
            type: 'text',
            getDefaultValue: jest.fn().mockReturnValue(''),
            fillDisplay: jest.fn((value: any, updateCallback: any) => {
                const input = document.createElement('input');
                input.value = value || '';
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

        objectProperty.read = jest.fn().mockResolvedValue([
            { client: '[[client1]]', nom: 'Projet 1' },
        ]);

        objectProperty.updateObject = jest.fn().mockImplementation(
            async (values: any[], updateCallback: any, index: number, property: any, value: any) => {
                values[index][property.name] = value;
                await updateCallback(values);
            }
        );

        mockVault.getFromLink.mockResolvedValue({ getName: () => 'client1' } as any);
    });

    test('should call classe.updatePropertyValue (not file.updateMetadata) when user edits a value', async () => {
        // Regression: getDisplayProperties used to call file.updateMetadata(this.name, value)
        // which bypasses Classe.updateMetadata() and its updateParentFolder() logic.
        // After fix: it calls classe.updatePropertyValue(this.name, value) like every other property.

        const displayProperties = await objectProperty.getDisplayProperties(
            mockClasse,
            'client',
            'nom'
        );

        expect(displayProperties).toHaveLength(1);

        // Simulate user editing the value
        const input = displayProperties[0].display;
        input.value = 'Projet Modifié';
        await input.dispatchEvent(new Event('change'));

        // ✅ Must go through Classe.updatePropertyValue
        expect(mockClasse.updatePropertyValue).toHaveBeenCalledWith(
            'projets',
            expect.arrayContaining([expect.objectContaining({ nom: 'Projet Modifié' })])
        );

        // ❌ Must NOT call app.updateMetadata directly
        expect(mockApp.updateMetadata).not.toHaveBeenCalled();
    });
});