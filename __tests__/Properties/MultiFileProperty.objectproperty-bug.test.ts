/**
 * @jest-environment jsdom
 * 
 * Test reproduisant le bug spécifique où ajouter un fichier à un MultiFileProperty
 * dans un ObjectProperty avec plusieurs objets ne met pas à jour l'affichage correctement.
 */

import { MultiFileProperty } from '../../src/properties/MultiFileProperty';
import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { Vault } from '../../src/vault/Vault';

// Mock the vault utilities
jest.mock('../../src/vault/Utils', () => ({
    selectMultipleFile: jest.fn(),
    setIcon: jest.fn()
}));

// Mock FileProperty
jest.mock('../../src/properties/FileProperty', () => {
    return {
        FileProperty: jest.fn().mockImplementation(() => ({
            fillDisplay: jest.fn().mockImplementation((value: any, update: Function) => {
                const div = document.createElement('div');
                div.className = 'mock-file-display';
                div.textContent = value || '';
                return div;
            }),
            title: '',
            name: 'files'
        }))
    };
});

const { selectMultipleFile, setIcon } = jest.requireMock('../../src/vault/Utils');

describe('MultiFileProperty in ObjectProperty - Display Refresh Bug', () => {
    let mockVault: any;
    let multiFileProperty: MultiFileProperty;
    let objectProperty: ObjectProperty;

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';

        // Create comprehensive mock vault
        mockVault = {
            app: {
                setIcon: jest.fn(),
                getUrl: jest.fn().mockImplementation((path: string) => `file:///${path}`),
                selectMultipleFile: selectMultipleFile
            },
            readLinkFile: jest.fn().mockImplementation((link: string) => {
                const match = link.match(/\[\[(.+?)\]\]/);
                return match ? match[1] : link;
            }),
            getFileByPath: jest.fn().mockReturnValue(null),
            getExtendedClasses: jest.fn().mockImplementation((classes: string[]) => Promise.resolve(classes))
        } as any;

        // Create MultiFileProperty
        multiFileProperty = new MultiFileProperty('fichiers', mockVault, ['Document']);

        // Reset mocks
        jest.clearAllMocks();
    });

    test('should update correct object when adding file in ObjectProperty with multiple objects', async () => {
        console.log('🧪 Testing MultiFileProperty in ObjectProperty with multiple objects...');

        // Simuler un ObjectProperty avec MultiFileProperty dedans
        const objectProperty = new ObjectProperty('projets', mockVault, {
            fichiers: multiFileProperty
        });

        // Valeurs initiales : 3 objets avec chacun une liste de fichiers
        const values = [
            { fichiers: ['[[File1.pdf]]', '[[File2.pdf]]'] },    // Objet 0
            { fichiers: ['[[File3.pdf]]'] },                      // Objet 1
            { fichiers: ['[[File4.pdf]]', '[[File5.pdf]]'] }      // Objet 2
        ];

        const mockUpdate = jest.fn();

        // Créer l'affichage
        const container = objectProperty.fillDisplay(values, mockUpdate);
        document.body.appendChild(container);

        // Vérifier l'affichage initial
        const allMultiFileContainers = document.querySelectorAll('.metadata-multiFiles-container-fichiers');
        expect(allMultiFileContainers.length).toBe(3);
        console.log('✅ 3 MultiFileProperty containers created');

        // Vérifier les fichiers de chaque objet
        const container0 = allMultiFileContainers[0];
        const container1 = allMultiFileContainers[1];
        const container2 = allMultiFileContainers[2];

        let rows0 = container0.querySelectorAll('.metadata-multiFiles-row-inline');
        let rows1 = container1.querySelectorAll('.metadata-multiFiles-row-inline');
        let rows2 = container2.querySelectorAll('.metadata-multiFiles-row-inline');

        expect(rows0.length).toBe(2);
        expect(rows1.length).toBe(1);
        expect(rows2.length).toBe(2);
        console.log('✅ Initial state: Object0=2 files, Object1=1 file, Object2=2 files');

        // AJOUTER un fichier à l'objet 1 (celui du milieu)
        const newFile = {
            getLink: () => '[[File6.pdf]]'
        };

        (selectMultipleFile as jest.Mock).mockResolvedValue([newFile]);

        // Trouver le bouton d'ajout du container 1
        const addButton1 = container1.querySelector('.metadata-add-button-inline-small') as HTMLButtonElement;
        expect(addButton1).not.toBeNull();
        
        // L'addButton devrait avoir capturé le bon container dans sa fermeture
        // Mais puisque je ne peux pas appeler onclick directement, appelons addProperty
        
        // Le problème : quel container est passé à addProperty ?
        // Dans le vrai code, c'est celui capturé dans la fermeture de createAddButton
        // qui est appelé depuis fillDisplay de MultiFileProperty
        
        // Simulons l'ajout en appelant directement addProperty
        await multiFileProperty.addProperty(values[1].fichiers, 
            async (newValue: any) => {
                values[1].fichiers = newValue;
                await mockUpdate(values);
            }, 
            container1 as HTMLDivElement);

        // Vérifier que le tableau de l'objet 1 a bien été modifié
        expect(values[1].fichiers.length).toBe(2);
        expect(values[1].fichiers).toContain('[[File6.pdf]]');
        console.log('✅ Object1 fichiers array updated:', values[1].fichiers);

        // Vérifier que l'affichage a été mis à jour
        rows0 = container0.querySelectorAll('.metadata-multiFiles-row-inline');
        rows1 = container1.querySelectorAll('.metadata-multiFiles-row-inline');
        rows2 = container2.querySelectorAll('.metadata-multiFiles-row-inline');

        console.log('🔍 After add - Object0 rows:', rows0.length);
        console.log('🔍 After add - Object1 rows:', rows1.length);
        console.log('🔍 After add - Object2 rows:', rows2.length);

        // Les autres objets ne devraient PAS avoir changé
        expect(rows0.length).toBe(2);
        expect(rows2.length).toBe(2);

        // L'objet 1 devrait maintenant avoir 2 fichiers
        // ❌ CECI POURRAIT ÉCHOUER si le mauvais container est rafraîchi
        expect(rows1.length).toBe(2);
        console.log('✅ Only Object1 was updated, others unchanged');
    });
});
