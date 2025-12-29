/**
 * @jest-environment jsdom
 * 
 * Test qui reproduit et corrige le problème d'écrasement des propriétés existantes
 * quand on crée un nouvel objet ObjectProperty sur une propriété qui n'existait pas.
 */

import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { Property } from '../../src/properties/Property';
import { Vault } from '../../src/vault/Vault';

// Mock des dépendances
jest.mock('../../src/vault/Utils', () => ({
    setIcon: jest.fn()
}));

describe('ObjectProperty - New Object Creation Without Overwriting Existing Properties', () => {
    let mockVault: jest.Mocked<Vault>;
    let objectProperty: ObjectProperty;
    let mockTextProperty: any;
    let mockNumberProperty: any;

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';
        jest.clearAllMocks();

        // Mock du vault
        mockVault = {
            app: {
                updateMetadata: jest.fn(),
                setIcon: jest.fn() // Mock de setIcon pour éviter les erreurs
            },
            getFromLink: jest.fn()
        } as any;

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

        const properties = {
            nom: mockTextProperty,
            montant: mockNumberProperty
        };

        objectProperty = new ObjectProperty('projets', mockVault, properties);
    });

    test('should not overwrite existing file properties - reproduce the bug', async () => {
        /**
         * CONTEXTE: 
         * - Un fichier a déjà des propriétés (titre, description, etc.)
         * - La propriété 'projets' ObjectProperty n'existe PAS encore dans le fichier
         * - L'utilisateur veut créer le premier objet dans la propriété 'projets'
         * 
         * PROBLÈME ATTENDU:
         * - Le callback 'update' devrait recevoir seulement le nouveau tableau pour 'projets'
         * - Il NE DOIT PAS écraser les autres propriétés du fichier
         */

        // Simule la callback update qui sera utilisée par l'ObjectProperty
        // Cette callback est normalement fournie par Classe.updatePropertyValue
        const mockUpdate = jest.fn();
        const container = document.createElement('div');

        // 🔍 CAS PROBLÉMATIQUE: values=undefined (la propriété n'existe pas encore)
        await objectProperty.addProperty(undefined, mockUpdate, container);

        // Vérifications de base
        expect(mockUpdate).toHaveBeenCalledTimes(1);
        const newValues = mockUpdate.mock.calls[0][0];
        
        expect(Array.isArray(newValues)).toBe(true);
        expect(newValues).toHaveLength(1);
        expect(newValues[0]).toEqual({
            nom: '',
            montant: 0
        });

        // ✅ Le test passe - la logique actuelle semble correcte
        // L'ObjectProperty crée bien un nouveau tableau avec un objet
        // Le problème pourrait être ailleurs (dans Classe.updatePropertyValue?)
    });

    test('should preserve existing objects when adding to non-empty array', async () => {
        const existingProjects = [
            { nom: 'Projet 1', montant: 1000 },
            { nom: 'Projet 2', montant: 2000 }
        ];

        const mockUpdate = jest.fn();
        const container = document.createElement('div');

        await objectProperty.addProperty(existingProjects, mockUpdate, container);

        expect(mockUpdate).toHaveBeenCalledTimes(1);
        const updatedValues = mockUpdate.mock.calls[0][0];

        expect(Array.isArray(updatedValues)).toBe(true);
        expect(updatedValues).toHaveLength(3);
        
        // Vérifier que les objets existants sont préservés
        expect(updatedValues[0]).toEqual({ nom: 'Projet 1', montant: 1000 });
        expect(updatedValues[1]).toEqual({ nom: 'Projet 2', montant: 2000 });
        expect(updatedValues[2]).toEqual({ nom: '', montant: 0 });
    });

    test('should handle null values parameter correctly', async () => {
        const mockUpdate = jest.fn();
        const container = document.createElement('div');

        // Test avec null explicite
        await objectProperty.addProperty(null, mockUpdate, container);

        expect(mockUpdate).toHaveBeenCalledTimes(1);
        const newValues = mockUpdate.mock.calls[0][0];
        
        expect(Array.isArray(newValues)).toBe(true);
        expect(newValues).toHaveLength(1);
    });
});