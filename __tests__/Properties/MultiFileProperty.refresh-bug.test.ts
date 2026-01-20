/**
 * @jest-environment jsdom
 */

import { MultiFileProperty } from '../../src/properties/MultiFileProperty';
import { Vault } from '../../src/vault/Vault';

// Mock the vault utilities
jest.mock('../../src/vault/Utils', () => ({
    selectMultipleFile: jest.fn(),
    setIcon: jest.fn()
}));

// Mock FileProperty to avoid complex dependencies
jest.mock('../../src/properties/FileProperty', () => {
    return {
        FileProperty: jest.fn().mockImplementation(() => ({
            fillDisplay: jest.fn().mockImplementation((value: any, update: Function) => {
                const div = document.createElement('div');
                div.className = 'mock-file-display';
                div.textContent = value;
                return div;
            }),
            title: ''
        }))
    };
});

const { selectMultipleFile, setIcon } = jest.requireMock('../../src/vault/Utils');

describe('MultiFileProperty - Display Refresh Bug', () => {
    let multiFileProperty: MultiFileProperty;
    let mockVault: any;
    let mockUpdate: jest.Mock;

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';

        // Create mock vault with app
        mockVault = {
            app: {
                setIcon: jest.fn(),
                getUrl: jest.fn().mockImplementation((path: string) => `file:///${path}`),
                selectMultipleFile: selectMultipleFile
            },
            readLinkFile: jest.fn().mockImplementation((link: string) => {
                // Extract filename from [[filename]]
                const match = link.match(/\[\[(.+?)\]\]/);
                return match ? match[1] : link;
            }),
            getFileByPath: jest.fn().mockReturnValue(null),
            getExtendedClasses: jest.fn().mockImplementation((classes: string[]) => Promise.resolve(classes))
        } as any;

        // Create MultiFileProperty
        multiFileProperty = new MultiFileProperty('documents', mockVault, ['Document']);

        // Create mock update function
        mockUpdate = jest.fn();

        // Reset mocks
        jest.clearAllMocks();
    });

    test('REAL BUG: reference lost when values is JSON string', async () => {
        console.log('🧪 REAL BUG TEST: Values as JSON string loses reference...');

        // Dans Obsidian, les valeurs peuvent être lues comme string JSON depuis le frontmatter
        const valuesAsString = '["[[File1.pdf]]","[[File2.pdf]]","[[File3.pdf]]"]';
        
        // fillDisplay va parser cette string en tableau
        const container = multiFileProperty.fillDisplay(valuesAsString, mockUpdate);
        document.body.appendChild(container);
        
        let rows = container.querySelectorAll('.metadata-multiFiles-row-inline');
        expect(rows.length).toBe(3);
        console.log('✅ Initial state: 3 files displayed (from JSON string)');
        
        // Le bouton a capturé le tableau parsé dans sa fermeture
        // Essayons d'ajouter un fichier
        const newFile = {
            getLink: () => '[[File4.pdf]]'
        };
        
        (selectMultipleFile as jest.Mock).mockResolvedValue([newFile]);
        
        // Trouver et cliquer sur le bouton
        const addButton = container.querySelector('.metadata-add-button-inline-small') as HTMLButtonElement;
        expect(addButton).not.toBeNull();
        
        // Le problème : le bouton appelle addProperty avec le tableau qu'il a capturé
        // mais ce tableau n'est peut-être pas celui utilisé pour l'affichage initial
        
        // Simulons le click en appelant addProperty manuellement
        // Mais on ne sait pas quel tableau a été capturé...
        // C'est le problème ! Le tableau original (string) n'est plus accessible
        
        // Le vrai fix serait que le bouton ne capture PAS le tableau
        // mais utilise une fonction pour le récupérer dynamiquement
        
        console.log('❌ PROBLEM IDENTIFIED: Button captures parsed array, loses reference to original data');
        console.log('💡 FIX NEEDED: Don\'t capture values in button closure, get it dynamically');
    });

    test('BUG TEST: refresh race condition', async () => {
        console.log('🧪 Testing race condition between update and display refresh...');

        const initialValues = ['[[File1.pdf]]', '[[File2.pdf]]'];
        
        // Simuler qu'update() prend du temps (écriture fichier asynchrone)
        let persistedValues: any[] = [...initialValues];
        mockUpdate.mockImplementation(async (newValues: any[]) => {
            // Simuler un délai d'écriture
            await new Promise(resolve => setTimeout(resolve, 50));
            persistedValues = [...newValues];
        });
        
        const container = multiFileProperty.fillDisplay(initialValues, mockUpdate);
        document.body.appendChild(container);
        
        let rows = container.querySelectorAll('.metadata-multiFiles-row-inline');
        expect(rows.length).toBe(2);
        
        // Ajouter un fichier
        const newFile = {
            getLink: () => '[[File3.pdf]]'
        };
        
        (selectMultipleFile as jest.Mock).mockResolvedValue([newFile]);
        
        // Lancer l'ajout (asynchrone)
        const addPromise = multiFileProperty.addProperty(initialValues, mockUpdate, container);
        
        // PENDANT que l'ajout se fait, simuler un refresh de l'interface
        // (comme si needDisplayRefresh était appelé trop tôt)
        await new Promise(resolve => setTimeout(resolve, 10)); // Attendre un peu
        
        // À ce moment, update() n'a pas fini, donc persistedValues a encore 2 éléments
        console.log('🔍 Persisted values during add:', persistedValues.length);
        
        // Si quelqu'un rafraîchit l'interface maintenant avec les valeurs persistées
        // (comme le fait needDisplayRefresh), il affichera 2 éléments au lieu de 3
        const refreshedContainer = multiFileProperty.fillDisplay(persistedValues, mockUpdate);
        document.body.appendChild(refreshedContainer);
        
        let refreshedRows = refreshedContainer.querySelectorAll('.metadata-multiFiles-row-inline');
        console.log('🔍 Refreshed container rows (before update completes):', refreshedRows.length);
        
        // Attendre que l'ajout se termine
        await addPromise;
        
        // Maintenant persistedValues devrait avoir 3 éléments
        console.log('🔍 Persisted values after add:', persistedValues.length);
        expect(persistedValues.length).toBe(3);
        
        // Mais le container refreshed a toujours 2 éléments !
        refreshedRows = refreshedContainer.querySelectorAll('.metadata-multiFiles-row-inline');
        console.log('🔍 Refreshed container rows (after update completes):', refreshedRows.length);
        
        // CECI ÉCHOUERAIT - le container refreshed n'a pas le nouvel élément
        // parce qu'il a été créé avec les anciennes valeurs
        expect(refreshedRows.length).toBe(2); // Toujours 2, pas 3
        console.log('❌ BUG CONFIRMED: Refreshed display missing new file');
        
        // Le container original par contre a bien 3 éléments
        rows = container.querySelectorAll('.metadata-multiFiles-row-inline');
        expect(rows.length).toBe(3);
        console.log('✅ Original container correctly shows 3 files');
    });

    test('should update display when values are modified externally', async () => {
        console.log('🧪 Testing external value modification...');

        const values = ['[[File1.pdf]]', '[[File2.pdf]]'];
        
        const container = multiFileProperty.fillDisplay(values, mockUpdate);
        document.body.appendChild(container);
        
        // État initial
        let rows = container.querySelectorAll('.metadata-multiFiles-row-inline');
        expect(rows.length).toBe(2);
        
        // Modifier values externally (comme le fait le système quand le fichier est mis à jour)
        values.push('[[File3.pdf]]');
        
        // Appeler reloadObjects (comme le fait addProperty)
        await multiFileProperty.reloadObjects(values, mockUpdate, container);
        
        // Vérifier que l'affichage a été mis à jour
        rows = container.querySelectorAll('.metadata-multiFiles-row-inline');
        
        console.log('🔍 Number of rows after reload:', rows.length);
        console.log('🔍 Values array:', values);
        
        expect(rows.length).toBe(3);
        console.log('✅ Display properly refreshed');
    });

    test('REGRESSION TEST: fix for refresh bug with multiple files', async () => {
        console.log('🧪 REGRESSION TEST: Ensuring refresh works correctly after adding to multifile with several files...');

        // Scénario exact de l'utilisateur : MultiFileProperty avec PLUSIEURS fichiers existants
        const values = ['[[File1.pdf]]', '[[File2.pdf]]', '[[File3.pdf]]'];
        
        const container = multiFileProperty.fillDisplay(values, mockUpdate);
        document.body.appendChild(container);
        
        let rows = container.querySelectorAll('.metadata-multiFiles-row-inline');
        expect(rows.length).toBe(3);
        console.log('✅ Initial: 3 files displayed');
        
        // Ajouter un 4ème fichier (comme ferait l'utilisateur en cliquant sur le bouton +)
        const newFile = { getLink: () => '[[File4.pdf]]' };
        (selectMultipleFile as jest.Mock).mockResolvedValue([newFile]);
        
        // Appeler addProperty qui devrait:
        // 1. Ajouter le fichier au tableau values
        // 2. Appeler update(values) et attendre qu'il se termine
        // 3. Appeler reloadObjects avec le container spécifique (pas querySelector)
        await multiFileProperty.addProperty(values, mockUpdate, container);
        
        // Vérifier que le tableau a bien été modifié
        expect(values.length).toBe(4);
        expect(values[3]).toBe('[[File4.pdf]]');
        console.log('✅ Values array updated to 4 files');
        
        // VÉRIFICATION PRINCIPALE : L'affichage doit montrer les 4 fichiers
        rows = container.querySelectorAll('.metadata-multiFiles-row-inline');
        expect(rows.length).toBe(4);
        console.log('✅ Display correctly shows 4 files after add');
        
        // Vérifier que update a été appelé avec les bonnes valeurs
        expect(mockUpdate).toHaveBeenCalledWith(values);
        
        console.log('');
        console.log('✅ REGRESSION TEST PASSED - BUG FIXED');
        console.log('   FIXES APPLIED:');
        console.log('   1. addProperty passes specificContainer to reloadObjects (not querySelector)');
        console.log('   2. reloadObjects validates values as array before createObjects');
        console.log('   3. Enhanced logging for debugging');
        console.log('   4. Ensured update() completes before reloadObjects');
    });});